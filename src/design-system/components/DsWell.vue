<template>
  <component
    :is="as"
    class="mg-well"
    :class="classes"
    :style="recolour"
    :type="as === 'button' ? 'button' : undefined"
    :role="label && as !== 'button' ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="!label && as !== 'button' ? 'true' : undefined"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

/**
 * THE dot of the app („studnia”): one round mark for every state — done,
 * selected, planned, answered, current, recorded. Never draw a ring with a dot
 * locally; use this component or the `.mg-well` anatomy it renders
 * (src/design-system/README.md → „Kropka”).
 *
 * - `state`: empty (default) · done · soft (mark not firm) · current (accent
 *   ring) · lit (field, no mark) · missed (rose field) · ghost (not reachable).
 * - `size`: xs 12 px · sm 16 px · md 24 px · lg 2.1rem (the „Plan dnia” disc,
 *   default) · xl 2.75rem. The inner mark is always 58 % of the outer size.
 * - `data`: a data mark in a chart or history strip — the empty dot is a flat
 *   tint, not a control's rim.
 * - `sky`: the dot lies on the page sky (no card) — mist ground and field.
 * - `field` / `mark` / `ground`: recolour for data charts only (load & state,
 *   emotion quadrants); everything else keeps the app's colours.
 * - Slot: an icon, letter or number on the dot (inverted when done).
 */
type WellState = 'empty' | 'done' | 'soft' | 'current' | 'lit' | 'missed' | 'ghost'
type WellSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    state?: WellState
    size?: WellSize
    as?: 'span' | 'i' | 'button'
    data?: boolean
    /** The dot lies on the page sky, not on a card: a lighter ground and field. */
    sky?: boolean
    alt?: boolean
    label?: string
    field?: string
    mark?: string
    ground?: string
  }>(),
  {
    state: 'empty',
    size: 'lg',
    as: 'span',
    data: false,
    sky: false,
    alt: false,
    label: '',
    field: '',
    mark: '',
    ground: '',
  }
)

const slots = useSlots()

const classes = computed(() => [
  `mg-well--${props.size}`,
  props.state !== 'empty' ? `mg-well--${props.state}` : null,
  {
    'mg-well--data': props.data,
    'mg-well--sky': props.sky,
    'mg-well--alt': props.alt,
    'mg-well--icon': Boolean(slots.default),
  },
])

const recolour = computed(() => {
  const style: Record<string, string> = {}
  if (props.field) style['--mg-well-field'] = props.field
  if (props.mark) style['--mg-well-mark'] = props.mark
  if (props.ground) style['--mg-well-ground'] = props.ground
  return style
})
</script>
