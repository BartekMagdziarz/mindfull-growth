import { expect, test } from '@playwright/test'
import { getPeriodRefsForDate } from '../src/utils/periods'

test('restarting a path leaves only the new approach in this week’s reflection', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const week = getPeriodRefsForDate(new Date()).week
  await page.goto('/')
  await page.waitForFunction(
    () => window.localStorage.getItem('mindfull_growth_verification_seed_version') !== null,
    null,
    {
      timeout: 90_000,
    }
  )
  await expect(page).not.toHaveURL(/login/)

  const openReflection = async () => {
    await page.goto(`/calendar/week/${week}?action=reflect`)
    await expect(page.locator('.qr-arrow--next')).toBeVisible()
    for (let i = 0; i < 8 && !(await page.locator('.qr-path-step').isVisible()); i += 1) {
      await page.locator('.qr-arrow--next').click()
    }
    const block = page.locator('.qr-path-block', { hasText: 'Ze wstydu do współczucia' })
    await expect(block).toHaveCount(1)
    await expect(block).toBeVisible()
    return block
  }

  // The seed has an accepted task for the old approach in this week.
  await expect(await openReflection()).toContainText('Użyj swojej odpowiedzi na wstyd')

  await page.goto('/exercises/programs/shame-compassion')
  await page.getByTestId('path-restart').click()
  await page.getByRole('button', { name: 'Zacznij od nowa', exact: true }).click()
  await expect(page.locator('.mg-v2-page-head__eyebrow')).toContainText('Tydzień 1 z 8')

  const block = await openReflection()
  await expect(block.locator('.qr-path-block__head')).toContainText('1 z 8')
  await expect(block).not.toContainText('Użyj swojej odpowiedzi na wstyd')
  // Reopening the reflection reads the persisted restart the same way.
  await openReflection()
})
