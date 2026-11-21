import { expect, test } from '@playwright/test'

test('history fits short logs four across, bounds journals, and preserves the sort order on mobile', async ({
  page,
}) => {
  await page.goto('/history')
  const cards = page.locator('article.history-card')
  await expect(cards.first()).toBeVisible()
  const types = page.getByRole('group', { name: 'Typ', exact: true })
  await types.getByRole('button', { name: 'Emocje' }).click()
  await expect(cards.first().getByRole('link')).toHaveAttribute('href', /^\/emotions\//)

  const firstRow = () =>
    cards.evaluateAll(elements => {
      const top = elements[0].getBoundingClientRect().top
      return elements.filter(element => Math.abs(element.getBoundingClientRect().top - top) < 1)
        .length
    })
  await expect.poll(firstRow).toBe(4)

  await types.getByRole('button', { name: 'Dziennik' }).click()
  await expect.poll(firstRow).toBe(2)
  const dates = cards.locator('time')
  const newest = await dates.first().evaluate(time => time.getAttribute('datetime') ?? '')
  await page.getByRole('combobox', { name: 'Sortuj' }).selectOption('asc')
  await expect(dates.last()).toHaveAttribute('datetime', newest)

  const order = await dates.evaluateAll(items => items.map(item => item.getAttribute('datetime')))
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(firstRow).toBe(1)
  expect(
    await dates.evaluateAll(items => items.map(item => item.getAttribute('datetime')))
  ).toEqual(order)
  const before = await cards.count()
  await page.getByRole('combobox', { name: 'Data' }).selectOption('today')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeLessThan(before)
})
