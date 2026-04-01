import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  ThemeProvider,
  useTheme,
  getThemeScript,
  getSystemPrefListenerScript,
  CRITICAL_THEME_CSS,
} from "./useTheme";

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
  it("returns a self-executing function", () => {
    const script = getThemeScript();
    expect(script).toMatch(/^\(function\(\)\{/);
    expect(script).toMatch(/\}\)\(\)$/);
  });

  it("checks cookie for theme value", () => {
    const script = getThemeScript();
    expect(script).toContain("document.cookie.match");
    expect(script).toContain("theme=(dark|light)");
  });

  it("falls back to localStorage", () => {
    const script = getThemeScript();
    expect(script).toContain("localStorage.getItem");
  });

  it("falls back to matchMedia for system preference", () => {
    const script = getThemeScript();
    expect(script).toContain("prefers-color-scheme:dark");
  });

  it("toggles dark class on documentElement", () => {
    const script = getThemeScript();
    expect(script).toContain("classList.toggle");
    expect(script).toContain("dark");
  });

  it("writes theme cookie for server-side rendering", () => {
    const script = getThemeScript();
    expect(script).toContain("document.cookie='theme='");
  });

  it("returns a consistent static string regardless of runtime state", () => {
    document.cookie = "theme=dark";
    const a = getThemeScript();
    document.cookie = "theme=light";
    const b = getThemeScript();
    expect(a).toBe(b);
  });
});

describe("CRITICAL_THEME_CSS", () => {
  it("includes light mode background color", () => {
    expect(CRITICAL_THEME_CSS).toContain("#fdfcff");
  });

  it("includes dark mode background color", () => {
    expect(CRITICAL_THEME_CSS).toContain("#1b1c1d");
  });

  it("targets html.dark selector", () => {
    expect(CRITICAL_THEME_CSS).toContain("html.dark");
  });

  it("sets color-scheme for dark mode", () => {
    expect(CRITICAL_THEME_CSS).toContain("color-scheme:dark");
  });
});

describe("getSystemPrefListenerScript", () => {
  it("returns a self-executing function", () => {
    const script = getSystemPrefListenerScript();
    expect(script).toMatch(/^\(function\(\)\{/);
    expect(script).toMatch(/\}\)\(\)$/);
  });

  it("listens for prefers-color-scheme changes", () => {
    const script = getSystemPrefListenerScript();
    expect(script).toContain("addEventListener");
    expect(script).toContain("change");
    expect(script).toContain("prefers-color-scheme:dark");
  });

  it("checks for existing cookie before overriding", () => {
    const script = getSystemPrefListenerScript();
    expect(script).toContain("document.cookie.match");
    expect(script).toContain("if(!c)");
  });
});