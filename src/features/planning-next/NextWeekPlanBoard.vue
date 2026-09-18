<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import { useT } from '@/composables/useT'
import { useTodayStore } from '@/stores/today.store'
import {
  getTodayViewBundleForDay,
  type TodayViewBundle,
  type TodayMeasurementItem,
  type TodayAddCandidate,
} from '@/services/todayViewQueries'
import {
  addMeasurementToDay,
  removeMeasurementFromDay,
  moveTodayMeasurementAssignment,
} from '@/services/todayViewActions'
import { addDaysToDayRef, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import { dayItemIcon, rescheduleWeekLock } from './dayViewModels'
import AppIcon from '@/components/shared/AppIcon.vue'
const props = defineProps<{ dayRef: DayRef; active?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const store = useTodayStore()
const { t, locale } = useT()
const start = ref(getPeriodBounds(getPeriodRefsForDate(props.dayRef).week).start as DayRef)
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDaysToDayRef(start.value, i)))
const bundles = ref<TodayViewBundle[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')
const undo = ref<null | (() => Promise<void>)>(null)
const editor = ref<{
  source: DayRef
  item?: TodayMeasurementItem
  placement?: TodayMeasurementItem
} | null>(null)
const target = ref(props.dayRef)
const candidateKey = ref('')
let generation = 0
const today = () => getPeriodRefsForDate(new Date()).day
const label = (date: DayRef, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, options).format(new Date(`${date}T12:00:00`))
const scheduled = (date: DayRef) =>
  (bundles.value.find(b => b.dayRef === date)?.sections.scheduled ?? []).filter(
    (i): i is TodayMeasurementItem => i.kind === 'measurement'
  )
const flexible = computed(() => {
  const seen = new Set<string>()
  return bundles.value
    .flatMap(b => b.sections.week)
    .filter(
      (i): i is TodayMeasurementItem =>
        i.kind === 'measurement' && !seen.has(i.key) && !!seen.add(i.key)
    )
})
const candidates = computed(
  () => bundles.value.find(b => b.dayRef === editor.value?.source)?.addCandidates ?? []
)
const asCandidate = (item: TodayMeasurementItem): TodayAddCandidate => ({
  key: item.key,
  subject: item.subject,
  subjectType: item.subjectType,
  cadence: item.subject.cadence,
  sourceMonthRef: item.sourceMonthRef,
})
async function load() {
  const id = ++generation
  loading.value = true
  error.value = ''
  bundles.value = []
  try {
    const data = await Promise.all(days.value.map(getTodayViewBundleForDay))
    if (id === generation) bundles.value = data
  } catch (e) {
    if (id === generation) error.value = String(e instanceof Error ? e.message : e)
  } finally {
    if (id === generation) loading.value = false
  }
}
watch(
  () => props.active,
  value => {
    if (value) void load()
  }
)
watch(
  () => props.dayRef,
  date => {
    start.value = getPeriodBounds(getPeriodRefsForDate(date).week).start as DayRef
  }
)
watch(
  start,
  () => {
    editor.value = null
    void load()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  generation++
})
const editorForm = ref<HTMLFormElement>()
async function open(date: DayRef, item?: TodayMeasurementItem, placement?: TodayMeasurementItem) {
  editor.value = { source: date, item, placement }
  target.value = date
  candidateKey.value = ''
  error.value = ''
  await nextTick()
  editorForm.value?.querySelector<HTMLElement>('select, input')?.focus()
}
async function refresh() {
  await store.loadBundle(props.dayRef)
  await load()
}
async function execute(action: () => Promise<void>, inverse: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await action()
    store.clearUndo()
    undo.value = inverse
    editor.value = null
    message.value = t('planning.today.calendarPlan.saved')
    await refresh()
  } catch (e) {
    error.value = String(e instanceof Error ? e.message : e)
  } finally {
    busy.value = false
  }
}
async function save() {
  const current = editor.value
  if (!current || busy.value) return
  const destination = target.value
  if (current.source < today() || destination < today()) return
  const item = current.item
  const candidate =
    item || current.placement
      ? asCandidate((item ?? current.placement)!)
      : candidates.value.find(c => c.key === candidateKey.value)
  if (!candidate) return
  const lock = item
    ? rescheduleWeekLock(item)
    : candidate.subjectType === 'weeklyIntention'
      ? (candidate.subject as { weekRef: string }).weekRef
      : null
  if (lock && getPeriodRefsForDate(destination).week !== lock) {
    error.value = t('planning.today.calendarPlan.weekOnly')
    return
  }
  if (item && destination === current.source) {
    editor.value = null
    return
  }
  const destinationBundle = await getTodayViewBundleForDay(destination).catch(() => null)
  if (!destinationBundle) {
    error.value = t('planning.today.calendarPlan.loadError')
    return
  }
  if (
    destinationBundle.allDayAssignments.some(
      a =>
        a.dayRef === destination &&
        a.subjectId === candidate.subject.id &&
        a.subjectType === candidate.subjectType
    )
  ) {
    error.value = t('planning.today.calendarPlan.duplicate')
    return
  }
  if (item)
    await execute(
      () => moveTodayMeasurementAssignment(item, current.source, destination),
      () => moveTodayMeasurementAssignment(item, destination, current.source)
    )
  else
    await execute(
      () => addMeasurementToDay(candidate, destination),
      () => removeMeasurementFromDay(candidate, destination)
    )
}
async function remove() {
  const current = editor.value
  if (!current?.item || current.source < today()) return
  const candidate = asCandidate(current.item)
  await execute(
    () => removeMeasurementFromDay(candidate, current.source),
    () => addMeasurementToDay(candidate, current.source)
  )
}
async function undoLast() {
  if (!undo.value || busy.value) return
  busy.value = true
  try {
    await undo.value()
    undo.value = null
    message.value = t('planning.today.messages.undone')
    await refresh()
  } catch (e) {
    error.value = String(e instanceof Error ? e.message : e)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section
    class="week-plan-board"
    tabindex="-1"
    :aria-label="t('planning.today.calendarPlan.title')"
    @keydown.esc.stop.prevent="busy ? undefined : editor ? (editor = null) : emit('close')"
  >
    <header class="day-plan-calendar__header">
      <strong>{{ t('planning.today.calendarPlan.title') }}</strong
      ><button :disabled="busy" @click="emit('close')">
        <AppIcon name="close_fullscreen" />{{ t('planning.today.calendarPlan.back') }}
      </button>
    </header>
    <nav class="day-plan-calendar__period">
      <button
        :disabled="busy"
        :aria-label="t('planning.today.calendar.previousPeriod')"
        @click="start = addDaysToDayRef(start, -7)"
      >
        <AppIcon name="chevron_left" /></button
      ><span
        >{{ label(start, { day: 'numeric', month: 'short' }) }} –
        {{ label(days[6], { day: 'numeric', month: 'short', year: 'numeric' }) }}</span
      ><button
        :disabled="busy"
        :aria-label="t('planning.today.calendar.nextPeriod')"
        @click="start = addDaysToDayRef(start, 7)"
      >
        <AppIcon name="chevron_right" />
      </button>
    </nav>
    <p v-if="loading" role="status">{{ t('planning.today.calendarPlan.loading') }}</p>
    <div v-else class="week-plan-board__days">
      <section v-for="date in days" :key="date">
        <strong>{{ label(date, { weekday: 'short', day: 'numeric' }) }}</strong
        ><button
          v-for="item in scheduled(date)"
          :key="item.key"
          :disabled="busy || date < today() || !item.canReschedule"
          @click="open(date, item)"
        >
          <AppIcon :name="dayItemIcon(item)" />{{ item.subject.title }}</button
        ><small v-if="!scheduled(date).length">{{ t('planning.today.calendarPlan.empty') }}</small
        ><button
          v-if="date >= today()"
          :disabled="busy"
          :aria-label="`${t('planning.today.actions.addToPlan')}: ${date}`"
          @click="open(date)"
        >
          <AppIcon name="add" />
        </button>
      </section>
    </div>
    <section v-if="flexible.length" class="week-plan-board__flex">
      <strong>{{ t('planning.today.calendarPlan.flexible') }}</strong
      ><button
        v-for="item in flexible"
        :key="item.key"
        :disabled="busy || days[6] < today()"
        @click="open(start < today() ? today() : start, undefined, item)"
      >
        {{ item.subject.title }}<AppIcon name="add" />
      </button>
    </section>
    <form v-if="editor" ref="editorForm" class="week-plan-board__editor" @submit.prevent="save">
      <strong v-if="editor.item || editor.placement">{{
        (editor.item ?? editor.placement)!.subject.title
      }}</strong>
      <label v-else
        >{{ t('planning.today.calendarPlan.object')
        }}<select
          v-model="candidateKey"
          :aria-label="t('planning.today.calendarPlan.object')"
          required
          :disabled="busy"
        >
          <option disabled value="">{{ t('planning.today.calendarPlan.choose') }}</option>
          <option v-for="c in candidates" :key="c.key" :value="c.key">{{ c.subject.title }}</option>
        </select></label
      >
      <label
        >{{ t('planning.today.calendarPlan.date')
        }}<input v-model="target" type="date" :min="today()" required :disabled="busy"
      /></label>
      <button v-if="editor.item" type="button" :disabled="busy" @click="remove">
        {{ t('planning.today.calendarPlan.remove') }}</button
      ><button type="button" :disabled="busy" @click="editor = null">
        {{ t('common.buttons.cancel') }}</button
      ><button type="submit" :disabled="busy">{{ t('planning.today.calendarPlan.save') }}</button>
    </form>
    <p v-if="error" role="alert">
      {{ error }}
      <button v-if="!editor" :disabled="busy" @click="load">
        {{ t('planning.today.calendarPlan.retry') }}
      </button>
    </p>
    <p v-if="message" role="status">
      {{ message }}
      <button v-if="undo" :disabled="busy" @click="undoLast">
        {{ t('planning.today.actions.undo') }}
      </button>
    </p>
  </section>
</template>
