<template>
  <section ref="host" class="scenario-page concept-page ars" :class="{ 'ars--standalone': standalone }">
    <template v-if="!standalone">
      <header class="concept-heading">
        <div>
          <span class="lab-eyebrow">Propozycja · refleksja tygodnia · kroki obszarów</span>
          <h1>Krok obszaru: obciążenie i stan</h1>
          <p>Runda 3. Głównym elementem kroku jest ten sam znak, który pokazuje kalendarz, tylko duży i żywy. Kontrolka stoi teraz na samym znaku: uchwyt „Stan” nad kropką, uchwyt „Obciążenie” pod końcem słupka. Pod spodem wcześniejsze tygodnie mniejszym znakiem i ciche tagi dla obu ocen. Sceny są klikalne i dzielą jeden szkic.</p>
        </div>
        <span class="status-badge status-badge--experiment">Runda 3 · do rozmowy</span>
      </header>

      <!-- 01 · Stan obecny -->
      <section class="ars__block">
        <header class="ars__block-head">
          <span class="lab-eyebrow">01 · Stan obecny · verify 16.11.2026</span>
          <h2>Historia stoi przed oceną</h2>
        </header>
        <figure class="ars__shot">
          <img src="/research/current/reflection/area-step-2026-11-16.png" alt="Krok „Ciało” refleksji tygodnia: na górze pole z kolumną dziesięciu tygodni historii, pod nim dwa pionowe słupki ocen ucięte dolną krawędzią karty" />
          <figcaption>
            <strong>Krok „Ciało”, 1512 × 982.</strong>
            {{ currentFacts }}
          </figcaption>
        </figure>
      </section>

      <!-- ustawienia -->
      <div class="ars__toolbar" aria-label="Ustawienia sceny">
        <label>Obszar
          <select :value="areaKey" @change="setQuery('area', pick($event), 'body')">
            <option v-for="item in AREAS" :key="item.key" :value="item.key">{{ item.label }}</option>
          </select>
        </label>
        <label>Szkic
          <select :value="fill" @change="setQuery('fill', pick($event), 'rated')">
            <option v-for="item in FILLS" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label>Historia
          <select :value="historyMode" @change="setQuery('history', pick($event), 'rated')">
            <option v-for="item in HISTORY_MODES" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label>Podpis (G)
          <select :value="labels" @change="setQuery('labels', pick($event), 'chip')">
            <option v-for="item in HANDLE_LABELS" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label>Ocena (E–F)
          <select :value="controls" @change="setQuery('controls', pick($event), 'dots')">
            <option v-for="item in CONTROL_STYLES" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <button type="button" class="ars__reset" @click="reset">Przywróć szkic</button>
        <nav class="ars__jump" aria-label="Podejścia">
          <a v-for="item in blocks" :key="item.id" :href="`#ars-${item.id}`">{{ item.id.toUpperCase() }}</a>
        </nav>
      </div>
    </template>

    <!-- 02 · runda 3: uchwyty na znaku; 03 · runda 2 i 1 jako zapis -->
    <template v-for="item in blocks" :key="item.id">
    <header v-if="groupOf(item.id) && !standalone" class="ars__block ars__block-head ars__group">
      <span class="lab-eyebrow">{{ groupOf(item.id)?.eyebrow }}</span>
      <h2>{{ groupOf(item.id)?.title }}</h2>
      <p>{{ groupOf(item.id)?.lead }}</p>
    </header>
    <section :id="`ars-${item.id}`" class="ars__block ars__dir">
      <header v-if="!standalone" class="ars__block-head ars__dir-head">
        <span class="ars__letter">{{ item.id.toUpperCase() }}</span>
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.lead }}</p>
        </div>
        <a class="ars__preview" :href="previewHref(item.id)" target="_blank" rel="noopener">{{ fit < 1 ? `Podgląd 1:1 · tu ${Math.round(fit * 100)}%` : 'Podgląd 1:1' }}</a>
      </header>

      <div class="ars__stage" :style="{ zoom: standalone ? undefined : fit }">
        <RitualFrame
          :question="item.id === 'd' ? MERGED_QUESTION : area.question"
          :steps="item.id === 'd' ? STEPS_MERGED : STEPS_SEPARATE"
          :current="item.id === 'd' ? 1 : 1 + AREA_KEYS.indexOf(areaKey)"
        >
          <AreaStepHandles
            v-if="item.id === 'g'"
            :area="area"
            :draft="draft[areaKey]"
            :past="past(areaKey, 5)"
            :current-label="CURRENT_WEEK_LABEL"
            :suggestions="suggestions"
            :labels="labels"
            @rate="(axis, value) => rate(areaKey, axis, value)"
            @tags="(axis, tags) => setTags(areaKey, axis, tags)"
          />
          <AreaStepHero
            v-else-if="item.round === 2"
            :area="area"
            :draft="draft[areaKey]"
            :past="past(areaKey, 5)"
            :current-label="CURRENT_WEEK_LABEL"
            :suggestions="suggestions"
            :layout="item.id === 'f' ? 'side' : 'stack'"
            :controls="controls"
            @rate="(axis, value) => rate(areaKey, axis, value)"
            @tags="(axis, tags) => setTags(areaKey, axis, tags)"
          />
          <AreaStepStacks
            v-else-if="item.id === 'a'"
            :area="area"
            :draft="draft[areaKey]"
            :past="past(areaKey, 6)"
            :current-label="CURRENT_WEEK_LABEL"
            :suggestions="suggestions"
            @rate="(axis, value) => rate(areaKey, axis, value)"
            @tags="(axis, tags) => setTags(areaKey, axis, tags)"
          />
          <AreaStepLayers
            v-else-if="item.id === 'b'"
            :area="area"
            :draft="draft[areaKey]"
            :past="past(areaKey, 4)"
            :current-label="CURRENT_WEEK_LABEL"
            :suggestions="suggestions"
            @rate="(axis, value) => rate(areaKey, axis, value)"
            @tags="(axis, tags) => setTags(areaKey, axis, tags)"
          />
          <AreaStepMap
            v-else-if="item.id === 'c'"
            :area="area"
            :draft="draft[areaKey]"
            :past="past(areaKey, 6)"
            :suggestions="suggestions"
            @pick="(load, state) => pickPair(areaKey, load, state)"
            @tags="(axis, tags) => setTags(areaKey, axis, tags)"
          />
          <AreaStepTiles
            v-else
            :draft="draft"
            :past="pastAll"
            :suggestions="(key, axis) => tagSuggestions(draft, key, axis)"
            :pinned="pinned"
            @rate="rate"
            @tags="setTags"
          />
        </RitualFrame>
      </div>

      <dl v-if="!standalone" class="ars__facts">
        <div><dt>Ustawianie i tagi</dt><dd>{{ item.sets }}</dd></div>
        <div><dt>Historia</dt><dd>{{ item.history }}</dd></div>
        <div><dt>Ryzyko</dt><dd>{{ item.risk }}</dd></div>
      </dl>
    </section>
    </template>

    <template v-if="!standalone">
      <!-- 03 · do rozmowy -->
      <section class="ars__block">
        <header class="ars__block-head">
          <span class="lab-eyebrow">05 · Do rozmowy</span>
          <h2>Sześć rozstrzygnięć</h2>
        </header>
        <ol class="ars__decisions">
          <li v-for="item in decisions" :key="item.id">
            <span class="ars__letter">{{ item.id }}</span>
            <div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div>
          </li>
        </ol>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Rating } from '@product/domain/loadState'
import AreaStepHandles from '~lab/components/area-rating/AreaStepHandles.vue'
import AreaStepHero from '~lab/components/area-rating/AreaStepHero.vue'
import AreaStepLayers from '~lab/components/area-rating/AreaStepLayers.vue'
import AreaStepMap from '~lab/components/area-rating/AreaStepMap.vue'
import AreaStepStacks from '~lab/components/area-rating/AreaStepStacks.vue'
import AreaStepTiles from '~lab/components/area-rating/AreaStepTiles.vue'
import RitualFrame from '~lab/components/area-rating/RitualFrame.vue'
import {
  AREA_KEYS,
  AREAS,
  areaOf,
  CONTROL_STYLES,
  CURRENT_WEEK_LABEL,
  decisions,
  draftFor,
  FILLS,
  HANDLE_LABELS,
  HISTORY_MODES,
  MERGED_QUESTION,
  pastWeeks,
  STEPS_MERGED,
  STEPS_SEPARATE,
  tagSuggestions,
  VARIANT_IDS,
  VARIANTS,
  type AreaKey,
  type AxisKey,
  type ControlStyle,
  type Draft,
  type FillId,
  type HandleLabels,
  type HistoryMode,
  type PastWeek,
  type VariantId,
} from '~lab/lab/areaRatingStep'

/**
 * Krok obszaru w refleksji tygodnia (2026-11-16). Po wdrożeniu znaku
 * „Obciążenie i stan” krok zaczyna się od dziesięciu tygodni historii, a
 * słupki ocen zjeżdżają pod zgięcie karty. Runda 1: cztery podejścia na jednej
 * ramie rytuału i jednym szkicu ocen (A słupki z historią obok, B znak
 * rozłożony na dwie warstwy, C mapa 5 × 5, D cztery kafle w jednym kroku) —
 * user nie był do nich przekonany. Runda 2 (21.11): ten sam obiekt co w
 * kalendarzu jako główny element kroku, duży i żywy; E oceny pod znakiem,
 * F znak i historia razem, oceny obok — user: kropki ocen wyglądają na
 * rozłączone ze znakiem. Runda 3: G, uchwyty przypięte do kropki i końca
 * słupka.
 * `/preview/area-rating-step?variant=g&area=body&fill=rated` pokazuje jeden
 * krok w geometrii produktu do zrzutów 1:1.
 */
const route = useRoute()
const router = useRouter()
const standalone = computed(() => Boolean(route.meta.standalone))

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}
const areaKey = computed(() => oneOf<AreaKey>(route.query.area, AREA_KEYS, 'body'))
const area = computed(() => areaOf(areaKey.value))
const fill = computed(() => oneOf<FillId>(route.query.fill, ['rated', 'partial', 'empty'], 'rated'))
const historyMode = computed(() => oneOf<HistoryMode>(route.query.history, ['rated', 'recent'], 'rated'))
/** Dymek historii w D przypięty do zrzutu: `?pop=body`. */
const pinned = computed(() => (AREA_KEYS.includes(route.query.pop as AreaKey) ? (route.query.pop as AreaKey) : null))

const controls = computed(() => oneOf<ControlStyle>(route.query.controls, ['dots', 'steps'], 'dots'))
const labels = computed(() => oneOf<HandleLabels>(route.query.labels, ['chip', 'row'], 'chip'))

const blocks = computed(() => (standalone.value ? VARIANTS.filter(item => item.id === oneOf<VariantId>(route.query.variant, VARIANT_IDS, 'g')) : VARIANTS))
/** Nagłówek grupy przed pierwszym podejściem każdej rundy. */
const GROUPS: Partial<Record<VariantId, { eyebrow: string; title: string; lead: string }>> = {
  g: { eyebrow: '02 · Runda 3 · kontrolka na znaku', title: 'Uchwyt stoi przy tym, co zmienia', lead: 'Kliknij strzałkę na uchwycie, miejsce skali na torze albo złap kropkę i koniec słupka. Najedź na miejsce skali — znak pokaże, co się zmieni.' },
  e: { eyebrow: '03 · Runda 2 · zapis', title: 'Duży znak, oceny obok niego', lead: 'User 21.11: wykresy duże i małe są w porządku, ale kropki ocen wyglądają na rozłączone ze znakiem — nie widać, że zmieniają słupek i kropkę.' },
  a: { eyebrow: '04 · Runda 1 · zapis', title: 'Cztery wcześniejsze podejścia', lead: 'Punkt wyjścia rundy 2. User 21.11: „nie do końca jestem przekonany do tych wersji”.' },
}
const groupOf = (id: VariantId) => GROUPS[id]

/** Jeden szkic dla wszystkich podejść — ta sama ocena w czterech formach. */
const draft = reactive<Draft>(draftFor(fill.value))
function reset() {
  Object.assign(draft, draftFor(fill.value))
}
watch(fill, reset)

function rate(key: AreaKey, axis: AxisKey, value: number | null) {
  draft[key][axis] = value as Rating | null
}
function pickPair(key: AreaKey, load: number | null, state: number | null) {
  draft[key].load = load as Rating | null
  draft[key].state = state as Rating | null
}
function setTags(key: AreaKey, axis: AxisKey, tags: string[]) {
  draft[key].tags[axis] = tags
}
const suggestions = computed<Record<AxisKey, string[]>>(() => ({
  load: tagSuggestions(draft, areaKey.value, 'load'),
  state: tagSuggestions(draft, areaKey.value, 'state'),
}))
const past = (key: AreaKey, count: number): PastWeek[] => pastWeeks(key, historyMode.value, count)
const pastAll = computed(() => Object.fromEntries(AREA_KEYS.map(key => [key, past(key, 4)])) as Record<AreaKey, PastWeek[]>)

/** Pomiar Codexa na verify 16.11.2026 (1512 × 982): `ideas/qa/area-rating-step/r1/report.md`. */
const currentFacts = 'Pole historii (760 × 211 px, dziesięć tygodni) stoi nad słupkami (760 × 356 px), które zaczynają się 244 px pod pytaniem. Krok mieści się na styk: 18 px nad stopką. Z prawdziwymi danymi usera pole historii jest wyższe i słupki ucina krawędź karty.'

/**
 * Rama rytuału ma szerokość produktu (karta 1120 px + margines strony). Gdy
 * kolumna Labu jest węższa, scena się pomniejsza; „Podgląd 1:1” pokazuje wymiar
 * produktu.
 */
const STAGE_WIDTH = 1192
const host = ref<HTMLElement | null>(null)
const fit = ref(1)
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!host.value) return
  observer = new ResizeObserver(([entry]) => {
    fit.value = Math.min(1, Math.round((entry.contentRect.width / STAGE_WIDTH) * 1000) / 1000)
  })
  observer.observe(host.value)
})
onUnmounted(() => observer?.disconnect())

function previewHref(variant: VariantId): string {
  return router.resolve({ path: '/preview/area-rating-step', query: { ...route.query, variant } }).href
}
const pick = (event: Event) => (event.target as HTMLSelectElement).value
function setQuery(key: string, value: string, fallback: string) {
  void router.replace({ query: { ...route.query, [key]: value === fallback ? undefined : value }, hash: route.hash })
}

/** The product paints its canvas from `:root[data-theme]`; verify runs the `current` theme. */
watch(() => String(route.query.theme ?? 'current'), value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
</script>

<style scoped>
.ars__block { margin-top: 34px; scroll-margin-top: 150px; }
.ars__block-head { margin-bottom: 14px; }
.ars__block-head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.ars__block-head p { max-width: 760px; margin: 6px 0 0; color: var(--mg-color-muted); font-size: 13px; line-height: 1.5; }
.ars__letter { display: inline-grid; place-items: center; flex: none; min-width: 30px; height: 30px; padding: 0 6px; border-radius: var(--mg-radius-pill); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 13px; font-weight: 800; white-space: nowrap; }

/* 01 · zrzut */
.ars__shot { display: grid; max-width: 1180px; margin: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-paper); overflow: hidden; }
.ars__shot img { display: block; width: 100%; background: var(--mg-color-canvas); }
.ars__shot figcaption { padding: 12px 18px; border-top: 1px solid var(--mg-color-border); color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.ars__shot figcaption strong { color: var(--mg-color-ink); font-size: 13px; }

/* ustawienia */
.ars__toolbar { position: sticky; top: 64px; z-index: 6; display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-top: 30px; padding: 14px 16px; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.ars__toolbar label { display: grid; gap: 5px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.ars__toolbar select { min-height: 34px; min-width: 104px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--mg-color-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; font-weight: 700; text-transform: none; letter-spacing: 0; }
.ars__reset { min-height: 34px; padding: 0 12px; border: 0; border-radius: var(--mg-radius-button); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); font: inherit; font-size: 12px; font-weight: 700; box-shadow: var(--mg-shadow-control); cursor: pointer; }
.ars__reset:hover { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control-hover); }
.ars__jump { display: flex; gap: 6px; margin-left: auto; }
.ars__jump a { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--mg-radius-pill); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 800; text-decoration: none; box-shadow: var(--mg-shadow-control); }
.ars__jump a:hover { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control-hover); }

/* 02 · podejście: nagłówek, krok w ramie rytuału, trzy fakty */
.ars__dir-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 12px; }
.ars__group { margin-bottom: -14px; }
.ars__dir-head h3 { margin: 3px 0 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; }
.ars__preview { align-self: center; color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 700; }
.ars__stage { width: 1192px; border-radius: var(--mg-radius-xl); overflow: hidden; }
.ars__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1180px; margin: 12px 0 0; padding: 0 4px; }
.ars__facts dt { color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.ars__facts dd { margin: 3px 0 0; color: var(--mg-color-ink); font-size: 12.5px; line-height: 1.5; }

/* podgląd 1:1: strona rytuału tam, gdzie stoi w produkcie przy 1512 × 982 (dok 72 px z lewej) */
.ars--standalone { width: auto; min-height: 100vh; margin: 0; padding-left: 72px; background: var(--mg-color-canvas); }
.ars--standalone .ars__block { margin: 0; }
.ars--standalone .ars__stage { width: auto; border-radius: 0; overflow: visible; }

/* 03 · decyzje */
.ars__decisions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 22px; margin: 0; padding: 0; list-style: none; }
.ars__decisions li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; }
.ars__decisions strong { color: var(--mg-color-ink); font-size: 14px; font-weight: 800; }
.ars__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12.5px; line-height: 1.55; }
</style>
