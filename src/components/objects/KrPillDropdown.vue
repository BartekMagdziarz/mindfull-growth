<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="neo-pill neo-focus flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold"
      :class="[toneClass, { 'cursor-default opacity-70': disabled }]"
      :disabled="disabled"
      @click.stop="toggle"
    >
      {{ selectedLabel }}
      <AppIcon v-if="!disabled" name="expand_more" class="text-xs transition-transform duration-200" :class="open ? 'rotate-180' : ''" />
    </button>
    <div
      v-if="open"
      class="absolute left-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
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

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: Array<{ value: string; label: string }>
    tone?: 'primary' | 'success' | 'danger' | 'warning'
    disabled?: boolean
  }>(),
  {
    tone: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue)
  return opt?.label ?? props.modelValue
})

const toneClass = computed(() => {
  switch (props.tone) {
    case 'primary':
      return 'neo-pill--primary'
    case 'success':
      return 'neo-pill--success'
    case 'danger':
      return 'neo-pill--danger'
    case 'warning':
      return 'neo-pill--warning'
    default:
      return ''
  }
})

function toggle(): void {
  if (!props.disabled) {
    open.value = !open.value
  }
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
