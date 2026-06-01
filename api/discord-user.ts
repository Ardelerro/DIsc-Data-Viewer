interface DiscordUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

const API = "https://discord.com/api/v10";

// The global rate limit is shared across ALL invocations of this function (one
// bot token), so a smaller burst per request lowers the chance of tripping it
// and shrinks the blast radius when several visitors hit the endpoint at once.
const CONCURRENCY = 4;

// A 429 asking us to wait longer than this almost always means we hit the
// *global* limit. Rather than block the request on a long backoff, bail and let
// the client fall back to the export-file username.
const MAX_RETRY_AFTER_SEC = 5;

// Overall budget for the whole request. A normal 50-id batch resolves in a few
// seconds; this only bites under heavy rate-limiting, where it caps worst-case
// latency (and serverless cost) instead of blocking ~30s on backoff sleeps.
const DEADLINE_MS = 10_000;

// Hard backstop enforced by Vercel, above the app-level deadline.
export const maxDuration = 15;

class DiscordAuthError extends Error {}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

interface Gate {
  // Epoch ms before which every worker must hold (global rate-limit pause).
  pauseUntil: number;
  // Epoch ms after which we stop fetching and return what we have.
  deadline: number;
}

async function fetchUser(
  id: string,
  token: string,
  gate: Gate,
): Promise<DiscordUser | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Respect a global pause set by any worker, and never sleep past the deadline.
    const wait = gate.pauseUntil - Date.now();
    if (wait > 0) {
      if (Date.now() + wait >= gate.deadline) return null;
      await sleep(wait);
    }
    if (Date.now() >= gate.deadline) return null;

    const res = await fetch(`${API}/users/${id}`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 1;
      if (retry > MAX_RETRY_AFTER_SEC) return null;
      const resumeAt = Date.now() + retry * 1000 + Math.random() * 250;
      // A global-scope limit applies to the whole token: hold every worker, not
      // just this one request.
      if (res.headers.get("x-ratelimit-scope") === "global") {
        gate.pauseUntil = Math.max(gate.pauseUntil, resumeAt);
      }
      if (resumeAt >= gate.deadline) return null;
      await sleep(resumeAt - Date.now());
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new DiscordAuthError(
        `Discord rejected the bot token (${res.status}).`,
      );
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Discord API ${res.status}`);

    // Proactive pacing: every /users/:id request shares one route bucket, so
    // when it's exhausted make the remaining workers wait out the reset before
    // firing — this avoids triggering the 429 in the first place.
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      const resetAfter = Number(res.headers.get("x-ratelimit-reset-after"));
      if (resetAfter > 0) {
        gate.pauseUntil = Math.max(
          gate.pauseUntil,
          Date.now() + resetAfter * 1000,
        );
      }
    }

    const u = (await res.json()) as Partial<DiscordUser>;
    return {
      username: u.username ?? "Unknown",
      global_name: u.global_name ?? null,
      avatar: u.avatar ?? null,
    };
  }
  return null;
}

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => typeof res;
    json: (body: unknown) => void;
    setHeader: (name: string, value: string) => void;
  },
): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "DISCORD_BOT_TOKEN not configured" });
    return;
  }

  const raw = req.query.ids ?? req.query.id ?? "";
  const idsParam = Array.isArray(raw) ? raw.join(",") : raw;
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (ids.length === 0) {
    res.status(400).json({ error: "no ids" });
    return;
  }

  const users: Record<string, DiscordUser | null> = {};
  let authError: DiscordAuthError | null = null;
  const gate: Gate = { pauseUntil: 0, deadline: Date.now() + DEADLINE_MS };

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < ids.length && !authError && Date.now() < gate.deadline) {
      const id = ids[cursor++];
      try {
        users[id] = await fetchUser(id, token, gate);
      } catch (e) {
        if (e instanceof DiscordAuthError) {
          authError = e;
          return;
        }
        users[id] = null;
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker()),
    );
    if (authError) throw authError;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ users });
  } catch (e) {
    const auth = e instanceof DiscordAuthError;
    res
      .status(auth ? 401 : 502)
      .json({ error: e instanceof Error ? e.message : "fetch failed" });
  }
}
