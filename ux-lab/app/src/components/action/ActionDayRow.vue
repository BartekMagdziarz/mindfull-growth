<template>
  <article class="ac-row" :class="{ lit, dim, done: hasEntry, selectable, staged }" @click="selectable && emit('select')">
    <AppIcon :name="familyIcon[item.family]" class="ac-row__icon" />
    <div class="ac-row__body">
      <strong :title="item.contribution || item.title">{{ item.title }}</strong>
      <span v-if="progressPct !== null" class="ac-row__gauge" aria-hidden="true"><i :style="{ width: `${Math.round(progressPct * 100)}%` }" /></span>
    </div>
    <span v-if="!staged" class="ac-row__tray" role="group" :aria-label="`Akcje: ${item.title}`">
      <button type="button" title="Przenieś na jutro" :aria-label="`Na jutro: ${item.title}`" @click.stop="emit('tomorrow')"><AppIcon name="east" /></button>
      <button type="button" title="Wybierz dzień" :aria-label="`Wybierz dzień: ${item.title}`" @click.stop="emit('pick-day')"><AppIcon name="calendar_month" /></button>
      <button type="button" title="Ukryj na dziś" :aria-label="`Ukryj: ${item.title}`" @click.stop="emit('hide')"><AppIcon name="visibility_off" /></button>
      <button type="button" title="Otwórz obiekt" :aria-label="`Otwórz: ${item.title}`" @click.stop="emit('open')"><AppIcon name="open_in_new" /></button>
    </span>
    <button
      type="button"
      class="ac-stamp"
      :class="{ 'ac-stamp--data': item.entryMode !== 'completion', done: item.entryMode === 'completion' && done }"
      :aria-label="controlLabel"
      :aria-pressed="item.entryMode === 'completion' ? done : undefined"
      @click.stop="emit('toggle')"
    >
      <span v-if="item.entryMode === 'completion' && done" class="ac-stamp__dot" aria-hidden="true" />
      <strong v-else-if="item.entryMode !== 'completion'">{{ formatNumber(value) }}</strong>
    </button>
    <div v-if="staged && $slots.expansion" class="ac-row__expansion">
      <slot name="expansion" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import { familyIcon, formatNumber } from '~lab/lab/actionConceptData'

const props = withDefaults(defineProps<{
  item: LabFixtureObject
  done: boolean
  value: number
  lit?: boolean
  dim?: boolean
  progressPct?: number | null
  selectable?: boolean
  staged?: boolean
}>(), { lit: false, dim: false, progressPct: null, selectable: false, staged: false })

const emit = defineEmits<{ toggle: []; tomorrow: []; 'pick-day': []; hide: []; open: []; select: [] }>()

const hasEntry = computed(() => (props.item.entryMode === 'completion' ? props.done : props.value > 0))
const controlLabel = computed(() => {
  if (props.item.entryMode === 'completion') return props.done ? `Cofnij: ${props.item.title}` : `Zapisz: ${props.item.title}`
  return `Zwiększ: ${props.item.title}. Obecnie ${formatNumber(props.value)}`
})
</script>

<style scoped>
.ac-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto auto;
  gap: 9px;
  align-items: center;
  min-height: 40px;
  padding: 2px 2px;
  border-bottom: 1px solid rgb(var(--neo-border) / .14);
  transition: opacity .18s ease, background .18s ease;
}
.ac-row:nth-of-type(even) { transform: rotate(-.035deg); }
.ac-row:last-child { border-bottom-color: transparent; }
.ac-row.dim { opacity: .32; }
.ac-row.lit { border-radius: 12px; background: rgb(var(--sky-100) / .6); }
.ac-row.selectable { cursor: pointer; }
.ac-row.staged { border-radius: 12px; background: rgb(var(--sky-100) / .75); box-shadow: inset 2.5px 0 0 rgb(var(--sky-500) / .8); }
.ac-row__expansion { grid-column: 2 / -1; padding: 2px 2px 7px; }

.ac-row__icon { color: rgb(var(--color-primary-strong)); font-size: 18px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 70, 'opsz' 24; }
.ac-row__body { display: grid; gap: 4px; min-width: 0; }
.ac-row__body > strong { overflow: hidden; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }

.ac-row__gauge { display: block; overflow: hidden; height: 2.5px; border-radius: 2px; background: rgb(var(--neo-border) / .22); }
.ac-row__gauge i { display: block; height: 100%; border-radius: 2px; background: rgb(var(--sky-500) / .85); transition: width .3s ease; }

.ac-row__tray { display: inline-flex; gap: 3px; opacity: 0; transition: opacity .18s ease; }
.ac-row:hover .ac-row__tray, .ac-row__tray:focus-within { opacity: 1; }
.ac-row__tray button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%;
  color: rgb(var(--neo-muted));
  background: transparent;
  cursor: pointer;
  transition: color .18s ease, background .18s ease;
}
.ac-row__tray button:hover { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-200) / .7); }
.ac-row__tray .material-symbols-outlined { font-size: 13px; }

.ac-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgb(var(--color-primary) / .1);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .72);
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
  transition: background .2s ease, transform .16s ease;
}
.ac-row:nth-of-type(even) .ac-stamp { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.ac-stamp:hover { background: rgb(var(--sky-200) / .88); }
.ac-stamp:active { transform: scale(.985); }
.ac-stamp__dot {
  width: 22px;
  height: 22px;
  border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%;
  background: rgb(var(--sky-700));
  box-shadow: inset -1px -1px 3px rgb(var(--sky-500) / .16), inset 1px 1px 3px rgb(var(--sky-800) / .16);
  transform: rotate(-2deg);
}
.ac-stamp--data { color: rgb(var(--sky-800)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .4), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }
.ac-stamp--data strong { font-size: 10px; font-weight: 800; letter-spacing: -.02em; }
</style>
