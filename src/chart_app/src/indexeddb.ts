// IndexedDB utilities for offline result storage
import type { IResult } from './types';

const DB_NAME = 'YesNoChartDB';
const DB_VERSION = 1;
const RESULTS_STORE = 'offlineResults';

interface OfflineResult extends IResult {
  id?: number;
  createdAt: string;
}

class IndexedDBHelper {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB: Failed to open database', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB: Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB: Upgrading database');

        // Create results store
        if (!db.objectStoreNames.contains(RESULTS_STORE)) {
          const store = db.createObjectStore(RESULTS_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('chartName', 'chartName', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async saveOfflineResult(result: IResult): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const offlineResult: OfflineResult = {
      ...result,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      const request = store.add(offlineResult);

      request.onerror = () => {
        console.error('IndexedDB: Failed to save offline result', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const id = request.result as number;
        console.log('IndexedDB: Offline result saved with ID:', id);
        resolve(id);
      };
    });
  }

  async getOfflineResults(): Promise<OfflineResult[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RESULTS_STORE], 'readonly');
      const store = transaction.objectStore(RESULTS_STORE);
      const request = store.getAll();

      request.onerror = () => {
        console.error('IndexedDB: Failed to get offline results', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const results = request.result;
        console.log('IndexedDB: Retrieved offline results:', results.length);
        resolve(results);
      };
    });
  }

  async deleteOfflineResult(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      const request = store.delete(id);

      request.onerror = () => {
        console.error('IndexedDB: Failed to delete offline result', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('IndexedDB: Offline result deleted with ID:', id);
        resolve();
      };
    });
  }

  async clearAllOfflineResults(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      const request = store.clear();

      request.onerror = () => {
        console.error('IndexedDB: Failed to clear offline results', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('IndexedDB: All offline results cleared');
        resolve();
      };
    });
  }
}

// Singleton instance
export const indexedDBHelper = new IndexedDBHelper();

// Initialize on module load
indexedDBHelper.init().catch(error => {
  console.error('IndexedDB: Failed to initialize', error);
});

export type { OfflineResult };