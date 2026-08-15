<template>
  <section class="scenario-page concept-page">
    <header class="concept-heading"><div><span class="lab-eyebrow">Model docelowego przepływu</span><h1>Priorytet staje się żywą pętlą</h1><p>Kierunek zyskuje znaczenie dopiero wtedy, gdy łączy się z działaniem, dowodami i regularną korektą.</p></div></header>
    <div class="system-map">
      <template v-for="(node, index) in nodes" :key="node.id"><button type="button" :class="{ active: selected === index }" @click="selected = index"><span>{{ String(index + 1).padStart(2, '0') }}</span><AppIcon :name="node.icon" /><strong>{{ node.label }}</strong></button><AppIcon v-if="index < nodes.length - 1" name="arrow_forward" class="system-map__arrow" /></template>
    </div>
    <article class="map-detail neo-card"><span class="map-detail__icon"><AppIcon :name="activeNode.icon" /></span><div><span class="lab-eyebrow">Etap {{ selected + 1 }}</span><h2>{{ activeNode.label }}</h2><p>{{ activeNode.summary }}</p></div><blockquote>{{ activeNode.question }}</blockquote></article>
    <div class="map-foundations"><article><AppIcon name="link" /><h3>Semantyczna relacja</h3><p>Rola, wkład, sygnał, status i historia.</p></article><article><AppIcon name="cycle" /><h3>Możliwa korekta</h3><p>Obiekt może przestać wspierać kierunek bez kasowania historii.</p></article><article><AppIcon name="visibility" /><h3>Dowody bez nadinterpretacji</h3><p>Dane wspierają refleksję, nie udają przyczynowości.</p></article></div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
const selected = ref(0)
const nodes = [
  { id: 'priority', label: 'Priorytet', icon: 'north_star', summary: 'Znaczenie, kierunek, wpływ i naturalne zakończenie.', question: 'Co jest teraz naprawdę ważne i jakiej zmiany chcę doświadczać?' },
  { id: 'support', label: 'Mapa wsparcia', icon: 'account_tree', summary: 'Jawna teoria tego, co może wspierać kierunek.', question: 'Jakie rezultaty, praktyki i sygnały mogą realnie pomóc?' },
  { id: 'objects', label: 'Obiekty', icon: 'category', summary: 'Mierzalne cele, nawyki, trackery i intencje.', question: 'Co mogę wykonać lub obserwować bez udawania pełnej kontroli?' },
  { id: 'today', label: 'Dzisiaj', icon: 'wb_sunny', summary: 'Lekki codzienny kontekst przy właściwych działaniach.', question: 'Co mogę zrobić dziś i dlaczego właśnie to ma znaczenie?' },
  { id: 'reflection', label: 'Refleksja', icon: 'auto_awesome', summary: 'Subiektywna ocena kierunku wsparta dowodami.', question: 'Czy widzę ruch we właściwą stronę i na ile ufam tej ocenie?' },
  { id: 'adjust', label: 'Korekta', icon: 'tune', summary: 'Zmiana środka, rytmu albo relacji bez porzucania kierunku.', question: 'Co kontynuuję, co upraszczam, a co kończę?' },
]
const activeNode = computed(() => nodes[selected.value])
</script>
