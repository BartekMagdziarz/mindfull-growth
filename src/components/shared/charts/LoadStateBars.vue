<template>
  <figure class="ls-bars" :class="`ls-bars--${size}`" role="img" :aria-label="aria" :title="aria">
    <span class="ls-bars__pair">
      <i class="ls-bars__load" :class="{ none: load == null }" :style="{ height: `${pct(load)}%` }"><b v-if="values && load != null">{{ load }}</b></i>
      <i class="ls-bars__state" :class="{ none: state == null }" :style="{ height: `${pct(state)}%`, background: state != null ? color : undefined }"><b v-if="values && state != null">{{ state }}</b></i>
    </span>
    <figcaption v-if="label" class="ls-bars__label">{{ label }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { classifyPair, pairColor, QUADRANT_LABELS, type MaybeRating } from '@/domain/loadState'

/**
 * One week of one area as a pair of thin bars: load in ink on the left, state
 * in the quadrant colour on the right (the "ratings-mini" glyph of the rhythm
 * calendar, recoloured for the two-axis model).
 */
const props = withDefaults(
  defineProps<{
    load: MaybeRating
    state: MaybeRating
    label?: string
    size?: 'sm' | 'md'
    /** Print the numbers above the bars. */
    values?: boolean
  }>(),
  { label: '', size: 'sm', values: false },
)

const pct = (v: MaybeRating) => (v == null ? 6 : (v / 5) * 100)
const color = computed(() => pairColor(props.load, props.state))
const aria = computed(
  () =>
    `${props.label ? `${props.label}: ` : ''}obciążenie ${props.load ?? 'brak'}, stan ${props.state ?? 'brak'}${
      props.load != null && props.state != null ? `, tydzień ${QUADRANT_LABELS[classifyPair(props.load, props.state).quadrant]}` : ''
    }`,
)
</script>

<style scoped>
.ls-bars {
  display: inline-grid;
  justify-items: center;
  gap: 5px;
  margin: 0;
}
.ls-bars__pair {
  display: inline-flex;
  gap: 2px;
  align-items: flex-end;
  height: 36px;
}
.ls-bars--md .ls-bars__pair {
  gap: 5px;
  height: 74px;
}
.ls-bars__pair i {
  position: relative;
  display: inline-block;
  width: 6px;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
}
.ls-bars--md .ls-bars__pair i {
  width: 14px;
  border-radius: 9px 7px 3px 4px / 8px 9px 3px 3px;
  transform: rotate(-1.2deg);
}
.ls-bars--md .ls-bars__pair i:nth-child(2) {
  transform: rotate(1deg);
}
.ls-bars__load {
  background: rgb(var(--sky-800));
}
.ls-bars__state {
  background: rgb(var(--sky-500));
}
.ls-bars__pair i.none {
  background: rgb(var(--neo-border) / 0.5);
}
.ls-bars__pair i b {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translate(-50%, -2px);
  color: rgb(var(--color-on-surface));
  font-size: 10.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.ls-bars__label {
  color: rgb(var(--neo-muted));
  font-size: 10.5px;
  font-weight: 800;
  text-align: center;
}
</style>
