import { expect, test, type Page } from '@playwright/test'
import type { MonthRef } from '../src/domain/period'
import { getPeriodRefsForDate, getPreviousPeriod } from '../src/utils/periods'

/**
 * Legacy Month V2 experiment (`?ui=legacy&layout=v2`) against the seeded
 * verification app. Planning Next is the product default; this suite preserves
 * the older renderer as an explicit regression surface until it is retired.
 *
 * The previous month is intentionally used for the read-only dashboard checks:
 * it is closed and contains the verification fixture's monthly reflection,
 * weekly reflections, priorities, planned objects, journal entries and emotions.
 */

const refs = getPeriodRefsForDate(new Date())
const prevMonth = getPreviousPeriod(refs.month) as MonthRef

const SEED_MARKER_KEY = 'mindfull_growth_verification_seed_version'

async function bootSeededApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(
    (key: string) => window.localStorage.getItem(key) !== null,
    SEED_MARKER_KEY,
    { timeout: 90_000 }
  )
  await expect(page).not.toHaveURL(/login/)
}

async function openMonthV2(page: Page, monthRef: MonthRef, extra = ''): Promise<void> {
  await page.goto(`/calendar/month/${monthRef}?ui=legacy&layout=v2${extra}`)
  await expect(page.getByTestId('month-v2-time-panel')).toBeVisible()
  await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
  await expect(page.getByTestId('month-v2-lower-panel')).toBeVisible()
}

async function openPlanningMatrix(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Utwórz|Edytuj) plan$/ }).click()
  await expect(page.getByTestId('monthly-reflection-wizard')).toBeVisible()

  // A saved draft resumes on the weeks step. A fresh ritual starts on plan and
  // needs one advance, so do not assume the footer button always exists.
  if (!(await page.getByTestId('monthly-planner').isVisible())) {
    await page.getByRole('button', { name: /^(Dalej|Next)$/ }).click()
  }

  await expect(page.getByTestId('monthly-planner')).toBeVisible()
  await expect(page.getByTestId('assignment-matrix')).toBeVisible()
}

async function expectOverviewContract(page: Page): Promise<void> {
  const weekCards = page.locator('.month-v2__week')
  const radars = page.locator('.week-radar')
  const weekCount = await weekCards.count()

  expect(weekCount).toBeGreaterThanOrEqual(4)
  expect(weekCount).toBeLessThanOrEqual(6)
  await expect(radars).toHaveCount(weekCount)

  // The month chart always exposes the five canonical monthly-reflection axes.
  const monthAxes = page.locator('.month-dimension__axis')
  await expect(monthAxes).toHaveCount(5)
  expect(
    await monthAxes.evaluateAll(nodes =>
      nodes.every(node => node.getAttribute('data-axis-key')?.endsWith('Rating'))
    )
  ).toBe(true)

  // Weekly reflection has exactly two public series. In particular, the old
  // actions/działania layer must not leak into the radar DOM or accessible copy.
  const renderedSeries = await page
    .locator('.week-radar [data-series]')
    .evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.series))
  expect(renderedSeries.length).toBeGreaterThan(0)
  expect(renderedSeries).toContain('requirements')
  expect(renderedSeries).toContain('state')
  expect(renderedSeries.every(series => series === 'requirements' || series === 'state')).toBe(true)
  await expect(page.locator('.week-radar [data-series="actions"]')).toHaveCount(0)
  await expect(page.getByTestId('month-v2-time-panel')).not.toContainText(/Działania|Actions/i)

  // The overview selector is one shared flat surface: six direct cells, no
  // individually raised cards or shadows.
  const categories = page.locator('.month-v2__category')
  await expect(categories).toHaveCount(6)
  expect(
    await categories.evaluateAll(nodes =>
      nodes.every(node => {
        const style = getComputedStyle(node)
        return !node.classList.contains('neo-raised') && style.boxShadow === 'none'
      })
    )
  ).toBe(true)

  await expect(page.locator('.month-v2__category .month-progress-ring')).toHaveCount(2)
  await expect(page.getByTestId('monthly-planner')).toHaveCount(0)
}

test.describe('month V2 experiment', () => {
  test('renders the new overview contract', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)
    await expectOverviewContract(page)
  })

  test('legacy baseline remains available explicitly next to the experiment', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    await page.goto(`/calendar/month/${prevMonth}?ui=legacy`)
    await expect(page.getByTestId('monthly-planner')).toBeVisible()
    await expect(page.getByTestId('month-v2-time-panel')).toHaveCount(0)
    await expect(page.getByTestId('month-v2-lower-panel')).toHaveCount(0)
  })

  test('focus is URL-backed, survives reload and returns through the dock', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    const historyLength = await page.evaluate(() => window.history.length)
    await page.locator('[data-focus-key="goals"]').click()

    await expect(page).toHaveURL(/(?:\?|&)focus=goals(?:&|$)/)
    await expect(page.locator('.month-v2__stage')).toHaveClass(/month-v2__stage--focused/)
    await expect(page.locator('.month-v2__focus-row')).not.toHaveCount(0)
    await expect(page.locator('.month-v2__dock')).toBeVisible()
    // Focus changes replace the current experiment entry instead of creating
    // a noisy history entry for every morph.
    await expect.poll(() => page.evaluate(() => window.history.length)).toBe(historyLength)

    await page.reload()
    await expect(page).toHaveURL(/(?:\?|&)focus=goals(?:&|$)/)
    await expect(page.locator('.month-v2__dock')).toBeVisible()
    await expect(page.locator('.month-v2__focus-row')).not.toHaveCount(0)

    const dockItems = page.locator('.month-v2__dock-item')
    await expect(dockItems).toHaveCount(6)
    // In goals focus the first remaining category is habits.
    await dockItems.first().click()
    await expect(page).toHaveURL(/(?:\?|&)focus=habits(?:&|$)/)
    await expect.poll(() => page.evaluate(() => window.history.length)).toBe(historyLength)

    await page.locator('.month-v2__dock-back').click()
    await expect(page.locator('.month-v2__categories')).toBeVisible()
    await expect(page.locator('.month-v2__stage')).not.toHaveClass(/month-v2__stage--focused/)
    await expect.poll(() => new URL(page.url()).searchParams.has('focus')).toBe(false)
  })

  test('renders object rows and the focus dock for goals, habits and trackers', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    for (const focus of ['goals', 'habits', 'trackers'] as const) {
      await openMonthV2(page, prevMonth, `&focus=${focus}`)
      await expect(page.locator('.month-v2__stage')).toHaveClass(/month-v2__stage--focused/)
      expect(await page.locator('.month-v2__focus-row').count()).toBeGreaterThan(0)
      expect(await page.locator('.month-v2__focus-row .month-series').count()).toBeGreaterThan(0)
      await expect(page.locator('.month-v2__dock-item')).toHaveCount(6)
      await expect(page.getByTestId('monthly-planner')).toHaveCount(0)
    }
  })

  test('uses compact aggregate row counts for intentions, emotions and journal', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)

    const expectedRows: Record<'intentions' | 'emotions' | 'journal', number> = {
      intentions: 1,
      emotions: 1,
      journal: 2,
    }

    for (const focus of ['intentions', 'emotions', 'journal'] as const) {
      await openMonthV2(page, prevMonth, `&focus=${focus}`)
      await expect(page.locator('.month-v2__focus-row')).toHaveCount(expectedRows[focus]!)
      await expect(page.locator('.month-v2__focus-row .month-focus-series')).toHaveCount(
        expectedRows[focus]!
      )
      await expect(page.locator('.month-v2__dock-item')).toHaveCount(6)
    }

    await expect(page.locator('[data-row-key="journal:daily"]')).toBeVisible()
    await expect(page.locator('[data-row-key="journal:reflections"]')).toBeVisible()
  })

  test('keeps the month/week seam on desktop and reflows safely on tablet and mobile', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    const desktopGeometry = await page.evaluate(() => {
      const month = document.querySelector('.month-v2__month')!.getBoundingClientRect()
      const weeks = document.querySelector('.month-v2__weeks')!.getBoundingClientRect()
      const priorities = document.querySelector('.month-v2__priorities')!.getBoundingClientRect()
      const categories = document.querySelector('.month-v2__categories')!.getBoundingClientRect()
      return {
        monthShare: month.width / (month.width + weeks.width),
        topSeam: month.right,
        lowerSeam: priorities.right,
        weeksStart: weeks.left,
        categoriesStart: categories.left,
      }
    })
    expect(desktopGeometry.monthShare).toBeGreaterThan(0.41)
    expect(desktopGeometry.monthShare).toBeLessThan(0.47)
    expect(Math.abs(desktopGeometry.topSeam - desktopGeometry.weeksStart)).toBeLessThan(2)
    expect(Math.abs(desktopGeometry.lowerSeam - desktopGeometry.categoriesStart)).toBeLessThan(2)
    expect(Math.abs(desktopGeometry.topSeam - desktopGeometry.lowerSeam)).toBeLessThan(4)

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(page.locator('.month-v2__weeks')).toBeVisible()
    expect(
      await page
        .locator('.month-v2__week-scroll')
        .evaluate(node => getComputedStyle(node).overflowX)
    ).toBe('auto')
    await expect(page.locator('.week-radar')).toHaveCount(
      await page.locator('.month-v2__week').count()
    )

    await page.setViewportSize({ width: 390, height: 844 })
    const mobileGeometry = await page.evaluate(() => {
      const month = document.querySelector('.month-v2__month')!.getBoundingClientRect()
      const weeks = document.querySelector('.month-v2__weeks')!.getBoundingClientRect()
      const weekScroll = document.querySelector('.month-v2__week-scroll')!
      const categoryGrid = document.querySelector('.month-v2__categories')!
      const dashboard = document.querySelector('.month-v2')!.getBoundingClientRect()
      return {
        monthBottom: month.bottom,
        weeksTop: weeks.top,
        weekStripScrolls: weekScroll.scrollWidth > weekScroll.clientWidth,
        categoryColumns: getComputedStyle(categoryGrid).gridTemplateColumns.split(' ').length,
        dashboardFitsViewport: dashboard.left >= 0 && dashboard.right <= window.innerWidth,
      }
    })
    expect(mobileGeometry.monthBottom).toBeLessThanOrEqual(mobileGeometry.weeksTop)
    expect(mobileGeometry.weekStripScrolls).toBe(true)
    expect(mobileGeometry.categoryColumns).toBe(2)
    expect(mobileGeometry.dashboardFitsViewport).toBe(true)
  })

  test('supports keyboard focus and reduced motion during the morph', async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    const goals = page.locator('[data-focus-key="goals"]')
    await goals.focus()
    await expect(goals).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/(?:\?|&)focus=goals(?:&|$)/)

    const transitionDurations = await page.locator('.month-v2__stage').evaluate(node =>
      getComputedStyle(node)
        .transitionDuration.split(',')
        .map(value =>
          value.trim().endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
        )
    )
    expect(transitionDurations.every(duration => duration <= 100)).toBe(true)

    const back = page.locator('.month-v2__dock-back')
    await back.focus()
    await expect(back).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.month-v2__categories')).toBeVisible()
    await expect.poll(() => new URL(page.url()).searchParams.has('focus')).toBe(false)
  })

  test('planning mode hosts the current assignment matrix and persists a toggle', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, refs.month)

    await openPlanningMatrix(page)

    const cell = page.locator('[data-testid^="matrix-cell-keyResult:"]').first()
    const testId = await cell.getAttribute('data-testid')
    const pressed = await cell.getAttribute('aria-pressed')
    await cell.click()
    const flipped = pressed === 'true' ? 'false' : 'true'
    await expect(page.getByTestId(testId!)).toHaveAttribute('aria-pressed', flipped, {
      timeout: 15_000,
    })

    await page.reload()
    await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
    await openPlanningMatrix(page)
    await expect(page.getByTestId(testId!)).toHaveAttribute('aria-pressed', flipped, {
      timeout: 15_000,
    })

    // Restore the fixture so repeated verification runs stay deterministic.
    await page.getByTestId(testId!).click()
    await expect(page.getByTestId(testId!)).toHaveAttribute('aria-pressed', pressed!, {
      timeout: 15_000,
    })
  })

  test('reflection opens the shared monthly wizard and returns to V2', async ({ page }) => {
    test.setTimeout(120_000)
    await bootSeededApp(page)
    await openMonthV2(page, prevMonth)

    await page.getByRole('button', { name: /refleksj/i }).click()
    await expect(page.getByTestId('monthly-reflection-wizard')).toBeVisible()

    await page.getByRole('button', { name: /^(Zamknij|Close)$/ }).click()
    await expect(page.getByTestId('month-v2-week-grid')).toBeVisible()
    expect(page.url()).toContain('layout=v2')
  })
})
