<template>
  <!-- zapis = kropka aplikacji z kropką (zrobione), sam plan = pusta kropka, brak = kreska -->
  <i
    class="ev-mark"
    :class="[`ev-mark--${presence}`, WELL[presence]]"
    :aria-label="label"
    :title="label"
    role="img"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { presenceLabel, type Presence } from './rhythmProjections'

const props = defineProps<{ presence: Presence; label?: string }>()
const label = computed(() => props.label ?? presenceLabel(props.presence))

const WELL: Record<Presence, string> = {
  recorded: 'mg-well mg-well--done mg-well--xs',
  'planned-only': 'mg-well mg-well--xs',
  empty: '',
}
</script>

<style scoped>
.ev-mark {
  display: inline-block;
  flex: none;
  box-sizing: border-box;
}
.ev-mark--empty {
  width: 14px;
  height: 2px;
  border-radius: var(--mg-radius-sketch-a);
  background: var(--cp-muted-line);
}
</style>
