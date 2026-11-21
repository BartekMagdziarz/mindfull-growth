<template>
  <section class="asa">
    <div class="qr-bars asa__bars">
      <QuietRatingBar
        v-for="axis in AXES"
        :key="axis"
        :model-value="draft[axis]"
        :label="AXIS_TITLE[axis]"
        :hint="area[axis].hint"
        :high-label="area[axis].high"
        :low-label="area[axis].low"
        :fill-color="tone?.mark ?? null"
        @update:model-value="emit('rate', axis, $event)"
      >
        <AreaTagLine
          class="asa__tags"
          center
          :model-value="draft.tags[axis]"
          :suggestions="suggestions[axis]"
          :label="`${area.label} · ${AXIS_TITLE[axis]}`"
          @update:model-value="emit('tags', axis, $event)"
        />
      </QuietRatingBar>
    </div>
    <!-- historia jako dodatek: wąska kolumna bez własnego pola, ostatni wiersz = ten tydzień -->
    <aside class="asa__side" :aria-label="`${area.label}: ostatnie tygodnie`">
      <header><AppIcon :name="area.icon" /><span>{{ area.label }}</span></header>
      <AreaHistory :weeks="past" :subject="area.label" :current="{ label: currentLabel, load: draft.load, state: draft.state }" size="sm" />
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { loadStateTone } from '@product/domain/loadStateTone'
import QuietRatingBar from '@product/features/quiet-ritual/QuietRatingBar.vue'
import { AXES, AXIS_TITLE, type AreaDef, type AreaDraft, type AxisKey, type PastWeek } from '~lab/lab/areaRatingStep'
import AreaHistory from './AreaHistory.vue'
import AreaTagLine from './AreaTagLine.vue'

/**
 * A · „Słupki najpierw”. Kontrolka z produktu (`QuietRatingBar` →
 * `DsRatingStack`) bez zmian; zmienia się kolejność: oceny na górze, historia
 * obok. Oba słupki biorą kolor pary, gdy obie oceny są ustawione.
 */
const props = defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  currentLabel: string
  suggestions: Record<AxisKey, string[]>
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; tags: [axis: AxisKey, tags: string[]] }>()

const tone = computed(() => loadStateTone(props.draft.load, props.draft.state))
</script>

<style scoped>
.asa {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem;
  align-items: center;
  align-content: start;
  gap: 34px;
  width: min(100%, 900px);
  margin: 0 auto;
}
.asa__bars :deep(.qr-axis) {
  box-shadow: var(--mg-shadow-nested);
}
.asa__tags {
  margin-top: var(--mg-space-3);
}
.asa__side {
  display: grid;
  gap: var(--mg-space-3);
  min-width: 0;
}
.asa__side > header {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
}
.asa__side > header :deep(.app-icon) {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-icon-md);
}
</style>
