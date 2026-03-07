<template>
  <div class="relative" ref="pickerRef">
    <div class="flex items-center gap-1">
      <button
        v-for="option in visibleOptions"
        :key="option.value"
        type="button"
        :disabled="disabled"
        :class="[
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isExpanded || option.value === currentStatus
            ? 'neo-icon-button neo-focus h-8 w-8 p-0 opacity-100 scale-100'
            : 'opacity-0 scale-75 w-0 h-0 overflow-hidden',
          option.value === currentStatus
            ? option.activeClass
            : '',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
        ]"
        :aria-label="option.label"
        :title="option.label"
        @click="handleClick(option.value)"
      >
        <component
          :is="option.icon"
          v-if="option.icon"
          class="h-4 w-4"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface StatusOption {
  value: string
  label: string
  activeClass?: string
  badgeClass?: string
  dotClass?: string
  icon?: object
}

const props = withDefaults(
  defineProps<{
    currentStatus: string
    options: StatusOption[]
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  change: [status: string]
}>()

const isExpanded = ref(false)
const pickerRef = ref<HTMLElement | null>(null)

const visibleOptions = computed(() => {
  if (isExpanded.value) return props.options
  return props.options.filter((o) => o.value === props.currentStatus)
})

function handleClick(status: string) {
  if (props.disabled) return

  if (!isExpanded.value) {
    isExpanded.value = true
    return
  }

  if (status !== props.currentStatus) {
    emit('change', status)
  }
  isExpanded.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
    isExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
