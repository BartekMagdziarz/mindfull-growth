import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { VERIFY_DB_NAME } from '../src/dev/verificationAccount'

test('exports and restores seeded user data in real IndexedDB', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/profile#account')
  await expect(page.getByRole('button', { name: 'Eksport danych', exact: true })).toBeVisible({
    timeout: 90_000,
  })
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Eksport danych', exact: true }).click()
  const download = await downloading
  const path = await download.path()
  expect(path).toBeTruthy()
  const json = await readFile(path!, 'utf8')
  const backup = JSON.parse(json)
  expect(backup.version).toBe(1)
  expect(backup.databaseVersion).toBe(34)
  expect(backup.tables.journalEntries.length).toBeGreaterThan(0)
  expect(
    backup.tables.userSettings.some((row: { key: string }) =>
      ['aiProviderSettings', 'openaiApiKey'].includes(row.key)
    )
  ).toBe(false)
  const entry = backup.tables.journalEntries[0]
  // Modify only this test context's verification database, then restore it.
  await page.evaluate(
    ({ name, entry }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('journalEntries', 'readwrite')
          tx.objectStore('journalEntries').put({ ...entry, body: 'temporary test change' })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onabort = () => {
            db.close()
            reject(tx.error)
          }
        }
      }),
    { name: VERIFY_DB_NAME, entry }
  )
  await page
    .getByLabel('Przywróć kopię', { exact: true })
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  const confirm = page.getByRole('button', { name: 'Zastąp i przywróć', exact: true })
  await expect(confirm).toBeVisible()
  const reloaded = page.waitForEvent('load')
  await confirm.click()
  await reloaded
  await expect(page.getByRole('button', { name: 'Eksport danych', exact: true })).toBeVisible()
  const body = await page.evaluate(
    ({ name, id }) =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open(name)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('journalEntries', 'readonly')
          const read = tx.objectStore('journalEntries').get(id)
          read.onsuccess = () => resolve(read.result.body)
          read.onerror = () => reject(read.error)
          tx.oncomplete = () => db.close()
        }
      }),
    { name: VERIFY_DB_NAME, id: entry.id }
  )
  expect(body).toBe(entry.body)
  expect(errors).toEqual([])
})
