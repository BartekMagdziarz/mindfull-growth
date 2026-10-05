import { test, expect, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'

const quote = 'Wolę małe kroki niż ambitne plany.'
const week = getPreviousPeriod(getPeriodRefsForDate(new Date()).week)
async function mockAI(page: Page) {
  const contexts: unknown[] = []
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.route('**/__companion/status', route => route.fulfill({ json: { available: true } }))
  await page.route('**/__companion/responses', async route => {
    const body = route.request().postDataJSON(),
      schema = body.text.format.schema
    const input = JSON.parse(body.input.at(-1).content)
    let reply: unknown
    if (schema.properties.proposals) {
      reply = {
        proposals: [
          {
            operation: 'add',
            targetId: null,
            targetVersion: null,
            category: 'preferences',
            scope: 'general',
            text: quote,
            quote,
            reason: 'Twoja preferencja sposobu wsparcia.',
            reviewAfter: null,
            validUntil: null,
          },
        ],
      }
    } else if (schema.properties.topics) {
      contexts.push(input.context.approvedProfile)
      reply = { message: 'Jaki mały krok byłby pomocny?', topics: [], citations: [] }
    } else {
      reply = {
        message:
          'Możemy ująć to jako obecną preferencję, nie stałą cechę. Kiedy pomaga Ci takie podejście?',
      }
    }
    await route.fulfill({
      json: {
        status: 'completed',
        model: 'gpt-6-luna',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify(reply) }],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 80 },
      },
    })
  })
  return contexts
}
async function journal(page: Page) {
  await page.goto(`/calendar/week/${week}?action=reflect`)
  await page
    .locator('.qr-progress')
    .getByRole('button', { name: /Dziennik/ })
    .click()
}
test.describe('approved profile and proposal review', () => {
  test.setTimeout(120000)
  test('conversation → unapproved proposal → discussion → edited approval → context and mobile view', async ({
    page,
  }) => {
    const contexts = await mockAI(page)
    await journal(page)
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await page.getByRole('textbox', { name: 'Twój temat lub wiadomość' }).fill(quote)
    await page.getByRole('button', { name: 'Wyślij', exact: true }).click()
    await page.getByRole('button', { name: 'Opcje rozmowy', exact: true }).click()
    await expect(page.getByText(/Sprawdzono możliwe propozycje/)).toBeVisible()
    await expect(page.locator('.profile-proposal-notice')).toContainText('1 propozycja do profilu')
    expect(contexts.every(c => Array.isArray(c) && c.length === 0)).toBe(true)
    await page.getByRole('link', { name: 'Przejrzyj propozycje do profilu' }).click()
    await expect(page.getByRole('button', { name: 'Do przejrzenia 1' })).toBeVisible()
    await page.getByRole('button', { name: 'Omów', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Co chcesz omówić?' })
      .fill('Czy to nie definiuje mnie zbyt mocno?')
    await page.getByRole('button', { name: 'Porozmawiaj z AI', exact: true }).click()
    await expect(page.getByRole('log')).toContainText('obecną preferencję, nie stałą cechę')
    await expect(page.getByRole('button', { name: 'Do przejrzenia 1' })).toBeVisible()
    await page.getByRole('button', { name: 'Popraw', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Treść informacji' })
      .fill('Obecnie wolę małe, wykonalne kroki.')
    await page.getByRole('button', { name: 'Zatwierdź do profilu' }).click()
    await expect(page.getByRole('button', { name: 'Do przejrzenia', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Informacje', exact: true }).click()
    await expect(
      page.getByRole('article', { name: 'Obecnie wolę małe, wykonalne kroki.' })
    ).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Informacje', exact: true }).click()
    await expect(
      page.getByRole('article', { name: 'Obecnie wolę małe, wykonalne kroki.' })
    ).toBeVisible()
    await page.screenshot({
      path: 'test-results/profile-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page
        .locator('.approved-profile')
        .evaluate(e => e.getBoundingClientRect().right <= innerWidth)
    ).toBe(true)
    await page.screenshot({
      path: 'test-results/profile-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 1280, height: 720 })
    await journal(page)
    await page.getByRole('button', { name: 'Opcje rozmowy', exact: true }).click()
    await page.getByRole('button', { name: 'Rozpocznij od aktualnych danych', exact: true }).click()
    await page.getByRole('button', { name: 'Rozpocznij ponownie', exact: true }).click()
    await expect
      .poll(() => JSON.stringify(contexts.at(-1)))
      .toContain('Obecnie wolę małe, wykonalne kroki.')
    expect(JSON.stringify(contexts.at(-1))).not.toContain('Czy to nie definiuje')
  })
  test('manual changes, ending and rejection stay independent of the model', async ({ page }) => {
    let requests = 0
    await page.route('**/__companion/responses', route => {
      requests++
      return route.abort()
    })
    await page.goto('/profile#psychological')
    await page.getByRole('button', { name: 'Dodaj informację', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Treść informacji' })
      .fill('Czas z rodziną jest dla mnie ważny.')
    await page.getByLabel('Kategoria', { exact: true }).selectOption('values')
    await page.getByRole('button', { name: 'Zapisz informację', exact: true }).click()
    const card = page.getByRole('article', { name: 'Czas z rodziną jest dla mnie ważny.' })
    await expect(card).toBeVisible()
    await card
      .locator('summary')
      .filter({ hasText: /^Szczegóły$/ })
      .click()
    await card.getByRole('button', { name: 'Pochodzenie', exact: true }).click()
    await expect(card.getByRole('region', { name: 'Pochodzenie informacji' })).toContainText(
      'Informacja wpisana bezpośrednio do profilu'
    )
    await card.getByRole('button', { name: 'Zamknij pochodzenie' }).click()
    await card.getByRole('button', { name: 'Edytuj', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Treść informacji' })
      .fill('Chcę pielęgnować bliskie relacje.')
    await page.getByRole('button', { name: 'Zapisz informację', exact: true }).click()
    await page
      .getByRole('article', { name: 'Chcę pielęgnować bliskie relacje.' })
      .getByRole('button', { name: 'Zakończ', exact: true })
      .click()
    await expect(page.getByText('Zakończone — nie jest przekazywane do AI.')).toBeVisible()
    await page.getByRole('button', { name: 'Opcje profilu', exact: true }).click()
    await page.getByRole('button', { name: 'Historia zmian', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Wersja 3/ })).toBeVisible()
    expect(requests).toBe(0)
  })
})
