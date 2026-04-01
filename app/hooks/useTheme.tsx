import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemDefault(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : getSystemDefault();
}

function getThemeFromCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/theme=([^;]+)/);
  return match ? (match[1] === "dark" ? "dark" : "light") : null;
}

/** Apply the theme class to <html>. */
function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    document.cookie = `theme=${theme};path=/;max-age=31536000;samesite=lax`;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function getThemeScript(): string {
  const cookieTheme = getThemeFromCookie();
  const theme = cookieTheme
    ? cookieTheme
    : (() => {
        const stored = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
        return stored === "light" || stored === "dark"
          ? stored
          : (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light");
      })();
  return `document.documentElement.classList.toggle('dark', '${theme}' === 'dark');`;
}
