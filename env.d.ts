/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  DOCS: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}
