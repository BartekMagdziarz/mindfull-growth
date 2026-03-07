<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.wheelOfLife.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.wheelOfLife.subtitle') }}</p>
      </div>
    </div>

    <WheelOfLifeExercise mode="standalone" @saved="handleSaved" />

    <!-- Past Snapshots -->
    <div v-if="wheelOfLifeStore.sortedSnapshots.length > 1" class="mt-8">
      <AppCard padding="lg">
        <WheelOfLifeTimeline :snapshots="wheelOfLifeStore.sortedSnapshots" />
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import WheelOfLifeExercise from '@/components/exercises/WheelOfLifeExercise.vue'
import WheelOfLifeTimeline from '@/components/exercises/WheelOfLifeTimeline.vue'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const wheelOfLifeStore = useWheelOfLifeStore()

onMounted(() => {
  wheelOfLifeStore.loadSnapshots()
})

function handleSaved(_snapshotId: string) {
  // Stay on page so user can see timeline with new snapshot
}
</script>
