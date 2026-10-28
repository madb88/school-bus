import {
  OFFLINE_IDB_NAME,
  OFFLINE_IDB_VERSION,
  OFFLINE_STORE_MZK_OD,
  OFFLINE_STORE_SCHOOL,
} from "./constants";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(OFFLINE_IDB_NAME, OFFLINE_IDB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_SCHOOL)) {
        db.createObjectStore(OFFLINE_STORE_SCHOOL);
      }
      if (!db.objectStoreNames.contains(OFFLINE_STORE_MZK_OD)) {
        db.createObjectStore(OFFLINE_STORE_MZK_OD);
      }
    };
  });
}

export async function idbGet<T>(
  storeName: string,
  key: string,
): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error ?? new Error("IDB get failed"));
      request.onsuccess = () => resolve(request.result as T | undefined);
    });
  } finally {
    db.close();
  }
}

export async function idbSet(
  storeName: string,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(value, key);
      request.onerror = () => reject(request.error ?? new Error("IDB put failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB tx failed"));
    });
  } finally {
    db.close();
  }
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onerror = () =>
        reject(request.error ?? new Error("IDB delete failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB tx failed"));
    });
  } finally {
    db.close();
  }
}

export async function idbClearStore(storeName: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onerror = () =>
        reject(request.error ?? new Error("IDB clear failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB tx failed"));
    });
  } finally {
    db.close();
  }
}
