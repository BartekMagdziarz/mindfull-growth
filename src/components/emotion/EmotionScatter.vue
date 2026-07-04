<!--
  EmotionScatter — pole scatter emocji (walencja × energia) wyjęte z dawnego
  poziomu 3 EmotionSelectora podczas przebudowy pickera na rozwijanie rodzin
  w miejscu (2026-07). OBECNIE NIEUŻYWANY — zachowany świadomie: docelowo ma
  dostać nowe zastosowanie jako mapa/eksploracja krajobrazu emocji (nie picker).

  API (sterowane propsami, bez własnej nawigacji):
    - :quadrant        → ćwiartka, której emocje pokazujemy (wymagane)
    - v-model          → tablica ID wybranych emocji (string[])
    - :filter-families → ID rodzin do wyróżnienia; pozostałe kropki są wygaszane

  Emocje leżą na ciągłych współrzędnych scatter (getScatterCoord) z relaksacją
  minimalnego dystansu (SPREAD), twarze kluczowane ID emocji (działa w EN i PL).
-->
<template>
  <div class="emotion-scatter">
    <div class="scatter-field" @pointerleave="hoveredId = null">
      <span class="axis axis--top">{{ t('emotionViews.selector.axes.moreEnergy') }} ▲</span>
      <span class="axis axis--bottom">▼ {{ t('emotionViews.selector.axes.lessEnergy') }}</span>
      <span class="axis axis--left">◀ {{ t('emotionViews.selector.axes.moreUnpleasant') }}</span>
      <span class="axis axis--right">{{ t('emotionViews.selector.axes.lessUnpleasant') }} ▶</span>

      <template v-if="visibleEmotions.length">
        <button
          v-for="e in visibleEmotions"
          :key="e.id"
          type="button"
          class="dot"
          :class="{
            'dot--hovered': hoveredId === e.id,
            'dot--selected': isSelected(e.id),
            'dot--muted': isMuted(e),
          }"
          :style="dotStyle(e)"
          :data-testid="`emotion-option-${e.id}`"
          :title="e.name"
          :aria-label="e.name"
          :aria-pressed="isSelected(e.id)"
          @pointerenter="hoveredId = e.id"
          @focus="hoveredId = e.id"
          @click="toggleEmotion(e.id)"
        >
          <EmotionFaceIcon class="dot__icon" :id="e.id" :color="emotionInk(e)" :size="28" />
          <span v-if="labelVisible(e)" class="dot__label" :style="labelStyle(e)">{{ e.name }}</span>
        </button>
      </template>

      <p v-else class="empty">{{ t('emotionViews.selector.noEmotionsInQuadrant') }}</p>
    </div>

    <div class="emotion-description-strip">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        leave-active-class="transition-opacity duration-150 ease-in"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        mode="out-in"
      >
        <span v-if="hoveredEmotion" :key="hoveredEmotion.id">
          <span class="font-semibold">{{ hoveredEmotion.name }}</span>
          <template v-if="hoveredEmotion.description">
            <span class="mx-1.5 text-on-surface-variant/40">&mdash;</span>
            <span class="text-on-surface-variant">{{ hoveredEmotion.description }}</span>
          </template>
        </span>
        <span v-else>{{ t('emotionViews.selector.scatterHint') }}</span>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useT } from '@/composables/useT'
import { getQuadrant, type Quadrant, type Emotion } from '@/domain/emotion'
import { FAMILY_OF } from '@/domain/emotionFamily'
import { useEmotionStore } from '@/stores/emotion.store'
import EmotionFaceIcon from '@/components/emotion/EmotionFaceIcon.vue'

interface Props {
  quadrant: Quadrant
  modelValue?: string[]
  // Rodziny wyróżnione: kropki spoza nich są wygaszane (dawny filtr rodzin).
  filterFamilies?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  filterFamilies: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const emotionStore = useEmotionStore()
const { t } = useT()

// Rozsunięcie kropek — min. dystans w znormalizowanym polu 0–1 (wartość 0.150
// ze strojenia w prototypie). Jedna stała → identyczne rozproszenie wszędzie.
const SPREAD = 0.15
const SHOW_ANCHOR_LABELS = true

const hoveredId = ref<string | null>(null)

const visibleEmotions = computed<Emotion[]>(() =>
  emotionStore.getEmotionsByQuadrant(props.quadrant)
)

const filterFamilySet = computed(() => new Set(props.filterFamilies))

const hoveredEmotion = computed(() =>
  hoveredId.value ? (emotionStore.getEmotionById(hoveredId.value) ?? null) : null
)

function isSelected(id: string): boolean {
  return props.modelValue.includes(id)
}
function toggleEmotion(id: string): void {
  const next = isSelected(id)
    ? props.modelValue.filter((x) => x !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}

function isInSelectedFamily(e: Emotion): boolean {
  return filterFamilySet.value.has(FAMILY_OF[e.id])
}
function isMuted(e: Emotion): boolean {
  if (filterFamilySet.value.size === 0) return false
  if (isSelected(e.id) || hoveredId.value === e.id) return false
  return !isInSelectedFamily(e)
}

// --- Styl ćwiartek (lokalna kopia z EmotionSelector — komponent samodzielny) ---
function gradients(q: Quadrant) {
  const v = (suffix: string) => `var(--color-quadrant-${q}-${suffix})`
  return {
    backgroundGradient: `linear-gradient(145deg, ${v('top')}, ${v('bottom')})`,
    softGradient: `linear-gradient(145deg, ${v('tint-soft')}, ${v('tint')})`,
    discGradient: `linear-gradient(145deg, #ffffff, ${v('tint-soft')})`,
    discShadow: `color-mix(in srgb, ${v('border')} 42%, transparent)`,
    discShadowStrong: `color-mix(in srgb, ${v('border')} 50%, transparent)`,
    textColor: v('text'),
    borderColor: v('border'),
  }
}
const quadrantButtonStyles: Record<Quadrant, ReturnType<typeof gradients>> = {
  'high-energy-high-pleasantness': gradients('high-energy-high-pleasantness'),
  'high-energy-low-pleasantness': gradients('high-energy-low-pleasantness'),
  'low-energy-high-pleasantness': gradients('low-energy-high-pleasantness'),
  'low-energy-low-pleasantness': gradients('low-energy-low-pleasantness'),
}

function quadrantInkVar(q: Quadrant): string {
  return `var(--color-quadrant-${q}-text)`
}
function emotionInk(e: Emotion): string {
  if (filterFamilySet.value.size > 0 && !isInSelectedFamily(e)) return '#9aa6b8'
  return quadrantInkVar(getQuadrant(e))
}
function labelStyle(e: Emotion): Record<string, string> {
  const s = quadrantButtonStyles[props.quadrant]
  const sel = isSelected(e.id)
  return {
    background: sel ? s.backgroundGradient : s.softGradient,
    color: s.textColor,
    borderColor: s.borderColor,
  }
}

// --- Rozmieszczenie scatter (anchored relaxation), współrzędne ze sklepu ---
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
function coordOf(e: Emotion): { pleasantness: number; energy: number } {
  const c = emotionStore.getScatterCoord(e.id)
  return c ? { pleasantness: c.pleasantness, energy: c.energy } : { pleasantness: e.pleasantness, energy: e.energy }
}
function anchorXY(e: Emotion): { x: number; y: number } {
  const { pleasantness, energy } = coordOf(e)
  const x = pleasantness <= 6 ? (pleasantness - 1) / 5 : (pleasantness - 6) / 6
  const y = energy > 6 ? (12 - energy) / 6 : (6 - energy) / 5
  return { x: clamp01(x), y: clamp01(y) }
}
const relaxedPositions = computed(() => {
  const items = visibleEmotions.value
  const anchors = items.map(anchorXY)
  const pts = anchors.map((a, i) => ({
    x: a.x + Math.cos(i * 2.3999632) * 0.0015,
    y: a.y + Math.sin(i * 2.3999632) * 0.0015,
  }))
  const md = SPREAD
  if (md > 0) {
    for (let iter = 0; iter < 90; iter++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[j].x - pts[i].x
          const dy = pts[j].y - pts[i].y
          const d = Math.hypot(dx, dy) || 0.0001
          if (d < md) {
            const push = (md - d) / 2
            const ux = dx / d
            const uy = dy / d
            pts[i].x -= ux * push
            pts[i].y -= uy * push
            pts[j].x += ux * push
            pts[j].y += uy * push
          }
        }
      }
      for (let i = 0; i < pts.length; i++) {
        pts[i].x += (anchors[i].x - pts[i].x) * 0.08
        pts[i].y += (anchors[i].y - pts[i].y) * 0.08
        pts[i].x = clamp01(pts[i].x)
        pts[i].y = clamp01(pts[i].y)
      }
    }
  }
  const map = new Map<string, { left: string; top: string }>()
  items.forEach((e, i) => {
    map.set(e.id, { left: `${6 + pts[i].x * 88}%`, top: `${6 + pts[i].y * 88}%` })
  })
  return map
})
function dotStyle(e: Emotion): Record<string, string> {
  const pos = relaxedPositions.value.get(e.id) ?? { left: '50%', top: '50%' }
  // Krążek twarzy w kolorze ćwiartki emocji (biel → tint-soft): jaśniejszy od
  // tła pola, ale w tym samym odcieniu. Cienie analogicznie (zamiast szarych).
  const s = quadrantButtonStyles[getQuadrant(e)]
  return {
    ...pos,
    '--disc': s.discGradient,
    '--disc-shadow': s.discShadow,
    '--disc-shadow-strong': s.discShadowStrong,
  }
}
function labelVisible(e: Emotion): boolean {
  if (hoveredId.value === e.id || isSelected(e.id)) return true
  if (filterFamilySet.value.size > 0) return isInSelectedFamily(e)
  const coord = emotionStore.getScatterCoord(e.id)
  return SHOW_ANCHOR_LABELS && !!coord?.anchor
}

onMounted(async () => {
  if (!emotionStore.isLoaded) await emotionStore.loadEmotions()
})
</script>

<style scoped>
.scatter-field {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 18px;
  border: 1px solid rgb(255 255 255 / 0.4);
  overflow: hidden;
  background: rgb(255 255 255 / 0.22);
  box-shadow: inset 0 1px 4px rgb(0 0 0 / 0.08);
}
.axis {
  position: absolute;
  font-size: 10px;
  letter-spacing: 0.03em;
  color: rgb(0 0 0 / 0.45);
  pointer-events: none;
  user-select: none;
}
.axis--top { top: 6px; left: 50%; transform: translateX(-50%); }
.axis--bottom { bottom: 6px; left: 50%; transform: translateX(-50%); }
.axis--left { left: 8px; top: 50%; transform: translateY(-50%) rotate(180deg); writing-mode: vertical-rl; }
.axis--right { right: 8px; top: 50%; transform: translateY(-50%); writing-mode: vertical-rl; }

.dot {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: transform 120ms ease;
  z-index: 1;
}
.dot:focus-visible {
  outline: none;
}
.dot:focus-visible .dot__icon {
  box-shadow: 0 0 0 2px rgb(var(--color-focus));
  border-radius: 50%;
}
.dot__icon {
  line-height: 1;
  transition: transform 150ms ease, opacity 150ms ease;
}
.dot__label {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  padding: 1px 7px;
  border-radius: 8px;
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgb(90 130 180 / 0.22);
}
.dot--muted {
  z-index: 0;
}
.dot--muted .dot__icon {
  transform: scale(0.62);
  opacity: 0.4;
}
.dot--hovered,
.dot--selected {
  z-index: 10;
}
.dot--hovered .dot__icon {
  transform: scale(1.55);
  opacity: 1;
}
.dot--selected .dot__icon {
  transform: scale(1.35);
  opacity: 1;
  box-shadow:
    -4px -4px 8px rgba(255, 255, 255, 0.95),
    4px 4px 9px var(--disc-shadow-strong, rgba(120, 150, 190, 0.5)),
    inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  font-size: 14px;
  color: rgb(0 0 0 / 0.55);
}

.emotion-description-strip {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  color: rgb(var(--neo-text));
  background: rgb(255 255 255 / 0.55);
  border: 1px solid rgb(var(--neo-border) / 0.12);
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.6),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.18);
}

@media (prefers-reduced-motion: reduce) {
  .dot,
  .dot__icon {
    transition: none;
  }
}
</style>
