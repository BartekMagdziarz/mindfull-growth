import { computed, ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { GoalWizardEditInput } from '@/composables/useGoalCreationWizard'
import type { GoalOutcome } from '@/domain/planning'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reopenGoal } from '@/services/goalClosingService'
import { normalizeOptionalText, toggleId } from './libraryTargets'
import type { LibraryContext } from './libraryContext'

/** Goals in the library: the creation/edit wizard, card field edits, reopening, closing. */
export function useLibraryGoals(
  ctx: LibraryContext,
  router: Router,
  route: RouteLocationNormalizedLoaded
) {
  const { store, t, notify, notifyError, newIds } = ctx

  const isGoalWizardOpen = ref(false)
  const goalWizardMode = ref<'create' | 'edit'>('create')
  const goalWizardEditInput = ref<GoalWizardEditInput | null>(null)

  const reopenDialogOpen = ref(false)
  const reopenCandidate = ref<{ id: string; title: string } | null>(null)
  const reopenDialogMessage = computed(() =>
    reopenCandidate.value
      ? t('planning.goalClosing.reopen.message', { title: reopenCandidate.value.title })
      : ''
  )

  function openGoalWizard(): void {
    isGoalWizardOpen.value = true
  }

  async function handleGoalWizardSaved(goalId: string, mode: 'create' | 'edit'): Promise<void> {
    isGoalWizardOpen.value = false
    goalWizardEditInput.value = null
    goalWizardMode.value = 'create'
    if (mode === 'create') {
      newIds.goal.value = goalId
    }
    try {
      await store.loadBundle()
      notify(
        mode === 'edit'
          ? t('planning.goalWizard.messages.updated')
          : t('planning.goalWizard.messages.saved')
      )
    } catch (err) {
      notifyError(err, 'planning.goalWizard.messages.saveError')
    }
  }

  function handleGoalWizardCancelled(): void {
    isGoalWizardOpen.value = false
    goalWizardEditInput.value = null
    goalWizardMode.value = 'create'
  }

  function handleGoalWizardError(message: string): void {
    notify(message || t('planning.goalWizard.messages.saveError'))
  }

  async function handleGoalEdit(goalId: string): Promise<void> {
    try {
      const goal = await goalDexieRepository.getById(goalId)
      if (!goal) {
        notify(t('planning.goalWizard.messages.saveError'))
        return
      }
      const allKeyResults = await keyResultDexieRepository.listAll()
      const keyResults = allKeyResults.filter(kr => kr.goalId === goalId)

      const goalMonthStates = await planningStateDexieRepository.listGoalMonthStates()
      const goalMonthRefs = goalMonthStates
        .filter(state => state.goalId === goalId && state.activityState === 'active')
        .map(state => state.monthRef)

      const krPeriodRefsByKrId: Record<string, string[]> = {}
      for (const kr of keyResults) {
        if (kr.cadence === 'monthly') {
          const states = await planningStateDexieRepository.listMeasurementMonthStatesForSubject(
            'keyResult',
            kr.id
          )
          krPeriodRefsByKrId[kr.id] = states.map(s => s.monthRef)
        } else {
          const states = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
            'keyResult',
            kr.id
          )
          krPeriodRefsByKrId[kr.id] = states.map(s => s.weekRef)
        }
      }

      goalWizardEditInput.value = { goal, keyResults, goalMonthRefs, krPeriodRefsByKrId }
      goalWizardMode.value = 'edit'
      isGoalWizardOpen.value = true
    } catch (err) {
      notifyError(err, 'planning.goalWizard.messages.saveError')
    }
  }

  async function handleGoalFieldChange(
    goalId: string,
    field: string,
    value: unknown
  ): Promise<void> {
    try {
      let needsReload = true
      switch (field) {
        case 'title':
          await goalDexieRepository.update(goalId, { title: (value as string).trim() })
          if (newIds.goal.value === goalId) newIds.goal.value = null
          needsReload = false
          break
        case 'icon':
          await goalDexieRepository.update(goalId, {
            icon: (value as string | undefined) ?? undefined,
          })
          break
        case 'description':
          await goalDexieRepository.update(goalId, {
            description: normalizeOptionalText(value as string),
          })
          needsReload = false
          break
        case 'status':
          if (value === 'open') {
            // Back to „Otwarty”: a goal with a closing summary asks first (the summary dies with it).
            const goal = await goalDexieRepository.getById(goalId)
            if (goal?.closingReflection) {
              reopenCandidate.value = { id: goalId, title: goal.title }
              reopenDialogOpen.value = true
              needsReload = false
              break
            }
            await reopenGoal(goalId)
            break
          }
          await goalDexieRepository.update(goalId, {
            status: value as 'open' | 'completed' | 'dropped',
          })
          break
        case 'togglePriority': {
          const goal = await goalDexieRepository.getById(goalId)
          if (!goal) return
          await goalDexieRepository.update(goalId, {
            priorityIds: toggleId(goal.priorityIds, value as string),
          })
          break
        }
        case 'toggleLifeArea': {
          const goal = await goalDexieRepository.getById(goalId)
          if (!goal) return
          await goalDexieRepository.update(goalId, {
            lifeAreaIds: toggleId(goal.lifeAreaIds, value as string),
          })
          break
        }
      }
      if (needsReload) {
        await store.loadBundle()
      }
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleConfirmReopen(): Promise<void> {
    const candidate = reopenCandidate.value
    reopenDialogOpen.value = false
    reopenCandidate.value = null
    if (!candidate) return
    try {
      await reopenGoal(candidate.id)
      notify(t('planning.goalClosing.messages.reopened'))
      await store.loadBundle()
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err))
    }
  }

  /** Closing a goal from the card's status menu opens the ritual (spec D7). */
  function handleGoalCloseRitual(goalId: string, presetOutcome: GoalOutcome | null): void {
    void router.push({
      name: 'goal-closing-ritual',
      params: { goalId },
      query: { ...(presetOutcome ? { outcome: presetOutcome } : {}), return: route.fullPath },
    })
  }

  return {
    isGoalWizardOpen,
    goalWizardMode,
    goalWizardEditInput,
    reopenDialogOpen,
    reopenDialogMessage,
    openGoalWizard,
    handleGoalWizardSaved,
    handleGoalWizardCancelled,
    handleGoalWizardError,
    handleGoalEdit,
    handleGoalFieldChange,
    handleConfirmReopen,
    handleGoalCloseRitual,
  }
}
