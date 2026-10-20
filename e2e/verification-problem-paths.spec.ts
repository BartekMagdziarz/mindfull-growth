import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { WeekRef } from '../src/domain/period'

/**
 * Problem paths against the seeded instance (port 5199). Seed §15b:
 * "Lęk: podejść zamiast unikać" v2 at step 8/22 (behavioral experiment due
 * today), worry postponement pending since yesterday, seven anxiety Moments,
 * baseline GAD-7 13/21, two closed weeks with an accepted real-world task
 * and a reflection "Ścieżka" answer; the current week has no decision.
 *
 * The spec re-seeds first: other specs mutate the shared instance.
 */

const refs = getPeriodRefsForDate(new Date())
const prevWeek = getPreviousPeriod(refs.week) as WeekRef
const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function bootFreshSeed(page: Page): Promise<string[]> {
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(String(error)))
  await page.goto('/')
  await page.waitForFunction((key: string) => window.localStorage.getItem(key) !== null, SEED_MARKER_KEY, {
    timeout: 90_000,
  })
  // The hook reloads the page when it is done — wait for that reload so the
  // next page.goto is not interrupted by it.
  const reloaded = page.waitForEvent('load', { timeout: 90_000 })
  await page.evaluate(() => {
    void (window as unknown as { __verifySeed: () => Promise<void> }).__verifySeed()
  })
  await reloaded
  await page.waitForLoadState('networkidle')
  return consoleErrors
}

function expectNoAppErrors(consoleErrors: string[]): void {
  const relevant = consoleErrors.filter(
    text => text.includes('[Vue warn]') || text.includes('program') || text.includes('practice'),
  )
  expect(relevant, `Console errors: ${relevant.join('\n')}`).toHaveLength(0)
}

test.describe.configure({ mode: 'serial' })

test.describe('problem paths', () => {
  test('Today shows the path with its due practice; doing it schedules the next one', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootFreshSeed(page)

    await page.goto('/today')
    await expect(page.getByText('Lęk: podejść zamiast unikać')).toBeVisible()
    await page.locator('.ndp', { hasText: 'Pora na zmartwienia' }).locator('.ndp__well').click()
    await expect(page).toHaveURL(/\/exercises\/micro\/worry-postponement/)

    // Wait for each step heading: the runner cross-fades steps, so a click
    // during the transition would land on the outgoing step.
    const step = async (heading: string, label: 'Dalej' | 'Zapisz' = 'Dalej') => {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
      await page.getByRole('button', { name: label, exact: true }).click()
    }
    await step('Pora na zmartwienia')
    await expect(page.getByRole('heading', { name: 'Co cię dziś martwiło?', level: 2 })).toBeVisible()
    await page.locator('input[type=text]').first().fill('Termin w piątek')
    await step('Co cię dziś martwiło?')
    await step('Ile z nich nadal wydaje się ważnych?')
    await step('Czy któreś wymaga działania?', 'Zapisz')
    await expect(page.getByText(/Ścieżka zaplanowała kolejny raz/)).toBeVisible()
    await expect(page.getByText('Otwórz drzewo zmartwień')).toBeVisible()

    await page.goto('/exercises/programs/anxiety-approach')
    // The practices row of the open phase names the practice with its next day.
    await expect(page.getByTestId('path-practices')).toContainText('Pora na zmartwienia')
    expectNoAppErrors(consoleErrors)
  })

  test('path view (v2): weeks as rows, the experiment current in week 3, the measure behind Szczegóły, Reakcje, the sign and this week\'s proposal', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootFreshSeed(page)

    await page.goto('/exercises/programs/anxiety-approach')
    await expect(page.locator('.mg-v2-page-head__eyebrow')).toContainText('Tydzień 3 z 8')
    await expect(page.locator('.path-view__sign')).toContainText('Zadzwonię do urzędu')
    const journey = page.getByTestId('path-journey')
    await expect(journey.locator('[data-test-path-week]')).toHaveCount(9)
    await expect(journey.locator('.wk__title').first()).toHaveText('Rozpoznanie')
    await expect(journey.locator('.wk__title').last()).toHaveText('Powrót')
    const current = journey.locator('[data-test-program-step="7"]')
    await expect(current).toContainText('Mała próba niepewności')
    await expect(current).toContainText('Po co:')
    await expect(current.getByRole('button', { name: 'Rozpocznij' })).toBeVisible()
    const measure = page.getByTestId('path-measure')
    await measure.getByRole('button', { name: 'Szczegóły' }).click()
    // Two instruments now (GAD-7 and IUS-12): the first table is the GAD-7 series.
    await expect(measure.getByRole('table').first()).toContainText('13 z 21')
    // Postęp: the anxiety reaction families, time left → right, legend on the left.
    const glance = page.getByTestId('path-moments-glance')
    await expect(glance.locator('.pc__legend-name')).toHaveText(['Zamartwianie', 'Sprawdzanie', 'Wycofanie', 'Odkładanie', 'Ja'])
    // Praktyki: the worry time and Momenty as tiles (the breath ended with the worry tree), the proposal for this week.
    const practices = page.getByTestId('path-practices')
    await expect(practices.getByTestId('path-practice-tile')).toHaveCount(1)
    await expect(practices.getByTestId('path-moment-tile')).toHaveCount(1)
    await expect(page.getByTestId('path-world').getByRole('button', { name: 'Dodaj do tego tygodnia' })).toBeVisible()
    // The experiment starts from a Moment: the picker lists the seven anxiety Moments.
    await current.getByRole('button', { name: 'Rozpocznij' }).click()
    const picker = page.getByTestId('moment-picker')
    await expect(picker).toBeVisible()
    await expect(picker.locator('li')).toHaveCount(7)
    await picker.locator('button', { hasText: 'Zadzwoniłem do urzędu' }).click()
    await expect(page).toHaveURL(/\/exercises\/behavioral-experiment\?momentId=/)
    expectNoAppErrors(consoleErrors)
  })

  test('weekly plan proposes the task; declining closes it for this week', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootFreshSeed(page)

    await page.goto(`/calendar/week/${refs.week}?action=plan`)
    const card = page.locator('.qr-path-card')
    await expect(card).toContainText('Ze ścieżki „Lęk: podejść zamiast unikać”')
    await card.getByRole('button', { name: 'Nie w tym tygodniu' }).click()
    await expect(card).toHaveCount(0)

    await page.goto('/exercises/programs/anxiety-approach')
    // A declined week shows no task tile in Praktyki (the tile is the accepted task or the proposal).
    await expect(page.getByTestId('path-practices')).toBeVisible()
    await expect(page.getByTestId('path-world')).toHaveCount(0)
    expectNoAppErrors(consoleErrors)
  })

  test('the previous week reflection has a "Ścieżka" step with the saved answers', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootFreshSeed(page)

    await page.goto(`/calendar/week/${prevWeek}?action=reflect`)
    await page.getByRole('button', { name: /\. Ścieżka$/ }).click()
    // Two paths with a weekly reflection are enrolled; this test reads the anxiety block.
    const block = page.locator('.qr-path-block', { hasText: 'Lęk: podejść zamiast unikać' })
    await expect(block).toBeVisible()
    await expect(block.locator('textarea').first()).toHaveValue(/Przewidywałem katastrofę/)
    // The seeded days (6 and 4 days ago) count only when they fall in the previous week — the same rule the seed applies.
    const counted = [6, 4].filter((daysAgo) => {
      const day = new Date()
      day.setDate(day.getDate() - daysAgo)
      return getPeriodRefsForDate(day).week === prevWeek
    }).length
    await expect(block.locator('.qr-path-task__disc')).toHaveText(`${counted}/2`)
    expectNoAppErrors(consoleErrors)
  })
})
