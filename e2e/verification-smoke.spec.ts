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
  test('auto-logs the verification account and opens the rhythm calendar year → month → week', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    for (const path of [
      `/calendar/year/${refs.year}`,
      `/calendar/month/${prevMonth}`,
      `/calendar/week/${prevWeek}`,
    ]) {
      await page.goto(path)
      const board = page.locator('.rb-board')
      await expect(board).toBeVisible()
      await expect(board.locator('.rb-row').first()).toBeVisible()
    }

    // The former stream address lands on the same period of the rhythm calendar.
    await page.goto(`/calendar/stream/${prevMonth}`)
    await expect(page).toHaveURL(new RegExp(`/calendar/month/${prevMonth}$`))
    await expect(page.locator('.rb-board')).toBeVisible()
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
    // Area step (decision 2026-11-22): a result tile with this week's load & state mark over two
    // counter fields, load and state; earlier weeks fold out of the tile.
    const load = ritual.getByRole('spinbutton', { name: / · Obciążenie$/ })
    const state = ritual.getByRole('spinbutton', { name: / · Stan$/ })
    await expect(load).toBeVisible()
    await expect(state).toBeVisible()
    await expect(ritual.getByRole('spinbutton', { name: / · Działania$/ })).toHaveCount(0)
    const tile = ritual.locator('.qr-tile')
    await tile.getByRole('button', { name: 'Minione tygodnie' }).click()
    await expect(tile.locator('.qr-tile__past .ls-track').first()).toBeVisible()
    // Rating both axes draws the pair on the live mark. Seeded weeks already carry ratings, so the
    // keyboard sets an exact value: End = 5, one step left = 4.
    for (const counter of [load, state]) {
      await counter.focus()
      await counter.press('End')
      await counter.press('ArrowLeft')
      await expect(counter).toHaveAttribute('aria-valuenow', '4')
    }
    const mark = tile.locator('.qr-tile__now .ls-track')
    await expect(mark).toHaveAttribute('aria-label', /obciążenie 4, stan 4/)
    await expect(mark.locator('.ls-track__bar')).toBeVisible()
    await ritual.getByRole('button', { name: 'Poprzedni krok' }).click()
    await expect(ritual.getByRole('heading', { name: 'Co wydarzyło się naprawdę?' })).toBeVisible()
  })

  test('rhythm calendar: the month card shows the load & state matrix, the year ratings view four area rows', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    // Month: the weeks' load & state are a field of the summary card — weeks as rows, the four
    // areas as columns. The table has no ratings lens here, so an old link falls back to the focus.
    await page.goto(`/calendar/month/${prevMonth}?view=ratings`)
    const field = page.locator('.ps__ls')
    await expect(field).toBeVisible()
    await expect(field.locator('.ls-matrix__area')).toHaveCount(4)
    const weekRows = await field.locator('.ls-matrix__week').count()
    expect(weekRows).toBeGreaterThanOrEqual(4)
    await expect(field.locator('.ls-matrix__cell')).toHaveCount(weekRows * 4)
    await expect(field.locator('.ls-track__bar').first()).toBeVisible()
    await expect(page.locator('.rb-series--ls')).toHaveCount(0)

    // Year: the ratings lens has one row per area; every month cell stacks its weeks' bars.
    await page.goto(`/calendar/year/${prevMonth.slice(0, 4)}?view=ratings`)
    const board = page.locator('.rb-board')
    await expect(board).toBeVisible()
    const areaRows = board.locator('.rb-series--ls')
    await expect(areaRows).toHaveCount(4)
    await expect(areaRows.first().locator('.rb-cell--series')).toHaveCount(12)
    await expect(areaRows.first().locator('.ls-track__bar').first()).toBeVisible()
  })

  test('today: explicit selection, history strip, move/add with undo and compass pin', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/day/${refs.day}`)
    const rail = page.locator('.next-day-rail')
    await expect(rail.locator('.ndi').first()).toBeVisible()

    await expect(page).toHaveURL(new RegExp(`/today/${refs.day}$`))
    // Nothing is selected on entry. Selection stages the row and unfolds its last-seven-days strip
    // (the day calendar itself opens only for week planning).
    await expect(rail.locator('.ndi--staged')).toHaveCount(0)
    const selectedRow = rail.locator('.ndi', { hasText: 'Poranna checklista' }).first()
    await selectedRow.locator('button.ndi__label').click()
    await expect(selectedRow).toHaveClass(/ndi--staged/)
    await expect(selectedRow).toHaveClass(/ndi--history/)
    await expect(selectedRow.locator('.ndi__strip')).toBeVisible()
    await selectedRow.locator('button.ndi__label').click()
    await expect(rail.locator('.ndi--staged')).toHaveCount(0)
    await expect(selectedRow.locator('.ndi__strip')).toHaveCount(0)

    // Use a row with an available move action; the move must run, never silently skip.
    const movableRow = rail
      .locator('.ndi')
      .filter({ has: page.getByRole('button', { name: /^Przenieś na jutro:/ }) })
      .first()
    const movedTitle = (await movableRow.locator('.ndi__label strong').textContent())!
    await movableRow.locator('button.ndi__label').click()
    await rail.locator('.ndi--staged').getByRole('button', { name: 'jutro', exact: true }).click()
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
    await expect(upcoming.locator('.next-day-upcoming__tile').first()).toBeVisible()
    // The seeded date controls whether the list exceeds its four-row limit.
    const more = upcoming.getByRole('button', { name: /^Jeszcze/ })
    if (await more.isVisible()) await more.click()
    await expect(
      upcoming.locator('.next-day-upcoming__tile', { hasText: 'Wydać MVP aplikacji' })
    ).toBeVisible()
    await expect(
      upcoming.locator('.next-day-upcoming__tile.is-ritual:not(.is-done)', {
        hasText: 'Zaplanuj następny tydzień',
      })
    ).toBeVisible()
    const pastToggle = upcoming.getByRole('button', { name: /^Minione/ })
    await expect(pastToggle).toBeVisible()
    await pastToggle.click()
    const past = upcoming.locator('.next-day-upcoming__past')
    await expect(
      past.locator('.next-day-upcoming__tile.is-done', { hasText: 'Podsumuj poprzedni tydzień' })
    ).toBeVisible()
    await upcoming.screenshot({ path: 'test-results/upcoming-states.png' })
  })
})
