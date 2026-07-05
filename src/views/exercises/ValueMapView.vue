<template>
  <div class="mx-auto w-4/5 max-w-[1600px] min-w-[960px] px-4 py-6 pb-24">
    <div class="mb-6 flex items-center gap-4">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.valueMap.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.valueMap.subtitle') }}</p>
      </div>
    </div>

    <ValueMapWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="value-map" @again="saved = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import ValueMapWizard from '@/components/exercises/ValueMapWizard.vue'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const saved = ref(false)

function handleSaved(_id: string) {
  saved.value = true
}
</script>
