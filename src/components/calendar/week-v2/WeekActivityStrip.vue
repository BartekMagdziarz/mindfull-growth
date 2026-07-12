<script setup lang="ts">
import type { PeriodActivity } from '@/services/periodActivity'
import MonthMiniCalendar from '@/components/calendar/month-v2/MonthMiniCalendar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

defineProps<{ activity: PeriodActivity }>()
const { t } = useT()
</script>

<template>
  <section class="week-activity" data-testid="week-v2-activity">
    <p class="week-activity__label">{{ t('planning.calendar.weekV2.activity') }}</p>
    <MonthMiniCalendar :days="activity.days" />
    <div class="week-activity__metrics">
      <div class="week-activity__metric"><AppIcon name="mood" /><b>{{ activity.totals.emotionSessions }}</b><span>{{ t('planning.calendar.wellness.emotions') }}</span></div>
      <div class="week-activity__metric"><AppIcon name="menu_book" /><b>{{ activity.totals.journalEntries }}</b><span>{{ t('planning.calendar.wellness.journal') }}</span></div>
      <div class="week-activity__metric"><AppIcon name="self_improvement" /><b>{{ activity.totals.exercises }}</b><span>{{ t('planning.calendar.wellness.exercises') }}</span></div>
    </div>
  </section>
</template>

<style scoped>
.week-activity { display: flex; flex-direction: column; gap: 8px; }
.week-activity__label { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.week-activity__metrics { display: grid; gap: 7px; grid-template-columns: repeat(3, 1fr); }
.week-activity__metric { align-items: center; border-radius: 13px; box-shadow: inset 1px 1px 3px rgb(var(--neo-inset-dark) / .28), inset -1px -1px 3px rgb(var(--neo-inset-light) / .6); color: rgb(var(--color-primary-strong)); display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 8px 3px; }
.week-activity__metric b { color: rgb(var(--neo-text)); font-size: 13px; }
.week-activity__metric span:last-child { color: rgb(var(--neo-muted)); font-size: 8px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
