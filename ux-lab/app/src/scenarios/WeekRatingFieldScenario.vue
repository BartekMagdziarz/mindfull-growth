<template>
  <section ref="host" class="scenario-page concept-page wrf" :class="{ 'wrf--standalone': standalone }">
    <template v-if="!standalone">
      <header class="concept-heading">
        <div>
          <span class="lab-eyebrow">Propozycja · kalendarz · widok tygodnia</span>
          <h1>Pole oceny tygodnia</h1>
          <p>Runda 2. Wybrany kierunek C: obszary jako kafle. Słowa pod znakiem znikają — obciążenie i stan kafel pokazuje dopiero pod kursorem. Z trzech wersji hovera wybrana C1: kropki pod znakiem.</p>
        </div>
        <span class="status-badge status-badge--ready">C1 wdrożone do produktu 14.11.2026</span>
      </header>

      <!-- 01 · Stan obecny -->
      <section class="wrf__block">
        <header class="wrf__block-head">
          <span class="lab-eyebrow">01 · Stan obecny · verify 14.11.2026</span>
          <h2>Cztery słupki w polu na pół karty</h2>
        </header>
        <div class="wrf__shots">
          <figure class="wrf__shot">
            <img src="/research/current/calendar/week-rating-rated-2026-11-14.png" alt="Karta podsumowania tygodnia 2–8 listopada: pole Ocena tygodnia z jednym wierszem czterech słupków i cztery kafle wykonania" />
            <figcaption><strong>Tydzień z refleksją.</strong> Wykres zajmuje 736 × 57 px w polu 854 × 232 px. Słupek ma 172 px długości przy 22 px wysokości.</figcaption>
          </figure>
          <figure class="wrf__shot">
            <img src="/research/current/calendar/week-rating-empty-2026-11-14.png" alt="Karta podsumowania bieżącego tygodnia: pole Ocena tygodnia z czterema pustymi torami" />
            <figcaption><strong>Bieżący tydzień.</strong> Refleksja powstaje w niedzielę, więc przez sześć dni pole pokazuje cztery puste tory.</figcaption>
          </figure>
        </div>
      </section>

      <!-- ustawienia -->
      <div class="wrf__toolbar" aria-label="Ustawienia sceny">
        <label>Tydzień
          <select :value="weekId" @change="setQuery('week', pick($event), 'mixed')">
            <option v-for="item in Object.values(WEEKS)" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label>Refleksja
          <select :value="rated ? 'yes' : 'no'" @change="setQuery('rated', pick($event), 'yes')">
            <option value="yes">Zapisana</option>
            <option value="no">Jeszcze nie · czwartek</option>
          </select>
        </label>
        <label>Kolor kafla
          <select :value="tint" @change="setQuery('tint', pick($event), 'tile')">
            <option value="tile">Cały kafel</option>
            <option value="disc">Tylko pole ikony</option>
          </select>
        </label>
        <label>Hover w scenie
          <select :value="pin" @change="setQuery('pin', pick($event), 'one')">
            <option value="one">Przypięty na „Bliscy”</option>
            <option value="all">Przypięty na wszystkich</option>
            <option value="none">Tylko pod kursorem</option>
          </select>
        </label>
        <nav class="wrf__jump" aria-label="Wersje i kierunki">
          <a v-for="item in blocks" :key="item.key" :href="`#wrf-${item.key}`" :class="{ 'is-wide': item.letter.length > 1 }">{{ item.letter }}</a>
        </nav>
      </div>
    </template>

    <!-- 02 · Kafle obszarów (runda 2), potem 03 · sześć kierunków z rundy 1 -->
    <template v-for="item in blocks" :key="item.key">
      <header v-if="item.group && !standalone" class="wrf__block wrf__block-head wrf__group">
        <span class="lab-eyebrow">{{ item.group.eyebrow }}</span>
        <h2>{{ item.group.title }}</h2>
        <p>{{ item.group.lead }}</p>
      </header>
      <section :id="`wrf-${item.key}`" class="wrf__block wrf__dir">
        <header v-if="!standalone" class="wrf__block-head wrf__dir-head">
          <span class="wrf__letter">{{ item.letter }}</span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.lead }}</p>
          </div>
          <a class="wrf__preview" :href="previewHref(item)" target="_blank" rel="noopener">{{ fit < 1 ? `Podgląd 1:1 · tu ${Math.round(fit * 100)}%` : 'Podgląd 1:1' }}</a>
        </header>

        <div class="wrf__scroll">
          <div class="cp mg-design-v2 wrf__stage" :style="{ zoom: standalone ? undefined : fit }">
            <WeekRatingCard :variant="item.variant" :week="week" :hover="item.hover" :tint="tint" :pin="item.pin" />
            <!-- oś tabeli pod kartą: kontekst wysokości, bez treści -->
            <div class="rb-board">
              <div class="rb-row rb-axis">
                <span class="rb-view"><AppIcon name="auto_awesome" class="rb-view__icon" /><span>Fokus tygodnia</span><AppIcon name="expand_more" class="rb-view__chev" /></span>
                <span class="rb-axis__track" aria-hidden="true" />
                <span v-for="day in week.days" :key="day.label" class="rb-axis__unit"><small>{{ day.label }}</small><strong>{{ day.date }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <dl v-if="!standalone" class="wrf__facts">
          <div v-for="fact in item.facts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.text }}</dd></div>
        </dl>
      </section>
    </template>

    <template v-if="!standalone">
      <!-- 04 · Decyzje rundy 2 -->
      <section class="wrf__block">
        <header class="wrf__block-head">
          <span class="lab-eyebrow">04 · Do decyzji · kafle</span>
          <h2>Pięć rozstrzygnięć</h2>
          <p>Wszystkie rozstrzygnięte 14.11 i wdrożone (`features/calendar-rhythm/RhythmAreaTiles.vue`): C1, kolor całego kafla, klik otwiera „Refleksję”, bez nagłówka pola.</p>
        </header>
        <ol class="wrf__decisions">
          <li v-for="item in tileDecisions" :key="item.id">
            <span class="wrf__letter">{{ item.id }}</span>
            <div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div>
          </li>
        </ol>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import '@product/features/calendar-rhythm/rhythm.css'
import WeekRatingCard from '~lab/components/week-rating/WeekRatingCard.vue'
import { DIRECTIONS, TILE_HOVERS, tileDecisions, WEEKS, withoutReflection, type DirectionId, type TileHover, type TilePin, type TileTint, type WeekSampleId } from '~lab/lab/weekRatingField'

/**
 * Rating field of the calendar's week view (2026-11-14). After the load &
 * state matrix shipped, the week card shows one row of four lying bars in a
 * field sized for much more. Round 1: six directions on the same sample week.
 * Round 2: the user picked C (area tiles), was not convinced by the words
 * under the mark („dużo · źle”) and asked for load and state on hover — three
 * hover versions of the tile, colour on the whole tile or only in the icon
 * field. `/preview/week-rating-field?variant=c&hover=dots&pin=all` renders one
 * card at the product's geometry for 1:1 screenshots.
 */
const route = useRoute()
const router = useRouter()
const standalone = computed(() => Boolean(route.meta.standalone))

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}
const weekId = computed(() => oneOf<WeekSampleId>(route.query.week, ['mixed', 'hard', 'calm'], 'mixed'))
const rated = computed(() => route.query.rated !== 'no')
const week = computed(() => (rated.value ? WEEKS[weekId.value] : withoutReflection(WEEKS[weekId.value])))

/**
 * Scena ma szerokość produktu (1132 px + margines płótna). Gdy kolumna Labu
 * jest węższa (otwarte notatki UX przy 1512 px), cała scena się pomniejsza,
 * zamiast chować kafle za przewijaniem; „Podgląd 1:1” pokazuje wymiar produktu.
 */
const STAGE_WIDTH = 1180
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

const tint = computed(() => oneOf<TileTint>(route.query.tint, ['tile', 'disc'], 'tile'))
const pin = computed(() => oneOf<TilePin>(route.query.pin, ['one', 'all', 'none'], 'one'))

interface Block {
  key: string
  letter: string
  title: string
  lead: string
  variant: 'now' | DirectionId
  hover?: TileHover
  pin?: TilePin
  facts: { label: string; text: string }[]
  /** Nagłówek grupy przed pierwszym blokiem rundy. */
  group?: { eyebrow: string; title: string; lead: string }
}
const IDS = DIRECTIONS.map(item => item.id)
/** Runda 2: trzy wersje hovera kafla C; pod nimi sześć kierunków rundy 1 jako zapis. */
const blocks = computed<Block[]>(() => {
  if (standalone.value) {
    const variant = oneOf<'now' | DirectionId>(route.query.variant, ['now', ...IDS], 'c')
    const hover = oneOf<TileHover>(route.query.hover, ['dots', 'legend', 'split'], 'dots')
    return [{ key: variant, letter: '', title: '', lead: '', variant, hover, pin: oneOf<TilePin>(route.query.pin, ['one', 'all', 'none'], 'none'), facts: [] }]
  }
  const tiles = TILE_HOVERS.map((item, i): Block => ({
    key: item.letter.toLowerCase(),
    letter: item.letter,
    title: item.title,
    lead: item.lead,
    variant: 'c',
    hover: item.id,
    pin: pin.value,
    facts: [
      { label: 'Pokazuje', text: item.shows },
      { label: 'Dlaczego', text: item.why },
      { label: 'Ryzyko', text: item.risk },
    ],
    group: i === 0 ? { eyebrow: '02 · Kafle obszarów · runda 2', title: 'Trzy sposoby na hover · wybrane C1', lead: 'W spoczynku kafel ma ikonę, nazwę i znak. Najedź na dowolny kafel; „Bliscy” ma hover przypięty, żeby było go widać od razu. C2 i C3 zostają jako zapis.' } : undefined,
  }))
  const round1 = DIRECTIONS.map((item, i): Block => ({
    key: item.id,
    letter: item.id.toUpperCase(),
    title: item.title,
    lead: item.lead,
    variant: item.id,
    hover: 'dots',
    pin: 'none',
    facts: [
      { label: 'Dokłada', text: item.adds },
      { label: 'Bez refleksji', text: item.empty },
      { label: 'Ryzyko', text: item.risk },
    ],
    group: i === 0 ? { eyebrow: '03 · Runda 1 · zapis', title: 'Sześć kierunków', lead: 'Punkt wyjścia rundy 2. C pokazuje tu wersję C1 bez przypiętego hovera.' } : undefined,
  }))
  return [...tiles, ...round1]
})

function previewHref(item: Block): string {
  const query = { ...route.query, variant: item.variant, hover: item.variant === 'c' ? item.hover : undefined, pin: item.variant === 'c' && item.pin !== 'none' ? item.pin : undefined }
  return router.resolve({ path: '/preview/week-rating-field', query }).href
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
.wrf__block { margin-top: 34px; scroll-margin-top: 150px; }
.wrf__block-head { margin-bottom: 14px; }
.wrf__block-head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.wrf__block-head p { max-width: 760px; margin: 6px 0 0; color: var(--mg-color-muted); font-size: 13px; line-height: 1.5; }
.wrf__letter { display: inline-grid; place-items: center; flex: none; min-width: 30px; height: 30px; padding: 0 6px; border-radius: var(--mg-radius-pill); background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 13px; font-weight: 800; }

/* 01 · zrzuty */
.wrf__shots { display: grid; gap: 14px; }
.wrf__shot { display: grid; margin: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-paper); overflow: hidden; }
.wrf__shot img { display: block; width: 100%; background: var(--mg-color-canvas); }
.wrf__shot figcaption { padding: 12px 18px; border-top: 1px solid var(--mg-color-border); color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.wrf__shot figcaption strong { color: var(--mg-color-ink); font-size: 13px; }

/* ustawienia */
.wrf__toolbar { position: sticky; top: 64px; z-index: 5; display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-top: 30px; padding: 14px 16px; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.wrf__toolbar label { display: grid; gap: 5px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.wrf__toolbar select { min-height: 34px; min-width: 104px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--mg-color-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; font-weight: 700; text-transform: none; letter-spacing: 0; }
.wrf__jump { display: flex; gap: 6px; margin-left: auto; }
.wrf__jump a.is-wide { width: 42px; }
.wrf__jump a { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--mg-radius-pill); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 800; text-decoration: none; box-shadow: var(--mg-shadow-control); }
.wrf__jump a:hover { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-control-hover); }

/* 02 · kierunek: nagłówek, scena w szerokości produktu, trzy fakty */
.wrf__dir-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 12px; }
.wrf__dir-head h3 { margin: 3px 0 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; }
.wrf__group { margin-bottom: -14px; }
.wrf__letter { white-space: nowrap; }
.wrf__preview { align-self: center; color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 700; }
/* płótno produktu, szerokość treści kalendarza przy 1512 px. Globalna reguła
   `.cp` w Labie niesie min-width 1180 px — tutaj zerowana. */
.wrf__scroll { border-radius: var(--mg-radius-xl); }
.wrf__stage { display: grid; gap: 18px; width: 1132px; min-width: 0; min-height: 0; padding: 24px; border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); box-sizing: content-box; }
.wrf__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1180px; margin: 12px 0 0; padding: 0 4px; }
.wrf__facts dt { color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.wrf__facts dd { margin: 3px 0 0; color: var(--mg-color-ink); font-size: 12.5px; line-height: 1.5; }

/* podgląd 1:1: karta tam, gdzie stoi w produkcie przy 1512 × 982 */
.wrf--standalone { width: auto; margin: 0; }
.wrf--standalone .wrf__block { margin: 0; }
.wrf--standalone .wrf__scroll { border-radius: 0; }
.wrf--standalone .wrf__stage { min-height: 858px; padding: 124px 137px 0 243px; border-radius: 0; align-content: start; }

/* replika osi RhythmBoard (scoped w produkcie) */
.rb-board { --name: 246px; --pad: 12px; display: grid; min-width: 0; }
.rb-row { display: grid; grid-template-columns: var(--name) repeat(7, minmax(0, 1fr)) 76px; align-items: center; column-gap: 2px; padding: 0 var(--pad); }
.rb-axis { position: relative; margin: 2px 0 4px; }
.rb-view { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; justify-self: start; min-height: 40px; padding: 0 10px 0 6px; border: 1px solid var(--cp-line); border-radius: var(--mg-radius-sm); background: var(--cp-inner); color: var(--mg-color-ink); font-size: var(--mg-font-size-sm); font-weight: var(--mg-weight-title); box-shadow: var(--mg-shadow-rhythm-card); }
.rb-view__icon { display: inline-grid; place-items: center; width: 28px; height: 27px; border-radius: var(--mg-radius-organic-a); color: var(--cp-mark); background: var(--cp-field); font-size: var(--mg-font-size-lg); }
.rb-view__chev { color: var(--mg-color-muted); font-size: var(--mg-font-size-lg); }
.rb-axis__track { position: absolute; top: 0; bottom: 0; left: calc(var(--pad) + var(--name) - 2px); right: calc(var(--pad) - 4px); border-radius: var(--mg-radius-md); background: var(--cp-card); box-shadow: var(--mg-shadow-inset-sm); }
.rb-axis__unit { position: relative; z-index: 1; display: grid; justify-items: center; gap: 1px; margin: 8px 0; color: var(--mg-color-muted); }
.rb-axis__unit small { font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-title); }
.rb-axis__unit strong { color: var(--mg-color-ink); font-size: var(--mg-font-size-md); font-weight: var(--mg-weight-title); }

/* 03 · decyzje */
.wrf__decisions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 22px; margin: 0; padding: 0; list-style: none; }
.wrf__decisions li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; }
.wrf__decisions strong { color: var(--mg-color-ink); font-size: 14px; font-weight: 800; }
.wrf__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12.5px; line-height: 1.55; }
</style>
