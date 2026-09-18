<template>
  <section class="scenario-page concept-page emotion-skins-page">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · komponenty emocji</span>
        <h1>Picker emocji · trzy nowe kierunki</h1>
        <p>
          Każda propozycja to ten sam, żywy <code>EmotionGroupPicker</code> z produktu (pełna funkcjonalność:
          ćwiartki, kafle grup, suwak natężenia, chipy) — zmienia się tylko warstwa stylu. Paleta ćwiartek
          (róż · błękit · lawenda · jasny błękit) zostaje bez zmian; różnią się głębia, gradienty, kontury
          i sposób pokazania twarzy na gałce suwaka.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Koncepcja · nie baseline</span>
    </header>

    <div class="skin-tabs" role="tablist" aria-label="Skórki">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="skin-tab"
        :class="{ 'skin-tab--active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
      <span class="skin-tabs__hint">Klikaj w ćwiartki, kafle i suwaki — to działa jak w aplikacji.</span>
    </div>

    <section v-for="skin in visibleSkins" :key="skin.id" class="skin-block">
      <header class="skin-block__head">
        <div>
          <span class="lab-eyebrow">{{ skin.number }} · {{ skin.label }}</span>
          <h2>{{ skin.title }}</h2>
          <p>{{ skin.description }}</p>
        </div>
        <ul class="skin-block__notes">
          <li v-for="note in skin.notes" :key="note">{{ note }}</li>
        </ul>
      </header>

      <div v-if="skin.id === 'paper'" class="thumb-options" role="group" aria-label="Wygląd główki suwaka">
        <span>Główka suwaka</span>
        <button v-for="option in thumbOptions" :key="option.id" type="button"
          class="skin-tab" :class="{ 'skin-tab--active': thumbStyle === option.id }"
          :aria-pressed="thumbStyle === option.id" @click="thumbStyle = option.id">{{ option.label }}</button>
        <p>{{ thumbOptions.find(option => option.id === thumbStyle)?.description }}</p>
      </div>
      <div class="skin-panels mg-design-v2" :class="[`egp-skin egp-skin--${skin.id}`, skin.id === 'paper' ? `thumb-style--${thumbStyle}` : '']">
        <div class="skin-card mg-v2-surface mg-v2-surface--raised-sm">
          <p class="skin-card__caption">Przegląd ćwiartek</p>
          <EmotionGroupPicker
            v-model="state[skin.id].overviewSelections"
            v-model:quadrant="state[skin.id].overviewQuadrant"
            label="Emocje"
          />
        </div>
        <div class="skin-card mg-v2-surface mg-v2-surface--raised-sm" :style="tint(state[skin.id].drillQuadrant)">
          <p class="skin-card__caption">Emocje · wybierz kafel i ustaw natężenie</p>
          <EmotionGroupPicker
            v-model="state[skin.id].drillSelections"
            v-model:quadrant="state[skin.id].drillQuadrant"
            label="Emocje"
          />
        </div>
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

const thumbOptions = [
  { id: 'blob', label: 'A · Pastelowy kleks', description: 'Jasny kleks w kolorze ćwiartki, bez ramki. Rekomendowany punkt wyjścia.' },
  { id: 'island', label: 'B · Papierowa wysepka', description: 'Jasna, lekko nieregularna plamka bez ramki i cienia.' },
  { id: 'face', label: 'C · Sama twarz', description: 'Twarz w przerwie kreski, bez widocznej główki. Obszar przeciągania pozostaje taki sam.' },
  { id: 'original', label: 'Poprzednia · z ramką', description: 'Dotychczasowa główka, zachowana do porównania.' },
] as const
const thumbStyle = ref<(typeof thumbOptions)[number]['id']>('blob')

type SkinId = 'pencil' | 'ladder' | 'wash' | 'mono' | 'clouds' | 'watercolor' | 'paper'

interface Skin {
  id: SkinId
  number: string
  label: string
  title: string
  description: string
  notes: string[]
}

const skins: Skin[] = [
  {
    id: 'clouds', number: '05', label: 'Chmurki pastelowe',
    title: 'Miękki kolor całego kafla',
    description: 'Ćwiartki mają delikatne, nieregularne rozlania koloru. Kafel emocji od początku należy do tej samej palety; po wyborze cały nabiera wyraźniejszego koloru. Jasna gałka z ciemną twarzą uspokaja suwak.',
    notes: ['Wybór = pełniejsze wypełnienie + mały znak ✓, bez obramowania.', 'Kolor oznacza ćwiartkę. Natężenie pokazuje wyłącznie pozycja suwaka.', 'Najbliżej Chmurek; miękkość bez nadmiaru dekoracji.'],
  },
  {
    id: 'watercolor', number: '06', label: 'Akwarelowe obłoki',
    title: 'Bardziej organiczne, rozmyte plamy pigmentu',
    description: 'Kilka nakładających się, asymetrycznych plam zamiast jednej regularnej poświaty. Po wybraniu pigment wypełnia cały kafel, a delikatne rozlania pozostają na jego powierzchni.',
    notes: ['Najbardziej malarski z trzech kierunków.', 'Kontrolki i tekst pozostają ostre; rozmycie dotyczy tylko tła.', 'Warto ocenić, czy przy wielu emocjach faktura nie konkuruje z nazwami.'],
  },
  {
    id: 'paper', number: '07', label: 'Papier z pigmentem',
    title: 'Równy pastel, rysunkowa kreska · rozwinięcie 07',
    description: 'Ćwiartki mają równomierne pastelowe wypełnienie. Lekko nieregularne narożniki i konturowe ikony nawiązują do rysunkowego języka kalendarza i Dzisiaj. Wybór barwi cały kafel; natężenie pokazuje przygaszona, ciemniejsza kreska na jasnym torze.',
    notes: ['Równy kolor ćwiartek, bez akwarelowych plam i gradientów.', 'Jasny tor i ciemniejsza kreska pozostają czytelne również po zaznaczeniu.', 'Nowe ikony ćwiartek to próbka kierunku; twarze emocji zachowują obecny zestaw.'],
  },
  {
    id: 'pencil',
    number: '01',
    label: 'Szkic ołówkiem',
    title: 'Płaskie kafle z kolorowym konturem, zero gradientów i cieni',
    description:
      'Kolor ćwiartki zostaje jako delikatne wypełnienie (45 %) i kontur w tonie tekstu. Kafle grup są w tonie pola z cienką kolorową kreską, suwak to przerywana linia, a gałka — biały krążek z obrysem. Najbliżej rysunkowych chipów z kalendarza i rytuałów.',
    notes: [
      'Zaznaczenie = grubszy kontur + lekki przechył, nie zmiana koloru.',
      'Twarz na gałce w kolorze atramentu zmieszanego z akcentem ćwiartki.',
      'Ryzyko: mniej „soczyste” ćwiartki na przeglądzie — kolory czytane głównie z konturu.',
    ],
  },
  {
    id: 'ladder',
    number: '02',
    label: 'Chmurki',
    title: 'Drabinka tonalna aplikacji, kolor tylko w orbie ikony i gałce',
    description:
      'Kafle i ćwiartki to ten sam ton pola co reszta aplikacji (karta → pole → wnętrze). Kolor ćwiartki żyje w organicznej orbie z ikoną, w kolorowej gałce suwaka i kropce chipa. Jedyny cień to cień karty na ćwiartkach.',
    notes: [
      'Najbardziej spójny z Dzisiaj, Obiektami i kalendarzem — emocje przestają być osobnym światem.',
      'Zaznaczony kafel = wnętrze (o stopień bielsze) + kolorowy obrys.',
      'Ryzyko: przegląd ćwiartek traci „temperaturę” — cztery podobne karty, kolor tylko w orbach.',
    ],
  },
  {
    id: 'wash',
    number: '03',
    label: 'Akwarela',
    title: 'Plama koloru rozlana z rogu na tonie pola',
    description:
      'Zamiast gradientu po przekątnej — miękka, radialna plama koloru ćwiartki w lewym górnym rogu, która wygasa w ton pola. Kafle grup dostają mniejszą plamę w kolorze grupy. Zachowuje intensywność palety, ale w „ręcznym” rozlaniu.',
    notes: [
      'Hover = przerywany kontur wokół kafla, jak zaznaczenie ołówkiem.',
      'Suwak i chipy są jasne, z kolorem tylko w wypełnieniu.',
      'Ryzyko: plamy mogą wyglądać niespójnie przy 12 kaflach obok siebie — do oceny na żywo.',
    ],
  },
  {
    id: 'mono',
    number: '04',
    label: 'Monochrom + akcent',
    title: 'Wszystko w tonach aplikacji, kolor ćwiartki jako podkreślenie i wypełnienie',
    description:
      'Ćwiartki i kafle w tonach błękitu jak reszta interfejsu. Kolor ćwiartki pojawia się w dużej ikonie, w krótkim podkreśleniu pod nazwą, w wypełnieniu suwaka i w pełnych chipach wybranych emocji. Najspokojniejszy wariant.',
    notes: [
      'Suwak zostaje wklęsły — to kontrolka, więc drabinka na to pozwala.',
      'Gałka = wnętrze z kolorowym obrysem; twarz w kolorze grupy.',
      'Ryzyko: ćwiartki bez wypełnienia tłem mogą być trudniejsze do rozróżnienia na pierwszy rzut oka.',
    ],
  },
]

type TabId = 'all' | 'originals' | SkinId
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: 'Trzy nowe kierunki' },
  { id: 'originals', label: 'Pierwsze cztery' },
  ...skins.map(skin => ({ id: skin.id, label: `${skin.number} · ${skin.label}` })),
]
const activeTab = ref<TabId>('paper')
const visibleSkins = computed(() => (activeTab.value === 'all' ? skins.slice(0, 3) : activeTab.value === 'originals' ? skins.slice(3) : skins.filter(skin => skin.id === activeTab.value)))

const DRILL_QUADRANT: Quadrant = 'high-energy-low-pleasantness'

function initialDrillSelections(): EmotionGroupSelection[] {
  const groups = GROUPS_BY_QUADRANT[DRILL_QUADRANT]
  return [
    { emotionId: groups[0]?.slug ?? 'radosc', intensity: 4 },
    { emotionId: groups[2]?.slug ?? groups[0]?.slug ?? 'radosc', intensity: 2 },
  ]
}

interface SkinState {
  overviewSelections: EmotionGroupSelection[]
  overviewQuadrant: Quadrant | null
  drillSelections: EmotionGroupSelection[]
  drillQuadrant: Quadrant | null
}

function initialSkinState(): SkinState {
  return {
    overviewSelections: [],
    overviewQuadrant: null,
    drillSelections: initialDrillSelections(),
    drillQuadrant: DRILL_QUADRANT,
  }
}

const state = reactive<Record<SkinId, SkinState>>({
  clouds: initialSkinState(),
  watercolor: initialSkinState(),
  paper: initialSkinState(),
  pencil: initialSkinState(),
  ladder: initialSkinState(),
  wash: initialSkinState(),
  mono: initialSkinState(),
})

function tint(quadrant: Quadrant | null): Record<string, string> {
  return (getQuadrantTintStyle(quadrant) ?? {}) as Record<string, string>
}
</script>

<style>
/* Page chrome ------------------------------------------------------------ */
.emotion-skins-page .concept-heading p code { font-size: 0.9em; }
.emotion-skins-page .skin-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 22px; }
.emotion-skins-page .skin-tab { min-height: 34px; padding: 6px 13px; border: 1px solid rgb(var(--neo-border) / 0.2); border-radius: 14px 17px 12px 16px; background: color-mix(in srgb, white 45%, rgb(var(--sky-100))); color: rgb(var(--neo-muted)); font-size: 11px; font-weight: 800; cursor: pointer; }
.emotion-skins-page .skin-tab--active { color: rgb(var(--color-primary-strong)); background: color-mix(in srgb, white 80%, rgb(var(--sky-100))); border-color: rgb(var(--color-primary) / 0.6); }
.emotion-skins-page .skin-tabs__hint { margin-left: auto; color: rgb(var(--neo-muted)); font-size: 11px; }
.emotion-skins-page .skin-block { margin-bottom: 34px; }
.emotion-skins-page .skin-block__head { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 22px; align-items: start; margin-bottom: 14px; }
.emotion-skins-page .skin-block__head h2 { margin: 4px 0 6px; font-size: 20px; }
.emotion-skins-page .skin-block__head p { margin: 0; max-width: 720px; color: rgb(var(--neo-muted)); font-size: 13px; line-height: 1.55; }
.emotion-skins-page .skin-block__notes { margin: 0; padding: 12px 14px 12px 28px; border: 1px dashed rgb(var(--neo-border) / 0.55); border-radius: 17px 14px 18px 15px; color: rgb(var(--color-on-surface)); font-size: 12px; line-height: 1.5; }
.emotion-skins-page .skin-block__notes li + li { margin-top: 4px; }

/* The V2 root inside the Lab page must not force the workspace min-width. */
.emotion-skins-page .skin-panels.mg-design-v2 { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; background: transparent; }
.emotion-skins-page .skin-card { padding: 18px 20px 16px; }
.emotion-skins-page .skin-card__caption { margin: 0 0 10px; color: var(--mg-color-muted); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }

/* Shared skin tokens ----------------------------------------------------- */
.emotion-skins-page .egp-skin {
  --sk-card: rgb(var(--sky-100));
  --sk-field: color-mix(in srgb, white 45%, rgb(var(--sky-100)));
  --sk-inner: color-mix(in srgb, white 80%, rgb(var(--sky-100)));
  --sk-line: rgb(var(--neo-border) / 0.14);
  --sk-ink: rgb(var(--color-on-surface));
  --sk-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / 0.6), 2px 2px 5px rgb(var(--neo-shadow-dark) / 0.13);
  --sk-shadow-card: -5px -5px 11px rgb(var(--neo-shadow-light) / 0.7), 5px 5px 11px rgb(var(--neo-shadow-dark) / 0.16);
  --sk-r-md: 17px 14px 18px 15px;
  --sk-r-lg: 25px 30px 24px 28px;
  --sk-r-blob: 52% 48% 54% 46% / 47% 53% 46% 54%;
}
.emotion-skins-page .egp-skin .qbtn,
.emotion-skins-page .egp-skin .etile,
.emotion-skins-page .egp-skin .mcell,
.emotion-skins-page .egp-skin .hthumb,
.emotion-skins-page .egp-skin .fchip { transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease; }

/* 01 · Szkic ołówkiem ----------------------------------------------------- */
.emotion-skins-page .egp-skin--pencil .qbtn { background: color-mix(in srgb, var(--qb) 45%, var(--sk-field)); border: 1.5px solid color-mix(in srgb, var(--qtx) 32%, transparent); border-radius: var(--sk-r-lg); box-shadow: none; transform: rotate(-0.35deg); }
.emotion-skins-page .egp-skin--pencil .qbtn:nth-child(even) { transform: rotate(0.3deg); }
.emotion-skins-page .egp-skin--pencil .qbtn:hover { transform: translateY(-1px) rotate(-0.35deg); border-color: color-mix(in srgb, var(--qtx) 55%, transparent); box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .qbtn:active { box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .qbtn .egp-icon { opacity: 1; }
.emotion-skins-page .egp-skin--pencil .qbadge { background: var(--sk-inner); box-shadow: none; border: 1px solid color-mix(in srgb, var(--qtx) 35%, transparent); }
.emotion-skins-page .egp-skin--pencil .mcell { background: color-mix(in srgb, var(--mb) 55%, var(--sk-field)); border: 1px solid color-mix(in srgb, var(--mtx) 30%, transparent); box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .mcell.active { box-shadow: none; border-width: 2px; }
.emotion-skins-page .egp-skin--pencil .etile { background: var(--sk-field); border: 1.2px solid color-mix(in srgb, var(--c) 45%, transparent); border-radius: var(--sk-r-md); box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .etile:hover { transform: translateY(-1px) rotate(-0.3deg); box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .etile.sel { border-width: 2px; background: color-mix(in srgb, var(--c) 10%, var(--sk-field)); box-shadow: none; transform: rotate(-0.6deg); }
.emotion-skins-page .egp-skin--pencil .htrack { height: 12px; border-radius: 0; background: transparent; box-shadow: none; border-bottom: 1.5px dashed color-mix(in srgb, var(--c) 50%, transparent); overflow: visible; }
.emotion-skins-page .egp-skin--pencil .hfillbar { top: 3px; bottom: 3px; border-radius: 6px 4px 5px 3px; background: color-mix(in srgb, var(--c) 55%, transparent); transform: rotate(-0.6deg); }
.emotion-skins-page .egp-skin--pencil .hzones span:not(:last-child) { border-right: 1px dashed color-mix(in srgb, var(--c) 35%, transparent); }
.emotion-skins-page .egp-skin--pencil .hthumb { background: var(--sk-inner); border: 1.5px solid color-mix(in srgb, var(--c) 70%, var(--sk-ink)); box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .hthumb:hover { box-shadow: none; transform: translateY(-50%) scale(1.06); }
.emotion-skins-page .egp-skin--pencil .fico { background: color-mix(in srgb, var(--c) 60%, var(--sk-ink)); }
.emotion-skins-page .egp-skin--pencil .fchip { background: var(--sk-inner); color: color-mix(in srgb, var(--c) 60%, var(--sk-ink)); border: 1.2px solid color-mix(in srgb, var(--c) 55%, transparent); box-shadow: none; }
.emotion-skins-page .egp-skin--pencil .fx { background: color-mix(in srgb, var(--c) 18%, transparent); color: inherit; }

/* 02 · Chmurki (drabinka) -------------------------------------------------- */
.emotion-skins-page .egp-skin--ladder .qbtn { background: var(--sk-field); border: 1px solid var(--sk-line); border-radius: var(--sk-r-lg); box-shadow: var(--sk-shadow-card); color: var(--qtx); }
.emotion-skins-page .egp-skin--ladder .qbtn:hover { transform: translateY(-1px); background: var(--sk-inner); box-shadow: var(--sk-shadow-card); }
.emotion-skins-page .egp-skin--ladder .qbtn:active { box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--ladder .qbtn .egp-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: var(--sk-r-blob); background: linear-gradient(150deg, var(--qt), var(--qb)); font-size: 23px; opacity: 1; transform: rotate(-3deg); }
.emotion-skins-page .egp-skin--ladder .q-div { background: var(--qb); opacity: 1; height: 2px; width: 32px; border-radius: 2px 1px 2px 1px; }
.emotion-skins-page .egp-skin--ladder .qbadge { background: linear-gradient(150deg, var(--qt), var(--qb)); box-shadow: none; }
.emotion-skins-page .egp-skin--ladder .mcell { background: var(--sk-field); border: 1px solid var(--sk-line); box-shadow: none; opacity: 0.85; filter: none; }
.emotion-skins-page .egp-skin--ladder .mcell.active { background: linear-gradient(150deg, var(--mt), var(--mb)); box-shadow: var(--sk-shadow); border-color: transparent; }
.emotion-skins-page .egp-skin--ladder .etile { background: var(--sk-field); border: 1px solid var(--sk-line); border-radius: var(--sk-r-md); box-shadow: none; }
.emotion-skins-page .egp-skin--ladder .etile:hover { transform: translateY(-1px); background: var(--sk-inner); box-shadow: none; }
.emotion-skins-page .egp-skin--ladder .etile.sel { background: var(--sk-inner); border-color: color-mix(in srgb, var(--c) 55%, transparent); box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--ladder .htrack { background: var(--sk-inner); border: 1px solid rgb(var(--sky-400) / 0.22); box-shadow: none; border-radius: 8px 10px 7px 11px; }
.emotion-skins-page .egp-skin--ladder .hfillbar { background: color-mix(in srgb, var(--c) 70%, white); border-radius: 8px 10px 7px 11px; }
.emotion-skins-page .egp-skin--ladder .hzones span:not(:last-child) { border-right: 1px solid color-mix(in srgb, var(--c) 18%, transparent); }
.emotion-skins-page .egp-skin--ladder .hthumb { background: var(--c); border-radius: 48% 52% 44% 56% / 54% 44% 56% 46%; box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--ladder .hthumb:hover { box-shadow: var(--sk-shadow-card); }
.emotion-skins-page .egp-skin--ladder .fico { background: white; }
.emotion-skins-page .egp-skin--ladder .fchip { background: var(--sk-inner); color: var(--sk-ink); box-shadow: var(--sk-shadow); border: 1px solid var(--sk-line); }
.emotion-skins-page .egp-skin--ladder .fchip::before { content: ''; width: 9px; height: 9px; border-radius: var(--sk-r-blob); background: var(--c); flex: none; }
.emotion-skins-page .egp-skin--ladder .fx { background: color-mix(in srgb, var(--sk-ink) 8%, transparent); color: var(--sk-ink); }

/* 03 · Akwarela ----------------------------------------------------------- */
.emotion-skins-page .egp-skin--wash .qbtn { background: radial-gradient(130% 100% at 16% 10%, color-mix(in srgb, var(--qb) 88%, white) 0%, color-mix(in srgb, var(--qt) 55%, var(--sk-field)) 42%, var(--sk-field) 78%); border: 1px solid var(--sk-line); border-radius: var(--sk-r-lg); box-shadow: var(--sk-shadow-card); }
.emotion-skins-page .egp-skin--wash .qbtn:hover { transform: translateY(-1px); outline: 1.5px dashed color-mix(in srgb, var(--qtx) 45%, transparent); outline-offset: 3px; box-shadow: var(--sk-shadow-card); }
.emotion-skins-page .egp-skin--wash .qbtn:active { box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--wash .qbadge { background: var(--sk-inner); box-shadow: none; }
.emotion-skins-page .egp-skin--wash .mcell { background: radial-gradient(120% 120% at 20% 15%, var(--mb) 0%, var(--sk-field) 85%); box-shadow: none; border: 1px solid var(--sk-line); }
.emotion-skins-page .egp-skin--wash .mcell.active { box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--wash .etile { background: radial-gradient(120% 90% at 14% 8%, color-mix(in srgb, var(--c) 34%, white) 0%, var(--sk-field) 72%); border: 1px solid var(--sk-line); border-radius: var(--sk-r-md); box-shadow: none; }
.emotion-skins-page .egp-skin--wash .etile:hover { transform: none; outline: 1.5px dashed color-mix(in srgb, var(--c) 55%, transparent); outline-offset: 2px; box-shadow: none; }
.emotion-skins-page .egp-skin--wash .etile.sel { background: radial-gradient(130% 100% at 14% 8%, color-mix(in srgb, var(--c) 58%, white) 0%, color-mix(in srgb, var(--c) 12%, var(--sk-field)) 80%); border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: none; }
.emotion-skins-page .egp-skin--wash .htrack { background: color-mix(in srgb, var(--c) 10%, var(--sk-inner)); box-shadow: none; border: 1px solid rgb(var(--sky-400) / 0.18); }
.emotion-skins-page .egp-skin--wash .hfillbar { background: linear-gradient(90deg, color-mix(in srgb, var(--c) 35%, white), color-mix(in srgb, var(--c) 80%, white)); }
.emotion-skins-page .egp-skin--wash .hthumb { background: radial-gradient(circle at 35% 30%, white, color-mix(in srgb, var(--c) 55%, white)); box-shadow: 0 2px 6px color-mix(in srgb, var(--c) 35%, transparent); }
.emotion-skins-page .egp-skin--wash .hthumb:hover { box-shadow: 0 3px 9px color-mix(in srgb, var(--c) 45%, transparent); }
.emotion-skins-page .egp-skin--wash .fico { background: color-mix(in srgb, var(--c) 65%, var(--sk-ink)); }
.emotion-skins-page .egp-skin--wash .fchip { background: linear-gradient(120deg, color-mix(in srgb, var(--c) 70%, white), color-mix(in srgb, var(--c) 92%, white)); box-shadow: none; }

/* 04 · Monochrom + akcent -------------------------------------------------- */
.emotion-skins-page .egp-skin--mono .qbtn { background: var(--sk-field); border: 1px solid var(--sk-line); border-radius: var(--sk-r-lg); box-shadow: var(--sk-shadow-card); color: var(--sk-ink); }
.emotion-skins-page .egp-skin--mono .qbtn:hover { transform: translateY(-1px); background: var(--sk-inner); box-shadow: var(--sk-shadow-card); }
.emotion-skins-page .egp-skin--mono .qbtn:active { box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--mono .qbtn .egp-icon { font-size: 30px; color: var(--qtx); opacity: 1; }
.emotion-skins-page .egp-skin--mono .q-en, .emotion-skins-page .egp-skin--mono .q-pl { color: var(--sk-ink); }
.emotion-skins-page .egp-skin--mono .q-div { background: var(--qb); opacity: 1; height: 3px; width: 36px; border-radius: 2px 1px 2px 1px; transform: rotate(-1deg); }
.emotion-skins-page .egp-skin--mono .qbadge { background: var(--qb); color: var(--qtx); box-shadow: none; }
.emotion-skins-page .egp-skin--mono .mcell { background: var(--sk-field); border: 1px solid var(--sk-line); box-shadow: none; opacity: 0.85; filter: none; }
.emotion-skins-page .egp-skin--mono .mcell.active { background: var(--sk-inner); box-shadow: none; outline: 2px solid var(--mb); outline-offset: -2px; }
.emotion-skins-page .egp-skin--mono .etile { background: var(--sk-field); border: 1px solid var(--sk-line); border-radius: var(--sk-r-md); box-shadow: none; }
.emotion-skins-page .egp-skin--mono .etile:hover { transform: translateY(-1px); background: var(--sk-inner); box-shadow: none; }
.emotion-skins-page .egp-skin--mono .etile.sel { background: var(--sk-inner); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--mono .etname { color: var(--sk-ink); }
.emotion-skins-page .egp-skin--mono .etile.sel .etname { color: color-mix(in srgb, var(--c) 65%, var(--sk-ink)); }
.emotion-skins-page .egp-skin--mono .htrack { background: rgb(var(--sky-200) / 0.6); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.58), inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.13); }
.emotion-skins-page .egp-skin--mono .hfillbar { background: var(--c); }
.emotion-skins-page .egp-skin--mono .hzones span:not(:last-child) { border-right: 1px solid rgb(var(--sky-100)); }
.emotion-skins-page .egp-skin--mono .hthumb { background: var(--sk-inner); border: 2px solid var(--c); box-shadow: var(--sk-shadow); }
.emotion-skins-page .egp-skin--mono .fico { background: color-mix(in srgb, var(--c) 70%, var(--sk-ink)); }
.emotion-skins-page .egp-skin--mono .fchip { background: var(--c); box-shadow: none; }

/* Feedback round: quadrant hue is shared by tile, selection and controls. */
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) {
  --pigment-idle: 9%; --pigment-selected: 30%;
}
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .qbtn {
  background: radial-gradient(ellipse at 12% 28%, color-mix(in srgb, var(--qb) 70%, transparent), transparent 65%), radial-gradient(ellipse at 87% 82%, color-mix(in srgb, var(--qt) 65%, transparent), transparent 72%), var(--sk-field);
  border: 0; border-radius: 29px 38px 30px 42px / 35px 29px 39px 31px; box-shadow: var(--sk-shadow);
}
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .qbtn:nth-child(even) { border-radius: 38px 28px 42px 29px / 29px 40px 31px 37px; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .mcell { background: color-mix(in srgb, var(--mb) 38%, var(--sk-inner)); box-shadow: none; filter: none; opacity: 1; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .mcell.active { background: var(--mb); box-shadow: none; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .etile {
  background: color-mix(in srgb, var(--c) var(--pigment-idle), #fafbfd); border: 0; border-radius: var(--sk-r-lg); box-shadow: none;
}
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .etile.sel {
  background: color-mix(in srgb, var(--c) var(--pigment-selected), #fafbfd); box-shadow: var(--sk-shadow);
}
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .etile.sel::after { content: '✓'; position: absolute; right: 12px; top: 8px; color: var(--sk-ink); font-size: 13px; pointer-events: none; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .etnew { display: none; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .etname { color: var(--sk-ink); }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .htrack { background: color-mix(in srgb, var(--c) 7%, #fafbfd); box-shadow: none; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .hfillbar { background: color-mix(in srgb, var(--c) 32%, #fafbfd); }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .hthumb { background: color-mix(in srgb, var(--c) 18%, #fafbfd); border: 1px solid color-mix(in srgb, var(--sk-ink) 35%, transparent); box-shadow: var(--sk-shadow); border-radius: var(--sk-r-blob); }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .fico { background: var(--sk-ink); }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .fchip { background: color-mix(in srgb, var(--c) 25%, #fafbfd); color: var(--sk-ink); box-shadow: none; }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) .fx { color: inherit; background: rgb(255 255 255 / .5); }
.emotion-skins-page :is(.egp-skin--clouds, .egp-skin--watercolor, .egp-skin--paper) button:focus-visible { outline: 2px solid var(--sk-ink); outline-offset: 3px; }
.emotion-skins-page .egp-skin--watercolor .etile {
  background: radial-gradient(ellipse at 6% 22%, color-mix(in srgb, var(--c) 19%, transparent), transparent 65%), radial-gradient(ellipse at 90% 84%, color-mix(in srgb, var(--c) 12%, transparent), transparent 62%), #fafbfd;
}
.emotion-skins-page .egp-skin--watercolor .etile.sel {
  background: radial-gradient(ellipse at 6% 22%, color-mix(in srgb, var(--c) 25%, transparent), transparent 65%), radial-gradient(ellipse at 90% 84%, color-mix(in srgb, var(--c) 20%, transparent), transparent 62%), color-mix(in srgb, var(--c) 23%, #fafbfd);
}
.emotion-skins-page .egp-skin--watercolor .etile:nth-child(even) { border-radius: 32px 23px 35px 25px; }
.emotion-skins-page .egp-skin--paper { --pigment-idle: 3%; --pigment-selected: 34%; }
.emotion-skins-page .egp-skin--paper .etile, .emotion-skins-page .egp-skin--paper .etile.sel { border-radius: var(--sk-r-md); box-shadow: none; }
@media (max-width: 1100px) { .emotion-skins-page .skin-panels.mg-design-v2 { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .emotion-skins-page .egp-skin * { transition: none; } }


/* 07 refinement: flat pastel fields and a quiet, legible ink stroke. */
.emotion-skins-page .egp-skin--paper .qbtn {
  background: color-mix(in srgb, var(--qb) 48%, var(--sk-inner));
  border-radius: var(--sk-r-lg); box-shadow: none;
}
.emotion-skins-page .egp-skin--paper .qbtn:nth-child(even) { border-radius: 28px 24px 30px 25px; }
.emotion-skins-page .egp-skin--paper .qbtn:hover { background: color-mix(in srgb, var(--qb) 58%, var(--sk-inner)); box-shadow: none; }
.emotion-skins-page .egp-skin--paper .q-div { display: none; }
.emotion-skins-page .egp-skin--paper .qbtn .egp-icon,
.emotion-skins-page .egp-skin--paper .mcell .egp-icon {
  display: inline-block; width: 32px; height: 32px; font-size: 0; opacity: 1;
  background: currentColor; mask: var(--paper-icon) center / contain no-repeat;
}
.emotion-skins-page .egp-skin--paper .mcell .egp-icon { width: 18px; height: 18px; }
.emotion-skins-page .egp-skin--paper [data-testid$="high-energy-low-pleasantness"] { --paper-icon: url('../assets/emotion-sketch/bolt.svg'); }
.emotion-skins-page .egp-skin--paper [data-testid$="high-energy-high-pleasantness"] { --paper-icon: url('../assets/emotion-sketch/sun.svg'); }
.emotion-skins-page .egp-skin--paper [data-testid$="low-energy-low-pleasantness"] { --paper-icon: url('../assets/emotion-sketch/cloud.svg'); }
.emotion-skins-page .egp-skin--paper [data-testid$="low-energy-high-pleasantness"] { --paper-icon: url('../assets/emotion-sketch/sparkles.svg'); }
.emotion-skins-page .egp-skin--paper .etile { --slider-ink: color-mix(in srgb, var(--c) 85%, #000); }
.emotion-skins-page .egp-skin--paper .htrack { background: var(--sk-inner); height: 14px; border-radius: 8px 6px 9px 7px; }
.emotion-skins-page .egp-skin--paper .hfillbar { background: var(--slider-ink); top: 4px; bottom: 4px; border-radius: 4px 3px 5px 3px; }
.emotion-skins-page .egp-skin--paper .hzones { inset: 2px 0; }
.emotion-skins-page .egp-skin--paper .hzones span:not(:last-child) { border-right: 1px solid color-mix(in srgb, var(--sk-ink) 28%, transparent); }
.emotion-skins-page .egp-skin--paper .hthumb { background: var(--sk-inner); border-color: var(--slider-ink); box-shadow: none; }
.emotion-skins-page .egp-skin--paper .hthumb:hover { box-shadow: none; }


.emotion-skins-page .thumb-options { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 18px; }
.emotion-skins-page .thumb-options > span { margin-right: 6px; font-size: 12px; font-weight: 800; }
.emotion-skins-page .thumb-options p { flex-basis: 100%; margin: 2px 0 0; font-size: 12px; color: rgb(var(--neo-muted)); }
.emotion-skins-page .egp-skin--paper:is(.thumb-style--blob, .thumb-style--island, .thumb-style--face) .hthumb {
  border: 0; box-shadow: none; transition: left 160ms ease, transform 140ms ease;
}
.emotion-skins-page .egp-skin--paper.thumb-style--blob .hthumb {
  background: color-mix(in srgb, var(--c) 15%, #fafbfd);
  border-radius: 43% 57% 48% 52% / 54% 42% 58% 46%;
}
.emotion-skins-page .egp-skin--paper.thumb-style--island .hthumb {
  background: #fafbfd; border-radius: 47% 53% 40% 60% / 57% 45% 55% 43%;
}
.emotion-skins-page .egp-skin--paper.thumb-style--face .hthumb { background: transparent; }
.emotion-skins-page .egp-skin--paper.thumb-style--face .htrack {
  mask-image: radial-gradient(circle at calc(var(--tp, 0%) + 14px) 50%, transparent 12px, black 13px);
}
.emotion-skins-page .egp-skin--paper:is(.thumb-style--blob, .thumb-style--island, .thumb-style--face) .fico { background: var(--sk-ink); }
.emotion-skins-page .egp-skin--paper:is(.thumb-style--blob, .thumb-style--island, .thumb-style--face) .hthumb:hover { transform: translateY(-50%) scale(1.08); }
.emotion-skins-page .egp-skin--paper:is(.thumb-style--blob, .thumb-style--island, .thumb-style--face) .hthumb:active { transform: translateY(-50%) scale(1.04, .96); }
@media (prefers-reduced-motion: reduce) {
  .emotion-skins-page .egp-skin--paper:is(.thumb-style--blob, .thumb-style--island, .thumb-style--face) .hthumb { transition: none; }
}
</style>
