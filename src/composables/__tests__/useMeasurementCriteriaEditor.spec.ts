import { beforeEach, describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useMeasurementCriteriaEditor } from '../useMeasurementCriteriaEditor'
import { habitDexieRepository as habits } from '@/repositories/habitDexieRepository'
import { normalizeHabitPayload } from '@/domain/planning'
import { planningStateDexieRepository as state } from '@/repositories/planningStateDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef } from '@/domain/period'

beforeEach(resetPlanningTestData)
async function setup() {
  const habit = await habits.create({
    title: 'Training',
    entryMode: 'completion',
    cadence: 'weekly',
    status: 'open',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    target: { kind: 'count', operator: 'min', value: 6 },
  })
  await state.upsertDailyMeasurementEntry({
    subjectType: 'habit',
    subjectId: habit.id,
    dayRef: '2026-11-09' as DayRef,
    value: null,
  })
  const scope = effectScope()
  const editor = scope.run(useMeasurementCriteriaEditor)!
  return { habit, scope, editor }
}

describe('criterion edit scope selection', () => {
  it('cancels cleanly when the editor unmounts before history has loaded', async () => {
    const { habit, scope, editor } = await setup()
    const edit = editor.edit('habit', habits, normalizeHabitPayload, habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
    })
    scope.stop()
    expect(await edit).toBeUndefined()
    expect(editor.request.value).toBeNull()
    expect((await habits.getById(habit.id))?.target.value).toBe(6)
  })

  it('does not write before choosing, and cancel preserves the definition', async () => {
    const { habit, scope, editor } = await setup()
    const edit = editor.edit('habit', habits, normalizeHabitPayload, habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
    })
    await flushPromises()
    await expect.poll(() => editor.request.value?.subject.id).toBe(habit.id)
    expect((await habits.getById(habit.id))?.target.value).toBe(6)
    editor.choose(null)
    expect(await edit).toBeUndefined()
    expect((await habits.getById(habit.id))?.criteriaVersions).toBeUndefined()
    scope.stop()
  })

  it('writes the selected scope and resolves an unmounted pending dialog as cancelled', async () => {
    const { habit, scope, editor } = await setup()
    const edit = editor.edit('habit', habits, normalizeHabitPayload, habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
    })
    await expect.poll(() => Boolean(editor.request.value)).toBe(true)
    editor.choose({ scope: 'all-history' })
    expect((await edit)?.criteriaVersions?.[0].effectiveFrom).toBe('0001-01-01')
    const nextEdit = editor.edit('habit', habits, normalizeHabitPayload, habit.id, {
      target: { kind: 'count', operator: 'min', value: 4 },
    })
    await expect.poll(() => Boolean(editor.request.value)).toBe(true)
    scope.stop()
    expect(await nextEdit).toBeUndefined()
    expect((await habits.getById(habit.id))?.target.value).toBe(5)
  })

  it('does not replace a pending edit with a second autosave', async () => {
    const { habit, scope, editor } = await setup()
    const first = editor.edit('habit', habits, normalizeHabitPayload, habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
    })
    const second = await editor.edit('habit', habits, normalizeHabitPayload, habit.id, {
      target: { kind: 'count', operator: 'min', value: 3 },
    })
    expect(second).toBeUndefined()
    await expect.poll(() => Boolean(editor.request.value)).toBe(true)
    editor.choose({ scope: 'all-history' })
    expect((await first)?.target.value).toBe(5)
    scope.stop()
  })
})
