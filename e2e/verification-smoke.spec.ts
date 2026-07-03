import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { MonthRef, WeekRef } from '../src/domain/period'

/**
 * Smoke tests for the seeded verification instance (npm run dev:verify, port 5199).
 * See docs/agent-verification.md for the account + dataset map.
 *
 * No resetDatabase/signup here: every Playwright context starts with empty
 * storage on the verification origin, so the app's verification bootstrap
 * creates the fixed account and seeds the full dataset on first load.
 * Assertions target PAST periods only — current month/week gates flip with the
 * real date (month-end minus 6 days, Saturdays).
 */

const refs = getPeriodRefsForDate(new Date())
const prevMonth = getPreviousPeriod(refs.month) as MonthRef
const prevWeek = getPreviousPeriod(refs.week) as WeekRef

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function bootSeededApp(page: Page): Promise<void> {
  await page.goto('/')
  // First boot on a fresh context runs the full seed before the router mounts.
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    { timeout: 90_000 },
  )
  await expect(page).not.toHaveURL(/login/)
}

test.describe('verification environment', () => {
  test('auto-logs the verification account and drills the stream year → month → week', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    // Year view: month cards with priority-assessment rings from the closed months.
    await page.goto(`/calendar/stream/${refs.year}`)
    await expect(page.locator('.stream-year-grid')).toBeVisible()
    await expect(page.locator('.stream-month__prio-ring').first()).toBeVisible()

    // Month view: week cards with the weekly-reflection rating matrix.
    await page.goto(`/calendar/stream/${prevMonth}`)
    await expect(page.locator('.stream-week-row')).toBeVisible()
    await expect(page.locator('.stream-week__cell').first()).toBeVisible()

    // Week view: one card per day (journal / emotion content comes from the seed).
    await page.goto(`/calendar/stream/${prevWeek}`)
    await expect(page.locator('.stream-day-grid')).toBeVisible()
    expect(await page.locator('.stream-day__head').count()).toBeGreaterThanOrEqual(7)
  })

  test('monthly ritual on a closed month shows the seeded top-3 priorities', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/month/${prevMonth}?action=reflect`)
    const wizard = page.getByTestId('monthly-reflection-wizard')
    await expect(wizard).toBeVisible()
    await expect(wizard.getByText('Regularny ruch i kondycja').first()).toBeVisible()
    await expect(wizard.getByText('Dowieźć projekt Strumień').first()).toBeVisible()
  })

  test('weekly ritual on a closed week opens with the seeded plan content', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/week/${prevWeek}?action=reflect`)
    const wizard = page.getByTestId('weekly-reflection-wizard')
    await expect(wizard).toBeVisible()
    // Seeded habit sits in the week's top-3, so it must show up in the wizard.
    await expect(wizard.getByText('Poranne rozciąganie').first()).toBeVisible()
  })
})
