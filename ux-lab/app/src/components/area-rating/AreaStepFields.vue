<template>
  <section class="arf">
    <div class="arf__col">
      <!-- na górze kafel wyniku: znak tygodnia, w nim rozwijana historia -->
      <AreaResultTile
        :area="area"
        :draft="draft"
        :past="past"
        :current-label="currentLabel"
        :past-open="pastOpen"
        :preview="preview"
        :active="active"
        @rate="(axis, value) => emit('rate', axis, value)"
        @update:past-open="emit('update:pastOpen', $event)"
        @active="active = $event"
      />

      <!-- pod nim dwa pola: tytuł, duży licznik, tagi -->
      <div class="arf__pair">
        <div v-for="axis in AXES" :key="axis" class="arf__field" :class="{ 'is-waking': active === axis }" @pointerenter="active = axis" @pointerleave="leave(axis)">
          <AreaAxisLabel :axis="axis" :load="draft.load" :state="draft.state" :hint="area[axis].hint" />
          <AreaAxisCounter
            class="arf__counter"
            :axis="axis"
            :load="draft.load"
            :state="draft.state"
            :low="area[axis].low"
            :high="area[axis].high"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            :awake="active === axis"
            @rate="emit('rate', axis, $event)"
            @preview="preview = $event == null ? null : { axis, value: $event }"
          />
          <AreaTagDock
            :model-value="draft.tags[axis]"
            :pool="suggestions[axis]"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            :awake="active === axis"
            :start-open="tagsOpen"
            @update:model-value="emit('tags', axis, $event)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaAxisCounter from './AreaAxisCounter.vue'
import AreaAxisLabel from './AreaAxisLabel.vue'
import AreaResultTile from './AreaResultTile.vue'
import AreaTagDock from './AreaTagDock.vue'

/**
 * Runda 5 · K „Kafel wyniku i dwa pola z licznikami” (układ usera, 22.11).
 * Na górze kafel wyniku z rundy 4 (ikona, nazwa, „Minione tygodnie”, żywy
 * znak). Pod nim dwa równe pola — obciążenie i stan — każde z tytułem, dużą
 * cyfrą licznika (strzałki pod kursorem) i tagami na dole: chipy na środku oraz
 * dwa małe przyciski, „+” i strzałka do bazy wcześniejszych tagów. Pole pod
 * kursorem budzi swój element na znaku, strzałka pokazuje cień następnej oceny.
 */
withDefaults(
  defineProps<{
    area: AreaDef
    draft: AreaDraft
    past: PastWeek[]
    currentLabel: string
    suggestions: Record<AxisKey, string[]>
    pastOpen: boolean
    /** Bazy tagów rozwinięte od startu — do zrzutów. */
    tagsOpen?: boolean
  }>(),
  { tagsOpen: false }
)
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]]; 'update:pastOpen': [open: boolean] }>()

const preview = ref<{ axis: AxisKey; value: number } | null>(null)
const active = ref<AxisKey | null>(null)
function leave(axis: AxisKey) {
  if (active.value === axis) active.value = null
  if (preview.value?.axis === axis) preview.value = null
}
</script>

<style scoped>
.arf {
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: 0.75rem;
}
/* kolumna = kafel wyniku: znak 35 rem + margines kafla z obu stron */
.arf__col {
  display: grid;
  gap: 14px;
  width: 40rem;
  max-width: 100%;
}
.arf__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
/* pole osi: mgła na karcie; pod kursorem budzi się element na znaku, pole zostaje mgłą (chipy są z papieru) */
.arf__field {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 16px 20px 16px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.arf__counter {
  margin-block: 0 2px;
}
</style>
