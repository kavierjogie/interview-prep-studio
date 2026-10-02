/**
 * Browser persistence.
 *
 * Primary: IndexedDB (database "interview-prep-studio", object store "kv").
 *   Structured, asynchronous and has far more room than localStorage, which matters
 *   once practice history grows.
 * Fallback: localStorage (e.g. some private-browsing modes block IndexedDB).
 * Last resort: in-memory only, and the UI warns that nothing will persist.
 *
 * Each top-level collection (questions, stories, attempts…) is stored under its own key,
 * so saving a question doesn't rewrite the whole practice history.
 */

export type DriverName = "indexeddb" | "localstorage" | "memory";

export interface StorageDriver {
  name: DriverName;
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = "interview-prep-studio";
const STORE = "kv";
const LS_PREFIX = "ips:";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB"));
    req.onblocked = () => reject(new Error("IndexedDB open was blocked"));
  });
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

async function createIdbDriver(): Promise<StorageDriver> {
  const db = await openDb();
  // Smoke test: some browsers open the DB but fail on first write.
  await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).put(Date.now(), "__probe"));
  return {
    name: "indexeddb",
    async get<T>(key: string) {
      const value = await wrap(db.transaction(STORE, "readonly").objectStore(STORE).get(key));
      return value as T | undefined;
    },
    async set(key, value) {
      await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key));
    },
    async clear() {
      await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).clear());
    },
  };
}

function createLocalStorageDriver(): StorageDriver {
  const probeKey = `${LS_PREFIX}__probe`;
  window.localStorage.setItem(probeKey, "1");
  window.localStorage.removeItem(probeKey);
  return {
    name: "localstorage",
    async get<T>(key: string) {
      const raw = window.localStorage.getItem(LS_PREFIX + key);
      return raw == null ? undefined : (JSON.parse(raw) as T);
    },
    async set(key, value) {
      // Throws QuotaExceededError when full; the store surfaces that to the user.
      window.localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    },
    async clear() {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(LS_PREFIX))
        .forEach((k) => window.localStorage.removeItem(k));
    },
  };
}

function createMemoryDriver(): StorageDriver {
  const map = new Map<string, unknown>();
  return {
    name: "memory",
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async clear() {
      map.clear();
    },
  };
}

let driverPromise: Promise<StorageDriver> | null = null;

export function getDriver(): Promise<StorageDriver> {
  if (!driverPromise) {
    driverPromise = (async () => {
      try {
        return await createIdbDriver();
      } catch (err) {
        console.warn("[storage] IndexedDB unavailable, falling back to localStorage", err);
      }
      try {
        return createLocalStorageDriver();
      } catch (err) {
        console.warn("[storage] localStorage unavailable, data will not persist", err);
      }
      return createMemoryDriver();
    })();
  }
  return driverPromise;
}

/* Theme is kept in plain localStorage so it can be applied before React loads (no flash). */
export const THEME_KEY = "ips-theme";
