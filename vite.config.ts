import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

const isTest = process.env.NODE_ENV === "test";

export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    ...(isTest ? [] : [reactRouter()]),
    ...(mode !== "test" ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  ...(mode === "test"
    ? {
        test: {
          environment: "jsdom",
          globals: true,
          setupFiles: ["./tests/setup/vitest-setup.ts"],
          include: ["app/**/*.spec.ts", "app/**/*.spec.tsx"],
          exclude: ["tests/e2e/**"],
        },
      }
    : {}),
}));