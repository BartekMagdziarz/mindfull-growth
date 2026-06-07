<!--
  EmotionSelector — produkcyjny, trójpoziomowy wybór emocji (wielokrotny).

    1. Ćwiartka — 4 przyciski (jak dotychczas).
    2. Rodziny  — po wejściu w ćwiartkę panel przyjmuje jej kolor; w nagłówku
                  pojawia się stały przełącznik ćwiartek. Rodziny służą jako filtr
                  pola emocji (poziom 3).
    3. Emocje   — „Pokaż emocje" otwiera scatter: emocje leżą na ciągłych
                  współrzędnych (walencja × energia) z drobnymi twarzami. Klik
                  zaznacza/odznacza emocję (wybór wielokrotny).

  Publiczne API zachowane 1:1 z poprzednią wersją, dzięki czemu komponent jest
  podmianą drop-in we wszystkich ~30 miejscach:
    - v-model            → tablica ID emocji (string[])
    - v-model:quadrant   → aktywna ćwiartka (Quadrant | null)
    - :show-selected-section → sekcja wybranych chipów

  Dane pochodzą z useEmotionStore (nazwy zlokalizowane), współrzędne scatter z
  getScatterCoord(), twarze są kluczowane ID emocji (działają w EN i PL).
-->
<template>
  <div class="emotion-selector">
    <!-- Wspólne pole wybranych — konkretne emocje ORAZ nie-wchłonięte rodziny w
         JEDNYM rzędzie (emocje najpierw, potem rodziny). Każdy rodzaj bramkowany
         niezależnie (emocje: showSelectedSection, rodziny: allowFamilyOnly), ale
         renderowany w tym samym kontenerze. Reguła wchłonięcia bez zmian: rodzina
         znika z chipów, gdy wybrano emocję z tej rodziny (displayedFamilyChips). -->
    <div
      v-if="hasDisplayedChips"
      class="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-1"
      role="list"
      aria-label="Selected emotions and families"
    >
      <button
        v-for="emotion in chipEmotions"
        :key="`emotion-${emotion.id}`"
        type="button"
        :aria-label="`Remove ${emotion.name}`"
        :style="getEmotionChipStyle(emotion.id)"
        class="neo-emotion-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
        @click="removeEmotion(emotion.id)"
      >
        <span>{{ emotion.name }}</span>
        <AppIcon name="close" class="text-base" />
      </button>
      <button
        v-for="family in chipFamilies"
        :key="`family-${family.id}`"
        type="button"
        :aria-label="`Remove ${familyName(family)}`"
        :style="getQuadrantChipStyle(family.quadrant)"
        class="neo-emotion-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
        @click="removeFamily(family.id)"
      >
        <AppIcon name="category" class="text-sm opacity-80" />
        <span>{{ familyName(family) }}</span>
        <AppIcon name="close" class="text-base" />
      </button>
    </div>
    <div
      v-else-if="props.showSelectedSection && props.showEmptyState && !hasAnySelection"
      class="mb-4 p-3 rounded-2xl bg-section text-center text-on-surface-variant text-xs border border-neu-border/30"
    >
      {{ t('emotionViews.selector.noSelection') }}
    </div>

    <!-- Wspólne pole/panel — 3 poziomy z animacjami zagłębiania -->
    <div class="es-panel" :class="{ 'es-panel--expanded': level !== 'quadrants' }" :style="panelStyle">
      <Transition :name="transitionName" mode="out-in">
        <!-- 1. Wybór ćwiartki — duże przyciski (krok 1), wprost na polu „Emocje" -->
        <div v-if="level === 'quadrants'" key="quadrants" class="lvl">
          <div class="grid grid-cols-2 gap-3" role="group" :aria-label="t('emotionViews.selector.backToQuadrants')">
            <button
              v-for="quadrant in quadrants"
              :key="quadrant.value"
              type="button"
              :data-testid="`emotion-quadrant-${quadrant.value}`"
              :aria-label="quadrant.label"
              :class="getQuadrantButtonClasses()"
              :style="getQuadrantButtonStyle(quadrant.value)"
              @click="selectQuadrant(quadrant.value)"
            >
              <div class="flex items-center gap-2.5">
                <AppIcon :name="quadrant.icon" class="text-xl flex-shrink-0" />
                <div class="flex flex-col items-start">
                  <span class="text-sm font-medium leading-snug">{{ quadrant.energyLabel }}</span>
                  <span class="text-sm font-medium leading-snug">{{ quadrant.pleasantnessLabel }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Ramka aktywnej ćwiartki (poziomy 2 i 3): przełącznik + rodziny/scatter -->
        <div v-else key="active" class="active-frame" :style="originStyle">
          <!-- Przełącznik ćwiartek — zmiana bez cofania do dużych przycisków -->
          <div class="q-switch" role="group" :aria-label="t('emotionViews.selector.backToQuadrants')">
            <button
              v-for="quadrant in quadrants"
              :key="quadrant.value"
              type="button"
              class="q-switch__btn"
              :class="{ 'q-switch__btn--active': quadrant.value === quadrantModel }"
              :data-testid="`emotion-quadrant-switch-${quadrant.value}`"
              :style="getQuadrantButtonStyle(quadrant.value)"
              :title="quadrant.label"
              :aria-label="quadrant.label"
              :aria-pressed="quadrant.value === quadrantModel"
              @click="onSwitcherClick(quadrant.value)"
            >
              <AppIcon :name="quadrant.icon" />
            </button>
          </div>

          <Transition :name="transitionName" mode="out-in">
            <!-- 2. Wybór rodzin (filtr) -->
            <div v-if="level === 'families'" :key="`fam-${quadrantModel}`" class="lvl-inner">
              <div class="fam-grid">
                <button
                  v-for="f in quadrantFamilies"
                  :key="f.id"
                  type="button"
                  :data-testid="`emotion-family-${f.id}`"
                  class="fam-card"
                  :class="{ 'fam-card--selected': isFamilySelected(f.id) }"
                  :style="familyCardStyle(isFamilySelected(f.id))"
                  @click="toggleFamily(f.id)"
                >
                  <span class="fam-card__icon">
                    <EmotionFaceIcon :name="f.rep" :color="quadrantInk" :size="30" />
                  </span>
                  <span class="fam-card__name">{{ familyName(f) }}</span>
                  <AppIcon v-if="isFamilySelected(f.id)" name="check_circle" class="fam-card__check" />
                </button>

                <button
                  type="button"
                  data-testid="emotion-show-emotions"
                  class="fam-card fam-card--cta"
                  :style="familyCardStyle(false)"
                  @click="goDeeper"
                >
                  <span class="fam-card__icon cta-disc">
                    <AppIcon name="arrow_forward" :style="{ color: quadrantInk }" />
                  </span>
                  <span class="fam-card__name">{{ t('emotionViews.selector.showEmotions') }}</span>
                </button>
              </div>
            </div>

            <!-- 3. Scatter emocji (wielokrotny wybór) -->
            <div v-else key="emotions" class="lvl-inner">
              <div class="fam-tray">
                <div class="fam-pills">
                  <button
                    v-for="f in quadrantFamilies"
                    :key="f.id"
                    type="button"
                    class="fam-pill"
                    :class="{ 'fam-pill--selected': isFamilySelected(f.id) }"
                    :style="familyCardStyle(isFamilySelected(f.id))"
                    @click="toggleFamily(f.id)"
                  >{{ familyName(f) }}</button>
                  <button
                    type="button"
                    class="back-btn"
                    :title="t('emotionViews.selector.backToFamilies')"
                    :aria-label="t('emotionViews.selector.backToFamilies')"
                    @click="backToFamilies"
                  >
                    <AppIcon name="arrow_back" class="text-base" />
                  </button>
                </div>
              </div>

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
          </Transition>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useT } from '@/composables/useT'
import {
  getQuadrant,
  getQuadrantChipStyle,
  getQuadrantDisplayConfig,
  getQuadrantTintStyle,
  QUADRANTS_IN_ORDER,
  type Quadrant,
  type Emotion,
} from '@/domain/emotion'
import { FAMILIES_BY_QUADRANT, FAMILY_OF, getFamilyById, type EmotionFamily } from '@/domain/emotionFamily'
import { useEmotionStore } from '@/stores/emotion.store'
import AppIcon from '@/components/shared/AppIcon.vue'
import EmotionFaceIcon from '@/components/emotion/EmotionFaceIcon.vue'

interface Props {
  modelValue: string[]
  showSelectedSection?: boolean
  // Pozwala zatrzymać się na rodzinie (zapisywać emotionFamilyIds). Gdy false,
  // rodziny działają tylko jako filtr pola scatter (zachowanie domyślne/drop-in).
  allowFamilyOnly?: boolean
  // Placeholder „brak wyboru" w pustej sekcji wybranych. Wyłączany tam, gdzie
  // picker i tak jest zawsze widoczny pod spodem (widoki logowania emocji).
  showEmptyState?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  showSelectedSection: true,
  allowFamilyOnly: false,
  showEmptyState: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// Aktywna ćwiartka — dwukierunkowy model. Wybór/zmiana odbywa się wbudowanym
// przełącznikiem ćwiartek w nagłówku; parent może też ustawić null (np. reset).
const quadrantModel = defineModel<Quadrant | null>('quadrant', { default: null })
// Wybrane rodziny (emotionFamilyIds). Z allowFamilyOnly stają się zapisywaną
// odpowiedzią („zatrzymałem się na rodzinie"); bez niego działają jak filtr pola.
const familiesModel = defineModel<string[]>('families', { default: () => [] })

const emotionStore = useEmotionStore()
const { t } = useT()

// Rozsunięcie kropek w scatter — min. dystans w znormalizowanym polu 0–1
// (na suwaku strojenia z prototypu to wartość 0.150). Jedna stała w komponencie
// → identyczne rozproszenie WSZĘDZIE, gdzie używamy EmotionSelector.
const SPREAD = 0.15
const SHOW_ANCHOR_LABELS = true

const selectedEmotionIds = ref<string[]>([])
const deepened = ref(false)
const hoveredId = ref<string | null>(null)
const transitionName = ref<'dive' | 'deeper' | 'rise' | 'surface' | 'switch'>('dive')

// --- Poziomy / dane ze sklepu ---
const quadrants = computed(() =>
  QUADRANTS_IN_ORDER.map((value) => getQuadrantDisplayConfig(value, t))
)

const level = computed<'quadrants' | 'families' | 'emotions'>(() => {
  if (!quadrantModel.value) return 'quadrants'
  return deepened.value ? 'emotions' : 'families'
})

const visibleEmotions = computed<Emotion[]>(() =>
  quadrantModel.value ? emotionStore.getEmotionsByQuadrant(quadrantModel.value) : []
)

const quadrantFamilies = computed<EmotionFamily[]>(() =>
  quadrantModel.value ? FAMILIES_BY_QUADRANT[quadrantModel.value] : []
)

// Rodziny wybrane W BIEŻĄCEJ ćwiartce — sterują wyróżnieniem/wygaszeniem kropek.
const activeFilterFamilies = computed(() => {
  const inQuadrant = new Set(quadrantFamilies.value.map((f) => f.id))
  return new Set(familiesModel.value.filter((id) => inQuadrant.has(id)))
})

// Pełne obiekty wybranych rodzin (do chipów w sekcji wybranych).
const selectedFamilyObjects = computed(() =>
  familiesModel.value
    .map((id) => getFamilyById(id))
    .filter((f): f is EmotionFamily => f !== undefined)
)
function isFamilySelected(id: string): boolean {
  return familiesModel.value.includes(id)
}

// Reguła „wchłonięcia": jeśli wybrano konkretną emocję z danej rodziny, ta
// rodzina NIE pojawia się jako osobny chip (emocja ją reprezentuje). Pastylki/
// karty rodzin nadal podświetlają się jako filtr — to dotyczy tylko chipów
// „wybranej odpowiedzi". Stosujemy tę samą zasadę po stronie odczytu (historia).
const emotionFamilySet = computed(
  () => new Set(selectedEmotionIds.value.map((id) => FAMILY_OF[id]).filter(Boolean))
)
const displayedFamilyChips = computed(() =>
  selectedFamilyObjects.value.filter((f) => !emotionFamilySet.value.has(f.id))
)

const selectedEmotions = computed(() =>
  selectedEmotionIds.value
    .map((id) => emotionStore.getEmotionById(id))
    .filter((e): e is Emotion => e !== undefined)
)

const hasAnySelection = computed(
  () =>
    selectedEmotionIds.value.length > 0 ||
    (props.allowFamilyOnly && familiesModel.value.length > 0)
)

// Wspólny rząd chipów: emocje (gdy showSelectedSection) najpierw, potem
// nie-wchłonięte rodziny (gdy allowFamilyOnly). Każdy rodzaj bramkowany osobno,
// ale renderowany w jednym kontenerze.
const chipEmotions = computed<Emotion[]>(() =>
  props.showSelectedSection ? selectedEmotions.value : []
)
const chipFamilies = computed<EmotionFamily[]>(() =>
  props.allowFamilyOnly ? displayedFamilyChips.value : []
)
const hasDisplayedChips = computed(
  () => chipEmotions.value.length > 0 || chipFamilies.value.length > 0
)

const hoveredEmotion = computed(() =>
  hoveredId.value ? (emotionStore.getEmotionById(hoveredId.value) ?? null) : null
)

function familyName(f: EmotionFamily): string {
  return t(`emotionFamilies.${f.id}.name`)
}

// --- Wybór emocji (wielokrotny) ---
function isSelected(id: string): boolean {
  return selectedEmotionIds.value.includes(id)
}
function toggleEmotion(id: string): void {
  const i = selectedEmotionIds.value.indexOf(id)
  if (i > -1) selectedEmotionIds.value.splice(i, 1)
  else selectedEmotionIds.value.push(id)
  emit('update:modelValue', [...selectedEmotionIds.value])
}
function removeEmotion(id: string): void {
  const i = selectedEmotionIds.value.indexOf(id)
  if (i > -1) {
    selectedEmotionIds.value.splice(i, 1)
    emit('update:modelValue', [...selectedEmotionIds.value])
  }
}

// --- Rodziny: wybór (emotionFamilyIds) + wyróżnienie/wygaszenie kropek ---
function isInSelectedFamily(e: Emotion): boolean {
  return activeFilterFamilies.value.has(FAMILY_OF[e.id])
}
function isMuted(e: Emotion): boolean {
  if (activeFilterFamilies.value.size === 0) return false
  if (isSelected(e.id) || hoveredId.value === e.id) return false
  return !isInSelectedFamily(e)
}
function toggleFamily(id: string): void {
  if (familiesModel.value.includes(id)) {
    familiesModel.value = familiesModel.value.filter((x) => x !== id)
  } else {
    familiesModel.value = [...familiesModel.value, id]
  }
}
function removeFamily(id: string): void {
  familiesModel.value = familiesModel.value.filter((x) => x !== id)
}

// --- Nawigacja (z kierunkiem animacji) ---
function resetQuadrantNav(): void {
  deepened.value = false
  hoveredId.value = null
  // Bez allowFamilyOnly rodziny są tylko lokalnym filtrem ćwiartki i zerują się
  // przy zmianie. Jako zapisywana odpowiedź — kumulują się między ćwiartkami.
  if (!props.allowFamilyOnly) familiesModel.value = []
}
function selectQuadrant(quadrant: Quadrant): void {
  transitionName.value = 'dive'
  quadrantModel.value = quadrant
  resetQuadrantNav()
}
function switchQuadrant(quadrant: Quadrant): void {
  if (quadrant === quadrantModel.value) return
  transitionName.value = 'switch'
  quadrantModel.value = quadrant
  resetQuadrantNav()
}
function collapseToQuadrants(): void {
  transitionName.value = 'surface'
  quadrantModel.value = null
  deepened.value = false
}
function onSwitcherClick(quadrant: Quadrant): void {
  if (quadrant === quadrantModel.value) collapseToQuadrants()
  else switchQuadrant(quadrant)
}
function goDeeper(): void {
  transitionName.value = 'deeper'
  deepened.value = true
  hoveredId.value = null
}
function backToFamilies(): void {
  transitionName.value = 'rise'
  deepened.value = false
  hoveredId.value = null
}

// --- Styl panelu + punkt rozwinięcia (transform-origin z rogu ćwiartki) ---
const QUAD_ORIGIN: Record<Quadrant, string> = {
  'high-energy-low-pleasantness': '0% 0%',
  'high-energy-high-pleasantness': '100% 0%',
  'low-energy-low-pleasantness': '0% 100%',
  'low-energy-high-pleasantness': '100% 100%',
}
const originStyle = computed(() => ({
  transformOrigin: quadrantModel.value ? QUAD_ORIGIN[quadrantModel.value] : '50% 50%',
}))
const panelStyle = computed(() =>
  quadrantModel.value
    ? getQuadrantTintStyle(quadrantModel.value)
    : { transition: 'background 280ms ease' }
)

// --- Styl przycisków ćwiartek / kart / pastylek rodzin (wspólny język) ---
function gradients(q: Quadrant) {
  const v = (suffix: string) => `var(--color-quadrant-${q}-${suffix})`
  return {
    backgroundGradient: `linear-gradient(145deg, ${v('top')}, ${v('bottom')})`,
    softGradient: `linear-gradient(145deg, ${v('tint-soft')}, ${v('tint')})`,
    discGradient: `linear-gradient(145deg, #ffffff, ${v('tint-soft')})`,
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
function getQuadrantButtonClasses(): string {
  return 'flex items-center justify-center px-4 py-3 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background neo-quadrant-btn'
}
function getQuadrantButtonStyle(quadrant: Quadrant): Record<string, string> {
  const s = quadrantButtonStyles[quadrant]
  return { background: s.backgroundGradient, color: s.textColor }
}
function familyCardStyle(isSelectedCard: boolean): Record<string, string> {
  const q = quadrantModel.value
  if (!q) return {}
  const s = quadrantButtonStyles[q]
  const style: Record<string, string> = {
    background: isSelectedCard ? s.backgroundGradient : s.softGradient,
    color: s.textColor,
    '--disc': s.discGradient,
  }
  if (isSelectedCard) style.borderColor = s.borderColor
  return style
}

// Atrament twarzy = token tekstu ćwiartki (paleta zależna od motywu).
function quadrantInkVar(q: Quadrant): string {
  return `var(--color-quadrant-${q}-text)`
}
const quadrantInk = computed(() =>
  quadrantInkVar(quadrantModel.value ?? 'high-energy-high-pleasantness')
)
function emotionInk(e: Emotion): string {
  if (activeFilterFamilies.value.size > 0 && !isInSelectedFamily(e)) return '#9aa6b8'
  return quadrantInkVar(getQuadrant(e))
}
function labelStyle(e: Emotion): Record<string, string> {
  const q = quadrantModel.value
  if (!q) return {}
  const s = quadrantButtonStyles[q]
  const sel = isSelected(e.id)
  return {
    background: sel ? s.backgroundGradient : s.softGradient,
    color: s.textColor,
    borderColor: s.borderColor,
  }
}

function getEmotionChipStyle(emotionId: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return {}
  return getQuadrantChipStyle(getQuadrant(emotion))
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
  return relaxedPositions.value.get(e.id) ?? { left: '50%', top: '50%' }
}
function labelVisible(e: Emotion): boolean {
  if (hoveredId.value === e.id || isSelected(e.id)) return true
  if (activeFilterFamilies.value.size > 0) return isInSelectedFamily(e)
  const coord = emotionStore.getScatterCoord(e.id)
  return SHOW_ANCHOR_LABELS && !!coord?.anchor
}

// --- Synchronizacja z modelValue ---
watch(
  () => props.modelValue,
  (newValue) => {
    selectedEmotionIds.value = newValue.filter((id) => {
      const ok = emotionStore.getEmotionById(id) !== undefined
      if (!ok && import.meta.env.DEV) console.warn(`Invalid emotion ID in modelValue: ${id}`)
      return ok
    })
  },
  { immediate: true }
)

// Gdy parent wyczyści ćwiartkę (v-model:quadrant → null), wróć do poziomu
// startowego z animacją „wynurzenia".
watch(quadrantModel, (val, old) => {
  if (val === null && old !== null) {
    transitionName.value = 'surface'
    deepened.value = false
  }
})

onMounted(async () => {
  if (!emotionStore.isLoaded) await emotionStore.loadEmotions()
})
</script>

<style scoped>
.emotion-selector {
  @apply w-full;
}

/* === Wspólne pole/panel — tło zmienia kolor na kolor ćwiartki === */
/* Bez własnej „obwódki" — picker siedzi wprost na polu „Emocje" (brak pudełka
   w pudełku). Zostaje tylko zaokrąglenie pod ewentualny wash ćwiartki + miejsce
   na animację zagłębiania. */
.es-panel {
  position: relative;
  min-height: 168px;
  border-radius: 18px;
  /* clip + margines zamiast samego hidden: neumorficzne cienie przycisków przy
     krawędziach pola nie są ucinane, a przeskalowania animacji nadal maskowane.
     overflow:hidden zostaje jako fallback dla silników bez `overflow: clip`. */
  overflow: hidden;
  overflow: clip;
  overflow-clip-margin: 16px;
  transition: min-height 260ms cubic-bezier(0.2, 0.8, 0.2, 1), background 280ms ease;
}
.es-panel--expanded {
  min-height: 430px;
}
.lvl,
.active-frame {
  position: relative;
}

/* === Duże przyciski ćwiartek (poziom 1 / krok 1) === */
.neo-quadrant-btn {
  border: 1px solid rgb(var(--neo-border) / 0.1);
  box-shadow:
    -7px -7px 14px rgb(var(--neo-shadow-light) / 0.8),
    7px 7px 14px rgb(var(--neo-shadow-dark) / 0.33);
}
.neo-quadrant-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    -8px -8px 16px rgb(var(--neo-shadow-light) / 0.85),
    8px 8px 16px rgb(var(--neo-shadow-dark) / 0.36);
}

/* === Przełącznik ćwiartek (poziom 2/3) === */
.q-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.q-switch__btn {
  width: 44px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  border: 1px solid rgb(var(--neo-border) / 0.12);
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.7),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.3);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
}
.q-switch__btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.q-switch__btn--active {
  border-width: 1.5px;
  filter: brightness(1.05);
  box-shadow:
    0 0 0 2px rgb(255 255 255 / 0.85),
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.65),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.28);
}
.lvl-inner {
  position: relative;
}

/* === Siatka rodzin (poziom 2) === */
.fam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.fam-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 88px;
  padding: 14px 10px;
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  border: 1px solid rgb(var(--neo-border) / 0.1);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.8),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.3);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
}
.fam-card:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.fam-card--selected {
  border-width: 1.5px;
  transform: translateY(0);
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
}
.fam-card__icon {
  flex-shrink: 0;
}
.fam-card :deep(.neuface) {
  background: var(--disc);
}
.fam-card__name {
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.2;
}
.fam-card__check {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 16px;
  color: inherit;
}
.cta-disc {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: var(--disc, linear-gradient(145deg, #f1f6fc, #dde6f1));
  box-shadow:
    -3px -3px 6px rgba(255, 255, 255, 0.92),
    3px 3px 7px rgba(120, 150, 190, 0.42),
    inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

/* === Pastylki rodzin (poziom 3) === */
.fam-tray {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.fam-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.fam-pill {
  font-size: 11.5px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid rgb(var(--neo-border) / 0.1);
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.7),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.28);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
}
.fam-pill:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.fam-pill--selected {
  border-width: 1.5px;
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
}
.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 999px;
  font-size: 16px;
  color: rgb(var(--neo-text));
  background: rgb(255 255 255 / 0.6);
  border: 1px solid rgb(var(--neo-border) / 0.12);
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.6),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.22);
  cursor: pointer;
  transition: transform 150ms ease;
  flex-shrink: 0;
}
.back-btn:hover {
  transform: translateY(-1px);
}

/* === Pole scatter === */
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
    4px 4px 9px rgba(120, 150, 190, 0.5),
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

/* === Sekcja wybranych chipów === */
.neo-emotion-chip {
  border: none;
}
.neo-emotion-chip:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.neo-emotion-chip:active {
  transform: translateY(0);
  filter: brightness(0.98);
}

/* === Animacje przejść === */
.dive-enter-active { transition: opacity 320ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.dive-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.dive-enter-from { opacity: 0; transform: scale(0.72); }
.dive-leave-to { opacity: 0; transform: scale(1.12); }

.surface-enter-active { transition: opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.surface-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.surface-enter-from { opacity: 0; transform: scale(1.12); }
.surface-leave-to { opacity: 0; transform: scale(0.72); }

.deeper-enter-active { transition: opacity 300ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.deeper-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.deeper-enter-from { opacity: 0; transform: scale(0.9) translateY(14px); }
.deeper-leave-to { opacity: 0; transform: scale(1.06); }

.rise-enter-active { transition: opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.rise-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.rise-enter-from { opacity: 0; transform: scale(1.06); }
.rise-leave-to { opacity: 0; transform: scale(0.9) translateY(14px); }

.switch-enter-active { transition: opacity 260ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.switch-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.switch-enter-from { opacity: 0; transform: scale(0.94); }
.switch-leave-to { opacity: 0; transform: scale(0.94); }

@media (prefers-reduced-motion: reduce) {
  .es-panel { transition: none !important; }
  .dive-enter-active, .dive-leave-active,
  .surface-enter-active, .surface-leave-active,
  .deeper-enter-active, .deeper-leave-active,
  .rise-enter-active, .rise-leave-active,
  .switch-enter-active, .switch-leave-active {
    transition: opacity 120ms linear !important;
    transform: none !important;
  }
  .dive-enter-from, .dive-leave-to,
  .surface-enter-from, .surface-leave-to,
  .deeper-enter-from, .deeper-leave-to,
  .rise-enter-from, .rise-leave-to,
  .switch-enter-from, .switch-leave-to {
    transform: none;
  }
  .dot, .dot__icon { transition: none; }
}
</style>
