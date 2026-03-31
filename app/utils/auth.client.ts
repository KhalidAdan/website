import { createAuthClient } from "better-auth/react";

const baseURL =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

export const authClient = createAuthClient({
  baseURL,
});

export const { useSession, signIn, signUp, signOut } = authClient;
