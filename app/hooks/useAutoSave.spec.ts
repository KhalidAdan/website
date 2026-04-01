import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadSavedContent, loadSavedMode, saveMode } from "./useAutoSave";

vi.mock("idb-keyval");

describe("useAutoSave", () => {
  describe("loadSavedContent", () => {
    it("returns null when nothing stored", async () => {
      const { get } = await import("idb-keyval");
      vi.mocked(get).mockResolvedValueOnce(undefined);
      const result = await loadSavedContent();
      expect(result).toBeNull();
    });

    it("returns markdown when content exists", async () => {
      const { get } = await import("idb-keyval");
      vi.mocked(get).mockResolvedValueOnce({
        markdown: "# Hello World",
        updatedAt: Date.now(),
      });
      const result = await loadSavedContent();
      expect(result).toBe("# Hello World");
    });
  });

  describe("loadSavedMode", () => {
    it("returns 'raw' when nothing stored", async () => {
      const { get } = await import("idb-keyval");
      vi.mocked(get).mockResolvedValueOnce(undefined);
      const result = await loadSavedMode();
      expect(result).toBe("raw");
    });

    it("returns stored mode", async () => {
      const { get } = await import("idb-keyval");
      vi.mocked(get).mockResolvedValueOnce("md");
      const result = await loadSavedMode();
      expect(result).toBe("md");
    });
  });

  describe("saveMode", () => {
    it("calls set with mode key", async () => {
      const { set } = await import("idb-keyval");
      vi.mocked(set).mockResolvedValueOnce(undefined);
      saveMode("md");
      expect(set).toHaveBeenCalledWith("md-editor-mode", "md");
    });
  });
});