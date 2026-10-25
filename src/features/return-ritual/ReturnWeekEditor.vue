<template>
  <!-- Phase B „Uzupełnij”: one block per kept week, one row per kept subject.
       Each day has a planned toggle (the disc) and an entry control in the
       subject's own measurement grammar. An empty planned day is a legal
       answer: it was planned and not done. -->
  <div class="rr-editor" data-testid="return-week-editor">
    <section v-for="block in weeks" :key="block.weekRef" class="rr-week">
      <header class="rr-week__head">
        <strong>Tydzień {{ weekNumber(block.weekRef) }}</strong>
        <small>{{ weekRangeShort(block.weekRef) }}</small>
      </header>
      <div class="rr-grid" role="table" :aria-label="`Tydzień ${weekNumber(block.weekRef)}`">
        <div class="rr-grid__head" role="row">
          <span role="columnheader">&nbsp;</span>
          <span v-for="day in daysOf(block.weekRef)" :key="day.dayRef" role="columnheader">
            {{ day.weekday }}<small>{{ day.number }}</small>
          </span>
          <span role="columnheader">cel</span>
        </div>
        <div
          v-for="draft in block.drafts"
          :key="weekDraftKey(draft)"
          class="rr-grid__row"
          role="row"
          :data-testid="`return-week-row-${draft.subjectId}-${draft.weekRef}`"
        >
          <span class="rr-name" role="cell">
            <AppIcon :name="iconOf(draft)" />
            <span>
              <strong>{{ subjectOf(draft)?.subject.title }}</strong>
              <small>
                {{ modeLabel(draft) }}
                <button
                  v-if="modeOf(draft) === 'completion' && draft.dayRefs.length"
                  type="button"
                  class="rr-link"
                  @click="emit('done', weekDraftKey(draft))"
                >
                  zrobione w zaplanowane dni
                </button>
              </small>
            </span>
          </span>
          <div
            v-for="day in daysOf(block.weekRef)"
            :key="day.dayRef"
            class="rr-cell"
            :class="{ 'is-planned': draft.dayRefs.includes(day.dayRef) }"
            role="cell"
          >
            <button
              type="button"
              class="rr-plan"
              :aria-pressed="draft.dayRefs.includes(day.dayRef)"
              :aria-label="`Zaplanowany ${day.long}`"
              :title="draft.dayRefs.includes(day.dayRef) ? 'Zaplanowany' : 'Nie zaplanowany'"
              @click="emit('plannedToggle', weekDraftKey(draft), day.dayRef)"
            >
              <i />
            </button>
            <!-- Entry control, by measurement mode -->
            <button
              v-if="modeOf(draft) === 'completion'"
              type="button"
              class="rr-done"
              :aria-pressed="Boolean(draft.entries[day.dayRef])"
              :aria-label="`Zrobione ${day.long}`"
              @click="
                emit(
                  'entry',
                  weekDraftKey(draft),
                  day.dayRef,
                  draft.entries[day.dayRef] ? undefined : { value: null }
                )
              "
            >
              <AppIcon v-if="draft.entries[day.dayRef]" name="check" />
            </button>
            <input
              v-else-if="modeOf(draft) === 'counter' || modeOf(draft) === 'value'"
              type="number"
              class="rr-num"
              inputmode="decimal"
              :min="0"
              :step="modeOf(draft) === 'counter' ? 1 : 'any'"
              :value="draft.entries[day.dayRef]?.value ?? ''"
              :aria-label="`${modeOf(draft) === 'counter' ? 'Liczba' : 'Wartość'} ${day.long}`"
              placeholder="–"
              @change="onNumber(draft, day.dayRef, $event)"
            />
            <select
              v-else-if="modeOf(draft) === 'rating'"
              class="rr-num"
              :value="draft.entries[day.dayRef]?.value ?? ''"
              :aria-label="`Ocena ${day.long}`"
              @change="onNumber(draft, day.dayRef, $event)"
            >
              <option value="">–</option>
              <option v-for="step in ratingSteps(draft)" :key="step" :value="step">
                {{ step }}
              </option>
            </select>
            <details v-else class="rr-multi">
              <summary :aria-label="`Checklista ${day.long}`">
                {{ draft.entries[day.dayRef]?.checkedItemIds?.length || '–' }}
              </summary>
              <div class="rr-multi__list">
                <label v-for="item in itemsOf(draft)" :key="item.id">
                  <input
                    type="checkbox"
                    :checked="draft.entries[day.dayRef]?.checkedItemIds?.includes(item.id) ?? false"
                    @change="onItem(draft, day.dayRef, item.id, $event)"
                  />
                  <span>{{ item.label }}</span>
                </label>
              </div>
            </details>
          </div>
          <div class="rr-target" role="cell">
            <input
              v-if="hasTarget(draft)"
              type="number"
              class="rr-num rr-num--target"
              inputmode="decimal"
              :min="0"
              step="any"
              :value="targetValue(weekDraftKey(draft)) ?? ''"
              aria-label="Cel tygodnia"
              @change="onTarget(draft, $event)"
            />
            <span v-else class="rr-muted">—</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { MeasurementEntryMode, MultiCompletionItem } from '@/domain/planning'
import {
  subjectKey,
  weekDraftKey,
  type ReturnEntryValue,
  type ReturnSubjectSummary,
  type ReturnWeekDraft,
} from '@/domain/returnRitual'
import { getChildPeriods } from '@/utils/periods'
import { subjectIcon, weekRangeShort } from './useReturnRitual'

const props = defineProps<{
  weeks: Array<{ weekRef: WeekRef; drafts: ReturnWeekDraft[] }>
  subjectsByKey: Map<string, ReturnSubjectSummary>
  targetValue: (key: string) => number | null
}>()

const emit = defineEmits<{
  plannedToggle: [key: string, dayRef: DayRef]
  entry: [key: string, dayRef: DayRef, value: ReturnEntryValue | undefined]
  done: [key: string]
  target: [key: string, value: number | null]
}>()

const WEEKDAY_SHORT = ['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd']
const WEEKDAY_LONG = [
  'poniedziałek',
  'wtorek',
  'środa',
  'czwartek',
  'piątek',
  'sobota',
  'niedziela',
]
const MODE_LABEL: Record<MeasurementEntryMode, string> = {
  completion: 'odhaczenie',
  counter: 'liczba na dzień',
  value: 'wartość na dzień',
  rating: 'ocena',
  'multi-completion': 'checklista',
}

function weekNumber(weekRef: WeekRef): string {
  return weekRef.split('-W')[1] ?? weekRef
}

function daysOf(weekRef: WeekRef) {
  return (getChildPeriods(weekRef) as DayRef[]).map((dayRef, index) => ({
    dayRef,
    weekday: WEEKDAY_SHORT[index],
    number: Number(dayRef.slice(8, 10)),
    long: `${WEEKDAY_LONG[index]} ${Number(dayRef.slice(8, 10))}`,
  }))
}

function subjectOf(draft: ReturnWeekDraft): ReturnSubjectSummary | undefined {
  return props.subjectsByKey.get(subjectKey(draft))
}
function iconOf(draft: ReturnWeekDraft): string {
  const subject = subjectOf(draft)
  return subject ? subjectIcon(subject) : 'flag'
}
function modeOf(draft: ReturnWeekDraft): MeasurementEntryMode | undefined {
  return subjectOf(draft)?.subject.entryMode
}
function modeLabel(draft: ReturnWeekDraft): string {
  const mode = modeOf(draft)
  return mode ? MODE_LABEL[mode] : ''
}
function hasTarget(draft: ReturnWeekDraft): boolean {
  const subject = subjectOf(draft)
  return Boolean(subject && 'target' in subject.subject)
}
function ratingSteps(draft: ReturnWeekDraft): number[] {
  const subject = subjectOf(draft)?.subject
  const min = subject?.ratingScaleMin ?? 1
  const max = subject?.ratingScale ?? 5
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index)
}
function itemsOf(draft: ReturnWeekDraft): MultiCompletionItem[] {
  return (subjectOf(draft)?.subject.multiItems ?? []).filter(item => !item.archived)
}

function numberFrom(event: Event): number | null {
  const raw = (event.target as HTMLInputElement | HTMLSelectElement).value.trim()
  if (raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}
function onNumber(draft: ReturnWeekDraft, dayRef: DayRef, event: Event): void {
  const value = numberFrom(event)
  emit('entry', weekDraftKey(draft), dayRef, value === null ? undefined : { value })
}
function onItem(draft: ReturnWeekDraft, dayRef: DayRef, itemId: string, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  const current = draft.entries[dayRef]?.checkedItemIds ?? []
  const next = checked ? [...new Set([...current, itemId])] : current.filter(id => id !== itemId)
  emit(
    'entry',
    weekDraftKey(draft),
    dayRef,
    next.length ? { value: null, checkedItemIds: next } : undefined
  )
}
function onTarget(draft: ReturnWeekDraft, event: Event): void {
  emit('target', weekDraftKey(draft), numberFrom(event))
}
</script>
