import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAssessmentSession } from '@/composables/useAssessmentSession'
import { getProgramDefinition } from '@/data/programCatalog'
import { connectTestDatabase } from '@/test/testDatabase'
import { getUserDatabase } from '@/services/userDatabaseService'
import { createPlan } from '@/services/exercisePlanService'
import { enrollInProgram, ensureCurrentStepMaterialized } from '@/services/programSchedulerService'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { getPeriodRefsForDate } from '@/utils/periods'

const SHAME = getProgramDefinition('shame-compassion')!
// The mid-path SCS-SF measurement ("połowa"), ~22 days after the first one.
const MID_PATH_STEP = SHAME.steps.findIndex(
  (step, index) => index > 0 && step.exerciseSlug === 'scs-sf'
)

async function takeScsSf(session: ReturnType<typeof useAssessmentSession>): Promise<void> {
  for (const item of session.definition.items) await session.saveResponse(item.id, 3)
  session.openReview()
  await session.submit()
}

/** Puts the enrollment on `stepIndex` as if every earlier step was done. */
async function jumpToStep(enrollmentId: string, stepIndex: number): Promise<void> {
  const db = getUserDatabase()
  await db.exercisePlanItems.filter(item => item.sourceRef === enrollmentId).delete()
  const completedAt = new Date().toISOString()
  await db.programEnrollments.update(enrollmentId, {
    currentStepIndex: stepIndex,
    completedSteps: Array.from({ length: stepIndex }, (_, index) => ({
      stepIndex: index,
      completedAt,
    })),
  })
  await ensureCurrentStepMaterialized((await db.programEnrollments.get(enrollmentId))!)
}

describe('path step vs assessment retake lock', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const db = await connectTestDatabase()
    await Promise.all(db.tables.map(table => table.clear()))
    useUserPreferencesStore().$patch({ locale: 'pl', isLoaded: true })
  })

  it('lifts the lock for a path step and ticks it on submit', async () => {
    expect(SHAME.steps[MID_PATH_STEP]?.exerciseSlug).toBe('scs-sf')
    const { enrollment } = await enrollInProgram('shame-compassion')
    const db = getUserDatabase()

    const first = useAssessmentSession('scs-sf')
    await first.initialize()
    first.goToConsent()
    first.consentAccepted.value = true
    await first.startNewAttemptAfterConsent()
    await takeScsSf(first)
    await vi.waitFor(async () => {
      expect((await db.programEnrollments.get(enrollment.id))?.currentStepIndex).toBe(1)
    })
    // Step 1 done, the path moved on to FSCRS: the 4-week lock applies.
    await vi.waitFor(() => expect(first.retakeStatus.value.canRetake).toBe(false))
    expect(first.retakeStatus.value.requestedByPath).toBe(false)

    await jumpToStep(enrollment.id, MID_PATH_STEP)

    const mid = useAssessmentSession('scs-sf')
    await mid.initialize()
    expect(mid.retakeStatus.value).toMatchObject({ canRetake: true, requestedByPath: true })

    await mid.startRetake()
    await takeScsSf(mid)
    await vi.waitFor(async () => {
      const stored = await db.programEnrollments.get(enrollment.id)
      expect(stored?.currentStepIndex).toBe(MID_PATH_STEP + 1)
      expect(stored?.completedSteps.at(-1)).toMatchObject({
        stepIndex: MID_PATH_STEP,
        recordId: mid.currentAttemptId.value,
      })
    })
    // The step is ticked, so the lock is back for standalone retests.
    await vi.waitFor(() => expect(mid.retakeStatus.value.canRetake).toBe(false))
    expect(mid.retakeStatus.value.requestedByPath).toBe(false)
  })

  it('keeps the lock for a plain repeat plan', async () => {
    const first = useAssessmentSession('scs-sf')
    await first.initialize()
    first.goToConsent()
    first.consentAccepted.value = true
    await first.startNewAttemptAfterConsent()
    await takeScsSf(first)
    await vi.waitFor(async () => {
      expect(await getUserDatabase().exerciseCompletions.count()).toBe(1)
    })
    await createPlan('scs-sf', getPeriodRefsForDate(new Date()).day, 'repeat')

    const again = useAssessmentSession('scs-sf')
    await again.initialize()
    expect(again.retakeStatus.value).toMatchObject({ canRetake: false, requestedByPath: false })
  })
})
