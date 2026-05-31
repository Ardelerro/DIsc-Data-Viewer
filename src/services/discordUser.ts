import type { Self } from "../types/discord";
import {
  getCachedUsers,
  putCachedUsers,
  type CachedDiscordUser,
} from "./dataStore";

const TTL_MS = 1000 * 60 * 60 * 24 * 7;

const BATCH = 50;

const memCache = new Map<string, CachedDiscordUser>();

interface ApiUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
}

async function fetchBatch(
  ids: string[],
  signal?: AbortSignal,
): Promise<Record<string, ApiUser | null>> {
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
  const body = (await res.json()) as { users: Record<string, ApiUser | null> };
  return body.users ?? {};
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

  extraIds: string[],
  signal?: AbortSignal,
): Promise<void> {
  const ids = new Set<string>();
  if (self?.id) ids.add(self.id);
  for (const id in userMapping) ids.add(id);
  for (const id of extraIds) if (id && id !== "unknown") ids.add(id);
  if (ids.size === 0) return;

  const now = Date.now();
  const resolved = new Map<string, CachedDiscordUser>();
  const toFetch: string[] = [];

  const persisted = await getCachedUsers([...ids]);
  for (const id of ids) {
    const hit = memCache.get(id) ?? persisted[id];
    if (hit && now - hit.fetchedAt < TTL_MS) {
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
    let users: Record<string, ApiUser | null>;
    try {
      users = await fetchBatch(batch, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;

      console.warn("Discord user enrichment failed; using export values:", err);
      break;
    }
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
        memCache.set(id, {
          username: "",
          global_name: null,
          avatar: null,
          fetchedAt: now,
        });
      }
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
