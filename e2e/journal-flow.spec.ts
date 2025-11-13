import { test, expect } from '@playwright/test'

test.describe('Journal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test to ensure clean state
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase('MindfullGrowthDB')
        deleteRequest.onsuccess = () => {
          // Wait a bit for the database to be fully deleted
          setTimeout(() => resolve(), 100)
        }
        deleteRequest.onerror = () => {
          // If database doesn't exist, that's fine - resolve anyway
          resolve()
        }
        deleteRequest.onblocked = () => {
          // If blocked, wait a bit and try to resolve
          setTimeout(() => resolve(), 100)
        }
      })
    })
  })

  test('complete flow: create entry and see it in list', async ({ page }) => {
    // 1. Open app (navigate to base URL)
    await page.goto('http://localhost:5173')

    // 2. Navigate to Journal tab
    // The app redirects to /journal by default, but we can also click the Journal nav item
    await page.waitForURL('**/journal', { timeout: 5000 })
    
    // Wait for the page to be ready
    await page.waitForSelector('text=Free form', { timeout: 5000 })

    // 3. Click "Free form" button
    await page.click('text=Free form')

    // Wait for navigation to journal/new
    await page.waitForURL('**/journal/new', { timeout: 5000 })

    // 4. Type body text in textarea
    const bodyTextarea = page.getByLabel(/journal entry/i)
    await bodyTextarea.fill('This is my test journal entry for E2E testing.')

    // 5. Click "Save" button
    await page.click('button:has-text("Save")')

    // Wait for navigation back to journal list
    await page.waitForURL('**/journal', { timeout: 5000 })

    // 6. Verify: entry is visible in the list on Journal view
    // The entry should appear in the list with the body text
    await expect(
      page.getByText('This is my test journal entry for E2E testing.')
    ).toBeVisible({ timeout: 5000 })
  })
})

