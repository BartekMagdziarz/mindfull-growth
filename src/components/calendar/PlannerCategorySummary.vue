<template>
  <div class="flex items-center gap-2 rounded-[1.1rem] bg-success/8 px-3 py-3">
    <AppIcon name="check_circle" class="text-xl shrink-0 text-success" />
    <p class="min-w-0 flex-1 text-sm font-medium text-on-surface">
      {{ t('planning.calendar.planner.allAssigned', { n: totalCount, category: categoryLabel }) }}
    </p>
    <button
      type="button"
      class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/8"
      @click="$emit('expand')"
    >
      {{ t('common.buttons.edit') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

defineProps<{
  categoryLabel: string
  totalCount: number
}>()

defineEmits<{
  expand: []
}>()

const { t } = useT()
</script>
