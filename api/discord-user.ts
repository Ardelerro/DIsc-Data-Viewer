interface DiscordUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

const API = "https://discord.com/api/v10";






const CONCURRENCY = 2;



const DEADLINE_MS = 10_000;






const HARD_BACKOFF_SEC = 5;




const MAX_RATE_LIMIT_HITS = 4;


export const maxDuration = 15;

class DiscordAuthError extends Error {}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));




type Outcome =
  | { kind: "ok"; user: DiscordUser }
  | { kind: "absent" }
  | { kind: "unavailable" };

const ABSENT: Outcome = { kind: "absent" };
const UNAVAILABLE: Outcome = { kind: "unavailable" };

interface Gate {
  
  pauseUntil: number;
  
  deadline: number;
  
  
  
  
  stop: boolean;
  
  
  rateLimitHits: number;
  
  retryAfterSec: number;
}




function logRateLimit(res: Response, id: string, body: string): void {
  console.warn(
    `[discord-user] 429 id=${id} ` +
      `scope=${res.headers.get("x-ratelimit-scope")} ` +
      `global=${res.headers.get("x-ratelimit-global")} ` +
      `retry-after=${res.headers.get("retry-after")} ` +
      `cf-ray=${res.headers.get("cf-ray")} ` +
      `server=${res.headers.get("server")} ` +
      `body=${body.slice(0, 160).replace(/\s+/g, " ")}`,
  );
}

async function fetchUser(
  id: string,
  token: string,
  gate: Gate,
): Promise<Outcome> {
  if (gate.stop || Date.now() >= gate.deadline) return UNAVAILABLE;

  
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
    const scope = res.headers.get("x-ratelimit-scope");
    const headerRetry = Number(res.headers.get("retry-after")) || 0;

    
    
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      /* ignore */
    }
    let bodyRetry = 0;
    try {
      const parsed = JSON.parse(bodyText) as { retry_after?: number };
      if (typeof parsed.retry_after === "number") bodyRetry = parsed.retry_after;
    } catch {
      /* non-JSON → treat as a hard block below */
    }
    logRateLimit(res, id, bodyText);

    const waitSec = bodyRetry || headerRetry || 1;
    
    
    if (
      !scope ||
      waitSec >= HARD_BACKOFF_SEC ||
      gate.rateLimitHits >= MAX_RATE_LIMIT_HITS
    ) {
      gate.retryAfterSec = Math.max(gate.retryAfterSec, Math.ceil(waitSec));
      gate.stop = true;
      return UNAVAILABLE;
    }

    
    
    
    
    gate.rateLimitHits += 1;
    gate.retryAfterSec = Math.max(gate.retryAfterSec, Math.ceil(waitSec));
    const pauseUntil = Date.now() + waitSec * 1000;
    if (pauseUntil < gate.deadline) {
      gate.pauseUntil = Math.max(gate.pauseUntil, pauseUntil);
    }
    
    
    return UNAVAILABLE;
  }
  if (res.status === 401 || res.status === 403) {
    throw new DiscordAuthError(`Discord rejected the bot token (${res.status}).`);
  }
  if (res.status === 404) return ABSENT;
  if (!res.ok) return UNAVAILABLE;

  
  
  
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

  
  
  
  const users: Record<string, DiscordUser | null> = {};
  let authError: DiscordAuthError | null = null;
  const gate: Gate = {
    pauseUntil: 0,
    deadline: Date.now() + DEADLINE_MS,
    stop: false,
    rateLimitHits: 0,
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
        
      } catch (e) {
        if (e instanceof DiscordAuthError) {
          authError = e;
          return;
        }
        
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
