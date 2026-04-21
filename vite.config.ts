import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
};

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function resolveBasePath(): string {
  const explicitBase = process.env.VITE_BASE_PATH;

  if (explicitBase) {
    return explicitBase.startsWith("/") ? ensureTrailingSlash(explicitBase) : `/${ensureTrailingSlash(explicitBase)}`;
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

  if (process.env.GITHUB_ACTIONS === "true" && repositoryName) {
    return `/${repositoryName}/`;
  }

  return "/";
}

export default defineConfig({
  base: resolveBasePath(),
  plugins: [react()],
  test: {
    exclude: ["e2e/**/*", "node_modules/**/*", "dist/**/*"],
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
