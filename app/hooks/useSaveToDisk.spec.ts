import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as idbKeyval from "idb-keyval";
import { useSaveToDisk } from "./useSaveToDisk";

describe("useSaveToDisk", () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, "addEventListener");
    removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    vi.spyOn(idbKeyval, "set").mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("adds keydown event listener on mount", () => {
    const contentRef = { current: "# Test content" };
    renderHook(() => useSaveToDisk(contentRef as any));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("removes event listener on unmount", () => {
    const contentRef = { current: "# Test content" };
    const { unmount } = renderHook(() => useSaveToDisk(contentRef as any));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  it("saves content when Ctrl+S pressed with File System API", async () => {
    const mockContent = "# Test markdown";
    const contentRef = { current: mockContent };

    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockHandle = {
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      current: null as any,
    };

    vi.stubGlobal("showSaveFilePicker", vi.fn().mockResolvedValue(mockHandle));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    renderHook(() => useSaveToDisk(contentRef as any));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
    });

    const handler = addEventListenerSpy.mock.calls[0][1];
    await act(async () => {
      handler(event);
    });

    expect(mockWritable.write).toHaveBeenCalledWith(mockContent);
    expect(mockWritable.close).toHaveBeenCalled();
  });
});