import { test, expect } from '@playwright/test'

async function resetDatabase(page) {
  await page.goto('/')
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase('MindfullGrowthDB')
      deleteRequest.onsuccess = () => setTimeout(resolve, 100)
      deleteRequest.onerror = () => resolve()
      deleteRequest.onblocked = () => setTimeout(resolve, 100)
    })
  })
}

async function selectEmotion(page, quadrantLabel: string, emotionName: string) {
  await page.getByRole('button', { name: `Select ${quadrantLabel} quadrant` }).click()
  await page.getByRole('button', { name: `Select emotion ${emotionName}` }).click()
}

async function gotoEmotions(page) {
  await page.goto('/emotions')
  await page.waitForURL('**/emotions', { timeout: 5000 })
}

async function createJournalEntry(page, { title, body, peopleTag, contextTag }) {
  await page.goto('/')
  await page.waitForURL('**/journal', { timeout: 5000 })
  await page.getByText('Free form').click()
  await page.waitForURL('**/journal/edit', { timeout: 5000 })
  if (title) {
    await page.getByLabel('Title').fill(title)
  }
  await page.getByLabel(/journal entry/i).fill(body)
  await selectEmotion(page, 'High Energy / High Pleasantness', 'Happy')
  const peopleInput = page.getByLabel(/Add people tag/i)
  await peopleInput.fill(peopleTag)
  await page.keyboard.press('Enter')
  const contextInput = page.getByLabel(/Add context tag/i)
  await contextInput.fill(contextTag)
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL('**/journal', { timeout: 5000 })
}

async function createEmotionLog(page, { note, peopleTag, contextTag }) {
  await gotoEmotions(page)
  await page.getByRole('button', { name: 'Log emotion' }).click()
  await page.waitForURL('**/emotions/edit', { timeout: 5000 })
  await selectEmotion(page, 'High Energy / High Pleasantness', 'Happy')
  if (peopleTag) {
    const peopleInput = page.getByLabel(/Add people tag/i)
    await peopleInput.fill(peopleTag)
    await page.keyboard.press('Enter')
  }
  if (contextTag) {
    const contextInput = page.getByLabel(/Add context tag/i)
    await contextInput.fill(contextTag)
    await page.keyboard.press('Enter')
  }
  if (note) {
    await page.getByLabel(/note/i).fill(note)
  }
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL('**/emotions', { timeout: 5000 })
}

test.describe('Emotion Log Flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
  })

  test('complete flow: create, edit, and delete an emotion log', async ({ page }) => {
    await createEmotionLog(page, {
      note: 'Commute reflections',
      peopleTag: 'Commuter',
      contextTag: 'Train',
    })

    await expect(page.getByText('Commute reflections')).toBeVisible()
    await expect(page.getByText('Commuter', { exact: true })).toBeVisible()
    await expect(page.getByText('Train', { exact: true })).toBeVisible()

    await page.getByText('Commute reflections').click()
    await page.waitForURL('**/emotions/*/edit', { timeout: 5000 })

    await page.getByLabel(/note/i).fill('Updated note after edit')
    await page.getByRole('button', { name: 'Remove Happy from selection' }).click()
    await selectEmotion(page, 'Low Energy / High Pleasantness', 'Calm')

    const peopleInput = page.getByLabel(/Add people tag/i)
    await peopleInput.fill('Neighbor')
    await page.keyboard.press('Enter')

    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL('**/emotions', { timeout: 5000 })

    await expect(page.getByText('Updated note after edit')).toBeVisible()
    await expect(page.getByText('Neighbor')).toBeVisible()
    await expect(page.getByText('Calm')).toBeVisible()

    await page.getByRole('button', { name: /Delete emotion log recorded on/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Updated note after edit')).toHaveCount(0)
  })

  test('shows validation error when saving without selecting emotions', async ({ page }) => {
    await gotoEmotions(page)
    await page.getByRole('button', { name: 'Log emotion' }).click()
    await page.waitForURL('**/emotions/edit', { timeout: 5000 })
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Please select at least one emotion.')).toBeVisible()
  })

  test('reuses tags created in journal entries', async ({ page }) => {
    await createJournalEntry(page, {
      title: 'Tag Source Entry',
      body: 'Entry providing tags for emotion log.',
      peopleTag: 'Mom',
      contextTag: 'Work',
    })

    await gotoEmotions(page)
    await page.getByRole('button', { name: 'Log emotion' }).click()
    await page.waitForURL('**/emotions/edit', { timeout: 5000 })

    await selectEmotion(page, 'High Energy / High Pleasantness', 'Happy')

    const peopleInput = page.getByLabel(/Add people tag/i)
    await peopleInput.fill('Mo')
    await expect(page.getByRole('button', { name: 'Select Mom' })).toBeVisible()
    await page.getByRole('button', { name: 'Select Mom' }).click()

    const contextInput = page.getByLabel(/Add context tag/i)
    await contextInput.fill('Wo')
    await expect(page.getByRole('button', { name: 'Select Work' })).toBeVisible()
    await page.getByRole('button', { name: 'Select Work' }).click()

    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL('**/emotions', { timeout: 5000 })

    await expect(page.getByText('Mom')).toBeVisible()
    await expect(page.getByText('Work')).toBeVisible()
  })

  test('handles navigation to non-existent log id gracefully', async ({ page }) => {
    await page.goto('/emotions/non-existent/edit')
    await expect(page.getByText('Emotion log not found.')).toBeVisible()
    await page.waitForURL('**/emotions', { timeout: 5000 })
  })
})


