<template>
  <AppCard variant="inset" padding="md" class="space-y-2">
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span :class="tagClasses" class="neo-pill text-xs px-2 py-0.5">
          {{ tagLabel }}
        </span>
        <span v-if="partName" class="text-xs text-on-surface-variant">
          {{ partName }}
        </span>
      </div>
      <button
        class="text-on-surface-variant/40 hover:text-error transition-colors neo-focus rounded-full p-1 shrink-0"
        @click="$emit('delete')"
      >
        <AppIcon name="close" class="text-base" />
      </button>
    </div>
    <p class="text-sm text-on-surface">{{ insight.content }}</p>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import AppCard from '@/components/AppCard.vue'
import type { IFSInsight } from '@/domain/exercises'

const { t } = useT()

const props = defineProps<{
  insight: IFSInsight
  partName?: string
}>()

defineEmits<{
  delete: []
}>()

const tagClasses = computed(() => {
  switch (props.insight.tag) {
    case 'core-fear':
      return 'bg-red-100 text-red-700'
    case 'need':
      return 'bg-green-100 text-green-700'
    case 'positive-intention':
      return 'bg-blue-100 text-blue-700'
    case 'memory':
      return 'bg-amber-100 text-amber-700'
    case 'belief':
      return 'bg-purple-100 text-purple-700'
    case 'other':
    default:
      return 'bg-neu-base text-neu-muted'
  }
})

const tagLabel = computed(() => {
  switch (props.insight.tag) {
    case 'core-fear':
      return t('exerciseWizards.shared.ifs.insightCard.tagLabels.coreFear')
    case 'need':
      return t('exerciseWizards.shared.ifs.insightCard.tagLabels.need')
    case 'positive-intention':
      return t('exerciseWizards.shared.ifs.insightCard.tagLabels.positiveIntention')
    case 'memory':
      return t('exerciseWizards.shared.ifs.insightCard.tagLabels.memory')
    case 'belief':
      return t('exerciseWizards.shared.ifs.insightCard.tagLabels.belief')
    case 'other':
    default:
      return t('exerciseWizards.shared.ifs.insightCard.tagLabels.other')
  }
})
</script>
