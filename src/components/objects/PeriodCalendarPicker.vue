<template>
  <div class="period-calendar">
    <button
      v-if="!triggerless"
      ref="trigger"
      type="button"
      class="mg-v2-button mg-v2-button--quiet"
      :aria-expanded="open"
      @click.stop="show"
    >
      <AppIcon name="calendar_month" />
      <span>{{ label || t('planning.periodPicker.choose') }}</span>
      <span v-if="modelValue.length">({{ modelValue.length }})</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="mg-design-v2 period-calendar__backdrop" @click.self="cancel">
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="label || t('planning.periodPicker.choose')"
          class="mg-v2-popover period-calendar__panel"
          @keydown="onKeydown"
        >
          <header class="flex items-center justify-between gap-3">
            <h3 class="font-semibold">{{ label || t('planning.periodPicker.choose') }}</h3>
            <button
              type="button"
              class="mg-v2-button mg-v2-button--quiet"
              :disabled="saving"
              @click="cancel"
            >
              {{ t('planning.periodPicker.cancel') }}
            </button>
          </header>
          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon"
              :aria-label="t('planning.periodPicker.previous')"
              @click="navigate(-1)"
            >
              ‹
            </button>
            <strong aria-live="polite">{{ heading }}</strong>
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon"
              :aria-label="t('planning.periodPicker.next')"
              @click="navigate(1)"
            >
              ›
            </button>
          </div>
          <div v-if="cadence === 'monthly'" class="period-calendar__months">
            <button
              v-for="month in months"
              :key="month"
              type="button"
              class="period-calendar__cell"
              :aria-pressed="draft.includes(month)"
              :disabled="saving"
              @click="toggle(month)"
            >
              {{ formatMonthName(month, locale) }}
            </button>
          </div>
          <div v-else class="space-y-1">
            <div class="period-calendar__days text-xs text-on-surface-variant" aria-hidden="true">
              <span v-for="day in weekdays" :key="day">{{ day }}</span>
            </div>
            <button
              v-for="week in weeks"
              :key="week"
              type="button"
              class="period-calendar__cell period-calendar__week"
              :aria-pressed="draft.includes(week)"
              :aria-label="formatWeekRange(week, locale)"
              :disabled="saving"
              @click="toggle(week)"
            >
              <span class="period-calendar__days" aria-hidden="true"
                ><span
                  v-for="day in getChildPeriods(week)"
                  :key="day"
                  :class="{
                    'opacity-40': day.slice(0, 7) !== cursor,
                    'font-bold underline': day === today,
                  }"
                  >{{ Number(day.slice(-2)) }}</span
                ></span
              >
              <span class="block text-xs"
                >{{ formatWeekRange(week, locale) }}
                <span class="opacity-60"
                  >· {{ t('planning.periodPicker.week') }} {{ Number(week.slice(-2)) }}</span
                ></span
              >
            </button>
          </div>
          <p v-if="cadence === 'weekly'" class="text-xs text-on-surface-variant">
            {{ t('planning.periodPicker.fullWeeks') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--quiet"
              :disabled="saving"
              @click="selectVisible"
            >
              {{ t('planning.periodPicker.selectVisible') }}
            </button>
            <button
              type="button"
              class="mg-v2-button mg-v2-button--quiet"
              :disabled="saving"
              @click="draft = []"
            >
              {{ t('planning.periodPicker.clear') }}
            </button>
            <button
              type="button"
              class="mg-v2-button mg-v2-button--quiet"
              @click="cursor = getPeriodRefsForDate(new Date()).month"
            >
              {{ t('planning.periodPicker.today') }}
            </button>
          </div>
          <details class="text-sm">
            <summary>{{ t('planning.periodPicker.range') }}</summary>
            <div class="flex flex-wrap items-end gap-2 py-2">
              <label class="min-w-0 flex-1"
                >{{ t('planning.periodPicker.from')
                }}<input
                  v-model="rangeStart"
                  class="mg-v2-field w-full"
                  :type="cadence === 'monthly' ? 'month' : 'date'"
              /></label>
              <label class="min-w-0 flex-1"
                >{{ t('planning.periodPicker.to')
                }}<input
                  v-model="rangeEnd"
                  class="mg-v2-field w-full"
                  :type="cadence === 'monthly' ? 'month' : 'date'"
              /></label>
              <button
                type="button"
                class="mg-v2-button"
                :disabled="saving || !rangeStart || !rangeEnd || rangeStart > rangeEnd"
                @click="addRange"
              >
                {{ t('planning.periodPicker.addRange') }}
              </button>
            </div>
          </details>
          <details v-if="draft.length" class="text-sm">
            <summary>{{ t('planning.periodPicker.selected', { count: draft.length }) }}</summary>
            <div class="max-h-32 overflow-auto py-2">
              <button
                v-for="period in [...draft].sort()"
                :key="period"
                type="button"
                class="block w-full py-1 text-left"
                :disabled="saving"
                @click="toggle(period)"
              >
                {{ periodLabel(period) }} ×
              </button>
            </div>
          </details>
          <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>
          <footer class="flex items-center justify-between gap-3">
            <span aria-live="polite" class="text-sm">{{
              t('planning.periodPicker.selected', { count: draft.length })
            }}</span>
            <button type="button" class="mg-v2-button" :disabled="saving" @click="apply">
              {{ t(saving ? 'planning.periodPicker.saving' : 'planning.periodPicker.done') }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import {
  getChildPeriods,
  getNextPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPreviousPeriod,
} from '@/utils/periods'
import { formatMonthName, formatMonthTitle, formatWeekRange } from '@/utils/periodLabels'
import { periodsInDateRange } from '@/utils/periodSchedule'

const props = defineProps<{
  modelValue: string[]
  cadence: 'weekly' | 'monthly'
  label?: string
  commit?: (periods: string[]) => Promise<void>
  /** Render only the dialog; the host opens it through `show()`. */
  triggerless?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
defineExpose({ show })
const { t, locale } = useT()
const open = ref(false)
const saving = ref(false)
const error = ref('')
const draft = ref<string[]>([])
const cursor = ref(getPeriodRefsForDate(new Date()).month)
const today = getPeriodRefsForDate(new Date()).day
const trigger = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const rangeStart = ref('')
const rangeEnd = ref('')
const months = computed(() => getChildPeriods(cursor.value.slice(0, 4) as YearRef))
const weeks = computed(() => getChildPeriods(cursor.value))
const heading = computed(() =>
  props.cadence === 'monthly'
    ? cursor.value.slice(0, 4)
    : formatMonthTitle(cursor.value, locale.value)
)
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(new Date(2026, 0, 5 + i))
  )
)
function periodLabel(value: string) {
  return props.cadence === 'weekly'
    ? formatWeekRange(value as WeekRef, locale.value)
    : formatMonthTitle(value as MonthRef, locale.value)
}
async function show() {
  draft.value = [...props.modelValue]
  error.value = ''
  rangeStart.value = ''
  rangeEnd.value = ''
  const sorted = [...props.modelValue].sort()
  const current = getPeriodRefsForDate(new Date())[props.cadence === 'monthly' ? 'month' : 'week']
  const anchor = sorted.find(period => period >= current) ?? sorted[sorted.length - 1]
  cursor.value = anchor
    ? getPeriodRefsForDate(getPeriodBounds(anchor as MonthRef | WeekRef).start).month
    : getPeriodRefsForDate(new Date()).month
  open.value = true
  await nextTick()
  panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
function cancel() {
  if (saving.value) return
  open.value = false
  void nextTick(() => trigger.value?.focus())
}
function navigate(direction: number) {
  const period = props.cadence === 'monthly' ? (cursor.value.slice(0, 4) as YearRef) : cursor.value
  const next = direction > 0 ? getNextPeriod(period) : getPreviousPeriod(period)
  cursor.value = (props.cadence === 'monthly' ? `${next}-01` : next) as MonthRef
}
function toggle(period: string) {
  draft.value = draft.value.includes(period)
    ? draft.value.filter(ref => ref !== period)
    : [...draft.value, period]
}
function selectVisible() {
  draft.value = [
    ...new Set([...draft.value, ...(props.cadence === 'monthly' ? months.value : weeks.value)]),
  ].sort()
}
function addRange() {
  const start = props.cadence === 'monthly' ? `${rangeStart.value}-01` : rangeStart.value
  const end = props.cadence === 'monthly' ? `${rangeEnd.value}-01` : rangeEnd.value
  draft.value = [
    ...new Set([...draft.value, ...periodsInDateRange(start, end, props.cadence)]),
  ].sort()
}
async function apply() {
  saving.value = true
  error.value = ''
  try {
    const value = [...new Set(draft.value)].sort()
    await props.commit?.(value)
    emit('update:modelValue', value)
    saving.value = false
    cancel()
  } catch {
    error.value = t('planning.objects.messages.saveError')
  } finally {
    saving.value = false
  }
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    cancel()
  }
  if (event.key !== 'Tab') return
  const elements = Array.from(
    panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input, summary') ?? []
  ).filter(el => el.getClientRects().length)
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<style scoped>
.period-calendar__backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--mg-color-scrim);
  display: grid;
  place-items: center;
  padding: 1rem;
}
.period-calendar__panel {
  width: min(100%, 27rem);
  max-height: 90dvh;
  overflow-y: auto;
  padding: 1rem;
  display: grid;
  gap: 0.8rem;
  color: var(--mg-color-ink);
}
.period-calendar__panel .mg-v2-button {
  min-height: 2rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.8125rem;
}
.period-calendar__panel footer {
  position: sticky;
  bottom: -1rem;
  background: var(--mg-color-surface);
  padding: 0.6rem 0;
}
.period-calendar__months {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}
.period-calendar__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  text-align: center;
  width: 100%;
}
.period-calendar__cell {
  padding: 0.4rem 0.35rem;
  border: 1px solid var(--mg-color-border);
  border-radius: 0.75rem;
  font-size: 0.875rem;
}
.period-calendar__cell:hover {
  background: var(--mg-color-primary-soft);
}
.period-calendar__cell[aria-pressed='true'] {
  background: var(--mg-color-primary-soft);
  border-color: var(--mg-color-primary);
  outline: 1px solid var(--mg-color-primary);
  outline-offset: -2px;
}
.period-calendar__week {
  width: 100%;
  display: grid;
  gap: 0.3rem;
}
</style>
