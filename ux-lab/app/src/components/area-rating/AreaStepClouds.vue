<template>
  <section class="arc">
    <div class="arc__col">
      <header class="arc__head">
        <span class="arc__disc"><AppIcon :name="area.icon" /></span>
        <strong>{{ area.label }}</strong>
      </header>

      <AreaMarkStage :draft="draft" :subject="`${area.label} · ten tydzień`" :preview="preview" :active="active" @rate="(axis, value) => emit('rate', axis, value)" @active="active = $event" />

      <!-- dwie chmury obok siebie: każda oś ma swój suwak i swoje tagi -->
      <div class="arc__pair">
        <div v-for="axis in AXES" :key="axis" class="arc__cloud" :class="{ 'is-waking': active === axis }" @pointerenter="active = axis" @pointerleave="active = null">
          <AreaAxisLabel :axis="axis" :load="draft.load" :state="draft.state" :hint="area[axis].hint" />
          <AreaAxisSlider
            :axis="axis"
            :load="draft.load"
            :state="draft.state"
            :low="area[axis].low"
            :high="area[axis].high"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            @rate="emit('rate', axis, $event)"
            @preview="preview = $event == null ? null : { axis, value: $event }"
          />
          <AreaTagLine
            class="arc__tags"
            :model-value="draft.tags[axis]"
            :suggestions="suggestions[axis]"
            :label="`${area.label} · ${AXIS_TITLE[axis]}`"
            @update:model-value="emit('tags', axis, $event)"
          />
        </div>
      </div>

      <template v-if="past.length">
        <AreaPastToggle class="arc__fold" :open="pastOpen" @update:open="emit('update:pastOpen', $event)" />
        <AreaHistory v-if="pastOpen" class="arc__past" :weeks="past" :subject="area.label" size="sm" newest-first />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaAxisLabel from './AreaAxisLabel.vue'
import AreaAxisSlider from './AreaAxisSlider.vue'
import AreaHistory from './AreaHistory.vue'
import AreaMarkStage from './AreaMarkStage.vue'
import AreaPastToggle from './AreaPastToggle.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * Runda 4 · I „Dwie chmury obok siebie”. Pod znakiem stoją dwie równe chmury:
 * obciążenie z lewej, stan z prawej. Każda zbiera wszystko, co dotyczy jej
 * osi — nazwę ze znaczkiem, suwak, słowa końców skali, tagi — więc tag nie
 * może trafić do złej oceny. Suwak jest krótszy niż znak; związek trzymają
 * znaczek osi, kolor pary i budzenie elementu na znaku pod kursorem.
 */
defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  suggestions: Record<AxisKey, string[]>
  pastOpen: boolean
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]]; 'update:pastOpen': [open: boolean] }>()

const preview = ref<{ axis: AxisKey; value: number } | null>(null)
const active = ref<AxisKey | null>(null)
</script>

<style scoped>
.arc {
  display: grid;
  justify-items: center;
  align-content: start;
  padding-top: 3.25rem;
}
.arc__col {
  display: grid;
  width: 42rem;
  max-width: 100%;
}
.arc__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.arc__head strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.arc__disc {
  display: grid;
  place-items: center;
  width: 40px;
  height: 39px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-mist);
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-nested);
}
.arc__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}

.arc__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}
/* chmura osi: mgła na karcie, połowa cienia karty */
.arc__cloud {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 16px 20px 14px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.arc__tags {
  margin-top: -4px;
}

.arc__fold {
  justify-self: center;
  margin-top: 12px;
}
.arc__past {
  --ah-date: 3.25rem;
  --ah-gap: 9px;
  margin-top: 8px;
  margin-left: calc(-1 * var(--ah-date));
}
.arc__past :deep(.ls-track) {
  width: auto;
  margin-inline: 1rem;
}
</style>
