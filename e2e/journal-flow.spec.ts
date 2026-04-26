import { test, expect, type Page } from '@playwright/test'

const HIGH_PLEASANT_QUADRANT = 'emotion-quadrant-high-energy-high-pleasantness'
const LOW_PLEASANT_QUADRANT = 'emotion-quadrant-low-energy-high-pleasantness'
const HAPPY_EMOTION = 'emotion-option-e4m10-happy-028'
const CALM_EMOTION = 'emotion-option-e7m7-calm-067'
const happyText = /^(Happy|Szczęśliwy)$/
const calmText = /^(Calm|Opanowany)$/
const saveButtonName = /^(Save|Zapisz)$/
const freeFormText = /^(Free form|Swobodny wpis)$/

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
  await page.getByLabel(/^(Username|Nazwa użytkownika)$/).fill(username)
  await page.getByLabel(/^(Password|Hasło)$/).fill(password)
  await page.getByLabel(/^(Confirm Password|Potwierdź hasło)$/).fill(password)
  await page.getByRole('button', { name: /^(Create Account|Utwórz konto)$/ }).click()
  await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })
  await expect(page.getByText(freeFormText)).toBeVisible()
}

async function selectEmotion(page: Page, quadrantTestId: string, emotionTestId: string) {
  await page.getByTestId(quadrantTestId).click()
  await page.getByTestId(emotionTestId).click()
}

async function addTag(page: Page, type: 'people' | 'context', name: string) {
  await page.getByTestId(`tag-add-${type}`).click()
  await page.getByTestId(`tag-new-${type}`).fill(name)
  await page.keyboard.press('Enter')
}

async function removeEmotion(page: Page, enName: string, plName: string) {
  await page
    .getByRole('button', {
      name: new RegExp(`^(Remove (${enName}|${plName}) from selection|Usuń (${enName}|${plName}) z wyboru)$`),
    })
    .click()
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
  await expect(page.getByText(freeFormText)).toBeVisible()
  await page.getByTestId('journal-free-form-card').click()
  await page.waitForURL((url) => url.pathname === '/journal/edit', { timeout: 5000 })

  await expect(page.getByRole('button', { name: saveButtonName })).toBeDisabled()

  if (title) {
    await page.getByLabel(/^(Title|Tytuł)$/).fill(title)
  }

  await page.getByLabel(/journal entry|wpis w dzienniku/i).fill(body)
  await selectEmotion(page, HIGH_PLEASANT_QUADRANT, emotionName)
  await addTag(page, 'people', peopleTag)
  await addTag(page, 'context', contextTag)

  await expect(page.getByRole('button', { name: saveButtonName })).toBeEnabled()
  await page.getByRole('button', { name: saveButtonName }).click()
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
      emotionName: HAPPY_EMOTION,
      peopleTag: 'Mom',
      contextTag: 'Work',
    })

    await gotoHistory(page, 'journal')
    await expect(page.getByRole('heading', { name: 'Daily Reflection' })).toBeVisible()
    await expect(page.getByText('Original body content')).toBeVisible()
    await expect(page.getByText('Mom', { exact: true })).toBeVisible()
    await expect(page.getByText('Work', { exact: true })).toBeVisible()
    await expect(page.getByText(happyText)).toBeVisible()

    await page.getByRole('heading', { name: 'Daily Reflection' }).click()
    await page.waitForURL((url) => /^\/journal\/[^/]+\/edit$/.test(url.pathname), {
      timeout: 5000,
    })

    await page.getByLabel(/^(Title|Tytuł)$/).fill('Edited Reflection')
    await page.getByLabel(/journal entry|wpis w dzienniku/i).fill('Updated body content')
    await removeEmotion(page, 'Happy', 'Szczęśliwy')
    await selectEmotion(page, LOW_PLEASANT_QUADRANT, CALM_EMOTION)
    await addTag(page, 'people', 'Dad')
    await page.getByRole('button', { name: saveButtonName }).click()
    await page.waitForURL((url) => url.pathname === '/journal', { timeout: 5000 })

    await gotoHistory(page, 'journal')
    await expect(page.getByRole('heading', { name: 'Edited Reflection' })).toBeVisible()
    await expect(page.getByText('Updated body content')).toBeVisible()
    await expect(page.getByText(calmText)).toBeVisible()
    await expect(page.getByText('Dad', { exact: true })).toBeVisible()

    await page
      .getByRole('button', { name: /^(Delete journal entry|Usuń wpis dziennika): Edited Reflection$/ })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: /^(Delete|Usuń)$/ }).click()
    await expect(page.getByRole('heading', { name: 'Edited Reflection' })).toHaveCount(0)
  })

  test('delete dialog cancellation keeps the entry', async ({ page }) => {
    await createJournalEntry(page, {
      title: 'Cancelable Entry',
      body: 'Body that should stay.',
      emotionName: HAPPY_EMOTION,
      peopleTag: 'Partner',
      contextTag: 'Gym',
    })

    await gotoHistory(page, 'journal')
    await page
      .getByRole('button', { name: /^(Delete journal entry|Usuń wpis dziennika): Cancelable Entry$/ })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: /^(Cancel|Anuluj)$/ }).click()
    await expect(page.getByRole('heading', { name: 'Cancelable Entry' })).toBeVisible()
    await expect(page.getByText('Body that should stay.')).toBeVisible()
  })
})
