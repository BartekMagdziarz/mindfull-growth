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
    const ritual = page.locator('.next-ritual')
    await expect(ritual).toBeVisible()
    await expect(ritual.getByText('Refleksja miesiąca', { exact: true })).toBeVisible()
    await expect(ritual.getByText('Regularny ruch i kondycja').first()).toBeVisible()
    await expect(ritual.getByText('Dowieźć projekt Strumień').first()).toBeVisible()
  })

  test('weekly ritual on a closed week opens with the seeded plan content', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/week/${prevWeek}?action=reflect`)
    const ritual = page.locator('.next-ritual')
    await expect(ritual).toBeVisible()
    await expect(ritual.getByText('Refleksja tygodnia', { exact: true })).toBeVisible()
    // The first chapter is a factual summary. Object evidence is the next one.
    await ritual.getByRole('button', { name: /^Dalej$/ }).click()
    await expect(ritual.getByText('Poranne rozciąganie').first()).toBeVisible()
  })

  test('day scale: inline stage, move with undo, add from the plus menu, compass pin', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/day/${refs.day}`)
    const rail = page.locator('.next-day-rail')
    await expect(rail.locator('.ndi').first()).toBeVisible()

    // One staged row with the chart expansion; clicking another row moves the stage.
    await expect(rail.locator('.ndi--staged')).toHaveCount(1)
    await expect(rail.locator('.ndi--staged .ndi__expansion')).toBeVisible()
    const otherRow = rail.locator('.ndi:not(.ndi--staged)').first()
    const otherTitle = (await otherRow.locator('.ndi__label strong').textContent()) ?? ''
    await otherRow.locator('button.ndi__label').click()
    await expect(rail.locator('.ndi--staged .ndi__label strong')).toHaveText(otherTitle)

    // Move from the stage and take it back with the snackbar action.
    const rowsBefore = await rail.locator('.ndi').count()
    const stageActions = rail.locator('.ndi--staged .next-day-rail__stage-actions')
    const tomorrow = stageActions.getByRole('button', { name: /Jutro/ })
    if (await tomorrow.count()) {
      await tomorrow.click()
      await expect(page.locator('[role="status"]')).toContainText('Przeniesiono')
      await expect(rail.locator('.ndi', { hasText: otherTitle })).toHaveCount(0)
      await page.locator('.snackbar__action').click()
      await expect(rail.locator('.ndi', { hasText: otherTitle })).toHaveCount(1)
      await expect(rail.locator('.ndi')).toHaveCount(rowsBefore)
    }

    // One plus for every object type: cascade type → object, add, undo.
    await rail.locator('.next-day-rail__heading').hover()
    await rail.locator('.next-day-add__button').click()
    await expect(page.locator('.next-day-add__menu')).toBeVisible()
    await page.locator('.next-day-add__types button').first().hover()
    const candidate = page.locator('.next-day-add__items button').first()
    const candidateTitle = (await candidate.locator('span:not(.material-symbols-outlined)').textContent()) ?? ''
    await candidate.click()
    await expect(rail.locator('.ndi', { hasText: candidateTitle })).toHaveCount(1)
    await expect(page.locator('[role="status"]')).toContainText('Dodano')
    await page.locator('.snackbar__action').click()
    await expect(rail.locator('.ndi', { hasText: candidateTitle })).toHaveCount(0)

    // Compass: pin a direction, related rows light up and the rest step back; click again clears.
    const tile = page.locator('.next-day-compass__tile').first()
    await tile.click()
    await page.mouse.move(0, 0)
    await expect(tile).toHaveAttribute('aria-pressed', 'true')
    expect(await rail.locator('.ndi--dim').count()).toBeGreaterThan(0)
    await tile.click()
    await expect(rail.locator('.ndi--dim')).toHaveCount(0)

    // Upcoming: the seeded goal deadlines are listed, the next week's planning ritual is due,
    // and the rituals already done this week (plan + last week's reflection) fold into „Minione”.
    const upcoming = page.locator('.next-day-upcoming')
    await expect(upcoming.locator('.next-day-upcoming__row', { hasText: 'Wydać MVP aplikacji' })).toBeVisible()
    await expect(upcoming.locator('.next-day-upcoming__row.is-ritual:not(.is-done)', { hasText: 'Zaplanuj tydzień' })).toBeVisible()
    const past = upcoming.locator('details.next-day-upcoming__past')
    await expect(past.locator('summary')).toContainText('Minione')
    await past.locator('summary').click()
    await expect(past.locator('.next-day-upcoming__row.is-done', { hasText: 'Podsumuj tydzień' })).toBeVisible()
    await upcoming.screenshot({ path: 'test-results/upcoming-states.png' })
  })
})
