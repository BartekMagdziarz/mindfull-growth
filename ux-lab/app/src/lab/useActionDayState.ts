import { computed, ref } from 'vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import { useLabStore } from '~lab/stores/lab.store'
import { addDays, baseDayItems, groupDayItems, shortDayLabel } from '~lab/lab/actionConceptData'

// Lokalny, symulowany stan dnia dla konceptów widoku działania:
// wykonania, wartości, ukrycia i przeniesienia wystąpień. Bez persystencji.
export function useActionDayState() {
  const labStore = useLabStore()
  const fixture = computed(() => labStore.fixture)
  const todayRef = computed(() => fixture.value.refs.today)

  const completionOverrides = ref(new Set<string>())
  const valueOverrides = ref<Record<string, number>>({})
  const hiddenKeys = ref(new Set<string>())
  const movedOut = ref<Record<string, string>>({}) // key → docelowy dayRef
  const lastNote = ref('')

  const allBaseItems = computed(() => baseDayItems(fixture.value))
  const todayItems = computed(() => allBaseItems.value.filter(item => !hiddenKeys.value.has(item.key) && !movedOut.value[item.key]))
  const dayGroups = computed(() => groupDayItems(todayItems.value))
  const hiddenCount = computed(() => hiddenKeys.value.size)

  function isDone(item: LabFixtureObject): boolean {
    const initial = Boolean(item.todayDone)
    return completionOverrides.value.has(item.key) ? !initial : initial
  }
  function valueFor(item: LabFixtureObject): number {
    return valueOverrides.value[item.key] ?? item.todayValue ?? 0
  }
  function hasEntry(item: LabFixtureObject): boolean {
    return item.entryMode === 'completion' ? isDone(item) : valueFor(item) > 0
  }
  const doneCount = computed(() => todayItems.value.filter(hasEntry).length)

  function toggle(item: LabFixtureObject) {
    if (item.entryMode !== 'completion') {
      step(item)
      return
    }
    const next = new Set(completionOverrides.value)
    next.has(item.key) ? next.delete(item.key) : next.add(item.key)
    completionOverrides.value = next
  }
  function step(item: LabFixtureObject) {
    const max = item.entryMode === 'rating' ? (item.family === 'tracker' ? 10 : 5) : 30
    const next = valueFor(item) + 1
    valueOverrides.value = { ...valueOverrides.value, [item.key]: next > max ? 0 : next }
  }

  function hide(item: LabFixtureObject) {
    const next = new Set(hiddenKeys.value)
    next.add(item.key)
    hiddenKeys.value = next
    lastNote.value = 'Ukryto na dziś'
  }
  function restoreHidden() {
    hiddenKeys.value = new Set()
  }
  function moveTo(item: LabFixtureObject, dayRef: string) {
    if (dayRef === todayRef.value) return
    movedOut.value = { ...movedOut.value, [item.key]: dayRef }
    lastNote.value = `→ ${shortDayLabel(dayRef).toLowerCase()} ${Number(dayRef.slice(-2))}`
  }
  function moveToTomorrow(item: LabFixtureObject) {
    moveTo(item, addDays(todayRef.value, 1))
  }

  return {
    fixture,
    todayRef,
    todayItems,
    dayGroups,
    doneCount,
    hiddenCount,
    lastNote,
    isDone,
    valueFor,
    hasEntry,
    toggle,
    step,
    hide,
    restoreHidden,
    moveTo,
    moveToTomorrow,
  }
}
