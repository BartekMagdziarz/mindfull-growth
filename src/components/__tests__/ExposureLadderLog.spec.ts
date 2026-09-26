import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import ExposureLadderLog from '../exercises/ExposureLadderLog.vue'
import type { GradedExposureHierarchy } from '@/domain/exercises'
import { useGradedExposureStore } from '@/stores/gradedExposure.store'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

function hierarchy(): GradedExposureHierarchy {
  return {
    id: 'h1',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    fearTarget: 'Phone calls',
    ultimateGoal: 'Call without delay',
    safetyBehaviors: ['Script on paper'],
    items: [
      { id: 'r-high', situation: 'Call the office', sudsRating: 75, completed: false, attempts: [] },
      { id: 'r-low', situation: 'Call the pharmacy', sudsRating: 30, completed: false, attempts: [] },
    ],
  }
}

describe('ExposureLadderLog', () => {
  it('lists rungs from the lowest SUDS up', () => {
    render(ExposureLadderLog, { props: { hierarchy: hierarchy() } })
    const rungs = screen.getAllByText(/^Call the/).map((node) => node.textContent)
    expect(rungs).toEqual(['Call the pharmacy', 'Call the office'])
  })

  it('appends an attempt to the rung, can mark it mastered, and records a completion', async () => {
    const store = useGradedExposureStore()
    const update = vi.spyOn(store, 'updateHierarchy').mockResolvedValue(hierarchy())
    const record = vi.spyOn(useExerciseCompletionsStore(), 'record').mockResolvedValue({} as never)
    const { container } = render(ExposureLadderLog, { props: { hierarchy: hierarchy() } })

    await fireEvent.click(screen.getAllByRole('button', { name: 'Log attempt' })[0]!)
    await fireEvent.click(screen.getByRole('button', { name: 'Script on paper' }))
    await fireEvent.click(container.querySelector('input[type="checkbox"]')!)
    await fireEvent.submit(container.querySelector('form')!)

    expect(update).toHaveBeenCalledTimes(1)
    const [id, patch] = update.mock.calls[0]!
    expect(id).toBe('h1')
    const low = patch.items!.find((item) => item.id === 'r-low')!
    expect(low.completed).toBe(true)
    expect(low.attempts).toHaveLength(1)
    expect(low.attempts[0]).toMatchObject({ anxietyBefore: 30, anxietyPeak: 30, anxietyAfter: 10, safetyBehaviorsUsed: ['Script on paper'] })
    expect(patch.items!.find((item) => item.id === 'r-high')!.attempts).toHaveLength(0)
    expect(record).toHaveBeenCalledWith('graded-exposure', 'h1')
  })
})
