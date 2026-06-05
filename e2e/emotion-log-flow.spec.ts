import { test, expect, type Page } from '@playwright/test'

const HIGH_PLEASANT_QUADRANT = 'emotion-quadrant-high-energy-high-pleasantness'
const LOW_PLEASANT_QUADRANT = 'emotion-quadrant-low-energy-high-pleasantness'
const HAPPY_EMOTION = 'emotion-option-e4m10-happy-028'
const CALM_EMOTION = 'emotion-option-e7m7-calm-067'
const happyText = /^(Happy|Szczęśliwy)$/
const calmText = /^(Calm|Opanowany)$/
const emotionSavedText = /^(Emotion log saved successfully\.|Emotion logged successfully\.|Wpis emocji zapisany pomyślnie\.|Emocja zapisana pomyślnie\.)$/
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
  // New scatter flow: quadrant -> families -> "show emotions" -> pick a dot.
  await page.getByTestId('emotion-show-emotions').click()
  // Scatter dots are absolutely positioned and can slightly overlap; force the
  // click so a neighbouring dot cannot intercept the pointer.
  await page.getByTestId(emotionTestId).click({ force: true })
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

async function gotoEmotions(page: Page) {
  await page.goto('/emotions')
  await page.waitForURL((url) => url.pathname === '/emotions', { timeout: 5000 })
  await expect(page.getByLabel(/note|notatka/i)).toBeVisible()
  await expect(page.getByRole('button', { name: saveButtonName })).toBeVisible()
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
  await expect(page.getByText(freeFormText)).toBeVisible()
  await page.getByTestId('journal-free-form-card').click()
  await page.waitForURL((url) => url.pathname === '/journal/edit', { timeout: 5000 })

  if (title) {
    await page.getByLabel(/^(Title|Tytuł)$/).fill(title)
  }

  await page.getByLabel(/journal entry|wpis w dzienniku/i).fill(body)
  await selectEmotion(page, HIGH_PLEASANT_QUADRANT, HAPPY_EMOTION)
  await addTag(page, 'people', peopleTag)
  await addTag(page, 'context', contextTag)
  await page.getByRole('button', { name: saveButtonName }).click()
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
  await selectEmotion(page, HIGH_PLEASANT_QUADRANT, emotionName)

  if (peopleTag) {
    await addTag(page, 'people', peopleTag)
  }

  if (contextTag) {
    await addTag(page, 'context', contextTag)
  }

  if (note) {
    await page.getByLabel(/note|notatka/i).fill(note)
  }

  await page.getByRole('button', { name: saveButtonName }).click()
  await expect(page.getByText(emotionSavedText)).toBeVisible()
}

test.describe('Emotion Log Flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page)
    await signUp(page)
  })

  test('complete flow: create, edit, and delete an emotion log', async ({ page }) => {
    await createEmotionLog(page, {
      note: 'Commute note',
      emotionName: HAPPY_EMOTION,
      peopleTag: 'Commuter',
      contextTag: 'Train',
    })

    await expect(page.getByLabel(/note|notatka/i)).toHaveValue('')
    await expect(page.getByRole('button', { name: /Remove .* from selection/ })).toHaveCount(0)

    await gotoHistory(page, 'emotion-log')
    await expect(page.getByText('Commute note')).toBeVisible()
    await expect(page.getByText(happyText)).toBeVisible()
    await expect(page.getByText('Commuter', { exact: true })).toBeVisible()
    await expect(page.getByText('Train', { exact: true })).toBeVisible()

    await page.getByText('Commute note').click()
    await page.waitForURL((url) => /^\/emotions\/[^/]+\/edit$/.test(url.pathname), {
      timeout: 5000,
    })

    await page.getByLabel(/note|notatka/i).fill('Updated commute note')
    await removeEmotion(page, 'Happy', 'Szczęśliwy')
    await selectEmotion(page, LOW_PLEASANT_QUADRANT, CALM_EMOTION)
    await addTag(page, 'people', 'Coworker')
    await page.getByRole('button', { name: saveButtonName }).click()
    await page.waitForURL((url) => url.pathname === '/emotions', { timeout: 5000 })

    await gotoHistory(page, 'emotion-log')
    await expect(page.getByText('Updated commute note')).toBeVisible()
    await expect(page.getByText(calmText)).toBeVisible()
    await expect(page.getByText('Coworker', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^(Delete emotion log from|Usuń wpis emocji z)/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^(Delete|Usuń)$/ }).click()
    await expect(page.getByText('Updated commute note')).toHaveCount(0)
  })

  test('shows validation error when saving without selecting emotions', async ({ page }) => {
    await gotoEmotions(page)
    await page.getByRole('button', { name: saveButtonName }).click()
    await expect(page.getByText(/^(Please select at least one emotion\.|Wybierz co najmniej jedną emocję\.)$/)).toBeVisible()
  })

  test('reuses tags created in journal entries', async ({ page }) => {
    await createJournalEntry(page, {
      title: 'Tag Source Entry',
      body: 'Entry providing tags.',
      peopleTag: 'Mom',
      contextTag: 'Work',
    })

    await gotoEmotions(page)
    await selectEmotion(page, HIGH_PLEASANT_QUADRANT, HAPPY_EMOTION)
    await expect(page.getByRole('button', { name: /^(Select|Zaznacz) tag (people|osoby) Mom$/i })).toBeVisible()
    await page.getByRole('button', { name: /^(Select|Zaznacz) tag (people|osoby) Mom$/i }).click()
    await expect(page.getByRole('button', { name: /^(Select|Zaznacz) tag (context|kontekst) Work$/i })).toBeVisible()
    await page.getByRole('button', { name: /^(Select|Zaznacz) tag (context|kontekst) Work$/i }).click()
    await page.getByRole('button', { name: saveButtonName }).click()
    await expect(page.getByText(emotionSavedText)).toBeVisible()

    await gotoHistory(page, 'emotion-log')
    await expect(page.getByText('Mom', { exact: true })).toBeVisible()
    await expect(page.getByText('Work', { exact: true })).toBeVisible()
  })
})
