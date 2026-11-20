/**
 * Zero-dependency promise-based IndexedDB utility for offline storage.
 * Bypasses the 5MB quota limitation of localStorage.
 */

const DB_NAME = "topik_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

export async function getIdbItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
      req.onerror = () => reject(req.error || new Error(`Failed to get key: ${key}`));
    });
  } catch (err) {
    console.warn(`[IDB] Failed to read '${key}':`, err);
    return null;
  }
}

export async function setIdbItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error(`Failed to put key: ${key}`));
    });
  } catch (err) {
    console.warn(`[IDB] Failed to save '${key}':`, err);
  }
}

export async function removeIdbItem(key: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error(`Failed to delete key: ${key}`));
    });
  } catch (err) {
    console.warn(`[IDB] Failed to delete '${key}':`, err);
  }
}
