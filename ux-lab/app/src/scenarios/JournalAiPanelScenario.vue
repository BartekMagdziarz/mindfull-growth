<template>
  <section class="scenario-page concept-page jap" :class="{ 'jap--standalone': standalone }">
    <template v-if="!standalone">
      <header class="concept-heading">
        <div>
          <span class="lab-eyebrow">Eksperyment · Dziennik · panel „Dziennik z AI” · runda 1 · 03.11.2026</span>
          <h1>Osobny czat, propozycje tematów i wcześniejsza rozmowa — gdzie ich miejsce</h1>
          <p>
            W trakcie rozmowy o wpisie panel pokazuje trzy elementy, które nie czytają się jak część czatu: chmurę
            „Porozmawiaj w osobnym czacie” nad rozmową (bez nazwanej różnicy wobec rozmowy, nad którą stoi), cichy tekst
            „Propozycje tematów” między ostatnią wiadomością a polem oraz „Wcześniejsza rozmowa · 1 wiadomości” na dole,
            choć chronologicznie jest wcześniej. Scena to replika panelu w szerokości produktu (460 px, wysokość rozmowy
            540 px) obok karty pisania; cztery propozycje i stan obecny na tych samych danych.
          </p>
        </div>
        <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 1</span>
      </header>

      <section class="jap__block">
        <header class="jap__block-head">
          <span class="lab-eyebrow">01 · Stan obecny · zrzut użytkownika, 03.11.2026, panel w rozmowie</span>
          <h2>Trzy luźne elementy między wiadomościami a polem odpowiedzi</h2>
        </header>
        <div class="jap__current">
          <figure class="jap__shot">
            <img src="/research/current/journal/ai-panel-2026-11-03.png" alt="Panel Dziennik z AI: chmura „Porozmawiaj w osobnym czacie” pod tytułem, wiadomość AI, pod nią tekst „Propozycje tematów”, rozwijane „Wcześniejsza rozmowa · 1 wiadomości” i pole odpowiedzi" />
            <figcaption>
              Panel w stanie po „Rozpocznij od aktualnych danych”: jedna zarchiwizowana wiadomość, nowe zaproszenie do tematu.
              Przycisk osobnego czatu ma najmocniejszy kształt w panelu, choć jest drugim wejściem do tej samej rozmowy;
              „Propozycje tematów” to <code>qr-quiet</code> bez tła; archiwum to natywne <code>&lt;details&gt;</code>
              z trójkątem (<code>ReflectionCompanionPanel.vue:214–289</code>).
            </figcaption>
          </figure>
          <ol class="jap__problems">
            <li><strong>Dwa wejścia do AI w jednym miejscu.</strong> Panel JEST rozmową o wpisie. Osobny czat różni się tylko intencją, pełnym ekranem i ręcznym „Zapisz rozmowę” — żadna z tych różnic nie jest nazwana przy przycisku.</li>
            <li><strong>Przycisk, który wygląda jak nagłówek.</strong> „Propozycje tematów” stoi samotnie między logiem a archiwum, bez tła i ikony; dopiero klik zdradza, że to przełącznik.</li>
            <li><strong>Archiwum pod najnowszą wiadomością.</strong> Czat czyta się z góry na dół; wcześniejsza rozmowa pod bieżącą łamie chronologię. Do tego „1 wiadomości”.</li>
            <li><strong>Jedna przewijana kolumna na wszystko.</strong> Wejście, log, przełącznik i archiwum przewijają się razem, więc stały jest tylko nagłówek i pole.</li>
          </ol>
        </div>
      </section>

      <section class="jap__block">
        <header class="jap__block-head">
          <span class="lab-eyebrow">02 · Propozycje · te same dane, inne miejsca</span>
          <h2>Nagłówek · log · kompozytor — i nic luźnego pomiędzy</h2>
        </header>
        <div class="jap__toolbar neo-card" aria-label="Ustawienia sceny">
          <label>Wariant
            <select v-model="variant">
              <option v-for="item in variants" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </label>
          <label>Stan
            <select v-model="state">
              <option v-for="item in states" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </label>
          <label>Wcześniejsza rozmowa
            <select v-model.number="archivedCount" :disabled="state !== 'reset'">
              <option :value="1">1 wiadomość</option>
              <option :value="3">3 wiadomości</option>
              <option :value="6">6 wiadomości</option>
            </select>
          </label>
          <label>Osobny czat
            <select v-model="separate">
              <option v-for="item in separateChatChoices" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </label>
          <label class="jap__check"><input v-model="compare" type="checkbox" /> Wszystkie warianty obok siebie</label>
          <a class="jap__preview" :href="previewHref" target="_blank" rel="noopener">Podgląd 1:1 bez pasków Laba ↗</a>
        </div>
        <p class="jap__variant-note">{{ activeVariant.note }}</p>

        <div v-if="compare" class="jap__compare mg-design-v2">
          <div v-for="item in variants" :key="item.id" class="jap__compare-cell">
            <span class="lab-eyebrow">{{ item.short }}</span>
            <JournalAiPanelReplica :key="`${item.id}-${state}-${archivedCount}-${separate}`" :variant="item.id" :state="state" :archived-count="archivedCount" :separate="separate" />
          </div>
        </div>
        <div v-else class="jap__stage">
          <JournalEditorFrame :variant="variant" :state="state" :archived-count="archivedCount" :separate="separate" />
        </div>
      </section>

      <section class="jap__block">
        <header class="jap__block-head">
          <span class="lab-eyebrow">03 · Do decyzji</span>
          <h2>Chronologia w logu, „co dalej” przy polu, jedno wejście do AI</h2>
        </header>
        <ol class="jap__decisions">
          <li v-for="item in decisions" :key="item.id">
            <span class="jap__decision-id">{{ item.id }}</span>
            <div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div>
          </li>
        </ol>
      </section>
    </template>

    <div v-else class="jap__standalone">
      <JournalEditorFrame :variant="variant" :state="state" :archived-count="archivedCount" :separate="separate" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import JournalAiPanelReplica from '~lab/components/journal-ai/JournalAiPanelReplica.vue'
import JournalEditorFrame from '~lab/components/journal-ai/JournalEditorFrame.vue'
import {
  decisions,
  separateChatChoices,
  states,
  variants,
  type PanelState,
  type PanelVariant,
  type SeparateChatChoice,
} from '~lab/lab/journalAiPanel'

const route = useRoute()
const router = useRouter()
const standalone = computed(() => Boolean(route.meta.standalone))

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const raw = route.query[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  return allowed.includes(value as T) ? (value as T) : fallback
}
const variant = ref<PanelVariant>(read('variant', variants.map(v => v.id), 'b'))
const state = ref<PanelState>(read('state', states.map(s => s.id), 'reset'))
const separate = ref<SeparateChatChoice>(read('chat', separateChatChoices.map(c => c.id), 'auto'))
const archivedCount = ref<number>([1, 3, 6].includes(Number(route.query.archived)) ? Number(route.query.archived) : 1)
const compare = ref(route.query.compare === '1')

const activeVariant = computed(() => variants.find(v => v.id === variant.value) ?? variants[0]!)

const query = computed(() => {
  const q: Record<string, string> = { variant: variant.value, state: state.value }
  if (separate.value !== 'auto') q.chat = separate.value
  if (archivedCount.value !== 1) q.archived = String(archivedCount.value)
  if (compare.value) q.compare = '1'
  return q
})
const previewHref = computed(() => `/preview/journal-ai-panel?${new URLSearchParams(query.value)}`)
watch(query, q => router.replace({ query: q }))

</script>

<style scoped>
.jap .concept-heading p code,
.jap figcaption code { font-size: 0.9em; }
.jap__block { margin-top: 34px; }
.jap__block-head { margin-bottom: 14px; }
.jap__block-head h2 { margin: 4px 0 0; font-size: 20px; }
.jap__current { display: grid; grid-template-columns: 474px minmax(0, 1fr); gap: 28px; align-items: start; }
.jap__shot { margin: 0; }
.jap__shot img { display: block; width: 100%; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); }
.jap__shot figcaption { margin-top: 10px; color: var(--mg-color-muted); font-size: 13px; line-height: 1.55; }
.jap__problems { display: grid; gap: 12px; margin: 6px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.55; color: var(--mg-color-muted); }
.jap__problems strong { color: var(--mg-color-ink); }
.jap__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px; padding: 12px 18px; margin-bottom: 10px; font-size: 12px; }
.jap__toolbar label { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.jap__toolbar select { max-width: 320px; padding: 4px 8px; border: 1px solid var(--mg-color-border); border-radius: 10px; background: var(--mg-color-paper); font-weight: 600; }
.jap__check { font-weight: 600 !important; }
.jap__preview { margin-left: auto; color: var(--mg-color-primary-strong); font-weight: 700; text-decoration: none; }
.jap__variant-note { margin: 0 0 14px; max-width: 980px; color: var(--mg-color-muted); font-size: 13px; line-height: 1.55; }
.jap__stage { padding: 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: rgb(var(--color-background)); overflow: auto; }
.jap__compare { display: grid; grid-template-columns: repeat(auto-fill, minmax(460px, 1fr)); gap: 22px; padding: 16px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: rgb(var(--color-background)); }
.jap__compare-cell { display: grid; gap: 8px; justify-items: start; }
.jap__decisions { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.jap__decisions li { display: grid; grid-template-columns: 42px 1fr; gap: 10px; align-items: start; }
.jap__decisions strong { font-size: 13px; }
.jap__decisions p { margin: 2px 0 0; max-width: 900px; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.jap__decision-id { display: inline-grid; place-items: center; min-height: 26px; border-radius: 999px; background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font-size: 11px; font-weight: 800; }
.jap--standalone { width: auto; margin: 0; }
.jap__standalone { min-height: 982px; padding: var(--mg-space-6) 0 var(--mg-space-6) 106px; }
.jap__stage, .jap__compare { min-width: 0; }

</style>
