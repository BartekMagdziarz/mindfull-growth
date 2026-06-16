<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="neo-badge neo-focus flex items-center gap-1 px-2.5 py-1 text-[11px] transition-colors hover:bg-white/70"
      :aria-label="buttonLabel"
      @click.stop="open = !open"
    >
      <AppIcon name="calendar_today" class="text-xs" />
      <span v-if="selectedLabel" class="text-on-surface">{{ selectedLabel }}</span>
      <span v-else class="text-on-surface-variant">{{ t('planning.objects.actions.years') }}</span>
      <AppIcon
        name="expand_more"
        class="text-xs transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div
      v-if="open"
      ref="listEl"
      class="absolute left-0 z-20 mt-1 max-h-[220px] min-w-[120px] overflow-y-auto rounded-xl border border-outline/30 bg-surface shadow-lg"
      @click.stop
      @scroll="onListScroll"
    >
      <button
        v-for="year in availableYears"
        :key="year.ref"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-on-surface hover:bg-primary-soft/30"
        @click="toggleYear(year)"
      >
        <AppIcon v-if="year.linked" name="check" class="text-xs flex-shrink-0 text-primary" />
        <span v-else class="h-3 w-3 flex-shrink-0" />
        {{ year.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { YearRef } from '@/domain/period'
import { getNextPeriod, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'

export interface LinkedYear {
  yearRef: string
  displayLabel: string
}

const props = defineProps<{
  linkedYears: LinkedYear[]
}>()

const emit = defineEmits<{
  'link-year': [yearRef: string]
  'unlink-year': [yearRef: string]
}>()

const { t } = useT()
const rootRef = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const open = ref(false)
const pastBatchCount = ref(1)
const isLoadingPast = ref(false)

const BATCH_SIZE = 3
const FUTURE_COUNT = 7

const linkedSet = computed(() => new Set(props.linkedYears.map((y) => y.yearRef)))

const selectedLabel = computed(() => {
  const sorted = [...props.linkedYears].sort((a, b) => a.yearRef.localeCompare(b.yearRef))
  return sorted.map((y) => y.displayLabel).join(', ')
})

const buttonLabel = computed(() =>
  selectedLabel.value
    ? `${t('planning.objects.actions.years')}: ${selectedLabel.value}`
    : t('planning.objects.actions.years')
)

const availableYears = computed(() => {
  const now = new Date()
  const refs = getPeriodRefsForDate(now)
  const currentRef = refs.year as string
  const pastCount = pastBatchCount.value * BATCH_SIZE

  let ref = currentRef
  for (let i = 0; i < pastCount; i++) {
    ref = getPreviousPeriod(ref as YearRef) as string
  }

  const years: Array<{ ref: string; label: string; linked: boolean }> = []
  for (let i = 0; i < pastCount + 1 + FUTURE_COUNT; i++) {
    years.push({
      ref,
      label: ref,
      linked: linkedSet.value.has(ref),
    })
    ref = getNextPeriod(ref as YearRef) as string
  }

  return years
})

watch(open, async (isOpen) => {
  if (!isOpen) {
    pastBatchCount.value = 1
    return
  }
  pastBatchCount.value = 1
  await nextTick()
  if (listEl.value) {
    const items = listEl.value.querySelectorAll('button')
    const currentEl = items[BATCH_SIZE] as HTMLElement | undefined
    if (currentEl) {
      listEl.value.scrollTop = currentEl.offsetTop
    }
  }
})

async function onListScroll(e: Event): Promise<void> {
  const el = e.target as HTMLElement
  if (el.scrollTop > 20 || isLoadingPast.value) return
  isLoadingPast.value = true
  const prevScrollHeight = el.scrollHeight
  pastBatchCount.value++
  await nextTick()
  el.scrollTop = el.scrollHeight - prevScrollHeight
  isLoadingPast.value = false
}

function toggleYear(year: { ref: string; linked: boolean }): void {
  if (year.linked) {
    emit('unlink-year', year.ref)
  } else {
    emit('link-year', year.ref)
  }
}

function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
