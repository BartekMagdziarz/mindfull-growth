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

async function gotoEmotions(page: Page) {
  await page.goto('/emotions')
  await page.waitForURL((url) => url.pathname === '/emotions', { timeout: 5000 })
  await expect(page.getByLabel(/note/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
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
    peopleTag,
    contextTag,
  }: {
    title?: string
    body: string
    peopleTag: string
    contextTag: string
  }
) {
  await page.goto('/journal')
  await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })
  await expect(page.getByText('Free form')).toBeVisible()
  await page.getByText('Free form').click()
  await page.waitForURL((url) => url.pathname === '/journal/edit', { timeout: 5000 })

  if (title) {
    await page.getByLabel('Title').fill(title)
  }

  await page.getByLabel(/journal entry/i).fill(body)
  await selectEmotion(page, 'High Energy / High Pleasantness', 'Happy')
  await addTag(page, 'people', peopleTag)
  await addTag(page, 'context', contextTag)
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })
}

async function createEmotionLog(
  page: Page,
  {
    note,
    emotionName,
    peopleTag,
    contextTag,
  }: {
    note?: string
    emotionName: string
    peopleTag?: string
    contextTag?: string
  }
) {
  await gotoEmotions(page)
  await selectEmotion(page, 'High Energy / High Pleasantness', emotionName)

  if (peopleTag) {
    await addTag(page, 'people', peopleTag)
  }

  if (contextTag) {
    await addTag(page, 'context', contextTag)
  }

  if (note) {
    await page.getByLabel(/note/i).fill(note)
  }

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Emotion log saved successfully.')).toBeVisible()
}

test.describe('Emotion Log Flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await signUp(page)
  })

  test('complete flow: create, edit, and delete an emotion log', async ({ page }) => {
    await createEmotionLog(page, {
      note: 'Commute note',
      emotionName: 'Happy',
      peopleTag: 'Commuter',
      contextTag: 'Train',
    })

    await expect(page.getByLabel(/note/i)).toHaveValue('')
    await expect(page.getByRole('button', { name: /Remove .* from selection/ })).toHaveCount(0)

    await gotoHistory(page, 'emotion-log')
    await expect(page.getByText('Commute note')).toBeVisible()
    await expect(page.getByText('Happy', { exact: true })).toBeVisible()
    await expect(page.getByText('Commuter', { exact: true })).toBeVisible()
    await expect(page.getByText('Train', { exact: true })).toBeVisible()

    await page.getByText('Commute note').click()
    await page.waitForURL((url) => /^\/emotions\/[^/]+\/edit$/.test(url.pathname), {
      timeout: 5000,
    })

    await page.getByLabel(/note/i).fill('Updated commute note')
    await page.getByRole('button', { name: 'Remove Happy from selection' }).click()
    await selectEmotion(page, 'Low Energy / High Pleasantness', 'Calm')
    await addTag(page, 'people', 'Coworker')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL((url) => url.pathname === '/emotions', { timeout: 5000 })

    await gotoHistory(page, 'emotion-log')
    await expect(page.getByText('Updated commute note')).toBeVisible()
    await expect(page.getByText('Calm', { exact: true })).toBeVisible()
    await expect(page.getByText('Coworker', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Delete emotion log from/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Updated commute note')).toHaveCount(0)
  })

  test('shows validation error when saving without selecting emotions', async ({ page }) => {
    await gotoEmotions(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Please select at least one emotion.')).toBeVisible()
  })

  test('reuses tags created in journal entries', async ({ page }) => {
    await createJournalEntry(page, {
      title: 'Tag Source Entry',
      body: 'Entry providing tags.',
      peopleTag: 'Mom',
      contextTag: 'Work',
    })

    await gotoEmotions(page)
    await selectEmotion(page, 'High Energy / High Pleasantness', 'Happy')
    await expect(page.getByRole('button', { name: 'Select people tag Mom' })).toBeVisible()
    await page.getByRole('button', { name: 'Select people tag Mom' }).click()
    await expect(page.getByRole('button', { name: 'Select context tag Work' })).toBeVisible()
    await page.getByRole('button', { name: 'Select context tag Work' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Emotion log saved successfully.')).toBeVisible()

    await gotoHistory(page, 'emotion-log')
    await expect(page.getByText('Mom', { exact: true })).toBeVisible()
    await expect(page.getByText('Work', { exact: true })).toBeVisible()
  })
})
