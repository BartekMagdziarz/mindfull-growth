<template>
  <div v-if="program" class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="mb-6 flex items-center gap-4">
      <button class="neo-back-btn p-2 text-neu-text neo-focus" @click="router.push('/exercises')">
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <span class="neo-icon-circle flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <AppIcon :name="program.icon" class="text-xl text-primary" />
      </span>
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-on-surface">
          {{ t(`${program.i18nKey}.title`) }}
        </h1>
        <p class="text-sm text-on-surface-variant">
          {{ metaLine }}
        </p>
      </div>
    </div>

    <p class="mb-4 text-sm text-on-surface-variant">
      {{ t(`${program.i18nKey}.description`) }}
    </p>

    <!-- Completed state + finale (design §4.5: the foundation build is the path's finale) -->
    <div
      v-if="enrollment?.status === 'completed'"
      class="mb-6 rounded-2xl border border-neu-border/30 bg-neu-base p-4 shadow-neu-raised-sm"
    >
      <div class="flex items-center gap-2">
        <AppIcon name="workspace_premium" class="text-xl text-primary" />
        <h2 class="text-base font-semibold text-on-surface">
          {{ t('programs.ui.completedTitle') }}
        </h2>
      </div>
      <p class="mt-1 text-sm text-on-surface-variant">
        {{
          program.finaleRouteName
            ? t(`${program.i18nKey}.finaleDescription`)
            : t('programs.ui.completedMessage')
        }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <AppButton v-if="program.finaleRouteName" @click="router.push({ name: program.finaleRouteName })">
          {{ t(`${program.i18nKey}.finaleCta`) }}
        </AppButton>
        <AppButton variant="tonal" :disabled="busy" @click="handleEnroll">
          {{ t('programs.ui.reenroll') }}
        </AppButton>
      </div>
    </div>

    <!-- Action row by enrollment status -->
    <div v-else class="mb-6 flex flex-wrap items-center gap-2">
      <template v-if="!openEnrollment">
        <AppButton :disabled="busy" @click="handleEnroll">
          {{ t('programs.ui.enroll') }}
        </AppButton>
      </template>
      <template v-else-if="openEnrollment.status === 'active'">
        <span class="neo-pill border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary-strong">
          {{ progressLabel }}
        </span>
        <AppButton variant="tonal" :disabled="busy" @click="handlePause">
          {{ t('programs.ui.pause') }}
        </AppButton>
        <AppButton variant="text" :disabled="busy" @click="abandonDialogOpen = true">
          {{ t('programs.ui.abandon') }}
        </AppButton>
      </template>
      <template v-else>
        <span class="neo-pill border-status-warn/40 bg-status-warn-soft/70 px-2.5 py-1 text-xs text-status-warn-on">
          {{ t('programs.ui.statusPaused') }}
        </span>
        <AppButton :disabled="busy" @click="handleResume">
          {{ t('programs.ui.resume') }}
        </AppButton>
        <AppButton variant="text" :disabled="busy" @click="abandonDialogOpen = true">
          {{ t('programs.ui.abandon') }}
        </AppButton>
      </template>
    </div>

    <p v-if="openEnrollment?.status === 'paused'" class="mb-4 text-sm text-on-surface-variant">
      {{ t('programs.ui.pausedNote') }}
    </p>
    <p v-if="error" class="mb-4 text-sm text-status-warn-on">{{ error }}</p>

    <!-- Step timeline -->
    <div class="space-y-3">
      <ProgramStepTile
        v-for="(step, index) in program.steps"
        :key="index"
        :index="index"
        :step="step"
        :step-state="stepStates[index] ?? { state: 'locked' }"
        :planned-day="index === openEnrollment?.currentStepIndex ? pendingStepDay : undefined"
        :paused="openEnrollment?.status === 'paused'"
        @skip="handleSkip"
      />
    </div>

    <AppDialog
      v-model="abandonDialogOpen"
      :title="t('programs.ui.abandonConfirmTitle')"
      :message="t('programs.ui.abandonConfirmMessage')"
      :confirm-text="t('programs.ui.abandon')"
      @confirm="handleAbandon"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ProgramStepTile from '@/components/exercises/ProgramStepTile.vue'
import { useT } from '@/composables/useT'
import { getProgramDefinition } from '@/data/programCatalog'
import { deriveStepStates } from '@/services/programSchedulerService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'

const route = useRoute()
const router = useRouter()
const { t, tp } = useT()

const enrollmentStore = useProgramEnrollmentStore()
const planStore = useExercisePlanStore()

const slug = computed(() => String(route.params.slug ?? ''))
const program = computed(() => getProgramDefinition(slug.value))

const busy = ref(false)
const error = ref<string | null>(null)
const abandonDialogOpen = ref(false)

/** Active/paused first, else the latest completed (abandoned = not enrolled). */
const enrollment = computed(() => enrollmentStore.enrollmentForProgram(slug.value))
const openEnrollment = computed(() =>
  enrollment.value?.status === 'active' || enrollment.value?.status === 'paused'
    ? enrollment.value
    : undefined,
)

const stepStates = computed(() =>
  program.value ? deriveStepStates(program.value, enrollment.value ?? null) : [],
)

/** The materialized current step's planned day (may differ from eligibleDay after a move). */
const pendingStepDay = computed(
  () =>
    openEnrollment.value &&
    planStore.pendingItems.find(
      (item) => item.source === 'program' && item.sourceRef === openEnrollment.value?.id,
    )?.dayRef,
)

const metaLine = computed(() => {
  if (!program.value) return ''
  const steps = tp(
    program.value.steps.length,
    'programs.ui.stepsCount.one',
    'programs.ui.stepsCount.few',
    'programs.ui.stepsCount.many',
  )
  const weeks = tp(
    program.value.estimatedWeeks,
    'programs.ui.weeksCount.one',
    'programs.ui.weeksCount.few',
    'programs.ui.weeksCount.many',
  )
  return `${steps} · ${weeks}`
})

const progressLabel = computed(() => {
  if (!program.value || !openEnrollment.value) return ''
  return t('programs.ui.stepProgress', {
    current: Math.min(openEnrollment.value.currentStepIndex + 1, program.value.steps.length),
    total: program.value.steps.length,
  })
})

onMounted(() => {
  if (!program.value) {
    void router.replace('/exercises')
    return
  }
  void Promise.all([enrollmentStore.ensureLoaded(), planStore.ensureLoaded()])
})

watch(slug, () => {
  if (route.name === 'program-detail' && !program.value) {
    void router.replace('/exercises')
  }
})

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

async function handleSkip(): Promise<void> {
  const id = openEnrollment.value?.id
  if (id) await run(() => enrollmentStore.skipStep(id))
}
</script>
