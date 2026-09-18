<template>
  <section class="scenario-page concept-page ls-page" :style="{ '--ls-paper': 'rgb(var(--sky-50))' }">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · refleksja tygodniowa</span>
        <h1>Obciążenie i stan tygodnia · jeden kolor na parę</h1>
        <p>
          Refleksja ocenia dwa wymiary na obszar: <b>obciążenie</b> (ile obszar ode mnie wymagał, ile w niego włożyłem)
          i <b>stan</b> (jak obszar czuje się na koniec tygodnia). Para trafia do jednej z czterech ćwiartek, kolorowanych
          tokenami ćwiartek emocji: obciążenie to oś pobudzenia, stan to oś przyjemności. Kolumna „Działania” znika.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Koncepcja · nie baseline</span>
    </header>

    <!-- Sterowanie ------------------------------------------------------- -->
    <div class="ls-controls" role="group" aria-label="Ustawienia konceptu">
      <label>
        <span>Seria tygodni</span>
        <select v-model="range">
          <option :value="12">12 tygodni</option>
          <option :value="24">24 tygodnie</option>
        </select>
      </label>
      <label>
        <span>Przejścia koloru</span>
        <select v-model="transition">
          <option value="smooth">płynne (gradient między tygodniami)</option>
          <option value="sharp">ostre (cięcie na granicy tygodnia)</option>
        </select>
      </label>
      <label class="ls-check">
        <input v-model="ticks" type="checkbox" />
        <span>Kreski obciążenia na kafelkach</span>
      </label>
    </div>

    <!-- 01 · Reguła koloru ------------------------------------------------ -->
    <section class="ls-block">
      <header class="ls-block__head">
        <div>
          <span class="lab-eyebrow">01 · Reguła</span>
          <h2>Cztery ćwiartki, środek między luźnym a aktywnym</h2>
          <p>
            Wiersze to stan, kolumny to obciążenie. Trójka stanu nie daje werdyktu, więc cały środkowy wiersz ma
            sky-500: niebieski pomiędzy „luźnym” a „aktywnym i dobrym” (sky-600). Trójka obciążenia przy rozstrzygniętym
            stanie miesza dwie sąsiednie ćwiartki. Kliknij komórkę, żeby ustawić ją w słupkach obok.
          </p>
        </div>
        <ul class="ls-block__notes">
          <li>Róż = trudny (ciężko · źle), fiolet = słaby (lekko · źle), jasny błękit = luźny (lekko · dobrze), ciemniejszy niebieski = aktywny i dobry.</li>
          <li>Decyzje 12.09: ciężko · dobrze = sky-600, środek = sky-500, trójka obciążenia mieszana.</li>
          <li>Kolor nie niesie siły. Para (4,4) i (5,5) świecą tak samo; liczby wracają w podpowiedzi.</li>
        </ul>
      </header>
      <div class="ls-grid ls-grid--rule">
        <div class="ls-card">
          <p class="ls-card__caption">Paleta 5 × 5</p>
          <LoadStateLegend :options="options" :active="focusPair" @pick="pickPair" />
        </div>
        <div class="ls-card">
          <p class="ls-card__caption">Ta sama para w trzech rozmiarach</p>
          <div class="ls-sizes">
            <LoadStateBars :load="focusPair.load" :state="focusPair.state" label="Słupki" size="lg" :options="options" />
            <div class="ls-sizes__col">
              <LoadStateTiles :pairs="focusAsAll" size="lg" :ticks="ticks" :options="options" />
              <small>kafelki ×4</small>
            </div>
            <div class="ls-sizes__col">
              <LoadStateTiles :pairs="focusAsAll" size="sm" :ticks="ticks" :options="options" />
              <small>w kalendarzu roku</small>
            </div>
          </div>
          <p class="ls-verdict" :style="{ background: pairColor(focusPair.load, focusPair.state, options), color: pairInk(focusPair.load, focusPair.state, options) }">
            {{ verdictSentence('body', focusPair.load, focusPair.state) }}
          </p>
        </div>
      </div>
    </section>

    <!-- 02 · Hantla ------------------------------------------------------ -->
    <section class="ls-block">
      <header class="ls-block__head">
        <div>
          <span class="lab-eyebrow">02 · Jeden tydzień</span>
          <h2>Dwa słupki w stylu aplikacji</h2>
          <p>
            Decyzja 13.09: wracamy do dwóch słupków i bierzemy gotowe style z aplikacji. Duży rozmiar to segmentowane
            słupki cichego rytuału (pięć pól, nieregularne promienie, lekki obrót, drabinka krycia). Mały rozmiar to para
            cienkich słupków z kalendarza rytmu. Lewy słupek = obciążenie w atramencie, prawy = stan w kolorze ćwiartki.
          </p>
        </div>
        <ul class="ls-block__notes">
          <li>Skrajne pary w rzędzie u góry: 1·1 i 5·5 różnią się liczbą wypełnionych pól, nie pozycją.</li>
          <li>Zdanie werdyktu pojawia się dopiero po obu ocenach, w tonie neutralnym.</li>
          <li>Poprzedni tydzień do dodania jako blade pola za słupkiem (jak „ghost” w rytuale), tu pominięty.</li>
        </ul>
      </header>
      <div class="ls-card ls-compare">
        <div v-for="p in testPairs" :key="`${p.load}${p.state}`" class="ls-compare__cell">
          <LoadStateBars :load="p.load" :state="p.state" size="lg" :options="options" />
          <b>{{ p.load }} · {{ p.state }}</b>
          <small>{{ p.note }}</small>
        </div>
        <div class="ls-compare__cell ls-compare__cell--rail">
          <LoadStateBars v-for="area in AREA_KEYS" :key="area" :load="current[area].load" :state="current[area].state" :label="AREA_LABELS[area]" size="sm" :options="options" />
          <small>rail · mały rozmiar</small>
        </div>
      </div>
      <div class="ls-card ls-ritual">
        <div class="ls-ritual__areas">
        <article v-for="area in AREA_KEYS" :key="area" class="ls-ritual__area">
          <header>
            <AppIcon :name="AREA_ICONS[area]" />
            <h3>{{ AREA_LABELS[area] }}</h3>
          </header>
          <div class="ls-ritual__body">
            <LoadStateBars :load="current[area].load" :state="current[area].state" size="lg" :options="options" />
            <div class="ls-ritual__steppers">
              <div class="ls-stepper">
                <span>Obciążenie</span>
                <div role="group" :aria-label="`Obciążenie · ${AREA_LABELS[area]}`">
                  <button v-for="n in 5" :key="n" type="button" class="ls-stepper__btn ls-stepper__btn--hollow" :class="{ active: current[area].load === n }" :aria-pressed="current[area].load === n" @click="setValue(area, 'load', n)">{{ n }}</button>
                </div>
                <small>{{ loadHint[area] }}</small>
              </div>
              <div class="ls-stepper">
                <span>Stan</span>
                <div role="group" :aria-label="`Stan · ${AREA_LABELS[area]}`">
                  <button v-for="n in 5" :key="n" type="button" class="ls-stepper__btn" :class="{ active: current[area].state === n }" :aria-pressed="current[area].state === n" @click="setValue(area, 'state', n)">{{ n }}</button>
                </div>
                <small>{{ stateHint[area] }}</small>
              </div>
            </div>
          </div>
          <p
            v-if="current[area].load && current[area].state"
            class="ls-verdict ls-verdict--sm"
            :style="{ background: pairColor(current[area].load, current[area].state, options), color: pairInk(current[area].load, current[area].state, options) }"
          >
            {{ verdictSentence(area, current[area].load, current[area].state) }}
          </p>
          <p v-else class="ls-verdict ls-verdict--sm ls-verdict--empty">Oceń oba wymiary, żeby zobaczyć werdykt.</p>
        </article>
        </div>
        <aside class="ls-ritual__rail">
          <p class="ls-card__caption">Rail okresu · ten tydzień</p>
          <div class="ls-rail">
            <LoadStateBars v-for="area in AREA_KEYS" :key="area" :load="current[area].load" :state="current[area].state" :label="AREA_LABELS[area]" size="sm" :options="options" />
          </div>
          <p class="ls-card__caption">Kafelek tygodnia w kalendarzu</p>
          <LoadStateTiles :pairs="current" size="lg" :ticks="ticks" :options="options" />
        </aside>
      </div>
    </section>

    <!-- 03 · Wstęga ------------------------------------------------------- -->
    <section class="ls-block">
      <header class="ls-block__head">
        <div>
          <span class="lab-eyebrow">03 · Seria tygodni</span>
          <h2>Akwarela między obciążeniem a stanem</h2>
          <p>
            Cieńsza linia to obciążenie, grubsza to stan, obie ciągłe. Pole między nimi wypełnia akwarela w kolorze
            ćwiartki tygodnia: przełącznik „Przejścia” u góry porównuje cięcie na granicy tygodnia z gradientem między
            środkami sąsiednich tygodni. Jeden pasek na obszar zastępuje cztery wiersze macierzy. Najedź na tydzień.
          </p>
        </div>
        <ul class="ls-block__notes">
          <li>Próbka to autorska „opowieść” 24 tygodni: cykl treningowy i przeciążenie ciała, burzliwy grudzień emocji, tydzień unikania zadań, konflikt u bliskich.</li>
          <li>Pod wstęgami ten sam okres jako kafelki 4 × N, czyli widok kalendarza roku.</li>
          <li>Trajektorie po prawej to wersja „lupy”: pole 5 × 5 ze śladem pięciu tygodni.</li>
        </ul>
      </header>
      <div class="ls-grid ls-grid--series">
        <div class="ls-card">
          <div v-for="area in AREA_KEYS" :key="area" class="ls-series-row">
            <div class="ls-series-row__name">
              <AppIcon :name="AREA_ICONS[area]" />
              <span>{{ AREA_LABELS[area] }}</span>
            </div>
            <LoadStateRibbon :points="visible(series[area])" :label="AREA_LABELS[area]" :height="64" :options="options" :show-axis="area === 'closeOnes'" :transition="transition" />
          </div>
          <div class="ls-series-row ls-series-row--tiles">
            <div class="ls-series-row__name"><span>Kafelki</span></div>
            <div class="ls-tile-strip">
              <LoadStateTiles v-for="(w, i) in visible(series.body)" :key="w.weekRef" :pairs="pairsAtWeek(i)" direction="column" :ticks="ticks" :options="options" />
            </div>
          </div>
          <p class="ls-legend-line">
            <i class="ls-legend-line__load" /> obciążenie&nbsp;&nbsp;<i class="ls-legend-line__state" /> stan
            <span v-for="q in quadrantOrder" :key="q"><b :style="{ background: quadrantCss(q, options) }" /> {{ QUADRANT_LABELS[q] }}</span>
          </p>
        </div>
        <div class="ls-card ls-traj-grid">
          <p class="ls-card__caption">Lupa · trajektoria 5 tygodni</p>
          <LoadStateTrajectory v-for="area in AREA_KEYS" :key="area" :points="visible(series[area])" :label="AREA_LABELS[area]" :options="options" />
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import LoadStateLegend from '~lab/components/load-state/LoadStateLegend.vue'
import LoadStateRibbon from '~lab/components/load-state/LoadStateRibbon.vue'
import LoadStateTiles from '~lab/components/load-state/LoadStateTiles.vue'
import LoadStateTrajectory from '~lab/components/load-state/LoadStateTrajectory.vue'
import LoadStateBars from '~lab/components/load-state/LoadStateBars.vue'
import {
  AREA_ICONS, AREA_KEYS, AREA_LABELS, buildStorySeries, pairColor, pairInk, quadrantCss, QUADRANT_LABELS, verdictSentence,
  type AreaKey, type ColorOptions, type LoadStatePair, type LoadStateQuadrant, type Rating, type WeekPoint,
} from '~lab/lab/weekLoadState'

const options = reactive<Required<ColorOptions>>({ recoveryShade: 'sky-600', midpoint: 'blend' })
const range = ref<12 | 24>(24)
const transition = ref<'sharp' | 'smooth'>('smooth')

const testPairs: { load: Rating; state: Rating; note: string }[] = [
  { load: 1, state: 1, note: 'lekko · źle' },
  { load: 5, state: 5, note: 'ciężko · dobrze' },
  { load: 5, state: 1, note: 'ciężko · źle' },
  { load: 1, state: 5, note: 'lekko · dobrze' },
  { load: 3, state: 3, note: 'środek' },
  { load: 4, state: 2, note: 'ciężko · słabo' },
]
const ticks = ref(false)

const series = buildStorySeries()
const visible = (points: WeekPoint[]) => points.slice(-range.value)

// Bieżący i poprzedni tydzień z końca opowieści.
const current = reactive<Record<AreaKey, LoadStatePair>>(Object.fromEntries(
  AREA_KEYS.map(a => [a, { load: series[a].at(-1)!.load, state: series[a].at(-1)!.state }]),
) as Record<AreaKey, LoadStatePair>)

function setValue(area: AreaKey, key: 'load' | 'state', n: number) {
  current[area][key] = current[area][key] === n ? null : (n as Rating)
}

const focusPair = reactive<{ load: Rating | null; state: Rating | null }>({ load: 5, state: 4 })
const pickPair = (pair: { load: Rating; state: Rating }) => { focusPair.load = pair.load; focusPair.state = pair.state }
const focusAsAll = computed(() => Object.fromEntries(AREA_KEYS.map(a => [a, { ...focusPair }])) as Record<AreaKey, LoadStatePair>)

const pairsAtWeek = (i: number) => Object.fromEntries(
  AREA_KEYS.map(a => { const p = visible(series[a])[i]; return [a, { load: p.load, state: p.state }] }),
) as Record<AreaKey, LoadStatePair>

const quadrantOrder: LoadStateQuadrant[] = ['strain', 'low', 'neutral', 'ease', 'recovery']

const loadHint: Record<AreaKey, string> = {
  body: 'trening, choroba, krótkie noce, podróż',
  emotions: 'jak mocno rzeczy Cię poruszały',
  tasks: 'praca faktycznie przerobiona, nie czekająca',
  closeOnes: 'wsparcie dawane + wyprowadzanie z równowagi',
}
const stateHint: Record<AreaKey, string> = {
  body: 'energia, bez kontuzji, wypoczęty',
  emotions: 'jak czujesz się na koniec',
  tasks: 'na bieżąco czy do tyłu',
  closeOnes: 'bliskość czy samotność',
}
</script>

<style>
.ls-page .concept-heading p b { font-weight: 800; }

/* Sterowanie */
.ls-page .ls-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 26px; margin: 0 0 24px; padding: 12px 16px; border: 1px dashed rgb(var(--neo-border) / 0.55); border-radius: 17px 14px 18px 15px; }
.ls-page .ls-controls label { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; color: rgb(var(--neo-muted)); font-weight: 700; }
.ls-page .ls-controls select { min-height: 30px; padding: 3px 8px; border: 1px solid rgb(var(--neo-border) / 0.35); border-radius: 10px; background: color-mix(in srgb, white 45%, rgb(var(--sky-100))); color: rgb(var(--color-on-surface)); font: inherit; font-size: 12px; }
.ls-page .ls-swatches { display: inline-flex; gap: 6px; }
.ls-page .ls-swatch { width: 22px; height: 22px; border-radius: 7px; border: 2px solid transparent; cursor: pointer; }
.ls-page .ls-swatch--active { border-color: rgb(var(--color-on-surface)); }
.ls-page .ls-check input { accent-color: rgb(var(--color-primary-strong)); }

/* Bloki */
.ls-page .ls-block { margin-bottom: 36px; }
.ls-page .ls-block__head { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 22px; align-items: start; margin-bottom: 14px; }
.ls-page .ls-block__head h2 { margin: 4px 0 6px; font-size: 20px; }
.ls-page .ls-block__head p { margin: 0; max-width: 720px; color: rgb(var(--neo-muted)); font-size: 13px; line-height: 1.55; }
.ls-page .ls-block__notes { margin: 0; padding: 12px 14px 12px 28px; border: 1px dashed rgb(var(--neo-border) / 0.55); border-radius: 17px 14px 18px 15px; color: rgb(var(--color-on-surface)); font-size: 12px; line-height: 1.5; }
.ls-page .ls-block__notes li + li { margin-top: 4px; }

.ls-page .ls-grid { display: grid; gap: 18px; }
.ls-page .ls-grid--rule { grid-template-columns: minmax(300px, 420px) minmax(0, 1fr); }
.ls-page .ls-grid--series { grid-template-columns: minmax(0, 1fr) 280px; }
.ls-page .ls-card { padding: 18px 20px 16px; border: 1px solid rgb(var(--neo-border) / 0.2); border-radius: 25px 30px 24px 28px; background: color-mix(in srgb, white 45%, rgb(var(--sky-100))); }
.ls-page .ls-card__caption { margin: 0 0 10px; color: rgb(var(--neo-muted)); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }

/* 01 */
.ls-page .ls-sizes { display: flex; align-items: flex-end; gap: 28px; margin-bottom: 16px; }
.ls-page .ls-sizes__col { display: grid; justify-items: center; gap: 6px; }
.ls-page .ls-sizes__col small { color: rgb(var(--neo-muted)); font-size: 11px; }
.ls-page .ls-verdict { margin: 0; padding: 8px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; }
.ls-page .ls-verdict--sm { font-size: 12px; padding: 6px 10px; }
.ls-page .ls-verdict--empty { background: transparent; color: rgb(var(--neo-muted)); font-weight: 600; border: 1px dashed rgb(var(--neo-border) / 0.5); }

/* 02 · porównanie glifów */
.ls-page .ls-glyph-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 8px; }
.ls-page .ls-tab { min-height: 30px; padding: 5px 12px; border: 1px solid rgb(var(--neo-border) / 0.2); border-radius: 14px 17px 12px 16px; background: color-mix(in srgb, white 45%, rgb(var(--sky-100))); color: rgb(var(--neo-muted)); font-size: 11px; font-weight: 800; cursor: pointer; }
.ls-page .ls-tab--active { color: rgb(var(--color-primary-strong)); background: color-mix(in srgb, white 80%, rgb(var(--sky-100))); border-color: rgb(var(--color-primary) / 0.6); }
.ls-page .ls-glyph-tabs__hint { color: rgb(var(--neo-muted)); font-size: 11px; }
.ls-page .ls-compare { margin-bottom: 18px; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)) 220px; gap: 12px; }
.ls-page .ls-compare__cell { display: grid; justify-items: center; align-content: end; gap: 6px; padding: 10px; border-radius: 17px 14px 18px 15px; background: color-mix(in srgb, white 80%, rgb(var(--sky-100))); }
.ls-page .ls-compare__cell b { font-size: 12px; }
.ls-page .ls-compare__cell small { color: rgb(var(--neo-muted)); font-size: 10px; }
.ls-page .ls-compare__cell--rail { grid-auto-flow: column; grid-template-columns: repeat(4, auto); column-gap: 10px; }
.ls-page .ls-compare__cell--rail small { grid-column: 1 / -1; }

/* 02 */
.ls-page .ls-ritual { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 18px; }
.ls-page .ls-ritual__areas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.ls-page .ls-ritual__area { display: grid; grid-template-rows: auto 1fr auto; gap: 12px; padding: 14px; border-radius: 17px 14px 18px 15px; background: color-mix(in srgb, white 80%, rgb(var(--sky-100))); transform: rotate(-0.25deg); }
.ls-page .ls-ritual__area:nth-child(even) { transform: rotate(0.2deg); }
.ls-page .ls-ritual__area header { display: flex; align-items: center; gap: 8px; }
.ls-page .ls-ritual__area h3 { margin: 0; font-size: 15px; }
.ls-page .ls-ritual__body { display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: center; }
.ls-page .ls-ritual__steppers { display: grid; gap: 12px; }
.ls-page .ls-stepper { display: grid; gap: 4px; }
.ls-page .ls-stepper > span { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgb(var(--neo-muted)); }
.ls-page .ls-stepper > div { display: flex; flex-wrap: wrap; gap: 4px; }
.ls-page .ls-stepper small { color: rgb(var(--neo-muted)); font-size: 10px; line-height: 1.35; }
.ls-page .ls-stepper__btn { width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid rgb(var(--neo-border) / 0.6); background: rgb(var(--sky-50)); color: rgb(var(--neo-muted)); font-size: 11px; font-weight: 750; cursor: pointer; }
.ls-page .ls-stepper__btn.active { background: rgb(var(--color-on-surface)); border-color: rgb(var(--color-on-surface)); color: white; }
.ls-page .ls-stepper__btn--hollow.active { background: rgb(var(--sky-50)); color: rgb(var(--color-on-surface)); border-width: 2.5px; }
.ls-page .ls-ritual__rail { display: grid; align-content: start; gap: 10px; padding: 14px; border-left: 1px dashed rgb(var(--neo-border) / 0.5); }
.ls-page .ls-rail { display: flex; gap: 14px; margin-bottom: 8px; }

/* 03 */
.ls-page .ls-series-row { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 14px; align-items: center; padding: 6px 0; }
.ls-page .ls-series-row + .ls-series-row { border-top: 1px solid rgb(var(--neo-border) / 0.2); }
.ls-page .ls-series-row__name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 750; }
.ls-page .ls-series-row--tiles { padding-top: 12px; }
.ls-page .ls-tile-strip { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; justify-items: center; }
.ls-page .ls-legend-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 14px 0 0; color: rgb(var(--neo-muted)); font-size: 11px; }
.ls-page .ls-legend-line i { display: inline-block; width: 18px; height: 0; margin-right: 4px; vertical-align: middle; border-top: 2px solid rgb(var(--sky-800)); }
.ls-page .ls-legend-line__load { border-top: 1.3px solid rgb(var(--color-on-surface) / 0.45) !important; }
.ls-page .ls-legend-line span { display: inline-flex; align-items: center; gap: 5px; }
.ls-page .ls-legend-line span b { width: 12px; height: 12px; border-radius: 48% 52% 44% 56% / 47% 53% 46% 54%; transform: rotate(-4deg); }
.ls-page .ls-traj-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-content: start; }
.ls-page .ls-traj-grid .ls-card__caption { grid-column: 1 / -1; }
</style>
