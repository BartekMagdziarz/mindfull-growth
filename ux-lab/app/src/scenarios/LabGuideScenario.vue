<template>
  <section class="scenario-page concept-page guide-page">
    <header class="concept-heading"><div><span class="lab-eyebrow">Stały workbench projektowy</span><h1>Jak rozwijać UX Lab</h1><p>Każdy nowy eksperyment zaczyna się od prawdziwej trasy verify, wspólnego presetu danych i jawnej hipotezy.</p></div></header>
    <div class="guide-grid"><article v-for="(item, index) in guide" :key="item.title" class="neo-card"><span>{{ String(index + 1).padStart(2, '0') }}</span><AppIcon :name="item.icon" /><div><h2>{{ item.title }}</h2><p>{{ item.body }}</p></div></article></div>
    <section class="guide-contract neo-card"><header><AppIcon name="shield" /><span><h2>Kontrakt izolacji</h2><p>Współdzielimy język wizualny i czyste dane — nie runtime produktu.</p></span></header><div><span><AppIcon name="check_circle" /><strong>Dozwolone</strong><small>Tokeny, bazowe style, czyste obliczenia, prezentacyjne komponenty i rich-v1.</small></span><span><AppIcon name="block" /><strong>Niedozwolone</strong><small>Repozytoria, Dexie, store’y domenowe, pełne widoki i dane prawdziwego użytkownika.</small></span></div></section>
    <section class="guide-command neo-card"><AppIcon name="terminal" /><div><span class="lab-eyebrow">Po restarcie komputera</span><h2>Jedna komenda uruchamia oba środowiska</h2><code>npm run dev:lab</code><p>Verify działa na 5199, a Lab na 5201. Każdy serwer można też uruchomić osobno.</p></div></section>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
const guide = [
  { icon: 'verified', title: 'Otwórz baseline', body: 'Najpierw sprawdź aktualną trasę verify w odpowiednim stanie danych.' },
  { icon: 'content_copy', title: 'Użyj repliki referencyjnej', body: 'To punkt startowy utrzymujący technologię, tokeny i gęstość produktu.' },
  { icon: 'experiment', title: 'Dodaj wariant', body: 'Nazwij hipotezę i zmieniaj tylko to, czego chcesz się dowiedzieć.' },
  { icon: 'compare', title: 'Porównaj na tych samych danych', body: 'Tryb split pokazuje baseline i eksperyment z tym samym presetem rich-v1.' },
  { icon: 'sticky_note_2', title: 'Zapisz decyzje UX', body: 'Notatki pozostają osobną warstwą i nie mieszają się z właściwym UI.' },
  { icon: 'fact_check', title: 'Przeprowadź QA', body: 'Sprawdź desktop, mobile, interakcje, konsolę i wizualną zgodność ze źródłem.' },
]
</script>
