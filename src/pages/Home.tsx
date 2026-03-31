import { useTheme } from "@/hooks/useTheme";
import { Link } from "react-router-dom";

export default function Home() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      {/* Theme toggle — top right */}
      <button
        onClick={toggle}
        className="fixed top-5 right-5 text-xs font-mono tracking-wider uppercase
                   text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]
                   hover:text-[var(--color-ink)] dark:hover:text-[var(--color-ink-dark)]
                   transition-colors cursor-pointer"
      >
        {theme === "light" ? "dark" : "light"}
      </button>

      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="font-sans text-4xl font-semibold tracking-tight">
          khld<span className="text-[var(--color-accent)]">.</span>dev
        </h1>

        <p className="text-[var(--color-muted)] dark:text-[var(--color-muted-dark)] text-base leading-relaxed">
          A personal space for writing and thinking in markdown for Khalid.
        </p>

        <Link
          to="/md"
          className="inline-block font-mono text-sm tracking-wide px-6 py-3
                     border border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                     rounded-md
                     hover:border-[var(--color-ink)] dark:hover:border-[var(--color-ink-dark)]
                     transition-colors"
        >
          open editor →
        </Link>
      </div>

      <p className="fixed bottom-5 text-[10px] font-mono text-[var(--color-muted)] dark:text-[var(--color-muted-dark)] tracking-widest uppercase">
        Note: ctrl+s saves document state as .md
      </p>
    </div>
  );
}
