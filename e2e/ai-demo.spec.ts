import { test, expect } from '@playwright/test'
async function inspect(page: import('@playwright/test').Page, persona: string, mutate = false) {
  return page.evaluate(
    async ({ persona, mutate }) => {
      if (location.origin !== 'http://127.0.0.1:5203') throw new Error('Wrong origin')
      const { UserDatabase } = await import(
        /* @vite-ignore */ '/src/services/userDatabaseService.ts'
      )
      const db = new UserDatabase(`MindfullGrowthDB_simplify_ai-companion-demo-${persona}`)
      await db.open()
      if (mutate) {
        await db.journalEntries.put({
          id: 'demo-user-added',
          body: 'Dodatkowy wpis testowy',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        await db.journalDrafts.put({
          id: 'demo-draft',
          content: { body: 'Szkic demonstracyjny' },
          updatedAt: new Date().toISOString(),
        })
      }
      const result = {
        drafts: await db.journalDrafts.count(),
        journals: await db.journalEntries.toArray(),
        profiles: await db.approvedProfileItems.toArray(),
      }
      db.close()
      return result
    },
    { persona, mutate }
  )
}
test('isolated personas persist independently and reset only the selected history', async ({
  page,
}) => {
  test.setTimeout(90000)
  let upstream = 0
  await page.route('https://api.openai.com/**', route => {
    upstream++
    return route.abort()
  })
  await page.goto('/ai-demo')
  await expect(page.getByRole('heading', { name: 'Poznaj asystenta refleksji' })).toBeVisible()
  await expect(page.getByText('AI: wyłączone.', { exact: false })).toBeVisible()
  const marta = await inspect(page, 'marta')
  expect(marta.profiles.length).toBeGreaterThan(0)
  expect(marta.journals.length).toBeGreaterThan(0)
  expect(
    marta.journals.every((j: { createdAt: string }) => j.createdAt <= '2026-09-27T18:00:00.000Z')
  ).toBe(true)
  await inspect(page, 'marta', true)
  await page.reload()
  expect((await inspect(page, 'marta')).journals.length).toBe(marta.journals.length + 1)
  await page.getByRole('button', { name: /^Tomasz/ }).click()
  await expect(page.getByRole('button', { name: /^Tomasz/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  const tomasz = await inspect(page, 'tomasz', true)
  await page.getByRole('button', { name: /^Marta/ }).click()
  await expect(page.getByRole('button', { name: /^Marta/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Przywróć dane osoby' }).click()
  await Promise.all([
    page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
    page.getByRole('button', { name: 'Przywróć stan początkowy' }).click(),
  ])
  await expect(page.getByRole('heading', { name: 'Poznaj asystenta refleksji' })).toBeVisible()
  await expect
    .poll(async () => (await inspect(page, 'marta')).journals.length)
    .toBe(marta.journals.length)
  expect((await inspect(page, 'tomasz')).journals.length).toBe(tomasz.journals.length)
  expect((await inspect(page, 'tomasz')).drafts).toBe(1)
  expect((await inspect(page, 'marta')).drafts).toBe(0)
  await page.getByRole('button', { name: /^Alex/ }).click()
  await expect(page.getByRole('button', { name: /^Alex/ })).toHaveAttribute('aria-pressed', 'true')
  expect((await inspect(page, 'alex')).journals.length).toBeLessThan(marta.journals.length)
  await page.screenshot({ path: 'test-results/ai-demo-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: /^Alex/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ai-demo-mobile.png', fullPage: true })
  expect(upstream).toBe(0)
})
test('links open real application surfaces without enabling generation', async ({ page }) => {
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.goto('/ai-demo')
  await page.getByRole('link', { name: 'Refleksja tygodniowa', exact: true }).click()
  await expect(page.locator('.qr-progress')).toBeVisible()
  await page.getByRole('link', { name: /Demo AI/ }).click()
  await page.getByRole('link', { name: 'Refleksja miesięczna', exact: true }).click()
  await expect(page.locator('.quiet-ritual.qm')).toBeVisible()
  await page.getByRole('link', { name: /Demo AI/ }).click()
  await page.getByRole('link', { name: 'Profil i propozycje' }).click()
  await expect(page.locator('.approved-profile')).toBeVisible()
})

test('current week restores filled ratings and anchor answers over an older empty draft', async ({
  page,
}) => {
  await page.route('https://api.openai.com/**', route => route.abort())
  await page.route('**/__companion/responses', route => route.abort())
  await page.goto('/ai-demo')
  await expect(page.getByRole('heading', { name: 'Poznaj asystenta refleksji' })).toBeVisible()
  await page.evaluate(async () => {
    const { UserDatabase } = await import(/* @vite-ignore */ '/src/services/userDatabaseService.ts')
    const db = new UserDatabase('MindfullGrowthDB_simplify_ai-companion-demo-marta')
    await db.open()
    await db.userSettings.delete('ai-demo-reflection-answers-v2')
    await db.drafts.put({
      key: 'weekly-reflection-2026-W38',
      updatedAt: new Date().toISOString(),
      data: JSON.stringify({
        currentStep: 'body',
        physicalIntensityRating: null,
        energyRating: null,
        promptResponses: {},
        freeformReflection: 'Mój szkic do zachowania',
      }),
    })
    db.close()
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Poznaj asystenta refleksji' })).toBeVisible()
  const restored = await page.evaluate(async () => {
    const { UserDatabase } = await import(/* @vite-ignore */ '/src/services/userDatabaseService.ts')
    const db = new UserDatabase('MindfullGrowthDB_simplify_ai-companion-demo-marta')
    await db.open()
    const draft = JSON.parse((await db.drafts.get('weekly-reflection-2026-W38')).data)
    const week = await db.weeklyReflections.where('weekRef').equals('2026-W38').first()
    const marker = await db.userSettings.get('ai-demo-reflection-answers-v2')
    db.close()
    return { draft, week, marker }
  })
  expect(restored.marker?.value).toBe('complete')
  expect(restored.draft.physicalIntensityRating).toBeGreaterThan(0)
  expect(restored.week.energyRating).toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Refleksja tygodniowa', exact: true }).click()
  await page.getByRole('button', { name: /\d+\. Ciało/ }).click()
  await expect(page.getByText('ten tydzień dorysowany na końcu')).toBeVisible()
  await page.getByRole('button', { name: /\d+\. Kotwice/ }).click()
  await expect(page.locator('.qr-anchors')).toContainText(
    'Spacer z Olą, sobotnia ceramika i pięć minut ruchu'
  )
  await expect(page.locator('.qr-anchors')).toContainText('Było dużo pracy i mało energii')
  await page.getByRole('button', { name: /\d+\. Dziennik/ }).click()
  await expect(page.getByRole('textbox', { name: 'Dziennik tygodnia' })).toHaveValue(
    'Mój szkic do zachowania'
  )
})
