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
    { timeout: 90_000 }
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

  test('monthly reflection opens seeded priorities and persists a verdict', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/month/${prevMonth}?action=reflect`)
    const ritual = page.locator('.quiet-ritual')
    await expect(
      ritual.getByRole('heading', { name: 'Jaką uwagę poświęciłeś swoim kierunkom?' })
    ).toBeVisible()
    const priority = ritual.locator('.qm-priority', { hasText: 'Dowieźć projekt Strumień' })
    await priority.getByRole('button', { name: /Dowieźć projekt Strumień/ }).click()
    const verdicts = priority.getByRole('group', { name: 'Decyzja: Dowieźć projekt Strumień' })
    await verdicts.getByRole('button', { name: 'Kontynuuj', exact: true }).click()
    await expect(verdicts.getByRole('button', { name: 'Kontynuuj', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await ritual.getByRole('button', { name: 'Następny krok' }).click()
    await expect(ritual.getByRole('heading', { name: 'Balans', exact: true })).toBeVisible()
    await ritual.getByRole('button', { name: '4. Dziennik', exact: true }).click()
    await ritual.getByRole('button', { name: 'Zapisz refleksję', exact: true }).click()
    await expect(ritual.locator('.qr-save')).toHaveText('Zapisano')
    await page.reload()
    await priority.getByRole('button', { name: /Dowieźć projekt Strumień/ }).click()
    await expect(verdicts.getByRole('button', { name: 'Kontynuuj', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  test('weekly ritual on a closed week opens with the seeded plan content', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/week/${prevWeek}?action=reflect`)
    const ritual = page.locator('.quiet-ritual')
    await expect(ritual.getByRole('heading', { name: 'Co wydarzyło się naprawdę?' })).toBeVisible()
    await expect(
      ritual.locator('.qr-evidence-row', { hasText: 'Poranne rozciąganie' })
    ).toBeVisible()
    await expect(ritual.locator('.qr-day-head')).toHaveCount(7)
    await ritual.getByRole('button', { name: 'Następny krok' }).click()
    await expect(ritual.getByRole('group', { name: 'Działania', exact: true })).toBeVisible()
    await ritual.getByRole('button', { name: 'Poprzedni krok' }).click()
    await expect(ritual.getByRole('heading', { name: 'Co wydarzyło się naprawdę?' })).toBeVisible()
  })

  test('today: explicit selection, calendar evidence, move/add with undo and compass pin', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/day/${refs.day}`)
    const rail = page.locator('.next-day-rail')
    await expect(rail.locator('.ndi').first()).toBeVisible()

    await expect(page).toHaveURL(new RegExp(`/today/${refs.day}$`))
    // Nothing is selected on entry. Selection reveals evidence in the calendar.
    await expect(rail.locator('.ndi--staged')).toHaveCount(0)
    const selectedRow = rail.locator('.ndi', { hasText: 'Poranna checklista' }).first()
    await selectedRow.locator('button.ndi__label').click()
    await expect(selectedRow).toHaveClass(/ndi--staged/)
    await expect(page.locator('.day-plan-calendar__selection')).toHaveText('Poranna checklista')
    await expect(page.locator('.day-plan-calendar__chart')).toBeVisible()
    await selectedRow.locator('button.ndi__label').click()
    await expect(rail.locator('.ndi--staged')).toHaveCount(0)
    await expect(page.locator('.day-plan-calendar__chart')).toHaveCount(0)

    // Use a row with an available move action; the move must run, never silently skip.
    const movableRow = rail
      .locator('.ndi')
      .filter({ has: page.getByRole('button', { name: /^Przenieś na jutro:/ }) })
      .first()
    const movedTitle = (await movableRow.locator('.ndi__label strong').textContent())!
    await movableRow.locator('button.ndi__label').click()
    await rail.locator('.ndi--staged').getByRole('button', { name: 'Jutro', exact: true }).click()
    await expect(rail.getByRole('status')).toContainText('Przeniesiono')
    await expect(rail.locator('.ndi', { hasText: movedTitle })).toHaveCount(0)
    await rail.locator('.snackbar__action').click()
    await expect(rail.locator('.ndi', { hasText: movedTitle })).toHaveCount(1)

    // One plus for every object type: cascade type → object, add, undo.
    await rail.locator('.next-day-rail__heading').hover()
    await rail.locator('.next-day-add__button').click()
    await expect(page.locator('.next-day-add__menu')).toBeVisible()
    await page.locator('.next-day-add__types button').first().hover()
    const candidate = page.locator('.next-day-add__items button').first()
    const candidateTitle = (await candidate.getAttribute('title')) ?? ''
    await candidate.click()
    await expect(rail.locator('.ndi', { hasText: candidateTitle })).toHaveCount(1)
    await expect(rail.getByRole('status')).toContainText('Dodano')
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
    // and the rituals already done this week (plan + last week's reflection) fold into „Zrobione wcześniej”.
    const upcoming = page.locator('.next-day-upcoming')
    await expect(upcoming.locator('.next-day-upcoming__row').first()).toBeVisible()
    // The seeded date controls whether the list exceeds its four-row limit.
    const more = upcoming.getByRole('button', { name: /Pokaż więcej/ })
    if (await more.isVisible()) await more.click()
    await expect(
      upcoming.locator('.next-day-upcoming__row', { hasText: 'Wydać MVP aplikacji' })
    ).toBeVisible()
    await expect(
      upcoming.locator('.next-day-upcoming__row.is-ritual:not(.is-done)', {
        hasText: 'Zaplanuj następny tydzień',
      })
    ).toBeVisible()
    const past = upcoming.locator('details.next-day-upcoming__past')
    await expect(past.locator('summary')).toContainText('Zrobione wcześniej')
    await past.locator('summary').click()
    await expect(
      past.locator('.next-day-upcoming__row.is-done', { hasText: 'Podsumuj poprzedni tydzień' })
    ).toBeVisible()
    await upcoming.screenshot({ path: 'test-results/upcoming-states.png' })
  })
})
