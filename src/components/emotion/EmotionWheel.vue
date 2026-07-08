<!--
  EmotionWheel — koło emocji: promień = emocja, pierścień = natężenie 1–5.

  Dwa poziomy: przegląd ćwiartek (wedge'e koła, plakietki z liczbą wyborów)
  → wachlarz ~140° z promieniami ćwiartki (wybrzuszenie do góry, natężenie
  rośnie od środka). Klik kółka = (emocja, natężenie) — radio w obrębie
  promienia; klik etykiety = emocja bez natężenia (dziedzic family-only).
  Fallbacki „Nie wiem, co czuję" / „Inne…" celowo NA DOLE (to nie są główne
  ścieżki); na razie emitują 'fallback' i pokazują komunikat „wkrótce".

  v-model  — EmotionSelection[] (promień + opcjonalne natężenie)
  v-model:quadrant — aktywna ćwiartka (null = przegląd); parent używa jej
  do barwienia karty (getQuadrantTintStyle), jak przy EmotionSelector.

  Spec + mockup: ideas/html-plans/2026-07-06-emotion-wheel-gew.html
-->
<template>
  <div class="ew-root" @keydown.esc.stop="closeFan">
    <!-- Rząd tytułu + chipy wyborów (wzorzec label-prop z EmotionSelector) -->
    <div v-if="label || chips.length > 0" class="mb-3 flex flex-wrap items-center gap-2">
      <p v-if="label" class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {{ label }}
      </p>
      <div v-if="chips.length > 0" role="list" class="flex flex-wrap items-center gap-2">
        <span
          v-for="chip in chips"
          :key="chip.id"
          role="listitem"
          class="ew-chip"
          :class="{ 'ew-chip--noint': chip.intensity == null }"
          :style="chip.style"
        >
          {{ chip.name }}<template v-if="chip.intensity != null"> · {{ chip.intensity }}/5</template>
          <button
            type="button"
            class="ew-chip__x neo-focus"
            :aria-label="t('emotionWheel.ui.removeSelection', { name: chip.name })"
            @click="removeSelection(chip.id)"
          >✕</button>
        </span>
      </div>
    </div>

    <svg
      class="ew-svg"
      :viewBox="activeSpokes ? '0 0 1000 640' : '0 0 1000 810'"
      role="group"
      :aria-label="label ?? t('emotionWheel.ui.chooseQuadrant')"
    >
      <!-- ===== Poziom 1: przegląd ćwiartek (pełne 90°, exploded) ===== -->
      <g v-if="!activeSpokes">
        <g
          v-for="w in wedges"
          :key="w.quadrant"
          class="ew-wedge"
          role="button"
          tabindex="0"
          :transform="w.transform"
          :data-testid="`emotion-quadrant-${w.quadrant}`"
          :aria-label="t('emotionWheel.ui.ariaQuadrant', { label: w.config.label })"
          @click="openQuadrant(w.quadrant)"
          @keydown.enter.prevent="openQuadrant(w.quadrant)"
          @keydown.space.prevent="openQuadrant(w.quadrant)"
        >
          <!-- obrys w kolorze wypełnienia + round join = miękko zaokrąglone rogi (w tym wierzchołek) -->
          <path
            :d="w.path"
            paint-order="stroke"
            stroke-linejoin="round"
            stroke-width="18"
            :style="{ fill: w.fill, stroke: w.fill }"
          />
          <text
            class="ew-wedge__label"
            :x="w.labelX"
            :y="w.labelY - 10"
            text-anchor="middle"
            :style="{ fill: qVar(w.quadrant, '-text') }"
          >
            <tspan>{{ w.config.energyLabel }}</tspan>
            <tspan :x="w.labelX" :y="w.labelY + 17">{{ w.config.pleasantnessLabel }}</tspan>
          </text>
          <g v-if="w.selectedCount > 0">
            <circle :cx="w.badgeX" :cy="w.badgeY" r="14" :style="{ fill: qVar(w.quadrant, '-selected') }" />
            <text :x="w.badgeX" :y="w.badgeY + 4" text-anchor="middle" class="ew-wedge__badge">
              {{ w.selectedCount }}
            </text>
          </g>
        </g>
      </g>

      <!-- ===== Poziom 2: wachlarz ćwiartki ===== -->
      <g v-else>
        <path :d="fanBgPath" :style="{ fill: qVar(activeQuadrantId!, '-tint') }" opacity="0.75" />
        <text
          x="500"
          y="42"
          text-anchor="middle"
          class="ew-fan__title"
          :style="{ fill: qVar(activeQuadrantId!, '-text') }"
        >
          {{ activeConfig!.label }}
        </text>
        <g v-for="sp in activeSpokes" :key="sp.id">
          <line
            :x1="sp.lineX1" :y1="sp.lineY1" :x2="sp.lineX2" :y2="sp.lineY2"
            :style="{ stroke: qVar(activeQuadrantId!, '-border') }"
            stroke-width="1"
            opacity="0.35"
          />
          <circle
            v-for="dot in sp.dots"
            :key="dot.ring"
            class="ew-dot neo-focus"
            role="button"
            tabindex="0"
            :data-testid="`emotion-wheel-dot-${sp.id}-${dot.ring + 1}`"
            :aria-label="t('emotionWheel.ui.ariaDot', { name: sp.name, level: dot.ring + 1 })"
            :aria-pressed="dot.selected"
            :cx="dot.x" :cy="dot.y" :r="dot.r"
            :style="dot.style"
            @click="toggleDot(sp.id, dot.ring)"
            @keydown.enter.prevent="toggleDot(sp.id, dot.ring)"
            @keydown.space.prevent="toggleDot(sp.id, dot.ring)"
            @mouseenter="hoverDot(sp, dot)"
            @focus="hoverDot(sp, dot)"
            @mouseleave="clearHover()"
            @blur="clearHover()"
          />
          <text
            class="ew-label"
            :class="{ 'ew-label--selected': sp.selectedNoIntensity }"
            role="button"
            tabindex="0"
            :data-testid="`emotion-wheel-spoke-${sp.id}`"
            :aria-label="t('emotionWheel.ui.ariaLabelSpoke', { name: sp.name })"
            :aria-pressed="sp.selectedNoIntensity"
            :x="sp.labelX" :y="sp.labelY"
            :text-anchor="sp.anchor"
            :style="{ fill: sp.selectedNoIntensity ? qVar(activeQuadrantId!, '-text') : undefined }"
            @click="toggleLabel(sp.id)"
            @keydown.enter.prevent="toggleLabel(sp.id)"
            @keydown.space.prevent="toggleLabel(sp.id)"
            @mouseenter="hoverLabel(sp)"
            @focus="hoverLabel(sp)"
            @mouseleave="clearHover()"
            @blur="clearHover()"
          >
            <tspan>{{ sp.name }}</tspan>
            <tspan class="ew-label__sub" :x="sp.labelX" :y="sp.labelY2">· {{ sp.sub }}</tspan>
          </text>
        </g>
        <!-- wskazówka kierunku natężenia -->
        <line x1="500" :y1="fanCy - 70" x2="500" :y2="fanCy - 126" class="ew-axis-line" />
        <path :d="`M 496 ${fanCy - 119} L 500 ${fanCy - 126} L 504 ${fanCy - 119}`" fill="none" class="ew-axis-line" />
        <text x="500" :y="fanCy - 54" text-anchor="middle" class="ew-axis">
          {{ t('emotionWheel.ui.intensity') }}
        </text>
      </g>
    </svg>

    <!-- Pasek nawigacji + fallbacki (celowo na dole — to nie są główne ścieżki) -->
    <div class="ew-bar">
      <span v-if="activeSpokes" class="ew-caps" role="tablist">
        <button
          v-for="q in quadrantOrder"
          :key="q"
          type="button"
          class="ew-caps__seg neo-focus"
          :class="{ 'ew-caps__seg--on': q === activeQuadrantId }"
          :style="q === activeQuadrantId ? { background: qVar(q, '-tint'), color: qVar(q, '-text') } : undefined"
          role="tab"
          :aria-selected="q === activeQuadrantId"
          :aria-label="t('emotionWheel.ui.ariaQuadrant', { label: quadrantConfig(q).label })"
          :data-testid="`emotion-quadrant-${q}`"
          @click="onCapsuleClick(q)"
        >
          <AppIcon :name="quadrantConfig(q).icon" class="text-sm" />
          <span>{{ quadrantConfig(q).pleasantnessLabel }}</span>
        </button>
      </span>
      <span class="ew-bar__spacer" />
      <button
        v-if="showFallbacks"
        type="button"
        class="ew-pill neo-focus"
        data-testid="emotion-wheel-dunno"
        @click="onFallback('dunno')"
      >
        {{ t('emotionWheel.ui.dunno') }}
      </button>
      <button
        v-if="showFallbacks"
        type="button"
        class="ew-pill neo-focus"
        data-testid="emotion-wheel-other"
        @click="onFallback('other')"
      >
        {{ t('emotionWheel.ui.other') }}
      </button>
    </div>

    <!-- Wklęsły pasek opisu — tylko w wachlarzu (hover emocji) lub dla komunikatu fallbacku -->
    <div v-if="activeSpokes || strip" class="ew-strip neo-inset" aria-live="polite">
      <template v-if="strip">
        <b>{{ strip.title }}</b><template v-if="strip.detail"> — {{ strip.detail }}</template>
      </template>
      <template v-else>
        {{ t('emotionWheel.ui.fanHint') }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { Quadrant } from '@/domain/emotion'
import { QUADRANTS_IN_ORDER, getQuadrantDisplayConfig } from '@/domain/emotion'
import type { EmotionSelection, WheelIntensity, WheelSpoke } from '@/domain/emotionWheel'
import { WHEEL_SPOKES_BY_QUADRANT, getSpoke } from '@/domain/emotionWheel'

interface Props {
  label?: string
  showFallbacks?: boolean
}

withDefaults(defineProps<Props>(), {
  label: undefined,
  showFallbacks: true,
})

const emit = defineEmits<{
  (e: 'fallback', kind: 'dunno' | 'other'): void
}>()

const selections = defineModel<EmotionSelection[]>({ default: () => [] })
const activeQuadrantId = defineModel<Quadrant | null>('quadrant', { default: null })

const { t } = useT()

const quadrantOrder = QUADRANTS_IN_ORDER

/* ---------------------------------------------------------------- geometry */

// Przegląd: PEŁNE 90° ćwiartki, rozsunięte od środka (exploded) — separację
// robi translacja wzdłuż dwusiecznej, nie przycinanie kątów.
const OV = { cx: 500, cy: 405, R: 370, inner: 20, explode: 20 }
const FAN = { cx: 500, cy: 640, ring0: 160, ringStep: 56, labelR: 418, aLeft: 160, aRight: 20 }
const fanCy = FAN.cy

const WEDGE_ANGLES: Record<Quadrant, [number, number]> = {
  'high-energy-high-pleasantness': [0, 90],
  'high-energy-low-pleasantness': [90, 180],
  'low-energy-low-pleasantness': [180, 270],
  'low-energy-high-pleasantness': [270, 360],
}

function polar(cx: number, cy: number, angleDeg: number, r: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  return [cx + Math.cos(a) * r, cy - Math.sin(a) * r]
}

function qVar(quadrant: Quadrant, suffix: string): string {
  return `var(--color-quadrant-${quadrant}${suffix})`
}

function quadrantConfig(quadrant: Quadrant) {
  return getQuadrantDisplayConfig(quadrant, t)
}

/* ------------------------------------------------------------- selections */

const selectionBySpoke = computed(() => {
  const map = new Map<string, EmotionSelection>()
  for (const sel of selections.value) map.set(sel.emotionId, sel)
  return map
})

function setSelection(spokeId: string, intensity: WheelIntensity | undefined) {
  const rest = selections.value.filter((s) => s.emotionId !== spokeId)
  selections.value = [...rest, intensity == null ? { emotionId: spokeId } : { emotionId: spokeId, intensity }]
}

function removeSelection(spokeId: string) {
  selections.value = selections.value.filter((s) => s.emotionId !== spokeId)
}

function toggleDot(spokeId: string, ring: number) {
  const level = (ring + 1) as WheelIntensity
  const current = selectionBySpoke.value.get(spokeId)
  if (current?.intensity === level) removeSelection(spokeId)
  else setSelection(spokeId, level)
}

function toggleLabel(spokeId: string) {
  const current = selectionBySpoke.value.get(spokeId)
  if (current && current.intensity == null) removeSelection(spokeId)
  else setSelection(spokeId, undefined)
}

/* ------------------------------------------------------------------ chips */

const chips = computed(() =>
  selections.value
    .map((sel) => {
      const spoke = getSpoke(sel.emotionId)
      if (!spoke) return null
      const ratio = sel.intensity == null ? 0 : ((sel.intensity - 1) / 4) * 0.85
      return {
        id: sel.emotionId,
        name: t(`emotionWheel.spokes.${sel.emotionId}.name`),
        intensity: sel.intensity ?? null,
        style: {
          background: `color-mix(in srgb, ${qVar(spoke.quadrant, '')} ${Math.round(ratio * 100)}%, ${qVar(spoke.quadrant, '-tint')})`,
          color: qVar(spoke.quadrant, '-text'),
        },
      }
    })
    .filter((chip): chip is NonNullable<typeof chip> => chip !== null),
)

/* ------------------------------------------------------------ level 1 data */

const wedges = computed(() =>
  quadrantOrder.map((quadrant) => {
    const [a1, a2] = WEDGE_ANGLES[quadrant]
    const { cx, cy, R, inner, explode } = OV
    const [x1, y1] = polar(cx, cy, a2, inner)
    const [x2, y2] = polar(cx, cy, a2, R)
    const [x3, y3] = polar(cx, cy, a1, R)
    const [x4, y4] = polar(cx, cy, a1, inner)
    const mid = (a1 + a2) / 2
    const midRad = (mid * Math.PI) / 180
    const [labelX, labelY] = polar(cx, cy, mid, 215)
    const [badgeX, badgeY] = polar(cx, cy, mid, 312)
    return {
      quadrant,
      config: quadrantConfig(quadrant),
      // rozsunięcie ćwiartki wzdłuż dwusiecznej
      transform: `translate(${Math.cos(midRad) * explode} ${-Math.sin(midRad) * explode})`,
      path: `M ${x1} ${y1} L ${x2} ${y2} A ${R} ${R} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${inner} ${inner} 0 0 0 ${x1} ${y1} Z`,
      // path nie przyjmie gradientu CSS — przybliżamy aplikacyjny gradient top→bottom mieszanką 55/45
      fill: `color-mix(in srgb, ${qVar(quadrant, '-top')} 55%, ${qVar(quadrant, '-bottom')})`,
      labelX,
      labelY,
      badgeX,
      badgeY,
      selectedCount: selections.value.filter((s) => getSpoke(s.emotionId)?.quadrant === quadrant).length,
    }
  }),
)

/* ------------------------------------------------------------ level 2 data */

const activeConfig = computed(() =>
  activeQuadrantId.value ? quadrantConfig(activeQuadrantId.value) : null,
)

const fanBgPath = computed(() => {
  const { cx, cy, ring0, ringStep, aLeft, aRight } = FAN
  const rOuter = ring0 + 4 * ringStep + 26
  const [x1, y1] = polar(cx, cy, aLeft + 8, 100)
  const [x2, y2] = polar(cx, cy, aLeft + 8, rOuter)
  const [x3, y3] = polar(cx, cy, aRight - 8, rOuter)
  const [x4, y4] = polar(cx, cy, aRight - 8, 100)
  return `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A 100 100 0 0 0 ${x1} ${y1} Z`
})

interface FanDot {
  ring: number
  x: number
  y: number
  r: number
  hintId: string | null
  selected: boolean
  style: Record<string, string>
}

interface FanSpoke {
  id: string
  name: string
  sub: string
  hints: (string | null)[]
  dots: FanDot[]
  lineX1: number
  lineY1: number
  lineX2: number
  lineY2: number
  labelX: number
  labelY: number
  labelY2: number
  anchor: 'start' | 'middle' | 'end'
  selectedNoIntensity: boolean
}

const activeSpokes = computed<FanSpoke[] | null>(() => {
  const quadrant = activeQuadrantId.value
  if (!quadrant) return null
  const spokes = WHEEL_SPOKES_BY_QUADRANT[quadrant]
  const { cx, cy, ring0, ringStep, labelR, aLeft, aRight } = FAN
  const n = spokes.length
  return spokes.map((spoke: WheelSpoke, i: number) => {
    const angle = aLeft - (aLeft - aRight) * ((i + 0.5) / n)
    const [lineX1, lineY1] = polar(cx, cy, angle, ring0 - 16)
    const [lineX2, lineY2] = polar(cx, cy, angle, ring0 + 4 * ringStep + 16)
    const selection = selectionBySpoke.value.get(spoke.id)
    const dots: FanDot[] = spoke.hints.map((hintId, ring) => {
      const [x, y] = polar(cx, cy, angle, ring0 + ring * ringStep)
      const selected = selection?.intensity === ring + 1
      return {
        ring,
        x,
        y,
        r: 8 + ring * 2.8,
        hintId,
        selected,
        style: selected
          ? {
              fill: `color-mix(in srgb, ${qVar(quadrant, '-selected')} ${40 + 15 * ring}%, white)`,
              stroke: qVar(quadrant, '-selected'),
              strokeWidth: '2.6',
            }
          : {
              fill: '#ffffff',
              stroke: qVar(quadrant, '-border'),
              strokeWidth: '1.2',
            },
      }
    })
    const cos = Math.cos((angle * Math.PI) / 180)
    const anchor: FanSpoke['anchor'] = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
    // środkowe etykiety naprzemiennie bliżej/dalej, żeby przy większej czcionce się nie stykały
    const labelRadius = anchor === 'middle' && i % 2 === 1 ? labelR + 38 : labelR
    const [labelX, labelY] = polar(cx, cy, angle, labelRadius)
    const twoLineUp = anchor === 'middle'
    return {
      id: spoke.id,
      name: t(`emotionWheel.spokes.${spoke.id}.name`),
      sub: t(`emotionWheel.spokes.${spoke.id}.sub`),
      hints: spoke.hints,
      dots,
      lineX1,
      lineY1,
      lineX2,
      lineY2,
      labelX,
      labelY: twoLineUp ? labelY - 20 : labelY - 4,
      labelY2: twoLineUp ? labelY - 2 : labelY + 14,
      anchor,
      selectedNoIntensity: selection != null && selection.intensity == null,
    }
  })
})

/* ------------------------------------------------------------- navigation */

function openQuadrant(quadrant: Quadrant) {
  activeQuadrantId.value = quadrant
  strip.value = null
}

function closeFan() {
  activeQuadrantId.value = null
  strip.value = null
}

function onCapsuleClick(quadrant: Quadrant) {
  if (quadrant === activeQuadrantId.value) closeFan()
  else openQuadrant(quadrant)
}

/* ------------------------------------------------------------------ strip */

const strip = ref<{ title: string; detail: string } | null>(null)

function hintName(hintId: string | null): string | null {
  return hintId ? t(`emotions.${hintId}.name`) : null
}

function hoverDot(sp: FanSpoke, dot: FanDot) {
  const level = dot.ring + 1
  const scale = t(`emotionWheel.scale.${level}`)
  const hint = hintName(dot.hintId)
  const parts = [`${t('emotionWheel.ui.levelOf', { level })} · ${scale}`]
  if (hint) parts.push(t('emotionWheel.ui.eg', { word: hint }))
  parts.push(t('emotionWheel.ui.clickToSelect'))
  strip.value = { title: sp.name, detail: parts.join(' · ') }
}

function hoverLabel(sp: FanSpoke) {
  const hints = sp.hints
    .map((hintId, i) => (hintId ? `${i + 1} ${hintName(hintId)}` : null))
    .filter((x): x is string => x !== null)
    .join(' · ')
  const detail = [
    t('emotionWheel.ui.scaleTitle'),
    hints ? `${t('emotionWheel.ui.hintsLabel')}: ${hints}` : null,
    t('emotionWheel.ui.labelSelectHint'),
  ]
    .filter(Boolean)
    .join(' · ')
  strip.value = { title: `${sp.name} · ${sp.sub}`, detail }
}

function clearHover() {
  strip.value = null
}

function onFallback(kind: 'dunno' | 'other') {
  emit('fallback', kind)
  strip.value = {
    title: t(kind === 'dunno' ? 'emotionWheel.ui.dunno' : 'emotionWheel.ui.other'),
    detail: t('emotionWheel.ui.comingSoon'),
  }
}
</script>

<style scoped>
.ew-root {
  width: 100%;
}
.ew-svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 880px;
  margin: 0 auto;
}

/* --- poziom 1: wedge'e --- */
.ew-wedge {
  cursor: pointer;
  outline: none;
  filter: drop-shadow(5px 5px 10px rgba(103, 132, 175, 0.22))
    drop-shadow(-5px -5px 10px rgba(255, 255, 255, 0.92));
  transition: opacity 0.12s ease;
}
.ew-wedge:hover path,
.ew-wedge:focus-visible path {
  opacity: 0.9;
}
/* obie linie (energia / przyjemność) tą samą czcionką — równorzędne wymiary emocji.
   Rozmiary czcionek SVG są zawyżone względem HTML, bo komponent renderuje się
   w kolumnie ~600px (skala viewBox 1000 → ~0.6). */
.ew-wedge__label {
  font-size: 21px;
  font-weight: 650;
  pointer-events: none;
}
.ew-wedge__badge {
  font-size: 13px;
  font-weight: 700;
  fill: #fff;
  pointer-events: none;
}

/* --- poziom 2: wachlarz --- */
.ew-fan__title {
  font-size: 18px;
  font-weight: 700;
}
.ew-dot {
  cursor: pointer;
  outline: none;
  filter: drop-shadow(2.5px 2.5px 3.5px rgba(103, 132, 175, 0.22))
    drop-shadow(-2px -2px 3px rgba(255, 255, 255, 0.92));
}
.ew-dot:hover,
.ew-dot:focus-visible {
  stroke-width: 2.6;
}
.ew-label {
  font-size: 17px;
  font-weight: 650;
  cursor: pointer;
  outline: none;
  /* tokeny kolorów to triplety RGB (pod rgb(var(...))) — goła var() dałaby czerń */
  fill: rgb(var(--color-on-surface, 30 42 58));
}
.ew-label:hover,
.ew-label:focus-visible {
  text-decoration: underline;
}
.ew-label--selected {
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 3.5px;
}
.ew-label__sub {
  font-size: 13.5px;
  font-weight: 500;
  opacity: 0.72;
}
.ew-axis {
  font-size: 13.5px;
  fill: rgb(var(--color-on-surface-variant, 130 150 176));
  letter-spacing: 0.04em;
}
.ew-axis-line {
  stroke: rgb(var(--color-on-surface-variant, 130 150 176));
  stroke-width: 1.4;
}

/* --- pasek nawigacji + fallbacki --- */
.ew-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}
.ew-bar__spacer {
  flex: 1;
}
.ew-caps {
  display: inline-flex;
  gap: 3px;
  padding: 4px;
  border-radius: 999px;
  background: rgb(var(--neo-surface-base, 238 244 252));
  box-shadow:
    inset 3px 3px 7px rgba(103, 132, 175, 0.16),
    inset -3px -3px 7px rgba(255, 255, 255, 0.9);
}
.ew-caps__seg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  cursor: pointer;
  background: transparent;
  color: rgb(var(--color-on-surface-variant, 91 107 128));
}
.ew-caps__seg--on {
  font-weight: 700;
  box-shadow:
    2px 2px 5px rgba(103, 132, 175, 0.25),
    -2px -2px 5px rgba(255, 255, 255, 0.95);
}
.ew-pill {
  border: 0;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12.5px;
  cursor: pointer;
  background: rgb(var(--neo-surface-base, 238 244 252));
  color: rgb(var(--color-on-surface-variant, 91 107 128));
  box-shadow:
    3px 3px 7px rgba(103, 132, 175, 0.2),
    -3px -3px 7px rgba(255, 255, 255, 0.95);
}
.ew-pill:hover {
  color: rgb(var(--color-on-surface, 30 42 58));
}
.ew-pill:active {
  box-shadow:
    inset 3px 3px 6px rgba(103, 132, 175, 0.2),
    inset -3px -3px 6px rgba(255, 255, 255, 0.9);
}

/* --- pasek opisu --- */
.ew-strip {
  margin-top: 10px;
  border-radius: 12px;
  min-height: 44px;
  padding: 10px 16px;
  font-size: 13.5px;
  text-align: center;
  color: rgb(var(--color-on-surface-variant, 91 107 128));
}
.ew-strip b {
  color: rgb(var(--color-on-surface, 30 42 58));
}

/* --- chipy --- */
.ew-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12.5px;
  font-weight: 600;
  box-shadow:
    3px 3px 7px rgba(103, 132, 175, 0.18),
    -3px -3px 7px rgba(255, 255, 255, 0.95);
}
.ew-chip--noint {
  border: 1.5px dashed currentColor;
}
.ew-chip__x {
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.65;
  font-size: 11px;
  color: inherit;
  padding: 0 2px;
}
.ew-chip__x:hover {
  opacity: 1;
}
</style>
