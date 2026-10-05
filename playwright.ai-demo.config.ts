import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  testMatch: 'ai-demo.spec.ts',
  workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5203' },
  webServer: {
    command: 'npm run dev:ai-demo',
    url: 'http://127.0.0.1:5203',
    reuseExistingServer: !process.env.CI,
  },
})
