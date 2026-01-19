<template>
  <div class="space-y-3">
    <!-- Selected Week Display -->
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-section/50 border border-outline/30 hover:bg-section hover:border-outline/50 transition-all duration-200 group"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CalendarDaysIcon class="w-5 h-5 text-primary" />
        </div>
        <div class="text-left">
          <div class="text-sm font-medium text-on-surface">
            {{ selectedWeekLabel }}
          </div>
          <div class="text-xs text-on-surface-variant">
            {{ selectedDateRange }}
          </div>
        </div>
      </div>
      <ChevronDownIcon
        class="w-5 h-5 text-on-surface-variant transition-transform duration-200"
        :class="isExpanded ? 'rotate-180' : ''"
      />
    </button>

    <!-- Week Selector Panel -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-[0.98]"
    >
      <div
        v-if="isExpanded"
        class="rounded-2xl bg-surface border border-outline/30 shadow-elevation-2 overflow-hidden"
      >
        <!-- Month Navigation -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-outline/20 bg-section/30">
          <button
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-section hover:text-on-surface transition-colors"
            @click="navigateMonth(-1)"
            aria-label="Previous month"
          >
            <ChevronLeftIcon class="w-5 h-5" />
          </button>
          <span class="text-sm font-semibold text-on-surface">
            {{ currentMonthLabel }}
          </span>
          <button
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-section hover:text-on-surface transition-colors"
            :class="{ 'opacity-30 pointer-events-none': isCurrentMonth }"
            :disabled="isCurrentMonth"
            @click="navigateMonth(1)"
            aria-label="Next month"
          >
            <ChevronRightIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Weekday Headers -->
        <div class="grid grid-cols-7 px-2 pt-3 pb-1">
          <div
            v-for="day in weekdayLabels"
            :key="day"
            class="text-center text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar Grid -->
        <div class="px-2 pb-3">
          <div class="grid grid-cols-7 gap-y-0.5">
            <button
              v-for="(day, index) in calendarDays"
              :key="index"
              type="button"
              class="relative h-9 text-sm transition-all duration-150"
              :class="getDayClasses(day)"
              :disabled="day.isDisabled || !day.date"
              @click="day.date && selectWeek(day.date)"
            >
              <span v-if="day.date" class="relative z-10">{{ day.date.getDate() }}</span>
            </button>
          </div>
        </div>

        <!-- Quick Select Options -->
        <div class="px-3 pb-3 pt-1 border-t border-outline/20 flex flex-wrap gap-2">
          <button
            v-for="option in quickSelectOptions"
            :key="option.label"
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            :class="isWeekSelected(option.range)
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-section/60 text-on-surface-variant hover:bg-section hover:text-on-surface'"
            @click="selectRange(option.range)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'
import {
  getWeekRange,
  formatDateRange,
  getWeekNumber,
  toISODateString,
} from '@/utils/periodUtils'
import type { PeriodRange } from '@/utils/periodUtils'

const props = defineProps<{
  modelValue: PeriodRange
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PeriodRange]
}>()

const isExpanded = ref(false)
const viewingMonth = ref(new Date())

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const selectedWeekLabel = computed(() => {
  return `Week ${getWeekNumber(props.modelValue.start)}`
})

const selectedDateRange = computed(() => {
  return formatDateRange(props.modelValue.start, props.modelValue.end, 'weekly')
})

const currentMonthLabel = computed(() => {
  return viewingMonth.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
})

const isCurrentMonth = computed(() => {
  const now = new Date()
  return (
    viewingMonth.value.getMonth() === now.getMonth() &&
    viewingMonth.value.getFullYear() === now.getFullYear()
  )
})

interface CalendarDay {
  date: Date | null
  isDisabled: boolean
  isSelected: boolean
  isInSelectedWeek: boolean
  isWeekStart: boolean
  isWeekEnd: boolean
  isToday: boolean
  isFuture: boolean
}

const calendarDays = computed((): CalendarDay[] => {
  const year = viewingMonth.value.getFullYear()
  const month = viewingMonth.value.getMonth()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // First day of the month
  const firstDay = new Date(year, month, 1)
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)

  // Get the day of week for the first day (0 = Sunday, adjust to Monday-based)
  let startDayOfWeek = firstDay.getDay()
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // Convert to Monday-based

  const days: CalendarDay[] = []

  // Add empty cells for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({
      date: null,
      isDisabled: true,
      isSelected: false,
      isInSelectedWeek: false,
      isWeekStart: false,
      isWeekEnd: false,
      isToday: false,
      isFuture: false,
    })
  }

  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const weekRange = getWeekRange(date)
    const isFuture = date > today

    const isInSelectedWeek =
      toISODateString(weekRange.start) === toISODateString(props.modelValue.start)

    // Determine if this is the start or end of its week (within this month)
    const dayOfWeek = date.getDay()
    const isMonday = dayOfWeek === 1
    const isSunday = dayOfWeek === 0

    days.push({
      date,
      isDisabled: isFuture,
      isSelected: isInSelectedWeek,
      isInSelectedWeek,
      isWeekStart: isMonday || day === 1,
      isWeekEnd: isSunday || day === lastDay.getDate(),
      isToday: toISODateString(date) === toISODateString(today),
      isFuture,
    })
  }

  return days
})

const quickSelectOptions = computed(() => {
  const today = new Date()
  const options: { label: string; range: PeriodRange }[] = []

  // This week
  const thisWeek = getWeekRange(today)
  options.push({ label: 'This week', range: thisWeek })

  // Last week
  const lastWeekDate = new Date(today)
  lastWeekDate.setDate(lastWeekDate.getDate() - 7)
  const lastWeek = getWeekRange(lastWeekDate)
  options.push({ label: 'Last week', range: lastWeek })

  // 2 weeks ago
  const twoWeeksAgoDate = new Date(today)
  twoWeeksAgoDate.setDate(twoWeeksAgoDate.getDate() - 14)
  const twoWeeksAgo = getWeekRange(twoWeeksAgoDate)
  options.push({ label: '2 weeks ago', range: twoWeeksAgo })

  return options
})

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    // Reset viewing month to the selected week's month
    viewingMonth.value = new Date(props.modelValue.start)
  }
}

function navigateMonth(delta: number) {
  const newMonth = new Date(viewingMonth.value)
  newMonth.setMonth(newMonth.getMonth() + delta)

  // Don't allow navigating to future months
  const now = new Date()
  if (newMonth.getFullYear() > now.getFullYear() ||
      (newMonth.getFullYear() === now.getFullYear() && newMonth.getMonth() > now.getMonth())) {
    return
  }

  viewingMonth.value = newMonth
}

function selectWeek(date: Date) {
  const range = getWeekRange(date)
  emit('update:modelValue', range)
}

function selectRange(range: PeriodRange) {
  emit('update:modelValue', range)
  isExpanded.value = false
}

function isWeekSelected(range: PeriodRange): boolean {
  return toISODateString(range.start) === toISODateString(props.modelValue.start)
}

function getDayClasses(day: CalendarDay): string {
  if (!day.date) {
    return 'cursor-default'
  }

  const classes: string[] = []

  if (day.isFuture) {
    classes.push('text-on-surface-variant/30 cursor-not-allowed')
  } else if (day.isInSelectedWeek) {
    // Selected week styling
    classes.push('text-on-surface font-medium')

    // Background for the selected week
    if (day.isWeekStart && day.isWeekEnd) {
      // Single day visible in month
      classes.push('bg-primary/20 rounded-lg')
    } else if (day.isWeekStart) {
      classes.push('bg-primary/20 rounded-l-lg')
    } else if (day.isWeekEnd) {
      classes.push('bg-primary/20 rounded-r-lg')
    } else {
      classes.push('bg-primary/20')
    }
  } else {
    classes.push('text-on-surface hover:bg-section/60 rounded-lg cursor-pointer')
  }

  // Today indicator
  if (day.isToday && !day.isInSelectedWeek) {
    classes.push('font-bold text-primary')
  } else if (day.isToday && day.isInSelectedWeek) {
    classes.push('font-bold')
  }

  return classes.join(' ')
}
</script>
