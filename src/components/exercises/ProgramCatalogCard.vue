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
const { t, tp } = useT()

const title = computed(() => t(`${props.program.i18nKey}.title`))
const description = computed(() => t(`${props.program.i18nKey}.description`))

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
