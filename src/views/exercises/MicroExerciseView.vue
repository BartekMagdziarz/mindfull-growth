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
      <!-- The maintenance plan closes the path: the kept practices become repeat plans. -->
      <MaintenanceRepeatsPanel v-if="slug === 'maintenance-plan' && lastResponses" :responses="lastResponses" />
      <!-- Powrót: what stayed can run on as repeats; the path can start again. -->
      <template v-if="slug === 'path-return' && lastResponses">
        <MaintenanceRepeatsPanel :responses="{ keep: lastResponses.kept ?? [], rhythm: 'weekly' }" />
        <AppCard padding="lg" class="micro-follow-up mt-4" data-testid="return-reenroll">
          <div class="micro-follow-up__copy">
            <h2 class="text-base font-semibold text-on-surface">{{ t('programs.followUp.reenrollTitle') }}</h2>
            <p class="text-sm text-on-surface-variant">{{ t('programs.followUp.reenrollDescription') }}</p>
          </div>
          <AppButton v-if="returnProgramSlug" variant="tonal" @click="router.push({ name: 'program-detail', params: { slug: returnProgramSlug } })">
            {{ t('programs.followUp.reenrollCta') }}
          </AppButton>
        </AppCard>
      </template>
      <!-- Dose check: the proposal (less often · only the breath) waits in the path view. -->
      <AppCard
        v-if="slug === 'dose-check' && doseProgramSlug && (lastResponses?.load === 'tooMuch' || lastResponses?.load === 'none')"
        padding="lg"
        class="micro-follow-up mt-4"
        data-testid="dose-follow-up"
      >
        <div class="micro-follow-up__copy">
          <h2 class="text-base font-semibold text-on-surface">{{ t('programs.dose.title') }}</h2>
          <p class="text-sm text-on-surface-variant">{{ t('programs.dose.followUp') }}</p>
        </div>
        <AppButton variant="tonal" @click="router.push({ name: 'program-detail', params: { slug: doseProgramSlug } })">
          {{ t('programs.dose.open') }}
        </AppButton>
      </AppCard>
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
import MaintenanceRepeatsPanel from '@/features/program-path/MaintenanceRepeatsPanel.vue'
import { FUTURE_LETTER_SLUG } from '@/domain/programFollowUp'
import { recordFutureLetter } from '@/services/programFollowUpService'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { PROGRAM_CATALOG } from '@/data/programCatalog'
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
/** The path that owns a follow-up micro (Powrót, dose check): the first program with that step. */
function programWithStep(stepSlug: string): string | undefined {
  return PROGRAM_CATALOG.find((program) => program.steps.some((step) => step.exerciseSlug === stepSlug))?.slug
}
const returnProgramSlug = computed(() => programWithStep('path-return'))
const doseProgramSlug = computed(() => programWithStep('dose-check'))
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
  const entry = await entryStore.createEntry(
    {
      exerciseSlug: definition.value!.slug,
      responses: payload.responses,
    },
    slug.value,
  )
  lastResponses.value = payload.responses
  // The letter to a future self is pinned to its path with the day it comes back.
  if (slug.value === FUTURE_LETTER_SLUG) {
    void recordFutureLetter(entry.id, payload.responses)
      .then((updated) => updated && useProgramEnrollmentStore().applyUpdate(updated))
      .catch((err) => console.error('Failed to record the future letter:', err))
  }
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
