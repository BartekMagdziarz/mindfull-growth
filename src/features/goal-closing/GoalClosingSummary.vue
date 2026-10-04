<template>
  <!-- Read-only block on a closed goal's card: reads the frozen snapshot, never recomputes.
       „Edytuj w rytuale” reopens the ritual on the closed goal. -->
  <section class="gc-summary" :aria-label="t('planning.goalClosing.summary.title')">
    <header class="gc-summary__head">
      <b>{{ t('planning.goalClosing.summary.title') }}</b>
      <span>{{ t('planning.goalClosing.outcome.' + reflection.outcome) }} · {{ t('planning.goalClosing.summary.closedOn', { date: closedOn }) }}</span>
    </header>

    <p v-if="reflection.keyResults.length" class="gc-summary__krs">
      <span
        v-for="item in reflection.keyResults"
        :key="item.id"
        :class="`is-${item.evaluation}`"
        :title="item.lastReadout"
      >{{ item.title }}</span>
    </p>

    <p v-if="lead && !expanded" class="gc-summary__lead">
      <b>{{ lead.label }}:</b> {{ lead.text }}
    </p>

    <dl v-if="expanded" class="gc-summary__full">
      <template v-if="reflection.successMet">
        <dt>{{ t('planning.goalClosing.summary.successDefinition') }}</dt>
        <dd>{{ t('planning.goalClosing.summary.successMet.' + reflection.successMet) }}<template v-if="reflection.successNote"> — {{ reflection.successNote }}</template></dd>
      </template>
      <template v-if="reflection.confidenceInHindsight !== undefined && confidenceThen !== undefined">
        <dt>{{ t('planning.goalClosing.summary.confidence', { then: confidenceThen, now: reflection.confidenceInHindsight }) }}</dt>
        <dd v-if="reflection.confidenceNote">{{ reflection.confidenceNote }}</dd>
      </template>
      <template v-if="reflection.obstaclesHit">
        <dt>{{ t('planning.goalClosing.summary.obstacles') }}</dt>
        <dd>{{ reflection.obstaclesHit }}</dd>
      </template>
      <template v-if="reflection.workedWell">
        <dt>{{ t('planning.goalClosing.summary.workedWell') }}</dt>
        <dd>{{ reflection.workedWell }}</dd>
      </template>
      <template v-if="reflection.wasDifficult">
        <dt>{{ t('planning.goalClosing.summary.wasDifficult') }}</dt>
        <dd>{{ reflection.wasDifficult }}</dd>
      </template>
      <template v-if="reflection.learned">
        <dt>{{ tg('planning.goalClosing.summary.learned') }}</dt>
        <dd>{{ reflection.learned }}</dd>
      </template>
      <template v-if="reflection.followUp">
        <dt>{{ t('planning.goalClosing.summary.followUp.' + reflection.followUp.kind) }}</dt>
        <dd v-if="reflection.followUp.note">{{ reflection.followUp.note }}</dd>
      </template>
    </dl>

    <p class="gc-summary__actions">
      <button v-if="hasMore" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
        {{ expanded ? t('planning.goalClosing.actions.collapse') : t('planning.goalClosing.actions.showAll') }}
      </button>
      <button type="button" @click="openRitual">{{ t('planning.goalClosing.actions.editInRitual') }}</button>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import type { GoalClosingReflection } from '@/domain/planning'
import type { DayRef } from '@/domain/period'
import { formatDayShort } from '@/utils/periodLabels'

const props = defineProps<{
  goalId: string
  reflection: GoalClosingReflection
  /** The creation wizard's confidence, to pair with the hindsight value. */
  confidenceThen?: number
}>()

const { t, tg, locale } = useT()
const router = useRouter()
const route = useRoute()
const expanded = ref(false)

const closedOn = computed(() => formatDayShort(props.reflection.closedAt as DayRef, locale.value))

/** One line that stands for the whole reflection: the lesson first, then what worked. */
const lead = computed(() => {
  const r = props.reflection
  if (r.learned) return { label: tg('planning.goalClosing.summary.learned'), text: r.learned }
  if (r.workedWell) return { label: t('planning.goalClosing.summary.workedWell'), text: r.workedWell }
  if (r.wasDifficult) return { label: t('planning.goalClosing.summary.wasDifficult'), text: r.wasDifficult }
  return null
})

const hasMore = computed(() => {
  const r = props.reflection
  return Boolean(
    r.successMet || r.confidenceInHindsight !== undefined || r.obstaclesHit || r.workedWell || r.wasDifficult || r.learned || r.followUp,
  )
})

function openRitual(): void {
  void router.push({
    name: 'goal-closing-ritual',
    params: { goalId: props.goalId },
    query: { return: route.fullPath },
  })
}
</script>

<style src="./goal-closing.css"></style>
