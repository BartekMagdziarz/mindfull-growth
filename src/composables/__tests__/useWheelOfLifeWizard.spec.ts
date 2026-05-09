import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWheelOfLifeWizard } from '@/composables/useWheelOfLifeWizard'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'

describe('useWheelOfLifeWizard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-wheel-assessment')

    const db = getUserDatabase()
    await db.lifeAreas.clear()
    await db.lifeAreaAssessments.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  it('enters setup mode when there are no active life areas', async () => {
    const wizard = useWheelOfLifeWizard({ mode: 'standalone' })

    await wizard.initialize()

    expect(wizard.needsSetup.value).toBe(true)
    expect(wizard.areas.value).toHaveLength(0)
  })

  it('creates a full assessment using active life areas and prefilled desired states', async () => {
    const lifeAreaStore = useLifeAreaStore()
    const assessmentStore = useLifeAreaAssessmentStore()

    const health = await lifeAreaStore.createLifeArea({
      name: 'Health',
      desiredState: 'Strong and energized',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 0,
    })

    const wizard = useWheelOfLifeWizard({ mode: 'standalone' })
    await wizard.initialize()

    expect(wizard.areas.value[0].visionSnapshot).toBe('Strong and energized')
    expect(wizard.steps.value.map((step) => step.id)).toHaveLength(3)

    wizard.rateArea(0, 8)
    wizard.setAreaPositiveInfluences(0, 'Weekly routines are finally sticking')
    wizard.setAreaNegativeInfluences(0, 'Sleep was inconsistent')
    wizard.setAreaVisionSnapshot(0, 'Train four times per week')
    wizard.notes.value = 'Overall momentum is improving'

    const createdId = await wizard.save()

    expect(assessmentStore.assessments).toHaveLength(1)
    expect(assessmentStore.getAssessmentById(createdId)?.items).toEqual([
      expect.objectContaining({
        lifeAreaId: health.id,
        lifeAreaNameSnapshot: 'Health',
        score: 8,
        visionSnapshot: 'Train four times per week',
        details: {
          positiveInfluences: 'Weekly routines are finally sticking',
          negativeInfluences: 'Sleep was inconsistent',
        },
      }),
    ])
  })

  it('reopens an existing assessment and updates it instead of creating a new one', async () => {
    const lifeAreaStore = useLifeAreaStore()
    const assessmentStore = useLifeAreaAssessmentStore()

    const health = await lifeAreaStore.createLifeArea({
      name: 'Health',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 0,
    })

    const existing = await assessmentStore.createAssessment({
      scope: 'full',
      notes: 'Initial note',
      lifeAreaIds: [health.id],
      items: [
        {
          lifeAreaId: health.id,
          lifeAreaNameSnapshot: 'Health',
          score: 5,
          note: 'Baseline',
        },
      ],
    })

    const wizard = useWheelOfLifeWizard({
      mode: 'standalone',
      assessmentId: existing.id,
    })
    await wizard.initialize()

    expect(wizard.areas.value[0].positiveInfluences).toBe('Baseline')

    wizard.rateArea(0, 9)
    wizard.setAreaPositiveInfluences(0, 'Updated positive context')
    wizard.setAreaNegativeInfluences(0, 'Updated negative context')

    const savedId = await wizard.save()

    expect(savedId).toBe(existing.id)
    expect(assessmentStore.assessments).toHaveLength(1)
    expect(assessmentStore.getAssessmentById(existing.id)?.items[0]).toEqual(
      expect.objectContaining({
        score: 9,
        note: undefined,
        details: {
          positiveInfluences: 'Updated positive context',
          negativeInfluences: 'Updated negative context',
        },
      }),
    )
  })

  it('creates one main wizard step per active life area', async () => {
    const lifeAreaStore = useLifeAreaStore()

    await lifeAreaStore.createLifeArea({
      name: 'Health',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 0,
    })
    await lifeAreaStore.createLifeArea({
      name: 'Work',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 1,
    })

    const wizard = useWheelOfLifeWizard({ mode: 'standalone' })
    await wizard.initialize()

    expect(wizard.steps.value.map((step) => step.id)).toEqual([
      'intro',
      expect.stringMatching(/^rate-/),
      expect.stringMatching(/^rate-/),
      'reflect',
    ])

    wizard.next()
    expect(wizard.isRatingStep.value).toBe(true)
    expect(wizard.currentAreaIndex.value).toBe(0)

    wizard.next()
    expect(wizard.isRatingStep.value).toBe(true)
    expect(wizard.currentAreaIndex.value).toBe(1)

    wizard.next()
    expect(wizard.currentStepDef.value?.id).toBe('reflect')
  })
})
