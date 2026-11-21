<template>
  <div class="quiet-ritual mg-design-v2">
    <header class="qr-top">
      <button type="button" class="qr-icon" aria-label="Zamknij rytuał"><AppIcon name="close" /></button>
      <span>Refleksja tygodnia <b>·</b> 9–15 listopada 2026</span>
      <span class="qr-save" role="status"><AppIcon name="check" />Szkic w Labie</span>
    </header>
    <div class="qr-card">
      <header class="qr-heading">
        <h1>{{ question }}</h1>
      </header>
      <slot />
      <footer class="qr-footer">
        <button type="button" class="qr-icon qr-arrow" aria-label="Poprzedni krok"><AppIcon name="arrow_back" /></button>
        <nav aria-label="Etapy rytuału">
          <div class="qr-progress">
            <button v-for="(step, index) in steps" :key="step" type="button" :class="{ active: index === current }" :aria-label="`${index + 1}. ${step}`" :title="step"><i /></button>
          </div>
          <span>{{ current + 1 }}/{{ steps.length }} · {{ steps[current] }}</span>
        </nav>
        <button type="button" class="qr-icon qr-arrow qr-arrow--next" aria-label="Następny krok"><AppIcon name="arrow_forward" /></button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import '@product/features/quiet-ritual/quiet-ritual.css'

/**
 * Rama kroku z `QuietRitualShell` (pasek, karta 1120 px, pytanie, stopka z
 * kropkami) na stylach produktu. Replika, bo powłoka produktu ciągnie zaproszenie
 * do zamknięcia celu, a z nim store'y. Strzałki i kropki są tu nieme.
 */
defineProps<{ question: string; steps: readonly string[]; current: number }>()
</script>
