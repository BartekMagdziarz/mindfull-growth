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
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import {
  abandonEnrollment as abandonEnrollmentService,
  enrollInProgram as enrollInProgramService,
  pauseEnrollment as pauseEnrollmentService,
  resumeEnrollment as resumeEnrollmentService,
  runProgramScheduler,
  skipOptionalStep as skipOptionalStepService,
} from '@/services/programSchedulerService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'

export const useProgramEnrollmentStore = defineStore('programEnrollment', () => {
  const enrollments = ref<ProgramEnrollment[]>([])
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const activeEnrollments = computed(() =>
    enrollments.value
      .filter((enrollment) => enrollment.status === 'active')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  )

  /**
   * The enrollment a program's card/detail should show: the open
   * (active/paused) one, else the latest completed — abandoned rows
   * render as not-enrolled so the program can be started again.
   */
  const enrollmentForProgram = computed(() => {
    return (programSlug: string): ProgramEnrollment | undefined => {
      const byNewest = enrollments.value
        .filter((enrollment) => enrollment.programSlug === programSlug)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return (
        byNewest.find((e) => e.status === 'active' || e.status === 'paused') ??
        byNewest.find((e) => e.status === 'completed')
      )
    }
  })

  async function loadEnrollments(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      enrollments.value = await programEnrollmentDexieRepository.listAll()
      isLoaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load program enrollments'
      console.error('Error loading program enrollments:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Hydrates the store from Dexie at most once. After a failed load
   * `isLoaded` stays false, so the next caller retries.
   */
  async function ensureLoaded(): Promise<void> {
    if (isLoaded.value || isLoading.value) return
    await loadEnrollments()
  }

  /**
   * Replace-by-id or append — used by our own actions and by the
   * completions store after program advancement. No-op before the
   * first load: the eventual `loadEnrollments()` fetches fresh rows.
   */
  function applyUpdate(enrollment: ProgramEnrollment): void {
    if (!isLoaded.value) return
    const index = enrollments.value.findIndex((existing) => existing.id === enrollment.id)
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

  async function enroll(programSlug: string): Promise<ProgramEnrollment> {
    const { enrollment, planItem } = await enrollInProgramService(programSlug)
    applyUpdate(enrollment)
    mirrorPlanItem(planItem)
    return enrollment
  }

  async function pause(id: string): Promise<ProgramEnrollment> {
    const { enrollment, removedPlanIds } = await pauseEnrollmentService(id)
    applyUpdate(enrollment)
    mirrorRemovals(removedPlanIds)
    return enrollment
  }

  async function resume(id: string): Promise<ProgramEnrollment> {
    const { enrollment, planItem } = await resumeEnrollmentService(id)
    applyUpdate(enrollment)
    mirrorPlanItem(planItem)
    return enrollment
  }

  async function abandon(id: string): Promise<ProgramEnrollment> {
    const { enrollment, removedPlanIds } = await abandonEnrollmentService(id)
    applyUpdate(enrollment)
    mirrorRemovals(removedPlanIds)
    return enrollment
  }

  async function skipStep(id: string): Promise<ProgramEnrollment> {
    const { enrollment, skippedPlan, nextPlanItem } = await skipOptionalStepService(id)
    applyUpdate(enrollment)
    mirrorPlanItem(skippedPlan)
    mirrorPlanItem(nextPlanItem)
    return enrollment
  }

  /**
   * Today-load reconciler (design D2's safety net). Never throws — a
   * scheduler failure must not break the Today view; materialized
   * items are mirrored into the plan store.
   */
  async function runScheduler(): Promise<void> {
    try {
      const created = await runProgramScheduler()
      for (const item of created) mirrorPlanItem(item)
    } catch (err) {
      console.error('Error running the program scheduler:', err)
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
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
    enrollmentForProgram,
    loadEnrollments,
    ensureLoaded,
    applyUpdate,
    enroll,
    pause,
    resume,
    abandon,
    skipStep,
    runScheduler,
    reset,
  }
})
