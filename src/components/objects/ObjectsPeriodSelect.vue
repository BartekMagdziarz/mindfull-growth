<template>
  <div ref="rootRef" class="relative">
    <div class="flex items-center">
      <button
        ref="triggerRef"
        type="button"
        class="mg-v2-pill objects-period__chip gap-1.5 px-3"
        :class="modelValue ? 'mg-v2-pill--primary mg-v2-pill--selected' : ''"
        :aria-label="label"
        :aria-expanded="open"
        aria-haspopup="dialog"
        @click.stop="toggleOpen"
      >
        <AppIcon name="calendar_month" class="text-sm" />
        <span>{{ chipLabel }}</span>
        <AppIcon v-if="!modelValue" name="expand_more" class="text-sm" />
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet objects-period__clear -ml-1"
        :aria-label="clearLabel"
        :title="clearLabel"
        @click.stop="clear"
      >
        <AppIcon name="close" class="text-sm" />
      </button>
    </div>

    <section
      v-if="open"
      ref="panelRef"
      role="dialog"
      :aria-label="label"
      class="mg-v2-popover objects-period__panel absolute right-0 top-full z-20 mt-2 p-3"
      @click.stop
      @keydown="onKeydown"
    >
      <header class="mb-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
          :aria-label="previousLabel"
          @click="cursorYear = String(Number(cursorYear) - 1)"
        >
          <AppIcon name="chevron_left" class="text-base" />
        </button>
        <button
          type="button"
          class="mg-v2-pill objects-period__year px-4"
          :class="isYearSelected ? 'mg-v2-pill--primary mg-v2-pill--selected' : ''"
          :aria-pressed="isYearSelected"
          :title="yearHint"
          @click="selectYear"
        >
          {{ cursorYear }}
        </button>
        <button
          type="button"
          class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
          :aria-label="nextLabel"
          @click="cursorYear = String(Number(cursorYear) + 1)"
        >
          <AppIcon name="chevron_right" class="text-base" />
        </button>
      </header>

      <div class="objects-period__months" role="group" :aria-label="label">
        <button
          v-for="month in months"
          :key="month"
          type="button"
          class="objects-period__cell"
          :class="{
            'objects-period__cell--selected': modelValue === month,
            'objects-period__cell--current': month === currentMonth,
          }"
          :aria-pressed="modelValue === month"
          :aria-label="formatMonthTitle(month, locale)"
          @click="selectMonth(month)"
        >
          {{ shortMonth(month) }}
        </button>
      </div>

      <footer class="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
        <span>{{ yearHint }}</span>
        <button
          v-if="modelValue"
          type="button"
          class="font-semibold text-primary hover:underline"
          @click="clear"
        >
          {{ clearLabel }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MonthRef, PeriodRef, YearRef } from '@/domain/period'
import { getChildPeriods, getPeriodRefsForDate, getPeriodType } from '@/utils/periods'
import { formatMonthTitle, formatPeriodLabel } from '@/utils/periodLabels'

const props = defineProps<{
  modelValue?: PeriodRef
  label: string
  clearLabel: string
  yearHint: string
  previousLabel: string
  nextLabel: string
  weekLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PeriodRef | undefined]
}>()

const { locale } = useT()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)

const today = getPeriodRefsForDate(new Date())
const currentMonth = today.month
const cursorYear = ref<string>(today.year)

const months = computed(() => getChildPeriods(cursorYear.value as YearRef) as MonthRef[])
const isYearSelected = computed(() => props.modelValue === cursorYear.value)

// Chip text: year → "2026", month → "mar 2026" (locale short month). Any
// other ref that still arrives through the URL (week/day) is shown raw so
// the state is never hidden; picking anything in the popover replaces it.
const chipLabel = computed(() => {
  const value = props.modelValue
  if (!value) return props.label
  const type = getPeriodType(value)
  if (type === 'year') return value
  if (type === 'month') return shortMonthWithYear(value as MonthRef)
  return formatPeriodLabel(value, locale.value, props.weekLabel)
})

function shortMonth(monthRef: MonthRef): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  return new Intl.DateTimeFormat(locale.value, { month: 'short' })
    .format(new Date(Number(monthRef.slice(0, 4)), monthIndex, 1))
    .replace(/\.$/, '')
}

function shortMonthWithYear(monthRef: MonthRef): string {
  return `${shortMonth(monthRef)} ${monthRef.slice(0, 4)}`
}

function anchorCursor(): void {
  const value = props.modelValue
  cursorYear.value = value && /^\d{4}/.test(value) ? value.slice(0, 4) : today.year
}

async function toggleOpen(): Promise<void> {
  if (open.value) {
    close()
    return
  }
  anchorCursor()
  open.value = true
  await nextTick()
  const selected = panelRef.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
  ;(selected ?? panelRef.value?.querySelector<HTMLButtonElement>('.objects-period__cell'))?.focus()
}

function close(restoreFocus = true): void {
  if (!open.value) return
  open.value = false
  if (restoreFocus) void nextTick(() => triggerRef.value?.focus())
}

function selectYear(): void {
  const year = cursorYear.value as YearRef
  emit('update:modelValue', props.modelValue === year ? undefined : year)
  close()
}

function selectMonth(month: MonthRef): void {
  emit('update:modelValue', props.modelValue === month ? undefined : month)
  close()
}

function clear(): void {
  emit('update:modelValue', undefined)
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  const cells = Array.from(
    panelRef.value?.querySelectorAll<HTMLButtonElement>('.objects-period__cell') ?? [],
  )
  const index = cells.findIndex((cell) => cell === document.activeElement)
  if (index === -1) return
  const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }
  const delta = step[event.key]
  if (delta === undefined) return
  event.preventDefault()
  const next = cells[index + delta]
  if (next) next.focus()
}

function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close(false)
  }
}

watch(
  () => props.modelValue,
  () => {
    if (!open.value) anchorCursor()
  },
)

onMounted(() => {
  anchorCursor()
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>

<style scoped>
.objects-period__chip {
  min-height: 2rem;
  white-space: nowrap;
}

.objects-period__panel {
  width: 16.5rem;
}

.objects-period__year {
  min-height: 1.875rem;
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-sm);
  font-weight: 900;
}

.objects-period__months {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
}

.objects-period__cell {
  min-height: 2rem;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-sm);
  color: var(--mg-color-muted);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-raised-sm);
  font-size: var(--mg-font-size-xs);
  font-weight: 800;
  text-transform: lowercase;
  cursor: pointer;
}

.objects-period__cell:hover {
  background: var(--mg-color-paper);
}

.objects-period__cell--current {
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.objects-period__cell--selected {
  border-color: var(--mg-color-primary);
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-paper);
  box-shadow: none;
}
</style>
