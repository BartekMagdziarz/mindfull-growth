<template>
  <div class="mg-v2-menu-section" role="group" :aria-label="t('planning.objects.form.status')">
    <div class="mg-v2-menu-section__label">{{ t('planning.objects.form.status') }}</div>
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="menuitemradio"
      class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium hover:bg-primary-soft/30"
      :class="opt.value === modelValue ? 'font-semibold text-primary' : 'text-on-surface'"
      :aria-checked="opt.value === modelValue"
      @click="select(opt.value)"
    >
      <AppIcon v-if="opt.value === modelValue" name="check" class="text-xs flex-shrink-0" />
      <span v-else class="h-3 w-3 flex-shrink-0" />
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

// Status choices rendered as a section of a card's "more" menu. Replaces the
// always-visible StatusIconButton on objects-library cards: the current status
// is shown as quiet text in the card's meta line only when it is not the
// default, and changed from here.
const props = defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useT()

function select(value: string): void {
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}
</script>
