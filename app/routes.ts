import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("api/documents", "routes/api.documents.ts"),
  route("md/:docId?", "routes/md.tsx"),
] satisfies RouteConfig;
