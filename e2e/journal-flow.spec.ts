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

async function createJournalEntry(page, { title, body, emotionName, peopleTag, contextTag }) {
  await page.goto('/')
  await page.waitForURL('**/journal', { timeout: 5000 })
  await page.getByText('Free form').click()
  await page.waitForURL('**/journal/edit', { timeout: 5000 })

  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

  if (title) {
    await page.getByLabel('Title').fill(title)
  }
  await page.getByLabel(/journal entry/i).fill(body)

  await selectEmotion(page, 'High Energy / High Pleasantness', emotionName)

  const peopleInput = page.getByLabel(/Add people tag/i)
  await peopleInput.fill(peopleTag)
  await page.keyboard.press('Enter')

  const contextInput = page.getByLabel(/Add context tag/i)
  await contextInput.fill(contextTag)
  await page.keyboard.press('Enter')

  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL('**/journal', { timeout: 5000 })
}

test.describe('Journal Flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
  })

  test('complete flow: create, edit, and delete an entry with tags and emotions', async ({
    page,
  }) => {
    await createJournalEntry(page, {
      title: 'Daily Reflection',
      body: 'Original body content',
      emotionName: 'Happy',
      peopleTag: 'Mom',
      contextTag: 'Work',
    })

    await expect(page.getByRole('heading', { name: 'Daily Reflection' })).toBeVisible()
    await expect(page.getByText('Original body content')).toBeVisible()
    await expect(page.getByText('Mom', { exact: true })).toBeVisible()
    await expect(page.getByText('Work', { exact: true })).toBeVisible()
    await expect(page.getByText('Happy', { exact: true })).toBeVisible()

    await page.getByRole('heading', { name: 'Daily Reflection' }).click()
    await page.waitForURL('**/journal/*/edit', { timeout: 5000 })

    await page.getByLabel('Title').fill('Edited Reflection')
    await page.getByLabel(/journal entry/i).fill('Updated body content for entry.')
    await page.getByRole('button', { name: 'Remove Happy from selection' }).click()
    await selectEmotion(page, 'Low Energy / High Pleasantness', 'Calm')

    const peopleInput = page.getByLabel(/Add people tag/i)
    await peopleInput.fill('Dad')
    await page.keyboard.press('Enter')

    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL('**/journal', { timeout: 5000 })

    await expect(page.getByRole('heading', { name: 'Edited Reflection' })).toBeVisible()
    await expect(page.getByText('Updated body content for entry.')).toBeVisible()
    await expect(page.getByText('Calm', { exact: true })).toBeVisible()
    await expect(page.getByText('Dad', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Delete entry:/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Edited Reflection')).toHaveCount(0)
  })

  test('delete dialog cancellation keeps the entry', async ({ page }) => {
    await createJournalEntry(page, {
      title: 'Cancelable Entry',
      body: 'Body that should stay after cancelling delete.',
      emotionName: 'Happy',
      peopleTag: 'Partner',
      contextTag: 'Gym',
    })

    await page.getByRole('button', { name: /Delete entry:/ }).click()
    await page.getByRole('dialog')
      .getByRole('button', { name: 'Cancel' })
      .click()
    await expect(page.getByText('Body that should stay after cancelling delete.')).toBeVisible()
  })
})
