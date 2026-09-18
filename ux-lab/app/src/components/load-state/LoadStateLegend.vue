<template>
  <figure class="ls-legend" aria-label="Legenda: obciążenie × stan">
    <div class="ls-legend__grid" role="img" :aria-label="ariaLabel">
      <span class="ls-legend__axis ls-legend__axis--y">Stan</span>
      <div class="ls-legend__cells">
        <template v-for="row in grid" :key="row[0].state">
          <span class="ls-legend__rowlabel">{{ row[0].state }}</span>
          <button
            v-for="cell in row"
            :key="`${cell.load}-${cell.state}`"
            type="button"
            class="ls-legend__cell"
            :class="{ 'ls-legend__cell--active': isActive(cell) }"
            :style="{ background: pairColor(cell.load, cell.state, options), color: pairInk(cell.load, cell.state, options) }"
            :title="`Obciążenie ${cell.load} · Stan ${cell.state} · ${QUADRANT_LABELS[classifyPair(cell.load, cell.state, options.midpoint).quadrant]}`"
            @click="emit('pick', { load: cell.load, state: cell.state })"
          >
            <span v-if="showNumbers">{{ cell.load }}·{{ cell.state }}</span>
          </button>
        </template>
        <span />
        <span v-for="load in 5" :key="load" class="ls-legend__collabel">{{ load }}</span>
      </div>
      <span class="ls-legend__axis ls-legend__axis--x">Obciążenie</span>
    </div>
    <figcaption class="ls-legend__key">
      <span v-for="q in corners" :key="q" class="ls-legend__swatch">
        <i :style="{ background: quadrantCss(q, options) }" />
        <b>{{ QUADRANT_LABELS[q] }}</b>
        <small>{{ cornerHint[q] }}</small>
      </span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  classifyPair, legendGrid, pairColor, pairInk, quadrantCss, QUADRANT_LABELS,
  type ColorOptions, type LoadStateQuadrant, type Rating,
} from '~lab/lab/weekLoadState'

const props = withDefaults(defineProps<{
  options?: ColorOptions
  showNumbers?: boolean
  active?: { load: Rating | null; state: Rating | null } | null
}>(), { options: () => ({}), showNumbers: true, active: null })
const emit = defineEmits<{ pick: [pair: { load: Rating; state: Rating }] }>()

const grid = legendGrid()
const corners: LoadStateQuadrant[] = ['strain', 'recovery', 'low', 'ease', 'neutral']
const cornerHint: Record<LoadStateQuadrant, string> = {
  strain: 'ciężko · źle',
  recovery: 'ciężko · dobrze',
  low: 'lekko · źle',
  ease: 'lekko · dobrze',
  neutral: 'środek 3 · 3',
}
const isActive = (cell: { load: Rating; state: Rating }) => props.active?.load === cell.load && props.active?.state === cell.state
const ariaLabel = computed(() => 'Siatka 5 na 5: kolumny to obciążenie od 1 do 5, wiersze to stan od 5 do 1, kolor komórki to ćwiartka tygodnia.')
</script>

<style scoped>
.ls-legend { display: grid; gap: 14px; margin: 0; }
.ls-legend__grid { display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr auto; align-items: center; gap: 6px 8px; }
.ls-legend__axis { color: rgb(var(--neo-muted)); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.ls-legend__axis--y { writing-mode: vertical-rl; transform: rotate(180deg); justify-self: center; }
.ls-legend__axis--x { grid-column: 2; justify-self: center; }
.ls-legend__cells { display: grid; grid-template-columns: 14px repeat(5, 1fr); gap: 5px; padding: 6px; border-radius: 14px; background: repeating-linear-gradient(to bottom, transparent 0 calc(20% - 1px), rgb(var(--neo-border) / 0.28) calc(20% - 1px) 20%); }
.ls-legend__rowlabel, .ls-legend__collabel { align-self: center; justify-self: center; color: rgb(var(--neo-muted)); font-size: 10px; font-weight: 700; }
/* plamki farby: nieregularne brzegi, lekki obrót, bez obrysu */
.ls-legend__cell { aspect-ratio: 1; border: 0; border-radius: 48% 52% 44% 56% / 47% 53% 46% 54%; font-size: 10px; font-weight: 750; cursor: pointer; opacity: 0.9; transform: rotate(-2deg); transition: transform 120ms ease, opacity 120ms ease; }
.ls-legend__cell:nth-child(3n) { border-radius: 54% 46% 52% 48% / 44% 56% 48% 52%; transform: rotate(1.5deg); }
.ls-legend__cell:nth-child(4n+1) { border-radius: 46% 54% 50% 50% / 55% 45% 55% 45%; transform: rotate(3deg); }
.ls-legend__cell:nth-child(5n+2) { border-radius: 52% 48% 46% 54% / 50% 46% 54% 50%; transform: rotate(-3.5deg); }
.ls-legend__cell:hover { opacity: 1; transform: scale(1.06); }
.ls-legend__cell--active { opacity: 1; outline: 1.5px solid rgb(var(--color-on-surface) / 0.7); outline-offset: 2px; }
.ls-legend__key { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.ls-legend__swatch { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; }
.ls-legend__swatch i { width: 14px; height: 14px; border-radius: 48% 52% 44% 56% / 47% 53% 46% 54%; transform: rotate(-4deg); }
.ls-legend__swatch small { color: rgb(var(--neo-muted)); }
</style>
