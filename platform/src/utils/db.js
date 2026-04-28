import { openDB } from 'idb';

const DB_NAME = 'stockbud-db';
const STORE_NAME = 'keyval';

const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    },
});

export const storage = {
    async get(key) {
        return (await dbPromise).get(STORE_NAME, key);
    },
    async set(key, val) {
        return (await dbPromise).put(STORE_NAME, val, key);
    },
    async delete(key) {
        return (await dbPromise).delete(STORE_NAME, key);
    },
    async clear() {
        return (await dbPromise).clear(STORE_NAME);
    },
    async keys() {
        return (await dbPromise).getAllKeys(STORE_NAME);
    },
};


export async function migrateLocalStorage() {
    const keysToMigrate = ['theme', 'shopifyShop', 'shopifyToken'];

    try {
        for (const key of keysToMigrate) {
            const val = localStorage.getItem(key);
            if (val !== null) {
                await storage.set(key, val);
                
                
                console.log(`Migrated ${key} to IndexedDB`);
            }
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
}
