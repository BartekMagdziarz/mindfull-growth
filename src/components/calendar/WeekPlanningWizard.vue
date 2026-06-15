<template>
  <section data-testid="week-planning-wizard" class="neo-card space-y-6 px-4 py-4 md:px-5">
    <!-- Header (full width): title + secondary actions -->
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-bold text-on-surface">
        {{ t('planning.weekPlanning.title') }}
      </h2>
      <div class="flex items-center gap-2">
        <AppButton variant="text" @click="$emit('open-grid')">
          {{ t('planning.weekPlanning.editGrid') }}
        </AppButton>
        <AppButton variant="text" :aria-label="t('planning.weekPlanning.close')" @click="$emit('close')">
          <AppIcon name="close" />
        </AppButton>
      </div>
    </div>

    <!-- Constrained content column — identical max-width on every step so the
         body never jumps width between steps, while the card stays full-bleed. -->
    <div class="mx-auto w-full max-w-3xl space-y-6">
      <!-- Stepper -->
      <nav
        class="flex flex-wrap items-center gap-2"
        :aria-label="t('planning.weekPlanning.stepProgress', { current: stepIndex + 1, total: stepLabels.length })"
      >
        <button
          v-for="(label, index) in stepLabels"
          :key="label"
          type="button"
          class="neo-pill neo-focus px-3 py-1.5 text-xs font-semibold"
          :class="index === stepIndex ? 'neo-pill--primary' : 'text-on-surface-variant'"
          :aria-current="index === stepIndex ? 'step' : undefined"
          @click="goToStep(index)"
        >
          {{ index + 1 }}. {{ label }}
        </button>
      </nav>

      <p class="text-sm text-on-surface-variant">
        {{ t('planning.weekPlanning.intro') }}
      </p>

      <!-- Step 1: weekly intentions -->
      <div v-if="step === 'intentions'" class="space-y-4">
        <ul v-if="intentions.length > 0" class="space-y-2">
          <li
            v-for="intention in intentions"
            :key="intention.id"
            class="neo-surface flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-neu-raised-sm"
          >
            <AppIcon name="target" class="text-base text-on-surface-variant" />
            <span class="min-w-0 flex-1 truncate font-medium text-on-surface">{{ intention.title }}</span>
            <span class="shrink-0 text-xs text-on-surface-variant">{{ targetSummary(intention) }}</span>
          </li>
        </ul>

        <!-- Empty state + temporary layout-preview toggle -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p v-if="intentions.length === 0" class="text-xs text-on-surface-variant">
            {{ t('planning.weekPlanning.intentions.empty') }}
          </p>
          <span v-else aria-hidden="true"></span>

          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.weekPlanning.intentions.layoutPreview') }}
            </span>
            <div
              class="neo-segmented"
              role="group"
              :aria-label="t('planning.weekPlanning.intentions.layoutPreview')"
            >
              <button
                type="button"
                class="neo-segmented__item neo-focus !min-w-0 !px-3 !py-1.5 !text-xs"
                :class="composerLayout === 'compact' ? 'neo-segmented__item--active' : ''"
                :aria-pressed="composerLayout === 'compact'"
                @click="setComposerLayout('compact')"
              >
                {{ t('planning.weekPlanning.intentions.layoutCompact') }}
              </button>
              <button
                type="button"
                class="neo-segmented__item neo-focus !min-w-0 !px-3 !py-1.5 !text-xs"
                :class="composerLayout === 'stacked' ? 'neo-segmented__item--active' : ''"
                :aria-pressed="composerLayout === 'stacked'"
                @click="setComposerLayout('stacked')"
              >
                {{ t('planning.weekPlanning.intentions.layoutStacked') }}
              </button>
            </div>
          </div>
        </div>

        <IntentionComposer
          :key="weekRef"
          :week-ref="weekRef"
          :layout="composerLayout"
          @created="onIntentionCreated"
        />

        <div class="flex justify-end">
          <AppButton variant="filled" @click="step = 'priorities'">
            {{ t('planning.weekPlanning.next') }}
          </AppButton>
        </div>
      </div>

      <!-- Step 2: top-3 priorities -->
      <div v-else class="space-y-4">
        <ul v-if="candidates.length > 0" class="space-y-2">
          <li v-for="candidate in candidates" :key="candidate.key">
            <button
              type="button"
              class="neo-surface flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm shadow-neu-raised-sm transition-all"
              :class="selectedKeys.includes(candidate.key) ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'"
              @click="toggleCandidate(candidate.key)"
            >
              <AppIcon :name="selectedKeys.includes(candidate.key) ? 'check_circle' : 'radio_button_unchecked'" class="text-base" />
              <span class="min-w-0 flex-1 truncate">{{ candidate.title }}</span>
              <span class="shrink-0 text-xs text-on-surface-variant">{{ candidate.typeLabel }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="text-xs text-on-surface-variant">
          {{ t('planning.weekPlanning.priorities.empty') }}
        </p>

        <p v-if="selectedKeys.length > SOFT_LIMIT" class="text-xs font-medium text-amber-600">
          {{ t('planning.weekPlanning.priorities.softLimitWarning', { n: SOFT_LIMIT }) }}
        </p>

        <div class="flex justify-between">
          <AppButton variant="text" @click="step = 'intentions'">
            {{ t('planning.weekPlanning.back') }}
          </AppButton>
          <AppButton variant="filled" :disabled="isSaving" @click="save">
            {{ t('planning.weekPlanning.save') }}
          </AppButton>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import IntentionComposer, { type ComposerLayout } from '@/components/calendar/IntentionComposer.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type { WeeklyIntention } from '@/domain/planning'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import { getWeekPlanningBundle } from '@/services/planningStateQueries'
import { isMeasurementSubjectOpen } from '@/services/planningVisibility'
import { listWeeklyIntentions, setWeekTopPriorities } from '@/services/weeklyIntentionService'

const SOFT_LIMIT = 3
const LAYOUT_KEY = 'mg:intentionComposerLayout'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: []; 'open-grid': [] }>()

const { t } = useT()

type WizardStep = 'intentions' | 'priorities'
const step = ref<WizardStep>('intentions')
const stepIndex = computed(() => (step.value === 'intentions' ? 0 : 1))
const stepLabels = computed(() => [
  t('planning.weekPlanning.steps.intentions'),
  t('planning.weekPlanning.steps.priorities'),
])

function goToStep(index: number): void {
  step.value = index === 0 ? 'intentions' : 'priorities'
}

// --- Layout preview toggle (temporary: lets us compare both composer layouts) ---
function readStoredLayout(): ComposerLayout {
  try {
    const stored = localStorage.getItem(LAYOUT_KEY)
    return stored === 'compact' || stored === 'stacked' ? stored : 'stacked'
  } catch {
    return 'stacked'
  }
}

const composerLayout = ref<ComposerLayout>(readStoredLayout())

function setComposerLayout(layout: ComposerLayout): void {
  composerLayout.value = layout
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {
    /* ignore storage failures */
  }
}

// --- Step 1: intentions list ---
const intentions = ref<WeeklyIntention[]>([])

function targetSummary(intention: WeeklyIntention): string {
  const target = intention.target
  const operator = t(`planning.objects.targetOperators.${target.operator}`)
  if (target.kind === 'count') return `${operator} ${target.value}`
  const aggregation = t(`planning.objects.targetAggregations.${target.aggregation}`)
  return `${aggregation} ${operator} ${target.value}`
}

async function loadIntentions(): Promise<void> {
  intentions.value = await listWeeklyIntentions(props.weekRef)
}

async function onIntentionCreated(): Promise<void> {
  await Promise.all([loadIntentions(), loadCandidates()])
  emit('updated')
}

// --- Step 2: top-3 candidates ---
const isSaving = ref(false)

interface Candidate {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  typeLabel: string
}

const candidates = ref<Candidate[]>([])
const selectedKeys = ref<string[]>([])

function typeLabelFor(subjectType: MeasurementSubjectType): string {
  return t(`planning.weekPlanning.subjectType.${subjectType}`)
}

async function loadCandidates(): Promise<void> {
  const bundle = await getWeekPlanningBundle(props.weekRef)
  const seen = new Set<string>()
  const list: Candidate[] = []
  for (const item of bundle.relevant.measurementItems) {
    // Trackers have no target/verdict, so they are not eligible week priorities.
    if (item.subjectType === 'tracker') continue
    if (!isMeasurementSubjectOpen(item.subject)) continue
    const key = `${item.subjectType}:${item.subject.id}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push({
      key,
      subjectType: item.subjectType,
      subjectId: item.subject.id,
      title: item.subject.title,
      typeLabel: typeLabelFor(item.subjectType),
    })
  }
  candidates.value = list
  selectedKeys.value = (bundle.weekPlan?.topPriorities ?? []).map(
    (ref) => `${ref.subjectType}:${ref.subjectId}`,
  )
}

function toggleCandidate(key: string): void {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((value) => value !== key)
    : [...selectedKeys.value, key]
}

async function save(): Promise<void> {
  if (isSaving.value) return
  isSaving.value = true
  try {
    const keyToCandidate = new Map(candidates.value.map((candidate) => [candidate.key, candidate]))
    const topPriorities: WeekTopPriorityRef[] = selectedKeys.value
      .map((key) => keyToCandidate.get(key))
      .filter((candidate): candidate is Candidate => Boolean(candidate))
      .map((candidate) => ({ subjectType: candidate.subjectType, subjectId: candidate.subjectId }))
    await setWeekTopPriorities(props.weekRef, topPriorities)
    emit('updated')
    emit('close')
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadIntentions(), loadCandidates()])
})

watch(
  () => props.weekRef,
  async () => {
    step.value = 'intentions'
    await Promise.all([loadIntentions(), loadCandidates()])
  },
)
</script>
