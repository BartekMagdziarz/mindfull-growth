import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { WeekRef } from '../src/domain/period'

/**
 * Problem paths against the seeded instance (port 5199). Seed v5, §15b:
 * "Lęk: podejść zamiast unikać" at step 7/15 (behavioral experiment due
 * today), worry postponement pending since yesterday, paced breathing done
 * today, baseline GAD-7 13/21, two closed weeks with an accepted real-world
 * task and a reflection "Ścieżka" answer; the current week has no decision.
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
    await page.locator('.next-day-exercises__row--child', { hasText: 'Pora na zmartwienia' }).click()
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
    await expect(page.locator('.practice-rail__row', { hasText: 'Pora na zmartwienia' })).toContainText('następny raz')
    expectNoAppErrors(consoleErrors)
  })

  test('path detail: outcome baseline, practices, phases and the week history', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootFreshSeed(page)

    await page.goto('/exercises/programs/anxiety-approach')
    await expect(page.getByText('krok 7 z 15')).toBeVisible()
    await expect(page.locator('.outcome__cell', { hasText: 'Na początku' })).toContainText('13 z 21')
    await expect(page.locator('.practice-rail__row')).toHaveCount(2)
    await expect(page.locator('.program-phase-head')).toHaveCount(7)
    await expect(page.locator('.week-panel__history li')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Dodaj do tego tygodnia' })).toBeVisible()
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
    await expect(page.locator('.week-panel__history li').first()).toContainText('odłożone')
    expectNoAppErrors(consoleErrors)
  })

  test('the previous week reflection has a "Ścieżka" step with the saved answers', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootFreshSeed(page)

    await page.goto(`/calendar/week/${prevWeek}?action=reflect`)
    await page.getByRole('button', { name: /\. Ścieżka$/ }).click()
    const block = page.locator('.qr-path-block')
    await expect(block).toContainText('Lęk: podejść zamiast unikać')
    await expect(block.locator('textarea').first()).toHaveValue(/Przewidywałem katastrofę/)
    await expect(block).toContainText('2 z 2')
    expectNoAppErrors(consoleErrors)
  })
})
