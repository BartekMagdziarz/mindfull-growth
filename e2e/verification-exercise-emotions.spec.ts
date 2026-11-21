import { test, expect, type Page } from '@playwright/test'
import { VERIFY_DB_NAME } from '../src/dev/verificationAccount'

async function savedRows(page: Page, table: string) {
  return page.evaluate(
    async ({ table, dbName }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      try {
        return await new Promise<unknown[]>((resolve, reject) => {
          const request = db.transaction(table).objectStore(table).getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      } finally {
        db.close()
      }
    },
    { table, dbName: VERIFY_DB_NAME }
  )
}

test('stores independent group selections and intensity before and after dereflection', async ({
  page,
}) => {
  await page.goto('/exercises/dereflection')
  await page.getByTestId('egp-quadrant-high-energy-low-pleasantness').click()
  const anger = page.getByTestId('egp-tile-gniew')
  await anger.press('ArrowRight')
  await anger.press('ArrowRight')
  await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()
  await page.getByPlaceholder('Opisz, o czym ciągle myślisz...').fill('Wracam myślami do rozmowy.')
  await page.getByPlaceholder('Opisz wpływ', { exact: false }).fill('Trudniej mi się skupić.')
  const next = page.getByRole('button', { name: 'Dalej', exact: true })
  await next.click()
  const activities = page.getByPlaceholder('np. wolontariat', { exact: false })
  await activities.nth(0).fill('Spacer')
  await activities.nth(1).fill('Telefon do siostry')
  await activities.nth(2).fill('Wspólne gotowanie')
  await expect(next).toHaveCount(1)
  await next.click()
  await page.getByRole('checkbox', { name: 'Spacer' }).check()
  await expect(next).toHaveCount(1)
  await next.click()
  await expect(page.getByTestId('egp-chip-gniew')).toHaveCount(0)
  await page.getByTestId('egp-quadrant-low-energy-high-pleasantness').click()
  await page.getByTestId('egp-tile-spokoj-i-wyciszenie').click()
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.locator('.exercise-saved')).toBeVisible()
  expect(await savedRows(page, 'dereflectionPractices')).toContainEqual(
    expect.objectContaining({
      emotionsBefore: [{ emotionId: 'gniew', intensity: 2 }],
      emotionFamilyIdsBefore: ['gniew'],
      emotionsAfter: [{ emotionId: 'spokoj-i-wyciszenie' }],
      emotionFamilyIdsAfter: ['spokoj-i-wyciszenie'],
    })
  )
})

test('worry tree rates one selected group twice on its percentage scale', async ({ page }) => {
  await page.goto('/exercises/worry-tree')
  await page.getByPlaceholder('Martwi mnie, że...').fill('Spotkanie się przedłuży.')
  const next = page.getByRole('button', { name: 'Dalej', exact: true })
  await expect(next).toBeDisabled()
  await page.getByTestId('egp-quadrant-high-energy-low-pleasantness').click()
  const anger = page.getByTestId('egp-tile-gniew')
  await anger.click()
  await page.getByTestId('egp-tile-niepokoj-i-zmartwienie').click()
  await expect(anger).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('slider').fill('63')
  await next.click()
  await page.getByRole('button', { name: /Hipotetyczne zmartwienie/ }).click()
  await page.getByRole('button', { name: /Liście na strumieniu/ }).click()
  await page.getByRole('slider').fill('28')
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.locator('.exercise-saved')).toBeVisible()
  expect(await savedRows(page, 'worryTreeEntries')).toContainEqual(
    expect.objectContaining({
      emotionBefore: { emotionId: 'niepokoj-i-zmartwienie', intensity: 63 },
      emotionAfter: { emotionId: 'niepokoj-i-zmartwienie', intensity: 28 },
    })
  )
})

test('thought record keeps individual percentages and shows the group names after reload', async ({
  page,
}) => {
  await page.goto('/exercises/thought-record')
  await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()
  await page.getByPlaceholder(/We wtorek na zebraniu/).fill('Rozmowa przy biurku.')
  const next = page.getByRole('button', { name: 'Dalej', exact: true })
  await next.click()
  await expect(next).toBeDisabled()
  await page.getByTestId('egp-quadrant-high-energy-low-pleasantness').click()
  await page.getByTestId('egp-tile-gniew').click()
  await page.getByRole('slider').fill('81')
  await page.getByTestId('egp-tile-niepokoj-i-zmartwienie').click()
  await page.getByRole('slider').nth(1).fill('57')
  await next.click()
  await page.getByPlaceholder(/Wszyscy pomyślą/).fill('Zabrakło czasu na moją odpowiedź.')
  await next.click()
  await next.click()
  await next.click()
  await page.getByPlaceholder(/Raport wymagał poprawek/).fill('Mogę wrócić do tematu.')
  await next.click()
  await expect(page.getByRole('slider').first()).toHaveValue('81')
  await expect(page.getByRole('slider').nth(1)).toHaveValue('57')
  await page.getByRole('slider').first().fill('34')
  await next.click()
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page.locator('.exercise-saved')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Rozmowa przy biurku.', { exact: true })).toBeVisible()
  await expect(page.getByText('Złość', { exact: true }).first()).toBeVisible()
  expect(await savedRows(page, 'thoughtRecords')).toContainEqual(
    expect.objectContaining({
      emotionsBefore: [
        { emotionId: 'gniew', intensity: 81 },
        { emotionId: 'niepokoj-i-zmartwienie', intensity: 57 },
      ],
      emotionsAfter: [
        { emotionId: 'gniew', intensity: 34 },
        { emotionId: 'niepokoj-i-zmartwienie', intensity: 57 },
      ],
    })
  )
})
