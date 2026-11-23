<template>
  <div class="atd" :class="{ 'is-empty': !modelValue.length, 'is-awake': awake || adding || browsing }">
    <ul v-if="modelValue.length" class="atd__line" :aria-label="`Tagi: ${label}`">
      <li v-for="tag in modelValue" :key="tag" class="atd__tag">
        <span>{{ tag }}</span>
        <button type="button" class="atd__x" :aria-label="`Usuń tag: ${tag}`" @click="remove(tag)">
          <AppIcon name="close" />
        </button>
      </li>
    </ul>

    <!-- dwa przyciski zawsze w tym samym miejscu: na środku, pod chipami -->
    <div class="atd__tools">
      <!-- „+”: od razu pole wpisywania; pasujące istniejące tagi wyskakują pod nim -->
      <button v-if="!adding" type="button" class="atd__btn" :aria-label="`Dodaj tag: ${label}`" title="Dodaj tag" @click="startAdding">
        <AppIcon name="add" />
      </button>
      <span v-else class="atd__entry">
        <input
          ref="inputRef"
          v-model="query"
          class="atd__input"
          type="text"
          maxlength="32"
          autocomplete="off"
          placeholder="tag"
          role="combobox"
          :aria-expanded="visible.length > 0"
          :aria-label="`Nowy tag: ${label}`"
          @input="cursor = -1"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="commit(cursor >= 0 ? visible[cursor] : query)"
          @keydown.escape.prevent="stopAdding"
          @blur="onBlur"
        />
        <!-- mousedown, żeby pole nie zgubiło fokusu -->
        <ul v-if="!browsing && hits.length" class="mg-v2-popover atd__hits" role="listbox" aria-label="Pasujące tagi">
          <li v-for="(tag, index) in hits" :key="tag">
            <button type="button" class="atd__hit" :class="{ 'is-active': index === cursor }" role="option" :aria-selected="index === cursor" @mousedown.prevent="commit(tag)">{{ tag }}</button>
          </li>
        </ul>
      </span>

      <!-- strzałka: baza wcześniejszych tagów tej osi -->
      <button type="button" class="atd__btn atd__btn--more" :class="{ 'is-on': browsing }" :aria-expanded="browsing" :aria-label="`Wcześniejsze tagi: ${label}`" title="Wcześniejsze tagi" @click="browsing = !browsing">
        <AppIcon name="expand_more" />
      </button>
    </div>

    <div v-if="browsing" class="atd__shelf">
      <ul v-if="shelf.length" aria-label="Wcześniejsze tagi">
        <li v-for="(tag, index) in shelf" :key="tag">
          <button type="button" class="atd__pick" :class="{ 'is-active': adding && index === cursor }" @mousedown.prevent="commit(tag)">{{ tag }}</button>
        </li>
      </ul>
      <p v-else>{{ query.trim() ? 'Nie ma takiego tagu — Enter doda nowy' : 'Wszystkie wcześniejsze tagi są już wybrane' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { matchTags, withTag } from '~lab/lab/areaRatingStep'

/**
 * Runda 5b · tagi pola osi bez podpisu: chipy na środku i dwa małe przyciski.
 * „+” zamienia się w pole wpisywania; podczas pisania pod polem wyskakuje do
 * pięciu pasujących istniejących tagów (strzałki + Enter albo klik). Strzałka
 * w dół rozwija bazę wcześniejszych tagów tej osi; klik dopisuje, baza zostaje
 * otwarta, a wpisywany tekst filtruje ją w miejscu.
 *
 * Przyciski stoją zawsze w tym samym miejscu: na środku, na dole pola; chipy
 * rosną nad nimi. Puste pole: przyciski są wyraźnymi chmurami. Gdy tagi już
 * są, przyciski są wyblakłe, dopóki pole osi nie jest pod kursorem (`awake`) —
 * ta sama zasada co strzałki licznika.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string[]
    /** Baza wcześniejszych tagów osi, od najbardziej prawdopodobnych. */
    pool?: string[]
    label: string
    /** Pole osi jest pod kursorem. */
    awake?: boolean
    /** Baza rozwinięta od startu — do zrzutów. */
    startOpen?: boolean
  }>(),
  { pool: () => [], awake: false, startOpen: false }
)
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const adding = ref(false)
const browsing = ref(props.startOpen)
const query = ref('')
const cursor = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)

/** Dymek: tylko gdy coś wpisano. */
const hits = computed(() => (query.value.trim() ? matchTags(props.pool, props.modelValue, query.value, 5) : []))
/** Baza: wszystko, co jeszcze niewybrane; wpisywany tekst ją zawęża. */
const shelf = computed(() => matchTags(props.pool, props.modelValue, adding.value ? query.value : ''))
/** Lista, po której chodzą strzałki klawiatury. */
const visible = computed(() => (browsing.value ? shelf.value : hits.value))

async function startAdding() {
  adding.value = true
  await nextTick()
  inputRef.value?.focus({ preventScroll: true })
}
function stopAdding() {
  adding.value = false
  query.value = ''
  cursor.value = -1
}
function move(delta: number) {
  const count = visible.value.length
  if (!count) return
  cursor.value = cursor.value < 0 ? (delta > 0 ? 0 : count - 1) : (cursor.value + delta + count) % count
}
function commit(raw: string | undefined) {
  const next = withTag(props.modelValue, raw ?? '')
  if (next !== props.modelValue) emit('update:modelValue', next)
  query.value = ''
  cursor.value = -1
  if (adding.value) inputRef.value?.focus({ preventScroll: true })
}
function onBlur() {
  if (query.value.trim()) commit(query.value)
  stopAdding()
}
function remove(tag: string) {
  emit('update:modelValue', props.modelValue.filter(entry => entry !== tag))
}
</script>

<style scoped>
/* Selektory mają po dwie klasy: `.quiet-ritual button / input` biją pojedynczą. */
.atd {
  display: grid;
  gap: var(--mg-space-2);
  min-width: 0;
}
.atd__tools {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.atd .atd__line,
.atd .atd__shelf > ul,
.atd .atd__hits {
  margin: 0;
  padding: 0;
  list-style: none;
}
.atd .atd__line,
.atd .atd__shelf > ul {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.atd .atd__line > li {
  display: inline-flex;
  min-width: 0;
}

/* tag to fakt, nie kontrolka: płaski chip; „×” budzi się pod kursorem */
.atd .atd__tag {
  align-items: center;
  max-width: 100%;
  min-height: 1.75rem;
  padding: 0 var(--mg-space-1) 0 var(--mg-space-3);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}
.atd .atd__tag > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atd .atd__x {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  margin-left: 2px;
  padding: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  opacity: 0.35;
  cursor: pointer;
}
.atd .atd__tag:hover .atd__x,
.atd .atd__x:focus-visible {
  opacity: 1;
}
.atd .atd__x:hover {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-ink);
}
.atd .atd__x :deep(.app-icon) {
  font-size: var(--mg-font-size-sm);
}

/* dwa małe przyciski: chmury w pustym polu i pod kursorem, wyblakłe za chipami */
.atd .atd__btn {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-control);
  cursor: pointer;
  transition:
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    background var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.atd:not(.is-empty):not(.is-awake) .atd__btn {
  background: color-mix(in srgb, var(--mg-color-paper) 55%, transparent);
  box-shadow: none;
  opacity: 0.6;
}
.atd .atd__btn:hover {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.atd .atd__btn:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
  opacity: 1;
}
/* baza otwarta: przycisk wciśnięty, strzałka w górę */
.atd .atd__btn--more.is-on {
  background: var(--mg-color-sky-well);
  box-shadow: var(--mg-shadow-inset-sm);
  translate: none;
}
.atd__btn :deep(.app-icon) {
  color: var(--mg-color-primary);
  font-size: var(--mg-font-size-icon-sm);
  transition: rotate var(--mg-duration-fast) var(--mg-ease-standard);
}
.atd__btn--more.is-on :deep(.app-icon) {
  rotate: 180deg;
}

/* pole w linii: kształt chipa, fokus = papier + krawędź akcentu */
.atd .atd__entry {
  position: relative;
}
.atd .atd__input {
  width: 9rem;
  min-height: 1.75rem;
  padding: 0 var(--mg-space-3);
  border: 1px solid var(--mg-color-focus-edge);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
  outline: none;
}
/* dymek pod polem: pasujące istniejące tagi, jeden pod drugim */
.atd .atd__hits {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 6;
  display: grid;
  gap: 2px;
  min-width: 100%;
  width: max-content;
  max-width: 15rem;
  padding: 6px;
}
.atd .atd__hit {
  display: block;
  width: 100%;
  min-height: 1.75rem;
  padding: 0 var(--mg-space-3);
  border-radius: var(--mg-radius-sm);
  background: transparent;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.atd .atd__hit:hover,
.atd .atd__hit.is-active {
  background: var(--mg-color-sky-well);
}

/* baza wcześniejszych tagów: ciche słowa, klik dopisuje */
.atd .atd__shelf > ul {
  gap: 2px 4px;
}
.atd .atd__pick {
  min-height: 1.625rem;
  padding: 0 var(--mg-space-2);
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
  white-space: nowrap;
  cursor: pointer;
}
.atd .atd__pick:hover,
.atd .atd__pick.is-active {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-ink);
}
.atd .atd__shelf > p {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  text-align: center;
}
</style>
