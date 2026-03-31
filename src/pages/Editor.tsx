import { MilkdownEditor } from "@/components/MilkdownEditor";
import {
  loadSavedContent,
  loadSavedMode,
  saveMode,
  useAutoSave,
} from "@/hooks/useAutoSave";
import { useSaveToDisk } from "@/hooks/useSaveToDisk";
import { useTheme } from "@/hooks/useTheme";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type ViewMode = "read" | "edit";

export default function Editor() {
  const { theme, toggle } = useTheme();
  const [value, setValue] = useState<string>(``);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>("read");
  const contentRef = useRef<string>(value);

  // Keep the ref in sync for the save-to-disk hook
  contentRef.current = value;

  // Auto-save to IndexedDB
  useAutoSave(value);

  // Ctrl+S → save raw markdown to disk
  useSaveToDisk(contentRef);

  // Load persisted content and mode on mount
  useEffect(() => {
    Promise.all([loadSavedContent(), loadSavedMode()]).then(([saved, mode]) => {
      if (saved !== null) setValue(saved);
      setView(mode);
      setLoaded(true);
    });
  }, []);

  // Persist mode when it changes
  useEffect(() => {
    if (loaded) saveMode(view);
  }, [view, loaded]);

  const handleChange = useCallback((markdown: string) => {
    setValue(markdown);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">
          loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col " data-color-mode={theme}>
      {/* ─── Top bar ─── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-300 dark:border-gray-600 transition-colors">
        <Link
          to="/"
          className="font-sans text-sm font-semibold tracking-tight text-primary hover:text-accent transition-colors"
        >
          khld<span className="text-accent">.</span>dev
        </Link>

        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-wider uppercase">
            {(["read", "edit"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className="px-2 py-1 rounded cursor-pointer transition-colors hover:bg-accent hover:text-ink-dark"
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="text-[11px] font-mono tracking-wider uppercase cursor-pointer"
          >
            {theme === "light" ? "dark" : "light"}
          </button>
        </div>
      </header>

      {/* ─── Editor ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <MilkdownEditor
          defaultValue={value}
          onChange={handleChange}
          readonly={view === "read"}
          className="flex-1 flex flex-col"
        />
      </main>

      {/* ─── Status bar ─── */}
      <footer className="flex items-center justify-between px-4 py-2 font-mono text-[10px] tracking-wider uppercase border-t border-gray-300 dark:border-gray-600 transition-colors">
        <span>{value.length.toLocaleString()} chars</span>
        <span>auto-saved</span>
        <span>ctrl+s → .md</span>
      </footer>
    </div>
  );
}
