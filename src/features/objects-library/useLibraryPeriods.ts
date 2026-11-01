import { ref } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import type { ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'
import {
  linkGoalToMonth,
  linkMeasurementPeriod,
  unlinkGoalFromMonth,
  unlinkMeasurementPeriod,
} from '@/services/planningMutations'
import { getUserDatabase } from '@/services/userDatabaseService'
import {
  formatMonthShort as formatMonthShortLocalized,
  formatWeekRange,
} from '@/utils/periodLabels'
import { getWeekOverlappingMonths } from '@/utils/periods'
import type { LinkedMonth } from './GoalMonthsDropdown.vue'
import type { LinkedPeriod } from './ObjectsLibraryKrCard.vue'
import type { LibraryContext } from './libraryContext'

type MeasurementPanel = 'habit' | 'tracker'
type Cadence = 'weekly' | 'monthly'

/**
 * Which weeks/months an object is planned in, as the cards show and edit it:
 * the one expanded key result, the one expanded habit/tracker, goal months.
 */
export function useLibraryPeriods(ctx: LibraryContext) {
  const { store, locale, notifyError } = ctx

  const expandedKrId = ref<string | null>(null)
  const expandedKrPeriods = ref<LinkedPeriod[]>([])
  const expandedMeasurementId = ref<string | null>(null)
  const expandedMeasurementPeriods = ref<LinkedPeriod[]>([])

  function findKeyResult(krId: string) {
    return store.items.flatMap(item => item.childPreviews ?? []).find(child => child.id === krId)
  }

  function formatWeekShort(weekRef: string): string {
    return formatWeekRange(weekRef as WeekRef, locale.value)
  }

  function goalLinkedMonths(item: ObjectsLibraryListItem): LinkedMonth[] {
    return (item.goalMonthRefs ?? []).map(ref => ({
      monthRef: ref,
      displayLabel: formatMonthShortLocalized(ref as MonthRef, locale.value),
    }))
  }

  async function loadKrPeriods(krId: string): Promise<void> {
    const child = findKeyResult(krId)
    if (!child) {
      expandedKrPeriods.value = []
      return
    }
    try {
      if (child.cadence === 'monthly') {
        const states = await planningStateDexieRepository.listMeasurementMonthStatesForSubject(
          'keyResult',
          krId
        )
        expandedKrPeriods.value = states.map(s => ({
          periodRef: s.monthRef,
          displayLabel: formatMonthShortLocalized(s.monthRef as MonthRef, locale.value),
        }))
      } else {
        const states = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
          'keyResult',
          krId
        )
        expandedKrPeriods.value = states.map(s => ({
          periodRef: s.weekRef,
          displayLabel: formatWeekShort(s.weekRef),
        }))
      }
    } catch {
      expandedKrPeriods.value = []
    }
  }

  async function loadMeasurementPeriods(
    id: string,
    panelType: MeasurementPanel,
    cadence: string
  ): Promise<void> {
    try {
      if (cadence === 'monthly') {
        const states = await planningStateDexieRepository.listMeasurementMonthStatesForSubject(
          panelType,
          id
        )
        expandedMeasurementPeriods.value = states
          .filter(state => state.activityState === 'active')
          .map(s => ({
            periodRef: s.monthRef,
            displayLabel: formatMonthShortLocalized(s.monthRef as MonthRef, locale.value),
          }))
      } else {
        const states = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
          panelType,
          id
        )
        expandedMeasurementPeriods.value = states
          .filter(state => state.activityState === 'active')
          .map(s => ({
            periodRef: s.weekRef,
            displayLabel: formatWeekShort(s.weekRef),
          }))
      }
    } catch {
      expandedMeasurementPeriods.value = []
    }
  }

  async function handleKrToggleExpand(krId: string): Promise<void> {
    if (expandedKrId.value === krId) {
      expandedKrId.value = null
      expandedKrPeriods.value = []
      return
    }
    expandedKrId.value = krId
    await loadKrPeriods(krId)
  }

  async function handleMeasurementToggleExpand(
    id: string,
    panelType: MeasurementPanel,
    cadence: string
  ): Promise<void> {
    if (expandedMeasurementId.value === id) {
      expandedMeasurementId.value = null
      expandedMeasurementPeriods.value = []
      return
    }
    expandedMeasurementId.value = id
    await loadMeasurementPeriods(id, panelType, cadence)
  }

  async function saveGoalMonths(id: string, previous: string[], desired: string[]): Promise<void> {
    if (previous.length === desired.length && previous.every(ref => desired.includes(ref))) return
    const db = getUserDatabase()
    await db.transaction('rw', db.tables, async () => {
      await goalDexieRepository.update(id, { periodAssignmentMode: 'custom' })
      for (const ref of previous.filter(ref => !desired.includes(ref)))
        await unlinkGoalFromMonth(id, ref as MonthRef)
      for (const ref of desired.filter(ref => !previous.includes(ref)))
        await linkGoalToMonth(id, ref as MonthRef)
    })
    await store.loadBundle()
  }

  async function saveMeasurementPeriods(
    id: string,
    subjectType: 'keyResult' | MeasurementPanel,
    cadence: Cadence,
    previous: string[],
    desired: string[]
  ): Promise<void> {
    if (previous.length === desired.length && previous.every(ref => desired.includes(ref))) return
    const db = getUserDatabase()
    await db.transaction('rw', db.tables, async () => {
      if (subjectType === 'keyResult') {
        const kr = await keyResultDexieRepository.update(id, { periodAssignmentMode: 'custom' })
        const months = new Set(
          desired.flatMap(ref =>
            cadence === 'monthly' ? [ref as MonthRef] : getWeekOverlappingMonths(ref as WeekRef)
          )
        )
        for (const month of months) await linkGoalToMonth(kr.goalId, month)
      }
      for (const ref of previous.filter(ref => !desired.includes(ref))) {
        await unlinkMeasurementPeriod({
          subjectType,
          subjectId: id,
          cadence,
          periodRef: ref as MonthRef | WeekRef,
        })
      }
      for (const ref of desired.filter(ref => !previous.includes(ref))) {
        await linkMeasurementPeriod({
          subjectType,
          subjectId: id,
          cadence,
          periodRef: ref as MonthRef | WeekRef,
        })
      }
    })
    if (subjectType === 'keyResult') await loadKrPeriods(id)
    else await loadMeasurementPeriods(id, subjectType, cadence)
    await store.loadBundle()
  }

  async function saveKrPeriods(id: string, refs: string[]): Promise<void> {
    const child = findKeyResult(id)
    if (!child) throw new Error('Key result not found')
    await saveMeasurementPeriods(
      id,
      'keyResult',
      child.cadence,
      expandedKrPeriods.value.map(period => period.periodRef),
      refs
    )
  }

  async function saveHabitSchedule(
    id: string,
    cadence: Cadence,
    desired: string[],
    isPermanent: boolean
  ): Promise<void> {
    const db = getUserDatabase()
    // Save the mode and manual period changes together; a failed save keeps the dialog open.
    await db.transaction('rw', db.tables, async () => {
      await habitDexieRepository.update(id, { isPermanent })
      if (!isPermanent) {
        const states =
          cadence === 'monthly'
            ? await planningStateDexieRepository.listMeasurementMonthStatesForSubject('habit', id)
            : await planningStateDexieRepository.listMeasurementWeekStatesForSubject('habit', id)
        const previous: string[] = states
          .filter(state => state.activityState === 'active')
          .map(state => ('monthRef' in state ? state.monthRef : state.weekRef))
        for (const ref of previous.filter(ref => !desired.includes(ref))) {
          await unlinkMeasurementPeriod({
            subjectType: 'habit',
            subjectId: id,
            cadence,
            periodRef: ref as MonthRef | WeekRef,
          })
        }
        for (const ref of desired.filter(ref => !previous.includes(ref))) {
          await linkMeasurementPeriod({
            subjectType: 'habit',
            subjectId: id,
            cadence,
            periodRef: ref as MonthRef | WeekRef,
          })
        }
      }
    })
    await loadMeasurementPeriods(id, 'habit', cadence)
    await store.loadBundle()
  }

  async function handleKrLinkPeriod(krId: string, periodRef: string): Promise<void> {
    try {
      const child = findKeyResult(krId)
      if (!child) return
      await linkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: krId,
        cadence: child.cadence,
        periodRef: child.cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
      })
      await loadKrPeriods(krId)
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleKrUnlinkPeriod(krId: string, periodRef: string): Promise<void> {
    try {
      const child = findKeyResult(krId)
      if (!child) return
      await unlinkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: krId,
        cadence: child.cadence,
        periodRef: child.cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
      })
      await loadKrPeriods(krId)
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleMeasurementLinkPeriod(
    id: string,
    panelType: MeasurementPanel,
    periodRef: string,
    cadence: string
  ): Promise<void> {
    try {
      await linkMeasurementPeriod({
        subjectType: panelType,
        subjectId: id,
        cadence: cadence as Cadence,
        periodRef: cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
      })
      await loadMeasurementPeriods(id, panelType, cadence)
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleMeasurementUnlinkPeriod(
    id: string,
    panelType: MeasurementPanel,
    periodRef: string,
    cadence: string
  ): Promise<void> {
    try {
      await unlinkMeasurementPeriod({
        subjectType: panelType,
        subjectId: id,
        cadence: cadence as Cadence,
        periodRef: cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
      })
      await loadMeasurementPeriods(id, panelType, cadence)
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleGoalLinkMonth(goalId: string, monthRef: string): Promise<void> {
    try {
      await linkGoalToMonth(goalId, monthRef as MonthRef)
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  async function handleGoalUnlinkMonth(goalId: string, monthRef: string): Promise<void> {
    try {
      await unlinkGoalFromMonth(goalId, monthRef as MonthRef)
      await store.loadBundle()
    } catch (err) {
      notifyError(err)
    }
  }

  return {
    expandedKrId,
    expandedKrPeriods,
    expandedMeasurementId,
    expandedMeasurementPeriods,
    goalLinkedMonths,
    loadKrPeriods,
    loadMeasurementPeriods,
    handleKrToggleExpand,
    handleMeasurementToggleExpand,
    saveGoalMonths,
    saveKrPeriods,
    saveHabitSchedule,
    saveMeasurementPeriods,
    handleKrLinkPeriod,
    handleKrUnlinkPeriod,
    handleMeasurementLinkPeriod,
    handleMeasurementUnlinkPeriod,
    handleGoalLinkMonth,
    handleGoalUnlinkMonth,
  }
}
