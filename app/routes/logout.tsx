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
