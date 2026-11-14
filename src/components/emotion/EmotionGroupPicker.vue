<!--
  EmotionGroupPicker — picker emocji, wariant D „kafle Kompasu” (UX Lab
  /concepts/emotion-picker-raised, rundy 1–4, wdrożony 2026-11-14).

  Dwupoziomowy: przegląd 4 ćwiartek (2×2) → drill-down z kaflami 45 grup
  (10–12 na ćwiartkę). Kafle mają anatomię kafla Kompasu z Dzisiaj: papier,
  cienka ramka, cień kontrolki, ikona w okrągłym polu nad nazwą. Kolor ćwiartki
  niesie tylko pole ikony, kropki natężenia i wypełnienie WYBRANEGO kafla —
  karta-gospodarz się nie tintuje. Wybrany kafel zostaje wypukły (ADR
  2026-11-14 „Wybrany kafel emocji zostaje wypukły”).

  Natężenie = kropki pod nazwą (język kropek zadania). Na hover/fokus kafla
  pojawia się 5 pustych miejsc; klik w miejsce ustawia poziom (na niewybranym
  kaflu też zaznacza), klik w obecny poziom zdejmuje jedną kropkę. Klik w kafel
  = zaznacz bez natężenia / odznacz. Strzałki ←/→ na kaflu zmieniają poziom.
  Niewybrany kafel w spoczynku pokazuje w tym rzędzie dwa przykładowe słowa.

  Wybrane emocje: badge obok tytułu na przeglądzie (bez osobnego pola);
  w ćwiartce widać je na kaflach, a kropka na mini-przycisku innej ćwiartki
  mówi, że tam też coś wybrano. Licznik na kaflu ćwiartki = kropki.

  Opis grupy (ocena + słowa): pod kursorem / przy fokusie w prawym górnym rogu
  kafla pojawia się cichy „?” (język ExerciseStepWhy), klik otwiera jasną notkę
  w tonie papieru (feedback usera 2026-11-14 — ciemny dymek był zbyt agresywny).

  Kontrakt:
    v-model            → EmotionGroupSelection[]
    v-model:quadrant   → Quadrant | null (otwarta ćwiartka)
    props: label?
  Wariant wąski (kontener < 600px, edytor dziennika): 3 kolumny kafli.
-->
<template>
  <div class="egp-wrap">
    <div class="ep">
      <div class="ep-head">
        <div v-if="!activeQuad" class="oh">
          <div class="oh-t">{{ props.label ?? t('emotionGroups.ui.title') }}</div>
          <div v-if="chips.length" class="oh-chips">
            <span
              v-for="c in chips"
              :key="c.slug"
              class="fchip"
              :style="quadVars(c.quadrant)"
              :title="c.title"
              :data-testid="`egp-chip-${c.slug}`"
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
            <button
              type="button"
              class="dh-home oh-t"
              data-testid="egp-home"
              @click="activeQuad = null"
            >
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
              :aria-label="quadLabel(q)"
              :aria-pressed="q === activeQuad"
              :data-testid="`egp-quadrant-mini-${q}`"
              @click="activeQuad = q"
            >
              <span
                class="egp-icon"
                aria-hidden="true"
                :style="{ maskImage: quadrantMask(q) }"
              ></span>
              <span
                v-if="q !== activeQuad && quadSelCount(q) > 0"
                class="mdot"
                aria-hidden="true"
              ></span>
            </button>
          </div>
        </div>
      </div>

      <div class="ep-stage">
        <!-- przegląd: cztery kafle ćwiartek -->
        <div v-if="!activeQuad" key="overview" class="cq-grid">
          <button
            v-for="q in OVERVIEW_ORDER"
            :key="q"
            type="button"
            class="cq"
            :style="quadVars(q)"
            :data-testid="`egp-quadrant-${q}`"
            @click="activeQuad = q"
          >
            <span class="cq-disc">
              <span
                class="egp-icon"
                aria-hidden="true"
                :style="{ maskImage: quadrantMask(q) }"
              ></span>
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
            :class="{ sel: g.slug in selMap, 'has-note': helpOpen === g.slug }"
            role="button"
            tabindex="0"
            :aria-pressed="g.slug in selMap"
            :aria-label="tileLabel(g.slug)"
            :data-testid="`egp-tile-${g.slug}`"
            @click="toggle(g.slug)"
            @keydown.enter.prevent="toggle(g.slug)"
            @keydown.space.prevent="toggle(g.slug)"
            @keydown.left.prevent="nudge(g.slug, -1)"
            @keydown.right.prevent="nudge(g.slug, 1)"
            @keydown.escape="helpOpen = null"
            @mouseenter="open = g.slug"
            @mouseleave="leave(g.slug)"
            @focusin="open = g.slug"
            @focusout="focusOut(g.slug, $event)"
          >
            <!-- „?” w rogu: widać pod kursorem / przy fokusie, klik otwiera notkę z opisem -->
            <button
              v-if="open === g.slug || helpOpen === g.slug"
              type="button"
              class="ct-help"
              :aria-expanded="helpOpen === g.slug"
              :aria-label="t('emotionGroups.ui.describeGroup', { name: shortName(g.slug) })"
              :title="t('emotionGroups.ui.describeGroup', { name: shortName(g.slug) })"
              :data-testid="`egp-help-${g.slug}`"
              @click.stop="helpOpen = helpOpen === g.slug ? null : g.slug"
              @keydown.escape.stop.prevent="helpOpen = null"
            >
              <AppIcon name="help" class="ct-help__icon" />
            </button>
            <div
              v-if="helpOpen === g.slug"
              role="note"
              class="ct-note"
              :data-testid="`egp-note-${g.slug}`"
              @click.stop
            >
              <span class="ct-note__name">{{ groupName(g.slug) }}</span>
              <span>{{ t(`emotionGroups.groups.${g.slug}.appraisal`) }}</span>
              <span class="ct-note__words">
                {{ g.wordIds.map(w => t(`emotions.${w}.name`)).join(' · ') }}
              </span>
            </div>
            <span class="ct-disc" :style="{ '--fi': faceMask(g.slug) }">
              <span class="fico"></span>
            </span>
            <span class="ct-name">{{ shortName(g.slug) }}</span>

            <span v-if="open !== g.slug && !(g.slug in selMap)" class="ct-aux">
              {{ auxLine(g) }}
            </span>
            <div v-else class="ct-dots" @mouseleave="slotHover = 0">
              <button
                v-for="i in open === g.slug ? 5 : level(g.slug)"
                :key="i"
                type="button"
                tabindex="-1"
                class="ct-dot"
                :class="{
                  'is-empty': i > level(g.slug),
                  'is-preview': open === g.slug && slotHover > 0 && i <= slotHover,
                  'is-dimmed': open === g.slug && slotHover > 0 && i > slotHover,
                }"
                :title="scaleLabel(i)"
                :aria-label="
                  t('emotionGroups.ui.intensityOf', { name: groupName(g.slug), level: i })
                "
                @mouseenter="slotHover = i"
                @click.stop="dotClick(g.slug, i)"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
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

const props = defineProps<{ label?: string }>()
const selections = defineModel<EmotionGroupSelection[]>({ default: () => [] })
const activeQuad = defineModel<Quadrant | null>('quadrant', { default: null })
const { t } = useT()

// układ przeglądu 2×2 wg cyrkumpleksu: HEHP w prawym górnym rogu
// (rząd 1: HELP · HEHP, rząd 2: LELP · LEHP) — feedback usera 2026-07-10
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
// twarze grup: assets/emotion-faces/<slug>.svg jako maski CSS.
// UWAGA: małe SVG Vite inlinuje jako data: URI z SUROWYMI apostrofami w środku,
// więc wartość url() MUSI być w cudzysłowach (zdiagnozowane 2026-07-11).
function faceMask(slug: string): string {
  return `url("${new URL(`../../assets/emotion-faces/${slug}.svg`, import.meta.url).href}")`
}
/** Paleta ćwiartki z tokenów (src/styles/tokens.css) jako lokalne zmienne --q-*. */
function quadVars(q: Quadrant | null): Record<string, string> {
  if (!q) return {}
  const v = (suffix: string) => `var(--color-quadrant-${q}-${suffix})`
  return {
    '--q-top': v('top'),
    '--q-bottom': v('bottom'),
    '--q-sel': v('selected'),
    '--q-text': v('text'),
  }
}

const activeGroups = computed<EmotionGroup[]>(() =>
  activeQuad.value ? GROUPS_BY_QUADRANT[activeQuad.value] : []
)
const QUADRANT_OF: Record<string, Quadrant> = Object.fromEntries(
  OVERVIEW_ORDER.flatMap(q => GROUPS_BY_QUADRANT[q].map(g => [g.slug, q] as const))
)

// ---- stan wyboru: mapa slug → poziom (0 = zaznaczenie bez natężenia) ----
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
function level(slug: string): number {
  return selMap.value[slug] ?? 0
}
function toggle(slug: string) {
  writeSel(slug, slug in selMap.value ? null : 0)
}
function remove(slug: string) {
  writeSel(slug, null)
}
/** Klik w miejsce i: ustawia poziom; klik w obecny poziom zdejmuje jedną kropkę. */
function dotClick(slug: string, i: number) {
  writeSel(slug, i === level(slug) ? i - 1 : i)
}
function nudge(slug: string, delta: number) {
  const cur = level(slug)
  const next = Math.max(0, Math.min(5, cur + delta))
  if (next === cur) return
  writeSel(slug, next)
}

// ---- hover / fokus: który kafel pokazuje 5 miejsc i podpowiedź ----
const open = ref<string | null>(null)
/** Kafel z otwartą notką „?” (opis grupy); zamyka klik poza notką, Esc, zmiana ćwiartki. */
const helpOpen = ref<string | null>(null)
watch(activeQuad, () => {
  helpOpen.value = null
})
function onPointerDown(e: PointerEvent) {
  if (!helpOpen.value) return
  const target = e.target instanceof Element ? e.target : null
  if (target?.closest('.ct-note, .ct-help')) return
  helpOpen.value = null
}
onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
/** Na którym miejscu stoi kursor (podgląd poziomu); 0 = żadnym. */
const slotHover = ref(0)
function leave(slug: string) {
  if (open.value === slug) open.value = null
  slotHover.value = 0
}
function focusOut(slug: string, e: FocusEvent) {
  const host = e.currentTarget as HTMLElement | null
  if (host && e.relatedTarget instanceof Node && host.contains(e.relatedTarget)) return
  leave(slug)
}

// ---- prezentacja ----
function groupName(slug: string): string {
  return t(`emotionGroups.groups.${slug}.name`)
}
function shortName(slug: string): string {
  return groupName(slug).split(' · ')[0]
}
/** Dwa przykładowe słowa grupy — kursywa na niewybranym kaflu. */
function auxLine(g: EmotionGroup): string {
  return g.auxIds.map(id => t(`emotions.${id}.name`)).join(' · ')
}
function scaleLabel(n: number): string {
  return t(`emotionGroups.scale.${n}`)
}
function tileLabel(slug: string): string {
  const lvl = level(slug)
  return lvl > 0
    ? t('emotionGroups.ui.intensityOf', { name: groupName(slug), level: lvl })
    : t('emotionGroups.ui.selectGroup', { name: groupName(slug) })
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
const chips = computed(() =>
  selections.value.map(s => ({
    slug: s.emotionId,
    name: shortName(s.emotionId),
    quadrant: QUADRANT_OF[s.emotionId] ?? null,
    // bez liczb na wierzchu: natężenie tylko w podpowiedzi
    title: s.intensity
      ? t('emotionGroups.ui.intensityOf', { name: groupName(s.emotionId), level: s.intensity })
      : groupName(s.emotionId),
  }))
)
</script>

<style scoped src="./EmotionGroupPicker.css"></style>
