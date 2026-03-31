import { Link, useOutletContext } from "react-router";
import type { Route } from "./+types/home";
import { getSession, getEnv } from "~/utils/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const session = await getSession(request, env);
  if (session) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/md" },
    });
  }
  return null;
}

export default function Home() {
  const { theme } = useOutletContext<{ user: unknown; theme?: { theme: string; toggle: () => void } }>();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
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

      <p className="fixed bottom-5 text-[10px] font-mono tracking-widest uppercase">
        <Link to="/login">log in</Link> or <Link to="/signup">sign up</Link>
      </p>
    </div>
  );
}
