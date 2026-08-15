<template>
  <section class="journal-workspace" :class="{ 'journal-workspace--collapsed': sidebarCollapsed }">
    <label class="journal-writing">
      <header>
        <span><AppIcon name="book_2" /><span><small>{{ kind === 'week' ? 'WPIS TYGODNIOWY' : 'WPIS MIESIĘCZNY' }}</small><strong>{{ periodTitle }}</strong></span></span>
        <em>{{ wordCount }} słów</em>
      </header>
      <textarea :value="modelValue" rows="11" :placeholder="kind === 'week' ? 'Ten tydzień pokazał mi…' : 'Ten miesiąc pokazał mi…'" @input="updateEntry" />
      <footer>
        <span>Szybko dodaj</span>
        <button v-for="tag in contextTags" :key="tag.label" type="button" @click.prevent="insertText(tag.text)"><AppIcon :name="tag.icon" />{{ tag.label }}</button>
      </footer>
    </label>

    <aside v-if="!sidebarCollapsed" class="journal-context" aria-label="Kontekst wpisu">
      <header><span><small>KONTEKST WPISU</small><strong>Tylko gdy go potrzebujesz</strong></span><button type="button" aria-label="Zwiń kontekst" @click="sidebarCollapsed = true"><AppIcon name="right_panel_close" /></button></header>

      <article class="journal-context-card journal-context-card--ai">
        <button type="button" class="journal-context-card__head" :aria-expanded="summaryOpen" @click="summaryOpen = !summaryOpen"><span><AppIcon name="auto_awesome" /><span><strong>Podsumowanie AI</strong><small>Generowane na żądanie</small></span></span><AppIcon name="expand_more" /></button>
        <div v-if="summaryOpen" class="journal-context-card__body">
          <p v-if="aiSummary">{{ aiSummary }}</p>
          <p v-else class="journal-placeholder">AI zobaczy wpis oraz zapisane oceny i kotwice. Nic nie dopisze automatycznie.</p>
          <span><button v-if="!aiSummary" type="button" class="journal-primary" @click="generateSummary"><AppIcon name="auto_awesome" />Wygeneruj</button><button v-else type="button" @click="aiSummary = ''"><AppIcon name="delete" />Wyczyść</button></span>
        </div>
      </article>

      <article class="journal-context-card journal-context-card--ai">
        <button type="button" class="journal-context-card__head" :aria-expanded="promptsOpen" @click="promptsOpen = !promptsOpen"><span><AppIcon name="question_exchange" /><span><strong>Pytania AI</strong><small>Kliknij, by dodać do wpisu</small></span></span><AppIcon name="expand_more" /></button>
        <div v-if="promptsOpen" class="journal-context-card__body">
          <button v-for="prompt in aiPrompts" :key="prompt" type="button" class="journal-prompt" @click="insertText(`\n${prompt}\n`)">{{ prompt }}<AppIcon name="add" /></button>
          <button type="button" class="journal-primary" @click="generatePrompts"><AppIcon name="refresh" />{{ aiPrompts.length ? 'Inne pytania' : 'Wygeneruj pytania' }}</button>
        </div>
      </article>

      <article class="journal-context-card">
        <button type="button" class="journal-context-card__head" :aria-expanded="ratingsOpen" @click="ratingsOpen = !ratingsOpen"><span><AppIcon name="analytics" /><span><strong>Oceny</strong><small>{{ ratingGroups.length }} sygnałów</small></span></span><AppIcon name="expand_more" /></button>
        <div v-if="ratingsOpen" class="journal-context-card__body journal-ratings">
          <span v-for="rating in ratingGroups" :key="rating.label"><small>{{ rating.label }}</small><i><b :style="{ width: `${rating.value * 20}%` }" /></i><strong>{{ rating.value }}</strong></span>
        </div>
      </article>

      <article v-if="kind === 'week'" class="journal-context-card">
        <button type="button" class="journal-context-card__head" :aria-expanded="emotionOpen" @click="emotionOpen = !emotionOpen"><span><AppIcon name="mood" /><span><strong>Emocje tygodnia</strong><small>{{ emotionSnapshot.total }} zapisów · {{ emotionSnapshot.pleasant }}% przyjemnych</small></span></span><AppIcon name="expand_more" /></button>
        <div v-if="emotionOpen" class="journal-context-card__body journal-emotions">
          <span v-for="quadrant in emotionSnapshot.quadrants" :key="quadrant.label"><i :class="quadrant.tone" /><small>{{ quadrant.label }}</small><strong>{{ quadrant.value }}</strong></span>
          <p>Najczęściej: <strong>{{ emotionSnapshot.top.join(' · ') }}</strong></p>
        </div>
      </article>

      <article class="journal-context-card">
        <button type="button" class="journal-context-card__head" :aria-expanded="anchorsOpen" @click="anchorsOpen = !anchorsOpen"><span><AppIcon name="anchor" /><span><strong>Kotwice</strong><small>{{ filledAnchors.length }} zapisanych</small></span></span><AppIcon name="expand_more" /></button>
        <div v-if="anchorsOpen" class="journal-context-card__body journal-anchors"><p v-for="anchor in filledAnchors" :key="anchor">{{ anchor }}</p><p v-if="!filledAnchors.length" class="journal-placeholder">Nie zapisano jeszcze odpowiedzi.</p></div>
      </article>
    </aside>

    <button v-else type="button" class="journal-context-restore" @click="sidebarCollapsed = false"><AppIcon name="left_panel_open" /><span>Kontekst</span></button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'

interface RatingSummary { label: string; value: number }
interface EmotionSnapshot { total: number; pleasant: number; quadrants: Array<{ label: string; value: number; tone: string }>; top: string[] }

const props = defineProps<{
  kind: 'week' | 'month'
  periodTitle: string
  modelValue: string
  ratingGroups: RatingSummary[]
  anchors: string[]
  emotionSnapshot: EmotionSnapshot
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sidebarCollapsed = ref(false)
const summaryOpen = ref(true)
const promptsOpen = ref(false)
const ratingsOpen = ref(false)
const emotionOpen = ref(false)
const anchorsOpen = ref(false)
const aiSummary = ref('')
const aiPrompts = ref<string[]>([])
const promptVariant = ref(0)
const contextTags = [
  { label: 'Wdzięczność', icon: 'favorite', text: '\nWdzięczność: ' },
  { label: 'Moment', icon: 'flare', text: '\nKluczowy moment: ' },
  { label: 'Wyzwanie', icon: 'mountain_flag', text: '\nWyzwanie: ' },
  { label: 'Lekcja', icon: 'school', text: '\nLekcja: ' },
  { label: 'Intencja', icon: 'north_star', text: '\nIntencja: ' },
]

const wordCount = computed(() => props.modelValue.trim() ? props.modelValue.trim().split(/\s+/).length : 0)
const filledAnchors = computed(() => props.anchors.map(value => value?.trim()).filter(Boolean))

function updateEntry(event: Event) { emit('update:modelValue', (event.target as HTMLTextAreaElement).value) }
function insertText(text: string) { emit('update:modelValue', `${props.modelValue}${text}`) }
function generateSummary() {
  aiSummary.value = props.kind === 'week'
    ? 'Najmocniejszym wzorcem był świadomy wysiłek przy zachowaniu stabilnego stanu. Warto chronić warunki, które to umożliwiły.'
    : 'Miesiąc przesunął najważniejsze kierunki, ale nierówno między tygodniami. Najwięcej daje ograniczenie liczby równoległych zobowiązań.'
}
function generatePrompts() {
  const variants = props.kind === 'week'
    ? [
        ['Co sprawiło, że dobry dzień był dobry?', 'Gdzie wysiłek był większy niż efekt?', 'Co warto ochronić w następnym tygodniu?'],
        ['Która decyzja zdjęła najwięcej napięcia?', 'Co zostało niewidoczne w samych danych?', 'Jaki mały eksperyment chcesz powtórzyć?'],
      ]
    : [
        ['Który tydzień najlepiej wyjaśnia cały miesiąc?', 'Co przesunęło kierunek mimo słabszego wyniku?', 'Z czego świadomie rezygnujesz w kolejnym miesiącu?'],
        ['Który wzorzec powtarzał się między tygodniami?', 'Gdzie target pomógł, a gdzie przeszkodził?', 'Jaką zasadę chcesz przenieść dalej?'],
      ]
  aiPrompts.value = variants[promptVariant.value % variants.length]
  promptVariant.value += 1
}
</script>

<style scoped>
.journal-workspace { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(250px, .7fr); gap: 14px; max-width: 930px; margin: 0 auto; }.journal-workspace--collapsed { grid-template-columns: minmax(0, 1fr) 54px; }
.journal-writing { display: grid; grid-template-rows: auto minmax(230px, 1fr) auto; gap: 10px; padding: 16px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 21px 17px 22px 18px; background: var(--ritual-paper); }.journal-writing > header { display: flex; justify-content: space-between; gap: 10px; }.journal-writing > header > span { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; align-items: center; }.journal-writing > header .material-symbols-outlined { grid-row: 1 / 3; color: var(--ritual-strong); font-size: 23px; }.journal-writing > header span span { display: grid; gap: 1px; }.journal-writing header small { color: var(--ritual-blue); font-size: 6px; font-weight: 900; letter-spacing: .12em; }.journal-writing header strong { font-size: 10px; }.journal-writing header em { color: var(--ritual-muted); font-size: 7px; font-style: normal; }.journal-writing textarea { width: 100%; min-height: 230px; padding: 14px; resize: vertical; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 16px 13px 17px 14px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .58); font-size: 9px; line-height: 1.65; outline: none; }.journal-writing footer { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }.journal-writing footer > span { margin-right: 3px; color: var(--ritual-muted); font-size: 6px; font-weight: 850; }.journal-writing footer button { display: flex; align-items: center; gap: 4px; min-height: 25px; padding: 0 7px; border: 0; border-radius: 11px 9px 12px 10px; color: var(--ritual-muted); background: rgb(var(--sky-100) / .58); font-size: 6px; font-weight: 800; cursor: pointer; }.journal-writing footer .material-symbols-outlined { color: var(--ritual-strong); font-size: 12px; }
.journal-context { display: grid; align-content: start; gap: 7px; padding: 13px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 19px 15px 20px 16px; background: rgb(var(--color-primary-soft) / .32); }.journal-context > header { display: flex; justify-content: space-between; gap: 8px; padding: 2px 2px 6px; }.journal-context > header > span { display: grid; gap: 1px; }.journal-context > header small { color: var(--ritual-blue); font-size: 6px; font-weight: 900; letter-spacing: .12em; }.journal-context > header strong { font-size: 8px; }.journal-context > header button, .journal-context-restore { display: grid; place-items: center; width: 27px; height: 27px; padding: 0; border: 0; border-radius: 50%; color: var(--ritual-blue); background: rgb(var(--sky-100) / .65); cursor: pointer; }.journal-context > header .material-symbols-outlined { font-size: 15px; }
.journal-context-card { display: grid; border: 1px solid rgb(var(--neo-border) / .1); border-radius: 14px 11px 15px 12px; background: rgb(var(--sky-50) / .52); }.journal-context-card__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px; border: 0; color: var(--ritual-ink); background: transparent; text-align: left; cursor: pointer; }.journal-context-card__head > span { display: grid; grid-template-columns: auto 1fr; gap: 6px; align-items: center; }.journal-context-card__head > span > .material-symbols-outlined { color: var(--ritual-strong); font-size: 17px; }.journal-context-card__head span span { display: grid; gap: 1px; }.journal-context-card__head strong { font-size: 7.5px; }.journal-context-card__head small { color: var(--ritual-muted); font-size: 6px; }.journal-context-card__head > .material-symbols-outlined { color: var(--ritual-blue); font-size: 14px; }.journal-context-card__body { display: grid; gap: 7px; padding: 0 9px 9px; }.journal-context-card__body p { margin: 0; color: var(--ritual-ink); font-size: 7px; line-height: 1.5; }.journal-context-card__body > span { display: flex; gap: 5px; }.journal-context-card__body button { display: flex; align-items: center; gap: 4px; width: max-content; padding: 5px 7px; border: 0; border-radius: 9px; color: var(--ritual-muted); background: rgb(var(--sky-100) / .65); font-size: 6px; font-weight: 850; cursor: pointer; }.journal-context-card__body .journal-primary { color: var(--ritual-strong); background: rgb(var(--sky-200) / .78); }.journal-context-card__body .material-symbols-outlined { font-size: 12px; }.journal-placeholder { color: var(--ritual-muted) !important; }
.journal-context-card__body .journal-prompt { justify-content: space-between; width: 100%; color: var(--ritual-ink); background: rgb(var(--sky-50) / .66); text-align: left; line-height: 1.35; }.journal-ratings span { display: grid; grid-template-columns: 72px 1fr 15px; align-items: center; gap: 5px; }.journal-ratings small { color: var(--ritual-muted); font-size: 6px; }.journal-ratings i { height: 5px; overflow: hidden; border-radius: 6px; background: rgb(var(--sky-100)); }.journal-ratings i b { display: block; height: 100%; border-radius: inherit; background: rgb(var(--sky-500) / .75); }.journal-ratings strong { font-size: 6px; }.journal-emotions { grid-template-columns: repeat(2, 1fr); }.journal-emotions > span { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 4px; padding: 5px; border-radius: 8px; background: rgb(var(--sky-50) / .58); }.journal-emotions > span i { width: 6px; height: 6px; border-radius: 50%; }.journal-emotions > span i.rose { background: rgb(var(--rose-400)); }.journal-emotions > span i.sky { background: rgb(var(--sky-500)); }.journal-emotions > span i.sand { background: #d3b36d; }.journal-emotions > span i.lilac { background: #9d8fc4; }.journal-emotions small { color: var(--ritual-muted); font-size: 5.5px; }.journal-emotions strong { font-size: 6px; }.journal-emotions > p { grid-column: 1 / -1; }.journal-anchors p { padding: 6px; border-radius: 8px; background: rgb(var(--sky-50) / .58); }.journal-context-restore { align-self: start; display: flex; flex-direction: column; width: 45px; height: 78px; gap: 4px; border-radius: 15px; }.journal-context-restore span { font-size: 6px; writing-mode: vertical-rl; }
</style>
