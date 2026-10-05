import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate } from '../src/utils/periods'

/**
 * Shame path v2 on the seeded verification instance (plan:
 * ideas/html-plans/2026-09-26-shame-path-v2-compassion.html): the v2 path
 * view with the Momenty row, the Momenty variant run (preset kind, hints),
 * the "O czym jest ten wstyd?" entry pick, the weekly task choice card and
 * the task ↔ exercise bridge read back in the weekly reflection.
 */

const refs = getPeriodRefsForDate(new Date())
const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function bootSeededApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction((key: string) => window.localStorage.getItem(key) !== null, SEED_MARKER_KEY, {
    timeout: 90_000,
  })
  await expect(page).not.toHaveURL(/login/)
}

test.describe('shame path v2', () => {
  test('path view: 15 steps, image before the critic, Momenty row with the 7-day count', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/exercises/programs/shame-compassion')
    await expect(page.getByRole('heading', { name: 'Ze wstydu do współczucia' }).first()).toBeVisible()
    const phases = page.locator('.program-phase-head h3')
    await expect(phases).toHaveText([
      'Rozpoznawanie',
      'Współczująca strona',
      'O czym jest ten wstyd',
      'Krytyk',
      'Przekonania',
      'Wyjście z ukrycia',
      'Głębiej',
      'Utrwalenie',
    ])
    const momentsRow = page.getByRole('region', { name: 'Momenty' })
    await expect(momentsRow).toBeVisible()
    // Seed: moments 6, 4, 2 and 1 days ago (the calm-day note does not count).
    await expect(momentsRow).toContainText('4 momenty w ostatnich 7 dniach')
    await expect(momentsRow.getByRole('link', { name: 'Zapisz moment' })).toHaveAttribute('href', '/exercises/micro/moment-shame')
    // Legacy log routes redirect to the variants.
    await page.goto('/exercises/micro/shame-log')
    await expect(page).toHaveURL(/\/exercises\/micro\/moment-shame$/)
  })

  test('Momenty (shame variant): no kind step, hints from the map and the response plan, bridge counts the day', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await bootSeededApp(page)
    await page.goto('/exercises/micro/moment-shame')
    await expect(page.getByRole('heading', { name: 'Moment wstydu' }).first()).toBeVisible()
    // The preset kind never shows: the first question is whether there was a moment.
    await expect(page.getByRole('heading', { name: 'Czy był ostatnio taki moment?' })).toBeVisible()
    await page.getByRole('radio', { name: 'Tak' }).click()
    await page.getByRole('button', { name: 'Dalej' }).click()
    await page.locator('textarea').fill('Na stand-upie nie wiedziałem, o co chodzi, i nie zapytałem.')
    await page.getByRole('button', { name: 'Dalej' }).click()
    // "O czym jest ten wstyd?" with the verb under each answer.
    await expect(page.getByRole('heading', { name: 'O czym jest ten wstyd?' })).toBeVisible()
    const demand = page.getByRole('radio', { name: /jaki powinienem być/ })
    await expect(demand).toContainText('sprawdź')
    await demand.click()
    await page.getByRole('button', { name: 'Dalej' }).click()
    await page.getByRole('radio', { name: 'Wycofanie się' }).click()
    await page.getByRole('button', { name: 'Dalej' }).click()
    // Response step quotes the seeded response plan's moves.
    const hint = page.getByTestId('micro-hint')
    await expect(hint).toContainText('Z twojej odpowiedzi na wstyd')
    await expect(hint).toContainText('Zostań w sytuacji minutę dłużej')
    await page.getByRole('button', { name: 'Oddech' }).click()
    await page.getByRole('button', { name: 'Nazwanie wstydu' }).click()
    await page.getByRole('button', { name: 'Dalej' }).click()
    // Body step quotes the shame map's body signs.
    await expect(page.getByTestId('micro-hint')).toContainText('Z twojej mapy wstydu')
    await expect(page.getByTestId('micro-hint')).toContainText('gorąco na twarzy')
    await page.getByRole('button', { name: 'Dalej' }).click() // body (optional)
    // Steps cross-fade: wait for the next heading before clicking again.
    await expect(page.getByRole('heading', { name: 'Co mówił krytyk?' })).toBeVisible()
    await page.getByRole('button', { name: 'Dalej' }).click() // critic (optional)
    await expect(page.getByRole('heading', { name: 'Co powiedziałby ktoś życzliwy?' })).toBeVisible()
    await expect(page.getByTestId('micro-hint')).toContainText('Z twojego obrazu współczującego')
    await page.locator('textarea').fill('Nie znać czegoś to nie wstyd. Zapytaj.')
    await page.getByRole('button', { name: 'Dalej' }).click() // → nextTime (optional, last)
    await expect(page.getByRole('heading', { name: 'Co zrobisz następnym razem?' })).toBeVisible()
    await page.getByRole('button', { name: 'Zapisz' }).click()
    await expect(page.locator('textarea')).toHaveCount(0)

    // The bridge: this week's "useResponse" task had 1 day (yesterday); today makes 2.
    await page.goto(`/calendar/week/${refs.week}?action=reflect`)
    for (let i = 0; i < 8 && !(await page.locator('.qr-path-step').isVisible()); i += 1) {
      await page.locator('.qr-arrow--next').click()
    }
    const block = page.locator('.qr-path-block', { hasText: 'Ze wstydu do współczucia' })
    await expect(block).toBeVisible()
    await expect(block).toContainText('Użyj swojej odpowiedzi na wstyd')
    await expect(block).toContainText('2 z 3')
    await expect(block.locator('.qr-scale--row button')).toHaveText(['1', '2', '3', '4', '5'])
    await block.locator('.qr-scale--row button').nth(1).click()
    await expect(block.locator('.qr-scale--row button').nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => block.locator('.qr-scale--row button').nth(1).evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(await block.locator('.qr-scale--row button').first().evaluate(el => getComputedStyle(el).backgroundColor))
    await block.locator('textarea').first().focus()
    const focus = await block.locator('textarea').first().evaluate(el => ({ outline: getComputedStyle(el).outlineColor, shadow: getComputedStyle(el).boxShadow }))
    expect(focus.outline).toBe('rgba(0, 0, 0, 0)')
    expect(focus.shadow).toContain('inset')
    await page.screenshot({ path: 'test-results/path-rating-focus.png', fullPage: true, animations: 'disabled' })
    // The week's moments sit under the task.
    await block.getByRole('button', { name: /Momenty z tego tygodnia/ }).click()
    await expect(block.locator('.qr-path-moments__list li').first()).toContainText('Na stand-upie')
  })

  test('"O czym jest ten wstyd?" starts from a picked moment and quotes it', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/exercises/micro/shame-or-guilt')
    await expect(page.getByRole('heading', { name: 'Wybierz moment' })).toBeVisible()
    const cards = page.locator('.micro-pick__card')
    expect(await cards.count()).toBeGreaterThanOrEqual(4)
    await expect(cards.first()).toContainText('Zadałem „głupie” pytanie')
    await expect(cards.first()).toContainText('O tym, jaki powinienem być')
    await cards.first().click()
    await page.getByRole('button', { name: 'Dalej' }).click()
    await expect(page.getByTestId('micro-hint')).toContainText('Z tego momentu')
    await expect(page.getByTestId('micro-hint')).toContainText('Zadałem „głupie” pytanie')
  })

  test('weekly plan: the path card offers the phase tasks as radios with earlier tasks behind a disclosure', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    // The seeded anxiety path has no decision this week → a fresh proposal card.
    await page.goto(`/calendar/week/${refs.week}?action=plan`)
    const card = page.locator('.qr-path-card', { hasText: 'Lęk' })
    await expect(card).toBeVisible()
    const radios = card.getByRole('radio')
    expect(await radios.count()).toBeGreaterThanOrEqual(1)
    await expect(radios.first()).toBeChecked()
    await expect(card).toContainText('propozycja')
    const disclosure = card.getByRole('button', { name: /Wcześniejsze zadania/ })
    await expect(disclosure).toBeVisible()
    const before = await radios.count()
    await disclosure.click()
    expect(await card.getByRole('radio').count()).toBeGreaterThan(before)
    // Picking another task changes the "why" and the accepted intention.
    const last = card.getByRole('radio').last()
    await last.check()
    const chosenTitle = (await last.locator('xpath=..').textContent())?.trim() ?? ''
    await card.getByRole('button', { name: 'Dodaj jako intencję' }).click()
    await expect(card).toHaveCount(0)
    await expect(page.locator('.qr-focus')).toContainText(chosenTitle.split('\n')[0]!.slice(0, 24))
  })
})
