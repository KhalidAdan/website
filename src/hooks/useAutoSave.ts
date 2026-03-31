import { useEffect, useRef, useCallback } from "react";
import { get, set } from "idb-keyval";

const STORAGE_KEY = "md-editor-content";

interface StoredDoc {
  markdown: string;
  updatedAt: number;
}

/**
 * Debounced auto-save to IndexedDB.
 * Flushes immediately when the tab is hidden (covers tab-close, switch, mobile minimize).
 */
export function useAutoSave(content: string, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const doc: StoredDoc = { markdown: content, updatedAt: Date.now() };
      set(STORAGE_KEY, doc);
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [content, delay]);

  const flush = useCallback(() => {
    const doc: StoredDoc = {
      markdown: contentRef.current,
      updatedAt: Date.now(),
    };
    set(STORAGE_KEY, doc);
  }, []);

  // Flush on tab hide (more reliable than beforeunload on mobile)
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [flush]);
}

/**
 * Load saved content from IndexedDB. Returns null if nothing stored.
 */
export async function loadSavedContent(): Promise<string | null> {
  try {
    const doc = await get<StoredDoc>(STORAGE_KEY);
    return doc?.markdown ?? null;
  } catch {
    return null;
  }
}
