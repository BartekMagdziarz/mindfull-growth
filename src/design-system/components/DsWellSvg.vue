<template>
  <g class="mg-well-svg" :class="`mg-well-svg--${state}`" :style="recolour">
    <circle class="mg-well-svg__field" :cx="cx" :cy="cy" :r="r" />
    <circle v-if="state !== 'empty'" class="mg-well-svg__mark" :cx="cx" :cy="cy" :r="markR" />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WELL_MARK_RATIO } from '../well'

/**
 * The app's dot (`.mg-well`) inside an SVG chart: a point of a line or radar
 * chart, the end of a trend line. Field + mark at the same share of the outer
 * radius as every other dot (`WELL_MARK_RATIO`, mirrors --mg-well-mark-size).
 * `field` / `mark` recolour it for data colours, like the HTML well.
 */
const props = withDefaults(
  defineProps<{
    cx: number
    cy: number
    /** Outer radius in user units. */
    r: number
    state?: 'done' | 'empty'
    field?: string
    mark?: string
  }>(),
  { state: 'done', field: '', mark: '' }
)

const markR = computed(() => Math.round(props.r * WELL_MARK_RATIO * 100) / 100)

const recolour = computed(() => {
  const style: Record<string, string> = {}
  if (props.field) style['--mg-well-field'] = props.field
  if (props.mark) style['--mg-well-mark'] = props.mark
  return style
})
</script>
