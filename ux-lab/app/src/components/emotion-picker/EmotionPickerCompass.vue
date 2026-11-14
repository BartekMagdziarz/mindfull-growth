<!--
  LAB · EmotionPickerCompass — wariant D rundy „wypukły picker emocji” (2026-11-14).

  Kafle w anatomii kafla Kompasu z Dzisiaj (papier + cienka ramka + cień kontrolki,
  ikona w okrągłym polu nad nazwą). Wszystkie kafle mają ten sam kolor, karta się nie
  tintuje — kolor ćwiartki niesie tylko pole ikony (i kropki natężenia).

  Natężenie = kropki jak przy wykonaniu zadania (organiczne, wciśnięte, wypełnione
  kolorem ćwiartki). Na hover pojawia się „+”: dodaje kropkę (pierwsza zaznacza też
  emocję). Klik w ostatnią kropkę ją zdejmuje, w wcześniejszą — ustawia poziom.
  Klik w kafel = zaznacz / odznacz.

  prop dots:
    row    — ikona + kropki jako jeden pasek wyśrodkowany w kaflu
    center — ikona stoi w środku, kropki dokładają się na zmianę z prawej i z lewej
    below  — ikona sama na górze, kropki w osobnym rzędzie pod nazwą; na hover zamiast „+”
             pokazuje się 5 pustych miejsc i klik w miejsce ustawia poziom (runda 3)
  Runda 4: wybrany kafel zostaje wypukły i bez konturu; prop examples = dwa przykładowe słowa
  na niewybranych kaflach; licznik ćwiartki = kropki.
  Runda 3 (2026-11-14): wybór = sam kolor (bez ramki), większa nazwa i ikona bliżej górnej
  krawędzi, 4 kolumny od 600 px (dziennik emocji), 3 poniżej (edytor dziennika).
-->
<template>
  <div class="egc-wrap">
    <div class="ec" :class="`ec--dots-${props.dots}`">
      <div class="ec-head">
        <div v-if="!activeQuad" class="oh">
          <div class="oh-t">{{ props.label ?? t('emotionGroups.ui.title') }}</div>
          <div v-if="chips.length" class="oh-chips">
            <span
              v-for="c in chips"
              :key="c.slug"
              class="fchip"
              :style="{ '--chip': c.bg }"
              :title="c.title"
            >
              {{ c.name }}
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
        <div v-else class="dh">
          <div class="dh-title">
            <button type="button" class="dh-home oh-t" @click="activeQuad = null">
              {{ props.label ?? t('emotionGroups.ui.title') }}
            </button>
            <span class="dh-div"></span>
            <span class="oh-t">{{ quadLabel(activeQuad) }}</span>
          </div>
          <div class="dh-sp"></div>
          <div class="mini">
            <button
              v-for="q in OVERVIEW_ORDER"
              :key="q"
              type="button"
              class="mcell"
              :class="{ active: q === activeQuad }"
              :style="quadVars(q)"
              :title="quadLabel(q)"
              @click="activeQuad = q"
            >
              <span class="egp-icon" aria-hidden="true" :style="{ maskImage: quadrantMask(q) }"></span>
              <span v-if="q !== activeQuad && quadSelCount(q) > 0" class="mdot" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="ec-stage">
        <!-- przegląd: cztery kafle Kompasu -->
        <div v-if="!activeQuad" key="overview" class="cq-grid">
          <button
            v-for="q in OVERVIEW_ORDER"
            :key="q"
            type="button"
            class="cq"
            :style="quadVars(q)"
            @click="activeQuad = q"
          >
            <span class="cq-disc">
              <span class="egp-icon" aria-hidden="true" :style="{ maskImage: quadrantMask(q) }"></span>
            </span>
            <span class="cq-name">
              <span>{{ energyLabel(q) }}</span>
              <span>{{ pleasantnessLabel(q) }}</span>
            </span>
            <span v-if="quadSelCount(q) > 0" class="cq-dots" aria-hidden="true">
              <i v-for="n in quadSelCount(q)" :key="n"></i>
            </span>
          </button>
        </div>

        <!-- ćwiartka: kafle grup -->
        <div v-else :key="activeQuad" class="ct-grid" :style="quadVars(activeQuad)">
          <div
            v-for="g in activeGroups"
            :key="g.slug"
            class="ct"
            :class="{ sel: g.slug in selMap, hov: hovered === g.slug }"
            role="button"
            tabindex="0"
            :aria-pressed="g.slug in selMap"
            :aria-label="t('emotionGroups.ui.selectGroup', { name: groupName(g.slug) })"
            @click="toggle(g.slug)"
            @keydown.enter.prevent="toggle(g.slug)"
            @keydown.space.prevent="toggle(g.slug)"
            @mouseenter="hovered = g.slug"
            @mouseleave="hovered = null"
          >
            <!-- pasek: ikona + kropki (row / center) albo sama ikona (below) -->
            <div class="ct-bar">
              <template v-if="props.dots === 'center'">
                <span class="ct-side ct-side--left">
                  <button
                    v-if="canAdd(g.slug) && nextSide(g.slug) === 'left'"
                    type="button"
                    class="ct-plus"
                    :aria-label="plusLabel(g.slug)"
                    @click.stop="add(g.slug)"
                  >
                    +
                  </button>
                  <button
                    v-for="i in leftDots(g.slug)"
                    :key="`l${i}`"
                    type="button"
                    class="ct-dot"
                    :aria-label="dotLabel(g.slug, i)"
                    @click.stop="dotClick(g.slug, i)"
                  ></button>
                </span>
                <span class="ct-disc" :style="{ '--fi': faceMask(g.slug) }"><span class="fico"></span></span>
                <span class="ct-side ct-side--right">
                  <button
                    v-for="i in rightDots(g.slug)"
                    :key="`r${i}`"
                    type="button"
                    class="ct-dot"
                    :aria-label="dotLabel(g.slug, i)"
                    @click.stop="dotClick(g.slug, i)"
                  ></button>
                  <button
                    v-if="canAdd(g.slug) && nextSide(g.slug) === 'right'"
                    type="button"
                    class="ct-plus"
                    :aria-label="plusLabel(g.slug)"
                    @click.stop="add(g.slug)"
                  >
                    +
                  </button>
                </span>
              </template>
              <span v-else class="ct-run">
                <span class="ct-disc" :style="{ '--fi': faceMask(g.slug) }"><span class="fico"></span></span>
                <template v-if="props.dots === 'row'">
                  <button
                    v-for="i in level(g.slug)"
                    :key="i"
                    type="button"
                    class="ct-dot"
                    :aria-label="dotLabel(g.slug, i)"
                    @click.stop="dotClick(g.slug, i)"
                  ></button>
                </template>
                <button
                  v-if="canAdd(g.slug) && props.dots !== 'below'"
                  type="button"
                  class="ct-plus ct-plus--hang"
                  :aria-label="plusLabel(g.slug)"
                  @click.stop="add(g.slug)"
                >
                  +
                </button>
              </span>
            </div>

            <span class="ct-name">{{ shortName(g.slug) }}</span>

            <span
              v-if="props.dots === 'below' && props.examples && hovered !== g.slug && !(g.slug in selMap)"
              class="ct-aux"
            >
              {{ auxLine(g) }}
            </span>
            <div
              v-else-if="props.dots === 'below'"
              class="ct-dots-below"
              @mouseleave="slotHover = 0"
            >
              <button
                v-for="i in hovered === g.slug ? 5 : level(g.slug)"
                :key="i"
                type="button"
                class="ct-dot"
                :class="{
                  'is-empty': i > level(g.slug),
                  'is-preview': hovered === g.slug && slotHover > 0 && i <= slotHover,
                  'is-dimmed': hovered === g.slug && slotHover > 0 && i > slotHover,
                }"
                :aria-label="dotLabel(g.slug, i)"
                @mouseenter="slotHover = i"
                @click.stop="dotClick(g.slug, i)"
              ></button>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import boltIcon from '@/assets/emotion-quadrants/bolt.svg'
import sunIcon from '@/assets/emotion-quadrants/sun.svg'
import cloudIcon from '@/assets/emotion-quadrants/cloud.svg'
import sparklesIcon from '@/assets/emotion-quadrants/sparkles.svg'
import type { Quadrant } from '@/domain/emotion'
import {
  GROUPS_BY_QUADRANT,
  type EmotionGroup,
  type EmotionGroupSelection,
  type GroupIntensity,
} from '@/domain/emotionGroups'

const props = withDefaults(
  defineProps<{ label?: string; dots?: 'row' | 'center' | 'below'; examples?: boolean }>(),
  { label: undefined, dots: 'row', examples: false }
)
const selections = defineModel<EmotionGroupSelection[]>({ default: () => [] })
const activeQuad = defineModel<Quadrant | null>('quadrant', { default: null })
const { t } = useT()

const OVERVIEW_ORDER: Quadrant[] = [
  'high-energy-low-pleasantness',
  'high-energy-high-pleasantness',
  'low-energy-low-pleasantness',
  'low-energy-high-pleasantness',
]
const quadrantIcons: Record<Quadrant, string> = {
  'high-energy-low-pleasantness': boltIcon,
  'high-energy-high-pleasantness': sunIcon,
  'low-energy-low-pleasantness': cloudIcon,
  'low-energy-high-pleasantness': sparklesIcon,
}
function quadrantMask(q: Quadrant): string {
  return `url("${quadrantIcons[q]}")`
}
function faceMask(slug: string): string {
  return `url("${new URL(`../../../../../src/assets/emotion-faces/${slug}.svg`, import.meta.url).href}")`
}
/** Paleta ćwiartek z tokenów systemu (src/styles/tokens.css). */
function quadVars(q: Quadrant): Record<string, string> {
  const v = (s: string) => `var(--color-quadrant-${q}-${s})`
  return {
    '--q-top': v('top'),
    '--q-bottom': v('bottom'),
    '--q-sel': v('selected'),
    '--q-text': v('text'),
    '--q-border': v('border'),
  }
}

const activeGroups = computed<EmotionGroup[]>(() =>
  activeQuad.value ? GROUPS_BY_QUADRANT[activeQuad.value] : []
)

// ---- stan wyboru ----
const selMap = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const s of selections.value) m[s.emotionId] = s.intensity ?? 0
  return m
})
function writeSel(slug: string, lvl: number | null) {
  const rest = selections.value.filter(s => s.emotionId !== slug)
  if (lvl === null) {
    selections.value = rest
    return
  }
  const entry: EmotionGroupSelection =
    lvl > 0 ? { emotionId: slug, intensity: lvl as GroupIntensity } : { emotionId: slug }
  const idx = selections.value.findIndex(s => s.emotionId === slug)
  selections.value =
    idx >= 0 ? selections.value.map(s => (s.emotionId === slug ? entry : s)) : [...rest, entry]
}
function toggle(slug: string) {
  writeSel(slug, slug in selMap.value ? null : 0)
}
function remove(slug: string) {
  writeSel(slug, null)
}
function level(slug: string): number {
  return selMap.value[slug] ?? 0
}
function canAdd(slug: string): boolean {
  return level(slug) < 5
}
function add(slug: string) {
  writeSel(slug, Math.min(5, level(slug) + 1))
}
function dotClick(slug: string, i: number) {
  writeSel(slug, i === level(slug) ? i - 1 : i)
}

// ---- układ „center”: kropki 1,3,5 z prawej, 2,4 z lewej (od ikony na zewnątrz) ----
function rightDots(slug: string): number[] {
  return [1, 3, 5].filter(i => i <= level(slug))
}
function leftDots(slug: string): number[] {
  // od zewnątrz do ikony, żeby kolejne kropki rosły na zewnątrz
  return [4, 2].filter(i => i <= level(slug))
}
function nextSide(slug: string): 'left' | 'right' {
  return (level(slug) + 1) % 2 === 1 ? 'right' : 'left'
}

// ---- prezentacja ----
const hovered = ref<string | null>(null)
/** below: na którym pustym miejscu stoi kursor (podgląd poziomu); 0 = żadnym */
const slotHover = ref(0)
function groupName(slug: string): string {
  return t(`emotionGroups.groups.${slug}.name`)
}
function shortName(slug: string): string {
  return groupName(slug).split(' · ')[0]
}
/** Dwa przykładowe słowa grupy (jak kursywa w obecnym pickerze). */
function auxLine(g: EmotionGroup): string {
  return g.auxIds.map(id => t(`emotions.${id}.name`)).join(' · ')
}
function dotLabel(slug: string, i: number): string {
  return t('emotionGroups.ui.intensityOf', { name: groupName(slug), level: i })
}
function plusLabel(slug: string): string {
  return t('emotionGroups.ui.intensityOf', { name: groupName(slug), level: level(slug) + 1 })
}
function energyLabel(q: Quadrant): string {
  return q.startsWith('high')
    ? t('emotionViews.selector.energyLabels.high')
    : t('emotionViews.selector.energyLabels.low')
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
  return GROUPS_BY_QUADRANT[q].filter(g => g.slug in selMap.value).length
}
function quadOf(slug: string): Quadrant | null {
  for (const q of OVERVIEW_ORDER) if (GROUPS_BY_QUADRANT[q].some(g => g.slug === slug)) return q
  return null
}
const chips = computed(() =>
  selections.value.map(s => {
    const q = quadOf(s.emotionId)
    return {
      slug: s.emotionId,
      name: shortName(s.emotionId),
      bg: q ? `var(--color-quadrant-${q}-bottom)` : 'var(--mg-color-mist)',
      title: s.intensity
        ? t('emotionGroups.ui.intensityOf', { name: groupName(s.emotionId), level: s.intensity })
        : groupName(s.emotionId),
    }
  })
)
</script>

<style scoped>
.egc-wrap {
  container-type: inline-size;
  width: 100%;
}
.ec {
  display: flex;
  flex-direction: column;
  color: var(--mg-color-ink);
  --dot: 1rem; /* jak kropki zadania w polu ścieżki */
  --disc: 2.6rem;
}
.ec-head {
  min-height: 44px;
  display: flex;
  align-items: flex-start;
  padding-bottom: 6px;
}
.ec-stage > div {
  animation: ecfade var(--mg-duration-normal) var(--mg-ease-standard);
}
@keyframes ecfade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.egp-icon {
  display: inline-block;
  width: 32px;
  height: 32px;
  background: currentColor;
  mask-position: center;
  mask-size: contain;
  mask-repeat: no-repeat;
}

/* ---- nagłówek ---- */
.oh {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 14px;
  row-gap: 6px;
  margin-top: -6px;
  min-height: 26px;
}
.oh-t {
  font-weight: var(--mg-weight-strong);
  font-size: var(--mg-font-size-xs);
  line-height: 1.1;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--mg-color-muted);
}
.oh-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 10px;
  border-radius: var(--mg-radius-pill);
  white-space: nowrap;
  font-weight: var(--mg-weight-label);
  font-size: var(--mg-font-size-xs);
  background: var(--chip);
}
.fx {
  width: 17px;
  height: 17px;
  border: 0;
  border-radius: var(--mg-radius-pill);
  cursor: pointer;
  background: var(--mg-color-veil);
  color: inherit;
  font-size: var(--mg-font-size-xs);
  display: grid;
  place-items: center;
}
.dh {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
}
.dh-sp {
  flex: 1;
}
.dh-title {
  align-self: flex-start;
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
  background: color-mix(in srgb, var(--mg-color-muted) 55%, transparent);
}
.mini {
  display: grid;
  grid-template-columns: repeat(4, 26px);
  gap: 5px;
  align-self: flex-start;
  margin-top: -6px;
}
.mcell {
  position: relative;
  width: 26px;
  height: 26px;
  border: 0;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  border-radius: var(--mg-radius-organic-a);
  color: var(--q-text);
  background: var(--q-top);
  box-shadow: var(--mg-shadow-control);
  transition:
    translate var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard);
}
.mcell .egp-icon {
  width: 16px;
  height: 16px;
}
.mcell:hover {
  translate: 0 var(--mg-lift-hover);
  box-shadow: var(--mg-shadow-control-hover);
}
.mcell.active {
  background: var(--q-bottom);
  translate: none;
  box-shadow: var(--mg-shadow-inset-sm);
}
.mdot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 6px;
  height: 6px;
  border-radius: var(--mg-radius-pill);
  background: var(--q-sel);
}

/* ---- kafel Kompasu: wspólna skóra ćwiartek i grup ---- */
.cq,
.ct {
  position: relative;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  box-shadow: var(--mg-shadow-control);
  cursor: pointer;
  transition:
    background var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.cq:hover,
.ct:hover {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.cq:active {
  box-shadow: var(--mg-shadow-inset-sm);
  translate: none;
}

/* ---- przegląd ---- */
.cq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(150px, 1fr);
  gap: 14px;
}
.cq {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 18px;
  text-align: center;
}
.cq-disc {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--q-bottom);
  color: var(--q-text);
}
.cq-disc .egp-icon {
  width: 28px;
  height: 28px;
}
.cq-name {
  display: flex;
  flex-direction: column;
  font-weight: var(--mg-weight-title);
  font-size: var(--mg-font-size-sm);
  line-height: 1.25;
}
.cq-dots {
  position: absolute;
  top: 14px;
  right: 14px;
  max-width: 40%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 3px;
}
/* jedna kropka = jedna wybrana emocja w tej ćwiartce; język kropek natężenia */
.cq-dots > i {
  width: 0.8rem;
  height: 0.8rem;
  display: grid;
  place-items: center;
  border-radius: var(--mg-radius-organic-a);
  background: var(--q-bottom);
  box-shadow: var(--mg-shadow-inset-sm);
}
.cq-dots > i:nth-child(even) {
  border-radius: var(--mg-radius-organic-b);
}
.cq-dots > i::after {
  content: '';
  width: 56%;
  aspect-ratio: 1;
  border-radius: var(--mg-radius-organic-c);
  background: var(--q-sel);
}

/* ---- kafle grup ---- */
.ct-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
@container (max-width: 599px) {
  .ct-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.ct {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 10px;
  text-align: center;
  outline: none;
}
.ct:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 3px;
}
.ct.sel {
  /* Runda 4: wybór = sam kolor ćwiartki. Kafel zostaje wypukły (cień kontrolki,
     nie wciśnięty — wciśnięty wyglądał płasko), a ramka znika w wypełnieniu,
     żeby na pastelu nie rysował się kontur. */
  --sel-fill: color-mix(in srgb, var(--q-top) 85%, var(--q-bottom));
  background: var(--sel-fill);
  border-color: var(--sel-fill);
}
.ct-name {
  font-weight: var(--mg-weight-title);
  font-size: var(--mg-font-size-sm);
  line-height: 1.25;
  max-width: 100%;
  overflow-wrap: anywhere;
}

/* pole ikony: jedyny kolor kafla */
.ct-disc {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--disc);
  height: var(--disc);
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--q-top);
  transition: background var(--mg-duration-fast) var(--mg-ease-standard);
}
.ct.sel .ct-disc {
  background: color-mix(in srgb, var(--q-bottom) 70%, var(--q-sel));
}
.fico {
  width: 26px;
  height: 26px;
  background: var(--q-text);
  -webkit-mask-image: var(--fi);
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-image: var(--fi);
  mask-position: center;
  mask-size: contain;
  mask-repeat: no-repeat;
}

/* kropka natężenia — język kropek zadania (organiczna, wciśnięta, wypełniona) */
.ct-dot {
  flex: none;
  position: relative;
  display: grid;
  place-items: center;
  width: var(--dot);
  height: var(--dot);
  padding: 0;
  border: 0;
  cursor: pointer;
  border-radius: var(--mg-radius-organic-a);
  background: var(--q-bottom);
  box-shadow: var(--mg-shadow-inset-sm);
}
.ct-dot:nth-child(even) {
  border-radius: var(--mg-radius-organic-b);
}
.ct-dot::after {
  content: '';
  width: 56%;
  aspect-ratio: 1;
  border-radius: var(--mg-radius-organic-c);
  background: var(--q-sel);
  transform: rotate(-2deg);
}
.ct-dot:hover::after {
  opacity: 0.55;
}
/* puste miejsce (below, na hover): zagłębienie bez wypełnienia */
.ct-dot.is-empty {
  background: var(--mg-color-mist);
}
.ct-dot.is-empty::after {
  opacity: 0;
}
/* podgląd poziomu pod kursorem */
.ct-dot.is-preview::after {
  opacity: 0.55;
}
.ct-dot.is-preview {
  background: var(--q-bottom);
}
.ct-dot.is-dimmed:not(.is-empty)::after {
  opacity: 0.2;
}

/* plus: pojawia się tylko pod kursorem / przy fokusie */
.ct-plus {
  flex: none;
  width: var(--dot);
  height: var(--dot);
  padding: 0;
  border: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-mist);
  color: var(--q-text);
  font-weight: var(--mg-weight-strong);
  font-size: var(--mg-font-size-xs);
  line-height: 1;
  box-shadow: var(--mg-shadow-control);
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.ct.hov .ct-plus,
.ct:focus-within .ct-plus {
  opacity: 1;
}
.ct-plus:hover {
  background: var(--mg-color-paper);
}

/* ---- układy paska ---- */
.ct-bar {
  width: 100%;
  min-height: var(--disc);
  display: flex;
  justify-content: center;
}
.ct-run {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
/* row: ikona + kropki wyśrodkowane jako całość; plus wisi poza paskiem, więc
   jego pojawienie się nie przesuwa kafla */
.ec--dots-row .ct-disc {
  margin-right: 3px;
}
.ct-plus--hang {
  position: absolute;
  left: calc(100% + 4px);
  top: 50%;
  translate: 0 -50%;
}
/* center: ikona zawsze w osi kafla, kropki rosną na zmianę w prawo i w lewo */
.ec--dots-center .ct-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}
.ct-side {
  display: flex;
  align-items: center;
  gap: 3px;
}
.ct-side--left {
  justify-content: flex-end;
}
.ct-side--right {
  justify-content: flex-start;
}
/* below: sama ikona na górze, kropki w rzędzie pod nazwą (zarezerwowany rząd) */
/* przykłady na niewybranym kaflu: ten sam rząd co kropki, więc kafel nie skacze */
.ct-aux {
  max-width: 100%;
  min-height: var(--dot);
  font-style: italic;
  font-size: var(--mg-font-size-xs);
  line-height: var(--dot);
  color: var(--mg-color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ct-dots-below {
  min-height: var(--dot);
  display: flex;
  justify-content: center;
  gap: 4px;
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
  text-align: left;
}
.ttip-n {
  font-weight: var(--mg-weight-strong);
  font-size: var(--mg-font-size-sm);
  margin-bottom: 5px;
}
.ttip-ap {
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
}
.ttip-w {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}
.ttip-w span {
  font-size: var(--mg-font-size-xs);
  background: color-mix(in srgb, var(--mg-color-inverse-ink) 14%, transparent);
  padding: 3px 7px;
  border-radius: var(--mg-radius-sm);
}
button:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .ec-stage > div {
    animation: none;
  }
  .cq,
  .ct,
  .mcell {
    transition: none;
  }
}
</style>
