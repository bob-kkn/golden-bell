import { defineConfig } from "@playwright/test";

const chromePath = process.env.PLAYWRIGHT_CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: chromePath,
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
