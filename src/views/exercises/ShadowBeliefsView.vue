<template>
  <ExercisePage
    :title="t('exercises.cards.shadowBeliefs.title')"
    :subtitle="t('exercises.cards.shadowBeliefs.subtitle')"
  >
    <ShadowBeliefsWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="shadow-beliefs" @again="saved = false" />
  </ExercisePage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import ShadowBeliefsWizard from '@/components/exercises/ShadowBeliefsWizard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
const saved = ref(false)

function handleSaved(_id: string) {
  saved.value = true
}
</script>
