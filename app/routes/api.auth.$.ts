import type { Route } from "./+types/api.auth.$";
import { createAuth, getEnv } from "~/utils/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = createAuth(getEnv(context));
  return auth.handler(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = createAuth(getEnv(context));
  try {
    return await auth.handler(request);
  } catch (error) {
    if (error instanceof Error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 400 }
    );
  }
}
