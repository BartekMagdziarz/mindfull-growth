<template>
  <details v-if="origin.observation" class="profile-card">
    <summary>Źródła, wyjątki i ograniczenia hipotezy</summary>
    <p>
      Zakres: {{ origin.observation.from }} — {{ origin.observation.to }}. Temat:
      {{ origin.observation.focus }}
    </p>
    <p>
      To interpretacja zapisów, nie ustalony związek przyczynowy. Zatwierdzenie zachowa jej
      charakter hipotezy.
    </p>
    <p v-if="origin.observation.contextSources?.length">
      Dodatkowy kontekst definicji celów i ćwiczeń (nie osobne zdarzenia):
      {{ origin.observation.contextSources.map(s => s.title).join(', ') }}.
    </p>
    <h4>Co może ją wspierać</h4>
    <blockquote v-for="(e, i) in origin.observation.support" :key="`support-${i}`">
      <strong>{{ e.title }} · {{ date(e.occurredAt) }}</strong>
      <p v-if="e.role">{{ roleLabels[e.role] || e.role }}</p>
      <p v-if="e.field">
        {{ fieldLabel(e.field) }}<span v-if="e.eventDay"> · Dotyczy dnia: {{ e.eventDay }}</span>
      </p>
      <p class="profile-prose">{{ e.quote }}</p>
    </blockquote>
    <h4>Wyjątki i inne wyjaśnienia</h4>
    <blockquote v-for="(e, i) in origin.observation.counterexamples" :key="`counter-${i}`">
      <strong>{{ e.title }} · {{ date(e.occurredAt) }}</strong>
      <p v-if="e.role">{{ roleLabels[e.role] || e.role }}</p>
      <p v-if="e.field">
        {{ fieldLabel(e.field) }}<span v-if="e.eventDay"> · Dotyczy dnia: {{ e.eventDay }}</span>
      </p>
      <p class="profile-prose">{{ e.quote }}</p>
    </blockquote>
    <p v-if="!origin.observation.counterexamples.length">
      W wybranej próbce nie wskazano kontrprzykładu. Nie oznacza to, że wyjątki nie istnieją.
    </p>
    <p class="profile-prose">{{ origin.observation.limitations }}</p>
    <p>
      Model otrzymał fragmenty {{ origin.observation.examined }} źródeł. Pominięte znalezione
      źródła: {{ origin.observation.omitted }}. Jeden dzień liczony jest najwyżej jako jeden epizod;
      dosłowne powtórzenia są łączone. Różne daty nadal nie dowodzą różnych zdarzeń.
    </p>
    <details>
      <summary>Jak szukano</summary>
      <p v-for="(search, i) in origin.observation.searches" :key="i">
        {{
          search.purpose === 'counterexample'
            ? 'Poszukiwanie wyjątków'
            : search.purpose === 'topic'
              ? 'Temat'
              : 'Kontekst okresu'
        }}<span v-if="search.kind"> · {{ kindLabels[search.kind] || search.kind }}</span
        >: {{ search.query || 'zapisy w wybranym okresie' }} — {{ search.matches }} trafień{{
          search.complete ? '' : ', pokazano ograniczoną część'
        }}.
      </p>
    </details>
  </details>
</template>
<script setup lang="ts">
import type { ProfileOrigin } from '@/domain/approvedProfile'
const roleLabels: Record<string, string> = {
  plan: 'Plan lub deklaracja — nie potwierdzenie wykonania',
  execution: 'Zapis realizacji',
  retrospective: 'Refleksja o wcześniejszych doświadczeniach',
  record: 'Zapis doświadczenia lub odpowiedzi',
}
const kindLabels: Record<string, string> = {
  journal: 'Dziennik',
  emotion: 'Emocje',
  exercise: 'Ćwiczenia',
  reflection: 'Refleksje',
  planning: 'Cele i plany',
  measurement: 'Realizacja',
  assessment: 'Kwestionariusze',
}
const fieldLabel = (field: string) =>
  (
    ({
      body: 'Treść wpisu',
      title: 'Nazwa',
      description: 'Opis',
      value: 'Zapisana wartość',
      checkedItemIds: 'Zaznaczone elementy',
      freeformReflection: 'Refleksja',
      letter: 'List',
      notes: 'Notatki',
      subjectType: 'Rodzaj pomiaru',
      activityState: 'Stan planu',
    }) as Record<string, string>
  )[field] || field
const props = defineProps<{ origin: ProfileOrigin }>()
const date = (value: string) =>
  new Intl.DateTimeFormat('pl', { timeZone: props.origin.observation?.timeZone }).format(
    new Date(value)
  )
</script>
