<template>
  <button
    type="button"
    class="mg-v2-tile"
    :class="{ 'mg-v2-tile--active': enrollment?.status === 'active' }"
    :aria-label="title"
    :data-test-program-card="program.slug"
    @click="router.push({ name: 'program-detail', params: { slug: program.slug } })"
  >
    <span class="mg-v2-icon-board" aria-hidden="true">
      <AppIcon class="material-symbols-outlined" :name="program.icon" />
    </span>

    <span class="mg-v2-tile__body">
      <h3 class="mg-v2-tile__title">{{ title }}</h3>
      <p class="mg-v2-meta">
        <span>{{ stepsLabel }}</span>
        <span>{{ weeksLabel }}</span>
        <span v-if="practiceLabel">{{ practiceLabel }}</span>
        <span v-if="statusLabel" :class="statusClass">{{ statusLabel }}</span>
      </p>
      <p class="mg-v2-tile__lead">{{ description }}</p>
    </span>
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'

const props = defineProps<{
  program: ProgramDefinition
  enrollment?: ProgramEnrollment
}>()

const router = useRouter()
const { t, tg, tp } = useT()

const title = computed(() => t(`${props.program.i18nKey}.title`))
/** The tile shows the first sentence; the detail view carries the full description. */
const description = computed(() => {
  const full = tg(`${props.program.i18nKey}.description`)
  return full.split(/(?<=[.!?])\s+/)[0] ?? full
})

/** Most frequent practice rhythm, e.g. "praktyka codziennie". */
const practiceLabel = computed(() => {
  const practices = props.program.practices ?? []
  if (practices.length === 0) return ''
  const everyDays = Math.min(...practices.map((practice) => practice.everyDays))
  const rhythm =
    everyDays === 1
      ? t('programs.ui.everyDay')
      : tp(everyDays, 'programs.ui.everyNDays.one', 'programs.ui.everyNDays.few', 'programs.ui.everyNDays.many')
  return t('programs.ui.practiceMeta', { rhythm })
})

const stepsLabel = computed(() =>
  tp(
    props.program.steps.length,
    'programs.ui.stepsCount.one',
    'programs.ui.stepsCount.few',
    'programs.ui.stepsCount.many',
  ),
)

const weeksLabel = computed(() =>
  tp(
    props.program.estimatedWeeks,
    'programs.ui.weeksCount.one',
    'programs.ui.weeksCount.few',
    'programs.ui.weeksCount.many',
  ),
)

/** Status is a quiet word in the meta line; progress "n/m" counts walked
 *  steps — skipped optional ones included (P12). Nothing for "not enrolled". */
const statusLabel = computed(() => {
  switch (props.enrollment?.status) {
    case 'active':
      return t('programs.ui.stepProgress', {
        current: Math.min(props.enrollment.currentStepIndex + 1, props.program.steps.length),
        total: props.program.steps.length,
      })
    case 'paused':
      return t('programs.ui.statusPaused')
    case 'completed':
      return t('programs.ui.statusCompleted')
    default:
      return ''
  }
})

const statusClass = computed(() =>
  props.enrollment?.status === 'paused' ? 'mg-v2-meta__warn' : 'mg-v2-meta__status',
)
</script>
