import { describe, it, expect, vi } from 'vitest'
import { useMonthlyReflectionDraft } from '@/composables/useMonthlyReflectionDraft'
import { saveDraftToDB, loadDraftFromDB } from '@/services/draftStorage'

describe('useMonthlyReflectionDraft', () => {
  const planId = 'plan-123'
  const storageKey = `monthly-reflection-draft-${planId}`

  it('initializes with defaults when no draft exists', async () => {
    const { draft, ready } = useMonthlyReflectionDraft(planId)
    await ready

    expect(draft.value.activeStep).toBe(0)
    expect(draft.value.directionRatings.projects).toBeNull()
    expect(draft.value.projectReviews).toEqual([])
    expect(draft.value.focusAreaReview).toEqual([])
    expect(draft.value.courseCorrection.start).toEqual([])
  })

  it('loads a partial legacy draft safely', async () => {
    await saveDraftToDB(
      storageKey,
      JSON.stringify({
        activeStep: 3,
        wins: ['One win'],
        directionRatings: { projects: 4 },
        courseCorrection: { start: ['Keep walking'] },
      })
    )

    const { draft, ready } = useMonthlyReflectionDraft(planId)
    await ready

    expect(draft.value.activeStep).toBe(3)
    expect(draft.value.wins).toEqual(['One win'])
    expect(draft.value.directionRatings.projects).toBe(4)
    expect(draft.value.directionRatings.priorities).toBeNull()
    expect(draft.value.courseCorrection.start).toEqual(['Keep walking'])
    expect(draft.value.courseCorrection.stop).toEqual([])
    expect(draft.value.courseCorrection.ifThenPlan).toBe('')
  })

  it('preserves unknown fields while merging defaults', async () => {
    await saveDraftToDB(
      storageKey,
      JSON.stringify({
        activeStep: 2,
        customLegacyField: 'keep-me',
      })
    )

    const { draft, ready } = useMonthlyReflectionDraft(planId)
    await ready

    expect((draft.value as any).customLegacyField).toBe('keep-me')
    expect(draft.value.directionRatings.projects).toBeNull()
  })

  it('persists draft via saveDraft and reloads correctly', async () => {
    const { draft, ready, saveDraft } = useMonthlyReflectionDraft(planId)
    await ready

    draft.value.adjustments = 'Tighten scope'
    draft.value.directionRatings.meaning = 5
    saveDraft()

    // Allow the async save to complete
    await vi.waitFor(async () => {
      const raw = await loadDraftFromDB(storageKey)
      expect(raw).toBeTruthy()

      const parsed = JSON.parse(raw!)
      expect(parsed.adjustments).toBe('Tighten scope')
      expect(parsed.directionRatings.meaning).toBe(5)
    })
  })
})
