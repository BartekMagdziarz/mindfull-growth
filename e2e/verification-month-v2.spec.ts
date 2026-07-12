import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { MonthRef } from '../src/domain/period'

/**
 * Month V2 experiment (?layout=v2 on the classic month route) against the
 * seeded verification instance (npm run dev:verify, port 5199).
 *
 * Assertions target the PREVIOUS month: it is fully closed, carries a seeded
 * (partial) monthly reflection, weekly reflections, entries in every entry
 * mode, target overrides and boundary-week data — while the current month's
 * gates flip with the real date.
 */

const refs = getPeriodRefsForDate(new Date())
const prevMonth = getPreviousPeriod(refs.month) as MonthRef

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'
const SECTIONS_KEY = 'calendar.month-v2.sections'

async function bootSeededApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    { timeout: 90_000 },
  )
  await expect(page).not.toHaveURL(/login/)
}

async function openMonthV2(page: Page, monthRef: MonthRef, extra = ''): Promise<void> {
  await page.goto(`/calendar/month/${monthRef}?layout=v2${extra}`)
  await expect(page.getByTestId('month-v2-summary-rail')).toBeVisible()
  await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
}

test.describe('month V2 experiment', () => {
  test('renders the V2 overview with rail, week matrix and collapsed sections', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    // Left rail: compass (partial reflection → dots, no polygon) + activity.
    const rail = page.getByTestId('month-v2-summary-rail')
    await expect(rail.locator('.month-compass__svg')).toBeVisible()
    await expect(rail.locator('.month-mini__grid')).toBeVisible()

    // Week heads: 4–6 columns; seeded weekly reflections render the 4×3 matrix.
    const heads = page.locator('.month-grid__week')
    const headCount = await heads.count()
    expect(headCount).toBeGreaterThanOrEqual(4)
    expect(headCount).toBeLessThanOrEqual(6)
    await expect(page.locator('.month-grid__matrix').first()).toBeVisible()

    // All four sections start collapsed.
    const toggles = page.locator('.month-section__toggle')
    await expect(toggles).toHaveCount(4)
    for (const toggle of await toggles.all()) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    }

    // The V1 renderer must not be mounted behind the flag.
    await expect(page.getByTestId('monthly-planner')).toHaveCount(0)
  })

  test('legacy stays the default without the layout flag', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/month/${prevMonth}`)
    await expect(page.getByTestId('monthly-planner')).toBeVisible()
    await expect(page.getByTestId('month-v2-summary-rail')).toHaveCount(0)
  })

  test('expanding a section persists across reloads and shows seeded series', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    // Expand Habits: multi-completion strip and long titles come from the seed.
    const habitsToggle = page.locator('[data-section="habits"] .month-section__toggle')
    await habitsToggle.click()
    await expect(habitsToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('Poranna checklista')).toBeVisible()
    await expect(
      page.locator('[data-series-kind="multi-completion"] .month-series__day').first(),
    ).toBeVisible()

    const stored = await page.evaluate(
      (key: string) => window.localStorage.getItem(key),
      SECTIONS_KEY,
    )
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ habits: true })

    // Reload: the manual state survives; other sections stay collapsed.
    await page.reload()
    await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
    await expect(
      page.locator('[data-section="habits"] .month-section__toggle'),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.locator('[data-section="intentions"] .month-section__toggle'),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  test('chart variants switch via URL params on the same data', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    // Section expansion persists in localStorage across navigations — expand
    // the goals section only when it is still collapsed.
    const expandGoals = async () => {
      const toggle = page.locator('[data-section="goals"] .month-section__toggle')
      if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    }

    await openMonthV2(page, prevMonth, '&chart=capsules')
    await expandGoals()
    // Capsules: no axis SVGs anywhere in the sections.
    await expect(page.locator('.month-section .month-series__svg')).toHaveCount(0)

    await openMonthV2(page, prevMonth, '&chart=axis')
    await expandGoals()
    // Axis: the value KRs render shared-scale SVGs.
    expect(await page.locator('.month-section .month-series__svg').count()).toBeGreaterThan(0)
  })

  test('planning mode hosts the current assignment matrix and persists a toggle', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    // Planning edits only the CURRENT month (open objects, editable plan).
    await openMonthV2(page, refs.month)

    await page.getByRole('button', { name: /^Planowanie$/ }).click()
    await expect(page.getByTestId('monthly-planner')).toBeVisible()
    await expect(page.getByTestId('assignment-matrix')).toBeVisible()

    // Toggle the orphan KR onto the month's first week and verify persistence.
    const cell = page.locator('[data-testid^="matrix-cell-keyResult:"]').first()
    const testId = await cell.getAttribute('data-testid')
    const pressed = await cell.getAttribute('aria-pressed')
    await cell.click()
    const flipped = pressed === 'true' ? 'false' : 'true'
    await expect(page.getByTestId(testId!)).toHaveAttribute('aria-pressed', flipped, {
      timeout: 15_000,
    })

    await page.reload()
    await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
    await page.getByRole('button', { name: /^Planowanie$/ }).click()
    await expect(page.getByTestId(testId!)).toHaveAttribute('aria-pressed', flipped, {
      timeout: 15_000,
    })

    // Restore the original placement so re-runs stay deterministic.
    await page.getByTestId(testId!).click()
    await expect(page.getByTestId(testId!)).toHaveAttribute('aria-pressed', pressed!, {
      timeout: 15_000,
    })
  })

  test('reflection opens the shared monthly wizard and returns to V2', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    await page.getByRole('button', { name: /refleksj/i }).click()
    await expect(page.getByTestId('monthly-reflection-wizard')).toBeVisible()

    await page.getByRole('button', { name: /^(Zamknij|Close)$/ }).click()
    await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
    // The layout flag survives the wizard round-trip.
    expect(page.url()).toContain('layout=v2')
  })
})
