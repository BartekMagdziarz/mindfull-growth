<template>
  <ExercisePage
    :title="t('exercises.cards.wheelOfLife.title')"
    :subtitle="t('exercises.cards.wheelOfLife.subtitle')" width="default"
  >
    <WheelOfLifeExercise
      :key="editingAssessmentId ?? 'new'"
      mode="standalone"
      :assessment-id="editingAssessmentId ?? undefined"
      :show-cancel="editingAssessmentId !== null"
      @saved="handleSaved"
      @cancel="editingAssessmentId = null"
    />

    <AppCard v-if="justSaved" padding="lg" class="mt-8">
      <RepeatPlanPrompt exercise-slug="wheel-of-life" />
    </AppCard>

    <div v-if="lifeAreaAssessmentStore.sortedAssessments.length > 0" class="mt-8">
      <AppCard padding="lg">
        <WheelOfLifeTimeline
          :assessments="lifeAreaAssessmentStore.sortedAssessments"
          @edit="startEditing"
          @delete="handleDelete"
        />
      </AppCard>
    </div>
  </ExercisePage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import RepeatPlanPrompt from '@/components/exercises/RepeatPlanPrompt.vue'
import WheelOfLifeExercise from '@/components/exercises/WheelOfLifeExercise.vue'
import WheelOfLifeTimeline from '@/components/exercises/WheelOfLifeTimeline.vue'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useT } from '@/composables/useT'

const { t } = useT()
const lifeAreaAssessmentStore = useLifeAreaAssessmentStore()
const editingAssessmentId = ref<string | null>(null)
const justSaved = ref(false)

onMounted(() => {
  lifeAreaAssessmentStore.loadAssessments()
})

function handleSaved(_assessmentId: string) {
  editingAssessmentId.value = null
  justSaved.value = true
}

function startEditing(assessmentId: string) {
  justSaved.value = false
  editingAssessmentId.value = assessmentId
}

async function handleDelete(assessmentId: string) {
  const assessment = lifeAreaAssessmentStore.getAssessmentById(assessmentId)
  const date = assessment
    ? new Date(assessment.createdAt).toLocaleDateString(
        t('exerciseWizards.wheelOfLife.timeline.dateLocale'),
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      )
    : ''

  if (!confirm(t('exerciseWizards.wheelOfLife.timeline.confirmDelete', { date }))) return

  await lifeAreaAssessmentStore.deleteAssessment(assessmentId)
  if (editingAssessmentId.value === assessmentId) {
    editingAssessmentId.value = null
  }
}
</script>
