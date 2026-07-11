<!--
  EmotionGroupPicker — picker emocji v3 (design „6c”, soft-neumorfizm).

  Dwupoziomowy: przegląd 4 ćwiartek (2×2) → drill-down z kaflami 45 grup
  (10–12 na ćwiartkę), każdy kafel z poziomym suwakiem natężenia 1–5.
  Słowa katalogu są przykładami jakości grupy (tooltip), nie szczeblami skali.
  Po wejściu w ćwiartkę cały panel przejmuje tintę akcentu (color-mix) —
  żaden element nie zostaje czysto biały. Referencja pixel-perfect:
  ideas/design/emotion-picker-v3/handoff/ (README + Picker-emocji-FINAL.dc.html).

  Kontrakt jak w EmotionWheel (wymiana bez zmian w widokach):
    v-model            → EmotionGroupSelection[]
    v-model:quadrant   → Quadrant | null (otwarta ćwiartka; rodzic tintuje kartę)
    props: label?, showFallbacks? (fallbacki tylko na przeglądzie ćwiartek)
    emit:  fallback('dunno' | 'other')

  Semantyka suwaka (Pointer Events, capture na kontenerze):
    pointerdown na rowku = poziom strefy · drag = na żywo (poniżej 1 → usunięcie)
    tap w gałkę / tytuł = toggle grupy bez natężenia · tap w aktywną strefę = zeruje poziom
  Wariant wąski (kontener < 700px, np. edytor dziennika): 3 kolumny kafli,
  panel 503px, wysokość rośnie do 4 rzędów — decyzja usera 2026-07-10.
-->
<template>
  <div class="egp-wrap">
    <div class="ep" :style="panelStyle">
      <div class="ep-head">
        <div v-if="!activeQuad" class="oh">
          <div class="oh-t">{{ props.label ?? t('emotionGroups.ui.title') }}</div>
        </div>
        <div v-else class="dh">
          <div class="dh-title">
            <button type="button" class="dh-home oh-t" @click="back">
              {{ props.label ?? t('emotionGroups.ui.title') }}
            </button>
            <span class="dh-div"></span>
            <span class="oh-t">{{ quadLabel(activeQuad) }}</span>
          </div>
          <div class="dh-sp"></div>
          <div class="mini">
            <button
              v-for="q in quadrantList"
              :key="q.id"
              type="button"
              class="mcell"
              :class="{ active: q.id === activeQuad }"
              :style="{ '--mt': q.top, '--mb': q.bottom, '--mtx': q.text }"
              :title="quadLabel(q.id)"
              :data-testid="`egp-quadrant-mini-${q.id}`"
              @click="openQuad(q.id)"
            >
              <span class="msr">{{ q.icon }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="ep-stage">
        <div v-if="!activeQuad" :key="'overview'" class="qgrid">
          <button
            v-for="q in quadrantList"
            :key="q.id"
            type="button"
            class="qbtn"
            :style="{ '--qt': q.top, '--qb': q.bottom, '--qtx': q.text }"
            :data-testid="`egp-quadrant-${q.id}`"
            @click="openQuad(q.id)"
          >
            <span class="msr">{{ q.icon }}</span>
            <span class="q-name">
              <span class="q-en">{{ energyLabel(q.id) }}</span>
              <span class="q-div"></span>
              <span class="q-pl">{{ pleasantnessLabel(q.id) }}</span>
            </span>
            <span v-if="quadSelCount(q.id) > 0" class="qbadge">{{ quadSelCount(q.id) }}</span>
          </button>
        </div>

        <div v-else :key="activeQuad" class="etgrid">
          <div
            v-for="g in activeGroups"
            :key="g.slug"
            class="etile"
            :class="{ sel: g.slug in selMap }"
            :style="{ '--c': accent, '--fw': fillWidth(g.slug), '--tp': thumbPos(g.slug) }"
            :data-testid="`egp-tile-${g.slug}`"
            @mouseenter="hovered = g.slug"
            @mouseleave="hovered = null"
          >
            <span v-if="g.isNew" class="etnew" :title="t('emotionGroups.ui.isNew')"></span>
            <button
              type="button"
              class="ethead"
              :title="groupName(g.slug)"
              :aria-label="t('emotionGroups.ui.selectGroup', { name: groupName(g.slug) })"
              @click="toggle(g.slug)"
            >
              <span class="etname">{{ shortName(g.slug) }}</span>
              <span class="etaux">{{ auxLine(g) }}</span>
            </button>
            <div
              class="hslider"
              @pointerdown="slideDown(g.slug, $event)"
              @pointermove="slideMove(g.slug, $event)"
              @pointerup="slideUp(g.slug)"
              @pointercancel="drag = null"
            >
              <div class="htrack">
                <div class="hfillbar"></div>
                <div class="hzones">
                  <span v-for="n in 5" :key="n" :title="scaleLabel(n)"></span>
                </div>
              </div>
              <button
                type="button"
                class="hthumb"
                :title="groupName(g.slug)"
                :aria-label="thumbAria(g.slug)"
                @keydown.left.prevent="nudge(g.slug, -1)"
                @keydown.right.prevent="nudge(g.slug, 1)"
              >
                <span class="fico" :style="{ '--fi': faceMask(g.slug) }"></span>
              </button>
            </div>
            <div v-if="hovered === g.slug" class="ttip">
              <div class="ttip-n">{{ groupName(g.slug) }}</div>
              <div class="ttip-ap">{{ t(`emotionGroups.groups.${g.slug}.appraisal`) }}</div>
              <div class="ttip-w">
                <span v-for="w in g.wordIds" :key="w">{{ t(`emotions.${w}.name`) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ep-foot">
        <span class="f-lab">{{ t('emotionGroups.ui.selected') }}</span>
        <span v-if="chips.length === 0" class="f-empty">{{ t('emotionGroups.ui.empty') }}</span>
        <div v-else class="f-chips">
          <span
            v-for="c in chips"
            :key="c.slug"
            class="fchip"
            :style="{ '--c': c.color }"
            :data-testid="`egp-chip-${c.slug}`"
          >
            {{ c.name }}
            <span v-if="c.suffix" class="fn">{{ c.suffix }}</span>
            <button
              type="button"
              class="fx"
              :aria-label="t('emotionGroups.ui.removeSelection', { name: c.name })"
              @click="remove(c.slug)"
            >
              ✕
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import type { Quadrant } from '@/domain/emotion'
import {
  GROUPS_BY_QUADRANT,
  QUADRANT_STYLES,
  type EmotionGroup,
  type EmotionGroupSelection,
  type GroupIntensity,
} from '@/domain/emotionGroups'

const props = defineProps<{ label?: string }>()

const selections = defineModel<EmotionGroupSelection[]>({ default: () => [] })
const activeQuad = defineModel<Quadrant | null>('quadrant', { default: null })

const { t } = useT()

// twarze grup: assets/emotion-faces/<slug>.svg jako maski CSS (barwione color-mix);
// new URL(..., import.meta.url) — wzorzec Vite działający w dev i buildzie.
// UWAGA: małe SVG Vite inlinuje jako data: URI z SUROWYMI apostrofami w środku,
// więc wartość url() MUSI być w cudzysłowach (apostrofy ucinałyby string —
// mask-image robił się nieparsowalny i twarz znikała; zdiagnozowane 2026-07-11).
function faceMask(slug: string): string {
  return `url("${new URL(`../../assets/emotion-faces/${slug}.svg`, import.meta.url).href}")`
}

// układ przeglądu 2×2 wg cyrkumpleksu: HEHP w prawym górnym rogu
// (rząd 1: HELP · HEHP, rząd 2: LELP · LEHP) — feedback usera 2026-07-10
const OVERVIEW_ORDER: Quadrant[] = [
  'high-energy-low-pleasantness',
  'high-energy-high-pleasantness',
  'low-energy-low-pleasantness',
  'low-energy-high-pleasantness',
]
const quadrantList = OVERVIEW_ORDER.map((q) => QUADRANT_STYLES[q])
const activeGroups = computed<EmotionGroup[]>(() =>
  activeQuad.value ? GROUPS_BY_QUADRANT[activeQuad.value] : [],
)

// ---- stan wyboru: mapa slug → poziom (0 = zaznaczenie bez natężenia) ----
const selMap = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const s of selections.value) m[s.emotionId] = s.intensity ?? 0
  return m
})
function writeSel(slug: string, lvl: number | null) {
  const rest = selections.value.filter((s) => s.emotionId !== slug)
  if (lvl === null) {
    selections.value = rest
    return
  }
  const entry: EmotionGroupSelection =
    lvl > 0 ? { emotionId: slug, intensity: lvl as GroupIntensity } : { emotionId: slug }
  const existing = selections.value.findIndex((s) => s.emotionId === slug)
  if (existing >= 0) {
    selections.value = selections.value.map((s) => (s.emotionId === slug ? entry : s))
  } else {
    selections.value = [...rest, entry]
  }
}
function toggle(slug: string) {
  if (slug in selMap.value) writeSel(slug, null)
  else writeSel(slug, 0)
}
function remove(slug: string) {
  writeSel(slug, null)
}
function setLvl(slug: string, lvl: number) {
  writeSel(slug, lvl)
}
function nudge(slug: string, delta: number) {
  const cur = selMap.value[slug] ?? 0
  const next = Math.max(0, Math.min(5, cur + delta))
  if (next === 0 && cur === 0) return
  if (next === 0) writeSel(slug, 0)
  else writeSel(slug, next)
}

// ---- nawigacja ----
function openQuad(q: Quadrant) {
  activeQuad.value = q
}
function back() {
  activeQuad.value = null
}

// ---- suwak: Pointer Events (semantyka z prototypu 6c) ----
const drag = ref<null | {
  slug: string
  rect: DOMRect
  onThumb: boolean
  prev: number
  start: number
  moved: boolean
}>(null)
function lvlAt(rect: DOMRect, x: number): number {
  return Math.max(0, Math.min(5, Math.ceil(((x - rect.left) / rect.width) * 5)))
}
function slideDown(slug: string, e: PointerEvent) {
  const host = e.currentTarget as HTMLElement
  const track = host.querySelector('.htrack')
  if (!track) return
  try {
    host.setPointerCapture(e.pointerId)
  } catch {
    /* jsdom / stare przeglądarki */
  }
  const onThumb = !!(e.target as HTMLElement).closest?.('.hthumb')
  const prev = slug in selMap.value ? selMap.value[slug] : -1
  const rect = track.getBoundingClientRect()
  const start = lvlAt(rect, e.clientX)
  drag.value = { slug, rect, onThumb, prev, start, moved: false }
  if (!onThumb) {
    if (start <= 0) remove(slug)
    else setLvl(slug, start)
  }
}
function slideMove(slug: string, e: PointerEvent) {
  const d = drag.value
  if (!d || d.slug !== slug) return
  const lvl = lvlAt(d.rect, e.clientX)
  if (lvl !== d.start || d.moved) {
    d.moved = true
    if (lvl <= 0) remove(slug)
    else setLvl(slug, lvl)
  }
}
function slideUp(slug: string) {
  const d = drag.value
  drag.value = null
  if (!d) return
  if (!d.moved) {
    if (d.onThumb) toggle(slug) // tap w ikonę = zaznaczenie samej grupy
    else if (d.prev === d.start) setLvl(slug, 0) // tap w aktywny poziom zdejmuje natężenie
  }
}

// ---- prezentacja ----
const hovered = ref<string | null>(null)

function groupName(slug: string): string {
  return t(`emotionGroups.groups.${slug}.name`)
}
function shortName(slug: string): string {
  return groupName(slug).split(' · ')[0]
}
function auxLine(g: EmotionGroup): string {
  return g.auxIds.map((id) => t(`emotions.${id}.name`)).join(' · ')
}
function scaleLabel(n: number): string {
  return t(`emotionGroups.scale.${n}`)
}
function thumbAria(slug: string): string {
  const lvl = selMap.value[slug] ?? 0
  return lvl > 0
    ? t('emotionGroups.ui.intensityOf', { name: groupName(slug), level: lvl })
    : t('emotionGroups.ui.selectGroup', { name: groupName(slug) })
}
function energyLabel(q: Quadrant): string {
  return q.startsWith('high') ? t('emotionViews.selector.energyLabels.high') : t('emotionViews.selector.energyLabels.low')
}
function pleasantnessLabel(q: Quadrant): string {
  return q.endsWith('high-pleasantness')
    ? t('emotionViews.selector.pleasantnessLabels.pleasant')
    : t('emotionViews.selector.pleasantnessLabels.unpleasant')
}
function quadLabel(q: Quadrant): string {
  return `${energyLabel(q)} · ${pleasantnessLabel(q)}`
}
function quadSelCount(q: Quadrant): number {
  return GROUPS_BY_QUADRANT[q].filter((g) => g.slug in selMap.value).length
}
function fillWidth(slug: string): string {
  const lvl = selMap.value[slug] ?? 0
  return `${(lvl / 5) * 100}%`
}
function thumbPos(slug: string): string {
  const lvl = selMap.value[slug] ?? 0
  return `calc(${(lvl / 5) * 100}% - ${(lvl / 5) * 26}px)`
}

const accent = computed(() => (activeQuad.value ? QUADRANT_STYLES[activeQuad.value].accent : '#2E93FF'))
// tło daje karta widoku-rodzica (tintowana przez v-model:quadrant);
// tu tintujemy tylko parę cieni neumorficznych, żeby kafle/suwaki szły za akcentem
const panelStyle = computed(() => {
  if (!activeQuad.value) {
    return { '--shw': 'rgba(255,255,255,.9)', '--shd': '#8CA6CA' }
  }
  const a = accent.value
  return {
    '--shw': `color-mix(in srgb, ${a} 14%, rgba(255,255,255,.72))`,
    '--shd': `color-mix(in srgb, ${a} 42%, #8CA6CA)`,
  }
})

const chips = computed(() =>
  selections.value.map((s) => {
    const g = Object.values(GROUPS_BY_QUADRANT)
      .flat()
      .find((x) => x.slug === s.emotionId)
    return {
      slug: s.emotionId,
      name: shortName(s.emotionId),
      color: g ? QUADRANT_STYLES[g.quadrant].accent : '#2E93FF',
      suffix: s.intensity ? `${s.intensity}/5` : '',
    }
  }),
)
</script>

<style scoped>
.egp-wrap {
  container-type: inline-size;
  width: 100%;
}
/* Panel jest bezramkowy: pojedyncze, szerokie tło daje karta widoku-rodzica
   (tintowana przez v-model:quadrant + getQuadrantTintStyle). Wysokość rośnie
   z zawartością — m.in. gdy chipy wybranych zawijają się w kolejne rzędy. */
.ep {
  --shw: rgba(255, 255, 255, 0.9);
  --shd: #8ca6ca;
  --sh-raise: -6px -6px 13px var(--shw), 6px 6px 13px color-mix(in srgb, var(--shd) 36%, transparent);
  --sh-raise-lg: -9px -9px 18px var(--shw), 9px 9px 18px color-mix(in srgb, var(--shd) 40%, transparent);
  --sh-raise-sm: -4px -4px 8px var(--shw), 4px 4px 8px color-mix(in srgb, var(--shd) 32%, transparent);
  --sh-press: inset -3px -3px 6px var(--shw), inset 3px 3px 7px color-mix(in srgb, var(--shd) 44%, transparent);
  --sh-press-sm: inset -2px -2px 4px var(--shw), inset 2px 2px 5px color-mix(in srgb, var(--shd) 42%, transparent);
  --sh-flat: -2px -2px 5px var(--shw), 2px 2px 5px color-mix(in srgb, var(--shd) 30%, transparent);
  --muted: #6c86a6;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  color: #0f2745;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.ep-head {
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
}
.ep-stage {
  flex: none;
  position: relative;
}
.ep-stage > div {
  animation: epfade 0.28s ease;
}
@keyframes epfade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.ep-foot {
  /* bez scrolla: pole z chipami zawija się i rośnie razem z panelem */
  min-height: 52px;
  flex: none;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 4px;
  border-top: 1px solid rgba(120, 150, 190, 0.18);
}
.msr {
  font-family: 'Material Symbols Rounded';
  font-weight: 400;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  font-feature-settings: 'liga';
}

/* ---- nagłówek ---- */
.oh {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: flex-start;
  margin-top: -6px;
}
.oh-t {
  font: 700 12px/1.1 'Roboto', sans-serif;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
}
.dh {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  align-self: stretch;
}
.dh-sp {
  flex: 1;
}
.dh-title {
  align-self: flex-start;
  margin-top: -1px;
  display: flex;
  align-items: center;
  gap: 11px;
}
.dh-home {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.dh-div {
  width: 1px;
  height: 14px;
  flex: none;
  background: color-mix(in srgb, var(--muted) 55%, transparent);
}
.mini {
  display: grid;
  grid-template-columns: repeat(4, 26px);
  grid-template-rows: 26px;
  gap: 5px;
  align-self: flex-start;
  margin-top: -6px;
}
.mcell {
  border: 0;
  cursor: pointer;
  border-radius: 9px;
  padding: 0;
  display: grid;
  place-items: center;
  color: var(--mtx);
  background: linear-gradient(150deg, var(--mt), var(--mb));
  box-shadow: var(--sh-raise-sm);
  opacity: 0.5;
  filter: saturate(0.7);
  transition:
    transform 0.16s,
    box-shadow 0.16s,
    opacity 0.16s,
    filter 0.16s;
}
.mcell .msr {
  font-size: 15px;
  opacity: 0.92;
}
.mcell:hover {
  opacity: 0.88;
  filter: saturate(0.9);
  transform: translateY(-1.5px);
  box-shadow: var(--sh-raise);
}
.mcell.active {
  opacity: 1;
  filter: none;
  transform: translateY(-1.5px);
  box-shadow:
    var(--sh-raise-sm),
    0 0 0 2.5px color-mix(in srgb, var(--mb) 55%, white);
}

/* ---- przegląd 2×2 ---- */
.qgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(168px, 1fr);
  gap: 14px;
}
.qbtn {
  position: relative;
  border: 0;
  cursor: pointer;
  border-radius: 20px;
  padding: 16px 18px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(150deg, var(--qt), var(--qb));
  color: var(--qtx);
  box-shadow: var(--sh-raise);
  transition:
    transform 0.16s,
    box-shadow 0.16s;
}
.qbtn:hover {
  transform: translateY(-2px);
  box-shadow: var(--sh-raise-lg);
}
.qbtn:active {
  transform: translateY(0);
  box-shadow: var(--sh-press);
}
.qbtn .msr {
  font-size: 25px;
  opacity: 0.85;
}
.q-name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.q-en,
.q-pl {
  font: 700 13px/1.15 'Roboto', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.q-div {
  display: block;
  width: 28px;
  height: 1px;
  background: currentColor;
  opacity: 0.3;
  margin: 6px 0;
}
.qbadge {
  position: absolute;
  top: 14px;
  right: 15px;
  min-width: 23px;
  height: 23px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--qtx);
  font: 700 12px 'Roboto', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  box-shadow: 0 1px 2px rgba(40, 60, 90, 0.12);
}

/* ---- kafle grup ---- */
.etgrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(104px, auto);
  gap: 12px;
}
.etile {
  position: relative;
  border-radius: 16px;
  padding: 14px 13px 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--c) 16%, white),
    color-mix(in srgb, var(--c) 30%, white)
  );
  box-shadow: var(--sh-raise-sm);
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    background 0.2s;
}
.etile:hover {
  transform: translateY(-2px);
  box-shadow: var(--sh-raise);
}
.etile.sel {
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--c) 26%, white),
    color-mix(in srgb, var(--c) 42%, white)
  );
  box-shadow:
    var(--sh-raise-sm),
    inset 0 0 0 1.5px color-mix(in srgb, var(--c) 55%, transparent);
}
.ethead {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.etname {
  font: 700 10px/1.25 'Roboto', sans-serif;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--c) 55%, #14304f);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.etile.sel .etname {
  color: color-mix(in srgb, var(--c) 70%, #14304f);
}
.etaux {
  font: italic 400 9.5px/1.2 'Roboto', sans-serif;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.etnew {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 20%, transparent);
}

/* ---- suwak poziomy ---- */
.hslider {
  position: relative;
  height: 28px;
  display: flex;
  align-items: center;
  touch-action: none;
  cursor: grab;
  user-select: none;
}
.hslider:active {
  cursor: grabbing;
}
.htrack {
  position: relative;
  flex: 1;
  height: 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--c) 14%, transparent);
  box-shadow: var(--sh-press-sm);
  overflow: hidden;
}
.hfillbar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--fw, 0%);
  border-radius: 8px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 62%, white), var(--c));
  transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}
.hzones {
  position: absolute;
  inset: 0;
  display: flex;
  z-index: 2;
  pointer-events: none;
}
.hzones span {
  flex: 1;
}
.hzones span:not(:last-child) {
  border-right: 1px solid color-mix(in srgb, var(--c) 26%, transparent);
}
.hthumb {
  position: absolute;
  top: 50%;
  left: var(--tp, 0px);
  width: 28px;
  height: 28px;
  transform: translateY(-50%);
  z-index: 4;
  border: 0;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 34% 30%,
    color-mix(in srgb, var(--c) 38%, white),
    color-mix(in srgb, var(--c) 85%, white)
  );
  display: grid;
  place-items: center;
  box-shadow:
    var(--sh-raise-sm),
    inset 0 1px 1.5px rgba(255, 255, 255, 0.5);
  transition: left 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}
.hthumb:hover {
  box-shadow:
    var(--sh-raise),
    inset 0 1px 1.5px rgba(255, 255, 255, 0.5);
}
.fico {
  width: 20px;
  height: 20px;
  display: block;
  pointer-events: none;
  background: color-mix(in srgb, var(--c) 55%, #14304f);
  /* longhand — skróty maski z var() bywają odrzucane w całości */
  -webkit-mask-image: var(--fi);
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-image: var(--fi);
  mask-position: center;
  mask-size: contain;
  mask-repeat: no-repeat;
}

/* ---- tooltip ---- */
.ttip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  width: 210px;
  z-index: 60;
  background: #12314f;
  color: #eaf3ff;
  border-radius: 13px;
  padding: 11px 13px;
  box-shadow: 0 16px 34px -10px rgba(20, 45, 80, 0.6);
  pointer-events: none;
}
.ttip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-top-color: #12314f;
}
.ttip-n {
  font: 700 13px 'Roboto', sans-serif;
  margin-bottom: 5px;
}
.ttip-ap {
  font: 400 11px/1.5 'Roboto', sans-serif;
  color: #cfe2f6;
}
.ttip-w {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}
.ttip-w span {
  font: 500 10px 'Roboto', sans-serif;
  background: rgba(255, 255, 255, 0.14);
  color: #eaf3ff;
  padding: 3px 7px;
  border-radius: 6px;
}

/* ---- stopka ---- */
.f-lab {
  font: 700 10px 'Roboto', sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8399b7;
  flex: none;
}
.f-empty {
  font: 400 12px 'Roboto', sans-serif;
  color: #9db2ce;
  font-style: italic;
}
.f-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 2px 0;
  min-width: 0;
}
.fchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px 5px 12px;
  border-radius: 999px;
  white-space: nowrap;
  flex: none;
  color: #fff;
  font: 600 12px 'Roboto', sans-serif;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 86%, white), var(--c));
  box-shadow: var(--sh-raise-sm);
}
.fchip .fn {
  opacity: 0.85;
  font-weight: 500;
  font-size: 11px;
}
.fx {
  width: 17px;
  height: 17px;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
  font-size: 9px;
  display: grid;
  place-items: center;
}
.fx:hover {
  background: rgba(255, 255, 255, 0.5);
}
/* ---- wariant wąski: 3 kolumny kafli, 4 rzędy (decyzja usera 2026-07-10) ---- */
@container (max-width: 699px) {
  .etgrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
