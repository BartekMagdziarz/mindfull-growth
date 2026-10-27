<template>
  <section class="scenario-page concept-page jea" :class="{ 'jea--standalone': standalone }">
    <template v-if="!standalone">
      <header class="concept-heading">
        <div>
          <span class="lab-eyebrow">Eksperyment · Dziennik · edytor wpisu</span>
          <h1>Przyciski edytora i przełącznik Emocje/AI</h1>
          <p>
            Trzy kłopoty w jednym widoku: pasek „Czat · Anuluj · Zapisz” z kreską pod siatką o stałej wysokości ucina karty
            Kontekst/Osoby; przełącznik Emocje/AI zajmuje cały rząd; ciche przyciski nie są chmurami. Scena to replika edytora
            w szerokości produktu (dok 72 px, kontener 1280 px, siatka 3fr/2fr) z żywym <code>EmotionGroupPicker</code>.
            Wariant i przełącznik wybierasz niezależnie — przełącznik dotyczy tylko propozycji.
          </p>
        </div>
        <span class="status-badge status-badge--baseline">Wariant D wdrożony do produktu 27.10.2026</span>
      </header>

      <section class="jea__block">
        <header class="jea__block-head">
          <span class="lab-eyebrow">01 · Stan obecny · zrzut z verify, 27.10.2026, 1512 × 982</span>
          <h2>Kreska pod siatką, trzy przyciski w trzech stylach, pusty rząd przełącznika</h2>
        </header>
        <figure class="jea__shot">
          <img src="/research/current/journal/editor-2026-10-27.png" alt="Edytor wpisu: karta tekstu po lewej, panel Emocje po prawej, pod siatką pasek Czat · Anuluj · Zapisz z kreską" />
          <figcaption>
            Siatka ma 78 vh (766 px), panel po prawej przewija się w środku, a tuż pod nim leży stopka z <code>border-top</code>.
            Karty tagów kończą się twardą linią. „Czat” i „Anuluj” są przezroczyste (<code>quiet</code>), „Zapisz” wypełnione.
            Rząd „Emocje · AI” to dwa zwykłe przyciski z <code>aria-pressed</code>.
          </figcaption>
        </figure>
      </section>

      <section class="jea__block">
        <header class="jea__block-head">
          <span class="lab-eyebrow">02 · Propozycje · ta sama treść, inne miejsce akcji</span>
          <h2>Gdzie mieszka „Zapisz”, gdzie przełącznik, gdzie „Czat”</h2>
        </header>
        <div class="jea__toolbar neo-card" aria-label="Ustawienia sceny">
          <label>Wariant
            <select v-model="variant">
              <option v-for="item in VARIANTS" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </label>
          <label>Przełącznik Emocje/AI
            <select v-model="switcher" :disabled="variant === 'current' || variant === 'd'">
              <option v-for="item in SWITCHERS" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </label>
          <label>Sekcja na starcie
            <select v-model="section">
              <option value="emotions">Emocje</option>
              <option value="ai">AI</option>
            </select>
          </label>
          <label class="jea__check"><input v-model="tags" type="checkbox" /> Chipy w Kontekst/Osoby</label>
          <label class="jea__check"><input v-model="filled" type="checkbox" /> Wpis z treścią</label>
          <a class="jea__preview" :href="previewHref" target="_blank" rel="noopener">Podgląd 1:1 bez pasków Laba ↗</a>
        </div>
        <p class="jea__variant-note">{{ activeVariant.note }}</p>
        <div class="jea__stage">
          <JournalEditorStage :variant="variant" :switcher="switcher" :initial-section="section" :tags="tags" :filled="filled" :framed="false" />
        </div>
      </section>

      <section class="jea__block">
        <header class="jea__block-head">
          <span class="lab-eyebrow">03 · Do decyzji</span>
          <h2>Jedna wypełniona kontrolka w widoku, AI w jednym miejscu</h2>
        </header>
        <ol class="jea__decisions">
          <li v-for="item in DECISIONS" :key="item.id">
            <span class="jea__decision-id">{{ item.id }}</span>
            <div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div>
          </li>
        </ol>
      </section>
    </template>

    <JournalEditorStage v-else :variant="variant" :switcher="switcher" :initial-section="section" :tags="tags" :filled="filled" framed />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import JournalEditorStage, {
  type StageSection,
  type StageSwitcher,
  type StageVariant,
} from '~lab/components/journal-actions/JournalEditorStage.vue'

const VARIANTS: { id: StageVariant; label: string; note: string }[] = [
  { id: 'current', label: 'Obecnie · pasek pod siatką', note: 'Stan z produktu: siatka 78 vh, panel przewijany w środku, pod nim pasek z kreską i trzema przyciskami. Przy chipach w Kontekst/Osoby karty kończą się linią.' },
  { id: 'a', label: 'A · stopka w karcie pisania (rekomendacja)', note: 'Anuluj (cicho, na krawędzi treści) i Zapisz (chmura główna) wewnątrz płótna tekstu, jak w kreatorze mikroćwiczeń. Pasek i kreska znikają, panel boczny dostaje całą wysokość i gaśnie we mgle zamiast kończyć się linią. „Czat” mieszka w sekcji AI.' },
  { id: 'b', label: 'B · akcje w nagłówku', note: 'Zapisz i Anuluj w rzędzie z datą, jak w edytorze notatek. Siatka bez stałej wysokości: karta tekstu i panel rosną do treści, strona przewija się jako całość. „Czat” w sekcji AI.' },
  { id: 'd', label: 'D · Zapisz w tekście, przełącznik przy dacie, bez Anuluj (propozycja usera)', note: 'Zapisz jako jedyny przycisk w płótnie tekstu; kapsułka Emocje/AI w prawym rogu rzędu z datą; Anuluj znika, bo wyjściem jest strzałka wstecz w lewym rogu. Kolumna środkowa zostaje chevronem do zwijania panelu. „Czat” w sekcji AI.' },
  { id: 'c', label: 'C · tryb dokumentu (autozapis)', note: 'Bez „Zapisz” i „Anuluj”: wpis zapisuje się sam (szkice już istnieją), w nagłówku cichy wskaźnik „Zapisano 18:31”, strzałka = wyjście. Zmiana modelu, nie tylko designu.' },
]
const SWITCHERS: { id: StageSwitcher; label: string }[] = [
  { id: 'rail', label: 'Dyski w kolumnie środkowej (rekomendacja)' },
  { id: 'capsule', label: 'Kapsułka w rzędzie tytułu karty' },
  { id: 'row', label: 'Rząd przycisków jak dziś' },
]
const DECISIONS = [
  { id: 'D1', title: 'Jedna wypełniona kontrolka', body: '„Zapisz” jest jedyną chmurą główną w widoku. „Anuluj” to cichy tekst w tej samej wysokości, przy krawędzi treści — nie druga chmura, bo dwie obok siebie konkurują.' },
  { id: 'D2', title: '„Czat” to wejście do AI, nie akcja edytora', body: 'W sekcji AI, nad rozmową w miejscu: chmura „Porozmawiaj w osobnym czacie” i intencje jako czipy (dziś dropdown). Oba wejścia do AI w jednym miejscu; stopka ma tylko parę Anuluj/Zapisz.' },
  { id: 'D3', title: 'Przełącznik bez własnego rzędu', body: 'Dyski w kolumnie środkowej zastępują chevron: klik otwiera panel na sekcji, klik w aktywny zwija panel. Alternatywa: kapsułka mg-v2-segmented w rzędzie eyebrow karty, jak przełącznik ćwiartek w pickerze.' },
  { id: 'D4', title: 'Koniec kreski pod siatką', body: 'A: panel przewija się nadal, ale dolne 36 px gaśnie maską gradientową. B/C: siatka bez 78 vh, panel nie przewija się wewnętrznie, strona przewija się cała.' },
  { id: 'D5', title: 'Odległość „Zapisz” od końca tekstu', body: 'A trzyma akcję przy treści także w długim wpisie (stopka płótna). B stawia ją w nagłówku, daleko od końca długiego tekstu. C usuwa pytanie.' },
  { id: 'D7', title: 'D: strzałka wstecz zamiast Anuluj', body: 'Skoro powłoka daje strzałkę w lewym rogu, „Anuluj” dubluje wyjście. Pytanie otwarte: co ze szkicem przy wyjściu strzałką — dziś edytor zachowuje szkic lokalnie, więc wyjście bez zapisu nic nie traci.' },
  { id: 'D6', title: 'Poza zakresem', body: 'Układ pickera emocji, dymki panelu AI i stary widok czatu zostają jak są; scena replikuje tylko ich kształt.' },
]

const route = useRoute()
const router = useRouter()
const standalone = computed(() => Boolean(route.meta.standalone))

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const raw = route.query[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  return allowed.includes(value as T) ? (value as T) : fallback
}
const variant = ref<StageVariant>(read('variant', ['current', 'a', 'b', 'c', 'd'], 'd'))
const switcher = ref<StageSwitcher>(read('switch', ['row', 'rail', 'capsule'], 'rail'))
const section = ref<StageSection>(read('section', ['emotions', 'ai'], 'emotions'))
const tags = ref(route.query.tags !== '0')
const filled = ref(route.query.filled !== '0')

const activeVariant = computed(() => VARIANTS.find(item => item.id === variant.value) ?? VARIANTS[0])

const query = computed(() => {
  const q: Record<string, string> = { variant: variant.value, switch: switcher.value, section: section.value }
  if (!tags.value) q.tags = '0'
  if (!filled.value) q.filled = '0'
  return q
})
const previewHref = computed(() => `/preview/journal-editor-actions?${new URLSearchParams(query.value)}`)
watch(query, q => router.replace({ query: q }))
</script>

<style scoped>
.jea .concept-heading p code,
.jea figcaption code { font-size: 0.9em; }
.jea__block { margin-top: 34px; }
.jea__block-head { margin-bottom: 14px; }
.jea__block-head h2 { margin: 4px 0 0; font-size: 20px; }
.jea__shot { margin: 0; }
.jea__shot img { display: block; width: 100%; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); }
.jea__shot figcaption { margin-top: 10px; max-width: 900px; color: var(--mg-color-muted); font-size: 13px; line-height: 1.55; }
.jea__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px; padding: 12px 18px; margin-bottom: 10px; font-size: 12px; }
.jea__toolbar label { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.jea__toolbar select { padding: 4px 8px; border: 1px solid var(--mg-color-border); border-radius: 10px; background: var(--mg-color-paper); font-weight: 600; }
.jea__check { font-weight: 600 !important; }
.jea__preview { margin-left: auto; color: var(--mg-color-primary-strong); font-weight: 700; text-decoration: none; }
.jea__variant-note { margin: 0 0 14px; max-width: 980px; color: var(--mg-color-muted); font-size: 13px; line-height: 1.55; }
.jea__stage { padding: 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: rgb(var(--color-background)); overflow: auto; }
.jea__decisions { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.jea__decisions li { display: grid; grid-template-columns: 42px 1fr; gap: 10px; align-items: start; }
.jea__decisions strong { font-size: 13px; }
.jea__decisions p { margin: 2px 0 0; max-width: 900px; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.jea__decision-id { display: inline-grid; place-items: center; min-height: 26px; border-radius: 999px; background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font-size: 11px; font-weight: 800; }
.jea--standalone { width: auto; margin: 0; }
</style>
