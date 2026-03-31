import { loadSavedContent, useAutoSave } from "@/hooks/useAutoSave";
import { useSaveToDisk } from "@/hooks/useSaveToDisk";
import { useTheme } from "@/hooks/useTheme";
import MDEditor from "@uiw/react-md-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const PLACEHOLDER = `# Hello

Start writing markdown here. Your work is auto-saved locally.

**Ctrl+S** saves to disk as a \`.md\` file.
`;

type ViewMode = "live" | "markdown";

export default function Editor() {
  const { theme, toggle } = useTheme();
  const [value, setValue] = useState<string>(PLACEHOLDER);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>("live");
  const contentRef = useRef<string>(value);

  // Keep the ref in sync for the save-to-disk hook
  contentRef.current = value;

  // Auto-save to IndexedDB
  useAutoSave(value);

  // Ctrl+S → save raw markdown to disk
  useSaveToDisk(contentRef);

  // Load persisted content on mount
  useEffect(() => {
    loadSavedContent().then((saved) => {
      if (saved !== null) setValue(saved);
      setLoaded(true);
    });
  }, []);

  const handleChange = useCallback((val?: string) => {
    setValue(val ?? "");
  }, []);

  // Map our view mode to the editor's preview prop
  const previewMode = view === "live" ? "preview" : "edit";

  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs text-muted dark:text-muted animate-pulse">
          loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" data-color-mode={theme}>
      {/* ─── Top bar ─── */}
      <header
        className="flex items-center justify-between px-4 py-3
                    border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
      >
        <Link
          to="/"
          className="font-sans text-sm font-semibold tracking-tight
                     text-[var(--color-ink)] dark:text-[var(--color-ink-dark)]
                     hover:text-[var(--color-accent)] transition-colors"
        >
          khld<span className="text-[var(--color-accent)]">.</span>dev
        </Link>

        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 font-mono text-[11px] tracking-wider uppercase">
            {(["edit", "live", "preview"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  view === mode
                    ? "bg-[var(--color-ink)] dark:bg-[var(--color-ink-dark)] text-[var(--color-surface)] dark:text-[var(--color-surface-dark)]"
                    : "text-[var(--color-muted)] dark:text-[var(--color-muted-dark)] hover:text-[var(--color-ink)] dark:hover:text-[var(--color-ink-dark)]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="text-[11px] font-mono tracking-wider uppercase
                       text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]
                       hover:text-[var(--color-ink)] dark:hover:text-[var(--color-ink-dark)]
                       transition-colors cursor-pointer"
          >
            {theme === "light" ? "dark" : "light"}
          </button>
        </div>
      </header>

      {/* ─── Editor ─── */}
      <main className="flex-1 flex flex-col">
        <MDEditor
          value={value}
          onChange={handleChange}
          preview={previewMode}
          height="100%"
          visibleDragbar={false}
          hideToolbar
          className="flex-1 !rounded-none"
          previewOptions={{
            className:
              "prose prose-stone dark:prose-invert max-w-none !bg-transparent",
          }}
        />
      </main>

      {/* ─── Status bar ─── */}
      <footer
        className="flex items-center justify-between px-4 py-2
                    border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                    font-mono text-[10px] tracking-wider uppercase
                    text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]"
      >
        <span>{value.length.toLocaleString()} chars</span>
        <span>auto-saved</span>
        <span>ctrl+s → .md</span>
      </footer>
    </div>
  );
}
