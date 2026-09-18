<template>
  <header class="lens-bar">
    <div class="lens-bar__nav" role="group" aria-label="Nawigacja okresu">
      <button type="button" aria-label="Poprzedni okres" @click="emit('shift', -1)"><AppIcon name="chevron_left" /></button>
      <h1 class="lens-bar__title">{{ title }}</h1>
      <button type="button" aria-label="Następny okres" @click="emit('shift', 1)"><AppIcon name="chevron_right" /></button>
      <button v-if="!isToday" type="button" class="lens-bar__today" @click="emit('today')">Dziś</button>
    </div>

    <div v-if="scale" class="lens-bar__scale" role="group" aria-label="Skala kalendarza">
      <button
        v-for="item in SCALES"
        :key="item.id"
        type="button"
        :class="{ active: item.id === scale }"
        :aria-pressed="item.id === scale"
        @click="emit('scale', item.id)"
      >{{ item.label }}</button>
    </div>

    <div class="lens-bar__lens">
      <div class="lens-bar__chips" role="group" aria-label="Soczewka">
        <button
          v-for="item in LENSES"
          :key="item.id"
          type="button"
          class="lens-bar__chip"
          :class="{ active: item.id === lens }"
          :aria-pressed="item.id === lens"
          :title="item.label"
          @click="emit('lens', item.id)"
        >
          <AppIcon :name="item.icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>
      <p class="lens-bar__legend">{{ legend }}<span class="lens-bar__legend-ritual"><i class="done" /> refleksja · <i class="missing" /> brak · <i class="due" /> do zamknięcia</span></p>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { LENSES, SCALES, type CalendarScale, type LensId } from '~lab/lab/calendarConceptData'

const props = defineProps<{ title: string; lens: LensId; scale?: CalendarScale; isToday: boolean }>()
const emit = defineEmits<{ shift: [direction: -1 | 1]; today: []; scale: [scale: CalendarScale]; lens: [lens: LensId] }>()

const legend = computed(() => LENSES.find(item => item.id === props.lens)?.legend ?? '')
</script>

<style scoped>
.lens-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.2fr);
  align-items: center;
  gap: 14px;
  padding: 6px 4px 10px;
}
.lens-bar__nav { display: flex; align-items: center; gap: 4px; min-width: 0; }
.lens-bar__nav > button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 10px;
  color: rgb(var(--color-primary-strong));
  background: transparent;
  cursor: pointer;
}
.lens-bar__nav > button:hover { background: rgb(var(--sky-100)); }
.lens-bar__nav .material-symbols-outlined { font-size: 18px; }
.lens-bar__title { margin: 0 4px; font-size: 17px; font-weight: 800; letter-spacing: -.01em; color: rgb(var(--color-on-surface)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lens-bar__title::first-letter { text-transform: uppercase; }
.lens-bar__today { width: auto !important; padding: 0 9px; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; border: 1px solid rgb(var(--neo-border) / .3) !important; }

.lens-bar__scale { display: inline-flex; padding: 2px; border-radius: 999px; background: rgb(var(--color-surface-container) / .7); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12), inset -2px -2px 5px rgb(var(--neo-inset-light) / .6); }
.lens-bar__scale button { min-width: 62px; padding: 5px 10px; border: 0; border-radius: 999px; color: rgb(var(--color-on-surface-variant)); background: transparent; font-size: 10.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; }
.lens-bar__scale button.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--neo-surface-base)); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .8), 2px 2px 5px rgb(var(--neo-shadow-dark) / .18); }

.lens-bar__lens { display: grid; gap: 4px; justify-items: end; min-width: 0; }
.lens-bar__chips { display: inline-flex; gap: 3px; }
.lens-bar__chip { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px 0 6px; border: 1px solid transparent; border-radius: 999px; color: rgb(var(--color-on-surface-variant)); background: transparent; font-size: 10px; font-weight: 800; letter-spacing: .03em; cursor: pointer; }
.lens-bar__chip .material-symbols-outlined { font-size: 15px; }
.lens-bar__chip:hover { background: rgb(var(--sky-100) / .8); }
.lens-bar__chip.active { color: rgb(var(--color-primary-strong)); border-color: rgb(var(--neo-border) / .3); background: rgb(var(--neo-surface-base)); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .8), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.lens-bar__legend { display: flex; gap: 10px; margin: 0; padding-right: 6px; color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 700; letter-spacing: .02em; white-space: nowrap; }
.lens-bar__legend-ritual { display: inline-flex; align-items: center; gap: 3px; }
.lens-bar__legend-ritual i { display: inline-block; width: 5px; height: 5px; border-radius: 999px; }
.lens-bar__legend-ritual i.done { background: rgb(var(--sky-700)); }
.lens-bar__legend-ritual i.missing { box-shadow: inset 0 0 0 1.5px rgb(var(--rose-300)); }
.lens-bar__legend-ritual i.due { background: rgb(var(--sky-400)); box-shadow: 0 0 0 1.5px rgb(var(--sky-200)); }
</style>
