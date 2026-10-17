import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate } from '../src/utils/periods'

/**
 * Shame path v3 on the seeded verification instance (plan:
 * ideas/html-plans/2026-10-04-shame-path-v3.html, Lab /concepts/shame-path
 * round 5): the path view (weeks as rows, Teraz, Postęp with the parts
 * glance and the measure tracks, own sentences, knowledge cards), the
 * Momenty v3 run with the quick taps, the reflection block with the compact
 * glance and the "unlogged" question, the "O czym jest ten wstyd?" entry pick
 * and the Today paths card.
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

test.describe('shame path v3', () => {
  test('path view: nine week rows, the current week open, Teraz, Postęp, own sentences and knowledge', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/exercises/programs/shame-compassion')
    await expect(page.getByRole('heading', { name: 'Ze wstydu do współczucia', level: 1 })).toBeVisible()
    await expect(page.locator('.mg-v2-page-head__eyebrow')).toContainText('Tydzień 4 z 8')
    await expect(page.locator('.path-view__sign')).toContainText('zostanę w rozmowie')

    // Twoja droga: weeks as nouns, the return apart; week 4 is open with its current step.
    const journey = page.getByTestId('path-journey')
    await expect(journey.locator('.wk__title')).toHaveText([
      'Rozpoznanie',
      'Oparcie',
      'Plan na trudną chwilę',
      'Inne spojrzenie',
      'Krytyk',
      'Własny głos',
      'Wyjście z ukrycia',
      'Utrwalenie',
      'Powrót',
    ])
    const week4 = journey.locator('[data-test-path-week="w4"]')
    await expect(week4.locator('.wk__row')).toHaveAttribute('aria-expanded', 'true')
    await expect(week4.locator('[data-test-program-step="9"]')).toContainText('Zapis myśli')
    await expect(week4.locator('[data-test-program-step="9"]').getByRole('button', { name: 'Rozpocznij' })).toBeVisible()
    await expect(page.getByTestId('path-practices')).toContainText('Przerwa na współczucie')
    await expect(page.getByTestId('path-world')).toContainText('Użyj swojej odpowiedzi na wstyd')
    // Other weeks stay closed; opening one shows its steps.
    const week1 = journey.locator('[data-test-path-week="w1"]')
    await expect(week1.locator('.wk__row')).toHaveAttribute('aria-expanded', 'false')
    await week1.locator('.wk__row').click()
    await expect(week1).toContainText('Po czym poznam zmianę')

    // Teraz: the current step with its intro, the due practice, two chips, the plan quote.
    const now = page.getByTestId('path-now')
    await expect(now).toContainText('Zapis myśli')
    await expect(now.getByRole('button', { name: 'Rozpocznij' })).toBeVisible()
    // Zapis myśli starts from a moment: the picker lists the path's moments, a pick prefills the record.
    await now.getByRole('button', { name: 'Rozpocznij' }).click()
    const picker = page.getByTestId('moment-picker')
    await expect(picker).toBeVisible()
    await expect(picker.locator('li')).toHaveCount(8)
    await picker.locator('button', { hasText: 'Zadałem „głupie” pytanie' }).click()
    await expect(page).toHaveURL(/\/exercises\/thought-record\?momentId=/)
    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()
    await expect(page.locator('textarea').first()).toHaveValue(/Zadałem „głupie” pytanie/)
    await page.goto('/exercises/programs/shame-compassion')
    await expect(now.getByRole('button', { name: 'Rozpocznij' })).toBeVisible()
    await expect(now).toContainText('Przerwa na współczucie')
    await expect(now.getByRole('link', { name: 'Zapisz moment' })).toHaveAttribute('href', '/exercises/micro/moment-shame')
    await now.getByRole('button', { name: 'Mój plan' }).click()
    await expect(page.getByTestId('path-response')).toContainText('Widzę cię. Nie musisz tego teraz naprawiać.')

    // Postęp: the parts glance (one row per part, numbers only in the table) and four measure tracks.
    const glance = page.getByTestId('path-moments-glance')
    await expect(glance.locator('.smg__label').filter({ hasText: /./ })).toHaveText([
      'Ukrywający',
      'Krytyk',
      'Oskarżyciel',
      'Odwracający uwagę',
      'Żadna część',
    ])
    await glance.locator('summary').click()
    await glance.getByRole('button', { name: 'Liczby' }).click()
    await expect(glance.getByRole('table')).toContainText('Razem')
    await expect(page.getByTestId('path-measure').locator('.sk')).toHaveCount(4)

    // Moje zdania: the seeded sentences; Warto wiedzieć: two titles, a card opens in the drawer.
    const sentences = page.getByRole('region', { name: 'Moje zdania' })
    await expect(sentences.locator('.quotes li')).toHaveCount(2)
    await sentences.getByRole('button', { name: 'Wszystkie' }).click()
    await expect(sentences).toContainText('Jesteś człowiekiem i to boli')
    const knowledge = page.getByRole('region', { name: 'Warto wiedzieć' })
    await expect(knowledge.locator('.kn li')).toHaveCount(2)
    await knowledge.locator('.kn button').first().click()
    const drawer = page.locator('dialog.drawer')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Przeczytane' }).click()
    await expect(drawer).toBeHidden()
    await expect(knowledge.locator('.kn button').first().locator('.app-icon').first()).toHaveAttribute('data-icon', 'check')
  })

  test('Momenty (shame variant): quick taps, hints from the plan and the map, the week read back in the reflection', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await bootSeededApp(page)
    await page.goto('/exercises/micro/moment-shame')
    await expect(page.getByRole('heading', { name: 'Moment wstydu' }).first()).toBeVisible()
    const step = async (heading: string | RegExp, label: 'Dalej' | 'Zapisz' = 'Dalej') => {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
      await page.getByRole('button', { name: label, exact: true }).click()
    }
    // The preset kind never shows: the first question is whether there was a moment.
    await expect(page.getByRole('heading', { name: 'Czy od ostatniego wpisu był taki moment?' })).toBeVisible()
    await page.getByRole('radio', { name: 'Tak' }).click()
    await step('Czy od ostatniego wpisu był taki moment?')
    // The quick taps: part · when noticed · response · how strongly.
    await expect(page.getByRole('heading', { name: 'Która część przejęła ster?' })).toBeVisible()
    await page.getByRole('radio', { name: /Ukrywający/ }).click()
    await step('Która część przejęła ster?')
    await page.getByRole('radio', { name: 'Po chwili' }).click()
    await step(/Kiedy to zauważył/)
    const hint = page.getByTestId('micro-hint')
    await expect(hint).toContainText('Zostań w sytuacji minutę dłużej')
    await page.getByRole('button', { name: 'Oddech' }).click()
    await step(/Jak odpowiedział/)
    await step('Jak silny był wstyd?')
    await page.locator('textarea').fill('Na stand-upie nie wiedziałem, o co chodzi, i nie zapytałem.')
    await step('Co się wydarzyło?')
    await step('O czym jest ten wstyd?')
    await expect(page.getByTestId('micro-hint')).toContainText('gorąco na twarzy')
    await step('Co działo się w ciele?')
    await step('Co mówił Krytyk?')
    await page.locator('textarea').fill('Nie znać czegoś to nie wstyd. Zapytaj.')
    await step('Co powiedziałby ktoś życzliwy?')
    await step('Co zrobisz następnym razem?', 'Zapisz')
    await expect(page.locator('textarea')).toHaveCount(0)

    // The reflection: the task's days (the seeded day from yesterday counts only when it is
    // in this week), this week next to the previous one, the unlogged question.
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const seededDays = getPeriodRefsForDate(yesterday).week === refs.week ? 1 : 0
    await page.goto(`/calendar/week/${refs.week}?action=reflect`)
    for (let i = 0; i < 8 && !(await page.locator('.qr-path-step').isVisible()); i += 1) {
      await page.locator('.qr-arrow--next').click()
    }
    const block = page.locator('.qr-path-block', { hasText: 'Ze wstydu do współczucia' })
    await expect(block).toBeVisible()
    await expect(block).toContainText('Użyj swojej odpowiedzi na wstyd')
    await expect(block).toContainText(`${seededDays + 1} z 3`)
    const glance = block.getByTestId('path-moments-glance')
    const axis = await glance.locator('.smg__cells--axis small').filter({ hasText: /./ }).allTextContents()
    expect(axis).toHaveLength(2)
    expect(Number(axis[1]!.slice(1))).toBe(Number(axis[0]!.slice(1)) + 1)
    await block.getByRole('button', { name: '1–2' }).click()
    await expect(block.getByRole('button', { name: '1–2' })).toHaveAttribute('aria-pressed', 'true')
    await expect(block.locator('.qr-scale--row button')).toHaveText(['1', '2', '3', '4', '5'])
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
    await cards.first().click()
    await page.getByRole('button', { name: 'Dalej' }).click()
    await expect(page.getByTestId('micro-hint')).toContainText('Zadałem „głupie” pytanie')
  })

  test('Today: the paths card shows the week, the next step, the due practice and two quick chips', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/today')
    const card = page.getByRole('region', { name: 'Ścieżki' })
    await expect(card).toContainText('Ze wstydu do współczucia')
    await expect(card).toContainText('tydzień 4 z 8')
    await expect(card.locator('.next-day-exercises__row--child', { hasText: 'Zapis myśli' })).toBeVisible()
    await expect(card.locator('.next-day-exercises__row--child', { hasText: 'Przerwa na współczucie' })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Zapisz moment' })).toHaveAttribute('href', '/exercises/micro/moment-shame')
    await card.getByRole('link', { name: 'Mój plan' }).click()
    await expect(page).toHaveURL(/\/exercises\/programs\/shame-compassion$/)
  })
})
