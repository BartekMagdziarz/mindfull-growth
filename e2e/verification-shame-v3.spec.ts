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
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    {
      timeout: 90_000,
    }
  )
  await expect(page).not.toHaveURL(/login/)
}

/**
 * Calendar weeks the path has touched so far, counted from a seed date `daysAgo`
 * days back (src/dev/verificationSeed.ts): the Postęp chart draws one column per
 * calendar week from the start week to this one, so the count moves with the weekday.
 */
function weeksSince(daysAgo: number): number {
  const weeks = new Set<string>()
  for (let back = daysAgo; back >= 0; back -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - back)
    weeks.add(getPeriodRefsForDate(day).week)
  }
  return weeks.size
}

test.describe('shame path v3', () => {
  test('path view: nine week rows, the current week open as tiles, Praktyki, Postęp, own sentences and knowledge', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/exercises/programs/shame-compassion')
    await expect(
      page.getByRole('heading', { name: 'Ze wstydu do współczucia', level: 1 })
    ).toBeVisible()
    await expect(page.locator('.mg-v2-page-head__eyebrow')).toContainText('Tydzień 4 z 8')
    await expect(page.locator('.path-view__sign')).toContainText('zostanę w rozmowie')

    // Twoja droga: weeks as nouns, the return apart; week 4 is open with its steps as tiles, the current one lit.
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
    const currentTile = week4.locator('[data-test-program-step="9"]')
    await expect(currentTile).toHaveClass(/pp-tile--current/)
    await expect(currentTile).toContainText('Po co:')
    await expect(currentTile.getByRole('button', { name: 'Rozpocznij' })).toBeVisible()
    await expect(week4.locator('.pp-tile')).toHaveCount(3)
    // The week row: the number well on the left, one state disc on the right reading done/total.
    await expect(week4.locator('.pp-disc--meter')).toHaveAttribute('aria-label', /z 3 kroków/)
    // Praktyki: the practices, Momenty and the week's task as tiles.
    const practices = page.getByTestId('path-practices')
    await expect(practices).toContainText('Przerwa na współczucie')
    await expect(page.getByTestId('path-world')).toContainText('Użyj swojej odpowiedzi na wstyd')
    await expect(
      page.getByTestId('path-moment-tile').getByRole('button', { name: 'Zapisz' })
    ).toBeVisible()
    // "Od nowa" is a link in the journey head with an inline confirm; no "Teraz" card any more.
    await journey.getByTestId('path-restart').click()
    await expect(journey.getByRole('button', { name: 'Zacznij od nowa' })).toBeVisible()
    await journey.getByRole('button', { name: 'Zostaw' }).click()
    await expect(page.getByTestId('path-now')).toHaveCount(0)
    // Other weeks stay closed; opening one shows its steps.
    const week1 = journey.locator('[data-test-path-week="w1"]')
    await expect(week1.locator('.wk__row')).toHaveAttribute('aria-expanded', 'false')
    await week1.locator('.wk__row').click()
    await expect(week1).toContainText('Po czym poznam zmianę')

    // Zapis myśli starts from a moment: the picker lists the path's moments, a pick prefills the record.
    await currentTile.getByRole('button', { name: 'Rozpocznij' }).click()
    const picker = page.getByTestId('moment-picker')
    await expect(picker).toBeVisible()
    await expect(picker.locator('li')).toHaveCount(8)
    await picker.locator('button', { hasText: 'Zadałem „głupie” pytanie' }).click()
    await expect(page).toHaveURL(/\/exercises\/thought-record\?momentId=/)
    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()
    await expect(page.locator('textarea').first()).toHaveValue(/Zadałem „głupie” pytanie/)
    await page.goto('/exercises/programs/shame-compassion')
    await expect(currentTile.getByRole('button', { name: 'Rozpocznij' })).toBeVisible()
    await practices.getByRole('button', { name: 'Mój plan' }).click()
    await expect(page.getByTestId('path-response')).toContainText(
      'Widzę cię. Nie musisz tego teraz naprawiać.'
    )

    // Postęp: the parts chart (columns per week, the legend on the left, numbers only on hover and in the table) and four measure tracks.
    const glance = page.getByTestId('path-moments-glance')
    await expect(glance.locator('.pc__legend-name')).toHaveText([
      'Agresor',
      'Krytyk',
      'Ukrywający',
      'Odwracający uwagę',
      'Ja',
    ])
    // One column per calendar week since the enrollment started 24 days ago (shameStart in the seed).
    await expect(glance.locator('.pc__week:not(.is-slot)')).toHaveCount(weeksSince(24))
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
    await expect(knowledge.locator('.kn button')).toHaveCount(2)
    await knowledge.locator('.kn button').first().click()
    const drawer = page.locator('dialog.drawer')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Przeczytane' }).click()
    await expect(drawer).toBeHidden()
    await expect(
      knowledge.locator('.kn button').first().locator('.app-icon').first()
    ).toHaveAttribute('data-icon', 'check')
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
    await expect(
      page.getByRole('heading', { name: 'Czy od ostatniego wpisu był taki moment?' })
    ).toBeVisible()
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
    // The strength stack starts empty: Dalej waits for a tap.
    await expect(page.getByRole('button', { name: 'Dalej', exact: true })).toBeDisabled()
    await page
      .getByRole('radiogroup', { name: 'Jak silny był wstyd?' })
      .getByRole('radio', { name: '3' })
      .click()
    await step('Jak silny był wstyd?')
    await page
      .locator('textarea')
      .fill('Na stand-upie nie wiedziałem, o co chodzi, i nie zapytałem.')
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
    // The task tile: one disc reading done/target; the counted days only on hover.
    await expect(block.locator('.qr-path-task__disc')).toHaveText(`${seededDays + 1}/3`)
    const axis = await block.locator('.pc__axis small').filter({ hasText: /./ }).allTextContents()
    expect(axis).toHaveLength(2)
    expect(Number(axis[1]!.slice(1))).toBe(Number(axis[0]!.slice(1)) + 1)
    // The estimate sits behind "więcej, bez szczegółów"; "Dopisz" writes a Moment on a chosen day.
    await block.getByRole('button', { name: 'więcej, bez szczegółów' }).click()
    await block.getByRole('button', { name: '1–2' }).click()
    await expect(block.getByRole('button', { name: '1–2' })).toHaveAttribute('aria-pressed', 'true')
    await expect(block.locator('.qr-scale--row button')).toHaveText(['1', '2', '3', '4', '5'])
    await block.getByRole('button', { name: 'Szczegóły' }).click()
    await expect(block.locator('.qr-path-moments__list li').first()).toContainText('Na stand-upie')
    await block.getByTestId('path-backfill-open').click()
    const form = block.getByTestId('path-backfill-form')
    await form.getByRole('radio').first().click()
    await form.getByRole('radio', { name: 'Krytyk' }).click()
    await form.getByRole('button', { name: 'Oddech' }).click()
    await form.getByRole('button', { name: 'Dopisz', exact: true }).click()
    await expect(block.locator('.qr-path-added li')).toHaveCount(1)
    await expect(block.locator('.qr-path-added li')).toContainText('Krytyk')
    await expect(block.locator('.pc__seg.is-later')).toHaveCount(1)
    await block.locator('.qr-path-added__remove').click()
    await expect(block.locator('.qr-path-added li')).toHaveCount(0)
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

  test('Today: the day plan lists the step and the practice; the paths card is one row — phase with dots, next step, Zapisz moment, the task as dots', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/today')
    const card = page.getByRole('region', { name: 'Ścieżki' })
    await expect(card).toContainText('Ze wstydu do współczucia')
    const practices = page.getByTestId('today-practices')
    await expect(practices.locator('.ndp', { hasText: 'Zapis myśli' })).toBeVisible()
    await expect(practices.locator('.ndp', { hasText: 'Przerwa na współczucie' })).toBeVisible()

    const tile = card.locator('[data-testid="today-path-tile"]', {
      hasText: 'Ze wstydu do współczucia',
    })
    const phase = tile.getByTestId('today-path-phase')
    await expect(phase).toContainText('Inne spojrzenie')
    await expect(phase).not.toContainText('Tydzień')
    await expect(phase.locator('.ndpath-dots > i')).toHaveCount(8)
    await expect(phase.locator('.ndpath-dots > i.is-done')).toHaveCount(3)
    await expect(phase.locator('.ndpath-dots')).toHaveAttribute('aria-label', 'tydzień 4 z 8')
    // No fractions on the surface: the numbers live in title/aria.
    await expect(tile).not.toContainText('z 8')
    await expect(tile).not.toContainText('z 3')

    const task = tile.getByTestId('today-path-task')
    await expect(task).toContainText('Zadanie tygodnia')
    await expect(task).toContainText('Użyj swojej odpowiedzi na wstyd')
    await expect(task.locator('.ndpath__task-dots > i')).toHaveCount(3)
    await expect(task.locator('.ndpath__task-dots > i.is-done')).toHaveCount(1)
    await expect(task).toHaveAttribute('title', '1 z 3 dni')

    await expect(tile.getByTestId('today-path-moment')).toHaveAttribute(
      'href',
      '/exercises/micro/moment-shame'
    )
    await expect(tile.locator('.next-day-paths__step')).toHaveCount(0)
    await expect(tile.getByRole('link', { name: 'Mój plan' })).toHaveCount(0)
    await card.screenshot({ path: 'test-results/today-paths.png' })

    // The next step starts from a moment, so the action opens the picker first.
    const step = tile.getByTestId('today-path-step')
    await expect(step).toContainText('Zapis myśli')
    await expect(step).toContainText('dziś')
    await step.click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test("Najbliżej: the closed path's letter waits (no rose) and the return is announced; opening the letter marks it read", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/today')
    const upcoming = page.locator('.next-day-upcoming')
    // The waiting letter is overdue, so it leads the list and tells us the markers have loaded.
    const letter = upcoming.locator('.next-day-upcoming__tile.is-letter', {
      hasText: 'List od Ciebie',
    })
    await expect(letter).toBeVisible()
    const more = upcoming.getByRole('button', { name: /^Jeszcze/ })
    if (await more.isVisible()) await more.click()
    await expect(letter).toContainText('Ze wstydu do współczucia')
    await expect(letter.locator('.next-day-upcoming__mark')).toHaveText(/^od \d+ dni$|^od wczoraj$/)
    await expect(letter.locator('.next-day-upcoming__mark')).not.toHaveClass(/is-rose/)
    const ret = upcoming.locator('.next-day-upcoming__tile.is-return', { hasText: 'Powrót' })
    await expect(ret).toBeVisible()
    await expect(ret.locator('.next-day-upcoming__mark')).toHaveText('za 6 dni')
    await upcoming.screenshot({ path: 'test-results/today-upcoming-path-events.png' })

    await letter.locator('.ndt__open').click()
    await expect(page).toHaveURL(
      /\/exercises\/programs\/shame-compassion\?letter=1&enrollment=[\w-]+$/
    )
    await expect(page.getByTestId('path-practices')).toContainText('pomost nad jeziorem')

    // Read today: the marker moves to today's day as done ("przeczytany"), and leaves a week later.
    await page.goto('/today')
    const upcomingAgain = page.locator('.next-day-upcoming')
    await expect(upcomingAgain.locator('.next-day-upcoming__tile').first()).toBeVisible()
    const moreAgain = upcomingAgain.getByRole('button', { name: /^Jeszcze/ })
    if (await moreAgain.isVisible()) await moreAgain.click()
    const read = upcomingAgain.locator('.next-day-upcoming__tile.is-letter.is-done', {
      hasText: 'List od Ciebie',
    })
    await expect(read).toBeVisible()
    await expect(read.locator('.next-day-upcoming__glyph')).toHaveAttribute('title', 'przeczytany')
    await expect(
      upcomingAgain.locator('.next-day-upcoming__tile.is-letter:not(.is-done)')
    ).toHaveCount(0)
  })
})
