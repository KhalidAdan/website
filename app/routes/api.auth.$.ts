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
