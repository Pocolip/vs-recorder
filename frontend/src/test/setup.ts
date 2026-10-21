import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 25 also supplies a global localStorage; isolate browser storage per test.
beforeEach(() => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
    key: (index) => [...values.keys()][index] ?? null,
  };
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
