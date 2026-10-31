<template>
  <section
    v-if="allSentences.length"
    class="mg-v2-surface mg-v2-surface--raised-sm pp-card"
    :aria-label="title"
  >
    <header class="pp-card__head">
      <span>{{ title }}</span>
      <button v-if="visible.length > 2" type="button" class="pp-link" @click="showAll = !showAll">
        {{ showAll ? t('programs.ui.less') : t('programs.ui.all') }}
      </button>
    </header>
    <ul v-if="visible.length" class="quotes">
      <li
        v-for="sentence in visible.slice(0, showAll ? undefined : 2)"
        :key="ownSentenceKey(sentence)"
        class="quote"
      >
        <span>„{{ sentence.text }}”</span>
        <button
          type="button"
          class="pp-chip quote__action"
          :aria-label="`${t('programs.ui.sentenceHide')}: ${sentence.text}`"
          @click="$emit('hide', ownSentenceKey(sentence))"
        >
          {{ t('programs.ui.sentenceHide') }}
        </button>
      </li>
    </ul>
    <template v-if="hidden.length">
      <button
        type="button"
        class="pp-link quotes__hidden-toggle"
        :aria-expanded="showHidden"
        @click="showHidden = !showHidden"
      >
        {{
          showHidden
            ? t('programs.ui.sentencesHiddenClose')
            : t('programs.ui.sentencesHidden', { n: hidden.length })
        }}
      </button>
      <ul v-if="showHidden" class="quotes quotes--hidden">
        <li v-for="sentence in hidden" :key="ownSentenceKey(sentence)" class="quote">
          <span>„{{ sentence.text }}”</span>
          <button
            type="button"
            class="pp-chip quote__action"
            :aria-label="`${t('programs.ui.sentenceRestore')}: ${sentence.text}`"
            @click="$emit('restore', ownSentenceKey(sentence))"
          >
            {{ t('programs.ui.sentenceRestore') }}
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { MomentFamilyKind } from '@/domain/momentFamilies'
import { collectOwnSentences, ownSentenceKey } from '@/domain/momentsProgress'

/**
 * "Moje zdania": the user's own compassionate sentences (image, compassionate
 * self, response plan, defending voice, kind voices from moments) — two on
 * the surface, the rest behind "Wszystkie". No sources, no dates. The anger
 * path shows its requests and return promises as "Moje słowa".
 *
 * A sentence can be hidden (quiet chip on hover/focus) and brought back from
 * "Ukryte (n)"; the card never edits or deletes the entry it came from
 * (decision D11b, 2026-10-31).
 */
const props = withDefaults(
  defineProps<{
    entries: readonly MicroExerciseEntry[]
    kind?: MomentFamilyKind
    hiddenKeys?: readonly string[]
  }>(),
  { kind: 'shame', hiddenKeys: () => [] }
)
defineEmits<{ hide: [key: string]; restore: [key: string] }>()

const { t } = useT()
const showAll = ref(false)
const showHidden = ref(false)
const title = computed(() =>
  props.kind === 'anger' ? t('programs.ui.wordsTitle') : t('programs.ui.sentencesTitle')
)
const allSentences = computed(() => collectOwnSentences(props.entries, Infinity, props.kind))
const hiddenSet = computed(() => new Set(props.hiddenKeys))
const visible = computed(() =>
  allSentences.value.filter(sentence => !hiddenSet.value.has(ownSentenceKey(sentence)))
)
const hidden = computed(() =>
  allSentences.value.filter(sentence => hiddenSet.value.has(ownSentenceKey(sentence)))
)
</script>

<style scoped>
.quotes {
  display: grid;
  gap: var(--mg-space-2);
  margin: 0;
  padding: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  line-height: 1.45;
  list-style: none;
}

.quotes--hidden {
  margin-top: var(--mg-space-2);
  color: var(--mg-color-muted);
  font-weight: 600;
}

/* The action follows the sentence inline (path-view rule: actions sit right
   after the content, the right edge is for state only) and only shows on
   hover/focus; its slot is part of the line, so nothing jumps when it appears. */
.quote__action {
  margin-left: var(--mg-space-2);
  vertical-align: 1px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--mg-duration-fast) ease;
}

.quote:hover .quote__action,
.quote:focus-within .quote__action {
  opacity: 1;
  pointer-events: auto;
}

.quotes__hidden-toggle {
  justify-self: start;
  margin-top: var(--mg-space-2);
}

/* Every sentence hidden: the link sits right under the head, no extra gap. */
.pp-card__head + .quotes__hidden-toggle {
  margin-top: 0;
}

@media (prefers-reduced-motion: reduce) {
  .quote__action {
    transition: none;
  }
}
</style>
