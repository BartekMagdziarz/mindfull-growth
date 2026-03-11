import { test, expect, type Page } from '@playwright/test'

async function resetDatabase(page: Page) {
  await page.goto('/')
  await page.evaluate(async () => {
    const deleteDatabase = (name: string) =>
      new Promise<void>((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(name)
        deleteRequest.onsuccess = () => setTimeout(resolve, 100)
        deleteRequest.onerror = () => resolve()
        deleteRequest.onblocked = () => setTimeout(resolve, 100)
      })

    const databases =
      typeof indexedDB.databases === 'function' ? await indexedDB.databases() : []

    for (const database of databases) {
      if (database.name) {
        await deleteDatabase(database.name)
      }
    }

    if (!databases.length) {
      await deleteDatabase('MindfullGrowthDB')
    }
  })

  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
}

async function signUp(page: Page) {
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const username = `e2e-${unique}`
  const password = `pw-${unique}123`

  await page.goto('/signup')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel(/^Password$/).fill(password)
  await page.getByLabel(/^Confirm Password$/).fill(password)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })
  await expect(page.getByText('Free form')).toBeVisible()
}

async function selectEmotion(page: Page, quadrantLabel: string, emotionName: string) {
  await page.getByRole('button', { name: `Select ${quadrantLabel} quadrant` }).click()
  await page.getByRole('gridcell', { name: `Select emotion ${emotionName}` }).click()
}

async function addTag(page: Page, type: 'people' | 'context', name: string) {
  await page.getByRole('button', { name: new RegExp(`Add new ${type} tag`, 'i') }).click()
  await page.getByLabel(new RegExp(`New ${type} tag name`, 'i')).fill(name)
  await page.keyboard.press('Enter')
}

async function gotoHistory(page: Page, type: 'journal' | 'emotion-log') {
  await page.goto(`/history?type=${type}`)
  await page.waitForURL(
    (url) => url.pathname === '/history' && url.searchParams.get('type') === type,
    { timeout: 5000 }
  )
}

async function createJournalEntry(
  page: Page,
  {
    title,
    body,
    emotionName,
    peopleTag,
    contextTag,
  }: {
    title?: string
    body: string
    emotionName: string
    peopleTag: string
    contextTag: string
  }
) {
  await page.goto('/journal')
  await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })
  await expect(page.getByText('Free form')).toBeVisible()
  await page.getByText('Free form').click()
  await page.waitForURL((url) => url.pathname === '/journal/edit', { timeout: 5000 })

  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

  if (title) {
    await page.getByLabel('Title').fill(title)
  }

  await page.getByLabel(/journal entry/i).fill(body)
  await selectEmotion(page, 'High Energy / High Pleasantness', emotionName)
  await addTag(page, 'people', peopleTag)
  await addTag(page, 'context', contextTag)

  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })
}

test.describe('Journal Flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await signUp(page)
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

    await gotoHistory(page, 'journal')
    await expect(page.getByRole('heading', { name: 'Daily Reflection' })).toBeVisible()
    await expect(page.getByText('Original body content')).toBeVisible()
    await expect(page.getByText('Mom', { exact: true })).toBeVisible()
    await expect(page.getByText('Work', { exact: true })).toBeVisible()
    await expect(page.getByText('Happy', { exact: true })).toBeVisible()

    await page.getByRole('heading', { name: 'Daily Reflection' }).click()
    await page.waitForURL((url) => /^\/journal\/[^/]+\/edit$/.test(url.pathname), {
      timeout: 5000,
    })

    await page.getByLabel('Title').fill('Edited Reflection')
    await page.getByLabel(/journal entry/i).fill('Updated body content')
    await page.getByRole('button', { name: 'Remove Happy from selection' }).click()
    await selectEmotion(page, 'Low Energy / High Pleasantness', 'Calm')
    await addTag(page, 'people', 'Dad')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })

    await gotoHistory(page, 'journal')
    await expect(page.getByRole('heading', { name: 'Edited Reflection' })).toBeVisible()
    await expect(page.getByText('Updated body content')).toBeVisible()
    await expect(page.getByText('Calm', { exact: true })).toBeVisible()
    await expect(page.getByText('Dad', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Delete journal entry: Edited Reflection' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'Edited Reflection' })).toHaveCount(0)
  })

  test('delete dialog cancellation keeps the entry', async ({ page }) => {
    await createJournalEntry(page, {
      title: 'Cancelable Entry',
      body: 'Body that should stay.',
      emotionName: 'Happy',
      peopleTag: 'Partner',
      contextTag: 'Gym',
    })

    await gotoHistory(page, 'journal')
    await page.getByRole('button', { name: 'Delete journal entry: Cancelable Entry' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Cancelable Entry' })).toBeVisible()
    await expect(page.getByText('Body that should stay.')).toBeVisible()
  })
})
