<template>
  <div class="group/scale flex flex-1 flex-col items-center gap-1.5">
    <!-- Label above -->
    <span class="text-center text-sm font-semibold text-on-surface">{{ label }}</span>

    <!-- Well with arrows -->
    <div class="relative flex items-center justify-center">
      <!-- Left arrow -->
      <button
        type="button"
        class="neo-icon-scale-arrow absolute -left-8"
        :class="{ 'invisible': currentLevel <= 1 }"
        :aria-label="`${label}: decrease`"
        tabindex="-1"
        @click="decrease"
      >
        <span class="material-symbols-outlined text-xl">chevron_left</span>
      </button>

      <!-- Main icon well -->
      <button
        type="button"
        class="neo-icon-scale-well neo-focus"
        :class="{ 'neo-icon-scale-well--active': modelValue != null }"
        :aria-label="`${label}: ${currentLevel}/5`"
        @click="advance"
      >
        <span class="material-symbols-outlined" style="font-size: 5rem;">{{ icons[currentLevel - 1] }}</span>
        <span class="mt-1 text-lg font-semibold leading-tight">{{ currentLevel }}/5</span>
      </button>

      <!-- Right arrow -->
      <button
        type="button"
        class="neo-icon-scale-arrow absolute -right-8"
        :class="{ 'invisible': currentLevel >= 5 }"
        :aria-label="`${label}: increase`"
        tabindex="-1"
        @click="increase"
      >
        <span class="material-symbols-outlined text-xl">chevron_right</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number | null
  label: string
  icons: [string, string, string, string, string]
  lowLabel?: string
  highLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const currentLevel = computed(() => props.modelValue ?? 3)

function advance() {
  if (props.modelValue == null) {
    emit('update:modelValue', 3)
  } else {
    const next = props.modelValue >= 5 ? 1 : props.modelValue + 1
    emit('update:modelValue', next)
  }
}

function decrease() {
  const next = Math.max(1, currentLevel.value - 1)
  emit('update:modelValue', next)
}

function increase() {
  const next = Math.min(5, currentLevel.value + 1)
  emit('update:modelValue', next)
}
</script>
