<template>
  <span class="aal" :class="`aal--${axis}`">
    <AreaAxisGlyph :axis="axis" :load="load" :state="state" />
    <span class="aal__name">{{ AXIS_TITLE[axis] }}</span>
    <details class="qr-help">
      <summary :aria-label="`Co oznacza ${AXIS_TITLE[axis]}?`">?</summary>
      <p>{{ hint }}</p>
    </details>
  </span>
</template>

<script setup lang="ts">
import type { MaybeRating } from '@product/domain/loadState'
import { AXIS_TITLE, type AxisKey } from '~lab/lab/areaRatingStep'
import AreaAxisGlyph from './AreaAxisGlyph.vue'

/**
 * Runda 4 · podpis osi jako legenda znaku: znaczek (mały słupek albo kropka w
 * kolorze pary), nazwa i pytanie osi pod „?”.
 */
defineProps<{ axis: AxisKey; load: MaybeRating; state: MaybeRating; hint: string }>()
</script>

<style scoped>
.aal {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-2);
  min-width: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
  line-height: 1.2;
  white-space: nowrap;
}
.aal .qr-help {
  opacity: 0.7;
}
.aal .qr-help[open],
.aal:hover .qr-help {
  opacity: 1;
}
.aal .qr-help > p {
  right: auto;
  left: 0;
  white-space: normal;
  font-weight: var(--mg-weight-body);
}
</style>
