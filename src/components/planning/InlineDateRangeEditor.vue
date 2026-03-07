<template>
  <div ref="containerRef" class="relative inline-flex">
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'neo-pill neo-focus inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ]"
      :aria-label="displayText || 'Set dates'"
      @click="toggle"
    >
      <CalendarIcon class="h-3.5 w-3.5 text-on-surface-variant" />
      <span v-if="displayText" class="text-on-surface-variant whitespace-nowrap">{{ displayText }}</span>
      <span v-else class="text-on-surface-variant/60 italic whitespace-nowrap">Set dates</span>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          class="fixed z-50 w-[20rem] rounded-xl border border-neu-border/25 bg-neu-base p-3 shadow-neu-raised"
          :style="popoverStyle"
        >
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Start
              </label>
              <input
                v-model="draftStartDate"
                type="date"
                class="neo-input w-full px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                End
              </label>
              <input
                v-model="draftEndDate"
                type="date"
                class="neo-input w-full px-2.5 py-2 text-sm"
              />
            </div>
          </div>

          <p v-if="validationError" class="mt-2 text-xs text-error">
            {{ validationError }}
          </p>

          <div class="mt-3 flex justify-end gap-2">
            <button
              type="button"
              class="neo-pill neo-focus px-2.5 py-1 text-xs font-medium"
              @click="handleClear"
            >
              Clear
            </button>
            <button
              type="button"
              class="neo-pill neo-pill--primary neo-focus px-2.5 py-1 text-xs font-medium"
              :disabled="!!validationError"
              @click="handleSave"
            >
              Done
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarIcon } from '@heroicons/vue/24/outline'
import { formatPeriodDateRangeNoYear } from '@/utils/periodUtils'

const props = withDefaults(
  defineProps<{
    startDate?: string
    endDate?: string
    disabled?: boolean
  }>(),
  {
    startDate: undefined,
    endDate: undefined,
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:dates': [startDate: string | undefined, endDate: string | undefined]
}>()

const containerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const draftStartDate = ref('')
const draftEndDate = ref('')
const popoverStyle = ref<Record<string, string>>({})

const displayText = computed(() => {
  if (props.startDate && props.endDate) {
    return formatPeriodDateRangeNoYear(props.startDate, props.endDate)
  }
  if (props.startDate) return `From ${formatSingleDate(props.startDate)}`
  if (props.endDate) return `Until ${formatSingleDate(props.endDate)}`
  return ''
})

const validationError = computed(() => {
  if (draftStartDate.value && draftEndDate.value && draftStartDate.value > draftEndDate.value) {
    return 'End date must be on or after start date.'
  }
  return ''
})

function formatSingleDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function updatePopoverPosition() {
  if (!containerRef.value) return

  const trigger = containerRef.value.getBoundingClientRect()
  const popoverWidth = 320
  const popoverHeight = 200
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = trigger.left
  let top = trigger.bottom + 6

  if (left + popoverWidth > viewportWidth - 8) {
    left = viewportWidth - popoverWidth - 8
  }
  if (left < 8) left = 8

  if (top + popoverHeight > viewportHeight - 8) {
    top = trigger.top - popoverHeight - 6
  }
  if (top < 8) top = 8

  popoverStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  }
}

function open() {
  if (props.disabled) return
  draftStartDate.value = props.startDate || ''
  draftEndDate.value = props.endDate || ''
  isOpen.value = true
  updatePopoverPosition()
}

function close() {
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) {
    close()
    return
  }
  open()
}

function handleSave() {
  if (validationError.value) return
  emit(
    'update:dates',
    draftStartDate.value || undefined,
    draftEndDate.value || undefined
  )
  close()
}

function handleClear() {
  emit('update:dates', undefined, undefined)
  close()
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    containerRef.value &&
    !containerRef.value.contains(target) &&
    (!popoverRef.value || !popoverRef.value.contains(target))
  ) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

function handleWindowChange() {
  if (!isOpen.value) return
  updatePopoverPosition()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
})
</script>
