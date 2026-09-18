import { computed, ref } from 'vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import { useLabStore } from '~lab/stores/lab.store'
import { activeObjects, addDays, baseDayItems, groupDayItems, syntheticPlanned } from './actionConceptData'

type DayState = { added: string[]; hidden: string[]; removed: string[]; values: Record<string, number>; done: Record<string, boolean> }
const blank = (): DayState => ({ added: [], hidden: [], removed: [], values: {}, done: {} })

// Isolated prototype: each date retains its own edits until the Lab is reset.
export function useActionDayDraft() {
  const lab = useLabStore()
  const fixture = computed(() => lab.fixture)
  const todayRef = ref<string>(fixture.value.refs.today)
  const days = ref<Record<string, DayState>>({})
  const lastNote = ref('')
  const undoState = ref<{ days: Record<string, DayState>; day: string } | null>(null)
  const state = computed(() => days.value[todayRef.value] ?? blank())
  const stateFor = (date: string) => (days.value[date] ??= blank())
  const allBaseItems = computed(() => todayRef.value === fixture.value.refs.today
    ? baseDayItems(fixture.value)
    : activeObjects(fixture.value).filter(item => item.cadence === 'weekly' && syntheticPlanned(fixture.value, item, todayRef.value)))
  const todayItems = computed(() => activeObjects(fixture.value).filter(item =>
    (allBaseItems.value.some(base => base.key === item.key) || state.value.added.includes(item.key)) &&
    !state.value.hidden.includes(item.key) && !state.value.removed.includes(item.key)))
  const dayGroups = computed(() => groupDayItems(todayItems.value))
  const hiddenCount = computed(() => state.value.hidden.length)
  function isDone(item: LabFixtureObject) { return state.value.done[item.key] ?? (todayRef.value === fixture.value.refs.today && Boolean(item.todayDone)) }
  function valueFor(item: LabFixtureObject) { return state.value.values[item.key] ?? (todayRef.value === fixture.value.refs.today ? item.todayValue ?? 0 : 0) }
  function hasEntry(item: LabFixtureObject) { return item.entryMode === 'completion' ? isDone(item) : valueFor(item) > 0 }
  const doneCount = computed(() => todayItems.value.filter(hasEntry).length)
  function remember(note: string) {
    undoState.value = { days: JSON.parse(JSON.stringify(days.value)), day: todayRef.value }
    lastNote.value = note
  }
  function undo() {
    if (!undoState.value) return
    const restored = undoState.value.days
    // Undo scheduling only; retain any measurements entered afterwards.
    for (const [date, current] of Object.entries(days.value)) {
      const target = restored[date] ??= blank()
      target.values = { ...current.values }
      target.done = { ...current.done }
    }
    days.value = restored
    todayRef.value = undoState.value.day
    undoState.value = null
    lastNote.value = ''
  }
  function toggle(item: LabFixtureObject) {
    if (item.entryMode !== 'completion') { step(item); return }
    stateFor(todayRef.value).done[item.key] = !isDone(item)
  }
  function step(item: LabFixtureObject) {
    const max = item.entryMode === 'rating' ? (item.family === 'tracker' ? 10 : 5) : 30
    stateFor(todayRef.value).values[item.key] = valueFor(item) >= max ? 0 : valueFor(item) + 1
  }
  function hide(item: LabFixtureObject) {
    remember(`Ukryto: ${item.title}`)
    stateFor(todayRef.value).hidden.push(item.key)
  }
  function restoreHidden() {
    stateFor(todayRef.value).hidden = []
    // przywrócenie zamyka wątek „ukryto” — komunikat Cofnij nie może zostać w stanie nieaktualnym
    undoState.value = null
    lastNote.value = ''
  }
  function moveTo(item: LabFixtureObject, date: string) {
    if (date === todayRef.value) return
    remember(`Przeniesiono: ${item.title}`)
    stateFor(todayRef.value).removed.push(item.key)
    const target = stateFor(date)
    target.removed = target.removed.filter(key => key !== item.key)
    target.hidden = target.hidden.filter(key => key !== item.key)
    if (!target.added.includes(item.key)) target.added.push(item.key)
  }
  function add(item: LabFixtureObject) {
    remember(`Dodano: ${item.title}`)
    const target = stateFor(todayRef.value)
    target.removed = target.removed.filter(key => key !== item.key)
    target.hidden = target.hidden.filter(key => key !== item.key)
    if (!target.added.includes(item.key)) target.added.push(item.key)
  }
  return { fixture, todayRef, todayItems, dayGroups, hiddenCount, doneCount, lastNote, undoState,
    isDone, valueFor, hasEntry, toggle, step, hide, restoreHidden, moveTo, add, undo,
    moveToTomorrow: (item: LabFixtureObject) => moveTo(item, addDays(todayRef.value, 1)) }
}
