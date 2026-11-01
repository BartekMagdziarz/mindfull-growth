<template>
  <PeriodCalendarPicker
    ref="pickerRef"
    :model-value="linkedMonths.map(month => month.monthRef)"
    cadence="monthly"
    :label="t('planning.objects.actions.months')"
    :commit="saveMonths"
    :triggerless="triggerless"
    @update:model-value="update"
  />
</template>
<script setup lang="ts">
import { ref } from 'vue'
import PeriodCalendarPicker from '@/components/objects/PeriodCalendarPicker.vue'
import { useT } from '@/composables/useT'
export interface LinkedMonth {
  monthRef: string
  displayLabel: string
}
const props = defineProps<{
  linkedMonths: LinkedMonth[]
  iconOnly?: boolean
  saveMonths?: (refs: string[]) => Promise<void>
  /** Render only the dialog; the host opens it through `show()`. */
  triggerless?: boolean
}>()
const emit = defineEmits<{ 'link-month': [ref: string]; 'unlink-month': [ref: string] }>()
const { t } = useT()
const pickerRef = ref<InstanceType<typeof PeriodCalendarPicker> | null>(null)
function update(refs: string[]) {
  if (props.saveMonths) return
  const old = props.linkedMonths.map(month => month.monthRef)
  for (const ref of old.filter(ref => !refs.includes(ref))) emit('unlink-month', ref)
  for (const ref of refs.filter(ref => !old.includes(ref))) emit('link-month', ref)
}
defineExpose({ show: () => pickerRef.value?.show() })
</script>
