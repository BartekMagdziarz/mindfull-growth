import { expect, test } from '@playwright/test'

test('criterion scope: cancel, preserve old weeks, then correct history, desktop and mobile', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00Z'))
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/')
  await page.waitForFunction(
    () => localStorage.getItem('mindfull_growth_verification_seed_version'),
    undefined,
    { timeout: 90_000 }
  )
  const id = await page.evaluate(async () => {
    const { habitDexieRepository: habits } =
      await import('/src/repositories/habitDexieRepository.ts')
    const { planningStateDexieRepository: state } =
      await import('/src/repositories/planningStateDexieRepository.ts')
    const habit = await habits.create({
      title: 'Historia kryteriów — test',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 6 },
      status: 'open',
    })
    await state.upsertMeasurementMonthState({
      subjectType: 'habit',
      subjectId: habit.id,
      monthRef: '2026-11',
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await state.upsertMeasurementWeekState({
      subjectType: 'habit',
      subjectId: habit.id,
      weekRef: '2026-W45',
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    for (const day of ['09', '10', '11', '12', '13']) {
      await state.upsertMeasurementDayAssignment({
        subjectType: 'habit',
        subjectId: habit.id,
        dayRef: `2026-11-${day}`,
      })
      await state.upsertDailyMeasurementEntry({
        subjectType: 'habit',
        subjectId: habit.id,
        dayRef: `2026-11-${day}`,
        value: null,
      })
    }
    return habit.id
  })
  await page.goto('/objects/habits')
  // Card titles are bound input values.
  await expect(page.getByRole('textbox').first()).toBeVisible()
  const articles = page.locator('article')
  let targetCard = articles.first()
  for (let i = 0; i < (await articles.count()); i++) {
    if (
      (await articles.nth(i).getByRole('textbox').first().inputValue()) ===
      'Historia kryteriów — test'
    ) {
      targetCard = articles.nth(i)
      break
    }
  }
  await targetCard.getByRole('button', { name: 'Pokaż szczegóły' }).click()
  const value = targetCard.getByRole('spinbutton', { name: 'Wartość celu', exact: true })
  await value.fill('5')
  await value.dispatchEvent('change')
  const dialog = page.getByRole('dialog', { name: 'Od kiedy stosować nowe zasady?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Zapisz', exact: true })).toBeEnabled()
  await dialog.getByRole('radio', { name: 'Dla całej historii' }).check()
  await expect(dialog.getByRole('status')).toContainText('Dodatkowo zaliczone: 1')
  await page.screenshot({
    path: 'work/calendar-completion-audit-2026-11-14/criteria-scope-desktop.png',
    animations: 'disabled',
  })
  await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(
    await page.evaluate(async id => {
      const { habitDexieRepository } = await import('/src/repositories/habitDexieRepository.ts')
      return (await habitDexieRepository.getById(id))?.target.value
    }, id)
  ).toBe(6)

  await value.fill('5')
  await value.dispatchEvent('change')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: /Od początku okresu/ }).check()
  await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(targetCard.getByTestId('criteria-version-note')).toContainText('16 lis')
  expect(
    await page.evaluate(async id => {
      const { habitDexieRepository } = await import('/src/repositories/habitDexieRepository.ts')
      const { resolveMeasurementCriteria } = await import('/src/domain/measurementCriteria.ts')
      return resolveMeasurementCriteria((await habitDexieRepository.getById(id))!, '2026-11-09')
        .target.value
    }, id)
  ).toBe(6)

  await value.fill('4')
  await value.dispatchEvent('change')
  await expect(dialog).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await dialog.getByRole('radio', { name: 'Od wybranej daty' }).check()
  const date = dialog.locator('input[type="date"]')
  await date.fill('2026-11-10')
  await expect(dialog.getByRole('alert')).toContainText('pierwszy dzień')
  await expect(dialog.getByRole('button', { name: 'Zapisz', exact: true })).toBeDisabled()
  await dialog.getByRole('radio', { name: 'Dla całej historii' }).check()
  await page.screenshot({
    path: 'work/calendar-completion-audit-2026-11-14/criteria-scope-mobile.png',
    animations: 'disabled',
  })
  await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox').first()).toBeVisible()
  expect(
    await page.evaluate(async id => {
      const { habitDexieRepository } = await import('/src/repositories/habitDexieRepository.ts')
      const { planningStateDexieRepository } =
        await import('/src/repositories/planningStateDexieRepository.ts')
      const { buildMeasurementSummary } = await import('/src/services/measurementProgress.ts')
      const habit = (await habitDexieRepository.getById(id))!
      return buildMeasurementSummary(
        habit,
        await planningStateDexieRepository.listDailyMeasurementEntries(),
        '2026-W45'
      ).evaluationStatus
    }, id)
  ).toBe('met')
  expect(errors).toEqual([])
})

test('archived checklist items agree across calendar, day and object views', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00Z'))
  await page.goto('/')
  await page.waitForFunction(
    () => localStorage.getItem('mindfull_growth_verification_seed_version'),
    undefined,
    { timeout: 90_000 }
  )
  await page.evaluate(async () => {
    const { habitDexieRepository } = await import('/src/repositories/habitDexieRepository.ts')
    const { planningStateDexieRepository: state } =
      await import('/src/repositories/planningStateDexieRepository.ts')
    const habit = await habitDexieRepository.create({
      title: 'Spójna checklista — test',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      entryMode: 'multi-completion',
      cadence: 'weekly',
      status: 'open',
      target: { kind: 'count', operator: 'min', value: 1 },
      multiItems: [
        ...['a', 'b', 'c', 'd'].map(id => ({ id, label: id, weight: 1 })),
        { id: 'old', label: 'Dawny element', weight: 1, archived: true },
      ],
    })
    await state.upsertMeasurementMonthState({
      subjectType: 'habit',
      subjectId: habit.id,
      monthRef: '2026-11',
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await state.upsertMeasurementWeekState({
      subjectType: 'habit',
      subjectId: habit.id,
      weekRef: '2026-W45',
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await state.upsertMeasurementDayAssignment({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: '2026-11-13',
    })
    await state.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: '2026-11-13',
      value: null,
      checkedItemIds: ['a', 'b', 'c', 'd'],
    })
  })
  await page.goto('/calendar/week/2026-W45?view=type:habit')
  const row = page.locator('.rb-series').filter({ hasText: 'Spójna checklista — test' })
  await expect(row).toBeVisible()
  await expect(row.locator('.mg-well--done')).toHaveCount(1)
  await expect(row.locator('.sm-well--partial')).toHaveCount(0)
  await page.screenshot({
    path: 'work/calendar-completion-audit-2026-11-14/checklist-calendar.png',
    animations: 'disabled',
  })
  await page.goto('/today/2026-11-13')
  const day = page.locator('.ndi').filter({ hasText: 'Spójna checklista — test' })
  await expect(day.locator('.ndi__well--fraction')).toHaveText('4/4')
  await expect(day.locator('.ndi__well--fraction')).toHaveClass(/ndi__well--met/)
  await page.goto('/objects/habits')
  await expect(page.getByRole('textbox').first()).toBeVisible()
  expect(
    await page.evaluate(async () => {
      const { loadObjectsLibraryBundle } = await import('/src/services/objectsLibraryQueries.ts')
      const bundle = await loadObjectsLibraryBundle({
        family: 'habits',
        q: 'Spójna checklista — test',
        lifeAreaIds: [],
        priorityIds: [],
        showClosed: false,
      })
      return bundle.items[0].chartData
    })
  ).toEqual([{ periodRef: '2026-W45', actualValue: 1, targetValue: 1, status: 'met' }])
})
