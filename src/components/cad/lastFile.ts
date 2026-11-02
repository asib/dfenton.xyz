// The last file opened in the model viewer, kept in this browser's IndexedDB (which, unlike
// localStorage, holds large files) so that a reload reopens it. Any failure, as in private
// windows, with blocked site data or over quota, just means nothing is kept.
const DATABASE = 'model-viewer', STORE = 'files', KEY = 'last';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(request.error ?? new Error('Browser storage is unavailable.')); };
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      const fail = () => { reject(transaction.error ?? new Error('Browser storage failed.')); };
      transaction.oncomplete = () => { resolve(request.result); };
      transaction.onerror = fail;
      transaction.onabort = fail;
    });
  } finally {
    database.close();
  }
}

export async function readLastFile(): Promise<File | null> {
  try {
    const saved: unknown = await run('readonly', store => store.get(KEY));
    return saved instanceof File ? saved : null;
  } catch {
    return null;
  }
}

export async function keepLastFile(file: File) {
  try { await run('readwrite', store => store.put(file, KEY)); } catch { /* Not kept; it opens anyway. */ }
}

export async function forgetLastFile() {
  try { await run('readwrite', store => store.delete(KEY)); } catch { /* Nothing was kept. */ }
}
