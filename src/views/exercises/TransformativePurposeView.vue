<template>
  <ExercisePage
    :title="t('exercises.cards.transformativePurpose.title')"
    :subtitle="t('exercises.cards.transformativePurpose.subtitle')"
  >
    <TransformativePurposeWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="purpose" @again="saved = false" />
  </ExercisePage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import TransformativePurposeWizard from '@/components/exercises/TransformativePurposeWizard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
const saved = ref(false)

function handleSaved(_id: string) {
  saved.value = true
}
</script>
