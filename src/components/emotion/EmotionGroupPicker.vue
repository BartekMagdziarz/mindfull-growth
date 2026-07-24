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
              <AppIcon :name="q.icon" class="egp-icon" />
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
            <AppIcon :name="q.icon" class="egp-icon" />
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
import AppIcon from '@/components/shared/AppIcon.vue'
import type { Quadrant } from '@/domain/emotion'
import {
  EGP_DEFAULT_ACCENT,
  EGP_SHADOW_BASE,
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

const accent = computed(() =>
  activeQuad.value ? QUADRANT_STYLES[activeQuad.value].accent : EGP_DEFAULT_ACCENT,
)
// tło daje karta widoku-rodzica (tintowana przez v-model:quadrant);
// tu tintujemy tylko parę cieni neumorficznych, żeby kafle/suwaki szły za akcentem
const panelStyle = computed(() => {
  if (!activeQuad.value) {
    return { '--egp-sh-light': EGP_SHADOW_BASE.light, '--egp-sh-dark': EGP_SHADOW_BASE.dark }
  }
  const a = accent.value
  return {
    '--egp-sh-light': `color-mix(in srgb, ${a} 14%, ${EGP_SHADOW_BASE.lightTint})`,
    '--egp-sh-dark': `color-mix(in srgb, ${a} 42%, ${EGP_SHADOW_BASE.dark})`,
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
      color: g ? QUADRANT_STYLES[g.quadrant].accent : EGP_DEFAULT_ACCENT,
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
  /* --egp-sh-light / --egp-sh-dark (kolory bazowe cieni) przychodzą inline z panelStyle
     (stałe domenowe EGP_SHADOW_BASE, po drill-downie mieszane z akcentem) */
  --mg-shadow-egp-raise: -6px -6px 13px var(--egp-sh-light), 6px 6px 13px color-mix(in srgb, var(--egp-sh-dark) 36%, transparent);
  --mg-shadow-egp-raise-lg: -9px -9px 18px var(--egp-sh-light), 9px 9px 18px color-mix(in srgb, var(--egp-sh-dark) 40%, transparent);
  --mg-shadow-egp-raise-sm: -4px -4px 8px var(--egp-sh-light), 4px 4px 8px color-mix(in srgb, var(--egp-sh-dark) 32%, transparent);
  --mg-shadow-egp-press: inset -3px -3px 6px var(--egp-sh-light), inset 3px 3px 7px color-mix(in srgb, var(--egp-sh-dark) 44%, transparent);
  --mg-shadow-egp-press-sm: inset -2px -2px 4px var(--egp-sh-light), inset 2px 2px 5px color-mix(in srgb, var(--egp-sh-dark) 42%, transparent);
  --mg-shadow-egp-flat: -2px -2px 5px var(--egp-sh-light), 2px 2px 5px color-mix(in srgb, var(--egp-sh-dark) 30%, transparent);
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  color: var(--mg-color-ink);
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
  animation: epfade var(--mg-duration-normal) var(--mg-ease-standard);
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
  border-top: 1px solid color-mix(in srgb, var(--mg-color-muted) 18%, transparent);
}
.egp-icon {
  display: inline-block;
  white-space: nowrap;
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
  font-weight: 700;
  font-size: 12px;
  line-height: 1.1;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--mg-color-muted);
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
  background: color-mix(in srgb, var(--mg-color-muted) 55%, transparent);
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
  border-radius: var(--mg-radius-sm);
  padding: 0;
  display: grid;
  place-items: center;
  color: var(--mtx);
  background: linear-gradient(150deg, var(--mt), var(--mb));
  box-shadow: var(--mg-shadow-egp-raise-sm);
  opacity: 0.5;
  filter: saturate(0.7);
  transition:
    transform var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    filter var(--mg-duration-fast) var(--mg-ease-standard);
}
.mcell .egp-icon {
  font-size: 15px;
  opacity: 0.92;
}
.mcell:hover {
  opacity: 0.88;
  filter: saturate(0.9);
  transform: translateY(-1.5px);
  box-shadow: var(--mg-shadow-egp-raise);
}
.mcell.active {
  --mg-shadow-egp-mini-active:
    var(--mg-shadow-egp-raise-sm),
    0 0 0 2.5px color-mix(in srgb, var(--mb) 55%, white);
  opacity: 1;
  filter: none;
  transform: translateY(-1.5px);
  box-shadow: var(--mg-shadow-egp-mini-active);
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
  border-radius: var(--mg-radius-lg);
  padding: 16px 18px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(150deg, var(--qt), var(--qb));
  color: var(--qtx);
  box-shadow: var(--mg-shadow-egp-raise);
  transition:
    transform var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard);
}
.qbtn:hover {
  transform: translateY(-2px);
  box-shadow: var(--mg-shadow-egp-raise-lg);
}
.qbtn:active {
  transform: translateY(0);
  box-shadow: var(--mg-shadow-egp-press);
}
.qbtn .egp-icon {
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
  font-weight: 700;
  font-size: 13px;
  line-height: 1.15;
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
  --mg-shadow-egp-badge: 0 1px 2px color-mix(in srgb, var(--mg-color-ink) 12%, transparent);
  position: absolute;
  top: 14px;
  right: 15px;
  min-width: 23px;
  height: 23px;
  border-radius: var(--mg-radius-pill);
  background: color-mix(in srgb, white 55%, transparent);
  color: var(--qtx);
  font-weight: 700;
  font-size: 12px;
  line-height: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  box-shadow: var(--mg-shadow-egp-badge);
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
  border-radius: var(--mg-radius-md);
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
  box-shadow: var(--mg-shadow-egp-raise-sm);
  transition:
    transform var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    background var(--mg-duration-fast) var(--mg-ease-standard);
}
.etile:hover {
  transform: translateY(-2px);
  box-shadow: var(--mg-shadow-egp-raise);
}
.etile.sel {
  --mg-shadow-egp-tile-sel:
    var(--mg-shadow-egp-raise-sm),
    inset 0 0 0 1.5px color-mix(in srgb, var(--c) 55%, transparent);
  background: linear-gradient(
    150deg,
    color-mix(in srgb, var(--c) 26%, white),
    color-mix(in srgb, var(--c) 42%, white)
  );
  box-shadow: var(--mg-shadow-egp-tile-sel);
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
  font-weight: 700;
  font-size: 10px;
  line-height: 1.25;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--c) 55%, var(--mg-color-ink));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.etile.sel .etname {
  color: color-mix(in srgb, var(--c) 70%, var(--mg-color-ink));
}
.etaux {
  font-style: italic;
  font-weight: 400;
  font-size: 9.5px;
  line-height: 1.2;
  color: var(--mg-color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.etnew {
  --mg-shadow-egp-new: 0 0 0 3px color-mix(in srgb, var(--c) 20%, transparent);
  position: absolute;
  top: 9px;
  right: 10px;
  width: 6px;
  height: 6px;
  border-radius: var(--mg-radius-pill);
  background: var(--c);
  box-shadow: var(--mg-shadow-egp-new);
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
  border-radius: var(--mg-radius-sm);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  box-shadow: var(--mg-shadow-egp-press-sm);
  overflow: hidden;
}
.hfillbar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--fw, 0%);
  border-radius: var(--mg-radius-sm);
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 62%, white), var(--c));
  transition: width var(--mg-duration-normal) cubic-bezier(0.4, 0, 0.2, 1);
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
  --mg-shadow-egp-thumb:
    var(--mg-shadow-egp-raise-sm),
    inset 0 1px 1.5px color-mix(in srgb, white 50%, transparent);
  --mg-shadow-egp-thumb-hover:
    var(--mg-shadow-egp-raise),
    inset 0 1px 1.5px color-mix(in srgb, white 50%, transparent);
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
  /* pełne koło — gałka nosi maskowaną twarz, radius organiczny by z nią walczył */
  border-radius: var(--mg-radius-pill);
  background: radial-gradient(
    circle at 34% 30%,
    color-mix(in srgb, var(--c) 38%, white),
    color-mix(in srgb, var(--c) 85%, white)
  );
  display: grid;
  place-items: center;
  box-shadow: var(--mg-shadow-egp-thumb);
  transition: left var(--mg-duration-normal) cubic-bezier(0.4, 0, 0.2, 1);
}
.hthumb:hover {
  box-shadow: var(--mg-shadow-egp-thumb-hover);
}
.fico {
  width: 20px;
  height: 20px;
  display: block;
  pointer-events: none;
  background: color-mix(in srgb, var(--c) 55%, var(--mg-color-ink));
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
  --mg-shadow-egp-ttip: 0 16px 34px -10px color-mix(in srgb, var(--mg-color-ink) 60%, transparent);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  width: 210px;
  z-index: 60;
  background: var(--mg-color-inverse);
  color: var(--mg-color-inverse-ink);
  border-radius: var(--mg-radius-md);
  padding: 11px 13px;
  box-shadow: var(--mg-shadow-egp-ttip);
  pointer-events: none;
}
.ttip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 7px solid transparent;
  border-top-color: var(--mg-color-inverse);
}
.ttip-n {
  font-weight: 700;
  font-size: 13px;
  line-height: normal;
  margin-bottom: 5px;
}
.ttip-ap {
  font-weight: 400;
  font-size: 11px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--mg-color-inverse-ink) 85%, var(--mg-color-inverse));
}
.ttip-w {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}
.ttip-w span {
  font-weight: 500;
  font-size: 10px;
  line-height: normal;
  background: color-mix(in srgb, var(--mg-color-inverse-ink) 14%, transparent);
  color: var(--mg-color-inverse-ink);
  padding: 3px 7px;
  border-radius: var(--mg-radius-sm);
}

/* ---- stopka ---- */
.f-lab {
  font-weight: 700;
  font-size: 10px;
  line-height: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mg-color-muted);
  flex: none;
}
.f-empty {
  font-weight: 400;
  font-size: 12px;
  line-height: normal;
  color: var(--mg-color-muted);
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
  border-radius: var(--mg-radius-pill);
  white-space: nowrap;
  flex: none;
  color: white;
  font-weight: 600;
  font-size: 12px;
  line-height: normal;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 86%, white), var(--c));
  box-shadow: var(--mg-shadow-egp-raise-sm);
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
  border-radius: var(--mg-radius-pill);
  cursor: pointer;
  background: color-mix(in srgb, white 28%, transparent);
  color: white;
  font-size: 9px;
  display: grid;
  place-items: center;
}
.fx:hover {
  background: color-mix(in srgb, white 50%, transparent);
}
/* ---- wariant wąski: 3 kolumny kafli, 4 rzędy (decyzja usera 2026-07-10) ---- */
@container (max-width: 699px) {
  .etgrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
