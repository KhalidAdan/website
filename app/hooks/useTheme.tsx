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

/**
 * Critical inline CSS injected before external stylesheets.
 * Matches the background/text colors from app.css so the correct
 * background is visible before Tailwind CSS finishes loading.
 */
export const CRITICAL_THEME_CSS = [
  "html{background:#fdfcff;color:#1b1c1d}",
  "html.dark{background:#1b1c1d;color:#f8f9ff;color-scheme:dark}",
].join("");

/**
 * Returns a blocking client-side IIFE that detects the user's theme
 * and applies the `.dark` class to `<html>` before any paint.
 *
 * Resolution order: cookie -> localStorage -> system preference.
 * Always writes the resolved value back to the cookie so the server
 * can render the correct class on the next request.
 */
export function getThemeScript(): string {
  return [
    "(function(){",
    "try{",
    'var c=document.cookie.match(/theme=(dark|light)/);',
    "var t=c?c[1]:null;",
    "if(!t){var s=localStorage.getItem('theme');t=s==='dark'||s==='light'?s:null}",
    "if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}",
    "document.documentElement.classList.toggle('dark',t==='dark');",
    "document.cookie='theme='+t+';path=/;max-age=31536000;samesite=lax';",
    "}catch(e){}",
    "})()",
  ].join("");
}

/**
 * Returns a script that listens for system color-scheme changes.
 * Only auto-switches when no theme cookie exists (i.e. the user
 * hasn't explicitly chosen a theme via the toggle).
 */
export function getSystemPrefListenerScript(): string {
  return [
    "(function(){",
    "try{",
    "window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(e){",
    "var c=document.cookie.match(/theme=(dark|light)/);",
    "if(!c){",
    "var t=e.matches?'dark':'light';",
    "document.documentElement.classList.toggle('dark',e.matches);",
    "document.cookie='theme='+t+';path=/;max-age=31536000;samesite=lax';",
    "localStorage.setItem('theme',t);",
    "}",
    "});",
    "}catch(e){}",
    "})()",
  ].join("");
}
