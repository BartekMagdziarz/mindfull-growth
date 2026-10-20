import { test, expect, type Page } from '@playwright/test'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'
async function data(
  page: Page,
  table: 'journalEntries' | 'companionConversations' | 'journalDrafts' | 'monthlyReflections'
) {
  return page.evaluate(async name => {
    const modulePath = '/src/services/userDatabaseService.ts'
    const { UserDatabase } = await import(/* @vite-ignore */ modulePath)
    const databases = (await indexedDB.databases()).filter(db =>
      db.name?.startsWith('MindfullGrowthDB_simplify_')
    )
    if (databases.length !== 1 || location.port !== '5199')
      throw new Error('Expected one isolated verification database')
    const db = new UserDatabase(databases[0].name)
    try {
      await db.open()
      return await db.table(name).toArray()
    } finally {
      db.close()
    }
  }, table)
}
async function fakeAI(page: Page) {
  const inputs: Array<{ context: { surface: string; periodRef: string }; draft: string }> = []
  let hold: Promise<void> | undefined, release: (() => void) | undefined
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.route('**/__companion/status', route => route.fulfill({ json: { available: true } }))
  await page.route('**/__companion/responses', async route => {
    const body = route.request().postDataJSON()
    let reply: unknown
    if (body.text.format.schema.properties.proposals) reply = { proposals: [] }
    else {
      const input = JSON.parse(body.input.at(-1).content)
      inputs.push(input)
      if (hold) await hold
      reply = {
        message: 'Co dało Ci w ostatnim czasie satysfakcję?',
        topics:
          input.mode === 'topics'
            ? [
                {
                  id: 'positive',
                  title: 'Co ostatnio działa dobrze?',
                  invitation: 'Możemy zacząć od dobrego doświadczenia.',
                  citations: [],
                },
              ]
            : [],
        citations: [],
      }
    }
    await route
      .fulfill({
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
          usage: { input_tokens: 100, output_tokens: 70 },
        },
      })
      .catch(() => {})
  })
  return {
    inputs,
    pause: () => {
      hold = new Promise(r => {
        release = r
      })
    },
    resume: () => {
      release?.()
      hold = undefined
    },
  }
}
async function openEditor(page: Page) {
  await page.goto('/journal/edit')
  await page.waitForFunction(
    () => localStorage.getItem('mindfull_growth_verification_seed_version') !== null
  )
  await expect(page.getByRole('textbox', { name: 'Wpis w dzienniku', exact: true })).toBeVisible()
}
test.describe('journal and monthly companion', () => {
  test.setTimeout(120000)
  test('journal: draft chat, reload, save binding, legacy history, explicit insertion and mobile layout', async ({
    page,
  }) => {
    const ai = await fakeAI(page)
    await openEditor(page)
    const ownText = 'Mój własny tekst: lubię spokojne wieczory.'
    await page.getByRole('textbox', { name: 'Tytuł', exact: true }).fill('E6 szkic')
    await page.getByRole('textbox', { name: 'Wpis w dzienniku', exact: true }).fill(ownText)
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await page.getByRole('button', { name: 'Włącz AI dla tego wpisu' }).click()
    await expect(
      page.locator('.companion-topic summary').filter({ hasText: 'Co ostatnio działa dobrze' })
    ).toBeVisible()
    await page
      .getByRole('textbox', { name: 'Twój temat lub wiadomość' })
      .fill('Chcę przegadać odpoczynek.')
    await page.getByRole('button', { name: 'Wyślij', exact: true }).click()
    await expect(page.locator('.companion-message--assistant')).toContainText('satysfakcję')
    expect(ai.inputs.every(i => i.context.surface === 'journal')).toBe(true)
    expect(ai.inputs.at(-1)?.draft).toContain(ownText)
    await expect(page.getByRole('textbox', { name: 'Wpis w dzienniku', exact: true })).toHaveValue(
      ownText
    )
    await expect
      .poll(async () =>
        (await data(page, 'journalDrafts')).some(
          (d: { content: { body: string } }) => d.content.body === ownText
        )
      )
      .toBe(true)
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Wpis w dzienniku', exact: true })).toHaveValue(
      ownText
    )
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await expect(page.locator('.companion-message--assistant')).toContainText('satysfakcję')
    await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect
      .poll(
        async () =>
          (await data(page, 'journalEntries')).find(
            (e: { title: string }) => e.title === 'E6 szkic'
          )?.body
      )
      .toBe(ownText)
    const entry = (await data(page, 'journalEntries')).find(
      (e: { title: string }) => e.title === 'E6 szkic'
    )
    expect(entry.companionConversationId).toMatch(/^journal:/)
    await expect
      .poll(async () =>
        (await data(page, 'journalDrafts')).some(
          (d: { id: string }) => entry.companionConversationId === `journal:${d.id}`
        )
      )
      .toBe(false)
    await page.evaluate(async id => {
      const modulePath = '/src/services/userDatabaseService.ts'
      const { UserDatabase } = await import(/* @vite-ignore */ modulePath)
      const databases = (await indexedDB.databases()).filter(db =>
        db.name?.startsWith('MindfullGrowthDB_simplify_')
      )
      if (databases.length !== 1 || location.port !== '5199')
        throw new Error('Expected isolated verification database')
      const db = new UserDatabase(databases[0].name)
      await db.open()
      await db.journalEntries.update(id, {
        chatSessions: [
          {
            id: 'legacy-e6',
            intention: 'reflect',
            createdAt: '2026-09-01T12:00:00Z',
            messages: [
              {
                id: 'legacy-message',
                role: 'user',
                content: 'Moja dawna rozmowa',
                timestamp: '2026-09-01T12:00:00Z',
              },
            ],
          },
        ],
      })
      db.close()
    }, entry.id)
    await page.goto(`/journal/${entry.id}/edit`)
    await expect(page.getByRole('button', { name: 'View chat session' })).toBeVisible()
    expect(
      (await data(page, 'journalEntries')).find((e: { id: string }) => e.id === entry.id)
        .chatSessions[0].messages[0].content
    ).toBe('Moja dawna rozmowa')
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await expect(page.locator('.companion-message--assistant')).toContainText('satysfakcję')
    await page.getByRole('button', { name: 'Dodaj do wpisu' }).first().click()
    await page
      .getByRole('textbox', { name: 'Wybierz lub popraw fragment przed dodaniem' })
      .fill('Wybrany przeze mnie wniosek.')
    await page.getByRole('button', { name: 'Dodaj wybrany tekst' }).click()
    await expect(page.getByRole('textbox', { name: 'Wpis w dzienniku', exact: true })).toHaveValue(
      `${ownText}\n\nWybrany przeze mnie wniosek.\n`
    )
    await page.screenshot({
      path: 'test-results/companion-journal-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page
        .locator('.companion-panel')
        .evaluate(e => e.getBoundingClientRect().right <= innerWidth)
    ).toBe(true)
    await page.screenshot({
      path: 'test-results/companion-journal-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.getByRole('button', { name: 'Emocje', exact: true }).click()
    await expect(page.locator('.journal-aside')).toContainText('Emocje')
  })
  test('monthly: independent context, writing, persistence and prior summaries', async ({
    page,
  }) => {
    const ai = await fakeAI(page),
      month = getPreviousPeriod(getPeriodRefsForDate(new Date()).month)
    await page.goto(`/calendar/month/${month}?action=reflect`)
    await page
      .locator('.qr-progress')
      .getByRole('button', { name: /Dziennik/ })
      .click()
    const writing = page.getByRole('textbox', { name: 'Refleksja miesiąca' })
    await writing.fill('Własna refleksja o całym miesiącu.')
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await page.getByRole('button', { name: 'Włącz AI dla tego miesiąca' }).click()
    await expect(
      page.locator('.companion-topic summary').filter({ hasText: 'Co ostatnio działa dobrze' })
    ).toBeVisible()
    await page
      .getByRole('textbox', { name: 'Twój temat lub wiadomość' })
      .fill('Co chcę zapamiętać?')
    await page.getByRole('button', { name: 'Wyślij', exact: true }).click()
    await expect(page.locator('.companion-message--assistant')).toContainText('satysfakcję')
    expect(
      ai.inputs.every(
        i => i.context.surface === 'monthly-reflection' && i.context.periodRef === month
      )
    ).toBe(true)
    await expect(writing).toHaveValue('Własna refleksja o całym miesiącu.')
    await page.getByRole('button', { name: 'Zapisz refleksję', exact: true }).click()
    await expect
      .poll(
        async () =>
          (await data(page, 'monthlyReflections')).find(
            (r: { monthRef: string }) => r.monthRef === month
          )?.freeformReflection
      )
      .toBe('Własna refleksja o całym miesiącu.')
    await page.reload()
    await page
      .locator('.qr-progress')
      .getByRole('button', { name: /Dziennik/ })
      .click()
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await expect(page.locator('.companion-message--assistant')).toContainText('satysfakcję')
    await expect(writing).toHaveValue('Własna refleksja o całym miesiącu.')
    await page.screenshot({
      path: 'test-results/companion-month-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page
        .locator('.companion-panel')
        .evaluate(e => e.getBoundingClientRect().right <= innerWidth)
    ).toBe(true)
    await page.screenshot({
      path: 'test-results/companion-month-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
  })
  test('journal save does not wait for a model response and late results cannot edit the next draft', async ({
    page,
  }) => {
    const ai = await fakeAI(page)
    await openEditor(page)
    await page
      .getByRole('textbox', { name: 'Wpis w dzienniku', exact: true })
      .fill('Wpis zapisany bez czekania na AI.')
    await page.getByRole('button', { name: 'AI', exact: true }).click()
    await page.getByRole('button', { name: 'Włącz AI dla tego wpisu' }).click()
    await expect(
      page.locator('.companion-topic summary').filter({ hasText: 'Co ostatnio działa dobrze' })
    ).toBeVisible()
    ai.pause()
    await page
      .getByRole('textbox', { name: 'Twój temat lub wiadomość' })
      .fill('Zatrzymana odpowiedź')
    await page.getByRole('button', { name: 'Wyślij', exact: true }).click()
    await expect.poll(() => ai.inputs.length).toBe(2)
    await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Wpis w dzienniku', exact: true })).toHaveValue(
      ''
    )
    ai.resume()
    await expect
      .poll(async () =>
        (await data(page, 'journalEntries')).some(
          (e: { body: string }) => e.body === 'Wpis zapisany bez czekania na AI.'
        )
      )
      .toBe(true)
    expect(
      (await data(page, 'companionConversations')).every(
        (r: { messages: unknown[] }) => r.messages.length === 0
      )
    ).toBe(true)
  })
})
