<template>
  <!--
    The editor row around the panel (product frame at 1512 × 982: container
    1280 px, grid 3fr auto 2fr, aside 480 px with 20/16 px padding → panel
    460 px). The writer card is a shape replica so the panel is judged next
    to its sibling, as the design rules ask.
  -->
  <div class="jef mg-design-v2">
    <header class="jef__top">
      <div class="jef__top-left">
        <button type="button" class="mg-v2-button mg-v2-button--icon jef__back" aria-label="Wróć do dziennika"><AppIcon name="chevron_left" /></button>
        <span class="jef__date"><AppIcon name="wb_sunny" />Dziś, 18:31</span>
      </div>
      <div class="mg-v2-segmented jef__segmented" role="tablist" aria-label="Sekcje panelu">
        <button type="button" role="tab" :aria-selected="false">Emocje</button>
        <button type="button" role="tab" :aria-selected="true">AI</button>
      </div>
    </header>
    <div class="jef__grid">
      <section class="mg-v2-surface mg-v2-surface--raised-sm jef__writer" aria-label="Wpis">
        <div class="mg-v2-editor-canvas jef__canvas">
          <div class="jef__title">Czekanie na test</div>
          <p v-for="(text, index) in PARAGRAPHS" :key="index" class="jef__para">{{ text }}</p>
          <footer class="jef__canvas-foot"><button type="button" class="mg-v2-button mg-v2-button--primary jef__save">Zapisz</button></footer>
        </div>
      </section>
      <div class="jef__mid">
        <button type="button" class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet jef__chevron" aria-label="Zwiń panel"><AppIcon name="chevron_right" /></button>
      </div>
      <aside class="jef__aside">
        <JournalAiPanelReplica :key="`${variant}-${state}-${archivedCount}-${separate}`" :variant="variant" :state="state" :archived-count="archivedCount" :separate="separate" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
import JournalAiPanelReplica from '~lab/components/journal-ai/JournalAiPanelReplica.vue'
import type { PanelState, PanelVariant, SeparateChatChoice } from '~lab/lab/journalAiPanel'

defineProps<{
  variant: PanelVariant
  state: PanelState
  archivedCount: number
  separate: SeparateChatChoice
}>()

const PARAGRAPHS = [
  'Wynik ma przyjść w czwartek. Od rana łapię się na tym, że sprawdzam telefon, choć wiem, że nic jeszcze nie przyjdzie. Nie boję się jakoś szczególnie — bardziej mnie męczy to, że nic nie mogę z tym zrobić.',
  'Po południu poszedłem na spacer bez telefonu, jak w sobotę. Pomogło na jakieś pół godziny. Potem wróciło to samo: powinienem coś robić, a nie ma nic do zrobienia.',
  'Chciałbym umieć po prostu czekać. Nie wiem, czy to kwestia nawyku, czy czegoś głębiej.',
]
</script>

<style scoped>
.jef {
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-4);
  width: 1248px;
  max-width: 100%;
  min-width: 0;
  margin: 0 auto;
  color: var(--mg-color-ink);
}
.jef__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-3);
  min-height: 2.25rem;
}
.jef__top-left {
  display: flex;
  align-items: center;
  gap: var(--mg-space-4);
}
.jef__back {
  color: var(--mg-color-primary);
  background: var(--mg-color-surface);
}
.jef__date {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-2);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.jef__segmented {
  width: 9.5rem;
}
.jef__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 480px;
  gap: var(--mg-space-2);
  align-items: start;
}
.jef__writer {
  display: flex;
  flex-direction: column;
  min-height: 640px;
  padding: var(--mg-space-3);
}
.jef__canvas {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--mg-space-4);
  padding: var(--mg-space-5) var(--mg-space-6);
}
.jef__title {
  font-size: var(--mg-font-size-md);
  font-weight: 600;
}
.jef__para {
  margin: 0;
  font-size: var(--mg-font-size-md);
  line-height: 1.65;
}
.jef__canvas-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: var(--mg-space-2);
}
.jef__save {
  min-width: 140px;
}
.jef__mid {
  display: flex;
  align-items: center;
  align-self: stretch;
}
.jef__chevron {
  width: 2rem;
  min-height: 2rem;
  color: var(--mg-color-muted);
}
.jef__aside {
  padding: var(--mg-space-4) 0 var(--mg-space-4) var(--mg-space-5);
}
</style>
