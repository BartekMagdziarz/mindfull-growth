import { test, expect } from '@playwright/test'
test('observation → evidence and exception → discussion → edited hypothesis → next conversation', async ({
  page,
}) => {
  test.setTimeout(90000)
  const nextContexts: unknown[] = []
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.route('**/__companion/status', route => route.fulfill({ json: { available: true } }))
  await page.route('**/__companion/responses', async route => {
    const body = route.request().postDataJSON(),
      schema = body.text.format.schema,
      payload = JSON.parse(body.input.at(-1).content)
    let result: unknown
    if (schema.properties.topicQuery) result = { topicQuery: 'ruch', counterQuery: 'odpoczynek' }
    else if (schema.properties.observations) {
      const find = (id: string) =>
        payload.evidence.find(
          (e: { citation: { ref: { id: string } } }) => e.citation.ref.id === id
        ).id
      result = {
        observations: [
          {
            text: 'Krótki ruch może czasem pomagać odpocząć.',
            reason: 'Dwa zapisy z różnych dni.',
            limitations: 'To niewielka próbka, nie dowód przyczyny.',
            support: [find('e8-one'), find('e8-two')],
            counterexamples: [find('e8-counter')],
          },
        ],
      }
    } else if (schema.properties.topics) {
      nextContexts.push(payload.context)
      result = {
        message: 'Możemy zachować tę obserwację jako hipotezę.',
        topics: [],
        citations: [],
      }
    } else if (schema.properties.proposals) result = { proposals: [] }
    else
      result = {
        message:
          'Możemy doprecyzować, że to tylko niektóre dni, a odpoczynek nie musi oznaczać ruchu.',
      }
    await route.fulfill({
      json: {
        status: 'completed',
        model: 'gpt-6-luna',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify(result) }],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 100 },
      },
    })
  })
  await page.goto('/profile?review=1#psychological')
  await expect(page.getByRole('heading', { name: 'Twój profil dla AI' })).toBeVisible()
  const verifyOrigin = new URL(test.info().project.use.baseURL!).origin
  await page.evaluate(async (origin: string) => {
    if (location.origin !== origin) throw new Error('Wrong test origin')
    const { UserDatabase } = await import(/* @vite-ignore */ '/src/services/userDatabaseService.ts')
    const names = (await indexedDB.databases())
      .map(d => d.name!)
      .filter(n => n.startsWith('MindfullGrowthDB_simplify_'))
    if (names.length !== 1) throw new Error('Ambiguous database')
    const db = new UserDatabase(names[0])
    await db.open()
    for (const [id, date, body] of [
      ['e8-one', '2026-09-10', 'Krótki ruch po pracy dał mi ulgę i przyjemność.'],

      ['e8-counter', '2026-09-20', 'Tym razem odpoczynek na kanapie był ważniejszy niż spacer.'],
    ])
      await db.journalEntries.put({
        id,
        body,
        createdAt: `${date}T12:00:00Z`,
        updatedAt: `${date}T12:00:00Z`,
      })
    await db.compassionateLetters.put({
      id: 'e8-two',
      letter: 'Dzisiaj ruch na świeżym powietrzu był pomocny i spokojny.',
      createdAt: '2026-09-15T12:00:00Z',
      updatedAt: '2026-09-15T12:00:00Z',
    } as any)
    db.close()
  }, verifyOrigin)
  const search = page.getByText('Poszukaj obserwacji w historii', { exact: true })
  await expect(search).toBeVisible()
  await search.click()
  await page.getByRole('textbox', { name: 'Temat obserwacji' }).fill('Co pomaga mi odpoczywać?')
  await page.getByLabel('Od', { exact: true }).fill('2026-09-01')
  await page.getByLabel('Do', { exact: true }).fill('2026-09-27')
  await page.getByRole('button', { name: 'Sprawdź możliwe obserwacje' }).click()
  // The analysis is a local history search between two model calls, after which the panel reloads
  // its proposals: wait for the form's completion notice instead of racing the default 5 s.
  await expect(
    page.getByRole('status').filter({ hasText: /Nowe hipotezy do przejrzenia: \d+/ })
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Obserwacja AI do sprawdzenia — nie fakt o Tobie')).toBeVisible({
    timeout: 15_000,
  })
  const proposal = page
    .locator('article.profile-card')
    .filter({ hasText: 'Krótki ruch może czasem pomagać odpocząć.' })
  const sources = proposal.getByText('Źródła, wyjątki i ograniczenia hipotezy')
  await expect(sources).toBeVisible()
  await sources.click()
  await expect(
    proposal.getByText('Tym razem odpoczynek na kanapie był ważniejszy niż spacer.', {
      exact: true,
    })
  ).toBeVisible()
  const discuss = proposal.getByRole('button', { name: 'Omów', exact: true })
  await expect(discuss).toBeVisible()
  await discuss.click()
  const question = page.getByRole('textbox', { name: 'Co chcesz omówić?' })
  await expect(question).toBeVisible()
  await question.fill('Chcę uniknąć nowego obowiązku.')
  const talk = page.getByRole('button', { name: 'Porozmawiaj z AI', exact: true })
  await expect(talk).toBeVisible()
  await talk.click()
  await expect(page.getByRole('log', { name: 'Rozmowa o propozycji' })).toContainText(
    'tylko niektóre dni'
  )
  const revised = 'Ruch pomaga mi w niektóre dni; nie chcę traktować go jako obowiązku.'
  const edit = proposal.getByRole('button', { name: 'Popraw', exact: true })
  await expect(edit).toBeVisible()
  await edit.click()
  const body = proposal.getByRole('textbox', { name: 'Treść informacji', exact: true })
  await expect(body).toBeVisible()
  await body.fill(revised)
  const accept = page.getByRole('button', { name: 'Zatwierdź do profilu' })
  await expect(accept).toBeVisible()
  await accept.click()
  await expect(page.getByRole('button', { name: 'Do przejrzenia', exact: true })).toBeVisible()
  const infoTab = page.getByRole('button', { name: 'Informacje', exact: true })
  await expect(infoTab).toBeVisible()
  await infoTab.click()
  await expect(page.getByText('Przyjęta hipoteza — do dalszej refleksji')).toBeVisible()
  await page.screenshot({ path: 'test-results/observations-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/observations-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/calendar/week/2026-W39?action=reflect')
  const journalStep = page.locator('.qr-progress').getByRole('button', { name: /Dziennik/ })
  await expect(journalStep).toBeVisible()
  await journalStep.click()
  const enableAi = page.getByRole('button', { name: 'Włącz AI dla tego tygodnia' })
  await expect(enableAi).toBeVisible()
  await enableAi.click()
  await expect.poll(() => JSON.stringify(nextContexts)).toContain('user-accepted-hypothesis')
  expect(JSON.stringify(nextContexts)).toContain(revised)
})
