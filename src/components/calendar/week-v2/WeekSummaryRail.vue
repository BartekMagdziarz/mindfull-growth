<script setup lang="ts">
import type { WeekV2Rail } from '@/services/weekV2Overview'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import WeekMatrixPanel from './WeekMatrixPanel.vue'
import WeekActivityStrip from './WeekActivityStrip.vue'

defineProps<{ rail: WeekV2Rail }>()
const emit = defineEmits<{
  openReflection: []
  openObject: [payload: { type: string; id: string }]
}>()
const { t } = useT()

const STATUS_ICON = { met: 'check_circle', missed: 'cancel', 'in-progress': 'pending', 'no-data': 'remove' }
</script>

<template>
  <aside class="week-rail neo-raised" data-testid="week-v2-summary-rail">
    <p class="week-rail__eyebrow">{{ t('planning.calendar.weekV2.overview') }}</p>
    <WeekMatrixPanel :matrix="rail.matrix" :unlocked="rail.reflectionUnlocked" @open-reflection="emit('openReflection')" />
    <WeekActivityStrip :activity="rail.activity" />
    <section class="week-rail__priorities">
      <p class="week-rail__label">{{ t('planning.calendar.weekV2.topPriorities') }}</p>
      <p v-if="rail.topPriorities.length === 0" class="week-rail__empty">{{ t('planning.calendar.weekV2.noPriorities') }}</p>
      <button
        v-for="priority in rail.topPriorities"
        :key="priority.key"
        type="button"
        class="week-rail__priority neo-focus"
        @click="emit('openObject', { type: priority.subjectType, id: priority.subjectId })"
      >
        <AppIcon :name="priority.icon ?? 'flag'" class="week-rail__priority-icon" />
        <span>{{ priority.title }}</span>
        <AppIcon :name="STATUS_ICON[priority.status]" :class="`week-rail__status week-rail__status--${priority.status}`" />
      </button>
    </section>
  </aside>
</template>

<style scoped>
.week-rail { border-radius: 27px; display: flex; flex-direction: column; gap: 17px; padding: 17px; }
.week-rail__eyebrow, .week-rail__label { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.week-rail__eyebrow { font-size: 10px; }
.week-rail__priorities { display: flex; flex-direction: column; gap: 7px; }
.week-rail__priority { align-items: center; background: none; border: 0; border-radius: 12px; color: rgb(var(--neo-text)); cursor: pointer; display: grid; font: inherit; font-size: 11px; gap: 8px; grid-template-columns: 20px 1fr 20px; padding: 8px; text-align: left; transition: box-shadow .2s ease, transform .15s ease; }
.week-rail__priority:hover { box-shadow: 2px 2px 5px rgb(var(--neo-shadow-dark) / .3), -2px -2px 5px rgb(var(--neo-shadow-light) / .65); transform: translateY(-1px); }
.week-rail__priority:active { box-shadow: inset 1px 1px 3px rgb(var(--neo-inset-dark) / .3), inset -1px -1px 3px rgb(var(--neo-inset-light) / .6); transform: scale(.99); }
.week-rail__priority-icon { color: rgb(var(--color-primary-strong)); }
.week-rail__status--met { color: rgb(var(--color-success)); }
.week-rail__status--missed { color: rgb(var(--color-error)); }
.week-rail__status--in-progress, .week-rail__status--no-data, .week-rail__empty { color: rgb(var(--neo-muted)); }
.week-rail__empty { font-size: 10px; padding: 7px 0; }
</style>
