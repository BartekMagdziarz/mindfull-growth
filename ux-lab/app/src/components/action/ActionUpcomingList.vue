<template>
  <div class="ac-upcoming">
    <h3>Najbliżej</h3>
    <div class="ac-upcoming__list">
      <article v-for="entry in entries" :key="entry.key" class="ac-upcoming__row" :class="`kind-${entry.kind}`">
        <span class="ac-upcoming__icon"><AppIcon :name="entry.icon" /></span>
        <strong :title="entry.title">{{ entry.title }}</strong>
        <em>{{ entry.dateLabel }}</em>
      </article>
      <p v-if="!entries.length" class="ac-upcoming__empty">Nic pilnego</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { upcomingEntries } from '~lab/lab/actionConceptData'
import { useLabStore } from '~lab/stores/lab.store'

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 5 })
const labStore = useLabStore()
const entries = computed(() => upcomingEntries(labStore.fixture).slice(0, props.limit))
</script>

<style scoped>
.ac-upcoming { display: grid; gap: 6px; }
.ac-upcoming h3 { margin: 0; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.ac-upcoming__list { display: grid; }
.ac-upcoming__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 30px;
  border-bottom: 1px solid rgb(var(--neo-border) / .12);
}
.ac-upcoming__row:last-child { border-bottom-color: transparent; }
.ac-upcoming__icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%;
  color: rgb(var(--color-on-surface) / .8);
  background: rgb(var(--neo-border) / .16);
}
.kind-ritual .ac-upcoming__icon { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-200) / .6); }
.ac-upcoming__icon .material-symbols-outlined { font-size: 13px; }
.ac-upcoming__row strong { overflow: hidden; font-size: 9.5px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.ac-upcoming__row em { color: rgb(var(--neo-muted)); font-size: 8.5px; font-style: normal; font-weight: 800; white-space: nowrap; }
.ac-upcoming__empty { margin: 0; color: rgb(var(--neo-muted)); font-size: 9.5px; }
</style>
