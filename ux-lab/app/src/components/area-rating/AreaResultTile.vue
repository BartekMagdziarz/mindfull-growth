<template>
  <div class="artl">
    <header class="artl__head">
      <span class="artl__disc"><AppIcon :name="area.icon" /></span>
      <strong>{{ area.label }}</strong>
      <AreaPastToggle v-if="past.length" class="artl__fold" :open="pastOpen" @update:open="emit('update:pastOpen', $event)" />
    </header>
    <div class="artl__now">
      <small v-if="pastOpen && past.length" class="artl__date">{{ currentLabel }}</small>
      <AreaMarkStage :draft="draft" :subject="`${area.label} · ten tydzień`" :preview="preview" :active="active" @rate="(axis, value) => emit('rate', axis, value)" @active="emit('active', $event)" />
    </div>
    <AreaHistory v-if="pastOpen && past.length" class="artl__past" :weeks="past" :subject="area.label" size="sm" newest-first />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { AreaDef, AreaDraft, AxisKey, PastWeek } from '~lab/lab/areaRatingStep'
import AreaHistory from './AreaHistory.vue'
import AreaMarkStage from './AreaMarkStage.vue'
import AreaPastToggle from './AreaPastToggle.vue'

/**
 * Kafel wyniku (runda 4 J, zaakceptowany przez usera 22.11): kafel obszaru z
 * kalendarza w dużym rozmiarze — ikona, nazwa, „Minione tygodnie” i żywy znak
 * tygodnia. Historia rozwija się w tym samym kaflu, od razu pod znakiem, na
 * jego skali; daty wiszą w marginesie kafla (`--artl-pad`).
 */
defineProps<{
  area: AreaDef
  draft: AreaDraft
  past: PastWeek[]
  currentLabel: string
  pastOpen: boolean
  preview: { axis: AxisKey; value: number } | null
  active: AxisKey | null
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; 'update:pastOpen': [open: boolean]; active: [axis: AxisKey | null] }>()
</script>

<style scoped>
.artl {
  --artl-pad: 2.5rem;
  display: grid;
  min-width: 0;
  padding: 16px var(--artl-pad) 20px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.artl__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.artl__head strong {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
}
.artl__fold {
  margin-left: auto;
}
.artl__disc {
  display: grid;
  place-items: center;
  width: 40px;
  height: 39px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-veil-strong);
  color: var(--mg-color-primary-strong);
}
.artl__disc :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-lg);
}
.artl__now {
  position: relative;
}
/* data bieżącego tygodnia pojawia się razem z historią, w marginesie kafla */
.artl__date {
  position: absolute;
  top: 50%;
  right: calc(100% + 6px);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
  translate: 0 -50%;
  white-space: nowrap;
}
.artl__past {
  --ah-date: 0px;
  --ah-gap: 9px;
  margin-top: 14px;
}
.artl__past :deep(li) {
  position: relative;
  grid-template-columns: minmax(0, 1fr);
}
.artl__past :deep(small) {
  position: absolute;
  right: calc(100% - 1rem + 6px);
}
.artl__past :deep(.ls-track) {
  width: auto;
  margin-inline: 1rem;
}
</style>
