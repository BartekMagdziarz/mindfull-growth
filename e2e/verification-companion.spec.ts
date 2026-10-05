import { test, expect, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
import type { WeekRef } from '../src/domain/period'

const week = getPreviousPeriod(getPeriodRefsForDate(new Date()).week) as WeekRef
async function openJournal(page: Page, period = week) {
  await page.goto(`/calendar/week/${period}?action=reflect`)
  await page.waitForFunction(
    () => localStorage.getItem('mindfull_growth_verification_seed_version') !== null,
    { timeout: 90000 }
  )
  await page
    .locator('.qr-progress')
    .getByRole('button', { name: /Dziennik/ })
    .click()
  await expect(page.getByRole('textbox', { name: 'Dziennik tygodnia' })).toBeVisible()
}
async function fakeOpenAI(page: Page) {
  let requests = 0
  let source: { ref: { collection: string; id: string }; version: string } | undefined
  let pause: Promise<void> | undefined
  let unblock: (() => void) | undefined
  let fail = false
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.route('**/__companion/status', route => route.fulfill({ json: { available: true } }))
  await page.route('**/__companion/responses', async route => {
    requests++
    if (pause) await pause
    if (fail) {
      await route.fulfill({ status: 503, json: { error: 'unavailable' } })
      return
    }
    const body = route.request().postDataJSON()
    expect(body.model).toBe('gpt-6-luna')
    expect(body.store).toBe(false)
    expect(route.request().headers().authorization).toBeUndefined()
    if (body.text.format.schema.properties.proposals) {
      requests-- // E4 background analysis is asserted separately.
      await route.fulfill({
        json: {
          status: 'completed',
          model: 'gpt-6-luna',
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: JSON.stringify({ proposals: [] }) }],
            },
          ],
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      })
      return
    }
    const last = body.input.at(-1)
    let output: unknown[]
    const tool = (name: string, args: unknown, callId: string) => [
      { type: 'function_call', call_id: callId, name, arguments: JSON.stringify(args) },
    ]
    const reply = (message: string, topics: unknown[] = []) => [
      {
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'output_text',
            text: JSON.stringify({
              message,
              topics,
              citations: topics.length ? [] : source ? [source] : [],
            }),
          },
        ],
      },
    ]
    if (last.type === 'function_call_output' && last.call_id === 'find') {
      const result = JSON.parse(last.output)
      if (!result.items.length) {
        await route.fulfill({
          json: {
            status: 'completed',
            model: 'gpt-6-luna',
            output: reply('Brak wystarczających danych. Możesz zaproponować własny temat.'),
            usage: { input_tokens: 100, output_tokens: 20 },
          },
        })
        return
      }
      source = { ref: result.items[0].ref, version: result.items[0].version }
      output = tool(
        'read_sources',
        { requests: [{ ref: source.ref, expectedVersion: source.version }] },
        'read'
      )
    } else if (last.type === 'function_call_output') {
      output = reply('Wybierz temat albo napisz własny.', [
        {
          id: 'rest',
          title: 'Chwila dla siebie',
          invitation: 'Co pomogło Ci odpocząć?',
          citations: [source],
        },
        {
          id: 'relations',
          title: 'Bliskie relacje',
          invitation: 'Które spotkanie było dla Ciebie ważne?',
          citations: [source],
        },
        ...['Małe kroki', 'Energia i odpoczynek', 'Plany na kolejny tydzień'].map((title, i) => ({
          id: `extra-${i}`,
          title,
          invitation: 'Co chcesz zachować na kolejny tydzień?',
          citations: [source],
        })),
      ])
    } else {
      const prompt = JSON.parse(last.content)
      output =
        prompt.mode === 'topics'
          ? tool('search_history', { kinds: ['journal'], limit: 1 }, 'find')
          : reply('Możesz docenić chwilę odpoczynku. Co chcesz z niej zachować?')
    }
    try {
      await route.fulfill({
        json: {
          status: 'completed',
          model: 'gpt-6-luna',
          output,
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      })
    } catch {
      /* Request may have been cancelled on navigation. */
    }
  })
  return {
    count: () => requests,
    pause: () => {
      pause = new Promise(resolve => {
        unblock = resolve
      })
    },
    resume: () => {
      pause = undefined
      unblock?.()
    },
    fail: () => {
      fail = true
    },
  }
}

test.describe('weekly reflection companion', () => {
  test.setTimeout(120000)
  test('topics, sources, custom conversation, explicit insertion, reload and independent save', async ({
    page,
  }) => {
    const api = await fakeOpenAI(page)
    await openJournal(page)
    const journal = page.getByRole('textbox', { name: 'Dziennik tygodnia' })
    await journal.fill('Mój własny tekst. ')
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await expect(page.locator('summary').filter({ hasText: 'Chwila dla siebie' })).toBeVisible()
    await expect(page.getByText('Co pomogło Ci odpocząć?', { exact: true })).toBeHidden()
    expect(api.count()).toBe(3)
    await expect(page.locator('.companion-topic')).toHaveCount(5)
    expect(
      await page.locator('.companion-scroll').evaluate(el => el.scrollHeight <= el.clientHeight + 1)
    ).toBe(true)
    await journal.fill('Mój własny tekst. Nadal piszę.')
    await expect(page.getByText('Tekst wpisu zmienił się', { exact: false })).toBeVisible()
    expect(api.count()).toBe(3)
    await page.locator('summary').filter({ hasText: 'Chwila dla siebie' }).click()
    await page.getByRole('button', { name: 'Źródło 1: Chwila dla siebie' }).click()
    await expect(
      page
        .getByRole('complementary', { name: 'Rozmowa AI o tygodniu' })
        .locator('.companion-source h3')
    ).toBeVisible()
    await expect(
      page.locator('.companion-topics li').first().getByRole('region', { name: 'Podgląd źródła' })
    ).toBeVisible()
    await page.screenshot({ path: 'test-results/inline-source.png', fullPage: true })
    await page.getByRole('button', { name: 'Zamknij źródło' }).click()
    await page
      .locator('.companion-topic')
      .filter({ hasText: 'Chwila dla siebie' })
      .getByRole('button', { name: 'Porozmawiaj o tym' })
      .click()
    await expect(page.getByRole('log')).toContainText('Co pomogło Ci odpocząć?')
    expect(api.count()).toBe(3)
    await expect(page.getByRole('list', { name: 'Propozycje tematów' })).toBeHidden()
    await page.getByRole('button', { name: 'Propozycje tematów', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Bliskie relacje' }).click()
    await page
      .locator('.companion-topic')
      .filter({ hasText: 'Bliskie relacje' })
      .getByRole('button', { name: 'Porozmawiaj o tym' })
      .click()
    await expect(page.getByRole('log').locator('article.companion-message').last()).toContainText(
      'Które spotkanie było dla Ciebie ważne?'
    )
    await expect(page.getByRole('log').locator('article.companion-message').last()).toBeInViewport()
    await expect(
      page.getByRole('button', { name: 'Propozycje tematów', exact: true })
    ).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('textbox', { name: 'Twój temat lub wiadomość' })).toBeFocused()
    expect(api.count()).toBe(3)
    await page
      .getByRole('textbox', { name: 'Twój temat lub wiadomość' })
      .fill('Porozmawiajmy o relacjach.')
    await page.getByRole('button', { name: 'Wyślij', exact: true }).click()
    await expect(page.getByRole('log')).toContainText('Porozmawiajmy o relacjach.')
    await expect(journal).toHaveValue('Mój własny tekst. Nadal piszę.')
    await page.getByRole('button', { name: 'Dodaj do wpisu', exact: true }).last().click()
    await page
      .getByRole('textbox', { name: 'Wybierz lub popraw fragment przed dodaniem' })
      .fill('Chcę zachować tę chwilę.')
    await page.getByRole('button', { name: 'Dodaj wybrany tekst' }).click()
    await expect(journal).toHaveValue(
      /Mój własny tekst\. Nadal piszę\.[\s\S]*Chcę zachować tę chwilę\./
    )
    await page.getByRole('textbox', { name: 'Twój temat lub wiadomość' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/companion-conversation.png', fullPage: true })
    await page.getByRole('button', { name: 'Zapisz refleksję', exact: true }).click()
    await expect(page.locator('.qr-save')).toHaveText('Zapisano')
    const calls = api.count()
    await openJournal(page)
    await expect(page.getByRole('log')).toContainText('Porozmawiajmy o relacjach.')
    await expect(journal).toHaveValue(/Chcę zachować tę chwilę/)
    expect(api.count()).toBe(calls)
    await page.getByRole('button', { name: 'Opcje rozmowy', exact: true }).click()
    await page.getByRole('button', { name: 'Rozpocznij od aktualnych danych', exact: true }).click()
    await page.getByRole('button', { name: 'Rozpocznij ponownie', exact: true }).click()
    await expect(page.getByRole('log')).not.toContainText('Porozmawiajmy o relacjach.')
    await expect(page.locator('.companion-archive summary')).toBeVisible()
    await expect(page.locator('.companion-archive article').first()).toBeHidden()
    await expect(page.locator('.companion-topic summary').first()).toBeVisible()
    await page.getByRole('button', { name: 'Opcje rozmowy', exact: true }).click()
    await page.locator('.companion-scroll').evaluate(el => {
      el.scrollTop = 0
    })
    await page.screenshot({ path: 'test-results/companion-desktop.png', fullPage: true })
    expect(
      await page
        .locator('.companion-panel')
        .evaluate(e => e.getBoundingClientRect().right <= innerWidth)
    ).toBe(true)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('textbox', { name: 'Twój temat lub wiadomość' })).toBeVisible()
    expect(
      await page
        .locator('.companion-panel')
        .evaluate(e => e.getBoundingClientRect().right <= innerWidth)
    ).toBe(true)
    await page.screenshot({ path: 'test-results/companion-mobile.png', fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    await page.screenshot({ path: 'test-results/companion-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Opcje rozmowy', exact: true }).click()
    await page.getByRole('button', { name: 'Wyczyść rozmowę', exact: true }).click()
    const confirmation = page.getByRole('alertdialog', { name: 'Wyczyścić rozmowę?' })
    await confirmation.getByRole('button', { name: 'Anuluj', exact: true }).click()
    await expect(page.locator('.companion-archive summary')).toBeVisible()
    await page.getByRole('button', { name: 'Wyczyść rozmowę', exact: true }).click()
    const callsBeforeClear = api.count()
    await confirmation.getByRole('button', { name: 'Usuń wiadomości', exact: true }).click()
    await expect(page.locator('.companion-archive')).toHaveCount(0)
    await expect(page.getByRole('log').locator('article')).toHaveCount(0)
    await expect(journal).toHaveValue(/Chcę zachować tę chwilę/)
    await openJournal(page)
    await expect(page.locator('.companion-archive')).toHaveCount(0)
    await expect(page.getByRole('log').locator('article')).toHaveCount(0)
    expect(api.count()).toBe(callsBeforeClear)
  })
  test('Enter shows the message immediately; cancellation and failure restore the draft', async ({ page }) => {
    const api = await fakeOpenAI(page)
    await openJournal(page)
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await expect(page.locator('.companion-topic')).toHaveCount(5)
    const input = page.getByRole('textbox', { name: 'Twój temat lub wiadomość' })
    const log = page.getByRole('log', { name: 'Wiadomości rozmowy' })
    await input.fill('Pierwsza linia')
    await input.press('Shift+Enter')
    await input.press('End')
    await expect(input).toHaveValue('Pierwsza linia\n')
    const before = api.count()
    await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true })
    expect(api.count()).toBe(before)
    api.pause()
    await input.fill('Wiadomość widoczna od razu')
    await input.press('Enter')
    await expect(input).toHaveValue('')
    await expect(log.locator('article')).toHaveCount(1)
    await expect(log).toContainText('Wiadomość widoczna od razu')
    await expect(log.locator('.ai-activity__dot')).toBeVisible()
    await page.screenshot({ path: 'test-results/ai-message-pending.png', fullPage: true })
    await page.getByRole('button', { name: 'Przerwij', exact: true }).click()
    await expect(input).toHaveValue('Wiadomość widoczna od razu')
    await expect(log.locator('article')).toHaveCount(0)
    api.resume()
    await input.press('Enter')
    await expect(log.locator('article')).toHaveCount(2)
    await expect(input).toHaveValue('')
    api.pause()
    await input.fill('Odpowiedź z błędem')
    await input.press('Enter')
    await expect(log.locator('article')).toHaveCount(3)
    api.fail()
    api.resume()
    await expect(input).toHaveValue('Odpowiedź z błędem')
    await expect(log.locator('article')).toHaveCount(2)
    await expect(log.locator('.ai-activity')).toHaveCount(0)
  })
  test('save does not wait for AI and late response cannot modify another week', async ({
    page,
  }) => {
    const api = await fakeOpenAI(page)
    await openJournal(page)
    api.pause()
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await expect(page.getByRole('button', { name: 'Przerwij', exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Dziennik tygodnia' }).fill('Zapis bez czekania na AI.')
    await page.getByRole('button', { name: 'Zapisz refleksję', exact: true }).click()
    await expect(page.locator('.qr-save')).toHaveText('Zapisano')
    await openJournal(page, getPreviousPeriod(week) as WeekRef)
    api.resume()
    await expect(page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' })).toBeVisible()
    await expect(page.getByRole('log')).toHaveCount(0)
  })
  test('provider error leaves writing available and does not invent a response', async ({
    page,
  }) => {
    const api = await fakeOpenAI(page)
    api.fail()
    await openJournal(page)
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await expect(page.getByRole('alert')).toContainText('Nie udało się uzyskać odpowiedzi')
    await expect(page.getByRole('textbox', { name: 'Dziennik tygodnia' })).toBeEditable()
    await expect(page.getByRole('log').locator('article')).toHaveCount(0)
  })
  test('missing configuration is actionable without blocking the journal', async ({ page }) => {
    await page.route('**/__companion/status', route =>
      route.fulfill({ json: { available: false } })
    )
    await page.route('https://api.openai.com/**', route => route.abort())
    await openJournal(page)
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await expect(page.getByRole('alert')).toContainText('Podłącz OpenAI')
    await expect(page.getByRole('link', { name: 'Ustawienia AI' })).toHaveAttribute(
      'href',
      '/profile#ai-settings'
    )
    await expect(page.getByRole('textbox', { name: 'Dziennik tygodnia' })).toBeEditable()
  })
  test('excluded sources and no matches leave a custom conversation available', async ({
    page,
  }) => {
    const api = await fakeOpenAI(page)
    await openJournal(page)
    await page.getByRole('button', { name: 'Opcje rozmowy', exact: true }).click()
    await page.getByText('Dostęp do historii', { exact: true }).click()
    await page.getByRole('checkbox', { name: 'Dziennik', exact: true }).uncheck()
    await page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' }).click()
    await expect(page.getByText('Na razie nie ma propozycji.', { exact: false })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Twój temat lub wiadomość' })).toBeEditable()
    expect(api.count()).toBe(2)
  })
})
