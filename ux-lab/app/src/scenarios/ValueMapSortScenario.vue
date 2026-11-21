<template>
  <section class="scenario-page vms-scenario" :class="{ 'vms-scenario--preview': standalone }">
    <header class="vms-heading">
      <div>
        <h1>Mapa wartości</h1>
        <p>Krok 2 z 8 · Sortowanie</p>
      </div>
      <RouterLink
        v-if="!standalone"
        class="vms-text-action"
        :to="{ path: '/preview/value-map-sort', query: { variant, preset } }"
      >Podgląd 1:1 ↗</RouterLink>
    </header>

    <div class="vms-toolbar">
      <div class="vms-variants" role="group" aria-label="Układy sortowania">
        <button
          v-for="option in variants"
          :key="option.id"
          class="vms-control"
          type="button"
          :aria-pressed="variant === option.id"
          @click="setQuery({ variant: option.id })"
        >{{ option.label }}</button>
      </div>
      <div class="vms-presets">
        <select
          class="vms-control"
          aria-label="Przykładowy etap sortowania"
          :value="preset"
          @change="setQuery({ preset: ($event.target as HTMLSelectElement).value })"
        >
          <option value="start">Początek</option>
          <option value="mid">W trakcie</option>
          <option value="end">Końcówka</option>
        </select>
        <button class="vms-text-action" type="button" @click="resetKey += 1">Resetuj próbę</button>
      </div>
    </div>

    <ValueMapSortBoard :variant="variant" :preset="preset" :reset-key="resetKey" />

    <template v-if="!standalone">
      <div class="vms-variant-note">
        <h2>{{ currentVariant.label }}</h2>
        <p>{{ currentVariant.note }}</p>
      </div>
      <details class="vms-baseline">
        <summary>Zobacz obecny krok 2</summary>
        <img
          src="/research/current/exercises/value-map-sort-2026-11-21.png"
          alt="Obecny krok sortowania z osobnym panelem instrukcji, pięcioma wysokimi kolumnami i kartami u dołu."
        />
      </details>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ValueMapSortBoard from '~lab/experiments/ValueMapSortBoard.vue'
import type { SortPreset } from '~lab/lab/valueMapSort'

const variants = [
  { id: 'a', label: 'Stosy', note: 'Grupa rośnie wraz z pierwszymi kartami. Krótkie stosy dobrze pokazują różnicę między pustą i pełną grupą, a pozostałe karty otworzysz licznikiem „+n”.' },
  { id: 'b', label: 'Rzędy', note: 'Każda grupa ma własny rząd. Najnowsze karty są przy nazwie grupy, więc można szybko porównać, co trafiło do sąsiednich grup.' },
  { id: 'c', label: 'Cele i podgląd', note: 'Pięć celów zachowuje ten sam rozmiar. Kliknij grupę, żeby przejrzeć wszystkie jej karty obok celów i przenieść dowolną z nich do innej grupy.' },
] as const

const route = useRoute()
const router = useRouter()
const standalone = computed(() => route.meta.standalone)
const resetKey = ref(0)
const currentVariant = computed(() => variants.find(option => option.id === route.query.variant) ?? variants[0])
const variant = computed(() => currentVariant.value.id)
const preset = computed<SortPreset>(() => route.query.preset === 'mid' || route.query.preset === 'end' ? route.query.preset : 'start')

function setQuery(query: Record<string, string>) {
  void router.replace({ query: { ...route.query, ...query } })
}
</script>

<style>
.vms-scenario {
  max-width: 1100px;
  color: var(--mg-color-ink);
  font-family: var(--mg-font-sans);
}

.vms-scenario--preview { width: min(calc(100% - 24px), 1100px); padding-block: 16px; }
.vms-heading {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-end;
  margin-bottom: 10px;
}
.vms-heading h1 { font-size: clamp(1.2rem, 2vw, 1.8rem); line-height: 1.1; font-weight: 850; }
.vms-heading p { margin-top: 3px; font-size: .8125rem; color: var(--mg-color-muted); }

.vms-toolbar, .vms-variants, .vms-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}
.vms-toolbar { justify-content: space-between; margin-bottom: 10px; }
.vms-control {
  min-height: 30px;
  padding: 3px 9px;
  border: 1px solid var(--mg-color-field-border);
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-mist);
  color: var(--mg-color-ink);
  font-size: .8125rem;
  font-weight: 700;
}
.vms-control:hover { background: var(--mg-color-paper); }
.vms-control[aria-pressed="true"] {
  border-color: var(--mg-color-focus);
  background: var(--mg-color-paper);
}
.vms-control:disabled { opacity: .5; }
.vms-scenario :is(button, select, a, summary):focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 1px;
}

.vms-variant-note, .vms-baseline {
  margin-top: 15px;
  color: var(--mg-color-muted);
  font-size: .875rem;
}
.vms-variant-note h2, .vms-baseline summary {
  color: var(--mg-color-ink);
  font-weight: 800;
}
.vms-baseline summary { cursor: pointer; }
.vms-baseline img { margin-top: 10px; border-radius: var(--mg-radius-lg); }
</style>
