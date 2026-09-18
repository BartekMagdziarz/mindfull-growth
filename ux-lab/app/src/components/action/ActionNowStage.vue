<template>
  <div class="ac-now" :class="`ac-now--${orientation}`">
    <span class="ac-now__eyebrow">Teraz</span>
    <div class="ac-now__identity">
      <AppIcon :name="familyIcon[item.family]" class="ac-now__icon" />
      <div class="ac-now__copy">
        <strong :title="item.contribution || item.title">{{ item.title }}</strong>
        <small v-if="item.targetLabel">{{ item.targetLabel }}</small>
      </div>
    </div>

    <div class="ac-now__chart">
      <ActionObjectChart :item="item" />
    </div>

    <div class="ac-now__actions">
      <button
        type="button"
        class="ac-now__do"
        :aria-label="item.entryMode === 'completion' ? `Zapisz: ${item.title}` : `Zwiększ: ${item.title}`"
        @click="emit('do')"
      >
        <AppIcon :name="item.entryMode === 'completion' ? 'check' : 'add'" />
        <strong v-if="item.entryMode !== 'completion'">{{ formatNumber(value) }}</strong>
      </button>
      <button type="button" title="Przenieś na jutro" :aria-label="`Na jutro: ${item.title}`" @click="emit('tomorrow')"><AppIcon name="east" /></button>
      <button type="button" title="Wybierz dzień" :class="{ active: targeting }" :aria-label="`Wybierz dzień: ${item.title}`" @click="emit('pick-day')"><AppIcon name="calendar_month" /></button>
      <button type="button" title="Ukryj na dziś" :aria-label="`Ukryj: ${item.title}`" @click="emit('hide')"><AppIcon name="visibility_off" /></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import ActionObjectChart from '~lab/components/action/ActionObjectChart.vue'
import { familyIcon, formatNumber } from '~lab/lab/actionConceptData'

withDefaults(defineProps<{
  item: LabFixtureObject
  value: number
  orientation?: 'strip' | 'card'
  targeting?: boolean
}>(), { orientation: 'strip', targeting: false })

const emit = defineEmits<{ do: []; tomorrow: []; 'pick-day': []; hide: [] }>()
</script>

<style scoped>
.ac-now {
  position: relative;
  display: grid;
  gap: 8px 14px;
  padding: 10px 14px 11px;
  border: 1px solid rgb(var(--sky-400) / .35);
  border-radius: 21px 25px 20px 24px;
  background: rgb(var(--sky-100) / .5);
  box-shadow: inset -2px -2px 6px rgb(var(--neo-inset-light) / .5), inset 2px 2px 6px rgb(var(--neo-inset-dark) / .1);
}
.ac-now--strip {
  grid-template-columns: minmax(0, 1.3fr) minmax(120px, .9fr) auto;
  align-items: center;
}
.ac-now--card { grid-template-columns: minmax(0, 1fr); }

.ac-now__eyebrow {
  position: absolute;
  top: -6px;
  left: 16px;
  padding: 1px 8px;
  border: 1px solid rgb(var(--sky-400) / .45);
  border-radius: 8px 10px 7px 9px;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--neo-surface-base));
  font-size: 7px;
  font-weight: 850;
  letter-spacing: .17em;
  text-transform: uppercase;
}

.ac-now__identity { display: flex; gap: 10px; align-items: center; min-width: 0; }
.ac-now__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .8);
  font-size: 18px;
}
.ac-now__copy { display: grid; gap: 1px; min-width: 0; }
.ac-now__copy strong { overflow: hidden; font-size: 12px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.ac-now__copy small { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 750; }

.ac-now__chart { display: grid; justify-items: center; min-width: 0; }
.ac-now__ring { display: flex; gap: 8px; align-items: center; }
.ac-now__ring svg { width: 38px; height: 38px; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: rgb(var(--neo-border) / .25); stroke-width: 4; }
.ring-fill { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 4; stroke-linecap: round; }
.ac-now__ring span { display: grid; }
.ac-now__ring strong { font-size: 12px; font-weight: 800; }
.ac-now__ring em { color: rgb(var(--neo-muted)); font-size: 7px; font-style: normal; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }

.ac-now__bars { display: flex; gap: 5px; align-items: flex-end; width: 100%; max-width: 150px; height: 40px; }
.ac-now__bars i { flex: 1; border-radius: 5px 7px 2px 3px; background: rgb(var(--sky-300) / .8); }
.ac-now__bars i.current { background: rgb(var(--sky-600)); }
.ac-now__bars i.empty { background: rgb(var(--neo-border) / .3); }

.ac-now__line { width: 100%; max-width: 210px; height: 44px; }
.ac-now__line path { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 2.4; stroke-linecap: round; }
.ac-now__line path.pencil-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: 3.2; }
.ac-now__line circle { fill: rgb(var(--sky-700)); }
.target-line { stroke: rgb(var(--neo-border) / .55); stroke-width: 1; stroke-dasharray: 4 4; }

.ac-now__actions { display: flex; gap: 5px; align-items: center; justify-content: flex-end; }
.ac-now--card .ac-now__actions { justify-content: center; }
.ac-now__do {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 36px;
  padding: 0 11px;
  border: 1px solid rgb(var(--color-primary) / .12);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-surface-container));
  background: rgb(var(--sky-600));
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .2);
}
.ac-now__do:hover { background: rgb(var(--sky-700)); }
.ac-now__do .material-symbols-outlined { font-size: 17px; }

.ac-now__actions > button:not(.ac-now__do) {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  padding: 0;
  border: 1px solid rgb(var(--neo-border) / .22);
  border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%;
  color: rgb(var(--neo-muted));
  background: transparent;
  cursor: pointer;
}
.ac-now__actions > button:not(.ac-now__do):hover,
.ac-now__actions > button:not(.ac-now__do).active { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-200) / .7); }
.ac-now__actions > button:not(.ac-now__do) .material-symbols-outlined { font-size: 14px; }
</style>
