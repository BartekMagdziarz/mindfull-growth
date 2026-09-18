<template>
  <ExercisePage
    :title="t('exercises.cards.valuesDiscovery.title')"
    :subtitle="t('exercises.cards.valuesDiscovery.subtitle')"
  >
    <ValuesDiscoveryWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="values" @again="saved = false" />
  </ExercisePage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import ValuesDiscoveryWizard from '@/components/exercises/ValuesDiscoveryWizard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
const saved = ref(false)

function handleSaved(_id: string) {
  saved.value = true
}
</script>
