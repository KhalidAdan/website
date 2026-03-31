import { useEffect, useRef } from "react";

/**
 * Intercepts Ctrl/Cmd+S and saves the current markdown as a .md file.
 * Uses the File System Access API when available (lets users pick location),
 * falls back to a classic download link.
 */
export function useSaveToDisk(contentRef: React.RefObject<string>) {
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const markdown = contentRef.current ?? "";
        await saveMarkdown(markdown, fileHandleRef);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [contentRef]);
}

async function saveMarkdown(
  markdown: string,
  handleRef: React.MutableRefObject<FileSystemFileHandle | null>
) {
  // Try File System Access API (Chromium browsers)
  if ("showSaveFilePicker" in window) {
    try {
      // Reuse the handle if user already picked a location this session
      const handle =
        handleRef.current ??
        (await (window as any).showSaveFilePicker({
          suggestedName: "document.md",
          types: [
            {
              description: "Markdown",
              accept: { "text/markdown": [".md"] },
            },
          ],
        }));

      handleRef.current = handle;
      const writable = await handle.createWritable();
      await writable.write(markdown);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the picker — that's fine, just bail
      if (err?.name === "AbortError") return;
    }
  }

  // Fallback: classic download
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "document.md";
  a.click();
  URL.revokeObjectURL(url);
}
