interface DiscordUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

const API = "https://discord.com/api/v10";

// The global rate limit and Cloudflare's per-IP "invalid request" budget are
// both shared across ALL invocations of this function (one bot token, one
// shared Vercel egress IP). A smaller burst lowers the chance of tripping them.
const CONCURRENCY = 4;

// Overall budget for the whole request. A normal 50-id batch resolves in a few
// seconds; this caps worst-case latency (and serverless cost).
const DEADLINE_MS = 10_000;

// Hard backstop enforced by Vercel, above the app-level deadline.
export const maxDuration = 15;

class DiscordAuthError extends Error {}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

// A single user lookup either resolves, is confirmed absent (404 — a deleted
// account), or is transiently unavailable (rate-limited / errored). The caller
// caches these three outcomes very differently, so they must stay distinct.
type Outcome =
  | { kind: "ok"; user: DiscordUser }
  | { kind: "absent" }
  | { kind: "unavailable" };

const ABSENT: Outcome = { kind: "absent" };
const UNAVAILABLE: Outcome = { kind: "unavailable" };

interface Gate {
  // Epoch ms before which every worker must hold (route-bucket pause).
  pauseUntil: number;
  // Epoch ms after which we stop fetching and return what we have.
  deadline: number;
  // Set the moment any worker sees a 429. Retrying *into* a rate limit just
  // produces more 429s, which count toward Cloudflare's per-IP invalid-request
  // budget and can escalate a brief limit into a 1-hour IP ban — so instead we
  // stop the whole invocation and let the client retry later.
  stop: boolean;
  // Largest retry-after (seconds) seen, surfaced to the client as a hint.
  retryAfterSec: number;
}

// Logged once per 429 so we can tell a normal Discord limit (JSON body,
// x-ratelimit-scope present) apart from a Cloudflare IP ban (HTML body, cf-ray
// present, no ratelimit headers, ~1h).
async function logRateLimit(res: Response, id: string): Promise<void> {
  let body = "";
  try {
    body = (await res.text()).slice(0, 160).replace(/\s+/g, " ");
  } catch {
    /* ignore */
  }
  console.warn(
    `[discord-user] 429 id=${id} ` +
      `scope=${res.headers.get("x-ratelimit-scope")} ` +
      `global=${res.headers.get("x-ratelimit-global")} ` +
      `retry-after=${res.headers.get("retry-after")} ` +
      `cf-ray=${res.headers.get("cf-ray")} ` +
      `server=${res.headers.get("server")} body=${body}`,
  );
}

async function fetchUser(
  id: string,
  token: string,
  gate: Gate,
): Promise<Outcome> {
  if (gate.stop || Date.now() >= gate.deadline) return UNAVAILABLE;

  // Respect a pacing pause set by any worker, and never sleep past the deadline.
  const wait = gate.pauseUntil - Date.now();
  if (wait > 0) {
    if (Date.now() + wait >= gate.deadline) return UNAVAILABLE;
    await sleep(wait);
  }
  if (gate.stop) return UNAVAILABLE;

  const res = await fetch(`${API}/users/${id}`, {
    headers: { Authorization: `Bot ${token}` },
  });

  if (res.status === 429) {
    await logRateLimit(res, id);
    const retry = Number(res.headers.get("retry-after")) || 1;
    gate.retryAfterSec = Math.max(gate.retryAfterSec, retry);
    gate.stop = true; // halt the whole invocation; the client retries later
    return UNAVAILABLE;
  }
  if (res.status === 401 || res.status === 403) {
    throw new DiscordAuthError(`Discord rejected the bot token (${res.status}).`);
  }
  if (res.status === 404) return ABSENT;
  if (!res.ok) return UNAVAILABLE;

  // Proactive pacing: every /users/:id request shares one route bucket, so when
  // it's exhausted make the remaining workers wait out the reset before firing
  // — this avoids triggering the 429 in the first place.
  if (res.headers.get("x-ratelimit-remaining") === "0") {
    const resetAfter = Number(res.headers.get("x-ratelimit-reset-after"));
    if (resetAfter > 0) {
      gate.pauseUntil = Math.max(gate.pauseUntil, Date.now() + resetAfter * 1000);
    }
  }

  const u = (await res.json()) as Partial<DiscordUser>;
  return {
    kind: "ok",
    user: {
      username: u.username ?? "Unknown",
      global_name: u.global_name ?? null,
      avatar: u.avatar ?? null,
    },
  };
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

  // Only resolved users and confirmed-absent ids (null) go in the map; ids that
  // were rate-limited/errored are omitted so the client can tell "deleted" from
  // "try again later" and cache them accordingly.
  const users: Record<string, DiscordUser | null> = {};
  let authError: DiscordAuthError | null = null;
  const gate: Gate = {
    pauseUntil: 0,
    deadline: Date.now() + DEADLINE_MS,
    stop: false,
    retryAfterSec: 0,
  };

  let cursor = 0;
  async function worker(): Promise<void> {
    while (
      cursor < ids.length &&
      !authError &&
      !gate.stop &&
      Date.now() < gate.deadline
    ) {
      const id = ids[cursor++];
      try {
        const outcome = await fetchUser(id, token, gate);
        if (outcome.kind === "ok") users[id] = outcome.user;
        else if (outcome.kind === "absent") users[id] = null;
        // "unavailable" → leave the id out of the map entirely
      } catch (e) {
        if (e instanceof DiscordAuthError) {
          authError = e;
          return;
        }
        // transient error → omit
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker()),
    );
    if (authError) throw authError;
    res.setHeader("Cache-Control", "no-store");
    const payload: {
      users: Record<string, DiscordUser | null>;
      retryAfterSec?: number;
    } = { users };
    if (gate.retryAfterSec > 0) payload.retryAfterSec = gate.retryAfterSec;
    res.status(200).json(payload);
  } catch (e) {
    const auth = e instanceof DiscordAuthError;
    res
      .status(auth ? 401 : 502)
      .json({ error: e instanceof Error ? e.message : "fetch failed" });
  }
}
