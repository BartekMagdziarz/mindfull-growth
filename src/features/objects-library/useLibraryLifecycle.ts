import { computed, ref } from 'vue'
import type { Router } from 'vue-router'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import {
  getObjectsLibraryFamilyPanelType,
  type ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
import { createWeeklyIntention, deleteWeeklyIntention } from '@/services/weeklyIntentionService'
import { getPeriodRefsForDate } from '@/utils/periods'
import type { LibraryContext } from './libraryContext'

interface LifecycleDeps {
  router: Router
  syncRoute: () => Promise<void>
  openGoalWizard: () => void
  expandedKrId: { value: string | null }
  expandedMeasurementId: { value: string | null }
  loadKrPeriods: (krId: string) => Promise<void>
  loadMeasurementPeriods: (
    id: string,
    panelType: 'habit' | 'tracker',
    cadence: string
  ) => Promise<void>
}

/** Creating, archiving and deleting library objects (the delete confirmation included). */
export function useLibraryLifecycle(ctx: LibraryContext, deps: LifecycleDeps) {
  const { store, t, notify, notifyError, newIds } = ctx

  const deleteDialogOpen = ref(false)
  const pendingDelete = ref<{
    panelType: ObjectsLibraryPanelType
    id: string
    title: string
    parentGoalId?: string
  } | null>(null)
  const deleteDialogMessage = computed(() =>
    pendingDelete.value
      ? t('planning.objects.deleteDialog.message', { title: pendingDelete.value.title })
      : ''
  )

  async function handleOpenCreate(): Promise<void> {
    const panelType = getObjectsLibraryFamilyPanelType(store.query.family)

    if (panelType === 'goal') {
      deps.openGoalWizard()
      return
    }

    if (panelType === 'priority') {
      // Priorities are created through the transactional ritual — no empty
      // draft records in the library.
      await deps.router.push({ name: 'priority-creator-ritual' })
      return
    }

    if (panelType === 'habit') {
      try {
        const created = await habitDexieRepository.create({
          title: '',
          description: undefined,
          isActive: true,
          priorityIds: [],
          lifeAreaIds: [],
          entryMode: 'completion',
          cadence: 'weekly',
          target: { kind: 'count', operator: 'min', value: 1 },
          status: 'open',
        })
        newIds.measurement.value = created.id
        deps.expandedMeasurementId.value = created.id
        await store.loadBundle()
        await deps.loadMeasurementPeriods(created.id, 'habit', 'weekly')
      } catch (err) {
        notifyError(err)
      }
      return
    }

    if (panelType === 'tracker') {
      try {
        const created = await trackerDexieRepository.create({
          title: '',
          description: undefined,
          isActive: true,
          priorityIds: [],
          lifeAreaIds: [],
          cadence: 'weekly',
          entryMode: 'completion',
          status: 'open',
        })
        newIds.measurement.value = created.id
        deps.expandedMeasurementId.value = created.id
        await store.loadBundle()
        await deps.loadMeasurementPeriods(created.id, 'tracker', 'weekly')
      } catch (err) {
        notifyError(err)
      }
      return
    }

    if (panelType === 'weeklyIntention') {
      try {
        // A fresh intention for the current week, filled in on the card.
        const created = await createWeeklyIntention({
          weekRef: getPeriodRefsForDate(new Date()).week,
          title: '',
          entryMode: 'completion',
          target: { kind: 'count', operator: 'min', value: 1 },
        })
        newIds.intention.value = created.id
        await store.loadBundle()
      } catch (err) {
        notifyError(err)
      }
    }
  }

  async function handleCreateChildKeyResult(goalId: string): Promise<void> {
    try {
      const created = await keyResultDexieRepository.create({
        title: '',
        description: undefined,
        isActive: true,
        goalId,
        entryMode: 'counter',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
        status: 'open',
      })
      await store.loadBundle()
      deps.expandedKrId.value = created.id
      await deps.loadKrPeriods(created.id)
    } catch (err) {
      notifyError(err)
    }
  }

  async function updateObjectActive(
    panelType: ObjectsLibraryPanelType,
    id: string,
    isActive: boolean
  ): Promise<void> {
    switch (panelType) {
      case 'priority':
        await priorityDexieRepository.update(id, { status: isActive ? 'active' : 'paused' })
        return
      case 'goal':
        await goalDexieRepository.update(id, { isActive })
        return
      case 'keyResult':
        await keyResultDexieRepository.update(id, { isActive })
        return
      case 'habit':
        await habitDexieRepository.update(id, { isActive })
        return
      case 'tracker':
        await trackerDexieRepository.update(id, { isActive })
        return
      case 'weeklyIntention':
        // Weekly intentions have no archive affordance in the library.
        return
    }
  }

  async function deleteObject(panelType: ObjectsLibraryPanelType, id: string): Promise<void> {
    switch (panelType) {
      case 'priority':
        await priorityDexieRepository.delete(id)
        return
      case 'goal':
        await goalDexieRepository.delete(id)
        return
      case 'keyResult':
        await keyResultDexieRepository.delete(id)
        return
      case 'habit':
        await habitDexieRepository.delete(id)
        return
      case 'tracker':
        await trackerDexieRepository.delete(id)
        return
      case 'weeklyIntention': {
        const intention = await weeklyIntentionDexieRepository.getById(id)
        if (intention) {
          // The service unlinks the week/month measurement states before deleting.
          await deleteWeeklyIntention(id, intention.weekRef)
        }
        return
      }
    }
  }

  async function handleArchiveFromCard(
    panelType: ObjectsLibraryPanelType,
    id: string,
    isCurrentlyActive: boolean
  ): Promise<void> {
    try {
      await updateObjectActive(panelType, id, !isCurrentlyActive)
      notify(
        isCurrentlyActive
          ? t('planning.objects.messages.archived')
          : t('planning.objects.messages.unarchived')
      )
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  function handleDeleteFromCard(
    panelType: ObjectsLibraryPanelType,
    id: string,
    title: string
  ): void {
    pendingDelete.value = { panelType, id, title }
    deleteDialogOpen.value = true
  }

  function handleKrDelete(krId: string): void {
    const child = store.items.flatMap(item => item.childPreviews ?? []).find(c => c.id === krId)
    if (!child) return
    pendingDelete.value = {
      panelType: 'keyResult',
      id: krId,
      title: child.title,
      parentGoalId: child.goalId,
    }
    deleteDialogOpen.value = true
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!pendingDelete.value) return
    const target = pendingDelete.value
    try {
      await deleteObject(target.panelType, target.id)
      store.closeComposer()
      if (target.parentGoalId) {
        store.expandItem('goal', target.parentGoalId)
      } else {
        store.collapseItem()
      }
      await store.loadBundle()
      await deps.syncRoute()
      notify(t('planning.objects.messages.deleted'))
    } catch (err) {
      notifyError(err)
    } finally {
      deleteDialogOpen.value = false
      pendingDelete.value = null
    }
  }

  return {
    deleteDialogOpen,
    deleteDialogMessage,
    handleOpenCreate,
    handleCreateChildKeyResult,
    handleArchiveFromCard,
    handleDeleteFromCard,
    handleKrDelete,
    handleConfirmDelete,
  }
}
