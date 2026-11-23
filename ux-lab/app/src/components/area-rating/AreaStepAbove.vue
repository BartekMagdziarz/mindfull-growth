<template>
  <section class="ara">
    <div class="ara__col">
      <!-- najpierw ruch: dwa suwaki, tagi w linii nazwy osi -->
      <div v-for="axis in AXES" :key="axis" class="ara__axis">
        <div class="ara__line">
          <AreaAxisLabel :axis="axis" :load="draft.load" :state="draft.state" :hint="area[axis].hint" />
          <AreaTagLine
            class="ara__tags"
            :model-value="draft.tags[axis]"
            :suggestions="suggestions[axis]"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            end
            @update:model-value="emit('tags', axis, $event)"
          />
        </div>
        <AreaAxisSlider
          :axis="axis"
          :load="draft.load"
          :state="draft.state"
          :low="area[axis].low"
          :high="area[axis].high"
          :label="`${area.label} · ${AXIS_TITLE[axis]}`"
          aligned
          @rate="emit('rate', axis, $event)"
          @preview="preview = $event == null ? null : { axis, value: $event }"
          @active="active = $event ? axis : active === axis ? null : active"
        />
      </div>

      <!-- potem wynik: kafel obszaru jak w kalendarzu, duży; historia rozwija się w nim -->
      <AreaResultTile
        class="ara__tile"
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
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaAxisLabel from './AreaAxisLabel.vue'
import AreaAxisSlider from './AreaAxisSlider.vue'
import AreaResultTile from './AreaResultTile.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * Runda 4 · J „Suwaki nad znakiem, historia pod nim”. Krok ma dwie części:
 * u góry ruch (dwa suwaki na skali znaku, tagi po prawej w linii nazwy osi),
 * pod nimi wynik — kafel obszaru z kalendarza w dużym rozmiarze. Gałki stoją
 * nad końcem słupka i nad kropką, a minione tygodnie rozwijają się w tym samym
 * kaflu, bezpośrednio pod dużym znakiem.
 */
defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  currentLabel: string
  suggestions: Record<AxisKey, string[]>
  pastOpen: boolean
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]]; 'update:pastOpen': [open: boolean] }>()

const preview = ref<{ axis: AxisKey; value: number } | null>(null)
const active = ref<AxisKey | null>(null)
</script>

<style scoped>
.ara {
  --ara-track: 35rem;
  --ara-pad: 2.5rem;
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: 2.75rem;
}
.ara__col {
  display: grid;
  width: var(--ara-track);
  max-width: 100%;
}
.ara__axis {
  display: grid;
  gap: 6px;
}
.ara__axis + .ara__axis {
  margin-top: 8px;
}
.ara__line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--mg-space-4);
  min-height: 1.75rem;
}
.ara__line > .aal {
  height: 1.75rem;
}

/* kafel wyniku jest szerszy od kolumny o własny margines, żeby skale się zgadzały */
.ara__tile {
  --artl-pad: var(--ara-pad);
  margin: 14px calc(-1 * var(--ara-pad)) 0;
}
</style>
