<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm"
      :class="toneClass"
      :title="selectedLabel"
      :aria-label="`Status: ${selectedLabel}`"
      @click.stop="open = !open"
    >
      <AppIcon :name="statusIcon" class="text-base" />
    </button>
    <div
      v-if="open"
      class="mg-v2-popover absolute bottom-full right-0 mb-1 min-w-[120px] overflow-hidden"
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
  const opt = props.options.find(o => o.value === props.modelValue)
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
      return 'play_circle'
  }
})

const toneClass = computed(() => {
  switch (props.modelValue) {
    case 'completed':
      return 'status-icon--completed'
    case 'dropped':
      return 'status-icon--dropped'
    case 'retired':
      return 'status-icon--retired'
    default:
      return 'status-icon--open'
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

<style scoped>
/* The status reads from the icon's tone (always with its own glyph); the
   control itself stays a quiet round icon button. */
.status-icon--completed {
  color: var(--mg-color-good-on);
}
.status-icon--dropped {
  color: var(--mg-color-rose);
}
.status-icon--retired {
  color: var(--mg-color-warn-on);
}
.status-icon--open {
  color: var(--mg-color-primary);
}
</style>
