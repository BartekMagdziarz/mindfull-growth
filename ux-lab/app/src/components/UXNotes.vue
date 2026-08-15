<template>
  <aside v-if="visible" class="ux-notes" aria-label="Notatki UX">
    <header class="ux-notes__header">
      <span><AppIcon name="sticky_note_2" /> Notatki UX</span>
      <small>{{ notes.length }}</small>
    </header>
    <div class="ux-notes__list">
      <article v-for="note in notes" :key="note.id" class="ux-note" :class="`ux-note--${note.tone}`">
        <span class="ux-note__index">{{ note.id }}</span>
        <div>
          <small>{{ toneLabel(note.tone) }}</small>
          <h2>{{ note.title }}</h2>
          <p>{{ note.body }}</p>
        </div>
      </article>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { uxNotesByScenario, type NoteTone } from '~lab/lab/content'

const props = defineProps<{ scenarioId: string; visible: boolean }>()
const notes = computed(() => uxNotesByScenario[props.scenarioId] ?? [])
const labels: Record<NoteTone, string> = {
  problem: 'Problem', risk: 'Ryzyko', decision: 'Decyzja', question: 'Pytanie', strength: 'Mocna strona',
}
const toneLabel = (tone: NoteTone) => labels[tone]
</script>
