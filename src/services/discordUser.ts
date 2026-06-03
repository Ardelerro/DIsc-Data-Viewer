import type { Self } from "../types/discord";
import {
  getCachedUsers,
  putCachedUsers,
  type CachedDiscordUser,
} from "./dataStore";

const TTL_MS = 1000 * 60 * 60 * 24 * 7;

const TRANSIENT_TTL_MS = 10 * 60 * 10;

const BATCH = 50;

const memCache = new Map<string, CachedDiscordUser>();
const MAX_EMPTY_ROUNDS = 6;
const BASE_BACKOFF_SEC = 1;
const MAX_BACKOFF_SEC = 30;
const JITTER_MS = 250;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

interface ApiUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

interface BatchResult {
  
  
  users: Record<string, ApiUser | null>;
  retryAfterSec?: number;
}

function ttlFor(hit: CachedDiscordUser): number {
  return hit.transient ? TRANSIENT_TTL_MS : TTL_MS;
}

async function fetchBatch(
  ids: string[],
  signal?: AbortSignal,
): Promise<BatchResult> {
  const res = await fetch(`/api/discord-user?ids=${ids.join(",")}`, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      /* non-JSON body */
    }
    if (res.status === 401 || res.status === 500) {
      console.error(
        `[discord-user] usernames will all show as "Unknown": ${detail || `endpoint ${res.status}`}`,
      );
    }
    throw new Error(
      `discord-user endpoint ${res.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  const body = (await res.json()) as BatchResult;
  return { users: body.users ?? {}, retryAfterSec: body.retryAfterSec };
}

function displayName(u: {
  username: string;
  global_name: string | null;
}): string {
  return u.global_name?.trim() || u.username;
}

export async function enrichUserMapping(
  self: Self,
  userMapping: Record<string, { username: string; avatar: string }>,
  ids: string[],
  signal?: AbortSignal,
  onProgress?: () => void,
): Promise<void> {
  const wanted = new Set<string>();
  if (self?.id) wanted.add(self.id);
  for (const id of ids) if (id && id !== "unknown") wanted.add(id);
  if (wanted.size === 0) return;

  const apply = (id: string, u: CachedDiscordUser): void => {
    if (!u.username) return;
    if (id === self.id) {
      self.username = displayName(u);
      if (u.avatar) self.avatar_hash = u.avatar;
    }
    if (userMapping[id]) {
      userMapping[id].username = displayName(u);
      userMapping[id].avatar = u.avatar ?? "";
    } else {
      userMapping[id] = { username: displayName(u), avatar: u.avatar ?? "" };
    }
  };

  const persisted = await getCachedUsers([...wanted]);
  const queue: string[] = [];
  const cacheNow = Date.now();
  let appliedFromCache = false;
  for (const id of wanted) {
    const hit = memCache.get(id) ?? persisted[id];
    if (hit && cacheNow - hit.fetchedAt < ttlFor(hit)) {
      memCache.set(id, hit);
      if (hit.username) {
        apply(id, hit);
        appliedFromCache = true;
      }
    } else {
      queue.push(id);
    }
  }
  if (appliedFromCache) onProgress?.();

  let emptyRounds = 0;
  while (queue.length > 0) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const batch = queue.splice(0, BATCH);

    let result: BatchResult;
    try {
      result = await fetchBatch(batch, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      console.warn("Discord user enrichment failed; using export values:", err);
      break;
    }

    const { users, retryAfterSec } = result;
    const now = Date.now();
    const fresh: Record<string, CachedDiscordUser> = {};
    let appliedThisBatch = false;
    for (const id of batch) {
      const u = users[id];
      if (u && u.username) {
        const entry: CachedDiscordUser = {
          username: u.username,
          global_name: u.global_name,
          avatar: u.avatar,
          fetchedAt: now,
        };
        memCache.set(id, entry);
        fresh[id] = entry;
        apply(id, entry);
        appliedThisBatch = true;
      } else if (id in users) {
        const entry: CachedDiscordUser = {
          username: "",
          global_name: null,
          avatar: null,
          fetchedAt: now,
        };
        memCache.set(id, entry);
        fresh[id] = entry;
      } else {
        queue.push(id);
      }
    }
    if (Object.keys(fresh).length > 0) void putCachedUsers(fresh);
    if (appliedThisBatch) onProgress?.();

    if (!retryAfterSec) {
      emptyRounds = 0; 
      continue;
    }

    if (appliedThisBatch) {
      emptyRounds = 0;
    } else if (++emptyRounds > MAX_EMPTY_ROUNDS) {
      console.warn(
        `[discord-user] rate limit hasn't eased after ${MAX_EMPTY_ROUNDS} stuck ` +
          `round(s); ${queue.length} user(s) left unresolved (keeping export ` +
          `names) — they'll retry on the next load.`,
      );
      break;
    }

    const backoffSec = Math.min(
      Math.max(retryAfterSec, BASE_BACKOFF_SEC) * 2 ** emptyRounds,
      MAX_BACKOFF_SEC,
    );
    await sleep(backoffSec * 1000 + Math.random() * JITTER_MS, signal);
  }
}
