import type { Ref } from 'vue'
import type { YearRef } from '@/domain/period'
import {
  createMultiCompletionItem,
  type MeasurementEntryDaysCondition,
  type MeasurementEntryMode,
  type MeasurementTarget,
  type MultiCompletionItem,
  type PriorityClosingReflection,
} from '@/domain/planning'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { updateWeeklyIntention } from '@/services/weeklyIntentionService'
import {
  buildTargetForEntryMode,
  normalizeOptionalText,
  parseSignalLines,
  toggleId,
  updateTargetField,
} from './libraryTargets'
import type { LibraryContext } from './libraryContext'

type TargetField = 'operator' | 'aggregation' | 'value' | 'entryDays'

/** What the field-change handlers need from the period state of the expanded cards. */
export interface LibraryPeriodHooks {
  expandedMeasurementId: Ref<string | null>
  loadMeasurementPeriods: (
    id: string,
    panelType: 'habit' | 'tracker',
    cadence: string
  ) => Promise<void>
}

/** `target.operator` → `operator`, for the four target fields the cards edit. */
function targetFieldOf(field: string): TargetField | null {
  switch (field) {
    case 'target.operator':
      return 'operator'
    case 'target.aggregation':
      return 'aggregation'
    case 'target.value':
      return 'value'
    case 'target.entryDays':
      return 'entryDays'
    default:
      return null
  }
}

/** Auto-saved card edits for key results, habits/trackers, priorities and intentions. */
export function useLibraryFieldChanges(ctx: LibraryContext, periods: LibraryPeriodHooks) {
  const { store, t, notify, notifyError, newIds } = ctx

  /** Default single item for objects switched to multi-completion without a configured list. */
  function defaultMultiItemsFor(title: string): MultiCompletionItem[] {
    return [
      createMultiCompletionItem(
        title.trim() || t('planning.objects.form.multiItems.defaultItemLabel')
      ),
    ]
  }

  async function handleKrFieldChange(krId: string, field: string, value: unknown): Promise<void> {
    try {
      const child = store.items.flatMap(item => item.childPreviews ?? []).find(c => c.id === krId)
      if (!child) return

      let needsReload = true
      const targetField = targetFieldOf(field)
      if (targetField) {
        const updated = updateTargetField(
          child.entryMode,
          child.target,
          targetField,
          value as string | number | MeasurementEntryDaysCondition | undefined
        )
        await keyResultDexieRepository.update(krId, { target: updated })
      } else {
        switch (field) {
          case 'title':
            await keyResultDexieRepository.update(krId, { title: (value as string).trim() })
            needsReload = false
            break
          case 'description':
            await keyResultDexieRepository.update(krId, {
              description: normalizeOptionalText(value as string),
            })
            needsReload = false
            break
          case 'cadence':
            await keyResultDexieRepository.update(krId, { cadence: value as 'weekly' | 'monthly' })
            break
          case 'status':
            await keyResultDexieRepository.update(krId, {
              status: value as 'open' | 'completed' | 'dropped',
            })
            break
          case 'entryMode': {
            const newEntryMode = value as MeasurementEntryMode
            const newTarget = buildTargetForEntryMode(newEntryMode, child.target)
            await keyResultDexieRepository.update(krId, {
              entryMode: newEntryMode,
              target: newTarget,
              // Switching to multi-completion requires items; seed a single default
              // one (the normalizer keeps existing items on later partial updates).
              ...(newEntryMode === 'multi-completion' && !child.multiItems?.length
                ? { multiItems: defaultMultiItemsFor(child.title) }
                : {}),
            })
            break
          }
          case 'multiConfig': {
            const config = value as { items: MultiCompletionItem[]; threshold: number | undefined }
            await keyResultDexieRepository.update(krId, {
              multiItems: config.items,
              multiDailyThreshold: config.threshold,
            })
            break
          }
          case 'ratingScaleMin':
            await keyResultDexieRepository.update(krId, { ratingScaleMin: value as number })
            break
          case 'ratingScale':
            await keyResultDexieRepository.update(krId, { ratingScale: value as number })
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

  async function handleKrArchive(krId: string): Promise<void> {
    try {
      const child = store.items.flatMap(item => item.childPreviews ?? []).find(c => c.id === krId)
      if (!child) return
      await keyResultDexieRepository.update(krId, { isActive: !child.isActive })
      notify(
        child.isActive
          ? t('planning.objects.messages.archived')
          : t('planning.objects.messages.unarchived')
      )
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleMeasurementFieldChange(
    id: string,
    field: string,
    value: unknown
  ): Promise<void> {
    try {
      const item = store.items.find(i => i.id === id)
      if (!item || (item.panelType !== 'habit' && item.panelType !== 'tracker')) return

      const isHabit = item.panelType === 'habit'
      const repo = isHabit ? habitDexieRepository : trackerDexieRepository

      let needsReload = true
      const targetField = targetFieldOf(field)
      if (targetField) {
        // Trackers carry no target; habits without one stay untouched.
        if (item.target && isHabit) {
          const updated = updateTargetField(
            item.entryMode ?? 'completion',
            item.target,
            targetField,
            value as string | number | MeasurementEntryDaysCondition | undefined
          )
          await habitDexieRepository.update(id, { target: updated })
        }
      } else {
        switch (field) {
          case 'title':
            await repo.update(id, { title: (value as string).trim() })
            if (newIds.measurement.value === id) newIds.measurement.value = null
            needsReload = false
            break
          case 'icon':
            await repo.update(id, { icon: (value as string | undefined) ?? undefined })
            break
          case 'description':
            await repo.update(id, { description: normalizeOptionalText(value as string) })
            needsReload = false
            break
          case 'status':
            await repo.update(id, { status: value as 'open' | 'retired' | 'dropped' })
            break
          case 'cadence': {
            const newCadence = value as 'weekly' | 'monthly'
            await repo.update(id, { cadence: newCadence })
            if (periods.expandedMeasurementId.value === id) {
              await periods.loadMeasurementPeriods(id, item.panelType, newCadence)
            }
            break
          }
          case 'entryMode': {
            const newEntryMode = value as MeasurementEntryMode
            // Switching to multi-completion requires items; seed a single default
            // one (the normalizer keeps existing items on later partial updates).
            const multiSeed =
              newEntryMode === 'multi-completion' && !item.multiItems?.length
                ? { multiItems: defaultMultiItemsFor(item.title) }
                : {}
            if (isHabit) {
              const newTarget = buildTargetForEntryMode(
                newEntryMode,
                item.target ?? { kind: 'count', operator: 'min', value: 1 }
              )
              await habitDexieRepository.update(id, {
                entryMode: newEntryMode,
                target: newTarget,
                ...multiSeed,
              })
            } else {
              await trackerDexieRepository.update(id, { entryMode: newEntryMode, ...multiSeed })
            }
            break
          }
          case 'multiConfig': {
            const config = value as { items: MultiCompletionItem[]; threshold: number | undefined }
            await repo.update(id, {
              multiItems: config.items,
              multiDailyThreshold: config.threshold,
            })
            break
          }
          case 'ratingScaleMin':
            await repo.update(id, { ratingScaleMin: value as number })
            break
          case 'ratingScale':
            await repo.update(id, { ratingScale: value as number })
            break
          case 'togglePriority': {
            const current = await repo.getById(id)
            if (!current) break
            await repo.update(id, { priorityIds: toggleId(current.priorityIds, value as string) })
            break
          }
          case 'toggleLifeArea': {
            const current = await repo.getById(id)
            if (!current) break
            await repo.update(id, { lifeAreaIds: toggleId(current.lifeAreaIds, value as string) })
            break
          }
        }
      }
      if (needsReload) {
        await store.loadBundle()
      }
    } catch (err) {
      notifyError(err)
    }
  }

  async function updatePriorityClosingReflection(
    id: string,
    field: keyof PriorityClosingReflection,
    value: string
  ): Promise<void> {
    const priority = await priorityDexieRepository.getById(id)
    if (!priority || priority.status !== 'closed') return

    await priorityDexieRepository.update(id, {
      closingReflection: {
        closedAt: priority.closingReflection?.closedAt ?? new Date().toISOString(),
        summary: priority.closingReflection?.summary,
        workedWell: priority.closingReflection?.workedWell,
        wasDifficult: priority.closingReflection?.wasDifficult,
        learned: priority.closingReflection?.learned,
        [field]:
          field === 'closedAt'
            ? value.trim() || new Date().toISOString()
            : normalizeOptionalText(value),
      },
    })
  }

  async function handlePriorityFieldChange(
    id: string,
    field: string,
    value: unknown
  ): Promise<void> {
    try {
      let needsReload = true
      switch (field) {
        case 'title':
          await priorityDexieRepository.update(id, { title: (value as string).trim() })
          if (newIds.priority.value === id) newIds.priority.value = null
          needsReload = false
          break
        case 'icon':
          // Reload so the card glyph reflects the new icon immediately.
          await priorityDexieRepository.update(id, {
            icon: (value as string | undefined) ?? undefined,
          })
          break
        case 'description':
        case 'whyNow':
        case 'desiredDirection':
        case 'tradeoffs':
          await priorityDexieRepository.update(id, {
            [field]: typeof value === 'string' ? normalizeOptionalText(value) : value,
          })
          needsReload = false
          break
        case 'status':
          await priorityDexieRepository.update(id, {
            status: value as 'draft' | 'active' | 'paused' | 'closed',
            ...(value === 'closed'
              ? { closingReflection: { closedAt: new Date().toISOString() } }
              : {}),
          })
          break
        case 'closingReflection.summary':
        case 'closingReflection.workedWell':
        case 'closingReflection.wasDifficult':
        case 'closingReflection.learned':
        case 'closingReflection.closedAt':
          await updatePriorityClosingReflection(
            id,
            field.replace('closingReflection.', '') as keyof PriorityClosingReflection,
            value as string
          )
          break
        case 'progressSignals':
          await priorityDexieRepository.update(id, {
            progressSignals: parseSignalLines(value as string),
          })
          break
        case 'riskSignals':
          await priorityDexieRepository.update(id, {
            riskSignals: parseSignalLines(value as string),
          })
          break
        case 'toggleLifeArea': {
          const priority = await priorityDexieRepository.getById(id)
          if (!priority) return
          await priorityDexieRepository.update(id, {
            lifeAreaIds: toggleId(priority.lifeAreaIds, value as string),
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

  async function handlePriorityLinkYear(id: string, yearRef: string): Promise<void> {
    try {
      const priority = await priorityDexieRepository.getById(id)
      if (!priority) return
      if (priority.years.includes(yearRef as YearRef)) return
      const years = [...priority.years, yearRef as YearRef].sort((a, b) => a.localeCompare(b))
      await priorityDexieRepository.update(id, { years })
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handlePriorityUnlinkYear(id: string, yearRef: string): Promise<void> {
    try {
      const priority = await priorityDexieRepository.getById(id)
      if (!priority) return
      const years = priority.years.filter(year => year !== yearRef)
      if (years.length === 0) return
      await priorityDexieRepository.update(id, { years })
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handlePriorityDraftsChanged(): Promise<void> {
    // A proposed link became a real object (or was abandoned) — reload so new
    // objects and updated linked counts show up.
    await store.loadBundle()
  }

  async function handlePriorityArchive(id: string, isCurrentlyActive: boolean): Promise<void> {
    try {
      await priorityDexieRepository.update(id, { status: isCurrentlyActive ? 'paused' : 'active' })
      notify(
        isCurrentlyActive
          ? t('planning.objects.messages.paused')
          : t('planning.objects.messages.activated')
      )
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleIntentionSave(
    id: string,
    payload: {
      title: string
      entryMode: MeasurementEntryMode
      target: MeasurementTarget
      multiItems?: MultiCompletionItem[]
      multiDailyThreshold?: number
      priorityIds: string[]
    }
  ): Promise<void> {
    try {
      await updateWeeklyIntention(id, payload)
      if (newIds.intention.value === id) newIds.intention.value = null
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  return {
    handleKrFieldChange,
    handleKrArchive,
    handleMeasurementFieldChange,
    handlePriorityFieldChange,
    handlePriorityLinkYear,
    handlePriorityUnlinkYear,
    handlePriorityDraftsChanged,
    handlePriorityArchive,
    handleIntentionSave,
  }
}
