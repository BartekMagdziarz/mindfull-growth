<template>
  <section class="scenario-page concept-page ocf mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · Obiekty · karty biblioteki</span>
        <h1>Pola na kartach obiektów: gdzie kończy się drabinka</h1>
        <p>
          Karta celu z polami pod kluczowymi rezultatami czyta się lepiej niż karta nawyku, w której wykres leży wprost na karcie.
          Czy dodać pole pod każdym wykresem — także wewnątrz rezultatów, gdzie byłby to trzeci poziom? Scena pokazuje cztery reguły
          obok siebie na tych samych trzech kartach. Ton i obrys pól są produkcyjne (mist = biel 45%, papier = biel 80%).
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 1</span>
    </header>

    <!-- 01 · Stan obecny -->
    <section class="ocf__block">
      <header class="ocf__block-head">
        <span class="lab-eyebrow">01 · Stan obecny · zrzuty z 11.10.2026</span>
        <h2>Cel ma strukturę, nawyk jest jedną płaszczyzną</h2>
      </header>
      <div class="ocf__evidence">
        <figure class="ocf__shot">
          <img src="/research/current/objects/habit-card-2026-10-11.png" alt="Karta nawyku Medytacja: ikona, tytuł, glif obszaru, fakty i wykres słupkowy wprost na karcie" />
          <figcaption>
            <strong>Nawyk · Medytacja</strong>
            Tytuł, glif, fakty i wykres leżą na jednym tonie karty. Wykres nie ma krawędzi, więc dolna połowa karty to pusta
            płaszczyzna z kreską celu — nie wiadomo, gdzie kończy się „kim jestem”, a zaczyna „jak mi idzie”.
          </figcaption>
        </figure>
        <figure class="ocf__shot">
          <img src="/research/current/objects/goal-card-2026-10-11.png" alt="Karta celu Blok treningowy: nagłówek z osią czasu, dwa kluczowe rezultaty w jaśniejszych polach z wykresami" />
          <figcaption>
            <strong>Cel · Blok treningowy Paź26</strong>
            Nagłówek (tytuł, glify, oś czasu) zostaje na karcie, każdy rezultat to jaśniejsze pole: zdanie + wykres jako jedna
            rzecz. Dwa poziomy — karta i pole — wystarczą, żeby oko wiedziało, co jest czym.
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 02 · Porównanie -->
    <section class="ocf__block">
      <header class="ocf__block-head">
        <span class="lab-eyebrow">02 · Porównanie · cztery reguły × trzy karty</span>
        <h2>Ta sama treść, inne miejsce pola</h2>
      </header>

      <div class="ocf__toolbar neo-card" aria-label="Ustawienia sceny">
        <label>Cel w scenie
          <select v-model="goalId">
            <option value="training-block">Blok treningowy · 2 rezultaty, 2 tygodnie</option>
            <option value="ten-k">Przebiec 10 km · 3 rezultaty, 6 tygodni</option>
          </select>
        </label>
        <label>Reguły
          <select v-model="ruleFilter">
            <option value="all">Wszystkie cztery, jedna pod drugą</option>
            <option v-for="rule in RULES" :key="rule.id" :value="rule.id">{{ rule.letter }} · {{ rule.name }}</option>
          </select>
        </label>
        <label>Szerokość karty
          <select v-model.number="cardWidth">
            <option :value="380">380 px · 3 kolumny przy 1280</option>
            <option :value="430">430 px · 3 kolumny przy 1440</option>
            <option :value="480">480 px · 2 kolumny</option>
          </select>
        </label>
        <label>Motyw
          <select :value="theme" @change="setTheme(($event.target as HTMLSelectElement).value)">
            <option v-for="item in themes" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label class="ocf__check"><input v-model="metaField" type="checkbox" /> Pas pod tytułem też w polu</label>
        <label class="ocf__check"><input v-model="showDepth" type="checkbox" /> Pokaż poziomy</label>
      </div>

      <div class="ocf__rows" :class="{ 'ocf--depth': showDepth }" :style="{ '--ocf-card': `${cardWidth}px` }">
        <article v-for="rule in visibleRules" :key="rule.id" class="ocf__row" :class="{ 'is-recommended': rule.recommended }">
          <header class="ocf__rule">
            <span class="ocf__letter">{{ rule.letter }}</span>
            <div>
              <strong>{{ rule.name }}<em v-if="rule.recommended"> · rekomendacja</em></strong>
              <p>{{ rule.rule }}</p>
              <dl class="ocf__depths">
                <div><dt>Nawyk</dt><dd>{{ depth(rule.id, 'habit') }}</dd></div>
                <div><dt>Cel</dt><dd>{{ depth(rule.id, 'goal') }}</dd></div>
              </dl>
            </div>
          </header>
          <div class="ocf__cards">
            <FieldCard :card="MEDITATION" :rule="rule.id" :meta-field="metaField" />
            <FieldCard :card="SLEEP" :rule="rule.id" :meta-field="metaField" />
            <FieldCard :card="goal" :rule="rule.id" :meta-field="metaField" />
          </div>
        </article>
      </div>
    </section>

    <!-- 03 · Decyzje -->
    <section class="ocf__block">
      <header class="ocf__block-head">
        <span class="lab-eyebrow">03 · Do decyzji</span>
        <h2>Pole = jedna rzecz, nie jedna kontrolka</h2>
      </header>
      <ol class="ocf__decisions">
        <li v-for="item in decisions" :key="item.id">
          <span class="ocf__decision-id">{{ item.id }}</span>
          <div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div>
        </li>
      </ol>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FieldCard, { type FieldRule } from '~lab/components/object-fields/FieldCard.vue'
import { GOALS, MEDITATION, SLEEP, type GoalSampleId } from '~lab/components/object-fields/objectFieldSamples'

/**
 * Fields on object library cards (2026-10-11). The user likes the goal card,
 * where every KR is a mist field, more than the habit card, where the chart
 * lies straight on the card, and asked whether to add a field under every
 * chart (and under the strip below the title) — or whether a third level
 * inside KRs would hurt. Four rules on the same three cards answer that.
 */
const RULES: { id: FieldRule; letter: string; name: string; rule: string; recommended?: boolean }[] = [
  { id: 'now', letter: 'A', name: 'Obecnie', rule: 'Wykres nawyku wprost na karcie. Rezultaty celu w polach, ich wykresy wprost na polu.' },
  { id: 'measure', letter: 'B', name: 'Pole pomiaru', rule: 'Fakty i wykres nawyku w jednym polu — nawyk czyta się jak cel z jednym rezultatem. Cel bez zmian.', recommended: true },
  { id: 'chart', letter: 'C', name: 'Pole pod każdym wykresem', rule: 'Każdy wykres we własnym polu. W rezultacie to trzeci poziom: papier na miście.' },
  { id: 'chart-only', letter: 'D', name: 'Pole tylko pod wykresem', rule: 'Wykres jest jedynym polem. Rezultaty tracą pole i dzieli je odstęp — wszędzie dwa poziomy.' },
]

const DEPTHS: Record<FieldRule, { habit: string; goal: string }> = {
  now: { habit: '1 poziom', goal: '2 poziomy' },
  measure: { habit: '2 poziomy', goal: '2 poziomy' },
  chart: { habit: '2 poziomy', goal: '3 poziomy' },
  'chart-only': { habit: '2 poziomy', goal: '2 poziomy' },
}

const route = useRoute()
const router = useRouter()
const themes = [
  { id: 'sky-mist', label: 'Sky Mist' },
  { id: 'current', label: 'Current (domyślny produktu)' },
  { id: 'sunrise-cloud', label: 'Sunrise Cloud' },
]
/** The product paints its canvas from `:root[data-theme]`; without it the Lab shows the saturated default. */
const theme = computed(() => (themes.some(item => item.id === route.query.theme) ? String(route.query.theme) : 'sky-mist'))
watch(theme, value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
function setTheme(value: string) {
  void router.replace({ query: { ...route.query, theme: value === 'sky-mist' ? undefined : value } })
}

const goalId = ref<GoalSampleId>('training-block')
const ruleFilter = ref<FieldRule | 'all'>('all')
const cardWidth = ref(430)
const metaField = ref(false)
const showDepth = ref(false)

const goal = computed(() => GOALS[goalId.value])
const visibleRules = computed(() => (ruleFilter.value === 'all' ? RULES : RULES.filter(rule => rule.id === ruleFilter.value)))

function depth(rule: FieldRule, kind: 'habit' | 'goal'): string {
  const base = DEPTHS[rule][kind]
  return metaField.value && rule !== 'now' && kind === 'habit' ? `${base}, dwa pola` : base
}

const decisions = [
  { id: 'D1', title: 'Pole grupuje jedną rzecz: pomiar', body: 'W karcie celu pole działa, bo obejmuje cały rezultat — zdanie i wykres razem. Rekomendacja B przenosi dokładnie tę anatomię na nawyk i tracker: fakty + wykres w jednym polu misty. Nawyk wygląda jak cel z jednym rezultatem, nagłówek (ikona, tytuł, glify) zostaje na karcie.' },
  { id: 'D2', title: 'Nie więcej niż dwa poziomy w karcie biblioteki', body: 'Trzeci poziom (C: papier w miście w rezultacie) jest wykonalny tonalnie, ale przy 380–430 px zjada ok. 20 px szerokości wykresu na każdym rezultacie i zamienia kartę celu w pudełka w pudełkach. Pole w polu zostaje zarezerwowane dla kontrolek (pastylki, pola liczb w rozwiniętej edycji), nie dla treści.' },
  { id: 'D3', title: 'Pas pod tytułem zostaje na karcie', body: 'Glify i oś czasu to tożsamość obiektu, nie treść — w polu konkurują z polami rezultatów, a przy nawyku z jednym glifem dają pole na jedną ikonkę. Przełącznik „Pas pod tytułem też w polu” pokazuje ten koszt; rekomendacja: bez pola.' },
  { id: 'D4', title: 'D jako plan zapasowy', body: 'Jeśli chcesz jednej mechanicznej reguły („wykres zawsze w polu”), D trzyma dwa poziomy wszędzie — ale rezultaty celu tracą to, co najbardziej się podobało: każdy jako osobna, zamknięta całość.' },
  { id: 'D5', title: 'Po decyzji: zakres zmiany w produkcie', body: 'B = ObjectsLibraryMeasurementCard: fakty i MeasurementSparkline do jednego kontenera mg-v2-surface--flat (jak ObjectsLibraryKrCard). Rozwinięta edycja nawyku trafia do tego samego pola albo zostaje nad nim — do sprawdzenia przy porcie. Karty celu, intencji i priorytetu bez zmian.' },
]
</script>

<style scoped>
.ocf { --ocf-muted: var(--mg-color-muted); --ocf-ink: var(--mg-color-ink); }

.ocf__block { margin-top: 34px; }
.ocf__block-head { margin-bottom: 14px; }
.ocf__block-head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }

/* 01 · evidence */
.ocf__evidence { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
.ocf__shot { display: grid; gap: 0; margin: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-paper); overflow: hidden; }
.ocf__shot img { display: block; width: 100%; max-height: 520px; object-fit: contain; object-position: top; background: var(--mg-color-canvas); }
.ocf__shot figcaption { padding: 14px 18px; border-top: 1px solid var(--mg-color-border); color: var(--ocf-muted); font-size: 12px; line-height: 1.5; }
.ocf__shot figcaption strong { display: block; margin-bottom: 4px; color: var(--ocf-ink); font-size: 13px; }

/* 02 · toolbar */
.ocf__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border-radius: 18px; }
.ocf__toolbar label { display: grid; gap: 5px; color: var(--ocf-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.ocf__toolbar select { min-height: 34px; min-width: 150px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--ocf-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; text-transform: none; letter-spacing: 0; }
.ocf__toolbar .ocf__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.ocf__check input { accent-color: var(--mg-color-primary); }

/* 02 · rows: rule on the left, three cards on the canvas */
.ocf__rows { display: grid; gap: 18px; }
.ocf__row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; padding: 22px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.ocf__row.is-recommended { box-shadow: 0 0 0 3px var(--mg-color-primary-soft); }
.ocf__rule { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 10px; align-items: start; max-width: 900px; }
.ocf__letter { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 13px; font-weight: 900; }
.ocf__rule strong { display: block; color: var(--ocf-ink); font-size: 14px; font-weight: 800; line-height: 1.3; }
.ocf__rule em { color: var(--mg-color-primary-strong); font-style: normal; font-size: 12px; }
.ocf__rule p { margin: 4px 0 6px; color: var(--ocf-muted); font-size: 12px; line-height: 1.5; }
.ocf__depths { display: flex; gap: 18px; margin: 0; font-size: 11px; }
.ocf__depths div { display: flex; gap: 6px; }
.ocf__depths dt { min-width: 44px; color: var(--ocf-muted); font-weight: 700; }
.ocf__depths dd { margin: 0; color: var(--ocf-ink); font-weight: 800; }
.ocf__cards { display: grid; grid-template-columns: repeat(3, minmax(0, var(--ocf-card, 430px))); gap: 16px; align-items: start; }

/* "Pokaż poziomy": number each surface by its depth */
.ocf--depth :deep([data-depth]) { outline: 1.5px dashed color-mix(in srgb, var(--mg-color-primary) 45%, transparent); outline-offset: -1.5px; }
.ocf--depth :deep([data-depth])::after {
  content: attr(data-depth);
  position: absolute;
  top: 6px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
  font-size: 10px;
  font-weight: 900;
  pointer-events: none;
}
.ocf--depth :deep([data-depth="3"])::after { background: var(--mg-color-rose); }

/* 03 · decisions */
.ocf__decisions { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.ocf__decisions li { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: start; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.ocf__decision-id { display: grid; place-items: center; height: 26px; border-radius: 999px; background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 11px; font-weight: 900; }
.ocf__decisions strong { display: block; font-size: 13px; font-weight: 800; }
.ocf__decisions p { margin: 4px 0 0; color: var(--ocf-muted); font-size: 12px; line-height: 1.5; }

@media (max-width: 1200px) {
  .ocf__evidence { grid-template-columns: minmax(0, 1fr); }
}
</style>
