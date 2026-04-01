import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { getSession, getEnv } from "~/utils/auth.server";
import { useTheme } from "~/hooks/useTheme";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const session = await getSession(request, env);
  return { user: session };
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();
  const { theme } = useTheme();

  return (
    <div className="h-dvh flex flex-col" data-color-mode={theme}>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="font-sans text-4xl font-semibold tracking-tight">
            khld<span className="text-accent">.</span>dev
          </h1>

          <p className="text-base leading-relaxed">
            A personal space for writing and thinking in markdown.
          </p>

          <Link
            to="/md"
            className="inline-block font-mono text-sm tracking-wide px-6 py-3
                       border hover:border-accent hover:text-accent
                       rounded-md transition-colors"
          >
            open editor →
          </Link>
        </div>
      </div>

      <p className="shrink-0 sticky bottom-0 bg-editor dark:bg-editor-dark text-[10px] font-mono tracking-widest uppercase text-center py-2">
        <Link to="/login">log in</Link> or <Link to="/signup">sign up</Link>
      </p>
    </div>
  );
}
