<template>
  <i class="aag" :class="`aag--${axis}`" :style="{ background: axis === 'load' ? tone.fill : tone.mark }" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MaybeRating } from '@product/domain/loadState'
import { loadStateTone } from '@product/domain/loadStateTone'
import type { AxisKey } from '~lab/lab/areaRatingStep'

/**
 * Runda 4 · znaczek osi: mały leżący słupek = obciążenie, mała kropka = stan,
 * oba w kolorze pary ocen. Stoi przy nazwie osi i przy jej tagach.
 */
const props = defineProps<{ axis: AxisKey; load: MaybeRating; state: MaybeRating }>()
const NEUTRAL = 'var(--mg-color-data-fill)'
const tone = computed(() => {
  const pair = loadStateTone(props.load, props.state)
  return { fill: pair?.fill ?? NEUTRAL, mark: pair?.mark ?? NEUTRAL }
})
</script>

<style scoped>
.aag {
  display: inline-block;
  flex: none;
}
.aag--load {
  width: 1rem;
  height: 0.4375rem;
  border-radius: var(--mg-radius-pill);
}
.aag--state {
  width: 0.625rem;
  height: 0.625rem;
  margin-inline: 0.1875rem;
  border-radius: var(--mg-radius-organic-c);
}
</style>
