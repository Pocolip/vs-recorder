// src/services/StorageService.js

class StorageService {
    /**
     * Get a single item by key
     */
    static async get(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            return result[key] || null;
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
            const result = await chrome.storage.local.get(keys);
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
            const result = await chrome.storage.local.get(null);
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
            await chrome.storage.local.set({ [key]: value });
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
            await chrome.storage.local.set(items);
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
            await chrome.storage.local.remove([key]);
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
            await chrome.storage.local.remove(keys);
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
            await chrome.storage.local.clear();
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
            const result = await chrome.storage.local.get([key]);
            return result[key] !== undefined;
        } catch (error) {
            console.error(`Error checking if ${key} exists:`, error);
            return false;
        }
    }

    /**
     * Get storage usage info
     */
    static async getUsage() {
        try {
            const usage = await chrome.storage.local.getBytesInUse();
            return {
                bytesInUse: usage,
                quotaBytes: chrome.storage.local.QUOTA_BYTES || 10485760, // 10MB default
                percentUsed: Math.round((usage / (chrome.storage.local.QUOTA_BYTES || 10485760)) * 100)
            };
        } catch (error) {
            console.error('Error getting storage usage:', error);
            return null;
        }
    }
}

export default StorageService;