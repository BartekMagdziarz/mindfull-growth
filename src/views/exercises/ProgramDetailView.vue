<template>
  <ExercisePage
    v-if="program"
    :title="t(`${program.i18nKey}.title`)"
    :subtitle="goal"
    :icon="program.icon"
    :eyebrow="eyebrow"
    width="wide"
    class="path-view"
  >
    <template #meta>
      <p v-if="sign" class="path-view__sign">
        <small>{{ t('programs.ui.mySign') }}</small>
        <em>„{{ sign }}”</em>
      </p>
      <p v-if="openEnrollment?.status === 'paused'" class="path-view__note">{{ t('programs.ui.pausedNote') }}</p>
      <p v-if="error" class="path-view__error">{{ error }}</p>
    </template>
    <template #actions>
      <button v-if="!enrollment" type="button" class="mg-v2-button mg-v2-button--primary" :disabled="busy" @click="handleEnroll">
        {{ t('programs.ui.enroll') }}
      </button>
      <div v-else-if="openEnrollment" class="path-view__menu">
        <button
          type="button"
          class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet"
          :aria-label="t('programs.ui.more')"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <AppIcon name="more_horiz" />
        </button>
        <div v-if="menuOpen" class="path-view__menu-list" role="menu">
          <button v-if="openEnrollment.status === 'active'" type="button" role="menuitem" :disabled="busy" @click="menuAction(handlePause)">
            {{ t('programs.ui.pause') }}
          </button>
          <button v-else type="button" role="menuitem" :disabled="busy" @click="menuAction(handleResume)">
            {{ t('programs.ui.resume') }}
          </button>
          <button type="button" role="menuitem" :disabled="busy" @click="menuAction(() => (restartDialogOpen = true))">
            {{ t('programs.ui.restart') }}
          </button>
          <button type="button" role="menuitem" :disabled="busy" @click="menuAction(() => (abandonDialogOpen = true))">
            {{ t('programs.ui.abandon') }}
          </button>
        </div>
      </div>
    </template>

    <div class="path-view__grid">
      <PathJourney
        :program="program"
        :enrollment="enrollment"
        :step-states="stepStates"
        :current-note="currentNote"
        :paused="openEnrollment?.status === 'paused'"
        :busy="busy"
        @start="startStep"
        @skip="handleSkip"
      >
        <!-- Completed state + finale (design §4.5: the foundation build is the path's finale) -->
        <div v-if="enrollment?.status === 'completed'" class="path-view__closed" data-testid="path-closed">
          <AppIcon :name="closedIcon" />
          <span class="path-view__closed-copy">
            <strong>{{ program.finaleRouteName ? t('programs.ui.completedTitle') : t('programs.ui.closedTitle') }}</strong>
            <small v-if="program.finaleRouteName">{{ t(`${program.i18nKey}.finaleDescription`) }}</small>
          </span>
          <span class="path-view__closed-actions">
            <button v-if="program.finaleRouteName" type="button" class="pp-chip pp-chip--primary" @click="router.push({ name: program.finaleRouteName })">
              {{ t(`${program.i18nKey}.finaleCta`) }}
            </button>
            <button v-else-if="maintenanceRoute" type="button" class="pp-chip" @click="router.push(maintenanceRoute)">
              {{ maintenanceTitle }}
            </button>
            <button type="button" class="pp-chip" :disabled="busy" @click="handleEnroll">{{ t('programs.ui.reenroll') }}</button>
          </span>
        </div>
      </PathJourney>

      <aside class="path-view__side" :aria-label="t('programs.ui.nowTitle')">
        <PathNowCard
          v-if="nowMode"
          :program="program"
          :enrollment="enrollment"
          :mode="nowMode"
          :step="nowStep"
          :step-title="nowTitle"
          :intro="nowIntro"
          :note="currentNote"
          :busy="busy"
          :response-entry="responseEntry"
          :letter="letter"
          @start="nowStepIndex !== undefined && startStep(nowStepIndex)"
          @enroll="handleEnroll"
        />

        <section
          v-if="enrollment && (showGlance || hasOutcomes)"
          class="mg-v2-surface mg-v2-surface--raised-sm pp-card"
          :aria-label="t('programs.ui.progressTitle')"
          data-testid="path-progress"
        >
          <header class="pp-card__head"><span>{{ t('programs.ui.progressTitle') }}</span></header>
          <PathMomentsGlance v-if="showGlance" :stats="momentStats" :slots="glanceSlots" />
          <PathMeasureTracks v-if="hasOutcomes" :program="program" :enrollment="enrollment" />
        </section>

        <PathSentencesCard v-if="program.momentKind === 'shame' && enrollment" :entries="pathEntries" />

        <PathKnowledgeCard
          :program-slug="program.slug"
          :phase-key="currentPhase?.key"
          :read-cards="enrollment?.readCards ?? []"
          @read="markRead"
        />
      </aside>
    </div>

    <MomentPickerDialog v-model="launcher.pickerOpen.value" :moments="launcher.pickerMoments.value" @pick="launcher.picked($event)" />
    <AppDialog
      v-model="abandonDialogOpen"
      :title="t('programs.ui.abandonConfirmTitle')"
      :message="t('programs.ui.abandonConfirmMessage')"
      :confirm-text="t('programs.ui.abandon')"
      @confirm="handleAbandon"
    />
    <AppDialog
      v-model="restartDialogOpen"
      :title="t('programs.ui.restartConfirmTitle')"
      :message="t('programs.ui.restartConfirmMessage')"
      :confirm-text="t('programs.ui.restart')"
      @confirm="handleRestart"
    />
  </ExercisePage>
</template>

<script setup lang="ts">
import '@/features/program-path/program-path.css'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import { getProgramDefinition } from '@/data/programCatalog'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import { momentsProgress, weekRefsEndingAt } from '@/domain/momentsProgress'
import type { DayRef, WeekRef } from '@/domain/period'
import type { ProgramStep } from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import PathJourney from '@/features/program-path/PathJourney.vue'
import PathKnowledgeCard from '@/features/program-path/PathKnowledgeCard.vue'
import PathMeasureTracks from '@/features/program-path/PathMeasureTracks.vue'
import PathMomentsGlance from '@/features/program-path/PathMomentsGlance.vue'
import PathNowCard, { type PathNowMode } from '@/features/program-path/PathNowCard.vue'
import PathSentencesCard from '@/features/program-path/PathSentencesCard.vue'
import MomentPickerDialog from '@/features/program-path/MomentPickerDialog.vue'
import { useStepLauncher } from '@/features/program-path/useStepLauncher'
import { currentGroupIndex, pathGroups, weekCount } from '@/features/program-path/pathModel'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { deriveStepStates, isPracticeItem } from '@/services/programSchedulerService'
import { currentPhase as phaseOf, unloggedSeries } from '@/services/programWeekService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { formatDayShort } from '@/utils/periodLabels'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'
import { programStepTitle } from '@/utils/programStepTitle'

/**
 * The path view ("Ścieżki" · widok ścieżki): header with the goal and the
 * user's own sign, "Twoja droga" on the left, and on the right Teraz,
 * Postęp (who takes the wheel · the measurements), Moje zdania and Warto
 * wiedzieć. Only names, wells, bars and actions on the surface — numbers
 * and explanations sit behind "Szczegóły". Lab: /concepts/shame-path
 * round 5 (ideas/html-plans/2026-10-04-shame-path-v3.html §P2).
 */
const route = useRoute()
const router = useRouter()
const { t, tg, locale } = useT()

const enrollmentStore = useProgramEnrollmentStore()
const planStore = useExercisePlanStore()
const entryStore = useMicroExerciseEntryStore()
const launcher = useStepLauncher()

const slug = computed(() => String(route.params.slug ?? ''))
const program = computed(() => getProgramDefinition(slug.value))

const busy = ref(false)
const error = ref<string | null>(null)
const menuOpen = ref(false)
const abandonDialogOpen = ref(false)
const restartDialogOpen = ref(false)
const reflections = ref<WeeklyReflection[]>([])

/** Active/paused first, else the latest completed (abandoned = not enrolled). */
const enrollment = computed(() => enrollmentStore.enrollmentForProgram(slug.value))
const openEnrollment = computed(() =>
  enrollment.value?.status === 'active' || enrollment.value?.status === 'paused' ? enrollment.value : undefined,
)
const stepStates = computed(() => (program.value ? deriveStepStates(program.value, enrollment.value ?? null) : []))
const groups = computed(() => (program.value ? pathGroups(program.value) : []))
const currentGroup = computed(() => groups.value[currentGroupIndex(groups.value, stepStates.value)])
const currentPhase = computed(() => (program.value && enrollment.value ? phaseOf(program.value, enrollment.value) : program.value?.phases?.[0]))

// ── Header ──
const goal = computed(() => {
  if (!program.value) return ''
  const key = `${program.value.i18nKey}.goal`
  const value = t(key)
  return value === key ? tg(`${program.value.i18nKey}.description`) : value
})
const eyebrow = computed(() => {
  const section = t('exercises.tabs.programs')
  if (!program.value || !enrollment.value) return section
  if (enrollment.value.status === 'completed') {
    const state = currentGroup.value?.isReturn ? t('programs.ui.statusReturn') : t('programs.ui.statusClosed')
    return `${section} · ${state}`
  }
  const weeks = weekCount(groups.value)
  const week = currentGroup.value?.week
  const label = week && weeks ? t('programs.ui.weekOf', { n: week, total: weeks }) : ''
  const paused = enrollment.value.status === 'paused' ? ` · ${t('programs.ui.statusPaused')}` : ''
  return [section, label].filter(Boolean).join(' · ') + paused
})
const sign = computed(() => {
  const signSlug = program.value?.signSlug
  if (!signSlug || !enrollment.value) return ''
  const entry = entryStore.sortedEntries.find((item) => item.exerciseSlug === signSlug && item.createdAt >= enrollment.value!.startedAt)
  const value = entry?.responses.sign
  return typeof value === 'string' ? value.trim() : ''
})

// ── Current step ──
const nowStepIndex = computed(() => {
  if (!program.value) return undefined
  if (!enrollment.value) return 0
  const index = stepStates.value.findIndex((state) => state.state === 'current')
  return index >= 0 ? index : undefined
})
const nowStep = computed<ProgramStep | undefined>(() => (nowStepIndex.value === undefined ? undefined : program.value?.steps[nowStepIndex.value]))
const nowMode = computed<PathNowMode | null>(() => {
  if (!program.value) return null
  if (!enrollment.value) return 'start'
  if (enrollment.value.status === 'paused') return 'paused'
  if (enrollment.value.status === 'completed') return nowStep.value?.afterCompletion ? 'return' : null
  return 'active'
})
const nowTitle = computed(() => {
  if (!program.value || nowStepIndex.value === undefined || !nowStep.value) return ''
  const entry = getCatalogEntry(nowStep.value.exerciseSlug)
  return programStepTitle(t, program.value.i18nKey, nowStepIndex.value, entry ? t(`exercises.cards.${entry.i18nKey}.title`) : nowStep.value.exerciseSlug)
})
const nowIntro = computed(() => (nowStep.value?.introKey ? tg(nowStep.value.introKey) : ''))

/** The materialized current step's planned day (may differ from eligibleDay after a move). */
const pendingStepDay = computed(
  () =>
    openEnrollment.value &&
    planStore.pendingItems.find((item) => item.source === 'program' && item.sourceRef === openEnrollment.value?.id && !isPracticeItem(item))?.dayRef,
)
const todayRef = computed<DayRef>(() => getPeriodRefsForDate(new Date()).day)
const currentNote = computed(() => {
  if (!enrollment.value || nowStepIndex.value === undefined) return ''
  if (enrollment.value.status === 'paused') return t('programs.ui.waitingForReturn')
  const state = stepStates.value[nowStepIndex.value]
  const day = pendingStepDay.value ?? (state?.state === 'current' ? state.eligibleDay : undefined)
  if (!day) return ''
  if (day < todayRef.value) return t('programs.ui.overdue')
  if (day === todayRef.value) return t('programs.ui.today')
  if (day === addDaysToDayRef(todayRef.value, 1)) return t('programs.ui.tomorrow')
  return formatDayShort(day, locale.value)
})

// ── Progress ──
const hasOutcomes = computed(() => Boolean(program.value?.outcomeSlugs?.length || program.value?.outcomeSlug))
const showGlance = computed(() => program.value?.momentKind === 'shame' && Boolean(enrollment.value))
const pathEntries = computed<MicroExerciseEntry[]>(() =>
  enrollment.value ? entryStore.entries.filter((entry) => entry.createdAt >= enrollment.value!.startedAt) : [],
)
const glanceWeeks = computed<WeekRef[]>(() => {
  if (!enrollment.value) return []
  const startWeek = getPeriodRefsForDate(new Date(enrollment.value.startedAt)).week
  const lastWeek = getPeriodRefsForDate(enrollment.value.completedAt ? new Date(enrollment.value.completedAt) : new Date()).week
  const trail = weekRefsEndingAt(lastWeek, 12)
  const from = trail.indexOf(startWeek)
  return from >= 0 ? trail.slice(from) : trail
})
const glanceSlots = computed(() => Math.max(program.value?.estimatedWeeks ?? 0, glanceWeeks.value.length))
const momentStats = computed(() =>
  enrollment.value ? momentsProgress(pathEntries.value, glanceWeeks.value, unloggedSeries(enrollment.value.id, reflections.value)) : [],
)
const responseEntry = computed(() =>
  program.value?.momentKind === 'shame' ? pathEntries.value.find((entry) => entry.exerciseSlug === 'shame-response') : undefined,
)
const letter = computed(() => {
  if (enrollment.value?.status !== 'completed') return ''
  const entry = pathEntries.value.find((item) => item.exerciseSlug === 'letter-to-future-self')
  const value = entry?.responses.letter
  return typeof value === 'string' ? value.trim() : ''
})

// ── Closed ──
const maintenanceIndex = computed(() => program.value?.steps.findIndex((step) => step.closesPath) ?? -1)
const maintenanceRoute = computed<RouteLocationRaw | null>(() => {
  const step = maintenanceIndex.value >= 0 ? program.value?.steps[maintenanceIndex.value] : undefined
  const entry = step ? getCatalogEntry(step.exerciseSlug) : undefined
  return entry ? { path: entry.route, query: { continue: 'latest' } } : null
})
const maintenanceTitle = computed(() => {
  const step = maintenanceIndex.value >= 0 ? program.value?.steps[maintenanceIndex.value] : undefined
  if (!program.value || !step) return ''
  const entry = getCatalogEntry(step.exerciseSlug)
  return programStepTitle(t, program.value.i18nKey, maintenanceIndex.value, entry ? t(`exercises.cards.${entry.i18nKey}.title`) : step.exerciseSlug)
})
const closedIcon = computed(() => {
  const step = maintenanceIndex.value >= 0 ? program.value?.steps[maintenanceIndex.value] : undefined
  return (step && getCatalogEntry(step.exerciseSlug)?.icon) || 'workspace_premium'
})

// ── Lifecycle ──
async function loadReflections(): Promise<void> {
  reflections.value = await structuredReflectionDexieRepository.listWeekly()
}
onMounted(() => {
  if (!program.value) {
    void router.replace('/exercises')
    return
  }
  void Promise.all([enrollmentStore.ensureLoaded(), planStore.ensureLoaded(), entryStore.loadEntries(), loadReflections()])
})
watch(slug, () => {
  if (route.name === 'program-detail' && !program.value) void router.replace('/exercises')
})
watch(
  () => enrollment.value?.id,
  () => void loadReflections(),
)

async function run(action: () => Promise<unknown>): Promise<void> {
  busy.value = true
  error.value = null
  try {
    await action()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}
function menuAction(action: () => unknown): void {
  menuOpen.value = false
  void action()
}

/** A step starts its exercise with its context; a step that starts from a moment opens the picker first. */
function startStep(index: number): void {
  if (program.value) void launcher.launch(program.value, index)
}

async function handleEnroll(): Promise<void> {
  await run(() => enrollmentStore.enroll(slug.value))
}
async function handlePause(): Promise<void> {
  const id = openEnrollment.value?.id
  if (id) await run(() => enrollmentStore.pause(id))
}
async function handleResume(): Promise<void> {
  const id = openEnrollment.value?.id
  if (id) await run(() => enrollmentStore.resume(id))
}
async function handleAbandon(): Promise<void> {
  const id = openEnrollment.value?.id
  if (id) await run(() => enrollmentStore.abandon(id))
}
/** "Zacznij od nowa": close the open enrollment and start a fresh one at step 0. */
async function handleRestart(): Promise<void> {
  const id = openEnrollment.value?.id
  if (!id) return
  await run(async () => {
    await enrollmentStore.abandon(id)
    await enrollmentStore.enroll(slug.value)
  })
}
async function handleSkip(): Promise<void> {
  const id = openEnrollment.value?.id
  if (id) await run(() => enrollmentStore.skipStep(id))
}
function markRead(key: string): void {
  const id = enrollment.value?.id
  if (id) void enrollmentStore.markCardRead(id, key).catch((err) => console.error('Failed to mark the card as read:', err))
}
</script>

<style scoped>
.path-view__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(330px, 1fr);
  gap: var(--mg-space-5);
  align-items: start;
}
.path-view__side {
  display: grid;
  gap: var(--mg-space-4);
  min-width: 0;
}
.path-view__sign {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  align-items: baseline;
  margin: 6px 0 0;
}
.path-view__sign small {
  color: var(--mg-color-muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.path-view__sign em {
  font-size: var(--mg-font-size-sm);
  font-weight: 600;
  line-height: 1.45;
}
.path-view__note,
.path-view__error {
  margin: 6px 0 0;
  font-size: var(--mg-font-size-sm);
}
.path-view__note {
  color: var(--mg-color-muted);
}
.path-view__error {
  color: var(--mg-color-rose);
}
.path-view__menu {
  position: relative;
}
.path-view__menu-list {
  position: absolute;
  right: 0;
  z-index: 3;
  display: grid;
  min-width: 11rem;
  margin-top: 4px;
  padding: 4px;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
}
.path-view__menu-list button {
  padding: 8px 10px;
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
  color: var(--mg-color-ink);
  font: inherit;
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.path-view__menu-list button:hover {
  background: var(--mg-color-mist);
}
.path-view__closed {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-3);
  align-items: center;
  margin-top: var(--mg-space-3);
  padding: var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}
.path-view__closed > .material-symbols-outlined {
  color: var(--mg-color-primary-strong);
  font-size: 24px;
}
.path-view__closed-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.path-view__closed-copy strong {
  font-size: var(--mg-font-size-sm);
}
.path-view__closed-copy small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.path-view__closed-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}
@media (max-width: 1180px) {
  .path-view__grid {
    grid-template-columns: 1fr;
  }
  .path-view__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .path-view__side {
    grid-template-columns: 1fr;
  }
}
</style>
