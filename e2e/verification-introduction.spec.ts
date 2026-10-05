import { test, expect } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
test('introduction: local draft → resume → optional profile → first weekly reflection', async ({
  page,
}) => {
  test.setTimeout(120000)
  const quote = 'Cenię przyjaźń i lubię chodzić po górach.'
  const contexts: unknown[] = []
  let calls = 0
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.route('**/__companion/status', route => route.fulfill({ json: { available: true } }))
  await page.route('**/__companion/responses', async route => {
    calls++
    const body = route.request().postDataJSON(),
      schema = body.text.format.schema
    let reply: unknown
    if (schema.properties.proposals)
      reply = {
        proposals: [
          {
            operation: 'add',
            targetId: null,
            targetVersion: null,
            category: 'values',
            scope: 'general',
            text: quote,
            quote,
            reason: 'Twoje wartości i zasoby.',
            reviewAfter: null,
            validUntil: null,
          },
        ],
      }
    else if (schema.properties.topics) {
      contexts.push(JSON.parse(body.input.at(-1).content).context.approvedProfile)
      reply = { message: 'Co dobrego wydarzyło się w relacjach?', topics: [], citations: [] }
    } else reply = { message: 'Co daje Ci poczucie bliskości i co w tych relacjach działa dobrze?' }
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
  await page.goto('/profile?introduction=1#psychological')
  await page.getByText('Opcjonalnie: przygotuj się z ćwiczeniem').click()
  await expect(page.getByRole('link', { name: 'Odkrywanie wartości' })).toBeVisible()
  await page.getByRole('button', { name: 'Zacznij rozmowę', exact: true }).click()
  await page.getByRole('button', { name: 'Pomiń pytanie', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('Pominięto')
  await page.getByRole('textbox', { name: 'Twoja odpowiedź' }).fill(quote)
  await expect(page.getByRole('button', { name: 'Zakończ i przygotuj propozycje' })).toBeDisabled()
  await page.getByRole('button', { name: 'Zachowaj i wróć później' }).click()
  await expect(page.getByRole('button', { name: 'Wznów rozmowę' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Wznów rozmowę' }).click()
  await expect(page.getByRole('textbox', { name: 'Twoja odpowiedź' })).toHaveValue(quote)
  expect(calls).toBe(0)
  await page.getByRole('button', { name: 'Wyślij odpowiedź', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('co w tych relacjach działa dobrze')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page
      .locator('.introduction-panel')
      .evaluate(e => e.getBoundingClientRect().right <= innerWidth)
  ).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: 'test-results/introduction-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({
    path: 'test-results/introduction-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Zakończ i przygotuj propozycje' }).click()
  await expect(
    page.getByText('Nic nie zostało przyjęte automatycznie.', { exact: false })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Przejrzyj propozycje', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Do przejrzenia 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Omów', exact: true }).click()
  await page.getByRole('button', { name: 'Zatwierdź do profilu' }).click()
  await expect(page.getByRole('button', { name: 'Do przejrzenia', exact: true })).toBeVisible()
  const week = getPreviousPeriod(getPeriodRefsForDate(new Date()).week)
  await page.goto(`/calendar/week/${week}?action=reflect`)
  await page
    .locator('.qr-progress')
    .getByRole('button', { name: /Dziennik/ })
    .click()
  await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
  await page
    .getByRole('textbox', { name: 'Twój temat lub wiadomość' })
    .fill('Chcę podsumować tydzień.')
  await page.getByRole('button', { name: 'Wyślij', exact: true }).click()
  await expect.poll(() => JSON.stringify(contexts)).toContain(quote)
})
