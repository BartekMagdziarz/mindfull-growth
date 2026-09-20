<template>
  <div class="rb" :class="{ 'rb--compact': compact }">
    <p v-if="!reflection.exists" class="rb__absent">Refleksja nie została zapisana.</p>
    <template v-else-if="reflection.weekly">
      <div v-if="!hideRatings" class="rb__ratings">
        <RhythmRatingsMini :load="reflection.weekly.load" :state="reflection.weekly.state" size="lg" />
        <ul class="rb__areas">
          <li v-for="(area, i) in AREAS" :key="area"><AppIcon :name="AREA_ICONS[i]" /> {{ area }} <b>{{ reflection.weekly.load[i] ?? '–' }}</b> / <b>{{ reflection.weekly.state[i] ?? '–' }}</b></li>
        </ul>
        <small class="rb__legend"><i class="l" /> Obciążenie <i class="s" /> Stan · 1–5 · kolor stanu = ćwiartka pary</small>
      </div>
      <!-- Empty anchors disappear: a label with nothing under it is not information. -->
      <dl v-if="!compact && weeklyAnchors.length" class="rb__anchors">
        <template v-for="anchor in weeklyAnchors" :key="anchor.label"><dt>{{ anchor.label }}</dt><dd>{{ anchor.text }}</dd></template>
      </dl>
      <small v-if="reflection.status === 'draft'" class="rb__status">Szkic</small>
    </template>
    <template v-else-if="reflection.monthly">
      <RhythmCompassMini v-if="!hideRatings" :values="reflection.monthly.compass" labels />
      <ul class="rb__verdicts">
        <li v-for="v in reflection.monthly.priorityVerdicts" :key="v.priorityKey">
          <span>{{ priorityTitle(v.priorityKey) }}</span>
          <b>wysiłek {{ v.effort ?? '–' }} / 5</b>
          <em>{{ VERDICT[v.verdict] }}</em>
        </li>
      </ul>
      <dl v-if="monthlyAnchors.length" class="rb__anchors">
        <template v-for="anchor in monthlyAnchors" :key="anchor.label"><dt>{{ anchor.label }}</dt><dd>{{ anchor.text }}</dd></template>
      </dl>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import RhythmCompassMini from './RhythmCompassMini.vue'
import RhythmRatingsMini from './RhythmRatingsMini.vue'
import { AREAS, AREA_ICONS, type ReflectionProjection } from './rhythmProjections'

/** Treść refleksji do czytania; przycisk rytuału jest jeden, w nagłówku podsumowania. */
const props = defineProps<{ reflection: ReflectionProjection; priorityTitle: (key: string) => string; compact?: boolean; /** Oceny są już pokazane wyżej (podsumowanie) — tu tylko treść. */ hideRatings?: boolean }>()

const weeklyAnchors = computed(() => {
  const anchors = props.reflection.weekly?.anchors
  return [
    { label: 'Co poszło dobrze', text: anchors?.good ?? '' },
    { label: 'Co było trudne', text: anchors?.hard ?? '' },
    { label: 'Lekcje i spostrzeżenia', text: anchors?.lessons ?? '' },
  ].filter(anchor => anchor.text.trim())
})
const monthlyAnchors = computed(() => {
  const anchors = props.reflection.monthly?.anchors
  return [
    { label: 'Z czego jestem dumny', text: anchors?.proud ?? '' },
    { label: 'Największe wyzwania', text: anchors?.challenges ?? '' },
    { label: 'Jak się rozwinąłem', text: anchors?.growth ?? '' },
  ].filter(anchor => anchor.text.trim())
})

const VERDICT: Record<string, string> = { continue: 'kontynuuj', adjust: 'dostosuj', pause: 'wstrzymaj', drop: 'porzuć', '': 'bez decyzji' }
</script>

<style scoped>
.rb { display: grid; gap: 12px; font-size: 14px; }
.rb__absent { display: flex; align-items: center; gap: 10px; margin: 0; color: var(--mg-color-muted); }
.rb__ratings { display: grid; grid-template-columns: auto 1fr; gap: 6px 18px; align-items: center; }
.rb__areas { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; font-size: 13px; color: var(--mg-color-muted); }
.rb__areas li { display: flex; align-items: center; gap: 6px; }
.rb__areas .material-symbols-outlined { font-size: 16px; }
.rb__areas b { color: var(--mg-color-ink); font-variant-numeric: tabular-nums; }
.rb__legend { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; color: var(--mg-color-muted); font-size: 11px; font-weight: 700; }
.rb__legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
.rb__legend .l { background: rgb(var(--sky-800)); }
.rb__legend .s { background: rgb(var(--sky-500)); }
.rb__anchors { display: grid; grid-template-columns: 170px 1fr; gap: 4px 14px; margin: 0; }
.rb__anchors dt { color: var(--mg-color-muted); font-size: 12px; font-weight: 800; }
.rb__anchors dd { margin: 0; max-width: 62ch; }
.rb__verdicts { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.rb__verdicts li { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--cp-line); }
.rb__verdicts b { color: var(--mg-color-muted); font-weight: 700; font-size: 13px; }
.rb__verdicts em { font-style: normal; font-size: 12px; font-weight: 800; color: var(--cp-mark); }
.rb__status { color: var(--mg-color-muted); font-size: 12px; font-weight: 700; }
.rb--compact .rb__ratings { grid-template-columns: auto 1fr; }
</style>
