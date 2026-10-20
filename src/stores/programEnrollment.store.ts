import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Program Enrollment Store
 *
 * In-memory view of the `programEnrollments` table. Read by the
 * "Ścieżki" tab, the program detail view and the Today program tile;
 * every write goes through `programSchedulerService` and patches the
 * cache in place. Advanced enrollments arrive via `applyUpdate()` from
 * the completions store; plan-item side effects (materialized /
 * skipped / deleted step items) are mirrored into the exercise-plan
 * store so the Today tiles react without a reload.
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { ProgramEnrollment } from '@/domain/program'
import { isDeliveringEnrollment } from '@/domain/program'
import { getProgramDefinition } from '@/data/programCatalog'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import {
  type PracticeReconciliation,
  abandonEnrollment as abandonEnrollmentService,
  enrollInProgram as enrollInProgramService,
  pauseEnrollment as pauseEnrollmentService,
  resumeEnrollment as resumeEnrollmentService,
  runProgramScheduler,
  skipOptionalStep as skipOptionalStepService,
  undoLastStep as undoLastStepService,
} from '@/services/programSchedulerService'
import { setPracticeOverrides as setPracticeOverridesService } from '@/services/programFollowUpService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { reportError } from '@/utils/reportError'

export const useProgramEnrollmentStore = defineStore('programEnrollment', () => {
  const sessionScope = createStoreSessionScope()
  const enrollments = ref<ProgramEnrollment[]>([])
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const activeEnrollments = computed(() =>
    enrollments.value
      .filter(enrollment => enrollment.status === 'active')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  )

  /**
   * Enrollments that still deliver steps: active ones plus closed paths
   * with a follow-up step ahead ("Powrót"). Today's path panel reads this
   * so the follow-up measure shows up on its day.
   */
  const deliveringEnrollments = computed(() =>
    enrollments.value
      .filter(enrollment => {
        const program = getProgramDefinition(enrollment.programSlug)
        return program ? isDeliveringEnrollment(program, enrollment) : false
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  )

  /**
   * The enrollment a program's card/detail should show: the open
   * (active/paused) one, else the latest completed — abandoned rows
   * render as not-enrolled so the program can be started again.
   */
  const enrollmentForProgram = computed(() => {
    return (programSlug: string): ProgramEnrollment | undefined => {
      const byNewest = enrollments.value
        .filter(enrollment => enrollment.programSlug === programSlug)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return (
        byNewest.find(e => e.status === 'active' || e.status === 'paused') ??
        byNewest.find(e => e.status === 'completed')
      )
    }
  })

  async function loadEnrollments(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        enrollments.value = await operation.wait(programEnrollmentDexieRepository.listAll())
        isLoaded.value = true
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load program enrollments'
        reportError('programEnrollmentStore.loadEnrollments', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Hydrates the store from Dexie at most once. After a failed load
   * `isLoaded` stays false, so the next caller retries.
   */
  async function ensureLoaded(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      if (isLoaded.value || isLoading.value) return
      await operation.wait(loadEnrollments())
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Replace-by-id or append — used by our own actions and by the
   * completions store after program advancement. No-op before the
   * first load: the eventual `loadEnrollments()` fetches fresh rows.
   */
  function applyUpdate(enrollment: ProgramEnrollment): void {
    if (!isLoaded.value) return
    const index = enrollments.value.findIndex(existing => existing.id === enrollment.id)
    if (index === -1) {
      enrollments.value.push(enrollment)
    } else {
      enrollments.value[index] = enrollment
    }
  }

  function mirrorPlanItem(item: ExercisePlanItem | null): void {
    if (item) useExercisePlanStore().applyUpdate(item)
  }

  function mirrorRemovals(removedPlanIds: string[]): void {
    const planStore = useExercisePlanStore()
    for (const id of removedPlanIds) planStore.applyRemoval(id)
  }

  function mirrorPractices(practices: PracticeReconciliation | undefined): void {
    if (!practices) return
    for (const item of practices.created) mirrorPlanItem(item)
    mirrorRemovals(practices.removedPlanIds)
  }

  async function enroll(programSlug: string): Promise<ProgramEnrollment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, planItem, practices } = await operation.wait(
      enrollInProgramService(programSlug)
    )
    applyUpdate(enrollment)
    mirrorPlanItem(planItem)
    mirrorPractices(practices)
    return enrollment
  }

  async function pause(id: string): Promise<ProgramEnrollment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, removedPlanIds } = await operation.wait(pauseEnrollmentService(id))
    applyUpdate(enrollment)
    mirrorRemovals(removedPlanIds)
    return enrollment
  }

  async function resume(id: string): Promise<ProgramEnrollment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, planItem, practices } = await operation.wait(resumeEnrollmentService(id))
    applyUpdate(enrollment)
    mirrorPlanItem(planItem)
    mirrorPractices(practices)
    return enrollment
  }

  async function abandon(id: string): Promise<ProgramEnrollment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, removedPlanIds } = await operation.wait(abandonEnrollmentService(id))
    applyUpdate(enrollment)
    mirrorRemovals(removedPlanIds)
    return enrollment
  }

  async function skipStep(id: string): Promise<ProgramEnrollment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, skippedPlan, nextPlanItem, practices } = await operation.wait(
      skipOptionalStepService(id)
    )
    applyUpdate(enrollment)
    mirrorPlanItem(skippedPlan)
    mirrorPlanItem(nextPlanItem)
    mirrorPractices(practices)
    return enrollment
  }

  /** "Cofnij": the last completed step becomes current again; its old pending items leave the cache. */
  async function undoStep(id: string): Promise<ProgramEnrollment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, removedPlanIds, planItem, practices } = await operation.wait(
      undoLastStepService(id)
    )
    applyUpdate(enrollment)
    mirrorRemovals(removedPlanIds)
    mirrorPlanItem(planItem)
    mirrorPractices(practices)
    return enrollment
  }

  /** Dose check decided: rhythm overrides written, practice items reconciled and mirrored. */
  async function applyPracticeOverrides(
    id: string,
    overrides: Record<string, { everyDays: number }>
  ): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const { enrollment, practices } = await operation.wait(
      setPracticeOverridesService(id, overrides)
    )
    applyUpdate(enrollment)
    mirrorPractices(practices)
  }

  /** Knowledge card opened and closed with "Przeczytane" — a marker, never a gate. */
  async function markCardRead(id: string, cardKey: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const current = enrollments.value.find(enrollment => enrollment.id === id)
    if (!current || current.readCards?.includes(cardKey)) return
    const updated = await operation.wait(
      programEnrollmentDexieRepository.update(id, {
        readCards: [...(current.readCards ?? []), cardKey],
      })
    )
    applyUpdate(updated)
  }

  /** The letter to a future self was opened — "Najbliżej" shows it as read from now on. */
  async function markFutureLetterRead(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    const current = enrollments.value.find(enrollment => enrollment.id === id)
    if (!current?.futureLetter || current.futureLetter.readAt) return
    const updated = await operation.wait(
      programEnrollmentDexieRepository.update(id, {
        futureLetter: { ...current.futureLetter, readAt: new Date().toISOString() },
      })
    )
    applyUpdate(updated)
  }

  /**
   * Today-load reconciler (design D2's safety net). Never throws — a
   * scheduler failure must not break the Today view; materialized
   * items are mirrored into the plan store.
   */
  async function runScheduler(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      try {
        const created = await operation.wait(runProgramScheduler())
        for (const item of created) mirrorPlanItem(item)
      } catch (err) {
        if (!operation.isCurrent()) return
        reportError('programEnrollmentStore.runScheduler', err)
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    sessionScope.reset()
    enrollments.value = []
    isLoaded.value = false
    isLoading.value = false
    error.value = null
  }

  return {
    enrollments,
    isLoaded,
    isLoading,
    error,
    activeEnrollments,
    deliveringEnrollments,
    enrollmentForProgram,
    loadEnrollments,
    ensureLoaded,
    applyUpdate,
    enroll,
    pause,
    resume,
    abandon,
    skipStep,
    undoStep,
    markCardRead,
    markFutureLetterRead,
    applyPracticeOverrides,
    runScheduler,
    reset,
  }
})
