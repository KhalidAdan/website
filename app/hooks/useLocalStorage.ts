import { useSyncExternalStore, useCallback } from "react";

/** Custom event name used to notify same-tab subscribers of localStorage writes. */
const STORAGE_EVENT = "app-storage";

type Serializable = string | number | boolean | null;

/**
 * Subscribe to localStorage changes for a given key.
 * Listens to:
 *  - The native `storage` event (cross-tab sync)
 *  - A custom `app-storage` event (same-tab writes)
 */
function subscribeToKey(key: string, callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) callback();
  };
  const onAppStorage = (e: Event) => {
    if ((e as CustomEvent).detail === key) callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, onAppStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, onAppStorage);
  };
}

/**
 * Read a localStorage key, returning the stored value or the fallback.
 * Values are stored as plain strings (no JSON wrapper) for simple scalars.
 */
function readKey<T extends Serializable>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw as unknown as T;
}

/**
 * React hook backed by `useSyncExternalStore` that reads from and writes to
 * localStorage. Provides cross-tab sync via the native `storage` event and
 * same-tab reactivity via a custom DOM event.
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
 */
export function useLocalStorage<T extends Serializable>(
  key: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (cb: () => void) => subscribeToKey(key, cb),
    [key],
  );

  const getSnapshot = useCallback(() => readKey(key, fallback), [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = readKey(key, fallback);
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      localStorage.setItem(key, String(resolved));
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
    },
    [key, fallback],
  );

  return [value, setValue];
}
