<template>
  <div class="ac-compass" :class="{ vertical }" role="group" aria-label="Kierunki miesiąca i fokus tygodnia" @mouseleave="emit('hover', null)">
    <button
      v-for="tile in tiles"
      :key="tile.key"
      type="button"
      class="ac-tile"
      :class="[`ac-tile--${tile.kind}`, tile.tone ? `ac-tile--tone-${tile.tone}` : '', { selected: selectedKey === tile.hoverKey }]"
      :title="tile.title"
      :aria-pressed="interactive ? selectedKey === tile.hoverKey : undefined"
      @click="interactive && emit('select', tile.hoverKey)"
      @mouseenter="emit('hover', tile.hoverKey)"
      @focus="emit('hover', tile.hoverKey)"
      @blur="emit('hover', null)"
    >
      <span class="ac-tile__icon"><AppIcon :name="tile.icon" /></span>
      <small>{{ tile.title }}</small>
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { CompassTile } from '~lab/lab/actionConceptData'

defineProps<{ tiles: CompassTile[]; vertical?: boolean; interactive?: boolean; selectedKey?: string | null }>()
const emit = defineEmits<{ hover: [key: string | null]; select: [key: string] }>()
</script>

<style scoped>
.ac-compass {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.ac-compass.vertical { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.ac-tile {
  display: grid;
  gap: 5px;
  justify-items: center;
  padding: 10px 6px 8px;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 17px 20px 16px 19px;
  color: inherit;
  background: rgb(var(--color-surface-container) / .55);
  cursor: pointer;
  text-align: center;
  transition: box-shadow .22s ease, background .2s ease, transform .16s ease;
}
.ac-tile:hover { background: rgb(var(--sky-100) / .8); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .6), 3px 3px 7px rgb(var(--neo-shadow-dark) / .16); }
.ac-tile:active { transform: scale(.985); }

.ac-tile__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .6);
}
.ac-tile__icon .material-symbols-outlined { font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 480, 'GRAD' 60, 'opsz' 24; }

.ac-tile--tone-blue .ac-tile__icon { background: rgb(var(--sky-200) / .75); }
.ac-tile--tone-lavender .ac-tile__icon { color: rgb(var(--lavender-700, 110 95 185)); background: rgb(var(--lavender-200, 214 205 244) / .7); }
/* paleta Today: bez zieleni i bursztynu — mint → róż, amber → czerwień (jak na planszy fokusu) */
.ac-tile--tone-mint .ac-tile__icon { color: rgb(var(--rose-700, 170 60 95)); background: rgb(var(--rose-200, 250 214 226) / .8); }
.ac-tile--tone-amber .ac-tile__icon { color: rgb(var(--color-error)); background: rgb(var(--color-error) / .14); }

.ac-tile--focus .ac-tile__icon {
  border-radius: 15px 18px 14px 17px;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--color-surface-container) / .9);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .5), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12);
}

.ac-tile small {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 100%;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .02em;
  line-height: 1.25;
}
.ac-tile.selected { outline: 1px solid rgb(var(--sky-500) / .6); outline-offset: -1px; background: rgb(var(--sky-100) / .65); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .65), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .18); }
.ac-tile:focus-visible { outline: 2px solid rgb(var(--sky-600)); outline-offset: 2px; }
</style>
