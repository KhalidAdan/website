import { useCallback, useMemo, useRef, useState } from "react";
import { Form, Link, useLoaderData, useNavigate, useParams } from "react-router";
import { eq, desc, and } from "drizzle-orm";
import { MilkdownEditor } from "~/components/MilkdownEditor";
import { DocumentTree } from "~/components/DocumentTree";
import { useTheme } from "~/hooks/useTheme";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { getEnv, requireSession } from "~/utils/auth.server";
import { getDb } from "~/utils/db.server";
import { document } from "~/db/schema";
import type { Route } from "./+types/md";

type ViewMode = "raw" | "md";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const env = getEnv(context);
  const { user } = await requireSession(request, env);
  const db = getDb(env.DB);

  const docs = await db.query.document.findMany({
    where: eq(document.userId, user.id),
    orderBy: [desc(document.isFolder), document.name],
  });

  let selectedDoc = null;
  if (params.docId) {
    selectedDoc =
      docs.find((d) => d.id === params.docId) ??
      (await db.query.document.findFirst({
        where: and(eq(document.id, params.docId), eq(document.userId, user.id)),
      })) ??
      null;
  }

  return {
    user: { id: user.id, name: user.name, email: user.email },
    documents: docs,
    selectedDoc,
  };
}

export default function Editor() {
  const { user, documents, selectedDoc } = useLoaderData<typeof loader>();
  const params = useParams();
  const docId = params.docId || null;
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [view, setView] = useLocalStorage<ViewMode>("viewMode", "raw");

  // Editor state — reset when the active document changes
  const [value, setValue] = useState(selectedDoc?.content || "");
  const [prevDocId, setPrevDocId] = useState(docId);
  if (docId !== prevDocId) {
    setPrevDocId(docId);
    setValue(selectedDoc?.content || "");
  }

  const docName = selectedDoc?.name || "";

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = useMemo(() => {
    const words = value.trim().split(/\s+/);
    return words[0] === "" ? 0 : words.length;
  }, [value]);

  // Debounced auto-save — lives in the event handler, not an effect
  const handleChange = useCallback(
    (markdown: string) => {
      setValue(markdown);
      if (!docId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const id = docId;
      saveTimeoutRef.current = setTimeout(() => {
        fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: markdown }),
        }).catch((e) => console.error("Failed to save:", e));
      }, 1000);
    },
    [docId],
  );

  const handleSelectDoc = useCallback(
    (id: string) => {
      // Clear any pending save for the previous doc
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setView("md");
      navigate(`/md/${id}`);
    },
    [navigate, setView],
  );

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
                className={`px-2 py-1 rounded cursor-pointer transition-colors hover:bg-accent hover:text-white uppercase`}
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

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 overflow-hidden">
          <DocumentTree documents={documents} selectedId={docId} onSelect={handleSelectDoc} />
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          {docId && selectedDoc ? (
            view === "raw" ? (
              <textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                className="flex-1 p-4 font-mono text-sm resize-none bg-transparent outline-none"
              />
            ) : (
              <MilkdownEditor
                key={docId}
                defaultValue={value}
                onChange={handleChange}
                className="flex-1 flex flex-col"
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-sm">
              Select a document to edit
            </div>
          )}
        </main>
      </div>

      <footer className="shrink-0 sticky bottom-0 bg-editor dark:bg-editor-dark flex items-center justify-between px-4 py-2 font-mono text-[10px] tracking-wider uppercase">
        <span>
          {wordCount.toLocaleString()} words · {value.length.toLocaleString()}{" "}
          chars
        </span>
        {docId ? <span>auto-saved</span> : <span>-</span>}
        <span>ctrl+s → .md</span>
      </footer>
    </div>
  );
}
