import type { ProcessedData } from "../types/discord";
import type { ProfileReport } from "./profiler";

const DB_NAME = "discord-data-viewer";
const STORE_NAME = "processed";
const PROFILE_STORE = "profiles";
const USERS_STORE = "users";
const DATA_KEY = "discord-processed-data";

const DB_VERSION = 3;

const MAX_PROFILES = 20;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.createObjectStore(PROFILE_STORE, { keyPath: "timestamp" });
      }
      if (!db.objectStoreNames.contains(USERS_STORE)) {
        db.createObjectStore(USERS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function getData(): Promise<ProcessedData | null> {
  try {
    const db = await openDB();
    return await new Promise<ProcessedData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve((req.result as ProcessedData) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to read processed data:", err);
    return null;
  }
}

export async function saveData(data: ProcessedData): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, DATA_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function clearData(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(DATA_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to clear processed data:", err);
  }
}

export async function saveProfile(report: ProfileReport): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PROFILE_STORE, "readwrite");
      const store = tx.objectStore(PROFILE_STORE);
      store.put(report);

      const countReq = store.count();
      countReq.onsuccess = () => {
        const excess = countReq.result - MAX_PROFILES;
        if (excess > 0) {
          let removed = 0;
          store.openCursor().onsuccess = (ev) => {
            const cursor = (ev.target as IDBRequest<IDBCursorWithValue | null>)
              .result;
            if (cursor && removed < excess) {
              cursor.delete();
              removed++;
              cursor.continue();
            }
          };
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save profile report:", err);
  }
}

export async function getProfiles(): Promise<ProfileReport[]> {
  try {
    const db = await openDB();
    return await new Promise<ProfileReport[]>((resolve, reject) => {
      const tx = db.transaction(PROFILE_STORE, "readonly");
      const req = tx.objectStore(PROFILE_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as ProfileReport[]) ?? [];
        all.sort((a, b) => b.timestamp - a.timestamp);
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to read profile reports:", err);
    return [];
  }
}

export async function clearProfiles(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PROFILE_STORE, "readwrite");
      tx.objectStore(PROFILE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to clear profile reports:", err);
  }
}

export interface CachedDiscordUser {
  username: string;
  global_name: string | null;
  avatar: string | null;
  fetchedAt: number;
  // Set on entries that failed for a transient reason (rate limit / error)
  // rather than a confirmed "not found". These expire on a much shorter TTL so
  // they're retried once the rate limit clears, instead of being trusted for a
  // week like a genuine empty result.
  transient?: boolean;
}

export async function getCachedUsers(
  ids: string[],
): Promise<Record<string, CachedDiscordUser>> {
  const out: Record<string, CachedDiscordUser> = {};
  if (ids.length === 0) return out;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(USERS_STORE, "readonly");
      const store = tx.objectStore(USERS_STORE);
      for (const id of ids) {
        const req = store.get(id);
        req.onsuccess = () => {
          const v = req.result as CachedDiscordUser | undefined;
          if (v) out[id] = v;
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to read cached users:", err);
  }
  return out;
}

export async function putCachedUsers(
  users: Record<string, CachedDiscordUser>,
): Promise<void> {
  const ids = Object.keys(users);
  if (ids.length === 0) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(USERS_STORE, "readwrite");
      const store = tx.objectStore(USERS_STORE);
      for (const id of ids) store.put(users[id], id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to cache users:", err);
  }
}
