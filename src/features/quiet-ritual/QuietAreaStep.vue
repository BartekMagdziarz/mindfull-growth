<template>
  <section class="qr-area">
    <div class="qr-area__col">
      <!-- on top the result: this week's mark, with earlier weeks folded inside the tile -->
      <QuietAreaResultTile
        :icon="icon"
        :title="title"
        :load="pair.load"
        :state="pair.state"
        :past="past"
        :current-label="currentLabel"
        :open="historyOpen"
        :preview="preview"
        :active="active"
        @rate="(axis, value) => emit('rate', axis, value)"
        @update:open="emit('update:historyOpen', $event)"
        @active="active = $event"
      />

      <!-- under it two fields: title, the counter, tags -->
      <div class="qr-area__pair">
        <QuietRatingField
          v-for="axis in RATING_AXES"
          :key="axis"
          class="qr-area__field"
          :class="`qr-area__field--${axis}`"
          :title="axes[axis].title"
          :hint="axes[axis].hint"
          :label="`${title} · ${axes[axis].title}`"
          :model-value="axis === 'load' ? load : state"
          :low-label="axes[axis].low"
          :high-label="axes[axis].high"
          :tags="tags[axis]"
          :pool="pools[axis]"
          @update:model-value="emit('rate', axis, $event)"
          @update:tags="emit('tags', axis, $event)"
          @preview="preview = $event == null ? null : { axis, value: $event }"
          @awake="$event ? (active = axis) : leave(axis)"
        >
          <template #glyph>
            <i class="qr-area__glyph" :style="{ background: glyph[axis] }" aria-hidden="true" />
          </template>
        </QuietRatingField>
      </div>

      <!-- Tags written before the load/state split stay visible with the week they belong to. -->
      <p v-if="legacyTags.length" class="qr-legacy-tags">
        <AppIcon name="sell" />{{ legacyTags.join(', ') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { toRating } from '@/domain/loadState'
import type { WeekPoint } from '@/domain/loadStateSeries'
import { loadStateTone } from '@/domain/loadStateTone'
import QuietAreaResultTile from './QuietAreaResultTile.vue'
import QuietRatingField from './QuietRatingField.vue'
import { RATING_AXES, type RatingAxis } from './quietRitualModel'

/**
 * One life-area step of the weekly reflection (layout decided 2026-11-22, UX
 * Lab `/concepts/area-rating-step`, variant K). On top the result tile: the
 * calendar's load & state mark, large and live. Under it two equal fields,
 * load and state (`QuietRatingField`: a title, a big digit counter and the
 * tags of that axis). The field under the cursor wakes its element on the
 * mark; an arrow of a counter previews the next rating there.
 *
 * The step owns no data: ratings and tags go up as events, history and the
 * tag pools come in as props.
 */
export interface QuietAreaAxisCopy {
  title: string
  /** The question of the axis, shown under „?”. */
  hint: string
  low: string
  high: string
}

const props = withDefaults(
  defineProps<{
    icon: string
    /** Area name, e.g. „Ciało”. */
    title: string
    load: number | null
    state: number | null
    axes: Record<RatingAxis, QuietAreaAxisCopy>
    tags: Record<RatingAxis, string[]>
    /** Earlier tags per axis, most relevant first. */
    pools: Record<RatingAxis, string[]>
    /** Earlier rated weeks of this area, newest first. */
    past: WeekPoint[]
    currentLabel: string
    /** Tags saved before the load/state split — read-only. */
    legacyTags?: string[]
    historyOpen?: boolean
  }>(),
  { legacyTags: () => [], historyOpen: false }
)
const emit = defineEmits<{
  rate: [axis: RatingAxis, value: number | null]
  tags: [axis: RatingAxis, tags: string[]]
  'update:historyOpen': [open: boolean]
}>()

const pair = computed(() => ({ load: toRating(props.load), state: toRating(props.state) }))

/** Legend glyphs by the axis names: a small bar and a small dot in the pair's colour. */
const NEUTRAL = 'var(--mg-color-data-fill)'
const glyph = computed<Record<RatingAxis, string>>(() => {
  const tone = loadStateTone(pair.value.load, pair.value.state)
  return { load: tone?.fill ?? NEUTRAL, state: tone?.mark ?? NEUTRAL }
})

const preview = ref<{ axis: RatingAxis; value: number } | null>(null)
const active = ref<RatingAxis | null>(null)
function leave(axis: RatingAxis) {
  if (active.value === axis) active.value = null
  if (preview.value?.axis === axis) preview.value = null
}
</script>

<style scoped>
.qr-area {
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: 0.75rem;
}
/* the column = the result tile: a 35 rem mark plus the tile's margin on both sides */
.qr-area__col {
  display: grid;
  gap: 14px;
  width: 40rem;
  max-width: 100%;
}
.qr-area__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
/* legend glyphs by the axis names: a small bar and a small dot in the pair's colour */
.qr-area__glyph {
  display: inline-block;
  flex: none;
}
.qr-area__field--load .qr-area__glyph {
  width: 1rem;
  height: 0.4375rem;
  border-radius: var(--mg-radius-pill);
}
.qr-area__field--state .qr-area__glyph {
  width: 0.625rem;
  height: 0.625rem;
  margin-inline: 0.1875rem;
  border-radius: var(--mg-radius-organic-c);
}
@media (max-width: 900px) {
  .qr-area__pair {
    grid-template-columns: 1fr;
  }
}
</style>
