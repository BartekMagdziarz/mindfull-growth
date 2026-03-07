<template>
  <div class="space-y-4">
    <AppCard padding="lg" class="space-y-3">
      <h3 class="text-lg font-semibold text-on-surface">
        {{ t('assessments.common.review.title') }}
      </h3>

      <p class="text-sm text-on-surface-variant">
        {{ t('assessments.common.flow.answeredCount', { n: answeredCount }) }}
        ·
        {{ t('assessments.common.flow.unansweredCount', { n: unansweredItems.length }) }}
      </p>

      <p v-if="unansweredItems.length === 0" class="text-sm text-success">
        {{ t('assessments.common.review.allAnswered') }}
      </p>
      <p v-else class="text-sm text-on-surface-variant">
        {{ t('assessments.common.review.missingHint') }}
      </p>
    </AppCard>

    <AppCard v-if="unansweredItems.length > 0" padding="lg" class="space-y-3">
      <div
        v-for="item in unansweredItems"
        :key="item.id"
        class="flex items-start justify-between gap-3 rounded-lg border border-outline/30 p-3"
      >
        <p class="text-sm text-on-surface">{{ t(item.textKey) }}</p>
        <AppButton variant="text" @click="$emit('edit-item', item.id)">
          {{ t('common.buttons.edit') }}
        </AppButton>
      </div>
    </AppCard>

    <div class="flex items-center justify-between gap-2">
      <AppButton variant="text" @click="$emit('back')">
        {{ t('common.buttons.back') }}
      </AppButton>
      <AppButton variant="filled" :disabled="!canSubmit" @click="$emit('submit')">
        {{ t('assessments.common.flow.submit') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import type { AssessmentDefinition, AssessmentItemDefinition } from '@/domain/assessments'
import { useT } from '@/composables/useT'

const props = defineProps<{
  definition: AssessmentDefinition
  responses: Record<string, number>
  unansweredItems: AssessmentItemDefinition[]
  canSubmit: boolean
}>()

defineEmits<{
  back: []
  submit: []
  'edit-item': [itemId: string]
}>()

const { t } = useT()

const answeredCount = computed(() => Object.keys(props.responses).length)
</script>
