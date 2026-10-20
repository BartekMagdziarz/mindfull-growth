import { expect, test, type Page } from '@playwright/test'
import { getPeriodRefsForDate } from '../src/utils/periods'

/**
 * Anger path v2 on the seeded verification instance (plan:
 * ideas/html-plans/2026-10-18-anger-anxiety-paths-v2.html): the path view
 * (weeks as rows, the barometer halfway as the current tile, Praktyki,
 * Postęp with the reaction families and the measure track, Moje słowa,
 * knowledge), the anger Momenty run with the quick five and "Zapisz teraz",
 * the reflection block with the compact chart and a backfilled Moment, and
 * the Today paths card.
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

test.describe('anger path v2', () => {
  test('path view: seven week rows, the barometer halfway as the current tile, Praktyki, Reakcje, Moje słowa and knowledge', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/exercises/programs/anger-signal')
    await expect(page.getByRole('heading', { name: 'Złość jako sygnał', level: 1 })).toBeVisible()
    await expect(page.locator('.mg-v2-page-head__eyebrow')).toContainText('Tydzień 3 z 6')
    await expect(page.locator('.path-view__sign')).toContainText('Nie krzyknę na dzieci')

    const journey = page.getByTestId('path-journey')
    await expect(journey.locator('.wk__title')).toHaveText([
      'Rozpoznanie',
      'Pauza',
      'Inne spojrzenie',
      'To, co ważne',
      'Własny wybór',
      'Co zostaje',
      'Powrót',
    ])
    const week3 = journey.locator('[data-test-path-week="w3"]')
    await expect(week3.locator('.wk__row')).toHaveAttribute('aria-expanded', 'true')
    await expect(week3.locator('.pp-tile')).toHaveCount(3)
    const currentTile = week3.locator('[data-test-program-step="6"]')
    await expect(currentTile).toContainText('Barometr w połowie drogi')
    await expect(currentTile).toHaveClass(/pp-tile--current/)
    await expect(currentTile).toContainText('Po co:')
    await expect(currentTile.getByRole('button', { name: 'Rozpocznij' })).toBeVisible()

    // Praktyki: the breath, Momenty and the week's accepted task; "Mój plan" quotes the pause plan.
    const practices = page.getByTestId('path-practices')
    await expect(practices.getByTestId('path-practice-tile')).toHaveCount(1)
    await expect(
      practices.getByTestId('path-moment-tile').getByRole('button', { name: 'Zapisz' })
    ).toBeVisible()
    await expect(page.getByTestId('path-world')).toContainText('Przypomnij sobie inną myśl')
    await practices.getByRole('button', { name: 'Mój plan' }).click()
    await expect(page.getByTestId('path-response')).toContainText('potrzebuję minuty')

    // Postęp: the anger reaction families (two pairs + Pauza as "Ja"), one measure track.
    const glance = page.getByTestId('path-moments-glance')
    await expect(glance.locator('.pc__legend-name')).toHaveText([
      'Wybuch',
      'Ostrzej',
      'Na siebie',
      'Milczenie',
      'Ja',
    ])
    await expect(glance.locator('.pc__week:not(.is-slot)')).toHaveCount(3)
    await glance.locator('summary').click()
    await glance.getByRole('button', { name: 'Liczby' }).click()
    await expect(glance.getByRole('table')).toContainText('Razem')
    await expect(page.getByTestId('path-measure').locator('.sk')).toHaveCount(1)
    await expect(page.getByTestId('path-measure')).toContainText('Natężenie złości')

    // Moje słowa: the pause plan's return promise; Warto wiedzieć: the pinned safety card and the week's card first.
    const words = page.getByRole('region', { name: 'Moje słowa' })
    await expect(words.locator('.quotes li')).toHaveCount(1)
    await expect(words).toContainText('Wracam za pięć minut')
    const knowledge = page.getByRole('region', { name: 'Warto wiedzieć' })
    await expect(knowledge.locator('.kn button')).toHaveCount(2)
    await expect(knowledge).toContainText('Przeżuwanie')
  })

  test('Momenty (anger variant): the quick five with the pause plan as a hint, "Zapisz teraz" after the strength', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/exercises/micro/moment-anger')
    await expect(page.getByRole('heading', { name: 'Moment złości' }).first()).toBeVisible()
    const step = async (
      heading: string | RegExp,
      label: 'Dalej' | 'Zapisz' | 'Zapisz teraz' = 'Dalej'
    ) => {
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible()
      await page.getByRole('button', { name: label, exact: true }).click()
    }
    await page.getByRole('radio', { name: 'Tak' }).click()
    await step('Czy od ostatniego wpisu był taki moment?')
    await expect(page.getByRole('heading', { name: 'Co przejęło ster?' })).toBeVisible()
    await page.getByRole('radio', { name: /Ostrzej/ }).click()
    await step('Co przejęło ster?')
    await page.getByRole('radio', { name: 'Po chwili' }).click()
    await step(/Kiedy to zauważył/)
    await expect(page.getByTestId('micro-hint')).toContainText('potrzebuję minuty')
    await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    await step(/Co zrobił/)
    await expect(page.getByRole('button', { name: 'Dalej', exact: true })).toBeDisabled()
    await page
      .getByRole('radiogroup', { name: 'Jak silna była złość?' })
      .getByRole('radio', { name: '3' })
      .click()
    await step('Jak silna była złość?', 'Zapisz teraz')
    await expect(page.locator('textarea')).toHaveCount(0)
  })

  test('the weekly reflection: the anger block has the compact chart, the task counted from a Moment and a backfilled Moment', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const seededDays = getPeriodRefsForDate(yesterday).week === refs.week ? 1 : 0
    await page.goto(`/calendar/week/${refs.week}?action=reflect`)
    for (let i = 0; i < 8 && !(await page.locator('.qr-path-step').isVisible()); i += 1) {
      await page.locator('.qr-arrow--next').click()
    }
    const block = page.locator('.qr-path-block', { hasText: 'Złość jako sygnał' })
    await expect(block).toBeVisible()
    await expect(block).toContainText('Przypomnij sobie inną myśl')
    await expect(block.locator('.qr-path-task__disc')).toHaveText(`${seededDays}/2`)
    await expect(block.locator('.pc__legend-name')).toHaveText([
      'Wybuch',
      'Ostrzej',
      'Na siebie',
      'Milczenie',
      'Ja',
    ])
    await expect(block).toContainText('Tydzień 3 · Inne spojrzenie')
    await block.getByTestId('path-backfill-open').click()
    const form = block.getByTestId('path-backfill-form')
    await expect(form).toContainText('Co przejęło ster')
    await form.getByRole('radio').first().click()
    await form.getByRole('radio', { name: 'Wybuch' }).click()
    await form.getByRole('button', { name: 'Naprawa' }).click()
    await form.getByRole('button', { name: 'Dopisz', exact: true }).click()
    await expect(block.locator('.qr-path-added li')).toHaveCount(1)
    await expect(block.locator('.qr-path-added li')).toContainText('Wybuch')
    await expect(block.locator('.pc__seg.is-later')).toHaveCount(1)
    await block.locator('.qr-path-added__remove').click()
    await expect(block.locator('.qr-path-added li')).toHaveCount(0)
  })

  test('Today: the anger path tile shows week dots, the phase, the barometer as the next step, Zapisz moment and the task', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await page.goto('/today')
    const card = page.getByRole('region', { name: 'Ścieżki' })
    const tile = card.locator('[data-testid="today-path-tile"]', { hasText: 'Złość jako sygnał' })
    await expect(tile).toBeVisible()
    const phase = tile.getByTestId('today-path-phase')
    await expect(phase).toContainText('Inne spojrzenie')
    await expect(phase.locator('.ndpath-dots > i')).toHaveCount(6)
    await expect(phase.locator('.ndpath-dots > i.is-done')).toHaveCount(2)
    await expect(tile.getByTestId('today-path-step')).toContainText('Barometr w połowie drogi')
    await expect(tile.getByTestId('today-path-moment')).toHaveAttribute(
      'href',
      '/exercises/micro/moment-anger'
    )
    await expect(tile.getByTestId('today-path-task')).toContainText('Przypomnij sobie inną myśl')
    await expect(
      page.getByTestId('today-practices').locator('.ndp', { hasText: 'Barometr' })
    ).toBeVisible()
  })
})
