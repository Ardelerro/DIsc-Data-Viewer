import type { Self } from "../types/discord";
import {
  getCachedUsers,
  putCachedUsers,
  type CachedDiscordUser,
} from "./dataStore";

const TTL_MS = 1000 * 60 * 60 * 24 * 7;




const TRANSIENT_TTL_MS = 1000 * 60 * 10;

const BATCH = 50;

const memCache = new Map<string, CachedDiscordUser>();

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
): Promise<void> {
  const wanted = new Set<string>();
  if (self?.id) wanted.add(self.id);
  for (const id of ids) if (id && id !== "unknown") wanted.add(id);
  if (wanted.size === 0) return;

  const now = Date.now();
  const resolved = new Map<string, CachedDiscordUser>();
  const toFetch: string[] = [];

  const persisted = await getCachedUsers([...wanted]);
  for (const id of wanted) {
    const hit = memCache.get(id) ?? persisted[id];
    if (hit && now - hit.fetchedAt < ttlFor(hit)) {
      resolved.set(id, hit);
      memCache.set(id, hit);
    } else {
      toFetch.push(id);
    }
  }

  const fresh: Record<string, CachedDiscordUser> = {};
  for (let i = 0; i < toFetch.length; i += BATCH) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const batch = toFetch.slice(i, i + BATCH);
    let result: BatchResult;
    try {
      result = await fetchBatch(batch, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;

      console.warn("Discord user enrichment failed; using export values:", err);
      break;
    }
    const { users, retryAfterSec } = result;
    for (const id of batch) {
      const u = users[id];
      if (u && u.username) {
        const entry: CachedDiscordUser = {
          username: u.username,
          global_name: u.global_name,
          avatar: u.avatar,
          fetchedAt: now,
        };
        resolved.set(id, entry);
        memCache.set(id, entry);
        fresh[id] = entry;
      } else {
        
        
        const entry: CachedDiscordUser = {
          username: "",
          global_name: null,
          avatar: null,
          fetchedAt: now,
          transient: !(id in users),
        };
        memCache.set(id, entry);
        fresh[id] = entry;
      }
    }
    
    
    
    
    
    if (retryAfterSec) {
      const remaining = toFetch.length - (i + batch.length);
      console.warn(
        `[discord-user] rate-limited by Discord (retry-after ~${retryAfterSec}s); ` +
          `stopping enrichment for this session — ${remaining} user(s) left ` +
          `unresolved keep export names and retry after ~${TRANSIENT_TTL_MS / 60000}min.`,
      );
      break;
    }
  }

  void putCachedUsers(fresh);

  for (const [id, u] of resolved) {
    if (!u.username) continue;
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
  }
}
