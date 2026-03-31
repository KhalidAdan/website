# Adding authentication to an existing React Router 7 app

## Context

You are working on `khld.dev/md` — a markdown editor. The project already exists as a **client-side React Router 7 app** using Vite, Tailwind CSS v4, and `@uiw/react-md-editor`. It currently has:

- A homepage at `/`
- An editor page at `/md`
- A `ThemeProvider` for light/dark mode
- Client-side auto-save to IndexedDB via `idb-keyval`
- A `useSaveToDisk` hook for Ctrl+S

Your job is to **add email/password authentication** using Better Auth, backed by Cloudflare D1 (SQLite) and R2 (object storage for syncing markdown files). This requires migrating the app from client-side-only routing to React Router 7 **framework mode** running on Cloudflare Workers.

Do NOT modify the editor, theme, auto-save, or save-to-disk features. Only add auth and the server infrastructure to support it.

---

## Step 1: Migrate to React Router 7 framework mode

The app is currently a client-side SPA with `BrowserRouter`. Framework mode gives you server-side loaders, actions, and a single Cloudflare Worker deployment.

### 1a. Install new dependencies

```bash
npm install @react-router/dev @cloudflare/vite-plugin better-auth drizzle-orm
npm install -D drizzle-kit wrangler
```

### 1b. Create `react-router.config.ts` in the project root

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
```

### 1c. Replace `vite.config.ts`

The existing config uses `@vitejs/plugin-react`. Replace it:

```typescript
import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
  ],
});
```

Remove `@vitejs/plugin-react` from `package.json` — the `reactRouter()` plugin handles React transforms.

### 1d. Create the Worker entry point at `workers/app.ts`

```typescript
import { createRequestHandler } from "react-router";

const handler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
```

The second argument `{ cloudflare: { env, ctx } }` is how every loader and action gets access to D1, R2, and secrets. Inside a loader: `context.cloudflare.env.DB` gives you the D1 database.

### 1e. Create `env.d.ts` in the project root

```typescript
/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}
```

### 1f. Create `wrangler.jsonc` in the project root

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "khld-md",
  "main": "./workers/app.ts",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./build/client"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "khld-md-db",
      "database_id": "PLACEHOLDER_FILL_AFTER_CREATION",
      "migrations_dir": "./drizzle"
    }
  ],
  "r2_buckets": [
    {
      "binding": "DOCS",
      "bucket_name": "khld-md-docs"
    }
  ],
  "vars": {
    "BETTER_AUTH_URL": "http://localhost:5173"
  }
}
```

### 1g. Create `.dev.vars` for local secrets

Cloudflare Workers ignores `.env` files. It reads `.dev.vars` instead:

```
BETTER_AUTH_SECRET=replace-with-output-of-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:5173
```

Add `.dev.vars` to `.gitignore`.

### 1h. Convert routing from `BrowserRouter` to framework routes

Delete the existing `App.tsx` that wraps `<BrowserRouter>` and `<Routes>`. In framework mode, routing is defined in `app/routes.ts` and the framework handles the router.

Create `app/routes.ts`:

```typescript
import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/sync/:docId", "routes/api.sync.$docId.ts"),
  route("md", "routes/md.tsx"),
] satisfies RouteConfig;
```

### 1i. Create `app/root.tsx`

This replaces the old `main.tsx` + `App.tsx` + `index.html` combination. It is the HTML shell for every page:

```typescript
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { getSession, getEnv } from "~/utils/auth.server";
import stylesheet from "~/app.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const session = await getSession(request, env);
  return {
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }
      : null,
  };
}

export default function Root() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet context={{ user }} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

Every route can access the user via `useOutletContext<{ user: { id: string; name: string; email: string } | null }>()`. The root loader runs on every navigation, so the user is always fresh.

### 1j. Delete old files

Remove `index.html`, `src/main.tsx`, and `src/App.tsx` — they are replaced by `app/root.tsx` and `workers/app.ts`. Move everything from `src/` into `app/` if it isn't already there. The framework expects your app code in `app/`.

### 1k. Update `package.json` scripts

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "preview": "vite preview",
    "deploy": "wrangler deploy",
    "typegen": "wrangler types",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply khld-md-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply khld-md-db --remote"
  }
}
```

The dev command changes from `vite` to `react-router dev`. This starts Vite with the Cloudflare plugin, which runs your server-side code in the `workerd` runtime locally. D1 and R2 bindings work in dev — they use a local SQLite file and local R2 directory stored in `.wrangler/`.

---

## Step 2: Database setup

### 2a. Drizzle config

Create `drizzle.config.ts` in the project root:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
```

### 2b. Schema

Create `app/db/schema.ts` with the four tables Better Auth requires:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

### 2c. SQL migration

Create `drizzle/0000_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `email_verified` integer NOT NULL DEFAULT 0,
  `image` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);

CREATE TABLE IF NOT EXISTS `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);

CREATE TABLE IF NOT EXISTS `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer,
  `updated_at` integer
);
```

### 2d. Apply migration locally

```bash
wrangler d1 migrations apply khld-md-db --local
```

---

## Step 3: Auth server utilities

### 3a. Database factory — `app/utils/db.server.ts`

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof getDb>;
```

### 3b. Auth instance — `app/utils/auth.server.ts`

On Cloudflare Workers, bindings (D1, R2, env vars) only exist inside a request. You CANNOT create a Better Auth singleton at the module level. You must create it per-request.

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "~/utils/db.server";
import * as schema from "~/db/schema";

export function createAuth(env: Env) {
  const db = getDb(env.DB);
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export function getEnv(context: { cloudflare: { env: Env } }): Env {
  return context.cloudflare.env;
}

export async function getSession(request: Request, env: Env) {
  const auth = createAuth(env);
  return auth.api.getSession({ headers: request.headers });
}

export async function requireSession(request: Request, env: Env) {
  const session = await getSession(request, env);
  if (!session) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  return session;
}
```

The `.server.ts` suffix is critical. It tells Vite to tree-shake this file out of the client bundle. Never import a `.server.ts` file from a client component.

### 3c. Auth client — `app/utils/auth.client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
```

No `baseURL` needed — in framework mode the client and server share the same origin. The auth client will POST to `/api/auth/sign-in/email`, `/api/auth/sign-up/email`, etc. automatically.

---

## Step 4: Auth routes

### 4a. Better Auth catch-all — `app/routes/api.auth.$.ts`

This route hands ALL requests under `/api/auth/*` to Better Auth's built-in handler. It handles sign-in, sign-up, sign-out, session validation, CSRF, and cookie management.

```typescript
import type { Route } from "./+types/api.auth.$";
import { createAuth, getEnv } from "~/utils/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = createAuth(getEnv(context));
  return auth.handler(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = createAuth(getEnv(context));
  return auth.handler(request);
}
```

### 4b. Login page — `app/routes/login.tsx`

```typescript
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "~/utils/auth.client";
import type { Route } from "./+types/login";
import { getSession, getEnv } from "~/utils/auth.server";

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

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => navigate("/md"),
        onError: (ctx) => {
          setError(ctx.error.message ?? "Login failed");
          setLoading(false);
        },
      },
    );
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="font-sans text-2xl font-semibold tracking-tight"
          >
            khld<span className="text-[var(--color-accent)]">.</span>dev
          </Link>
          <p className="mt-2 text-sm text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]">
            Log in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-[var(--color-accent)] font-mono text-center">
              {error}
            </p>
          )}

          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 font-mono text-sm bg-transparent
                       border border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                       rounded-md outline-none
                       focus:border-[var(--color-ink)] dark:focus:border-[var(--color-ink-dark)]
                       transition-colors"
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 font-mono text-sm bg-transparent
                       border border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                       rounded-md outline-none
                       focus:border-[var(--color-ink)] dark:focus:border-[var(--color-ink-dark)]
                       transition-colors"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-mono text-sm tracking-wide cursor-pointer
                       bg-[var(--color-ink)] dark:bg-[var(--color-ink-dark)]
                       text-[var(--color-surface)] dark:text-[var(--color-surface-dark)]
                       rounded-md transition-opacity disabled:opacity-50"
          >
            {loading ? "logging in…" : "log in"}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]">
          no account?{" "}
          <Link to="/signup" className="underline underline-offset-2">
            sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 4c. Signup page — `app/routes/signup.tsx`

Same structure as login but calls `authClient.signUp.email` and has an additional `name` field:

```typescript
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "~/utils/auth.client";
import type { Route } from "./+types/signup";
import { getSession, getEnv } from "~/utils/auth.server";

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
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="font-sans text-2xl font-semibold tracking-tight"
          >
            khld<span className="text-[var(--color-accent)]">.</span>dev
          </Link>
          <p className="mt-2 text-sm text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-[var(--color-accent)] font-mono text-center">
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
                       border border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                       rounded-md outline-none
                       focus:border-[var(--color-ink)] dark:focus:border-[var(--color-ink-dark)]
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
                       border border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                       rounded-md outline-none
                       focus:border-[var(--color-ink)] dark:focus:border-[var(--color-ink-dark)]
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
                       border border-[var(--color-border)] dark:border-[var(--color-border-dark)]
                       rounded-md outline-none
                       focus:border-[var(--color-ink)] dark:focus:border-[var(--color-ink-dark)]
                       transition-colors"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-mono text-sm tracking-wide cursor-pointer
                       bg-[var(--color-ink)] dark:bg-[var(--color-ink-dark)]
                       text-[var(--color-surface)] dark:text-[var(--color-surface-dark)]
                       rounded-md transition-opacity disabled:opacity-50"
          >
            {loading ? "creating account…" : "sign up"}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted)] dark:text-[var(--color-muted-dark)]">
          already have an account?{" "}
          <Link to="/login" className="underline underline-offset-2">
            log in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 4d. Logout route — `app/routes/logout.tsx`

This is a server-only route. The UI submits a `<Form method="post" action="/logout">`:

```typescript
import type { Route } from "./+types/logout";
import { createAuth, getEnv } from "~/utils/auth.server";

export async function action({ request, context }: Route.ActionArgs) {
  const auth = createAuth(getEnv(context));
  const signOutUrl = new URL("/api/auth/sign-out", request.url);
  const proxyReq = new Request(signOutUrl, {
    method: "POST",
    headers: request.headers,
  });
  await auth.handler(proxyReq);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie":
        "better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
    },
  });
}

export function loader() {
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}
```

### 4e. Sync API — `app/routes/api.sync.$docId.ts`

This is how the client saves/loads markdown to R2, scoped to the authenticated user:

```typescript
import type { Route } from "./+types/api.sync.$docId";
import { requireSession, getEnv } from "~/utils/auth.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const { user } = await requireSession(request, env);

  const key = `users/${user.id}/docs/${params.docId}.md`;
  const obj = await env.DOCS.get(key);

  if (!obj) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({
    markdown: await obj.text(),
    updatedAt: Number(obj.customMetadata?.updatedAt ?? 0),
  });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "PUT") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const env = getEnv(context);
  const { user } = await requireSession(request, env);
  const { markdown, updatedAt } = (await request.json()) as {
    markdown: string;
    updatedAt: number;
  };

  const key = `users/${user.id}/docs/${params.docId}.md`;
  await env.DOCS.put(key, markdown, {
    customMetadata: { updatedAt: String(updatedAt) },
  });

  return Response.json({ ok: true });
}
```

---

## Step 5: Protect the editor route

In the existing `app/routes/md.tsx` (the editor page), add a server loader that gates access:

```typescript
import type { Route } from "./+types/md";
import { requireSession, getEnv } from "~/utils/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const { user } = await requireSession(request, env);

  // Optionally load the user's doc from R2 here:
  const key = `users/${user.id}/docs/default.md`;
  const obj = await env.DOCS.get(key);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    remoteMarkdown: obj ? await obj.text() : null,
    remoteUpdatedAt: obj ? Number(obj.customMetadata?.updatedAt ?? 0) : 0,
  };
}

// The existing default export (the editor component) stays unchanged.
// It can now access loader data with useLoaderData().
```

`requireSession` will redirect to `/login` if the user isn't authenticated. No changes needed to the editor component itself — it just needs to call `useLoaderData()` if it wants the server-loaded doc.

---

## Step 6: Add logout to the editor UI

Somewhere in the editor's header/toolbar, add a logout form. This uses React Router's `<Form>` which submits to the `logout` action:

```typescript
import { Form } from "react-router";

// Inside your editor component's header:
<Form method="post" action="/logout">
  <button type="submit">log out</button>
</Form>;
```

---

## How local development works

1. Run `npm run dev` (which runs `react-router dev`)
2. The Cloudflare Vite plugin starts Vite's dev server but runs your server code in the **workerd** runtime (not Node.js). This means D1 and R2 bindings work locally.
3. D1 data is stored in `.wrangler/state/v3/d1/` as a SQLite file.
4. R2 data is stored in `.wrangler/state/v3/r2/` as files on disk.
5. Secrets come from `.dev.vars` (not `.env`).
6. Hot module replacement works for both client and server code.
7. Visit `http://localhost:5173`. Sign up, log in, and the session cookie is set. Protected routes redirect to `/login` if no session exists.

### Common gotchas

- **"Context is not available" from Better Auth CLI**: The CLI (`npx @better-auth/cli generate`) tries to import your auth config at build time, but D1 bindings don't exist outside requests. That's why we define the schema manually instead of using the CLI to generate it.
- **`.env` vs `.dev.vars`**: Cloudflare Workers does NOT read `.env` files. Environment variables for local dev go in `.dev.vars`. For production, use `wrangler secret put BETTER_AUTH_SECRET`.
- **Importing `.server.ts` from client code**: This will break the build. The `.server.ts` suffix tells Vite to exclude the file from the client bundle. If you accidentally import `auth.server.ts` from a React component, you'll get a build error about D1/R2 types not existing in the browser.
- **`auth.handler(request)` must receive the raw `Request`**: In loaders/actions, the first argument to the route function contains `request` as a standard `Request` object. Pass it directly — don't reconstruct it.
- **Cookie domain in dev**: Better Auth sets cookies on the request's origin. In dev that's `localhost:5173`. This works out of the box with no configuration.

### Creating Cloudflare resources (one-time setup)

The developer running this needs to do these steps once before `npm run dev` will work:

```bash
# 1. Install wrangler globally or use npx
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create D1 database
wrangler d1 create khld-md-db
# → Copy the database_id into wrangler.jsonc

# 4. Create R2 bucket
wrangler r2 bucket create khld-md-docs

# 5. Run initial migration
npm run db:migrate:local

# 6. Generate a secret and put it in .dev.vars
openssl rand -base64 32
# → Paste into .dev.vars as BETTER_AUTH_SECRET=...
```

After this, `npm run dev` starts the full stack locally.

---

## Summary of files to create or modify

**New files:**

- `react-router.config.ts`
- `workers/app.ts`
- `wrangler.jsonc`
- `.dev.vars`
- `env.d.ts`
- `drizzle.config.ts`
- `drizzle/0000_init.sql`
- `app/root.tsx`
- `app/routes.ts`
- `app/db/schema.ts`
- `app/utils/db.server.ts`
- `app/utils/auth.server.ts`
- `app/utils/auth.client.ts`
- `app/routes/api.auth.$.ts`
- `app/routes/api.sync.$docId.ts`
- `app/routes/login.tsx`
- `app/routes/signup.tsx`
- `app/routes/logout.tsx`

**Files to modify:**

- `vite.config.ts` — replace plugin config
- `package.json` — add deps and scripts
- `.gitignore` — add `.dev.vars` and `.wrangler/`
- `app/routes/md.tsx` — add loader with `requireSession`

**Files to delete:**

- `index.html` (replaced by `app/root.tsx`)
- `src/main.tsx` (replaced by `workers/app.ts` + `app/root.tsx`)
- `src/App.tsx` (replaced by `app/routes.ts`)

**Move `src/*` → `app/*`** if the existing code lives in `src/`. Framework mode expects `app/` as the root.
