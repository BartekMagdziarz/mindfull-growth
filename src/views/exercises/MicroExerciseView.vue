<template>
  <ExercisePage
    v-if="definition && catalogEntry"
    :title="t(`exercises.cards.${catalogEntry.i18nKey}.title`)"
    :subtitle="t(`exercises.cards.${catalogEntry.i18nKey}.subtitle`)"
  >
    <!-- Arrived here from an inner practice that was too much today. -->
    <AppCard v-if="route.query.notice === 'tooMuch'" padding="md" class="micro-notice mb-4">
      <p class="text-sm text-on-surface">{{ t('exerciseWizards.micro.shared.tooMuchNotice') }}</p>
    </AppCard>

    <MicroExerciseRunner
      v-if="!saved"
      :key="slug"
      :definition="definition"
      :preset="preset"
      :prefill="prefill"
      @saved="handleSaved"
      @too-much="leftTooMuch = true"
    />

    <template v-else>
      <ExerciseSavedPanel :exercise-slug="slug" @again="saved = false" />
      <AppCard v-if="definition.afterSave && lastResponses" padding="lg" class="micro-follow-up mt-4">
        <div class="micro-follow-up__copy">
          <h2 class="text-base font-semibold text-on-surface">
            {{ tg(`exerciseWizards.micro.${definition.i18nKey}.afterSave.title`) }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ tg(`exerciseWizards.micro.${definition.i18nKey}.afterSave.description`) }}
          </p>
        </div>
        <AppButton variant="tonal" @click="openAfterSave()">
          {{ t(`exerciseWizards.micro.${definition.i18nKey}.afterSave.cta`) }}
        </AppButton>
      </AppCard>
      <AppCard v-if="definition.followUp" padding="lg" class="micro-follow-up mt-4">
        <div class="micro-follow-up__copy">
          <h2 class="text-base font-semibold text-on-surface">
            {{ tg(`exerciseWizards.micro.${definition.i18nKey}.followUp.title`) }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ tg(`exerciseWizards.micro.${definition.i18nKey}.followUp.description`) }}
          </p>
        </div>
        <AppButton variant="tonal" @click="router.push(definition.followUp.route)">
          {{ t(`exerciseWizards.micro.${definition.i18nKey}.followUp.cta`) }}
        </AppButton>
      </AppCard>
    </template>

    <!-- Past entries section -->
    <div v-if="pastEntries.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>
        {{ t('exercises.views.pastEntries') }}
      </h2></div>
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
  </ExercisePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import MicroExerciseRunner from '@/components/exercises/MicroExerciseRunner.vue'
import { useT } from '@/composables/useT'
import { definitionSlugFor, getCatalogEntry } from '@/data/exerciseCatalog'
import { getMicroExercise } from '@/data/microExercises'
import type { MicroExerciseEntry, MicroPrefill, MicroPreset, MicroStepValue } from '@/domain/microExercises'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import {
  buildAfterSavePrefill,
  decodeMicroPrefill,
  encodeMicroPrefill,
  entryMatches,
} from '@/utils/microExerciseFlow'

/** Where an inner practice hands over when it was too much today. */
const TOO_MUCH_ROUTE = '/exercises/micro/paced-breathing'

const route = useRoute()
const router = useRouter()
const { t, tg } = useT()
const entryStore = useMicroExerciseEntryStore()

// The route slug may be a catalog variant (`moment-shame`): it runs the
// variant's definition (`moments`) with preset answers, records its
// completion under the variant slug and stores entries under the
// definition's slug.
const slug = computed(() => String(route.params.slug ?? ''))
const catalogEntry = computed(() => getCatalogEntry(slug.value))
const definition = computed(() => getMicroExercise(definitionSlugFor(slug.value)))
const preset = computed<MicroPreset>(() => catalogEntry.value?.variantOf?.preset ?? {})
/** Answers carried over from another micro (`?prefill=`), shown and editable. */
const prefill = computed<MicroPrefill>(() => decodeMicroPrefill(route.query.prefill))
const saved = ref(false)
const leftTooMuch = ref(false)
const lastResponses = ref<Record<string, MicroStepValue> | null>(null)

/** Past entries of this run's shape: the definition's, narrowed by the preset answers. */
const pastEntries = computed(() => {
  const target = definition.value
  if (!target) return []
  const conditions = Object.entries(preset.value).flatMap(([step, value]) =>
    typeof value === 'string' ? [{ step, in: [value] }] : [],
  )
  return entryStore.entriesBySlug(target.slug).filter((entry) => entryMatches(entry, conditions))
})

onMounted(() => {
  if (!definition.value) {
    void router.replace('/exercises')
    return
  }
  void entryStore.loadEntries()
})

watch(slug, () => {
  saved.value = false
  lastResponses.value = null
  if (route.name === 'micro-exercise' && !definition.value) {
    void router.replace('/exercises')
  }
})

async function handleSaved(payload: { responses: Record<string, MicroStepValue> }) {
  await entryStore.createEntry(
    {
      exerciseSlug: definition.value!.slug,
      responses: payload.responses,
    },
    slug.value,
  )
  lastResponses.value = payload.responses
  // "Za dużo na dziś": the entry counts, the breath takes over.
  if (leftTooMuch.value && slug.value !== 'paced-breathing') {
    leftTooMuch.value = false
    await router.push({ path: TOO_MUCH_ROUTE, query: { notice: 'tooMuch' } })
    return
  }
  leftTooMuch.value = false
  saved.value = true
}

/** `afterSave`: open the next micro with this entry's answers as a prefill. */
function openAfterSave() {
  const target = definition.value?.afterSave
  if (!target || !lastResponses.value) return
  const carried = buildAfterSavePrefill(target.prefillFrom, lastResponses.value)
  void router.push({
    path: target.route,
    query: Object.keys(carried).length ? { prefill: encodeMicroPrefill(carried) } : {},
  })
}

/**
 * First text-ish response makes a readable one-line summary. Choice
 * answers are option ids, not prose, so they never become the snippet.
 */
function entrySnippet(entry: MicroExerciseEntry): string {
  const choiceKeys = new Set(
    (definition.value?.steps ?? []).filter((step) => step.type === 'choice').map((step) => step.key),
  )
  for (const [key, value] of Object.entries(entry.responses)) {
    if (choiceKeys.has(key)) continue
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

<style scoped>
.micro-follow-up {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-4);
}

.micro-follow-up__copy {
  display: grid;
  gap: var(--mg-space-1);
}

.micro-follow-up > :last-child {
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
