<template>
  <section class="art">
    <div class="art__col">
      <header class="art__head">
        <span class="art__disc"><AppIcon :name="area.icon" /></span>
        <strong>{{ area.label }}</strong>
      </header>

      <!-- znak i zaraz pod nim dwa suwaki na jego skali: gałka stoi pod swoim elementem -->
      <AreaMarkStage :draft="draft" :subject="`${area.label} · ten tydzień`" :preview="preview" :active="active" @rate="(axis, value) => emit('rate', axis, value)" @active="active = $event" />
      <div v-for="axis in AXES" :key="axis" class="art__row">
        <AreaAxisLabel class="art__label" :axis="axis" :load="draft.load" :state="draft.state" :hint="area[axis].hint" />
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
    </div>

    <!-- trzy furtki: tag do obciążenia, tag do stanu, minione tygodnie -->
    <div class="art__tray">
      <div v-for="axis in AXES" :key="axis" class="art__door">
        <AreaAxisGlyph :axis="axis" :load="draft.load" :state="draft.state" />
        <AreaTagLine
          :model-value="draft.tags[axis]"
          :suggestions="suggestions[axis]"
          :label="`${area.label} · ${AXIS_TITLE[axis]}`"
          :add-label="TAG_DOOR[axis]"
          @update:model-value="emit('tags', axis, $event)"
        />
      </div>
      <AreaPastToggle v-if="past.length" :open="pastOpen" @update:open="emit('update:pastOpen', $event)" />
    </div>

    <div v-if="pastOpen && past.length" class="art__col">
      <AreaHistory class="art__past" :weeks="past" :subject="area.label" size="sm" newest-first />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaAxisGlyph from './AreaAxisGlyph.vue'
import AreaAxisLabel from './AreaAxisLabel.vue'
import AreaAxisSlider from './AreaAxisSlider.vue'
import AreaHistory from './AreaHistory.vue'
import AreaMarkStage from './AreaMarkStage.vue'
import AreaPastToggle from './AreaPastToggle.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * Runda 4 · H „Suwaki pod znakiem, trzy furtki” (pomysł usera, dopracowany).
 * Znak na środku, pod nim dwa suwaki tej samej szerokości i na tej samej
 * skali; nazwy osi wiszą z lewej, żeby znak i suwaki dzieliły jedną kolumnę.
 * Niżej jedna cicha linia: tagi obciążenia, tagi stanu (każda grupa ze
 * znaczkiem swojej osi) i „Minione tygodnie”, które rozwijają historię.
 */
defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  suggestions: Record<AxisKey, string[]>
  pastOpen: boolean
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]]; 'update:pastOpen': [open: boolean] }>()

const TAG_DOOR: Record<AxisKey, string> = { load: 'tag do obciążenia', state: 'tag do stanu' }

const preview = ref<{ axis: AxisKey; value: number } | null>(null)
const active = ref<AxisKey | null>(null)
</script>

<style scoped>
.art {
  --art-track: 35rem;
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: 4.25rem;
}
.art__col {
  position: relative;
  display: grid;
  width: var(--art-track);
  max-width: 100%;
}
.art__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.art__head strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.art__disc {
  display: grid;
  place-items: center;
  width: 40px;
  height: 39px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-mist);
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-nested);
}
.art__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}

/* suwak pod znakiem; nazwa osi wisi z lewej, poza kolumną znaku */
.art__row {
  position: relative;
  margin-top: 12px;
}
.art__row + .art__row {
  margin-top: 2px;
}
.art__label {
  position: absolute;
  top: 0;
  right: calc(100% + 1rem);
  height: 1.75rem;
}

/* linia furtek: szersza niż znak, wyśrodkowana, zawija się spokojnie */
.art__tray {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 8px 1.75rem;
  width: min(100%, 56rem);
  margin-top: 20px;
}
.art__door {
  display: flex;
  align-items: flex-start;
  gap: var(--mg-space-2);
  min-width: 0;
}
.art__door > .aag {
  margin-top: 0.6rem;
}
.art__door > .aag--state {
  margin-top: 0.5rem;
}

/* historia: stopnie małych torów pod stopniami dużego znaku, daty wiszą z lewej */
.art__past {
  --ah-date: 3.25rem;
  --ah-gap: 9px;
  margin-top: 18px;
  margin-left: calc(-1 * var(--ah-date));
}
.art__past :deep(.ls-track) {
  width: auto;
  margin-inline: 1rem;
}
</style>
