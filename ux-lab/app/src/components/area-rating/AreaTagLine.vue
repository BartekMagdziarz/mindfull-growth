<template>
  <div class="atl" :class="{ 'atl--center': center, 'atl--tinted': tinted }">
    <ul class="atl__line" :aria-label="`Tagi: ${label}`">
      <li v-for="tag in modelValue" :key="tag" class="atl__tag">
        <span>{{ tag }}</span>
        <button type="button" class="atl__x" :aria-label="`Usuń tag: ${tag}`" @click="remove(tag)">
          <AppIcon name="close" />
        </button>
      </li>
      <li v-if="!open">
        <button type="button" class="atl__add" :aria-label="`Dodaj tag: ${label}`" title="Dodaj tag" @click="start">
          <AppIcon name="add" /><span v-if="!modelValue.length">tag</span>
        </button>
      </li>
      <li v-else>
        <input
          ref="inputRef"
          v-model="query"
          class="atl__input"
          type="text"
          maxlength="32"
          autocomplete="off"
          placeholder="tag"
          :aria-label="`Nowy tag: ${label}`"
          @keydown.enter.prevent="commit(query)"
          @keydown.escape.prevent="close"
          @blur="onBlur"
        />
      </li>
    </ul>
    <!-- podpowiedzi: wcześniejsze tagi tej osi; mousedown, żeby pole nie zgubiło fokusu -->
    <ul v-if="open && matches.length" class="mg-v2-popover atl__hints" aria-label="Wcześniejsze tagi">
      <li v-for="tag in matches" :key="tag">
        <button type="button" class="atl__hint" @mousedown.prevent="commit(tag)">{{ tag }}</button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { withTag } from '~lab/lab/areaRatingStep'

/**
 * Tagi jednej osi jako linia: chipy od razu widoczne, na końcu duch „+”.
 * Klik w ducha zamienia go w pole w tej samej linii; Enter dopisuje, Esc albo
 * wyjście z pustego pola zamyka. Wcześniejsze tagi tej osi stoją w dymku pod
 * linią, więc nic pod spodem się nie przesuwa.
 * Zastępuje zwijaną sekcję ze strzałką (`QuietTagField`).
 */
const props = withDefaults(
  defineProps<{
    modelValue: string[]
    suggestions?: string[]
    /** Czego dotyczą tagi, np. „Ciało · Obciążenie”. */
    label: string
    center?: boolean
    /** Linia leży na barwnym kaflu: welon zamiast papieru. */
    tinted?: boolean
    limit?: number
  }>(),
  { suggestions: () => [], center: false, tinted: false, limit: 4 }
)
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const open = ref(false)
const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const matches = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('pl')
  const pool = props.suggestions.filter(tag => !props.modelValue.includes(tag))
  return (needle ? pool.filter(tag => tag.toLocaleLowerCase('pl').includes(needle)) : pool).slice(0, props.limit)
})

async function start() {
  open.value = true
  await nextTick()
  inputRef.value?.focus()
}
function close() {
  open.value = false
  query.value = ''
}
function commit(raw: string) {
  const next = withTag(props.modelValue, raw)
  if (next !== props.modelValue) emit('update:modelValue', next)
  query.value = ''
  inputRef.value?.focus()
}
function onBlur() {
  if (query.value.trim()) commit(query.value)
  close()
}
function remove(tag: string) {
  emit('update:modelValue', props.modelValue.filter(entry => entry !== tag))
}
</script>

<style scoped>
/* Selektory mają po dwie klasy: `.quiet-ritual button / input` (font: inherit,
   własne tło pola) biją pojedynczą klasę. */
.atl {
  --atl-chip: var(--mg-color-paper);
  position: relative;
  display: grid;
  gap: var(--mg-space-2);
  min-width: 0;
}
.atl--tinted {
  --atl-chip: var(--mg-color-veil-strong);
}
.atl .atl__line,
.atl .atl__hints {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.atl--center .atl__line {
  justify-content: center;
}
/* dymek z wcześniejszymi tagami: nad treścią, bez przesuwania wierszy */
.atl .atl__hints {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  gap: 2px;
  width: max-content;
  max-width: 17rem;
  padding: 6px;
}
.atl--center .atl__hints {
  left: 50%;
  translate: -50% 0;
  justify-content: center;
}
.atl .atl__line > li,
.atl .atl__hints > li {
  display: inline-flex;
  min-width: 0;
}
/* tag to fakt, nie kontrolka: płaski chip; „×” budzi się pod kursorem */
.atl .atl__tag {
  align-items: center;
  max-width: 100%;
  min-height: 1.75rem;
  padding: 0 var(--mg-space-1) 0 var(--mg-space-3);
  border-radius: var(--mg-radius-pill);
  background: var(--atl-chip);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}
.atl .atl__tag > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atl .atl__x {
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
}
.atl .atl__tag:hover .atl__x,
.atl .atl__x:focus-visible {
  opacity: 1;
}
.atl .atl__x:hover {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-ink);
}
.atl .atl__x :deep(.app-icon) {
  font-size: var(--mg-font-size-sm);
}
/* duch: „jeszcze nie” — wyblakła chmura, pełna pod kursorem */
.atl .atl__add {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 1.75rem;
  padding: 0 var(--mg-space-2);
  border-radius: var(--mg-radius-pill);
  background: color-mix(in srgb, var(--atl-chip) 55%, transparent);
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-strong);
  opacity: 0.85;
}
.atl .atl__add > span {
  padding-right: var(--mg-space-1);
}
.atl .atl__add:hover {
  background: var(--atl-chip);
  box-shadow: var(--mg-shadow-control);
  opacity: 1;
}
.atl .atl__add :deep(.app-icon) {
  color: var(--mg-color-primary);
  font-size: var(--mg-font-size-icon-sm);
}
/* pole w linii: kształt chipa, fokus = papier + krawędź akcentu */
.atl .atl__input {
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
.atl .atl__hint {
  min-height: 1.5rem;
  padding: 0 var(--mg-space-2);
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}
.atl .atl__hint:hover {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-ink);
}
</style>
