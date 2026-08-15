<template>
  <section class="scenario-page concept-page">
    <header class="concept-heading"><div><span class="lab-eyebrow">Stan obecny · dowody z aplikacji</span><h1>Gdzie znika poczucie „po co”?</h1><p>Research łączy realne zrzuty, obserwacje modelu i decyzje, które prowadzą do systemu priorytetów.</p></div><div class="finding-summary"><AppIcon name="link_off" /><span><strong>Główna luka</strong><small>Powiązanie istnieje jako ID, nie jako znaczenie.</small></span></div></header>

    <div class="tab-control"><button :class="{ active: tab === 'evidence' }" @click="tab = 'evidence'">Dowody</button><button :class="{ active: tab === 'model' }" @click="tab = 'model'">Model</button><button :class="{ active: tab === 'principles' }" @click="tab = 'principles'">Zasady</button></div>

    <div v-if="tab === 'evidence'" class="research-layout">
      <nav class="finding-list" aria-label="Znaleziska">
        <button v-for="finding in researchFindings" :key="finding.id" type="button" :class="{ active: activeFinding.id === finding.id }" @click="selectedId = finding.id"><span>{{ finding.step }}</span><span><strong>{{ finding.title }}</strong><small>{{ finding.status }}</small></span><AppIcon name="chevron_right" /></button>
      </nav>
      <article class="evidence-card">
        <div class="evidence-image"><img :src="activeFinding.image" :alt="activeFinding.title" /><span class="annotation-pin">1</span><span class="annotation-pin annotation-pin--secondary">2</span></div>
        <div class="evidence-copy"><header><span class="lab-eyebrow">Znalezisko {{ activeFinding.step }}</span><h2>{{ activeFinding.title }}</h2></header><dl><div><dt><AppIcon name="check_circle" /> Mocna strona</dt><dd>{{ activeFinding.strength }}</dd></div><div><dt><AppIcon name="warning" /> Luka</dt><dd>{{ activeFinding.issue }}</dd></div><div><dt><AppIcon name="arrow_forward" /> Kierunek</dt><dd>{{ activeFinding.recommendation }}</dd></div></dl></div>
      </article>
    </div>

    <div v-else-if="tab === 'model'" class="research-model-grid">
      <article class="neo-card"><AppIcon name="sell" /><h2>Tag bez semantyki</h2><p>Obiekty mają <code>priorityIds[]</code>, ale relacja nie przechowuje roli, wkładu, sygnału ani okresu obowiązywania.</p></article>
      <article class="neo-card"><AppIcon name="query_stats" /><h2>Progres bez fałszywej precyzji</h2><p>Priorytet wymaga osobnego pokazania kierunku, dowodów, pokrycia i pewności — nie jednego procentu.</p></article>
      <article class="neo-card"><AppIcon name="event_repeat" /><h2>Brakuje pętli korekty</h2><p>Refleksja powinna aktualizować relacje i obiekty bez uznawania, że sam kierunek był błędem.</p></article>
      <article class="neo-card"><AppIcon name="wb_sunny" /><h2>Codzienny widok nie zna sensu</h2><p>Dzisiaj dobrze wspiera wykonanie, ale nie wyjaśnia, jak konkretne działanie wnosi wkład w większy kierunek.</p></article>
    </div>

    <div v-else class="principles-grid">
      <article v-for="principle in principles" :key="principle.title" class="neo-card"><AppIcon :name="principle.icon" /><span><strong>{{ principle.title }}</strong><p>{{ principle.body }}</p></span></article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { researchFindings } from '~lab/lab/content'
const tab = ref<'evidence' | 'model' | 'principles'>('evidence')
const selectedId = ref(researchFindings[0].id)
const activeFinding = computed(() => researchFindings.find(item => item.id === selectedId.value) ?? researchFindings[0])
const principles = [
  { icon: 'north_star', title: 'Priorytet jest kierunkiem', body: 'Może mieć naturalny koniec, ale nie musi zachowywać się jak duży cel.' },
  { icon: 'account_tree', title: 'Relacja jest pierwszoklasowa', body: 'Wkład obiektu jest opisany osobno dla każdego wspieranego priorytetu.' },
  { icon: 'psychology', title: 'AI proponuje, użytkownik wybiera', body: 'Każde generowanie ma osobny opt-in i nie tworzy automatycznych zobowiązań.' },
  { icon: 'history', title: 'Historia pozostaje stabilna', body: 'Dzisiejsza korekta nie zmienia interpretacji poprzednich refleksji.' },
]
</script>
