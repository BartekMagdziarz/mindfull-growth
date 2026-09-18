<template>
  <ExercisePage
    :title="t('exercises.cards.valueMap.title')"
    :subtitle="t('exercises.cards.valueMap.subtitle')" width="wide"
  >
    <ValueMapWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="value-map" @again="saved = false" />
  </ExercisePage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import ValueMapWizard from '@/components/exercises/ValueMapWizard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
const saved = ref(false)

function handleSaved(_id: string) {
  saved.value = true
}
</script>
