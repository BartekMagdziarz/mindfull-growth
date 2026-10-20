import { expect, test, type Page } from '@playwright/test'

/**
 * Goal closing ritual on the seeded verification instance (npm run dev:verify, 5199).
 * The seed ships two overdue goals: „Blok treningowy” (full SMART fields, two key
 * results → 4-step ritual) and „Porządek w finansach” (bare → 3 steps).
 * Spec: ideas/html-plans/2026-10-04-goal-closing-ritual.html, docs/goal-closing-ritual.md.
 */

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function bootSeededApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    { timeout: 90_000 }
  )
  await expect(page).not.toHaveURL(/login/)
}

async function readGoal(page: Page, title: string) {
  return page.evaluate(async (wanted: string) => {
    const dbs = await indexedDB.databases()
    const name = dbs.map(d => d.name).find(n => n && n.startsWith('MindfullGrowthDB_simplify_'))!
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open(name)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const rows = await new Promise<any[]>((res, rej) => {
      const r = db.transaction('goals').objectStore('goals').getAll()
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    db.close()
    const goal = rows.find(g => g.title === wanted)
    return goal
      ? {
          id: goal.id as string,
          status: goal.status as string,
          targetDate: goal.targetDate as string | undefined,
          reflection: goal.closingReflection,
        }
      : null
  }, title)
}

test.describe('goal closing ritual', () => {
  test('closes an overdue goal from „Najbliżej” with a full reflection and a habit', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/today')

    const upcoming = page.locator('.next-day-upcoming')
    await expect(upcoming.locator('.next-day-upcoming__tile').first()).toBeVisible()
    const more = upcoming.getByRole('button', { name: /^Jeszcze/ })
    if (await more.isVisible()) await more.click()
    const item = upcoming
      .locator('.next-day-upcoming__tile', { hasText: 'Blok treningowy' })
      .first()
    await item.locator('.ndt__open').click()

    // Step 1: facts month by month, suggested verdict, side exit present.
    await expect(page.locator('.quiet-ritual h1')).toHaveText('Jak skończył się ten cel?')
    await expect(page.locator('.qr-progress button')).toHaveCount(4)
    await expect(page.locator('.gc-table-row')).toHaveCount(2)
    await expect(page.locator('.qr-choice.selected')).toContainText('podpowiedź')
    await expect(page.getByRole('button', { name: /Przesuń termin/ })).toBeVisible()
    await page.locator('.gc-choices .qr-choice-pick', { hasText: 'Częściowo' }).click()

    // Step 2: the creation answers come back.
    await page.locator('.qr-arrow--next').click()
    await expect(page.locator('.quiet-ritual h1')).toHaveText(
      /^Co powiedziała?e?ś sobie na starcie\?$/
    )
    await expect(page.locator('.gc-then').first()).toContainText('Trzy treningi tygodniowo')
    await page.locator('.gc-seg button', { hasText: 'Częściowo' }).click()
    await page.locator('.gc-scale button').nth(5).click()
    await expect(page.locator('.gc-scale small')).toHaveText('wtedy 8 · dziś 6')

    // Step 3: lessons, with the start's resources as a hint.
    await page.locator('.qr-arrow--next').click()
    await expect(page.locator('.gc-field').first()).toContainText('Siłownia obok pracy')
    await page.locator('.gc-field textarea').nth(2).fill('Trzy razy w tygodniu to realny rytm.')

    // Step 4: carry a key result on as a habit, then close.
    await page.locator('.qr-arrow--next').click()
    await page.locator('.gc-choices--2 .qr-choice-pick', { hasText: 'Zostaje nawyk' }).click()
    await page.locator('.gc-sub-row', { hasText: '3 treningi w tygodniu' }).locator('input').check()
    await page.locator('.qr-finish .qr-primary').click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/today'))

    const goal = await readGoal(page, 'Blok treningowy')
    expect(goal?.status).toBe('completed')
    expect(goal?.reflection?.outcome).toBe('partial')
    expect(goal?.reflection?.successMet).toBe('partly')
    expect(goal?.reflection?.confidenceInHindsight).toBe(6)
    expect(goal?.reflection?.learned).toBe('Trzy razy w tygodniu to realny rytm.')
    expect(goal?.reflection?.followUp?.kind).toBe('habit')
    expect(goal?.reflection?.followUp?.createdHabitIds).toHaveLength(1)
    expect(goal?.reflection?.keyResults).toHaveLength(2)

    // The closed goal folds into „Zrobione wcześniej” as „Podsumowany”.
    const pastToggle = upcoming.getByRole('button', { name: /^Minione/ })
    await expect(pastToggle).toBeVisible()
    await pastToggle.click()
    const past = upcoming.locator('.next-day-upcoming__past')
    await expect(
      past
        .locator('.next-day-upcoming__tile', { hasText: 'Blok treningowy' })
        .locator('.next-day-upcoming__glyph')
    ).toHaveAttribute('title', 'Podsumowany')

    // Library card: outcome shade + closing summary, reachable with closed objects shown.
    await page.goto('/objects/goals?showClosed=1')
    const card = page.locator('article:has(.gc-summary)').first()
    await expect(card).toBeVisible()
    await expect(card.locator('.mg-v2-meta').first()).toContainText('częściowo')
    await expect(card.locator('.gc-summary__head')).toHaveText('Podsumowanie')
    await expect(card.locator('.gc-summary__lead')).toContainText('realny rytm')
    await expect(card.locator('.mg-v2-timeline')).toHaveCount(0)
    await expect(card).not.toContainText('po terminie')
  })

  test('a bare goal gets three steps and „Przesuń termin” leaves it open', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    const bare = await readGoal(page, 'Porządek w finansach')
    expect(bare).not.toBeNull()

    await page.goto(`/objects/goals/${bare!.id}/close?return=/today`)
    await expect(page.locator('.qr-progress button')).toHaveCount(3)
    await page
      .getByRole('button', { name: /Przesuń termin/ })
      .first()
      .click()
    await page.locator('.gc-deadline-form input').fill('2026-12-15')
    await page.locator('.gc-deadline-form .qr-primary').click()
    await page.waitForURL(url => new URL(url).pathname.startsWith('/today'))

    const moved = await readGoal(page, 'Porządek w finansach')
    expect(moved?.status).toBe('open')
    expect(moved?.targetDate).toBe('2026-12-15')
    expect(moved?.reflection).toBeUndefined()
  })

  test('a saved weekly reflection invites to close overdue goals', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/today')
    const upcoming = page.locator('.next-day-upcoming')
    await expect(upcoming.locator('.next-day-upcoming__tile').first()).toBeVisible()
    const more = upcoming.getByRole('button', { name: /^Jeszcze/ })
    if (await more.isVisible()) await more.click()
    const pastToggle = upcoming.getByRole('button', { name: /^Minione/ })
    if (await pastToggle.count()) await pastToggle.click()
    await page
      .locator('.next-day-upcoming__tile.is-ritual', {
        hasText: /Podsumuj (ten|poprzedni) tydzień/,
      })
      .locator('.ndt__open')
      .first()
      .click()

    await expect(page.locator('.quiet-ritual')).toBeVisible()
    await expect(page.locator('.gc-invite')).toHaveCount(0)
    const dots = page.locator('.qr-progress button')
    await dots.nth((await dots.count()) - 1).click()
    await page.locator('.qr-finish .qr-primary').click()

    const invite = page.locator('.gc-invite')
    await expect(invite).toBeVisible()
    await expect(invite.locator('.gc-invite__row')).toHaveCount(2)
    await invite
      .locator('.gc-invite__row', { hasText: 'Porządek w finansach' })
      .getByRole('button', { name: 'Później' })
      .click()
    await expect(invite.locator('.gc-invite__row')).toHaveCount(1)
    await invite.getByRole('button', { name: 'Podsumuj cel' }).click()
    await expect(page).toHaveURL(/\/objects\/goals\/[^/]+\/close\?return=/)
    await expect(page.locator('.quiet-ritual h1')).toHaveText('Jak skończył się ten cel?')
  })
})
