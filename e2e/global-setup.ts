import { chromium, type FullConfig } from '@playwright/test'

/**
 * CI only (playwright.config.ts): one visit to the verification instance before
 * the first test, so the dev server's cold module transforms and the first seed
 * do not eat into the first spec's own timeouts (B-8).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const project = config.projects.find(entry => entry.name === 'verification')
  const baseURL = project?.use.baseURL
  if (!baseURL) return
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(baseURL, { timeout: 180_000 })
    await page.waitForFunction(
      () => window.localStorage.getItem('mindfull_growth_verification_seed_version') !== null,
      undefined,
      { timeout: 180_000 }
    )
  } finally {
    await browser.close()
  }
}
