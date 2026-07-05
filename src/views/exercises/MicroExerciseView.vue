<template>
  <div v-if="definition && catalogEntry" class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">
          {{ t(`exercises.cards.${catalogEntry.i18nKey}.title`) }}
        </h1>
        <p class="text-sm text-on-surface-variant">
          {{ t(`exercises.cards.${catalogEntry.i18nKey}.subtitle`) }}
        </p>
      </div>
    </div>

    <MicroExerciseRunner
      v-if="!saved"
      :key="definition.slug"
      :definition="definition"
      @saved="handleSaved"
    />

    <ExerciseSavedPanel v-else :exercise-slug="slug" @again="saved = false" />

    <!-- Past entries section -->
    <div v-if="pastEntries.length > 0" class="mt-8">
      <h2 class="text-lg font-semibold text-on-surface mb-3">
        {{ t('exercises.views.pastEntries') }}
      </h2>
      <div class="space-y-3">
        <AppCard v-for="entry in pastEntries" :key="entry.id" padding="md">
          <p class="text-sm font-medium text-on-surface line-clamp-2">
            {{ entrySnippet(entry) }}
          </p>
          <p class="text-xs text-on-surface-variant mt-1">
            {{ formatDate(entry.createdAt) }}
          </p>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import MicroExerciseRunner from '@/components/exercises/MicroExerciseRunner.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { getMicroExercise } from '@/data/microExercises'
import type { MicroExerciseEntry, MicroStepValue } from '@/domain/microExercises'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'

const route = useRoute()
const router = useRouter()
const { t } = useT()
const entryStore = useMicroExerciseEntryStore()

const slug = computed(() => String(route.params.slug ?? ''))
const definition = computed(() => getMicroExercise(slug.value))
const catalogEntry = computed(() => getCatalogEntry(slug.value))
const saved = ref(false)

const pastEntries = computed(() => entryStore.entriesBySlug(slug.value))

onMounted(() => {
  if (!definition.value) {
    void router.replace('/exercises')
    return
  }
  void entryStore.loadEntries()
})

watch(slug, () => {
  saved.value = false
  if (route.name === 'micro-exercise' && !definition.value) {
    void router.replace('/exercises')
  }
})

async function handleSaved(payload: { responses: Record<string, MicroStepValue> }) {
  await entryStore.createEntry({
    exerciseSlug: slug.value,
    responses: payload.responses,
  })
  saved.value = true
}

/** First text-ish response makes a readable one-line summary. */
function entrySnippet(entry: MicroExerciseEntry): string {
  for (const value of Object.values(entry.responses)) {
    if (typeof value === 'string' && value.length > 0) return value
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return (value as string[]).join(' · ')
    }
  }
  return t(`exercises.cards.${catalogEntry.value?.i18nKey}.title`)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: undefined,
  })
}
</script>
