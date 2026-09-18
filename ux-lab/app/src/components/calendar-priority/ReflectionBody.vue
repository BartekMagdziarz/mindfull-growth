<template>
  <div class="rb" :class="{ 'rb--compact': compact }">
    <p v-if="!reflection.exists" class="rb__absent">Refleksja nie została zapisana.</p>
    <template v-else-if="reflection.weekly">
      <div v-if="!hideRatings" class="rb__ratings">
        <RatingsMini :effort="reflection.weekly.effort" :state="reflection.weekly.state" size="lg" />
        <ul class="rb__areas">
          <li v-for="(area, i) in AREAS" :key="area"><AppIcon :name="AREA_ICONS[i]" /> {{ area }} <b>{{ reflection.weekly.effort[i] ?? '–' }}</b> / <b>{{ reflection.weekly.state[i] ?? '–' }}</b></li>
        </ul>
        <small class="rb__legend"><i class="e" /> Wysiłek <i class="s" /> Stan · 1–5 · Wymagania: {{ reflection.weekly.demands.map(v => v ?? '–').join(' · ') }}</small>
      </div>
      <dl v-if="!compact" class="rb__anchors">
        <template v-if="hideRatings"><dt>Wymagania</dt><dd>{{ AREAS.map((a, i) => `${a} ${reflection.weekly!.demands[i] ?? '–'}`).join(' · ') }}</dd></template>
        <dt>Co poszło dobrze</dt><dd>{{ reflection.weekly.anchors.good }}</dd>
        <dt>Co było trudne</dt><dd>{{ reflection.weekly.anchors.hard }}</dd>
        <dt>Lekcje i spostrzeżenia</dt><dd>{{ reflection.weekly.anchors.lessons }}</dd>
      </dl>
      <small v-if="reflection.status === 'draft'" class="rb__status">Szkic</small>
    </template>
    <template v-else-if="reflection.monthly">
      <CompassMini v-if="!hideRatings" :values="reflection.monthly.compass" labels />
      <ul class="rb__verdicts">
        <li v-for="v in reflection.monthly.priorityVerdicts" :key="v.priorityKey">
          <span>{{ priorityTitle(v.priorityKey) }}</span>
          <b>wysiłek {{ v.effort ?? '–' }} / 5</b>
          <em>{{ VERDICT[v.verdict] }}</em>
        </li>
      </ul>
      <dl class="rb__anchors">
        <dt>Z czego jestem dumny</dt><dd>{{ reflection.monthly.anchors.proud }}</dd>
        <dt>Największe wyzwania</dt><dd>{{ reflection.monthly.anchors.challenges }}</dd>
        <dt>Jak się rozwinąłem</dt><dd>{{ reflection.monthly.anchors.growth }}</dd>
      </dl>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import CompassMini from '~lab/components/calendar-priority/CompassMini.vue'
import RatingsMini from '~lab/components/calendar-priority/RatingsMini.vue'
import { AREAS, AREA_ICONS, type ReflectionProjection } from '~lab/lab/calendarPriorityData'

/** Treść refleksji do czytania; przycisk rytuału jest jeden, w nagłówku podsumowania. */
defineProps<{ reflection: ReflectionProjection; priorityTitle: (key: string) => string; compact?: boolean; /** Oceny są już pokazane wyżej (podsumowanie) — tu tylko treść. */ hideRatings?: boolean }>()

const VERDICT = { continue: 'kontynuuj', adjust: 'dostosuj', pause: 'wstrzymaj', drop: 'porzuć' } as const
</script>

<style scoped>
.rb { display: grid; gap: 12px; font-size: 14px; }
.rb__absent { display: flex; align-items: center; gap: 10px; margin: 0; color: rgb(var(--color-on-surface-variant)); }
.rb__ratings { display: grid; grid-template-columns: auto 1fr; gap: 6px 18px; align-items: center; }
.rb__areas { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; font-size: 13px; color: rgb(var(--color-on-surface-variant)); }
.rb__areas li { display: flex; align-items: center; gap: 6px; }
.rb__areas .material-symbols-outlined { font-size: 16px; }
.rb__areas b { color: rgb(var(--color-on-surface)); font-variant-numeric: tabular-nums; }
.rb__legend { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; color: rgb(var(--neo-muted)); font-size: 11px; font-weight: 700; }
.rb__legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
.rb__legend .e { background: rgb(var(--rose-400)); }
.rb__legend .s { background: var(--cp-accent); }
.rb__anchors { display: grid; grid-template-columns: 170px 1fr; gap: 4px 14px; margin: 0; }
.rb__anchors dt { color: rgb(var(--neo-muted)); font-size: 12px; font-weight: 800; }
.rb__anchors dd { margin: 0; max-width: 62ch; }
.rb__verdicts { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.rb__verdicts li { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; padding: 4px 0; border-bottom: 1px solid rgb(var(--neo-border) / .22); }
.rb__verdicts b { color: rgb(var(--color-on-surface-variant)); font-weight: 700; font-size: 13px; }
.rb__verdicts em { font-style: normal; font-size: 12px; font-weight: 800; color: rgb(var(--sky-700)); }
.rb__status { color: rgb(var(--neo-muted)); font-size: 12px; font-weight: 700; }
.rb--compact .rb__ratings { grid-template-columns: auto 1fr; }
</style>
