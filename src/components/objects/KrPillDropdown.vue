<template>
  <div ref="rootRef" class="relative inline-flex">
    <button
      type="button"
      class="mg-v2-pill mg-v2-sentence__pill"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :disabled="disabled"
      @click.stop="toggle"
      @keydown.escape.stop="close"
    >
      {{ selectedLabel }}
      <AppIcon v-if="!disabled" name="expand_more" class="mg-v2-sentence__chevron text-xs" />
    </button>
    <div
      v-if="open"
      class="mg-v2-popover absolute left-0 top-full z-20 mt-1 min-w-[8rem] overflow-hidden py-1"
      role="listbox"
      @click.stop
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        role="option"
        :aria-selected="opt.value === modelValue"
        class="block w-full px-3 py-2 text-left text-xs hover:bg-primary-soft/30"
        :class="
          opt.value === modelValue ? 'font-bold text-primary' : 'font-semibold text-on-surface'
        "
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

// A word of the measurement sentence that can be changed: a flat pill that
// opens a small list. Lives inside `.mg-v2-sentence`, which styles the pill.
const props = withDefaults(
  defineProps<{
    modelValue: string
    options: Array<{ value: string; label: string }>
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt?.label ?? props.modelValue
})

function toggle(): void {
  if (!props.disabled) {
    open.value = !open.value
  }
}

function close(): void {
  open.value = false
}

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
