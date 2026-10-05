<template>
  <div class="qr-tagfield" :class="{ 'qr-tagfield--open': open }">
    <div class="qr-tagfield-row">
      <ul v-if="modelValue.length" class="qr-tagfield-list" :aria-label="`Tagi: ${label}`">
        <li v-for="tag in modelValue" :key="tag">
          <span>{{ tag }}</span>
          <button v-if="open" type="button" :aria-label="`Usuń tag: ${tag}`" @click="remove(tag)">
            <AppIcon name="close" />
          </button>
        </li>
      </ul>
      <button
        type="button"
        class="qr-icon qr-tagfield-toggle"
        :aria-expanded="open"
        :aria-label="`Tagi: ${label}`"
        :title="open ? 'Zwiń tagi' : 'Tagi'"
        @click="toggle"
      >
        <AppIcon name="expand_more" />
      </button>
    </div>
    <div v-if="open" class="qr-tagfield-editor">
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        maxlength="32"
        autocomplete="off"
        :aria-label="`Nowy tag: ${label}`"
        placeholder="Szukaj lub dodaj…"
        @keydown.enter.prevent="commit(query)"
        @keydown.escape.prevent="close"
      />
      <ul v-if="creatable || matches.length" class="qr-tagfield-suggestions" aria-label="Wcześniejsze tagi">
        <li v-if="creatable">
          <button type="button" class="qr-quiet qr-tagfield-create" @click="commit(query)">
            <AppIcon name="add" />{{ query.trim() }}
          </button>
        </li>
        <li v-for="tag in matches" :key="tag">
          <button type="button" class="qr-quiet" @click="commit(tag)">{{ tag }}</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { addTag } from './quietRitualModel'

/**
 * Free tags for one rating axis. Closed = the chosen tags as quiet pills plus a
 * chevron; open = search box that filters the user's earlier tags (re-use) and
 * offers to create the typed one. Nothing here knows how tags are stored.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string[]
    /** Earlier tags, most relevant first (already de-duplicated by the caller). */
    suggestions?: string[]
    label: string
    /** How many suggestions to show when the search box is empty. */
    limit?: number
  }>(),
  { suggestions: () => [], limit: 6 },
)
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const open = ref(false)
const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const fold = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')
const chosen = computed(() => new Set(props.modelValue.map(fold)))
const matches = computed(() => {
  const needle = fold(query.value)
  const pool = props.suggestions.filter(tag => !chosen.value.has(fold(tag)))
  const hits = needle ? pool.filter(tag => fold(tag).includes(needle)) : pool
  return hits.slice(0, needle ? 8 : props.limit)
})
/** Offer "create" unless the typed text already exists as a tag or a suggestion. */
const creatable = computed(() => {
  const needle = fold(query.value)
  if (!needle) return false
  if (chosen.value.has(needle)) return false
  return !matches.value.some(tag => fold(tag) === needle)
})

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    inputRef.value?.focus()
  }
}
function close() {
  open.value = false
  query.value = ''
}
function commit(raw: string) {
  const next = addTag(props.modelValue, raw)
  if (next !== props.modelValue) emit('update:modelValue', next)
  query.value = ''
  inputRef.value?.focus()
}
function remove(tag: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter(entry => entry !== tag),
  )
}
</script>
