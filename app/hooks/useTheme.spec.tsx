import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./useTheme";

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
    vi.mocked(window.localStorage.getItem).mockReturnValue("dark");

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe("dark");
  });
});