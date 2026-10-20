import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Two projects on two dedicated origins (IndexedDB is per-origin):
 *  - `chromium` (port 5183): the destructive flow specs — their resetDatabase()
 *    wipes ALL IndexedDB on its origin, so they must NEVER run against the real
 *    dev server on 5173.
 *  - `verification` (port 5199): read-mostly smoke specs against the seeded,
 *    auto-logged-in verification instance (npm run dev:verify).
 */
/**
 * The user's real window (MacBook Pro 14", default scaling, Retina): every
 * screenshot and layout judgement must happen at THIS size, not at
 * Playwright's 1280×720 default — the Today right column is ~33 rem here and
 * looks different at other widths. See docs/agent-verification.md.
 */
export const CANONICAL_VIEWPORT = { viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 }

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: [/verification-.*\.spec\.ts/, /ai-demo\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        ...CANONICAL_VIEWPORT,
        baseURL: 'http://127.0.0.1:5183',
      },
    },
    {
      name: 'verification',
      testMatch: /verification-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        ...CANONICAL_VIEWPORT,
        baseURL: 'http://127.0.0.1:5199',
      },
    },
  ],

  /* Run the local dev servers before starting the tests */
  webServer: [
    {
      command: 'npm run dev -- --port 5183 --host 127.0.0.1 --strictPort',
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:verify',
      url: 'http://127.0.0.1:5199',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
