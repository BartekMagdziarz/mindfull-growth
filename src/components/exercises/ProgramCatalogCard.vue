<template>
  <button
    type="button"
    class="w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-px active:translate-y-0"
    :class="cardClass"
    :aria-label="title"
    :data-test-program-card="program.slug"
    @click="router.push({ name: 'program-detail', params: { slug: program.slug } })"
  >
    <div class="flex items-center justify-between gap-3">
      <span class="neo-icon-circle flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <AppIcon :name="program.icon" class="text-xl text-primary" />
      </span>
      <span v-if="statusPill" class="neo-pill px-2.5 py-1 text-xs" :class="statusPill.class">
        {{ statusPill.label }}
      </span>
    </div>

    <h3 class="mt-3 text-base font-semibold text-on-surface">
      {{ title }}
    </h3>
    <p class="mt-1 text-sm text-on-surface-variant">
      {{ description }}
    </p>
    <p class="mt-3 text-xs text-on-surface-variant">
      {{ metaLine }}
    </p>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'

const props = defineProps<{
  program: ProgramDefinition
  enrollment?: ProgramEnrollment
}>()

const router = useRouter()
const { t, tp } = useT()

const title = computed(() => t(`${props.program.i18nKey}.title`))
const description = computed(() => t(`${props.program.i18nKey}.description`))

const metaLine = computed(() => {
  const steps = tp(
    props.program.steps.length,
    'programs.ui.stepsCount.one',
    'programs.ui.stepsCount.few',
    'programs.ui.stepsCount.many',
  )
  const weeks = tp(
    props.program.estimatedWeeks,
    'programs.ui.weeksCount.one',
    'programs.ui.weeksCount.few',
    'programs.ui.weeksCount.many',
  )
  return `${steps} · ${weeks}`
})

/** Progress "n/m" counts walked steps — skipped optional ones included (P12). */
const statusPill = computed(() => {
  switch (props.enrollment?.status) {
    case 'active':
      return {
        label: t('programs.ui.stepProgress', {
          current: Math.min(props.enrollment.currentStepIndex + 1, props.program.steps.length),
          total: props.program.steps.length,
        }),
        class: 'border-primary/30 bg-primary/10 text-primary-strong',
      }
    case 'paused':
      return {
        label: t('programs.ui.statusPaused'),
        class: 'border-status-warn/40 bg-status-warn-soft/70 text-status-warn-on',
      }
    case 'completed':
      return { label: t('programs.ui.statusCompleted'), class: 'neo-pill--success' }
    default:
      return null
  }
})

const cardClass = computed(() =>
  props.enrollment?.status === 'active'
    ? 'border-primary/30 bg-primary/10 shadow-neu-raised-sm'
    : 'border-neu-border/30 bg-neu-base shadow-neu-flat',
)
</script>
