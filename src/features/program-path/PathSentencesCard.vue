<template>
  <section v-if="sentences.length" class="mg-v2-surface mg-v2-surface--raised-sm pp-card" :aria-label="t('programs.ui.sentencesTitle')">
    <header class="pp-card__head">
      <span>{{ t('programs.ui.sentencesTitle') }}</span>
      <button v-if="sentences.length > 2" type="button" class="pp-link" @click="showAll = !showAll">
        {{ showAll ? t('programs.ui.less') : t('programs.ui.all') }}
      </button>
    </header>
    <ul class="quotes">
      <li v-for="sentence in sentences.slice(0, showAll ? undefined : 2)" :key="sentence.entryId + sentence.source">
        „{{ sentence.text }}”
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import { collectOwnSentences } from '@/domain/momentsProgress'

/**
 * "Moje zdania": the user's own compassionate sentences (image, compassionate
 * self, response plan, defending voice, kind voices from moments) — two on
 * the surface, the rest behind "Wszystkie". No sources, no dates.
 */
const props = defineProps<{ entries: readonly MicroExerciseEntry[] }>()
const { t } = useT()
const showAll = ref(false)
const sentences = computed(() => collectOwnSentences(props.entries))
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
</style>
