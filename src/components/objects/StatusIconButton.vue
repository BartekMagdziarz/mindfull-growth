<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="neo-icon-button neo-focus"
      :class="toneClass"
      :title="selectedLabel"
      :aria-label="`Status: ${selectedLabel}`"
      @click.stop="open = !open"
    >
      <AppIcon :name="statusIcon" class="text-base" />
    </button>
    <div
      v-if="open"
      class="absolute bottom-full right-0 z-20 mb-1 min-w-[120px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
      @click.stop
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="block w-full px-4 py-2 text-left text-xs font-medium hover:bg-primary-soft/30"
        :class="opt.value === modelValue ? 'font-semibold text-primary' : 'text-on-surface'"
        @click="select(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue)
  return opt?.label ?? props.modelValue
})

const statusIcon = computed(() => {
  switch (props.modelValue) {
    case 'completed':
      return 'check_circle'
    case 'dropped':
      return 'cancel'
    case 'retired':
      return 'do_not_disturb_on'
    default:
      return 'lens'
  }
})

const toneClass = computed(() => {
  switch (props.modelValue) {
    case 'completed':
      return 'neo-icon-button--success'
    case 'dropped':
      return 'neo-icon-button--danger'
    case 'retired':
      return 'neo-icon-button--warning'
    default:
      return 'neo-icon-button--primary'
  }
})

function select(value: string): void {
  open.value = false
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
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
