import { useCallback, useEffect, useRef, useState } from "react";
import { Form, Link, useLoaderData } from "react-router";
import { MilkdownEditor } from "~/components/MilkdownEditor";
import {
  loadSavedContent,
  loadSavedMode,
  saveMode,
  useAutoSave,
} from "~/hooks/useAutoSave";
import { useSaveToDisk } from "~/hooks/useSaveToDisk";
import { useTheme } from "~/hooks/useTheme";
import { getEnv, requireSession } from "~/utils/auth.server";
import type { Route } from "./+types/md";

type ViewMode = "raw" | "md";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const { user } = await requireSession(request, env);
  return { user: { id: user.id, name: user.name, email: user.email } };
}

export default function Editor() {
  const { user } = useLoaderData<typeof loader>();
  const { theme, toggle } = useTheme();
  const [value, setValue] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ViewMode>("raw");
  const contentRef = useRef<string>(value);

  contentRef.current = value;

  useAutoSave(value);
  useSaveToDisk(contentRef);

  useEffect(() => {
    Promise.all([loadSavedContent(), loadSavedMode()]).then(([saved, mode]) => {
      if (saved !== null) setValue(saved);
      setView(mode);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveMode(view);
  }, [view, loaded]);

  const handleChange = useCallback((markdown: string) => {
    setValue(markdown);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs animate-pulse">loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" data-color-mode={theme}>
      <header className="flex items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="font-sans text-sm font-semibold tracking-tight transition-colors hover:text-accent"
        >
          khld<span className="text-accent">.</span>dev
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 font-mono text-[11px] tracking-wider uppercase">
            {(["raw", "md"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-2 py-1 rounded cursor-pointer transition-colors hover:bg-accent hover:text-white`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={toggle}
            className="text-[11px] font-mono tracking-wider uppercase cursor-pointer"
          >
            {theme === "light" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-sun-medium-icon lucide-sun-medium"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v1" />
                <path d="M12 20v1" />
                <path d="M3 12h1" />
                <path d="M20 12h1" />
                <path d="m18.364 5.636-.707.707" />
                <path d="m6.343 17.657-.707.707" />
                <path d="m5.636 5.636.707.707" />
                <path d="m17.657 17.657.707.707" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-moon-icon lucide-moon"
              >
                <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
              </svg>
            )}
          </button>

          <Form method="post" action="/logout">
            <button
              type="submit"
              className="text-[11px] font-mono tracking-wider uppercase cursor-pointer"
            >
              log out
            </button>
          </Form>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {view === "raw" ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 p-4 font-mono text-sm resize-none bg-transparent outline-none"
          />
        ) : (
          <MilkdownEditor
            defaultValue={value}
            onChange={handleChange}
            className="flex-1 flex flex-col"
          />
        )}
      </main>

      <footer className="flex items-center justify-between px-4 py-2 font-mono text-[10px] tracking-wider uppercase">
        <span>{value.length.toLocaleString()} chars</span>
        <span>auto-saved</span>
        <span>ctrl+s → .md</span>
      </footer>
    </div>
  );
}
