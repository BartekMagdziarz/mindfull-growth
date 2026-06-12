<!--
  EmotionFaceIcon — neumorficzna ikonka emocji (PROTOTYP).

  Minimalistyczna twarz-linia (z emotionFace.ts, BEZ obrysu głowy) osadzona na
  miękkim, wypukłym krążku neumorficznym — granicę twarzy daje sam krążek.
  Port domyślnego trybu z projektu "Ikony emocji" (Claude Design): .neuchip.
  Kolor kreski = atrament ćwiartki (prop `color`).

  Krążek przebarwia się przez dziedziczone zmienne CSS (ustawiane na rodzicu):
    --disc        — tło krążka (gradient w kolorze ćwiartki)
    --disc-shadow — ciemna połowa cienia neumorficznego
  Bez nich obowiązuje neutralny błękitno-szary fallback.
-->
<template>
  <span class="neuface" :style="discStyle" aria-hidden="true" v-html="svg" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildFaceSvg, buildFaceSvgById } from './emotionFace'

// Twarz można wskazać po ID emocji (zalecane — niezależne od języka) albo po
// polskiej nazwie (używane dla emocji reprezentatywnej rodziny, `family.rep`).
const props = withDefaults(
  defineProps<{ id?: string; name?: string; color: string; size?: number }>(),
  { size: 28 }
)

// kreska rysowana jako currentColor — kolor (hex LUB zmienna CSS motywu)
// dostarcza wrapper przez `color`, więc działa z tokenami --color-quadrant-*.
const svg = computed(() =>
  props.id != null
    ? buildFaceSvgById(props.id, 'currentColor', props.size)
    : buildFaceSvg(props.name ?? '', 'currentColor', props.size)
)

// krążek jest nieco większy od samej twarzy (jak size+ w designie)
const discStyle = computed(() => {
  const d = props.size + 10
  return { width: `${d}px`, height: `${d}px`, color: props.color }
})
</script>

<style scoped>
.neuface {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--disc, linear-gradient(145deg, #f1f6fc, #dde6f1));
  box-shadow:
    -3px -3px 6px rgba(255, 255, 255, 0.92),
    3px 3px 7px var(--disc-shadow, rgba(120, 150, 190, 0.42)),
    inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.neuface :deep(svg) {
  display: block;
  filter: drop-shadow(0 0.6px 0.4px rgba(255, 255, 255, 0.7));
}
</style>
