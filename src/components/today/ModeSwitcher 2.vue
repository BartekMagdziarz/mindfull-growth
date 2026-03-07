<template>
  <AppCard class="neo-raised w-full">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {{ t('today.mode.title') }}
        </p>
        <p class="text-sm text-on-surface">
          {{ modeDescription }}
        </p>
      </div>
      <div class="neo-segmented" role="tablist" aria-label="Today mode switcher">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="neo-segmented__item neo-focus"
          :class="{ 'neo-segmented__item--active': modelValue === option.value }"
          :aria-selected="modelValue === option.value"
          @click="emit('update:modelValue', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import type { TodayMode, TodayModeOverride } from '@/types/today'

const { t } = useT()

const props = defineProps<{
  modelValue: TodayModeOverride
  effectiveMode: TodayMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TodayModeOverride]
}>()

const options = computed(() => [
  { value: 'auto' as const, label: t('today.mode.auto') },
  { value: 'morning' as const, label: t('today.mode.morning') },
  { value: 'midday' as const, label: t('today.mode.midday') },
  { value: 'evening' as const, label: t('today.mode.evening') },
])

const modeDescription = computed(() => {
  if (props.modelValue !== 'auto') {
    return t('today.mode.manualDescription', {
      mode: t(`today.mode.${props.modelValue}`),
    })
  }

  return t('today.mode.autoDescription', {
    mode: t(`today.mode.${props.effectiveMode}`),
  })
})
</script>
