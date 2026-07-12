import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { MonthRef, WeekRef } from '../src/domain/period'

const refs = getPeriodRefsForDate(new Date())
const prevWeek = getPreviousPeriod(refs.week) as WeekRef
const prevMonth = getPreviousPeriod(refs.month) as MonthRef
const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function boot(page: Page) {
  await page.goto('/')
  await page.waitForFunction((key) => window.localStorage.getItem(key) !== null, SEED_MARKER_KEY, { timeout: 90_000 })
  await expect(page).not.toHaveURL(/login/)
}

async function openWeekV2(page: Page, weekRef: WeekRef, extra = '') {
  await page.goto(`/calendar/week/${weekRef}?layout=v2${extra}`)
  await expect(page.getByTestId('week-v2-summary-rail')).toBeVisible()
  await expect(page.getByTestId('week-v2-day-grid')).toBeVisible()
}

test.describe('week V2 experiment', () => {
  test('renders rail, seven day heads and four collapsed sections', async ({ page }) => {
    test.setTimeout(120_000)
    await boot(page)
    await openWeekV2(page, prevWeek)
    await expect(page.locator('.week-grid__day')).toHaveCount(7)
    await expect(page.locator('.week-section__toggle')).toHaveCount(4)
    await expect(page.getByTestId('week-v2-matrix')).toBeVisible()
    for (const toggle of await page.locator('.week-section__toggle').all()) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    }
  })

  test('legacy remains the default without layout=v2', async ({ page }) => {
    test.setTimeout(120_000)
    await boot(page)
    await page.goto(`/calendar/week/${prevWeek}`)
    await expect(page.getByTestId('week-v2-summary-rail')).toHaveCount(0)
    await expect(page.getByText(/Podsumowanie|Summary/).first()).toBeVisible()
  })

  test('month drill-down carries chart and density flags into Week V2', async ({ page }) => {
    test.setTimeout(120_000)
    await boot(page)
    await page.goto(`/calendar/month/${prevMonth}?layout=v2&chart=axis&density=compact`)
    await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
    await page.locator('.month-grid__week').first().click()
    await expect(page.getByTestId('week-v2-day-grid')).toBeVisible()
    expect(page.url()).toContain('layout=v2')
    expect(page.url()).toContain('chart=axis')
    expect(page.url()).toContain('density=compact')
  })

  test('planning mode hosts the existing seven-day assignment matrix', async ({ page }) => {
    test.setTimeout(120_000)
    await boot(page)
    await openWeekV2(page, refs.week)
    await page.getByRole('button', { name: /^(Planowanie|Planning)$/ }).click()
    await expect(page.getByTestId('week-day-assignment-step')).toBeVisible()
    await expect(page.getByTestId('assignment-matrix')).toBeVisible()
  })
})
