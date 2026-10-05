<template>
  <section class="companion-demo">
    <p class="eyebrow">Środowisko demonstracyjne · dane fikcyjne</p>
    <h1>Poznaj asystenta refleksji</h1>
    <p>
      Wybierz osobę, a potem otwórz jej profil lub refleksję. Samo przeglądanie nie uruchamia AI.
    </p>
    <div class="people">
      <button
        v-for="person in people"
        :key="person.id"
        :aria-pressed="person.id === selected"
        :disabled="busy"
        @click="choose(person.id)"
      >
        <strong>{{ person.name }}</strong
        ><span>{{ person.description }}</span>
      </button>
    </div>
    <article>
      <h2>{{ scenario.displayName }} — historia do 27 września 2026</h2>
      <p>
        Marta i Tomasz mają historię od lipca do 27 września: wpisy, emocje, oceny tygodniowe i
        miesięczne oraz wcześniejsze pomiary. Wrzesień jest niepełny. Alex pozostaje przypadkiem z
        niewielką liczbą danych. Historia początkowa ma stałe daty. Nowe wpisy i rozmowy zapisują
        się z rzeczywistą datą. Profil początkowy to jawnie przygotowane dane fikcyjnej osoby.
      </p>
      <nav aria-label="Miejsca testowania">
        <RouterLink to="/profile#psychological">Profil i propozycje</RouterLink>
        <RouterLink to="/profile?introduction=1#psychological">Rozmowa zapoznawcza</RouterLink>
        <RouterLink to="/journal">Dziennik</RouterLink>
        <RouterLink :to="`/calendar/week/${scenario.checkpoints[0].weekRef}?action=reflect`"
          >Refleksja tygodniowa</RouterLink
        >
        <RouterLink to="/calendar/month/2026-09?action=reflect">Refleksja miesięczna</RouterLink>
      </nav>
      <button :disabled="busy" @click="confirmReset = !confirmReset">Przywróć dane osoby</button>
      <div v-if="confirmReset" role="group" aria-label="Potwierdzenie resetu">
        <p>
          Usuniesz dopisane wpisy, szkice, rozmowy i zmiany profilu {{ scenario.displayName }}.
          Pozostałe osoby i licznik kosztu pozostaną bez zmian.
        </p>
        <button :disabled="busy" @click="reset">Przywróć stan początkowy</button>
        <button :disabled="busy" @click="confirmReset = false">Anuluj</button>
      </div>
    </article>
    <article>
      <h2>Rozmowy z AI</h2>
      <p v-if="budget">
        AI: {{ budget.enabled ? 'włączone' : 'wyłączone' }}. Szacowany koszt i rezerwacje:
        <strong>{{ budget.usedUsd.toFixed(4) }} / {{ budget.limitUsd.toFixed(2) }} USD</strong>.
      </p>
      <p>
        Limit obejmuje wszystkie trzy osoby, rozmowy i analizy profilu przez ten serwer. Reset osoby
        i przeładowanie strony go nie zerują. Nowa sesja kosztowa zaczyna się po ponownym
        uruchomieniu serwera. Przerwane żądanie może pozostawić rezerwację.
      </p>
      <p v-if="budget && !budget.configured">
        Brak klucza: zapisz OPENAI_API_KEY w lokalnym pliku .env.ai-companion.local, tak jak przy
        wcześniejszych testach.
      </p>
      <button
        v-if="budget"
        :disabled="
          busy || !budget.configured || (!budget.enabled && budget.usedUsd >= budget.limitUsd)
        "
        @click="toggleAI"
      >
        {{ budget.enabled ? 'Wyłącz płatne rozmowy' : 'Włącz płatne rozmowy — limit 0,50 USD' }}
      </button>
      <button :disabled="busy" @click="loadBudget">Odśwież koszt</button>
    </article>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { buildCompanionScenario, type PersonaId } from './scenarios'
import { DEMO_SELECTION, assertDemoEnvironment, selectedPersona } from './demoEnvironment'
import { resetDemoPersona } from './demo'
const selected = selectedPersona(),
  scenario = buildCompanionScenario(selected)
const people: { id: PersonaId; name: string; description: string }[] = [
  {
    id: 'marta',
    name: 'Marta',
    description: 'Praca, bliscy, twórczość i szukanie miejsca na odpoczynek.',
  },
  {
    id: 'tomasz',
    name: 'Tomasz',
    description: 'Dobry okres, przyjaźnie, muzyka i przyjemność bez presji wyniku.',
  },
  {
    id: 'alex',
    name: 'Alex',
    description: 'Niewiele zapisów, ciekawość i różne doświadczenia ze spotkaniami.',
  },
]
const busy = ref(false),
  confirmReset = ref(false),
  error = ref('')
const budget = ref<{ enabled: boolean; usedUsd: number; limitUsd: number; configured: boolean }>()
function choose(id: PersonaId) {
  assertDemoEnvironment()
  if (id === selected) return
  sessionStorage.setItem(DEMO_SELECTION, id)
  location.assign('/ai-demo') // Full navigation discards stores and in-flight component state.
}
async function loadBudget() {
  try {
    const response = await fetch('/__companion/status', { cache: 'no-store' })
    if (!response.ok) throw new Error()
    const data = await response.json()
    if (!data.demo) throw new Error()
    budget.value = data.demo
    error.value = ''
  } catch {
    error.value = 'Nie udało się odczytać stanu serwera demonstracyjnego.'
  }
}
async function toggleAI() {
  busy.value = true
  try {
    const response = await fetch(
      `/__companion/demo/${budget.value?.enabled ? 'disable' : 'enable'}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
    )
    if (!response.ok) throw new Error()
    await loadBudget()
  } catch {
    error.value = 'Nie udało się zmienić ustawienia rozmów AI.'
  } finally {
    busy.value = false
  }
}
async function reset() {
  busy.value = true
  try {
    await resetDemoPersona(selected)
    location.assign('/ai-demo')
  } catch {
    error.value = 'Nie udało się przywrócić danych. Dotychczasowy stan został zachowany.'
    busy.value = false
  }
}
onMounted(loadBudget)
</script>
<style scoped>
.companion-demo {
  max-width: 1000px;
  margin: auto;
  padding: 32px 24px 64px;
  color: var(--mg-color-text, #23456c);
}
h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 8px 0 16px;
}
h2 {
  font-size: 20px;
  font-weight: 650;
}
p {
  margin: 12px 0;
  line-height: 1.6;
}
.eyebrow {
  font-size: 13px;
}
.people {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0;
}
button,
nav a {
  border: 1px solid #9db6d5;
  background: #edf4ff;
  border-radius: 14px;
  padding: 12px 16px;
  text-align: left;
}
button {
  margin: 4px;
}
button[aria-pressed='true'] {
  outline: 2px solid #4b85c9;
}
button:disabled {
  opacity: 0.5;
}
button span {
  display: block;
  margin-top: 8px;
  line-height: 1.5;
}
article {
  background: #f7faff;
  border-radius: 20px;
  padding: 24px;
  margin-top: 20px;
}
nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 20px 0;
}
nav a {
  text-decoration: underline;
}
:global(main:has(.companion-demo)) {
  min-width: 0;
}
@media (max-width: 750px) {
  .people {
    grid-template-columns: 1fr;
  }
  .companion-demo {
    padding: 16px 12px 70px;
  }
  article {
    padding: 16px;
  }
}
</style>
