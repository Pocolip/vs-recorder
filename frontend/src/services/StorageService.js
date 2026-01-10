// src/services/StorageService.js

/**
 * Storage Service - uses localStorage instead of chrome.storage for web app
 * Maintains same async interface as Chrome extension version for compatibility
 */
class StorageService {
    /**
     * Get a single item by key
     */
    static async get(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    }

    /**
     * Get multiple items by keys array
     */
    static async getMultiple(keys) {
        try {
            const result = {};
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    result[key] = JSON.parse(value);
                }
            });
            return result;
        } catch (error) {
            console.error('Error getting multiple items:', error);
            return {};
        }
    }

    /**
     * Get all stored data
     */
    static async getAll() {
        try {
            const result = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (value !== null) {
                    result[key] = JSON.parse(value);
                }
            }
            return result;
        } catch (error) {
            console.error('Error getting all data:', error);
            return {};
        }
    }

    /**
     * Set a single item
     */
    static async set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            return false;
        }
    }

    /**
     * Set multiple items from object
     */
    static async setMultiple(items) {
        try {
            Object.entries(items).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
            return true;
        } catch (error) {
            console.error('Error setting multiple items:', error);
            return false;
        }
    }

    /**
     * Remove a single item by key
     */
    static async remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            return false;
        }
    }

    /**
     * Remove multiple items by keys array
     */
    static async removeMultiple(keys) {
        try {
            keys.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('Error removing multiple items:', error);
            return false;
        }
    }

    /**
     * Clear all storage
     */
    static async clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    /**
     * Check if a key exists
     */
    static async exists(key) {
        try {
            return localStorage.getItem(key) !== null;
        } catch (error) {
            console.error(`Error checking if ${key} exists:`, error);
            return false;
        }
    }

    /**
     * Get storage usage info (approximation for localStorage)
     */
    static async getUsage() {
        try {
            let bytesInUse = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                // Approximate byte size (each char is ~2 bytes in UTF-16)
                bytesInUse += (key.length + value.length) * 2;
            }

            // Most browsers allow ~5-10MB for localStorage
            const quotaBytes = 5 * 1024 * 1024; // 5MB

            return {
                bytesInUse,
                quotaBytes,
                percentUsed: Math.round((bytesInUse / quotaBytes) * 100)
            };
        } catch (error) {
            console.error('Error getting storage usage:', error);
            return null;
        }
    }
}

export default StorageService;
