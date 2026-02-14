/**
 * localStorage wrapper with async interface and JSON serialization
 */

const QUOTA_BYTES = 5 * 1024 * 1024; // 5MB typical localStorage quota

/**
 * Get a single item from localStorage
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error getting item from localStorage: ${key}`, error);
    return null;
  }
}

/**
 * Get multiple items from localStorage
 */
export async function getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
  const result: Record<string, T | null> = {};
  for (const key of keys) {
    result[key] = await get<T>(key);
  }
  return result;
}

/**
 * Get all items from localStorage
 */
export async function getAll(): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      result[key] = await get(key);
    }
  }
  return result;
}

/**
 * Set a single item in localStorage
 */
export async function set<T>(key: string, value: T): Promise<boolean> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting item in localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Set multiple items in localStorage
 */
export async function setMultiple<T>(items: Record<string, T>): Promise<boolean> {
  try {
    for (const [key, value] of Object.entries(items)) {
      await set(key, value);
    }
    return true;
  } catch (error) {
    console.error("Error setting multiple items in localStorage", error);
    return false;
  }
}

/**
 * Remove a single item from localStorage
 */
export async function remove(key: string): Promise<boolean> {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item from localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Remove multiple items from localStorage
 */
export async function removeMultiple(keys: string[]): Promise<boolean> {
  try {
    for (const key of keys) {
      await remove(key);
    }
    return true;
  } catch (error) {
    console.error("Error removing multiple items from localStorage", error);
    return false;
  }
}

/**
 * Clear all items from localStorage
 */
export async function clear(): Promise<boolean> {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error("Error clearing localStorage", error);
    return false;
  }
}

/**
 * Check if a key exists in localStorage
 */
export async function exists(key: string): Promise<boolean> {
  return localStorage.getItem(key) !== null;
}

/**
 * Get storage usage statistics
 */
export async function getUsage(): Promise<{
  bytesInUse: number;
  quotaBytes: number;
  percentUsed: number;
}> {
  let bytesInUse = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        // Calculate bytes: key + value + 2 for quotes
        bytesInUse += (key.length + value.length) * 2;
      }
    }
  }

  const percentUsed = (bytesInUse / QUOTA_BYTES) * 100;

  return {
    bytesInUse,
    quotaBytes: QUOTA_BYTES,
    percentUsed: Math.round(percentUsed * 100) / 100, // Round to 2 decimals
  };
}
