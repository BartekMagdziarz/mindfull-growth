import { expect, test, type Page } from '@playwright/test'

/**
 * Return ritual on the seeded verification instance (npm run dev:verify, 5199).
 * `enterReturnScenario(26)` rewrites the seed so the last user write lies 26
 * days back (three full break weeks across a month boundary); the DevTools
 * helper `window.__verifyReturnScenario(days)` does the same and reloads. Spec: ideas/html-plans/2026-10-25-return-ritual.html, docs/return-ritual.md.
 */

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'
const SHOTS = 'ideas/qa/return-ritual'

declare global {
  interface Window {
    __verifySeed: (options?: { reload?: boolean }) => Promise<void>
  }
}

async function bootSeededApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    { timeout: 90_000 }
  )
  await expect(page).not.toHaveURL(/login/)
}

async function enterBreak(page: Page): Promise<void> {
  await bootSeededApp(page)
  await page.waitForFunction(() => typeof window.__verifySeed === 'function')
  // Fresh seed, then the break scenario; the reload is ours so the rewrite
  // finishes before any navigation.
  await page.evaluate(async () => {
    await window.__verifySeed({ reload: false })
    const { enterReturnScenario } = await import('/src/dev/returnScenario.ts')
    await enterReturnScenario(26)
  })
  await page.reload()
  await page.goto('/today')
  await expect(page.getByTestId('return-invite')).toBeVisible({ timeout: 30_000 })
}

async function readSettings(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const { userSettingsDexieRepository } =
      await import('/src/repositories/userSettingsDexieRepository.ts')
    const raw = await userSettingsDexieRepository.get('returnRitual')
    return raw ? JSON.parse(raw) : null
  })
}

test.describe('return ritual', () => {
  test.describe.configure({ mode: 'serial' })

  test('invitation → four steps → Start → undo', async ({ page }) => {
    await enterBreak(page)
    const invite = page.getByTestId('return-invite')
    await expect(invite).toContainText('Bez zapisów od')
    await page.screenshot({ path: `${SHOTS}/01-today-invite.png` })

    await page.getByTestId('return-invite-open').click()
    await expect(page).toHaveURL(/\/return$/)
    await expect(page.getByRole('heading', { name: 'Co się działo przez ten czas?' })).toBeVisible()
    await page.getByTestId('return-note').fill('Choroba, potem wyjazd.')
    await page.getByTestId('return-note-alive').fill('Bieganie zostało, rutyna odpadła.')
    await page.getByTestId('return-note-want').fill('Mniej rzeczy naraz.')
    await page.screenshot({ path: `${SHOTS}/02-step-gone.png` })

    await page.getByRole('button', { name: 'Następny krok' }).click()
    await expect(
      page.getByRole('heading', { name: 'Co zostaje w planie, a co znika?' })
    ).toBeVisible()
    const matrix = page.getByTestId('return-keep-matrix')
    await expect(matrix).toBeVisible()
    // Keep one break week of the first habit; the editor appears for it.
    const firstHabitCell = matrix.locator('[data-testid^="matrix-cell-habit:"]').first()
    await firstHabitCell.click()
    const editor = page.getByTestId('return-week-editor')
    await expect(editor).toBeVisible()
    const row = editor.locator('[data-testid^="return-week-row-"]').first()
    const doneButtons = row.locator('.rr-done')
    const numberInputs = row.locator('input.rr-num:not(.rr-num--target)')
    if (await doneButtons.count()) {
      // The first break week may start before the cutoff, so a day can already
      // be done: toggle and expect the flip.
      const wasDone = (await doneButtons.nth(1).getAttribute('aria-pressed')) === 'true'
      await doneButtons.nth(1).click()
      await expect(doneButtons.nth(1)).toHaveAttribute('aria-pressed', wasDone ? 'false' : 'true')
    } else if (await numberInputs.count()) {
      await numberInputs.nth(1).fill('2')
      await numberInputs.nth(1).dispatchEvent('change')
    }
    await page.screenshot({ path: `${SHOTS}/03-step-tidy.png`, fullPage: true })

    await page.getByRole('button', { name: 'Następny krok' }).click()
    await expect(page.getByRole('heading', { name: 'Co wraca od tego tygodnia?' })).toBeVisible()
    await expect(page.getByTestId('return-want-now')).toContainText('Mniej rzeczy naraz.')
    await page.getByTestId('return-gentle').click()
    await expect(page.getByTestId('return-gentle')).toHaveAttribute('aria-checked', 'true')
    await page.screenshot({ path: `${SHOTS}/04-step-anew.png` })

    await page.getByRole('button', { name: 'Następny krok' }).click()
    await expect(page.getByRole('heading', { name: 'Zaczynamy?' })).toBeVisible()
    await expect(page.getByTestId('return-summary')).toContainText('zostaje w planie')
    await expect(page.getByTestId('return-summary')).toContainText('Refleksja trafi do dziennika')
    await page.screenshot({ path: `${SHOTS}/05-step-start.png` })

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByTestId('return-after')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zrobione' })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/06-after-start.png` })
    expect(await readSettings(page)).toMatchObject({ state: 'done' })
    // One journal entry with the date range, the tag and the three answers.
    const journal = await page.evaluate(async () => {
      const { journalDexieRepository } = await import('/src/repositories/journalDexieRepository.ts')
      const { contextTagDexieRepository } = await import('/src/repositories/tagDexieRepository.ts')
      const tags = await contextTagDexieRepository.getAll()
      const entries = (await journalDexieRepository.getAll()).filter(entry =>
        (entry.title ?? '').startsWith('Powrót po przerwie')
      )
      return {
        count: entries.length,
        title: entries[0]?.title,
        body: entries[0]?.body,
        tagged: entries[0]?.contextTagIds?.some(
          id => tags.find(tag => tag.id === id)?.name === 'Powrót'
        ),
      }
    })
    expect(journal.count).toBe(1)
    expect(journal.title).toMatch(/^Powrót po przerwie · .+ – .+$/)
    expect(journal.body).toContain('Co się działo: Choroba, potem wyjazd.')
    expect(journal.body).toContain('Żywe i odpadłe: Bieganie zostało, rutyna odpadła.')
    expect(journal.body).toContain('Chcę teraz: Mniej rzeczy naraz.')
    expect(journal.tagged).toBe(true)

    // Today no longer invites, also after a reload.
    await page.goto('/today')
    await expect(page.getByTestId('return-invite')).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Wybierz dzień' })).toBeVisible()
    await expect(page.getByTestId('return-invite')).toHaveCount(0)
  })

  test('„Porządki” in the library opens the ritual by hand, without a break', async ({ page }) => {
    await bootSeededApp(page)
    await page.evaluate(async () => {
      await window.__verifySeed({ reload: false })
    })
    await page.goto('/objects/goals')
    const entry = page.getByTestId('objects-return-ritual')
    await expect(entry).toBeVisible({ timeout: 30_000 })
    await entry.click()
    await expect(page).toHaveURL(/\/return\?manual=1$/)
    await expect(page.getByRole('heading', { name: 'Co się działo przez ten czas?' })).toBeVisible()
    await expect(page.getByText('Porządki · na życzenie')).toBeVisible()
    await page.getByRole('button', { name: 'Następny krok' }).click()
    await expect(
      page.getByRole('heading', { name: 'Co zostaje w planie, a co znika?' })
    ).toBeVisible()
    // Fresh seed: no full week without writes. From Thursday on the matrix still
    // offers the current week to date (one column); earlier in the week it is
    // replaced by a sentence. The other rows remain either way.
    const matrix = page.getByTestId('return-keep-matrix')
    if (await matrix.count()) {
      await expect(matrix.locator('[data-testid^="matrix-cell-habit:"]').first()).toBeVisible()
    } else {
      await expect(page.getByText('Żaden pełny tydzień nie minął bez zapisów')).toBeVisible()
    }
    await expect(page.getByText('Intencje z minionych tygodni')).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/07-manual-tidy.png` })
    await page.getByRole('button', { name: 'Następny krok' }).click()
    await page.getByRole('button', { name: 'Następny krok' }).click()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByTestId('return-after')).toBeVisible()
  })

  test('„Później” hides the invitation for the day', async ({ page }) => {
    await enterBreak(page)
    await page.getByTestId('return-invite-later').click()
    await expect(page.getByTestId('return-invite')).toHaveCount(0)
    expect(await readSettings(page)).toMatchObject({ state: 'dismissed' })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Wybierz dzień' })).toBeVisible()
    await expect(page.getByTestId('return-invite')).toHaveCount(0)
  })

  test('Start then „Cofnij porządki” brings the break back', async ({ page }) => {
    await enterBreak(page)
    await page.getByTestId('return-invite-open').click()
    await expect(page.getByRole('heading', { name: 'Co się działo przez ten czas?' })).toBeVisible()
    await page.getByRole('button', { name: 'Następny krok' }).click()
    await page.getByRole('button', { name: 'Następny krok' }).click()
    await page.getByRole('button', { name: 'Następny krok' }).click()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByTestId('return-after')).toBeVisible()
    await page.getByTestId('return-undo').click()
    await expect(page.getByRole('heading', { name: 'Co się działo przez ten czas?' })).toBeVisible()
    expect(await readSettings(page)).toBeNull()
    await page.goto('/today')
    await expect(page.getByTestId('return-invite')).toBeVisible()
  })
})
