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

/**
 * Port of the verification instance. 5199 is the canonical one (npm run
 * dev:verify); `VERIFY_PORT=5209 npx playwright test --project=verification`
 * runs the same suite on a spare port when 5199 is held by another checkout.
 * The specs that touch the database guard on this port, never on a literal.
 */
export const VERIFY_PORT = process.env.VERIFY_PORT ?? '5199'
const VERIFY_BASE_URL = `http://127.0.0.1:${VERIFY_PORT}`

/**
 * The GitHub runner is ~8× slower than the machine the suite is maintained
 * on (B-8): give the dev server's cold transforms room with a longer
 * expect/action timeout, and warm it up once before the first test.
 */
const CI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: CI,
  /* Retry on CI only — one retry, so a flaky test shows up in the report as such. */
  retries: CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  /* Warm the verification dev server (first transform + seed) before the first test runs. */
  globalSetup: CI ? './e2e/global-setup.ts' : undefined,
  expect: { timeout: CI ? 15_000 : 5_000 },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    actionTimeout: CI ? 15_000 : 0,
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
        baseURL: VERIFY_BASE_URL,
      },
    },
  ],

  /* Run the local dev servers before starting the tests */
  webServer: [
    {
      command: 'npm run dev -- --port 5183 --host 127.0.0.1 --strictPort',
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: !CI,
    },
    {
      command:
        VERIFY_PORT === '5199'
          ? 'npm run dev:verify'
          : `npx vite --mode verification --port ${VERIFY_PORT} --host 127.0.0.1 --strictPort`,
      url: VERIFY_BASE_URL,
      reuseExistingServer: !CI,
    },
  ],
})
