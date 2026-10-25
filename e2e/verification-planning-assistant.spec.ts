import { test, expect, type Page } from '@playwright/test'
import { plannerFixture } from '../src/domain/__tests__/planningAssistant.fixture'
const title = 'Czytanie z pomocnikiem AI · test'
const object = () => plannerFixture({ title, days: [0, 2, 4] })
async function resetDraft(page: Page) {
  await page.evaluate(async () => {
    const { planningAssistantDraftRepository: repo } =
      await import('/src/repositories/planningAssistantDraftRepository.ts')
    const draft = await repo.open()
    await repo.reset(draft.id, draft.revision)
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ułóżmy plan', exact: true })).toBeVisible()
}
async function mocks(page: Page) {
  await page.route('**/__companion/status', route => route.fulfill({ json: { available: true } }))
  await page.route('**/__companion/responses', async route => {
    const body = route.request().postDataJSON()
    expect(body.tool_choice).toBe('none')
    expect(body.store).toBe(false)
    const reply = {
      message: 'Zacznijmy od dwóch tygodni.',
      suggestions: [],
      objects: [
        object(),
        plannerFixture({
          id: 'focus',
          title: 'Koncentracja · test',
          kind: 'tracker',
          entryMode: 'rating',
          selected: false,
        }),
      ],
    }
    await route.fulfill({
      json: {
        status: 'completed',
        output: [
          { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] },
        ],
        usage: { input_tokens: 100, output_tokens: 300 },
        model: 'gpt-6-luna',
      },
    })
  })
}
test.describe('Production planning assistant', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeEach(async ({ page }) => {
    await mocks(page)
    await page.goto('/planning-assistant')
    await expect(page.getByRole('heading', { name: 'Ułóżmy plan', exact: true })).toBeVisible()
    await resetDraft(page)
  })
  test('conversation, manual correction, persistence and explicit atomic approval', async ({
    page,
  }) => {
    await page
      .getByRole('textbox', { name: 'Wiadomość do pomocnika' })
      .fill('Chcę czytać przez 20 minut, trzy różne dni tygodniowo przez najbliższe dwa tygodnie.')
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await expect(page.getByRole('heading', { name: 'Szkic', exact: true })).toBeVisible()
    await expect(page.getByText('Zacznijmy od dwóch tygodni.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Edytuj: ${title}`, exact: true }).click()
    await page.getByRole('spinbutton', { name: 'Wartość targetu' }).fill('2')
    await page.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(`${title} poprawione`)
    await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
    await page.screenshot({
      path: 'work/ai-planning-assistant/production-draft-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
    await expect(page.getByRole('status', { name: 'Szkic zachowany', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText(`${title} poprawione`, { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Szkic', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Dodaj wybrane', exact: true }).click()
    await expect(
      page.getByText('Plan dodany do obiektów i kalendarza.', { exact: true })
    ).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeVisible()
    const result = await page.evaluate(async () => {
      const { getUserDatabase } = await import('/src/services/userDatabaseService.ts')
      const db = getUserDatabase()
      const { planningAssistantDraftRepository: repo } =
        await import('/src/repositories/planningAssistantDraftRepository.ts')
      const draft = await repo.open()
      const receipt = draft.receipt!
      const habit = await db.habits.get(receipt.objects[0].id)
      const days = await db.measurementDayAssignments.where('subjectId').equals(habit!.id).toArray()
      return { receipt, habit, days }
    })
    expect(result.receipt.objects).toHaveLength(1)
    expect(result.habit!.target).toEqual({ kind: 'count', operator: 'min', value: 2 })
    expect(result.days).toHaveLength(6)
    await page.screenshot({
      path: 'work/ai-planning-assistant/production-saved-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
  })
  test('x opens a cancellable confirmation and incomplete input survives refresh', async ({
    page,
  }) => {
    await page.getByRole('textbox', { name: 'Wiadomość do pomocnika' }).fill('Chcę czytać.')
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await page.getByRole('button', { name: `Edytuj: ${title}`, exact: true }).click()
    await page.getByRole('spinbutton', { name: 'Wartość targetu' }).fill('')
    await expect(page.getByRole('status', { name: 'Szkic zachowany', exact: true })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: `Edytuj: ${title}`, exact: true }).click()
    await expect(page.getByRole('spinbutton', { name: 'Wartość targetu' })).toHaveValue('')
    await page.getByRole('button', { name: 'Dodaj wybrane', exact: true }).click()
    await expect(page.getByText('Sprawdź target.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Odrzuć szkic', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Wróć', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('spinbutton', { name: 'Wartość targetu' })).toHaveValue('')
  })
  test('narrow view shows separate conversation and draft tabs without overflowing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 380, height: 850 })
    await page.getByRole('textbox', { name: 'Wiadomość do pomocnika' }).fill('Chcę czytać.')
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await expect(page.getByRole('heading', { name: 'Szkic', exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Wiadomość do pomocnika' })).not.toBeVisible()
    await page.screenshot({
      path: 'work/ai-planning-assistant/production-draft-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.getByRole('button', { name: 'Rozmowa', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Wiadomość do pomocnika' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Szkic', exact: true })).not.toBeVisible()
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      items: [...document.querySelectorAll('*')]
        .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 15)
        .map(el => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
          width: el.getBoundingClientRect().width,
        })),
    }))
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width)
    await page.screenshot({
      path: 'work/ai-planning-assistant/production-chat-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
  })
})
