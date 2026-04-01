import { createContext, useContext, useCallback, type ReactNode } from "react";
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

/** Apply the theme class to <html>. Called on toggle and once at module load. */
function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
}

// Apply immediately at module load to avoid FOUC
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("theme");
  applyTheme(stored === "light" || stored === "dark" ? stored : getSystemDefault());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", getSystemDefault());

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      applyTheme(next);
      return next;
    });
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
