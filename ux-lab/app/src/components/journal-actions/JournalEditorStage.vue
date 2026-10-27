<template>
  <div class="jes mg-design-v2" :class="[`jes--${variant}`, `jes--switch-${effectiveSwitcher}`, { 'jes--closed': !panelOpen, 'jes--framed': framed }]">
    <!-- Atrapa doku nawigacji: tylko po to, żeby scena miała szerokość produktu. -->
    <aside v-if="framed" class="jes__dock" aria-hidden="true">
      <span v-for="item in DOCK" :key="item" class="jes__dock-icon" :class="{ 'is-active': item === 'edit_note' }">
        <AppIcon :name="item" />
      </span>
    </aside>

    <div class="jes__page">
      <!-- Rząd nagłówka: strzałka powłoki + data; w B i C także akcje. -->
      <header class="jes__top">
        <div class="jes__top-left">
          <button type="button" class="mg-v2-button mg-v2-button--icon jes__back" aria-label="Wróć do dziennika">
            <AppIcon name="chevron_left" />
          </button>
          <button type="button" class="jes__date" aria-label="Zmień datę i godzinę">
            <AppIcon name="wb_sunny" />
            <span>Dziś, 18:31</span>
            <AppIcon name="edit_note" class="jes__date-pen" />
          </button>
        </div>
        <div v-if="variant === 'b'" class="jes__top-actions">
          <button type="button" class="mg-v2-button mg-v2-button--quiet">Anuluj</button>
          <button type="button" class="mg-v2-button mg-v2-button--primary jes__save">Zapisz</button>
        </div>
        <div v-else-if="variant === 'c'" class="jes__top-actions">
          <span class="jes__saved"><AppIcon name="cloud_done" /> Zapisano 18:31</span>
        </div>
        <!-- D: przełącznik sekcji w rzędzie z datą, po prawej. -->
        <div v-else-if="variant === 'd'" class="jes__top-actions">
          <SegmentedSwitch v-model="section" />
        </div>
      </header>

      <div class="jes__grid">
        <!-- Pisanie -->
        <section class="jes__writer mg-v2-surface mg-v2-surface--raised-sm">
          <div class="mg-v2-editor-canvas jes__canvas">
            <input v-model="title" type="text" class="jes__title" placeholder="Tytuł" aria-label="Tytuł" />
            <textarea v-model="body" class="jes__body" placeholder="Pisz swobodnie o tym, co przychodzi Ci do głowy..." aria-label="Treść" />
            <footer v-if="variant === 'a' || variant === 'd'" class="jes__canvas-foot">
              <button v-if="variant === 'a'" type="button" class="mg-v2-button mg-v2-button--quiet">Anuluj</button>
              <span v-else />
              <button type="button" class="mg-v2-button mg-v2-button--primary jes__save">Zapisz</button>
            </footer>
          </div>
        </section>

        <!-- Kolumna środkowa: chevron (obecnie, kapsułka) albo dyski sekcji (rail). -->
        <div class="jes__mid">
          <template v-if="effectiveSwitcher === 'rail'">
            <button
              v-for="item in SECTIONS"
              :key="item.id"
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet jes__rail-disc"
              :class="{ 'is-active': panelOpen && section === item.id }"
              :aria-pressed="panelOpen && section === item.id"
              :aria-label="item.label"
              :title="item.label"
              @click="pickSection(item.id)"
            >
              <AppIcon :name="item.icon" />
            </button>
          </template>
          <button
            v-else
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet jes__chevron"
            :aria-expanded="panelOpen"
            aria-label="Zwiń lub rozwiń panel"
            @click="panelOpen = !panelOpen"
          >
            <AppIcon name="chevron_right" :class="{ 'is-flipped': !panelOpen }" />
          </button>
        </div>

        <!-- Panel boczny -->
        <aside class="jes__aside">
          <div v-if="effectiveSwitcher === 'row'" class="jes__row-switch" aria-label="Sekcje panelu Dziennika">
            <button v-for="item in SECTIONS" :key="item.id" type="button" class="mg-v2-button" :aria-pressed="section === item.id" @click="section = item.id">{{ item.label }}</button>
          </div>

          <template v-if="section === 'emotions'">
            <section class="mg-v2-surface mg-v2-surface--raised-sm jes__card jes__card--emotions" :style="tint">
              <!-- Picker ma własny wiersz tytułu „Emocje”; kapsułka siada w nim po prawej. -->
              <SegmentedSwitch v-if="effectiveSwitcher === 'capsule'" v-model="section" class="jes__segmented--float" />
              <EmotionGroupPicker v-model="selections" v-model:quadrant="quadrant" label="Emocje" />
            </section>
            <div class="jes__tags">
              <section v-for="group in TAGS" :key="group.label" class="mg-v2-surface mg-v2-surface--raised-sm jes__card jes__card--tags">
                <span class="jes__eyebrow">{{ group.label }}</span>
                <div class="jes__chips">
                  <button type="button" class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet" :aria-label="`Dodaj: ${group.label}`"><AppIcon name="add" /></button>
                  <span v-for="chip in (tags ? group.chips : [])" :key="chip" class="mg-v2-pill mg-v2-pill--primary mg-v2-pill--selected">{{ chip }}</span>
                </div>
              </section>
            </div>
          </template>

          <section v-else class="mg-v2-surface mg-v2-surface--raised-sm jes__card jes__card--ai">
            <header class="jes__card-head">
              <h2 class="jes__ai-title">Dziennik z AI</h2>
              <div class="jes__card-head-right">
                <SegmentedSwitch v-if="effectiveSwitcher === 'capsule'" v-model="section" />
                <button type="button" class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm" aria-label="Opcje rozmowy"><AppIcon name="tune" /></button>
              </div>
            </header>

            <!-- A/B/C: „Czat” przeniesiony tu — to drugie wejście do AI, nie akcja edytora. -->
            <div v-if="variant !== 'current'" class="jes__chat-entry">
              <button type="button" class="mg-v2-button jes__chat-button"><AppIcon name="forum" /> Porozmawiaj w osobnym czacie</button>
              <div class="jes__chat-intents" aria-label="Z jaką intencją">
                <button v-for="intent in INTENTS" :key="intent" type="button" class="mg-v2-pill">{{ intent }}</button>
              </div>
            </div>

            <div class="jes__bubble jes__bubble--ai">
              Piszesz, że gdy mówisz o pomysłach, przyspieszasz, a Nina milknie. Co dzieje się w Tobie tuż przed tą ciszą?
              <button type="button" class="mg-v2-button mg-v2-button--quiet jes__insert">Wstaw do wpisu</button>
            </div>
            <div class="jes__bubble jes__bubble--me">Chyba ekscytacja, ale też lęk, że jak nie powiem wszystkiego naraz, to umknie.</div>
            <div class="jes__bubble jes__bubble--ai">Zatrzymajmy się przy tym lęku. Co by się stało, gdyby część pomysłu poczekała do jutra?</div>
            <div class="jes__ai-input">
              <textarea class="mg-v2-field" rows="2" placeholder="Odpowiedz lub zapytaj…" aria-label="Twoja odpowiedź" />
              <button type="button" class="mg-v2-button">Wyślij</button>
            </div>
          </section>
        </aside>
      </div>

      <!-- Obecnie: globalny pasek akcji pod siatką, z kreską. -->
      <div v-if="variant === 'current'" class="jes__actions">
        <button type="button" class="mg-v2-button mg-v2-button--quiet">Czat</button>
        <button type="button" class="mg-v2-button mg-v2-button--quiet">Anuluj</button>
        <button type="button" class="mg-v2-button mg-v2-button--primary jes__save">Zapisz</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import EmotionGroupPicker from '@product/components/emotion/EmotionGroupPicker.vue'
import { getQuadrantTintStyle } from '@product/domain/emotion'
import type { Quadrant } from '@product/domain/emotion'
import type { EmotionGroupSelection } from '@product/domain/emotionGroups'

export type StageVariant = 'current' | 'a' | 'b' | 'c' | 'd'
export type StageSwitcher = 'row' | 'rail' | 'capsule' | 'header'
export type StageSection = 'emotions' | 'ai'

const props = withDefaults(
  defineProps<{
    variant: StageVariant
    switcher: StageSwitcher
    initialSection?: StageSection
    filled?: boolean
    tags?: boolean
    framed?: boolean
  }>(),
  { initialSection: 'emotions', filled: true, tags: true, framed: true },
)

const DOCK = ['wb_sunny', 'calendar_month', 'target', 'edit_note', 'favorite', 'history', 'self_improvement', 'person']
const SECTIONS: { id: StageSection; label: string; icon: string }[] = [
  { id: 'emotions', label: 'Emocje', icon: 'favorite' },
  { id: 'ai', label: 'AI', icon: 'auto_awesome' },
]
const TAGS = [
  { label: 'Kontekst', chips: ['Vibecoding', 'Projekt'] },
  { label: 'Osoby', chips: ['Nina'] },
]
const INTENTS = ['Refleksja', 'Inna perspektywa', 'Bądź proaktywny', 'Pułapki myślenia']

const SAMPLE_TITLE = 'Rozmowa z Niną o projekcie'
const SAMPLE_BODY = Array.from(
  { length: 5 },
  (_, i) =>
    `Akapit ${i + 1}. Dziś wróciłem do rozmowy z Niną o tym, co właściwie chcę zbudować. Zauważyłem, że kiedy mówię o pomysłach, mówię szybciej i głośniej, a ona wtedy milknie. Chciałbym nauczyć się robić pauzy.`,
).join('\n\n')

const title = ref(props.filled ? SAMPLE_TITLE : '')
const body = ref(props.filled ? SAMPLE_BODY : '')
watch(
  () => props.filled,
  filled => {
    title.value = filled ? SAMPLE_TITLE : ''
    body.value = filled ? SAMPLE_BODY : ''
  },
)

const section = ref<StageSection>(props.initialSection)
watch(
  () => props.initialSection,
  value => {
    section.value = value
    panelOpen.value = true
  },
)
const panelOpen = ref(true)
const selections = ref<EmotionGroupSelection[]>([])
const quadrant = ref<Quadrant | null>(null)
const tint = computed(() => getQuadrantTintStyle(quadrant.value))

/** Stan obecny ma tylko rząd przycisków — inne przełączniki dotyczą propozycji. */
const effectiveSwitcher = computed<StageSwitcher>(() => {
  if (props.variant === 'current') return 'row'
  if (props.variant === 'd') return 'header'
  return props.switcher
})

function pickSection(id: StageSection) {
  if (panelOpen.value && section.value === id) {
    panelOpen.value = false
    return
  }
  section.value = id
  panelOpen.value = true
}

/** Kapsułka `mg-v2-segmented` w rzędzie tytułu karty — wzorzec przełącznika ćwiartek. */
const SegmentedSwitch = defineComponent({
  props: { modelValue: { type: String, required: true } },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () =>
      h(
        'div',
        { class: 'mg-v2-segmented jes__segmented', role: 'tablist', 'aria-label': 'Sekcje panelu' },
        SECTIONS.map(item =>
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': p.modelValue === item.id,
              onClick: () => emit('update:modelValue', item.id),
            },
            item.label,
          ),
        ),
      )
  },
})
</script>

<style scoped>
/* Rama produktu przy 1512 × 982: main ma padding-left 106 px, kontener 1280 px
   wyśrodkowany, px-4 → treść 1248 px. Siatka 3fr auto 2fr, wysokość 78vh = 766 px. */
.jes {
  --jes-grid-h: 766px;
  position: relative;
  min-width: 0;
  background: transparent;
  color: var(--mg-color-ink);
}
.jes--framed {
  min-height: 982px;
  padding-left: 106px;
}
.jes__dock {
  position: absolute;
  top: 50%;
  left: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mg-space-4);
  width: 72px;
  padding: var(--mg-space-5) 0;
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-surface);
  box-shadow: var(--mg-shadow-raised-sm);
  transform: translateY(-50%);
}
.jes__dock-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--mg-radius-organic-a);
  color: var(--mg-color-primary);
}
.jes__dock-icon.is-active {
  color: var(--mg-color-on-primary);
  background: var(--mg-color-primary-fill);
}
.jes__page {
  width: 1280px;
  max-width: 100%;
  margin: 0 auto;
  padding: var(--mg-space-6) var(--mg-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-4);
}

/* Nagłówek */
.jes__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-3);
  min-height: 2.25rem;
}
.jes__top-left {
  display: flex;
  align-items: center;
  gap: var(--mg-space-4);
}
.jes__back {
  color: var(--mg-color-primary);
  background: var(--mg-color-surface);
}
.jes__date {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-2);
  border: 0;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.jes__date:hover {
  color: var(--mg-color-primary);
}
.jes__date-pen {
  opacity: 0.6;
}
.jes__top-actions {
  display: flex;
  align-items: center;
  gap: var(--mg-space-3);
}
.jes__saved {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-2);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.jes__save {
  min-width: 140px;
}

/* Siatka */
.jes__grid {
  display: grid;
  grid-template-columns: 3fr auto 2fr;
  gap: var(--mg-space-2);
  align-items: stretch;
  height: var(--jes-grid-h);
  min-height: 0;
  transition: grid-template-columns 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
.jes--closed .jes__grid {
  grid-template-columns: 1fr auto 0fr;
}
/* B i C: żadnej stałej wysokości — strona przewija się jako całość. */
.jes--b .jes__grid,
.jes--c .jes__grid {
  height: auto;
}
.jes__writer {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--mg-space-3);
}
.jes--b .jes__writer,
.jes--c .jes__writer {
  min-height: 640px;
}
.jes__canvas {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--mg-space-4);
  min-height: 0;
  padding: var(--mg-space-5) var(--mg-space-6);
}
.jes__title {
  width: 100%;
  font-size: var(--mg-font-size-md);
  font-weight: 600;
}
.jes__body {
  flex: 1;
  width: 100%;
  min-height: 240px;
  resize: none;
  font-size: var(--mg-font-size-md);
  line-height: 1.65;
}
.jes__title::placeholder,
.jes__body::placeholder {
  color: var(--mg-color-muted);
}
.jes__title:focus,
.jes__body:focus {
  outline: none;
}
/* A: stopka wewnątrz płótna — „Anuluj” zaczyna się na krawędzi treści. */
.jes__canvas-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-3);
  margin-top: auto;
  padding-top: var(--mg-space-2);
}
.jes__canvas-foot > .mg-v2-button--quiet {
  margin-left: calc(-1 * var(--mg-space-4));
}

/* Kolumna środkowa */
.jes__mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--mg-space-3);
}
.jes__chevron {
  width: 2rem;
  min-height: 2rem;
  color: var(--mg-color-muted);
}
.jes__chevron .is-flipped {
  transform: rotate(180deg);
}
.jes__rail-disc {
  width: 2.5rem;
  min-height: 2.5rem;
  color: var(--mg-color-muted);
  border-radius: var(--mg-radius-organic-b);
}
.jes__rail-disc:nth-child(2) {
  border-radius: var(--mg-radius-organic-c);
}
.jes__rail-disc.is-active {
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
}

/* Panel boczny */
.jes__aside {
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-4);
  min-width: 0;
  min-height: 0;
  padding: var(--mg-space-4) var(--mg-space-4) var(--mg-space-4) var(--mg-space-5);
  margin-right: calc(-1 * var(--mg-space-4));
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  transition:
    opacity 500ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
.jes__aside::-webkit-scrollbar {
  display: none;
}
.jes--closed .jes__aside {
  opacity: 0;
  transform: translateX(1rem);
  pointer-events: none;
}
/* A i D: karty znikają we mgle zamiast kończyć się kreską. */
.jes--a .jes__aside,
.jes--d .jes__aside {
  mask-image: linear-gradient(to bottom, black calc(100% - 36px), transparent);
}
/* B i C: panel nie przewija się wewnętrznie. */
.jes--b .jes__aside,
.jes--c .jes__aside {
  overflow: visible;
}
.jes__row-switch {
  display: flex;
  gap: var(--mg-space-2);
}
.jes__card {
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-3);
  padding: var(--mg-space-4) var(--mg-space-5);
}
.jes__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-3);
  min-height: 1.75rem;
}
.jes__card-head-right {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
}
.jes__eyebrow {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.jes__segmented {
  width: 9.5rem;
}
.jes__segmented--float {
  position: absolute;
  top: var(--mg-space-3);
  right: var(--mg-space-5);
  z-index: 1;
}
.jes__tags {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--mg-space-4);
}
.jes__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--mg-space-2);
  padding-top: var(--mg-space-1);
}

/* Panel AI — replika kształtu ReflectionCompanionPanel (dymki w tonie pola). */
.jes__ai-title {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: 800;
}
.jes__chat-entry {
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-2);
  padding-bottom: var(--mg-space-2);
  border-bottom: 1px solid var(--mg-color-border-subtle);
}
.jes__chat-button {
  align-self: flex-start;
}
.jes__chat-intents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}
.jes__chat-intents .mg-v2-pill {
  cursor: pointer;
}
.jes__bubble {
  position: relative;
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
  font-size: var(--mg-font-size-sm);
  line-height: 1.55;
}
.jes__bubble--me {
  margin-left: var(--mg-space-6);
  border-left: 2px solid color-mix(in srgb, var(--mg-color-primary) 26%, transparent);
  background: var(--mg-color-paper);
}
.jes__insert {
  display: block;
  margin: var(--mg-space-2) 0 0 calc(-1 * var(--mg-space-4));
}
.jes__ai-input {
  display: flex;
  align-items: flex-end;
  gap: var(--mg-space-2);
  margin-top: auto;
}
.jes__ai-input textarea {
  resize: none;
}

/* Obecnie: pasek pod siatką */
.jes__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--mg-space-3);
  padding: var(--mg-space-4);
  border-top: 1px solid var(--mg-color-border);
}
</style>
