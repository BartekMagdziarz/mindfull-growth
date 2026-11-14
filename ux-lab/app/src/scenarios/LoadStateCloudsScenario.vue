<template>
  <section class="scenario-page concept-page lsc" :class="{ 'lsc--standalone': standalone }">
    <template v-if="!standalone">
      <header class="concept-heading">
        <div>
          <span class="lab-eyebrow">Propozycja · kalendarz · widok miesiąca</span>
          <h1>Obciążenie i stan jako chmury</h1>
          <p>
            Runda 8. Schemat „przejście w słupku”, ale stan 3 przy obciążeniu 2–4 zostaje neutralny i lekko pozytywny:
            fiolet i róż pojawiają się dopiero na skrajach obciążenia.
          </p>
        </div>
        <span class="status-badge status-badge--experiment">Runda 8 · wygląd zaakceptowany 14.11</span>
      </header>

      <!-- 01 · Stan obecny -->
      <section class="lsc__block">
        <header class="lsc__block-head">
          <span class="lab-eyebrow">01 · Stan obecny · verify 14.11.2026</span>
          <h2>Cztery wstęgi obok słupków kompasu</h2>
        </header>
        <figure class="lsc__shot">
          <img src="/research/current/calendar/month-rating-ribbons-2026-11-14.png" alt="Karta Ocena miesiąca: po lewej słupki kompasu, po prawej cztery wstęgi obszarów z liniami poziomów" />
          <figcaption>
            <span><strong>Dwa języki w jednym polu.</strong> Kompas to miękkie słupki, wstęgi to cienkie linie z rozmytą plamą.</span>
            <span><strong>Mało wysokości.</strong> Cztery wykresy dzielą 200 px z nagłówkiem i osią.</span>
            <span><strong>Szerokie kafle.</strong> Cele, Nawyki, Trackery i Intencje biorą 399 px na cztery liczby.</span>
          </figcaption>
        </figure>
      </section>

      <!-- ustawienia -->
      <div class="lsc__toolbar" aria-label="Ustawienia sceny">
        <label>Barwa a stan
          <select :value="look.scheme" @change="setQuery('scheme', pick($event), DEFAULT_LOOK.scheme)">
            <option v-for="item in SCHEMES" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label>Odcień stanu 3
          <select :value="look.profile" :disabled="look.scheme === 'split' || look.scheme === 'map'" @change="setQuery('profile', pick($event), DEFAULT_LOOK.profile)">
            <option v-for="item in PROFILES" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label>Szczyt różu
          <select :value="look.peak" @change="setQuery('peak', pick($event), DEFAULT_LOOK.peak)">
            <option value="rose-500">rose-500</option>
            <option value="rose-400">rose-400</option>
          </select>
        </label>
        <label>Miesiąc
          <select :value="monthId" @change="setQuery('month', pick($event), 'mixed')">
            <option v-for="item in Object.values(presets)" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label>Grubość
          <select :value="look.size" @change="setQuery('size', pick($event), DEFAULT_LOOK.size)">
            <option v-for="size in SIZES" :key="size" :value="size">{{ SIZE_PX[size] }} px</option>
          </select>
        </label>
        <a class="lsc__preview" :href="previewHref" target="_blank" rel="noopener">Podgląd w szerokości produktu</a>
      </div>
    </template>

    <!-- 02 · W miejscu -->
    <section class="lsc__block">
      <header v-if="!standalone" class="lsc__block-head">
        <span class="lab-eyebrow">02 · W miejscu · {{ preset.title }}</span>
        <h2>Tygodnie w wierszach, obszary w kolumnach</h2>
        <p>Słupek sięga od początku skali do obciążenia, kropka stoi w miejscu stanu. Stan obszaru przez tygodnie czyta się w dół kolumny.</p>
      </header>

      <div class="lsc__scroll">
        <div class="cp mg-design-v2 lsc__stage">
          <!-- podsumowanie okresu: replika RhythmPeriodSummary w podziale z rundy 2 -->
          <section class="ps">
            <div class="ps__grid">
              <div class="ps__hero">
                <span class="ps__eyebrow">Ocena miesiąca</span>
                <ul class="ps__bars" aria-label="Kompas">
                  <li v-for="(axis, i) in COMPASS_AXES" :key="axis">
                    <span class="ps__col"><i :class="{ none: preset.compass[i] == null }" :style="{ height: `${(preset.compass[i] ?? 0) * 20}%` }"><b>{{ preset.compass[i] ?? '–' }}</b></i></span>
                    <small>{{ axis }}</small>
                  </li>
                </ul>
              </div>
              <div class="ps__hero ps__ls">
                <span class="ps__eyebrow">Obciążenie i stan</span>
                <LoadStateCloudField :units="preset.units" :series="preset.series" :look="look" />
              </div>
              <ul class="ps__fam">
                <li v-for="tile in FAMILIES" :key="tile.label" class="ps__tile">
                  <span class="ps__ring" :style="{ '--fill': `${tile.pct}%` }"><span>{{ tile.pct }}%</span></span>
                  <span class="ps__tile-label">{{ tile.label }}</span>
                </li>
              </ul>
            </div>
          </section>

          <!-- oś tabeli pod kartą: kontekst, bez treści -->
          <div class="rb-board" :style="{ '--cols': preset.units.length }">
            <div class="rb-row rb-axis">
              <span class="rb-view"><AppIcon name="auto_awesome" class="rb-view__icon" /><span>Fokus miesiąca</span><AppIcon name="expand_more" class="rb-view__chev" /></span>
              <span class="rb-axis__track" aria-hidden="true" />
              <span v-for="unit in preset.units" :key="unit.ref" class="rb-axis__unit">{{ unit.range }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <template v-if="!standalone">
      <!-- 03 · Barwa a stan -->
      <section class="lsc__block">
        <header class="lsc__block-head">
          <span class="lab-eyebrow">03 · Barwa a stan · wszystkie 25 par w czterech schematach</span>
          <h2>Czytaj kolumnami w górę: każdy wiersz to jeden krok stanu</h2>
          <p>
            Obciążenie rośnie w prawo, stan w górę. Paski pod siatką mierzą, jak bardzo zmienia się kolor między sąsiednimi
            stanami (średnio po obciążeniach) — równe paski znaczą równe kroki. Klik wybiera schemat do sceny 02.
          </p>
        </header>
        <div class="cp mg-design-v2 lsc__keys">
          <button
            v-for="item in SCHEMES"
            :key="item.id"
            type="button"
            class="lsc__key"
            :class="{ 'is-current': item.id === look.scheme }"
            :aria-pressed="item.id === look.scheme"
            @click="setQuery('scheme', item.id, DEFAULT_LOOK.scheme)"
          >
            <span class="lsc__option-head"><strong>{{ item.name }}</strong></span>
            <span class="lsc__pairs" :style="{ '--lcb-w': `${SIZE_PX[look.size]}px` }">
              <template v-for="row in LEGEND" :key="row[0].state">
                <small class="lsc__pairs-axis">{{ row[0].state }}</small>
                <span v-for="pair in row" :key="pair.load" class="lsc__pair">
                  <LoadStateCloudBar area="body" week-label="próbka" :load="pair.load" :state="pair.state" :look="{ ...look, scheme: item.id }" />
                </span>
              </template>
              <span />
              <small v-for="n in 5" :key="n" class="lsc__pairs-axis">{{ n }}</small>
            </span>
            <small class="lsc__pairs-cap">↑ stan · obciążenie →</small>
            <span class="lsc__jumps" role="img" :aria-label="`Zmiana koloru między stanami: ${jumpLabel(item.id)}`">
              <span v-for="(jump, i) in jumps[item.id]" :key="i" class="lsc__jump" :class="{ 'is-mid': i === 1 || i === 2 }">
                <i :style="{ height: `${(jump / JUMP_MAX) * 100}%` }" />
                <small>{{ JUMP_NAMES[i] }}</small>
              </span>
            </span>
            <span class="lsc__option-note">{{ item.rule }}</span>
          </button>
          <div class="lsc__legend">
            <span class="ps__eyebrow">Narożniki jak w pickerze emocji</span>
            <ul class="lsc__corners">
              <li v-for="corner in corners" :key="corner.label"><i :style="{ background: corner.css }" />{{ corner.label }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 04 · Trzy miesiące -->
      <section class="lsc__block">
        <header class="lsc__block-head">
          <span class="lab-eyebrow">04 · Trzy miesiące · {{ monthLooks[0].name }} obok {{ monthLooks[1].name }}</span>
          <h2>Mieszany, trudny i spokojny</h2>
        </header>
        <div class="cp mg-design-v2 lsc__compare">
          <template v-for="month in Object.values(presets)" :key="month.id">
            <div v-for="item in monthLooks" :key="item.name" class="lsc__option lsc__option--static">
              <span class="lsc__option-head"><strong>{{ month.name }}</strong><code>{{ item.name }}</code></span>
              <LoadStateCloudField :units="month.units" :series="month.series" :look="item.look" />
            </div>
          </template>
        </div>
      </section>

      <!-- 05 · Decyzje -->
      <section class="lsc__block">
        <header class="lsc__block-head">
          <span class="lab-eyebrow">05 · Do decyzji</span>
          <h2>Sześć rozstrzygnięć</h2>
        </header>
        <ol class="lsc__decisions">
          <li v-for="item in decisions" :key="item.id">
            <span class="lsc__letter">{{ item.id }}</span>
            <div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div>
          </li>
        </ol>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import '@product/features/calendar-rhythm/rhythm.css'
import LoadStateCloudBar from '~lab/components/load-state/LoadStateCloudBar.vue'
import LoadStateCloudField from '~lab/components/load-state/LoadStateCloudField.vue'
import {
  buildMonthPresets,
  COMPASS_AXES,
  cornerLegend,
  decisions,
  DEFAULT_LOOK,
  PROFILES,
  SCHEMES,
  SIZE_PX,
  stateJumps,
  type CloudLook,
  type CloudSize,
  type MonthPresetId,
  type RosePeak,
  type Scheme,
  type TintProfile,
} from '~lab/lab/loadStateClouds'
import { legendGrid } from '~lab/lab/weekLoadState'

/**
 * Load & state as cloud bars, round 7 (2026-11-14). The user rejected violet
 * as the middle of the scale: across the app violet means the sad, low-energy
 * quadrant and rose the tense, high-energy one, as in the emotion picker. He
 * suggested tinting the state-3 row towards the row below and allowed colour
 * mixing within these hues. The scene measures the colour step between
 * neighbouring states for each scheme.
 */
const route = useRoute()
const router = useRouter()
const standalone = computed(() => Boolean(route.meta.standalone))

const presets = buildMonthPresets()
const LEGEND = legendGrid()
const SIZES: CloudSize[] = ['narrow', 'medium', 'wide']
const FAMILIES = [
  { label: 'Cele', pct: 61 },
  { label: 'Nawyki', pct: 65 },
  { label: 'Trackery', pct: 100 },
  { label: 'Intencje', pct: 33 },
]

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}
const monthId = computed(() => oneOf<MonthPresetId>(route.query.month, ['mixed', 'hard', 'calm'], 'mixed'))
const look = computed<CloudLook>(() => ({
  size: oneOf<CloudSize>(route.query.size, SIZES, DEFAULT_LOOK.size),
  scheme: oneOf<Scheme>(route.query.scheme, ['tint', 'fade', 'map', 'split'], DEFAULT_LOOK.scheme),
  peak: oneOf<RosePeak>(route.query.peak, ['rose-500', 'rose-400'], DEFAULT_LOOK.peak),
  profile: oneOf<TintProfile>(route.query.profile, ['edges', 'even'], DEFAULT_LOOK.profile),
}))
const currentScheme = computed(() => SCHEMES.find(item => item.id === look.value.scheme) ?? SCHEMES[0])
/** Po lewej punkt odniesienia: dla odcienia i przejścia — ten sam schemat „równo” z rundy 7, dla pozostałych — runda 5. */
const monthLooks = computed<{ name: string; look: CloudLook }[]>(() => {
  const now = look.value
  const graded = now.scheme === 'tint' || now.scheme === 'fade'
  const reference: CloudLook = graded ? { ...now, profile: 'even' } : { ...now, scheme: 'split' }
  const current: CloudLook = graded && now.profile === 'even' ? { ...now, profile: 'edges' } : now.scheme === 'split' ? { ...now, scheme: 'fade', profile: 'edges' } : now
  return [
    { name: graded ? `${currentScheme.value.name} · równo (runda 7)` : SCHEMES[0].name, look: reference },
    { name: `${SCHEMES.find(item => item.id === current.scheme)?.name ?? ''}${current.scheme === 'tint' || current.scheme === 'fade' ? ' · tylko na skrajach' : ''}`, look: current },
  ]
})

const preset = computed(() => presets[monthId.value])
const corners = computed(() => cornerLegend(look.value))
/** Zmiana koloru między stanami 5→4, 4→3, 3→2, 2→1 dla każdego schematu. */
const JUMP_NAMES = ['5→4', '4→3', '3→2', '2→1']
const JUMP_MAX = 12
const jumps = computed(() => Object.fromEntries(SCHEMES.map(item => [item.id, stateJumps({ ...look.value, scheme: item.id })])) as Record<Scheme, number[]>)
const jumpLabel = (id: Scheme) => jumps.value[id].map((value, i) => `${JUMP_NAMES[i]} ${value.toFixed(1).replace('.', ',')}`).join(', ')
const previewHref = computed(() => router.resolve({ path: '/preview/load-state-clouds', query: route.query }).href)

const pick = (event: Event) => (event.target as HTMLSelectElement).value
function setQuery(key: string, value: string, fallback: string) {
  void router.replace({ query: { ...route.query, [key]: value === fallback ? undefined : value } })
}

/** The product paints its canvas from `:root[data-theme]`; verify runs the `current` theme. */
watch(() => String(route.query.theme ?? 'current'), value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
</script>

<style scoped>
.lsc__block { margin-top: 34px; }
.lsc__block-head { margin-bottom: 14px; }
.lsc__block-head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.lsc__block-head p { max-width: 760px; margin: 6px 0 0; color: var(--mg-color-muted); font-size: 13px; line-height: 1.5; }
.lsc__letter { display: inline-grid; place-items: center; flex: none; min-width: 30px; height: 30px; padding: 0 6px; border-radius: var(--mg-radius-pill); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 13px; font-weight: 800; }

/* 01 · zrzut */
.lsc__shot { display: grid; margin: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-paper); overflow: hidden; }
.lsc__shot img { display: block; width: 100%; background: var(--mg-color-canvas); }
.lsc__shot figcaption { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; padding: 14px 18px; border-top: 1px solid var(--mg-color-border); color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.lsc__shot figcaption strong { display: block; color: var(--mg-color-ink); font-size: 13px; }

/* ustawienia */
.lsc__toolbar { position: sticky; top: 64px; z-index: 5; display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-top: 30px; padding: 14px 16px; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.lsc__toolbar label { display: grid; gap: 5px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.lsc__toolbar select { min-height: 34px; min-width: 104px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--mg-color-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; font-weight: 700; text-transform: none; letter-spacing: 0; }
.lsc__toolbar .lsc__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.lsc__check input { accent-color: var(--mg-color-primary); }
.lsc__preview { margin-left: auto; min-height: 34px; display: inline-flex; align-items: center; color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 700; }

/* 02 · scena: płótno produktu, szerokość treści kalendarza przy 1512 px.
   Globalna reguła `.cp` w Labie niesie min-width 1180 px — tutaj zerowana. */
.lsc__scroll { overflow-x: auto; border-radius: var(--mg-radius-xl); }
.lsc__stage { display: grid; gap: 18px; width: 1132px; min-width: 0; min-height: 0; padding: 24px; border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); box-sizing: content-box; }
.lsc--standalone { width: auto; margin: 0; }
.lsc--standalone .lsc__block { margin: 0; }
.lsc--standalone .lsc__scroll { overflow: visible; border-radius: 0; }
.lsc--standalone .lsc__stage { min-height: 858px; padding: 124px 137px 0 243px; border-radius: 0; align-content: start; }

/* replika RhythmPeriodSummary: trzy pola zamiast dwóch */
.ps { padding: 16px 20px; border: 1px solid var(--cp-line); border-radius: var(--mg-radius-lg); background: var(--cp-card); box-shadow: var(--mg-shadow-rhythm-card); }
.ps__eyebrow { color: var(--cp-mark); font-size: var(--mg-font-size-xs); font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.ps__grid { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: stretch; }
.ps__hero { display: grid; align-content: start; gap: 10px; min-width: 0; padding: 14px 18px; border-radius: var(--mg-radius-md); background: var(--cp-field); box-shadow: var(--mg-shadow-nested); }
.ps__ls { grid-template-rows: auto 1fr; gap: 8px; }
.ps__ls > .lcf { align-self: center; }
.ps__bars { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; align-self: center; margin: 0; padding: 18px 0 0; list-style: none; }
.ps__hero:has(> .ps__bars) { grid-template-rows: auto 1fr; }
.ps__bars li { display: grid; justify-items: center; gap: 8px; min-width: 0; }
.ps__col { display: inline-flex; align-items: flex-end; height: 104px; }
.ps__col i { position: relative; display: inline-block; width: 22px; min-height: 3px; border-radius: var(--mg-radius-sketch-a); background: var(--cp-accent); transform: rotate(-1.2deg); }
.ps__col i.none { background: var(--cp-inner); }
.ps__col i b { position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -2px); color: var(--mg-color-ink); font-size: var(--mg-font-size-xs); font-weight: 800; }
.ps__col i.none b { color: var(--mg-color-muted); }
.ps__bars small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 800; text-align: center; }
/* kafle wykonania: pierścień u góry na środku, podpis pod nim (jak kafle kompasu w Dzisiaj) */
.ps__fam { display: grid; grid-template-columns: repeat(2, 106px); grid-auto-rows: 1fr; gap: 10px; margin: 0; padding: 0; list-style: none; }
.ps__tile { display: grid; justify-items: center; align-content: center; gap: 8px; min-height: 104px; padding: 12px 6px; border-radius: var(--mg-radius-md); background: var(--cp-field); box-shadow: var(--mg-shadow-control); }
.ps__tile-label { color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: 800; }
.ps__ring { display: grid; place-items: center; width: 60px; height: 60px; border-radius: var(--mg-radius-organic-a); background: conic-gradient(var(--cp-accent) var(--fill), var(--cp-inner) 0); transform: rotate(-4deg); }
.ps__tile:nth-child(even) .ps__ring { border-radius: var(--mg-radius-organic-b); }
.ps__ring span { display: grid; place-items: center; width: 46px; height: 46px; border-radius: inherit; background: var(--cp-field); color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: 800; font-variant-numeric: tabular-nums; transform: rotate(4deg); }

/* replika osi RhythmBoard (scoped w produkcie) */
.rb-board { --name: 246px; --pad: 12px; display: grid; min-width: 0; }
.rb-row { display: grid; grid-template-columns: var(--name) repeat(var(--cols), minmax(0, 1fr)); align-items: center; column-gap: 2px; padding: 0 var(--pad); }
.rb-axis { position: relative; margin: 2px 0 4px; }
.rb-view { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; justify-self: start; min-height: 40px; padding: 0 10px 0 6px; border: 1px solid var(--cp-line); border-radius: var(--mg-radius-sm); background: var(--cp-inner); color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: 800; box-shadow: var(--mg-shadow-rhythm-card); }
.rb-view__icon { display: inline-grid; place-items: center; width: 28px; height: 27px; border-radius: var(--mg-radius-organic-a); color: var(--cp-mark); background: var(--cp-field); font-size: var(--mg-font-size-lg); }
.rb-view__chev { color: var(--mg-color-muted); font-size: var(--mg-font-size-lg); }
.rb-axis__track { position: absolute; top: 0; bottom: 0; left: calc(var(--pad) + var(--name) - 2px); right: calc(var(--pad) - 4px); border-radius: var(--mg-radius-md); background: var(--cp-card); box-shadow: var(--mg-shadow-inset-sm); }
.rb-axis__unit { position: relative; z-index: 1; display: grid; place-items: center; min-height: 36px; margin: 4px 0; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 800; }

/* 03 · sposoby: pole o szerokości pola z karty (561 px) */
.lsc__compare { display: grid; grid-template-columns: repeat(2, 561px); gap: 14px; min-height: 0; padding: 18px 16px; border-radius: var(--mg-radius-xl); background: var(--mg-color-surface); overflow-x: auto; }
.lsc__option, .lsc__key { display: grid; align-content: start; gap: 10px; padding: 14px 18px; border: 0; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); box-shadow: var(--mg-shadow-nested); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.lsc__option.is-current, .lsc__key.is-current { box-shadow: var(--mg-shadow-nested), var(--mg-shadow-current-ring); }
.lsc__option-head { display: flex; align-items: baseline; gap: 10px; }
.lsc__option-head strong { color: var(--mg-color-ink); font-size: 14px; font-weight: 800; }
.lsc code { color: var(--mg-color-muted); font-family: inherit; font-size: 11px; }
.lsc__option-note { color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }

/* 04 · klucz */
.lsc__keys { display: flex; flex-wrap: wrap; align-items: start; gap: 14px; min-height: 0; padding: 18px 16px; border-radius: var(--mg-radius-xl); background: var(--mg-color-surface); }
.lsc__key { width: 374px; }
.lsc__keys .lsc__legend { flex: 0 1 300px; padding-top: 14px; }
.lsc__keys .lsc__corners { display: grid; }
.lsc__option--static { cursor: default; }
.lsc__jumps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; align-items: end; height: 64px; padding: 0 18px; }
.lsc__jump { display: grid; grid-template-rows: 1fr auto; justify-items: center; gap: 4px; height: 100%; }
.lsc__jump i { align-self: end; display: block; width: 26px; min-height: 2px; border-radius: var(--mg-radius-sketch-a); background: var(--mg-color-sky-well); }
.lsc__jump.is-mid i { background: var(--mg-color-data-fill); }
.lsc__jump small { color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: 600; }
.lsc__corners { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0; padding: 0; list-style: none; }
.lsc__legend .lsc__corners li { display: inline-flex; align-items: center; gap: 8px; }
.lsc__corners i { display: inline-block; width: 34px; height: 14px; border-radius: var(--mg-radius-pill); }
.lsc__ladders { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.lsc__legend .lsc__ladders li { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.lsc__ladders span { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.lsc__ladders i { display: inline-block; flex: none; width: 34px; height: 14px; border-radius: var(--mg-radius-pill); }
.lsc__pairs { display: grid; grid-template-columns: 12px repeat(5, minmax(0, 1fr)); gap: 12px 6px; align-items: center; }
.lsc__pair { display: block; }
.lsc__pairs-axis, .lsc__pairs-cap { color: var(--mg-color-muted); font-size: var(--mg-font-size-chart); font-weight: 600; text-align: center; }
.lsc__pairs-cap { text-align: left; }
.lsc__legend { display: grid; align-content: start; gap: 10px; flex: 1 1 100%; padding: 6px 18px 0; }
.lsc__legend ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.lsc__legend li { display: grid; grid-template-columns: 16px 120px auto; align-items: center; gap: 10px; color: var(--mg-color-ink); font-size: 12px; font-weight: 600; }
.lsc__swatches i { display: inline-block; width: 16px; height: 16px; border-radius: var(--mg-radius-pill); }

/* 05 · decyzje */
.lsc__decisions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 22px; margin: 0; padding: 0; list-style: none; }
.lsc__decisions li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; }
.lsc__decisions strong { color: var(--mg-color-ink); font-size: 14px; font-weight: 800; }
.lsc__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12.5px; line-height: 1.55; }
</style>
