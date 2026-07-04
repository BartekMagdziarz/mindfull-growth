<!--
  EmotionSelector — produkcyjny, dwupoziomowy wybór emocji (wielokrotny).

    1. Ćwiartka — 4 duże przyciski 2×2 (jak dotychczas).
    2. Rodziny  — siatka kart rodzin w kolorze ćwiartki. Karta rozwija się
                  W MIEJSCU do pełnego rzędu siatki i pokazuje 2–6 emocji tej
                  rodziny jako duże, zawsze podpisane przyciski; pozostałe karty
                  dosuwają się (grid dense + FLIP). Naraz rozwinięta jest
                  dokładnie jedna rodzina.

  Podział interakcji na karcie zależy od trybu:
    - allowFamilyOnly=true  → korpus karty zaznacza/odznacza RODZINĘ (zapisywana
      odpowiedź), osobny pasek ▾ pod kartą rozwija emocje;
    - allowFamilyOnly=false → wybór samej rodziny nie istnieje (WorryTree,
      ThoughtRecord), więc klik w całą kartę po prostu rozwija emocje.

  Przełącznik ćwiartek = segmentowana kapsuła 1×4 ikon w prawym rogu rzędu
  tytułu+chipów (poza panelem), widoczna tylko przy aktywnej ćwiartce. Klik w
  aktywny segment = powrót do kroku 1. (Wybrana przez użytkownika 2026-07-04
  spośród dwóch wariantów; odrzucone pełnowymiarowe zakładki usunięte.)

  Dawny poziom 3 (scatter całej ćwiartki) został wyjęty do nieużywanego
  komponentu src/components/emotion/EmotionScatter.vue.

  Publiczne API zachowane (drop-in we wszystkich ~20 miejscach):
    - v-model            → tablica ID emocji (string[])
    - v-model:quadrant   → aktywna ćwiartka (Quadrant | null)
    - v-model:families   → wybrane rodziny (string[])
    - :show-selected-section / :allow-family-only / :show-empty-state
    - :label (NOWE)      → etykieta pola renderowana w JEDNYM rzędzie z chipami
                           wybranych (zastępuje osobny nagłówek u rodzica)
-->
<template>
  <div class="emotion-selector">
    <!-- Wspólny rząd: [etykieta pola + wybrane chipy (flex-wrap, własny kontener
         z role=list)] + [kapsuła przełącznika ćwiartek przypięta z prawej,
         wariant 'capsule']. Chipy zawijają się we własnym obszarze, kapsuła
         zostaje w prawym górnym rogu. Reguła wchłonięcia bez zmian: rodzina
         znika z chipów, gdy wybrano emocję z tej rodziny (displayedFamilyChips). -->
    <div
      v-if="props.label || hasDisplayedChips || capsuleVisible"
      class="mb-4 flex items-start gap-3"
    >
      <!-- Kontener listy tylko gdy ma zawartość — bez etykiety i chipów nie
           zostawiamy pustej roli list w drzewie dostępności (sama kapsuła
           dopycha się wtedy do prawej przez margin-left:auto). -->
      <div
        v-if="props.label || hasDisplayedChips"
        class="flex flex-wrap items-center gap-2 flex-1 min-w-0"
        role="list"
        aria-label="Selected emotions and families"
      >
      <span
        v-if="props.label"
        class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mr-1"
      >{{ props.label }}</span>
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

      <!-- Kapsuła przełącznika ćwiartek (wariant 'capsule'): jedna segmentowana
           kontrolka 1×4, tylko przy aktywnej ćwiartce. Celowo POZA kontenerem
           role=list (testy liczą przyciski chipów wewnątrz listy). Klik w
           aktywny segment = powrót do kroku 1. -->
      <div
        v-if="capsuleVisible"
        class="q-capsule"
        role="group"
        :aria-label="t('emotionViews.selector.backToQuadrants')"
      >
        <button
          v-for="quadrant in quadrants"
          :key="quadrant.value"
          type="button"
          class="q-capsule__seg"
          :class="{ 'q-capsule__seg--active': quadrant.value === quadrantModel }"
          :data-testid="`emotion-quadrant-switch-${quadrant.value}`"
          :style="capsuleSegStyle(quadrant.value)"
          :title="quadrant.value === quadrantModel ? t('emotionViews.selector.backToQuadrants') : quadrant.label"
          :aria-label="quadrant.value === quadrantModel ? t('emotionViews.selector.backToQuadrants') : quadrant.label"
          :aria-pressed="quadrant.value === quadrantModel"
          @click="onSwitcherClick(quadrant.value)"
        >
          <AppIcon :name="quadrant.icon" />
        </button>
      </div>
    </div>
    <div
      v-else-if="props.showSelectedSection && props.showEmptyState && !props.label && !hasAnySelection"
      class="mb-4 p-3 rounded-2xl bg-section text-center text-on-surface-variant text-xs border border-neu-border/30"
    >
      {{ t('emotionViews.selector.noSelection') }}
    </div>

    <!-- Wspólne pole/panel — 2 poziomy z animacjami zagłębiania -->
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

        <!-- Ramka aktywnej ćwiartki: siatka rodzin z rozwinięciem (przełącznik
             ćwiartek to kapsuła w rzędzie tytułu, poza panelem) -->
        <div v-else key="active" class="active-frame" :style="originStyle">
          <Transition :name="transitionName" mode="out-in">
            <!-- 2. Rodziny z rozwinięciem w miejscu -->
            <div :key="`fam-${quadrantModel}`" class="lvl-inner">
              <TransitionGroup tag="div" name="fam" class="fam-grid">
                <div
                  v-for="f in quadrantFamilies"
                  :key="f.id"
                  class="fam-card-wrap"
                  :class="{ 'fam-card-wrap--expanded': f.id === expandedFamilyId }"
                  :style="wrapStyle(f)"
                >
                  <!-- Karta zwinięta -->
                  <template v-if="f.id !== expandedFamilyId">
                    <button
                      type="button"
                      :data-testid="`emotion-family-${f.id}`"
                      class="fam-card"
                      :class="{
                        'fam-card--selected': isFamilySelected(f.id),
                        'fam-card--split': props.allowFamilyOnly,
                      }"
                      :style="familyCardStyle(isFamilySelected(f.id))"
                      @click="onCardBodyClick(f)"
                    >
                      <span class="fam-card__icon">
                        <EmotionFaceIcon :name="f.rep" :color="quadrantInk" :size="30" />
                      </span>
                      <span class="fam-card__name">{{ familyName(f) }}</span>
                      <AppIcon v-if="isFamilySelected(f.id)" name="check_circle" class="fam-card__check" />
                      <span
                        v-if="selectedCountByFamily.get(f.id)"
                        class="fam-badge-count"
                        :aria-label="t('emotionViews.selector.selectedInFamily', { count: selectedCountByFamily.get(f.id) ?? 0 })"
                      >{{ selectedCountByFamily.get(f.id) }}</span>
                      <AppIcon v-if="!props.allowFamilyOnly" name="expand_more" class="fam-card__chevron" />
                    </button>
                    <button
                      v-if="props.allowFamilyOnly"
                      type="button"
                      class="fam-expand-strip"
                      :data-testid="`emotion-family-expand-${f.id}`"
                      :aria-label="t('emotionViews.selector.expandFamily', { name: familyName(f) })"
                      aria-expanded="false"
                      :style="familyCardStyle(false)"
                      @click="toggleExpand(f.id)"
                    >
                      <AppIcon name="expand_more" class="text-base" />
                    </button>
                  </template>

                  <!-- Karta rozwinięta: pełny rząd siatki, emocje rodziny -->
                  <div v-else class="fam-expanded" :style="familyCardStyle(false)">
                    <div class="fam-expanded__inner">
                      <div class="fam-expanded__top">
                        <component
                          :is="props.allowFamilyOnly ? 'button' : 'div'"
                          :type="props.allowFamilyOnly ? 'button' : undefined"
                          :data-testid="`emotion-family-${f.id}`"
                          class="fam-expanded__head"
                          :class="{
                            'fam-expanded__head--selectable': props.allowFamilyOnly,
                            'fam-expanded__head--selected': isFamilySelected(f.id),
                          }"
                          :style="props.allowFamilyOnly ? familyCardStyle(isFamilySelected(f.id)) : undefined"
                          @click="props.allowFamilyOnly ? toggleFamily(f.id) : undefined"
                        >
                          <EmotionFaceIcon :name="f.rep" :color="quadrantInk" :size="28" />
                          <span class="fam-card__name">{{ familyName(f) }}</span>
                          <AppIcon v-if="isFamilySelected(f.id)" name="check_circle" class="text-base" />
                        </component>

                        <div class="fam-expanded__emotions" @pointerleave="hoveredId = null">
                          <button
                            v-for="e in expandedEmotions"
                            :key="e.id"
                            type="button"
                            class="emotion-btn"
                            :class="{ 'emotion-btn--selected': isSelected(e.id) }"
                            :style="familyCardStyle(isSelected(e.id))"
                            :data-testid="`emotion-option-${e.id}`"
                            :aria-pressed="isSelected(e.id)"
                            @pointerenter="hoveredId = e.id"
                            @focus="hoveredId = e.id"
                            @click="toggleEmotion(e.id)"
                          >
                            <EmotionFaceIcon :id="e.id" :color="quadrantInk" :size="26" />
                            <span>{{ e.name }}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          class="fam-collapse"
                          :data-testid="`emotion-family-expand-${f.id}`"
                          :aria-label="t('emotionViews.selector.collapseFamily', { name: familyName(f) })"
                          aria-expanded="true"
                          @click="toggleExpand(f.id)"
                        >
                          <AppIcon name="expand_less" class="text-base" />
                        </button>
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
                          <span v-else>{{ t('emotionViews.selector.pickHint') }}</span>
                        </Transition>
                      </div>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
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
  // Pozwala zatrzymać się na rodzinie (zapisywać emotionFamilyIds). Włącza też
  // podział interakcji na karcie: korpus = zaznacz rodzinę, pasek ▾ = rozwiń.
  // Gdy false (WorryTree/ThoughtRecord), cała karta rozwija emocje.
  allowFamilyOnly?: boolean
  // Placeholder „brak wyboru" w pustej sekcji wybranych. Wyłączany tam, gdzie
  // picker i tak jest zawsze widoczny pod spodem (widoki logowania emocji).
  showEmptyState?: boolean
  // Etykieta pola renderowana w jednym rzędzie z chipami wybranych. Zastępuje
  // osobny nagłówek u rodzica (chipy i tytuł dzielą jeden zawijany rząd).
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  showSelectedSection: true,
  allowFamilyOnly: false,
  showEmptyState: true,
  label: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// Aktywna ćwiartka — dwukierunkowy model. Wybór/zmiana odbywa się wbudowanym
// przełącznikiem ćwiartek w nagłówku; parent może też ustawić null (np. reset).
const quadrantModel = defineModel<Quadrant | null>('quadrant', { default: null })
// Wybrane rodziny (emotionFamilyIds). Z allowFamilyOnly stają się zapisywaną
// odpowiedzią („zatrzymałem się na rodzinie"); bez niego są nieużywane (brak
// wyboru rodzin w tym trybie — rozwinięcie to czysta nawigacja).
const familiesModel = defineModel<string[]>('families', { default: () => [] })

const emotionStore = useEmotionStore()
const { t } = useT()

// Kapsuła żyje w rzędzie tytułu+chipów (poza panelem) i tylko przy aktywnej
// ćwiartce — na kroku 1 dublowałaby wielką kratę 2×2 tuż pod sobą.
const capsuleVisible = computed(() => quadrantModel.value !== null)

const selectedEmotionIds = ref<string[]>([])
const expandedFamilyId = ref<string | null>(null)
const hoveredId = ref<string | null>(null)
const transitionName = ref<'dive' | 'surface' | 'switch'>('dive')

// --- Poziomy / dane ze sklepu ---
const quadrants = computed(() =>
  QUADRANTS_IN_ORDER.map((value) => getQuadrantDisplayConfig(value, t))
)

const level = computed<'quadrants' | 'families'>(() =>
  quadrantModel.value ? 'families' : 'quadrants'
)

const quadrantFamilies = computed<EmotionFamily[]>(() =>
  quadrantModel.value ? FAMILIES_BY_QUADRANT[quadrantModel.value] : []
)

// Emocje rozwiniętej rodziny, od łagodnych do intensywnych. Heurystyka
// intensywności = odległość od neutralnego środka siatki (6.5, 6.5) na
// całkowitych współrzędnych meta (nie scatter — te są ciągłe i strojone
// wizualnie). Metryka max, tie-break suma, potem id (stabilnie).
function intensityMax(e: Emotion): number {
  return Math.max(Math.abs(e.pleasantness - 6.5), Math.abs(e.energy - 6.5))
}
function intensitySum(e: Emotion): number {
  return Math.abs(e.pleasantness - 6.5) + Math.abs(e.energy - 6.5)
}
const expandedEmotions = computed<Emotion[]>(() => {
  const q = quadrantModel.value
  const famId = expandedFamilyId.value
  if (!q || !famId) return []
  return emotionStore
    .getEmotionsByQuadrant(q)
    .filter((e) => FAMILY_OF[e.id] === famId)
    .sort(
      (a, b) =>
        intensityMax(a) - intensityMax(b) ||
        intensitySum(a) - intensitySum(b) ||
        a.id.localeCompare(b.id)
    )
})

// Licznik wybranych emocji per rodzina — plakietka ●N na zwiniętej karcie
// (wybory pozostają widoczne po zwinięciu/przełączeniu rozwinięcia).
const selectedCountByFamily = computed(() => {
  const counts = new Map<string, number>()
  for (const id of selectedEmotionIds.value) {
    const famId = FAMILY_OF[id]
    if (famId) counts.set(famId, (counts.get(famId) ?? 0) + 1)
  }
  return counts
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
// rodzina NIE pojawia się jako osobny chip (emocja ją reprezentuje). Karty
// rodzin nadal pokazują swój stan — to dotyczy tylko chipów „wybranej
// odpowiedzi". Stosujemy tę samą zasadę po stronie odczytu (historia).
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
// ale renderowany w jednym kontenerze (razem z etykietą pola, gdy podana).
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

// --- Rodziny: wybór (emotionFamilyIds) + rozwinięcie w miejscu ---
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

// Rozwinięcie to czysta nawigacja — nie zmienia modeli. Jedna rodzina naraz
// (pojedynczy ref); rozwinięcie innej samo zwija poprzednią.
function toggleExpand(id: string): void {
  expandedFamilyId.value = expandedFamilyId.value === id ? null : id
  hoveredId.value = null
}
function onCardBodyClick(f: EmotionFamily): void {
  if (props.allowFamilyOnly) toggleFamily(f.id)
  else toggleExpand(f.id)
}

// --- Nawigacja (z kierunkiem animacji) ---
function resetQuadrantNav(): void {
  expandedFamilyId.value = null
  hoveredId.value = null
  // Bez allowFamilyOnly rodziny nie są używane; czyścimy dla higieny stanu.
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
  expandedFamilyId.value = null
  hoveredId.value = null
}
function onSwitcherClick(quadrant: Quadrant): void {
  // Klik w aktywny segment kapsuły = powrót do kroku 1.
  if (quadrant === quadrantModel.value) collapseToQuadrants()
  else switchQuadrant(quadrant)
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

// --- Styl przycisków ćwiartek / kart rodzin / przycisków emocji ---
function gradients(q: Quadrant) {
  const v = (suffix: string) => `var(--color-quadrant-${q}-${suffix})`
  return {
    backgroundGradient: `linear-gradient(145deg, ${v('top')}, ${v('bottom')})`,
    softGradient: `linear-gradient(145deg, ${v('tint-soft')}, ${v('tint')})`,
    discGradient: `linear-gradient(145deg, #ffffff, ${v('tint-soft')})`,
    // Ciemna połowa cienia neumorficznego krążka — zamiast neutralnego
    // błękitno-szarego (fallback w EmotionFaceIcon) odcień ćwiartki.
    discShadow: `color-mix(in srgb, ${v('border')} 42%, transparent)`,
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
// Segment kapsuły: aktywny = pełny gradient ćwiartki (wiąże kapsułę z tintem
// panelu niżej), nieaktywny = sama barwa atramentu na tle kapsuły.
function capsuleSegStyle(quadrant: Quadrant): Record<string, string> {
  const s = quadrantButtonStyles[quadrant]
  if (quadrant === quadrantModel.value) {
    return { background: s.backgroundGradient, color: s.textColor }
  }
  return { color: s.textColor }
}
function familyCardStyle(isSelectedCard: boolean): Record<string, string> {
  const q = quadrantModel.value
  if (!q) return {}
  const s = quadrantButtonStyles[q]
  const style: Record<string, string> = {
    background: isSelectedCard ? s.backgroundGradient : s.softGradient,
    color: s.textColor,
    '--disc': s.discGradient,
    '--disc-shadow': s.discShadow,
  }
  if (isSelectedCard) style.borderColor = s.borderColor
  return style
}
// Obrys wrapa karty przejmuje kolor ćwiartki, gdy rodzina jest zaznaczona
// (obwódka na całości: korpus + pasek ▾ czytają się jako jedna karta).
function wrapStyle(f: EmotionFamily): Record<string, string> {
  const q = quadrantModel.value
  if (!q || !isFamilySelected(f.id) || f.id === expandedFamilyId.value) return {}
  return { borderColor: quadrantButtonStyles[q].borderColor }
}

// Atrament twarzy = token tekstu ćwiartki (paleta zależna od motywu).
function quadrantInkVar(q: Quadrant): string {
  return `var(--color-quadrant-${q}-text)`
}
const quadrantInk = computed(() =>
  quadrantInkVar(quadrantModel.value ?? 'high-energy-high-pleasantness')
)

function getEmotionChipStyle(emotionId: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return {}
  return getQuadrantChipStyle(getQuadrant(emotion))
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
    expandedFamilyId.value = null
    hoveredId.value = null
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
  min-height: 240px;
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

/* === Przełącznik ćwiartek: segmentowana kapsuła 1×4 w rzędzie tytułu+chipów.
   Wysokość ~26px = wysokość chipów, więc rząd nie rośnie. Jedna kontrolka
   (wspólna otoczka), nie cztery luźne przyciski — żeby nie zlewała się
   z chipami wybranych emocji w tym samym rzędzie. */
.q-capsule {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  flex-shrink: 0;
  margin-left: auto;
  background: rgb(255 255 255 / 0.5);
  border: 1px solid rgb(var(--neo-border) / 0.14);
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.6),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.2);
}
.q-capsule__seg {
  width: 27px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 120ms ease, filter 120ms ease;
}
.q-capsule__seg:hover {
  opacity: 1;
  filter: brightness(1.05);
}
.q-capsule__seg:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgb(var(--color-focus));
}
.q-capsule__seg--active {
  opacity: 1;
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.3);
}

.lvl-inner {
  position: relative;
}

/* === Siatka rodzin (poziom 2) z rozwinięciem w miejscu === */
/* dense: po rozwinięciu karty do pełnego rzędu kolejne karty dosuwają się w
   powstałą lukę — rozwinięcie ląduje tuż pod rzędem klikniętej karty. */
.fam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-flow: dense;
  gap: 10px;
}
/* FLIP przemieszczeń kart przy rozwijaniu/zwijaniu (TransitionGroup) */
.fam-move {
  transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.fam-card-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid rgb(var(--neo-border) / 0.1);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.8),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.3);
  transition: transform 150ms ease, filter 150ms ease, border-color 150ms ease;
}
.fam-card-wrap:not(.fam-card-wrap--expanded):hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.fam-card-wrap--expanded {
  grid-column: 1 / -1;
}

/* Korpus karty (zaznacz rodzinę / w trybie bez rodzin: rozwiń) */
.fam-card {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 88px;
  padding: 14px 10px;
  border-radius: 16px;
  border: none;
  text-align: center;
  cursor: pointer;
}
.fam-card--split {
  min-height: 74px;
  padding-bottom: 10px;
  border-radius: 16px 16px 0 0;
}
.fam-card--selected {
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
}
.fam-card:focus-visible,
.fam-expand-strip:focus-visible,
.fam-collapse:focus-visible,
.emotion-btn:focus-visible,
.fam-expanded__head--selectable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgb(var(--color-focus));
}
.fam-card__icon {
  flex-shrink: 0;
}
/* Tło i cień krążka twarzy przejmuje EmotionFaceIcon przez dziedziczone
   zmienne --disc / --disc-shadow (ustawiane w familyCardStyle). */
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
/* Plakietka ●N: liczba wybranych emocji z tej rodziny (stan „wchłonięty") */
.fam-badge-count {
  position: absolute;
  top: 6px;
  left: 6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  color: inherit;
  background: rgb(255 255 255 / 0.75);
  box-shadow: inset 0 0 0 1px rgb(var(--neo-border) / 0.18);
}
/* Bierna strzałka w trybie bez podziału stref (cała karta = rozwiń) */
.fam-card__chevron {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 14px;
  opacity: 0.45;
}

/* Pasek ▾ pod korpusem (tryb allowFamilyOnly): druga strefa karty */
.fam-expand-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 0 3px;
  border: none;
  border-top: 1px solid rgb(var(--neo-border) / 0.14);
  border-radius: 0 0 16px 16px;
  color: inherit;
  cursor: pointer;
  filter: brightness(0.985);
  transition: filter 120ms ease;
}
.fam-expand-strip:hover {
  filter: brightness(1.06);
}
.fam-expand-strip :deep(.text-base),
.fam-expand-strip .text-base {
  opacity: 0.65;
}
.fam-expand-strip:hover .text-base {
  opacity: 1;
}

/* === Karta rozwinięta: pełny rząd, emocje rodziny === */
.fam-expanded {
  border-radius: 16px;
  padding: 12px 14px;
}
.fam-expanded__inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fam-expand-in 180ms ease-out;
}
.fam-expanded__top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.fam-expanded__head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  color: inherit;
}
.fam-expanded__head--selectable {
  cursor: pointer;
  border-color: rgb(var(--neo-border) / 0.14);
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.55),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.2);
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.fam-expanded__head--selectable:hover {
  transform: translateY(-1px);
}
.fam-expanded__head--selected {
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
}
.fam-expanded__emotions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.emotion-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 8px;
  border-radius: 999px;
  border: 1px solid rgb(var(--neo-border) / 0.12);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.6),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.24);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
}
.emotion-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}
.emotion-btn--selected {
  border-width: 1.5px;
  transform: none;
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
}
.fam-collapse {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 999px;
  flex-shrink: 0;
  color: inherit;
  background: rgb(255 255 255 / 0.5);
  border: 1px solid rgb(var(--neo-border) / 0.14);
  cursor: pointer;
  transition: transform 150ms ease;
}
.fam-collapse:hover {
  transform: translateY(-1px);
}

@keyframes fam-expand-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.emotion-description-strip {
  padding: 7px 12px;
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

.switch-enter-active { transition: opacity 260ms ease, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.switch-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.switch-enter-from { opacity: 0; transform: scale(0.94); }
.switch-leave-to { opacity: 0; transform: scale(0.94); }

@media (prefers-reduced-motion: reduce) {
  .es-panel { transition: none !important; }
  .fam-move { transition: none !important; }
  .fam-expanded__inner { animation: none !important; }
  .dive-enter-active, .dive-leave-active,
  .surface-enter-active, .surface-leave-active,
  .switch-enter-active, .switch-leave-active {
    transition: opacity 120ms linear !important;
    transform: none !important;
  }
  .dive-enter-from, .dive-leave-to,
  .surface-enter-from, .surface-leave-to,
  .switch-enter-from, .switch-leave-to {
    transform: none;
  }
}
</style>
