
const DB_NAME = 'EntregaLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB Open Error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveMenuToDB = async (menu: any[]) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(menu, 'menu');
      
      // Critical: Wait for transaction to complete, not just the request success
      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        console.error("IndexedDB Transaction Error:", event);
        reject(transaction.error);
      };
      
      request.onerror = (event) => {
        console.error("IndexedDB Put Error:", request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error("Error saving to IndexedDB", e);
  }
};

export const getMenuFromDB = async (): Promise<any[] | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('menu');
      
      request.onsuccess = () => {
        // request.result can be undefined if key doesn't exist
        resolve(request.result === undefined ? null : request.result);
      };
      
      request.onerror = () => {
        console.error("IndexedDB Get Error:", request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error("Error reading from IndexedDB", e);
    return null;
  }
};
