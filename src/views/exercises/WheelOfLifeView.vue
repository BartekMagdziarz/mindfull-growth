<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.wheelOfLife.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.wheelOfLife.subtitle') }}</p>
      </div>
    </div>

    <WheelOfLifeExercise
      :key="editingAssessmentId ?? 'new'"
      mode="standalone"
      :assessment-id="editingAssessmentId ?? undefined"
      :show-cancel="editingAssessmentId !== null"
      @saved="handleSaved"
      @cancel="editingAssessmentId = null"
    />

    <div v-if="lifeAreaAssessmentStore.sortedAssessments.length > 0" class="mt-8">
      <AppCard padding="lg">
        <WheelOfLifeTimeline
          :assessments="lifeAreaAssessmentStore.sortedAssessments"
          @edit="editingAssessmentId = $event"
        />
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import WheelOfLifeExercise from '@/components/exercises/WheelOfLifeExercise.vue'
import WheelOfLifeTimeline from '@/components/exercises/WheelOfLifeTimeline.vue'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const lifeAreaAssessmentStore = useLifeAreaAssessmentStore()
const editingAssessmentId = ref<string | null>(null)

onMounted(() => {
  lifeAreaAssessmentStore.loadAssessments()
})

function handleSaved(_assessmentId: string) {
  editingAssessmentId.value = null
}
</script>
