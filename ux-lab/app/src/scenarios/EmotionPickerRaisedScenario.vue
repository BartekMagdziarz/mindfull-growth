<template>
  <section class="scenario-page concept-page emotion-raised-page">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Propozycja · picker emocji · runda 2</span>
        <h1>Wypukły picker emocji</h1>
        <p>
          Runda 1: cień z systemu na każdej kontrolce i bez pola „Wybrane”. User wybrał B. Runda 2:
          B2 to B na spokojniejszej palecie systemu i z miękkim cieniem. D przebudowuje kafle na wzór
          kafli Kompasu: kolor ma tylko kółko z emotką, a natężenie pokazują kropki.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Koncepcja · nie baseline</span>
    </header>

    <!-- 1 · cieniowanie w ćwiartce -->
    <section class="raised-block">
      <header class="raised-block__head">
        <div>
          <span class="lab-eyebrow">1 · Ćwiartka od środka</span>
          <h2>Porównanie obok siebie</h2>
        </div>
        <div class="raised-controls">
          <div class="raised-quads" role="group" aria-label="Runda">
            <button
              v-for="r in rounds"
              :key="r.id"
              type="button"
              class="raised-quad"
              :class="{ 'raised-quad--active': round === r.id }"
              :aria-pressed="round === r.id"
              @click="round = r.id"
            >
              {{ r.label }}
            </button>
          </div>
          <div class="raised-quads" role="group" aria-label="Ćwiartka">
            <button
              v-for="q in quadrants"
              :key="q.id"
              type="button"
              class="raised-quad"
              :class="{ 'raised-quad--active': drillQuadrant === q.id }"
              :aria-pressed="drillQuadrant === q.id"
              @click="setDrillQuadrant(q.id)"
            >
              {{ q.label }}
            </button>
          </div>
        </div>
      </header>

      <div class="raised-grid mg-design-v2">
        <article v-for="v in visibleVariants" :key="v.id" class="raised-variant">
          <div class="raised-variant__label">
            <strong>{{ v.letter }} · {{ v.title }}</strong>
            <span>{{ v.note }}</span>
          </div>
          <div
            class="raised-card mg-v2-surface mg-v2-surface--raised-sm"
            :style="v.tinted ? tint(drill[v.id].quadrant) : {}"
          >
            <EmotionGroupPicker
              v-if="v.id === 'current'"
              v-model="drill.current.selections"
              v-model:quadrant="drill.current.quadrant"
              label="Emocje"
            />
            <EmotionPickerCompass
              v-else-if="v.id === 'compass'"
              v-model="drill.compass.selections"
              v-model:quadrant="drill.compass.quadrant"
              :dots="dotsLayout"
              :examples="showExamples"
              label="Emocje"
            />
            <EmotionPickerRaised
              v-else
              v-model="drill[v.id].selections"
              v-model:quadrant="drill[v.id].quadrant"
              :shade="v.id"
              label="Emocje"
            />
          </div>
        </article>
      </div>
    </section>

    <!-- 2 · D: układ kropek -->
    <section class="raised-block">
      <header class="raised-block__head">
        <div>
          <span class="lab-eyebrow">2 · Wariant D · kafle Kompasu</span>
          <h2>Gdzie stoją kropki natężenia</h2>
          <p class="raised-hint">
            Najedź na kafel, a pod nazwą pojawi się pięć pustych miejsc. Klik w miejsce ustawia
            natężenie i zaznacza emocję. Klik w obecny poziom zdejmuje kropkę, a klik w kafel
            zaznacza go albo odznacza. Wybrany kafel zostaje wypukły, a wybór pokazuje kolor.
          </p>
        </div>
        <div class="raised-controls">
        <div class="raised-quads" role="group" aria-label="Przykłady na kaflach">
          <button
            v-for="o in exampleOptions"
            :key="String(o.value)"
            type="button"
            class="raised-quad"
            :class="{ 'raised-quad--active': showExamples === o.value }"
            :aria-pressed="showExamples === o.value"
            @click="showExamples = o.value"
          >
            {{ o.label }}
          </button>
        </div>
        <div class="raised-quads" role="group" aria-label="Układ kropek">
          <button
            v-for="d in dotLayouts"
            :key="d.id"
            type="button"
            class="raised-quad"
            :class="{ 'raised-quad--active': dotsLayout === d.id }"
            :aria-pressed="dotsLayout === d.id"
            @click="dotsLayout = d.id"
          >
            {{ d.label }}
          </button>
        </div>
        </div>
      </header>
      <p class="raised-layout-note">{{ dotLayouts.find(d => d.id === dotsLayout)?.note }}</p>
      <!-- szerokość produktu: karta emocji w dzienniku = 2fr z max-w-6xl ≈ 725 px (3 kolumny kafli ~220 px) -->
      <div class="raised-grid raised-grid--product mg-design-v2">
        <article class="raised-variant">
          <div class="raised-variant__label">
            <strong>Przegląd ćwiartek</strong>
            <span>Te same kafle Kompasu, karta się nie zabarwia.</span>
          </div>
          <div class="raised-card mg-v2-surface mg-v2-surface--raised-sm">
            <EmotionPickerCompass
              v-model="compassOverview.selections"
              v-model:quadrant="compassOverview.quadrant"
              :dots="dotsLayout"
              :examples="showExamples"
              label="Emocje"
            />
          </div>
        </article>
        <article class="raised-variant">
          <div class="raised-variant__label">
            <strong>W ćwiartce · dziennik emocji (karta 725 px, 4 kolumny)</strong>
            <span>Natężenia 0–5 obok siebie: brak, 1, 2, 3, 4, 5.</span>
          </div>
          <div class="raised-card mg-v2-surface mg-v2-surface--raised-sm">
            <EmotionPickerCompass
              v-model="compassDrill.selections"
              v-model:quadrant="compassDrill.quadrant"
              :dots="dotsLayout"
              :examples="showExamples"
              label="Emocje"
            />
          </div>
        </article>
        <article class="raised-variant raised-variant--journal">
          <div class="raised-variant__label">
            <strong>W ćwiartce · edytor dziennika (picker 503 px, 3 kolumny)</strong>
            <span>Ten sam stan co wyżej.</span>
          </div>
          <div class="raised-card mg-v2-surface mg-v2-surface--raised-sm">
            <EmotionPickerCompass
              v-model="compassDrill.selections"
              v-model:quadrant="compassDrill.quadrant"
              :dots="dotsLayout"
              :examples="showExamples"
              label="Emocje"
            />
          </div>
        </article>
      </div>
    </section>

    <!-- 3 · przegląd runda 1 -->
    <section class="raised-block">
      <header class="raised-block__head">
        <div>
          <span class="lab-eyebrow">3 · Przegląd ćwiartek · runda 1</span>
          <h2>Wypukłe przyciski ćwiartek, wybrane obok tytułu</h2>
        </div>
      </header>
      <div class="raised-grid mg-design-v2">
        <article class="raised-variant">
          <div class="raised-variant__label">
            <strong>Obecny</strong>
            <span>Płaskie ćwiartki, osobne pole „Wybrane” pod spodem.</span>
          </div>
          <div class="raised-card mg-v2-surface mg-v2-surface--raised-sm" :style="tint(overview.current.quadrant)">
            <EmotionGroupPicker
              v-model="overview.current.selections"
              v-model:quadrant="overview.current.quadrant"
              label="Emocje"
            />
          </div>
        </article>
        <article class="raised-variant">
          <div class="raised-variant__label">
            <strong>Nowy (A/B/C)</strong>
            <span>Ćwiartki wypukłe, wybrane jako płaskie badge przy „Emocje”; w ćwiartce kropka na mini-przycisku, gdy coś wybrano gdzie indziej.</span>
          </div>
          <div class="raised-card mg-v2-surface mg-v2-surface--raised-sm" :style="tint(overview.next.quadrant)">
            <EmotionPickerRaised
              v-model="overview.next.selections"
              v-model:quadrant="overview.next.quadrant"
              shade="deeper-soft"
              label="Emocje"
            />
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import EmotionGroupPicker from '@product/components/emotion/EmotionGroupPicker.vue'
import { getQuadrantTintStyle } from '@product/domain/emotion'
import type { Quadrant } from '@product/domain/emotion'
import { GROUPS_BY_QUADRANT, type EmotionGroupSelection } from '@product/domain/emotionGroups'
import EmotionPickerRaised from '~lab/components/emotion-picker/EmotionPickerRaised.vue'
import EmotionPickerCompass from '~lab/components/emotion-picker/EmotionPickerCompass.vue'

type VariantId = 'current' | 'whiter' | 'deeper' | 'deeper-soft' | 'neutral' | 'compass'
interface Variant {
  id: VariantId
  letter: string
  title: string
  note: string
  tinted: boolean
  rounds: Array<'r2' | 'r1'>
}

const variants: Variant[] = [
  { id: 'current', letter: '0', title: 'Obecny', note: 'Płasko; kafel o stopień bielszy od karty.', tinted: true, rounds: ['r1', 'r2'] },
  { id: 'deeper', letter: 'B', title: 'Ciemniej w górę (runda 1)', note: 'Kafel w pastelu ćwiartki, cień kontrolki.', tinted: true, rounds: ['r1', 'r2'] },
  { id: 'deeper-soft', letter: 'B2', title: 'Ciemniej w górę, spokojniej', note: 'Paleta tokenów systemu (róż/błękit z października), cień zagnieżdżenia zamiast cienia kontrolki.', tinted: true, rounds: ['r2'] },
  { id: 'compass', letter: 'D', title: 'Kafle Kompasu', note: 'Kafle w jednym kolorze, karta bez tintu; kolor tylko w kółku emotki i w kropkach.', tinted: false, rounds: ['r2'] },
  { id: 'whiter', letter: 'A', title: 'Bielej w górę', note: 'Drabinka systemu: karta w tincie, kafel prawie biały, wypukły.', tinted: true, rounds: ['r1'] },
  { id: 'neutral', letter: 'C', title: 'Karta bez tintu', note: 'Karta zostaje niebem; kolor niesie tylko kafel, jak na przeglądzie.', tinted: false, rounds: ['r1'] },
]
const rounds = [
  { id: 'r2' as const, label: 'Runda 2 · B, B2, D' },
  { id: 'r1' as const, label: 'Runda 1 · A, B, C' },
]
const round = ref<'r1' | 'r2'>('r2')
const visibleVariants = computed(() => variants.filter(v => v.rounds.includes(round.value)))

const dotLayouts = [
  // kolejność: wybrany układ pierwszy
  { id: 'below' as const, label: 'Kropki pod nazwą', note: 'Wybór usera (runda 3). Ikona stoi sama na górze, a kropki mają własny rząd pod nazwą, jak kropki zadania w Dzisiaj. Po najechaniu na kafel pojawia się pięć pustych miejsc i klik w miejsce ustawia poziom. Klik w obecny poziom zdejmuje jedną kropkę.' },
  { id: 'row' as const, label: 'Pasek w środku', note: 'Ikona i kropki to jeden pasek wyśrodkowany w kaflu. Ikona przesuwa się w lewo, gdy przybywa kropek, a „+” wisi na końcu paska.' },
  { id: 'center' as const, label: 'Ikona w osi', note: 'Ikona zawsze stoi w środku kafla, a kropki dokładają się na zmianę z prawej i z lewej. „+” pojawia się tam, gdzie wyląduje następna kropka.' },
]
const dotsLayout = ref<'row' | 'center' | 'below'>('below')
const exampleOptions = [
  { value: true, label: 'Przykłady na niewybranych' },
  { value: false, label: 'Bez przykładów' },
]
const showExamples = ref(true)

const quadrants: Array<{ id: Quadrant; label: string }> = [
  { id: 'high-energy-low-pleasantness', label: 'Wysoka · nieprzyjemne' },
  { id: 'high-energy-high-pleasantness', label: 'Wysoka · przyjemne' },
  { id: 'low-energy-low-pleasantness', label: 'Niska · nieprzyjemne' },
  { id: 'low-energy-high-pleasantness', label: 'Niska · przyjemne' },
]

function sample(q: Quadrant): EmotionGroupSelection[] {
  const groups = GROUPS_BY_QUADRANT[q]
  const out: EmotionGroupSelection[] = []
  if (groups[1]) out.push({ emotionId: groups[1].slug, intensity: 4 })
  if (groups[4]) out.push({ emotionId: groups[4].slug })
  return out
}

const drillQuadrant = ref<Quadrant>('high-energy-low-pleasantness')
type DrillState = { selections: EmotionGroupSelection[]; quadrant: Quadrant | null }
function drillState(q: Quadrant): DrillState {
  return { selections: sample(q), quadrant: q }
}
const drill = reactive<Record<VariantId, DrillState>>({
  current: drillState(drillQuadrant.value),
  whiter: drillState(drillQuadrant.value),
  deeper: drillState(drillQuadrant.value),
  'deeper-soft': drillState(drillQuadrant.value),
  neutral: drillState(drillQuadrant.value),
  compass: drillState(drillQuadrant.value),
})

/** D, sekcja 2: wszystkie poziomy naraz — kafle 1..6 dostają brak, 1, 2, 3, 4, 5. */
function ladder(q: Quadrant): EmotionGroupSelection[] {
  const groups = GROUPS_BY_QUADRANT[q]
  const out: EmotionGroupSelection[] = []
  groups.slice(0, 6).forEach((g, i) => {
    out.push(i === 0 ? { emotionId: g.slug } : { emotionId: g.slug, intensity: i as 1 | 2 | 3 | 4 | 5 })
  })
  return out
}
const compassDrill = reactive<DrillState>({ selections: ladder(drillQuadrant.value), quadrant: drillQuadrant.value })

function setDrillQuadrant(q: Quadrant) {
  drillQuadrant.value = q
  for (const v of variants) {
    drill[v.id].quadrant = q
    drill[v.id].selections = sample(q)
  }
  compassDrill.quadrant = q
  compassDrill.selections = ladder(q)
}

function overviewSelections(): EmotionGroupSelection[] {
  return [
    { emotionId: GROUPS_BY_QUADRANT['high-energy-low-pleasantness'][1].slug, intensity: 4 },
    { emotionId: GROUPS_BY_QUADRANT['low-energy-low-pleasantness'][0].slug },
    { emotionId: GROUPS_BY_QUADRANT['low-energy-high-pleasantness'][2].slug, intensity: 2 },
  ]
}
const overview = reactive({
  current: { selections: overviewSelections(), quadrant: null as Quadrant | null },
  next: { selections: overviewSelections(), quadrant: null as Quadrant | null },
})
const compassOverview = reactive<DrillState>({ selections: overviewSelections(), quadrant: null })

function tint(quadrant: Quadrant | null): Record<string, string> {
  return (getQuadrantTintStyle(quadrant) ?? {}) as Record<string, string>
}
</script>

<style>
.emotion-raised-page .raised-block { margin-bottom: 36px; }
.emotion-raised-page .raised-block__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 14px; }
.emotion-raised-page .raised-block__head h2 { margin: 4px 0 0; font-size: var(--mg-font-size-lg); }
.emotion-raised-page .raised-hint,
.emotion-raised-page .raised-layout-note { margin: 6px 0 0; max-width: 46rem; color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.emotion-raised-page .raised-layout-note { margin: 0 0 14px; }
.emotion-raised-page .raised-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.emotion-raised-page .raised-quads { display: flex; flex-wrap: wrap; gap: 6px; }
.emotion-raised-page .raised-quad {
  min-height: 32px; padding: 5px 12px; border: 0; cursor: pointer;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-mist); color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs); font-weight: var(--mg-weight-label);
  box-shadow: var(--mg-shadow-control);
}
.emotion-raised-page .raised-quad--active { background: var(--mg-color-paper); color: var(--mg-color-primary-strong); box-shadow: var(--mg-shadow-inset-sm); }
/* V2 root w Labie nie może wymuszać min-width workspace'u. */
.emotion-raised-page .raised-grid.mg-design-v2 { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 22px 18px; background: transparent; }
.emotion-raised-page .raised-grid--product.mg-design-v2 { grid-template-columns: minmax(0, 725px); }
.emotion-raised-page .raised-variant--journal { max-width: 543px; }
.emotion-raised-page .raised-variant { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.emotion-raised-page .raised-variant__label { display: flex; flex-direction: column; gap: 2px; padding: 0 4px; }
.emotion-raised-page .raised-variant__label strong { font-size: var(--mg-font-size-sm); color: var(--mg-color-ink); }
.emotion-raised-page .raised-variant__label span { font-size: var(--mg-font-size-xs); color: var(--mg-color-muted); }
.emotion-raised-page .raised-card { padding: 16px 20px; }
</style>
