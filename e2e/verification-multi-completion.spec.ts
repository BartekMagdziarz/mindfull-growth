import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { WeekRef } from '../src/domain/period'

/**
 * Multi-completion verification against the seeded instance (port 5199).
 * Seed v7 objects: habit „Poranna checklista" (3 items: Pobudka 6:00 w1,
 * Medytacja w1, Trening w2; explicit threshold 3 of 4 pts) and tracker
 * „Wieczorne wyciszenie" (2 items, default all-items threshold). Past weeks
 * mix full (met), partial and empty days, so the previous week always shows
 * both a met and a partial underline in the stack chart.
 */

const refs = getPeriodRefsForDate(new Date())
const prevWeek = getPreviousPeriod(refs.week) as WeekRef

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function bootSeededApp(page: Page): Promise<string[]> {
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(String(error)))

  await page.goto('/')
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    { timeout: 90_000 }
  )
  await expect(page).not.toHaveURL(/login/)
  return consoleErrors
}

// The verification bootstrap logs "No user database connected" listing noise
// before auto-login completes — pre-existing and unrelated. Only errors from
// the entry-write path and Vue render warnings indicate feature breakage.
function expectNoAppErrors(consoleErrors: string[]): void {
  const relevant = consoleErrors.filter(
    text =>
      text.includes('Failed to persist') ||
      text.includes('[Vue warn]') ||
      text.includes('multi-completion') ||
      text.includes('checkedItemIds')
  )
  expect(relevant, `Console errors: ${relevant.join('\n')}`).toHaveLength(0)
}

test.describe('multi-completion', () => {
  test('today row chips toggle items, unchecking all deletes the entry', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootSeededApp(page)

    await page.goto('/today')
    const row = page.locator('.ndi', { hasText: 'Poranna checklista' }).first()
    await expect(row).toBeVisible()

    // At rest the checklist folds into one fraction disc; hovering the control
    // splits it into one chip per item (the pointer then stays over the chips).
    const fraction = row.locator('.ndi__well--fraction')
    await expect(fraction).toBeVisible()
    await expect(fraction).toHaveText(/^\s*\d\s*\/\s*3\s*$/)
    await row.locator('.ndi__multi').hover()

    const chips = row.locator('.ndi__well--dot')
    await expect(chips).toHaveCount(3)

    // Capture the seeded state so the test can restore it at the end.
    const labels = ['Pobudka 6:00', 'Medytacja', 'Trening']
    const initiallyPressed: string[] = []
    for (const label of labels) {
      const chip = row.getByRole('button', { name: label })
      if ((await chip.getAttribute('aria-pressed')) === 'true') initiallyPressed.push(label)
    }

    // Uncheck everything — the last uncheck must DELETE the entry without errors.
    for (const label of initiallyPressed) {
      const chip = row.getByRole('button', { name: label })
      await chip.click()
      await expect(chip).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })
    }
    for (const label of labels) {
      await expect(row.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    }

    // Toggle one item on and off again (entry create → delete round-trip).
    const training = row.getByRole('button', { name: 'Trening' })
    await training.click()
    await expect(training).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
    await training.click()
    await expect(training).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 })

    // Restore the seeded state.
    for (const label of initiallyPressed) {
      const chip = row.getByRole('button', { name: label })
      await chip.click()
      await expect(chip).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
    }

    expectNoAppErrors(consoleErrors)
  })

  test('legacy today overview tiles remain available with the 7-column item stack', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootSeededApp(page)

    await page.goto('/today?ui=legacy')
    const habitTile = page.locator('.overview-tile', { hasText: 'Poranna checklista' })
    await expect(habitTile.locator('.mcs-container')).toBeVisible()
    expect(await habitTile.locator('.mcs-col').count()).toBe(7)
    expect(await habitTile.locator('.mcs-cell').count()).toBe(21)

    const trackerTile = page.locator('.overview-tile', { hasText: 'Wieczorne wyciszenie' })
    await expect(trackerTile.locator('.mcs-container')).toBeVisible()
    expect(await trackerTile.locator('.mcs-cell').count()).toBe(14)

    await habitTile.screenshot({ path: 'test-results/multi-completion-today-tile.png' })
    expectNoAppErrors(consoleErrors)
  })

  test('objects library card exposes the items editor with the points threshold', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootSeededApp(page)

    await page.goto('/objects/habits')
    // Measurement-card titles live in <input> fields (no text content), so
    // anchor on the entry-mode badge and then resolve the exact card by the
    // title input's value — the seed has several multi-completion habits.
    const multiCards = page.locator('article').filter({ hasText: 'Checklista' })
    await expect(multiCards.first()).toBeVisible()
    let card = multiCards.first()
    for (let i = 0; i < (await multiCards.count()); i++) {
      const candidate = multiCards.nth(i)
      if ((await candidate.getByRole('textbox').first().inputValue()) === 'Poranna checklista') {
        card = candidate
        break
      }
    }
    await expect(card).toBeVisible()
    await card.hover()
    await card.getByRole('button', { name: 'Pokaż szczegóły' }).click()

    await expect(card.getByText('Elementy')).toBeVisible()
    await expect(card.locator('input[placeholder="Nazwa elementu"]')).toHaveCount(3)
    // Explicit threshold 3 of 4 pts (weights are not all 1 → points suffix).
    await expect(card.getByText('z 4 pkt')).toBeVisible()
    await expect(card.getByText('Zalicz dzień przy')).toBeVisible()

    await card.screenshot({ path: 'test-results/multi-completion-items-editor.png' })
    expectNoAppErrors(consoleErrors)
  })

  test('weekly reflection shows seven days of checklist evidence and persists a comment', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const consoleErrors = await bootSeededApp(page)
    await page.goto(`/calendar/week/${prevWeek}?action=reflect`)
    const ritual = page.locator('.quiet-ritual')
    const row = ritual.locator('.qr-evidence-row', { hasText: 'Poranna checklista' })
    await expect(row).toBeVisible()
    const cells = row.locator('.qr-evidence-cell')
    await expect(cells).toHaveCount(7)
    // Quiet reflection uses record dots; tooltips retain the weighted points.
    const values = await cells.evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('title') ?? '')
    )
    expect(values.some(value => /: [34](?: ·|$)/.test(value))).toBe(true)
    expect(values.some(value => /: [12](?: ·|$)/.test(value))).toBe(true)
    await expect(row.locator('.qr-record-dot.recorded').first()).toBeVisible()
    await row.getByRole('button', { name: /komentarz: Poranna checklista/i }).click()
    await row
      .getByRole('textbox', { name: 'Komentarz: Poranna checklista' })
      .fill('Sprawdzony zapis refleksji checklisty')
    await ritual.getByRole('button', { name: /^\d+\. Dziennik$/ }).click()
    await ritual.getByRole('button', { name: 'Zapisz refleksję', exact: true }).click()
    await expect(ritual.locator('.qr-save')).toHaveText('Zapisano')
    await page.reload()
    await row.getByRole('button', { name: /komentarz: Poranna checklista/i }).click()
    await expect(row.getByRole('textbox', { name: 'Komentarz: Poranna checklista' })).toHaveValue(
      'Sprawdzony zapis refleksji checklisty'
    )
    expectNoAppErrors(consoleErrors)
  })
})
