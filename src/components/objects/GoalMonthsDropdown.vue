<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="neo-pill neo-focus flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold"
      @click.stop="open = !open"
    >
      {{ t('planning.objects.actions.months') }}
      <span v-if="linkedMonths.length > 0" class="text-primary">({{ linkedMonths.length }})</span>
      <AppIcon name="expand_more" class="text-xs transition-transform duration-200" :class="open ? 'rotate-180' : ''" />
    </button>
    <div
      v-if="open"
      ref="listEl"
      class="absolute left-0 z-20 mt-1 max-h-[220px] min-w-[140px] overflow-y-auto rounded-xl border border-white/40 bg-white shadow-lg"
      @click.stop
      @scroll="onListScroll"
    >
      <button
        v-for="month in availableMonths"
        :key="month.ref"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-on-surface hover:bg-primary-soft/30"
        @click="toggleMonth(month)"
      >
        <AppIcon v-if="month.linked" name="check" class="text-xs flex-shrink-0 text-primary" />
        <span v-else class="h-3 w-3 flex-shrink-0" />
        {{ month.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MonthRef } from '@/domain/period'
import { getNextPeriod, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'

export interface LinkedMonth {
  monthRef: string
  displayLabel: string
}

const props = defineProps<{
  linkedMonths: LinkedMonth[]
}>()

const emit = defineEmits<{
  'link-month': [monthRef: string]
  'unlink-month': [monthRef: string]
}>()

const { t, locale } = useT()
const rootRef = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const open = ref(false)
const pastBatchCount = ref(1)
const isLoadingPast = ref(false)

const BATCH_SIZE = 4
const FUTURE_COUNT = 7

const linkedSet = computed(() => new Set(props.linkedMonths.map((m) => m.monthRef)))

const availableMonths = computed(() => {
  const now = new Date()
  const refs = getPeriodRefsForDate(now)
  const currentRef = refs.month as string
  const pastCount = pastBatchCount.value * BATCH_SIZE

  let ref = currentRef
  for (let i = 0; i < pastCount; i++) {
    ref = getPreviousPeriod(ref as MonthRef) as string
  }

  const months: Array<{ ref: string; label: string; linked: boolean }> = []
  for (let i = 0; i < pastCount + 1 + FUTURE_COUNT; i++) {
    months.push({
      ref,
      label: formatMonthShort(ref as MonthRef, locale.value),
      linked: linkedSet.value.has(ref),
    })
    ref = getNextPeriod(ref as MonthRef) as string
  }

  return months
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

function formatMonthShort(monthRef: MonthRef, loc: string): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(2, 4)
  const monthName = new Intl.DateTimeFormat(loc, { month: 'short' }).format(
    new Date(Number(monthRef.slice(0, 4)), monthIndex, 1),
  )
  return `${monthName} ${year}`
}

function toggleMonth(month: { ref: string; linked: boolean }): void {
  if (month.linked) {
    emit('unlink-month', month.ref)
  } else {
    emit('link-month', month.ref)
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
