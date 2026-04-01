import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import stylesheet from "~/app.css?url";
import lazyTreeViewStyles from "lazy-tree-view/styles.css?url";
import {
  ThemeProvider,
  getThemeScript,
  getSystemPrefListenerScript,
  CRITICAL_THEME_CSS,
} from "~/hooks/useTheme";
import { getEnv, getSession } from "~/utils/auth.server";
import type { Route } from "./+types/root";

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
  { rel: "stylesheet", href: lazyTreeViewStyles },
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const session = await getSession(request, env);

  // Read theme cookie so the server can render the correct class on <html>
  const cookieHeader = request.headers.get("Cookie") || "";
  const themeMatch = cookieHeader.match(/theme=(dark|light)/);
  const theme = themeMatch ? themeMatch[1] : null;

  return {
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }
      : null,
    theme,
  };
}

export default function Root() {
  const { user, theme } = useLoaderData<typeof loader>();
  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Critical CSS: sets background before external stylesheets load */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_THEME_CSS }} />
        {/* Blocking script: detects theme from cookie/localStorage/system */}
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
        <Meta />
        <Links />
        <title>khld.dev</title>
      </head>
      <body>
        <ThemeProvider>
          <Outlet context={{ user }} />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
        {/* React for system color-scheme changes */}
        <script
          dangerouslySetInnerHTML={{ __html: getSystemPrefListenerScript() }}
        />
      </body>
    </html>
  );
}
