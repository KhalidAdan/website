import { useState } from "react";
import { Link, useNavigate, useRouteError } from "react-router";
import { authClient } from "~/utils/auth.client";
import type { Route } from "./+types/signup";
import { getSession, getEnv } from "~/utils/auth.server";

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="font-sans text-2xl font-semibold tracking-tight"
          >
            khld<span className="text-accent">.</span>dev
          </Link>
          <p className="mt-2 text-sm text-muted">Something went wrong</p>
        </div>
        <div className="text-center p-4 border border-accent rounded-md">
          <p className="font-mono text-xs text-accent">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
        </div>
        <div className="text-center">
          <Link to="/signup" className="font-mono text-sm underline">
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = await getSession(request, getEnv(context));
  if (session) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/md" },
    });
  }
  return null;
}

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authClient.signUp.email(
        { name, email, password },
        {
          onSuccess: () => navigate("/md"),
          onError: (ctx) => {
            setError(ctx.error.message ?? "Signup failed");
            setLoading(false);
          },
        },
      );
    } catch {
      setError("Unable to connect. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="font-sans text-2xl font-semibold tracking-tight"
          >
            khld<span className="text-accent">.</span>dev
          </Link>
          <p className="mt-2 text-sm text-muted">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-accent font-mono text-center">
              {error}
            </p>
          )}

          <input
            type="text"
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 font-mono text-sm bg-transparent
                       border border-border dark:border-border-dark
                       rounded-md outline-none
                       focus:border-ink dark:focus:border-ink-dark
                       transition-colors"
            autoComplete="name"
          />

          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 font-mono text-sm bg-transparent
                       border border-border dark:border-border-dark
                       rounded-md outline-none
                       focus:border-ink dark:focus:border-ink-dark
                       transition-colors"
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 font-mono text-sm bg-transparent
                       border border-border dark:border-border-dark
                       rounded-md outline-none
                       focus:border-ink dark:focus:border-ink-dark
                       transition-colors"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-mono text-sm tracking-wide cursor-pointer
                       bg-ink dark:bg-ink-dark
                       text-surface dark:text-surface-dark
                       rounded-md transition-opacity disabled:opacity-50"
          >
            {loading ? "creating account…" : "sign up"}
          </button>
        </form>

        <p className="text-center text-xs text-muted">
          already have an account?{" "}
          <Link to="/login" className="underline underline-offset-2">
            log in
          </Link>
        </p>
      </div>
    </div>
  );
}
