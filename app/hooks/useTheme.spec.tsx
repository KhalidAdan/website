import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme, getThemeScript } from "./useTheme";

describe("useTheme", () => {
  it("provides default theme", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });
    expect(result.current.theme).toBe("light");
  });

  it("toggles theme", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe("light");
  });

  it("updates localStorage on theme change", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.toggle();
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "theme",
      "dark"
    );
  });

  it("initializes from localStorage", () => {
    window.localStorage.setItem("theme", "dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe("dark");
  });

  it("sets cookie on theme change", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.toggle();
    });

    expect(document.cookie).toContain("theme=dark");
  });

  it("initializes from localStorage even when cookie exists", () => {
    document.cookie = "theme=dark";
    window.localStorage.setItem("theme", "light");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe("light");
  });
});

describe("getThemeScript", () => {
  it("returns script that sets dark class when cookie is dark", () => {
    document.cookie = "theme=dark";
    const script = getThemeScript();
    expect(script).toContain("'dark' === 'dark'");
  });

  it("returns script that sets light class when cookie is light", () => {
    document.cookie = "theme=light";
    const script = getThemeScript();
    expect(script).not.toContain("'dark' === 'dark'");
  });

  it("falls back to localStorage when no cookie", () => {
    window.localStorage.setItem("theme", "dark");
    const script = getThemeScript();
    expect(script).toContain("'dark' === 'dark'");
  });

  it("falls back to system preference when no storage", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const script = getThemeScript();
    expect(script).toContain("'dark' === 'dark'");
  });
});