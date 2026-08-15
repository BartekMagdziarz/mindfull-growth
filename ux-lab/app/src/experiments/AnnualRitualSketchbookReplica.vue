<template>
  <div class="product-replica annual-ritual">
    <div class="annual-ritual__sheet">
      <aside class="annual-ritual__rail-stack">
        <section class="annual-ritual__nav annual-ritual-surface">
          <header>
            <button type="button" class="annual-round-button" aria-label="Zamknij planowanie roczne">
              <AppIcon name="arrow_back" />
            </button>
            <div><small>PLANOWANIE · ROK</small><h2>{{ yearRef }}</h2></div>
            <span><AppIcon name="event_upcoming" /></span>
          </header>
        </section>

        <section class="annual-ritual__rail annual-ritual-surface" aria-label="Etapy planowania rocznego">
          <header><span>Ścieżka</span><small>{{ currentStep + 1 }}/{{ steps.length }}</small></header>
          <ol>
            <li v-for="(step, index) in steps" :key="step.id">
              <button
                type="button"
                :disabled="index > maxVisitedStep"
                :class="{ active: index === currentStep, done: index < currentStep }"
                @click="currentStep = index"
              >
                <span class="annual-step-dot"><i /></span>
                <span><strong>{{ step.label }}</strong><small>{{ step.short }}</small></span>
                <AppIcon v-if="index > maxVisitedStep" name="lock" />
              </button>
            </li>
          </ol>
          <div class="annual-ritual__glance">
            <span><AppIcon name="interests" /><strong>{{ assessedAreaCount }}/{{ lifeAreas.length }}</strong><small>obszary ocenione</small></span>
            <span><AppIcon name="north_star" /><strong>{{ selectedPriorityKeys.size }}</strong><small>priorytety</small></span>
          </div>
          <p><AppIcon name="cloud_done" /> {{ autosaveLabel }}</p>
        </section>
      </aside>

      <main class="annual-ritual__stage annual-ritual-surface">
        <header class="annual-stage__header">
          <div><span>{{ activeStep.kicker }}</span><h1>{{ activeStep.question }}</h1><p>{{ activeStep.description }}</p></div>
          <span>{{ String(currentStep + 1).padStart(2, '0') }}</span>
        </header>

        <div class="annual-stage__body">
          <section v-if="activeStep.id === 'brief'" class="annual-brief">
            <article>
              <span><AppIcon name="auto_awesome" /></span>
              <div><small>PUNKT STARTOWY</small><h2>Zbierz kontekst, zanim wybierzesz kierunki</h2><p>Ten etap zachowuje dzisiejszą rolę briefu. Nie tworzy nowych zobowiązań i nie rozszerza modelu planu.</p></div>
            </article>
            <label><span>Notatka do planu</span><textarea v-model="briefNote" rows="8" placeholder="Co jest ważne w nadchodzącym roku?" @input="markChanged" /></label>
          </section>

          <section v-else-if="activeStep.id === 'life-areas'" class="annual-life-areas">
            <article v-for="area in lifeAreas" :key="area.id" :class="{ expanded: expandedAreaId === area.id }">
              <button type="button" class="annual-area__main" @click="expandedAreaId = expandedAreaId === area.id ? null : area.id">
                <span><AppIcon :name="area.icon" /></span>
                <span><small>OBSZAR ŻYCIA</small><strong>{{ area.name }}</strong></span>
                <em>{{ area.score || '—' }}/10</em>
                <AppIcon name="expand_more" />
              </button>
              <div class="annual-area__score" aria-label="Ocena obszaru">
                <button v-for="score in 10" :key="score" type="button" :class="{ active: area.score === score }" @click="setAreaScore(area.id, score)">{{ score }}</button>
              </div>
              <div v-if="expandedAreaId === area.id" class="annual-area__details">
                <label><span>Znaczenie</span><textarea v-model="area.meaning" rows="2" @input="markChanged" /></label>
                <label><span>Pożądany stan</span><textarea v-model="area.desiredState" rows="2" @input="markChanged" /></label>
                <label><span>Typowe ryzyka</span><textarea v-model="area.risks" rows="2" @input="markChanged" /></label>
                <label><span>Sygnały do refleksji</span><textarea v-model="area.signals" rows="2" @input="markChanged" /></label>
              </div>
            </article>
          </section>

          <section v-else-if="activeStep.id === 'narrative'" class="annual-narrative">
            <label v-for="field in narrativeFields" :key="field.key">
              <span><AppIcon :name="field.icon" /><strong>{{ field.label }}</strong><small>{{ field.hint }}</small></span>
              <textarea v-model="narrative[field.key]" rows="5" :placeholder="field.placeholder" @input="markChanged" />
            </label>
          </section>

          <section v-else-if="activeStep.id === 'priorities'" class="annual-priorities">
            <p :class="{ warning: selectedPriorityKeys.size > 3 }"><AppIcon name="info" /><span><strong>{{ selectedPriorityKeys.size }} wybrane</strong><small>Trzy to sugestia, nie twardy limit.</small></span></p>
            <article v-for="priority in priorities" :key="priority.key" :class="{ selected: selectedPriorityKeys.has(priority.key) }">
              <button type="button" @click="togglePriority(priority.key)">
                <span><AppIcon :name="selectedPriorityKeys.has(priority.key) ? 'check' : 'north_star'" /></span>
                <span><small>PRIORYTET</small><strong>{{ priority.title }}</strong><em>{{ priority.desiredDirection }}</em></span>
              </button>
              <div v-if="selectedPriorityKeys.has(priority.key)">
                <label><span>Dlaczego teraz?</span><textarea v-model="priority.whyNow" rows="2" @input="markChanged" /></label>
                <label><span>Pożądany kierunek</span><textarea v-model="priority.desiredDirection" rows="2" @input="markChanged" /></label>
              </div>
            </article>
          </section>

          <section v-else-if="activeStep.id === 'execution'" class="annual-execution">
            <article>
              <span><AppIcon name="account_tree" /></span>
              <div><small>WYKONANIE</small><h2>Przełóż kierunki na sposób pracy</h2><p>Ten etap nadal pozostaje notatką wykonawczą. Konkretne plany powstają później w rytuałach miesięcznych i tygodniowych.</p></div>
            </article>
            <label><span>Notatka o wykonaniu</span><textarea v-model="executionNote" rows="8" placeholder="Jak chcesz wracać do planu w ciągu roku?" @input="markChanged" /></label>
          </section>

          <section v-else class="annual-summary">
            <article class="annual-summary__hero"><span><AppIcon name="task_alt" /></span><div><small>PLAN GOTOWY DO ZAPISU</small><h2>Rok ma kierunek, ale pozostaje otwarty na korekty</h2><p>Podsumowanie pokazuje wyłącznie dane, które istnieją już w planowaniu rocznym.</p></div></article>
            <div class="annual-summary__metrics">
              <span><AppIcon name="interests" /><strong>{{ assessedAreaCount }}/{{ lifeAreas.length }}</strong><small>obszary ocenione</small></span>
              <span><AppIcon name="auto_stories" /><strong>{{ narrativeAnswerCount }}/4</strong><small>pola narracji</small></span>
              <span><AppIcon name="north_star" /><strong>{{ selectedPriorityKeys.size }}</strong><small>priorytety</small></span>
            </div>
            <section><h3>Wybrane priorytety</h3><p v-if="selectedPriorities.length === 0">Nie wybrano jeszcze priorytetów.</p><span v-for="priority in selectedPriorities" :key="priority.key"><AppIcon name="north_star" />{{ priority.title }}</span></section>
          </section>
        </div>

        <footer class="annual-stage__footer">
          <button type="button" class="annual-back" :disabled="currentStep === 0" @click="currentStep -= 1"><AppIcon name="arrow_back" />Wstecz</button>
          <span><i v-for="(_, index) in steps" :key="index" :class="{ active: index === currentStep, done: index < currentStep }" /><small><AppIcon name="cloud_done" />{{ autosaveLabel }}</small></span>
          <button v-if="currentStep < steps.length - 1" type="button" class="annual-next" @click="goNext">Dalej<AppIcon name="arrow_forward" /></button>
          <button v-else type="button" class="annual-next" @click="saved = true"><AppIcon :name="saved ? 'cloud_done' : 'task_alt'" />{{ saved ? 'Zapisano' : 'Zapisz plan' }}</button>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { useLabStore } from '~lab/stores/lab.store'

const props = defineProps<{ presetId: string }>()
const labStore = useLabStore()
const yearRef = computed(() => String(labStore.fixture.presets['ritual-year'].find(item => item.id === props.presetId)?.periodRef ?? labStore.fixture.meta.anchorDayRef.slice(0, 4)))
const currentStep = ref(0)
const maxVisitedStep = ref(0)
const expandedAreaId = ref<string | null>(null)
const briefNote = ref('Chcę zbudować rok, w którym zdrowie, bliskość i spokojne dowożenie projektu wzajemnie się wspierają.')
const executionNote = ref('Co miesiąc wracam do priorytetów i świadomie ograniczam liczbę równoległych zobowiązań.')
const saved = ref(false)
const lastChangeAt = ref(new Date())
const selectedPriorityKeys = ref(new Set(['movement', 'stream', 'relationships']))

const steps = [
  { id: 'brief', label: 'Brief', short: 'Kontekst roku', kicker: 'PUNKT STARTOWY', question: 'Z czym wchodzisz w ten rok?', description: 'Nazwij kontekst, bez podejmowania decyzji za wcześnie.' },
  { id: 'life-areas', label: 'Obszary życia', short: 'Ocena i znaczenie', kicker: 'SZERSZY OBRAZ', question: 'Które obszary potrzebują Twojej uwagi?', description: 'Oceń bieżący stan i odsłoń szczegóły tylko tam, gdzie są potrzebne.' },
  { id: 'narrative', label: 'Narracja', short: 'Cztery perspektywy', kicker: 'OPOWIEŚĆ O ROKU', question: 'Jaką historię chcesz móc opowiedzieć?', description: 'Motyw, opowieść, dobry dzień i najlepsze nadzieje pozostają osobnymi polami.' },
  { id: 'priorities', label: 'Priorytety', short: 'Kierunki, nie cele', kicker: 'NAJWAŻNIEJSZE', question: 'Co ma wyznaczać kierunek?', description: 'Wybierz kilka aktywnych priorytetów i doprecyzuj ich znaczenie.' },
  { id: 'execution', label: 'Wykonanie', short: 'Sposób powrotu', kicker: 'PRZEŁOŻENIE NA RYTM', question: 'Jak plan ma żyć w ciągu roku?', description: 'Zachowujemy istniejącą notatkę wykonawczą bez dodawania nowego modelu.' },
  { id: 'summary', label: 'Podsumowanie', short: 'Kontrola jakości', kicker: 'PRZED ZAPISEM', question: 'Czy plan jest wystarczająco konkretny?', description: 'Sprawdź kompletność i zapisz wersję, do której będzie można wracać.' },
]
const activeStep = computed(() => steps[currentStep.value])
const lifeAreas = reactive([
  { id: 'body', name: 'Zdrowie i ciało', icon: 'accessibility_new', score: 6, meaning: 'Energia jest bazą dla pozostałych kierunków.', desiredState: 'Regularny ruch i spokojna regeneracja.', risks: 'Zrywy zamiast rytmu.', signals: 'Sen, energia, regularność ruchu.' },
  { id: 'relations', name: 'Relacje', icon: 'diversity_1', score: 7, meaning: 'Bliskość wymaga realnej obecności.', desiredState: 'Więcej wspólnego czasu bez ekranów.', risks: 'Praca wchodząca w wieczory.', signals: 'Wspólne rytuały i rozmowy.' },
  { id: 'work', name: 'Praca i twórczość', icon: 'workspaces', score: 7, meaning: 'Chcę dowozić bez stałego napięcia.', desiredState: 'Mniej równoległych tematów, więcej domknięć.', risks: 'Rozpraszanie i przeciążenie.', signals: 'Regularne wydania i spokojne tempo.' },
  { id: 'growth', name: 'Rozwój', icon: 'psychology', score: 5, meaning: 'Nauka daje poczucie kierunku.', desiredState: 'Krótka, ale regularna praktyka.', risks: 'Konsumpcja bez zastosowania.', signals: 'Notatki, eksperymenty i wdrożenia.' },
])
const narrative = reactive<Record<'theme' | 'story' | 'day' | 'hopes', string>>({
  theme: 'Spokojna konsekwencja',
  story: 'To był rok mniejszych, ale regularnych kroków w najważniejszych obszarach.',
  day: 'Rano ruch, skupiona praca w środku dnia i spokojny wieczór z bliskimi.',
  hopes: 'Więcej energii, bliskości i zaufania do własnego rytmu.',
})
const narrativeFields = [
  { key: 'theme' as const, icon: 'flag', label: 'Motyw roku', hint: 'Krótka nazwa kierunku', placeholder: 'Np. Spokojna konsekwencja' },
  { key: 'story' as const, icon: 'auto_stories', label: 'Opowieść', hint: 'Co ma być prawdą za rok?', placeholder: 'To był rok, w którym…' },
  { key: 'day' as const, icon: 'wb_sunny', label: 'Fantastyczny dzień', hint: 'Jak wygląda zwykły dobry dzień?', placeholder: 'Mój dobry dzień zaczyna się…' },
  { key: 'hopes' as const, icon: 'north_star', label: 'Najlepsze nadzieje', hint: 'Na co po cichu liczysz?', placeholder: 'Mam nadzieję, że…' },
]
const priorities = reactive(labStore.fixture.priorities.map(priority => ({ ...priority })))
const selectedPriorities = computed(() => priorities.filter(priority => selectedPriorityKeys.value.has(priority.key)))
const assessedAreaCount = computed(() => lifeAreas.filter(area => area.score > 0).length)
const narrativeAnswerCount = computed(() => Object.values(narrative).filter(value => value.trim()).length)
const autosaveLabel = computed(() => saved.value ? 'Plan zapisany' : `Szkic zapisany ${lastChangeAt.value.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`)

function markChanged() {
  saved.value = false
  lastChangeAt.value = new Date()
}

function setAreaScore(areaId: string, score: number) {
  const area = lifeAreas.find(item => item.id === areaId)
  if (!area) return
  area.score = score
  markChanged()
}

function togglePriority(priorityKey: string) {
  const next = new Set(selectedPriorityKeys.value)
  next.has(priorityKey) ? next.delete(priorityKey) : next.add(priorityKey)
  selectedPriorityKeys.value = next
  markChanged()
}

function goNext() {
  currentStep.value += 1
  maxVisitedStep.value = Math.max(maxVisitedStep.value, currentStep.value)
}
</script>

<style scoped>
.annual-ritual { --annual-base: rgb(var(--color-background)); --annual-surface: rgb(var(--neo-surface-base)); --annual-paper: rgb(var(--color-surface-container)); --annual-ink: rgb(var(--color-on-surface)); --annual-muted: rgb(var(--neo-muted)); --annual-blue: rgb(var(--color-primary)); --annual-strong: rgb(var(--color-primary-strong)); min-height: 100vh; padding: 20px; color: var(--annual-ink); background: var(--annual-base); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.annual-ritual *, .annual-ritual *::before, .annual-ritual *::after { box-sizing: border-box; }
.annual-ritual button, .annual-ritual textarea { font: inherit; }
.annual-ritual button { transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease; }
.annual-ritual button:active { transform: scale(.985); }
.annual-ritual button:focus-visible, .annual-ritual textarea:focus-visible { outline: 2px solid rgb(var(--sky-600)); outline-offset: 2px; }
.annual-ritual__sheet { display: grid; grid-template-columns: minmax(270px, .32fr) minmax(0, 1fr); gap: 20px; height: calc(100vh - 40px); padding: 14px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: var(--annual-base); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }
.annual-ritual-surface { position: relative; border: 1px solid rgb(var(--neo-border) / .14); background: var(--annual-surface); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }
.annual-ritual-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.annual-ritual__rail-stack { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }
.annual-ritual__nav { padding: 12px 14px; border-radius: 24px 20px 25px 21px; }
.annual-ritual__nav header { position: relative; z-index: 1; display: grid; grid-template-columns: 32px 1fr 32px; align-items: center; gap: 10px; text-align: center; }
.annual-ritual__nav header > div { display: grid; gap: 1px; }.annual-ritual__nav small { color: var(--annual-blue); font-size: 6px; font-weight: 900; letter-spacing: .14em; }.annual-ritual__nav h2 { margin: 0; font-size: 19px; }.annual-ritual__nav header > span { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--annual-strong); background: rgb(var(--sky-200) / .64); }
.annual-round-button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid rgb(var(--color-primary) / .1); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--annual-strong); background: rgb(var(--sky-200) / .72); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); cursor: pointer; }
.annual-ritual__rail { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: 10px; min-height: 0; padding: 15px; overflow: hidden; border-radius: 25px 30px 24px 28px; }
.annual-ritual__rail > header { position: relative; z-index: 1; display: flex; justify-content: space-between; color: var(--annual-strong); font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }.annual-ritual__rail ol { position: relative; z-index: 1; display: grid; align-content: start; gap: 4px; margin: 0; padding: 0; overflow: auto; list-style: none; }.annual-ritual__rail li button { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 8px; width: 100%; min-height: 48px; padding: 6px 8px; border: 0; border-radius: 15px 12px 16px 13px; color: var(--annual-muted); background: transparent; text-align: left; cursor: pointer; }.annual-ritual__rail li button.active { color: var(--annual-strong); background: rgb(var(--sky-100) / .66); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }.annual-ritual__rail li button:disabled { opacity: .48; cursor: not-allowed; }.annual-ritual__rail li button > span:nth-child(2) { display: grid; gap: 1px; }.annual-ritual__rail li strong { font-size: 8px; }.annual-ritual__rail li small { font-size: 6px; }.annual-step-dot { display: grid; place-items: center; width: 18px; height: 18px; border: 1px solid rgb(var(--sky-300) / .64); border-radius: 50%; background: rgb(var(--sky-100) / .45); }.annual-step-dot i { width: 6px; height: 6px; border-radius: 50%; }.active .annual-step-dot, .done .annual-step-dot { background: rgb(var(--sky-200) / .78); }.active .annual-step-dot i, .done .annual-step-dot i { background: rgb(var(--sky-700)); }
.annual-ritual__glance { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.annual-ritual__glance > span { display: grid; grid-template-columns: auto auto; gap: 1px 5px; align-items: center; padding: 8px; border-radius: 13px 10px 14px 11px; background: rgb(var(--sky-100) / .48); }.annual-ritual__glance .material-symbols-outlined { grid-row: 1 / 3; color: var(--annual-strong); font-size: 16px; }.annual-ritual__glance strong { font-size: 9px; }.annual-ritual__glance small { color: var(--annual-muted); font-size: 5.5px; }.annual-ritual__rail > p { position: relative; z-index: 1; display: flex; gap: 5px; margin: 0; color: var(--annual-muted); font-size: 6px; }.annual-ritual__rail > p .material-symbols-outlined { color: var(--annual-blue); font-size: 13px; }
.annual-ritual__stage { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; min-width: 0; min-height: 0; overflow: hidden; border-radius: 30px 24px 31px 25px; }
.annual-stage__header { position: relative; z-index: 1; display: flex; align-items: start; justify-content: space-between; gap: 20px; padding: 18px 22px 13px; border-bottom: 1px solid rgb(var(--neo-border) / .1); }.annual-stage__header > div { display: grid; gap: 3px; }.annual-stage__header > div > span { color: var(--annual-blue); font-size: 7px; font-weight: 900; letter-spacing: .14em; }.annual-stage__header h1 { margin: 0; font-size: 21px; }.annual-stage__header p { margin: 0; color: var(--annual-muted); font-size: 8px; }.annual-stage__header > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--annual-strong); background: rgb(var(--sky-200) / .65); font-size: 12px; font-weight: 900; }
.annual-stage__body { position: relative; z-index: 1; min-height: 0; padding: 16px 22px; overflow: auto; }.annual-stage__body section { min-height: 100%; }.annual-stage__body textarea { width: 100%; padding: 10px 12px; resize: vertical; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 15px 12px 16px 13px; color: var(--annual-ink); background: rgb(var(--sky-50) / .62); font-size: 8px; line-height: 1.5; box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .07); }.annual-stage__body label { display: grid; gap: 5px; }.annual-stage__body label > span { color: var(--annual-muted); font-size: 6.5px; font-weight: 850; }
.annual-brief, .annual-execution { display: grid; grid-template-columns: .72fr 1fr; align-content: center; gap: 15px; max-width: 900px; margin: auto; }.annual-brief > article, .annual-execution > article, .annual-summary__hero { display: flex; align-items: center; gap: 15px; padding: 18px; border-radius: 23px 18px 24px 19px; background: rgb(var(--color-primary-soft) / .48); }.annual-brief article > span, .annual-execution article > span, .annual-summary__hero > span { display: grid; place-items: center; flex: 0 0 auto; width: 58px; height: 58px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--annual-strong); background: rgb(var(--sky-200) / .72); }.annual-brief article div, .annual-execution article div, .annual-summary__hero div { display: grid; gap: 3px; }.annual-brief small, .annual-execution small, .annual-summary small { color: var(--annual-blue); font-size: 6px; font-weight: 900; letter-spacing: .13em; }.annual-brief h2, .annual-execution h2, .annual-summary h2 { margin: 0; font-size: 17px; }.annual-brief p, .annual-execution p, .annual-summary p { margin: 0; color: var(--annual-muted); font-size: 7.5px; }
.annual-life-areas { display: grid; grid-template-columns: repeat(2, 1fr); align-content: start; gap: 10px; }.annual-life-areas > article { display: grid; gap: 8px; padding: 11px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 19px 15px 20px 16px; background: var(--annual-paper); }.annual-area__main { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; padding: 0; border: 0; color: var(--annual-ink); background: transparent; text-align: left; cursor: pointer; }.annual-area__main > span:first-child { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--annual-strong); background: rgb(var(--sky-200) / .68); }.annual-area__main > span:nth-child(2) { display: grid; }.annual-area__main small { color: var(--annual-blue); font-size: 5.5px; font-weight: 900; letter-spacing: .12em; }.annual-area__main strong { font-size: 9px; }.annual-area__main em { color: var(--annual-strong); font-size: 9px; font-style: normal; font-weight: 900; }.annual-area__score { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; }.annual-area__score button { height: 25px; padding: 0; border: 0; border-radius: 8px 6px 9px 7px; color: var(--annual-muted); background: rgb(var(--sky-100) / .4); font-size: 6px; cursor: pointer; }.annual-area__score button.active { color: var(--annual-strong); background: rgb(var(--sky-200) / .8); box-shadow: inset 2px 2px 4px rgb(var(--neo-inset-dark) / .1); }.annual-area__details { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding-top: 8px; border-top: 1px dashed rgb(var(--sky-300) / .4); }
.annual-narrative { display: grid; grid-template-columns: repeat(2, 1fr); align-content: center; gap: 12px; max-width: 900px; margin: auto; }.annual-narrative > label { padding: 14px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 19px 15px 20px 16px; background: var(--annual-paper); }.annual-narrative label > span { display: grid; grid-template-columns: auto 1fr; gap: 1px 7px; align-items: center; }.annual-narrative label > span .material-symbols-outlined { grid-row: 1 / 3; color: var(--annual-strong); font-size: 22px; }.annual-narrative label strong { color: var(--annual-ink); font-size: 9px; }.annual-narrative label small { color: var(--annual-muted); font-size: 6px; font-weight: 500; }
.annual-priorities { display: grid; grid-template-columns: repeat(2, 1fr); align-content: start; gap: 10px; }.annual-priorities > p { grid-column: 1 / -1; display: flex; align-items: center; justify-self: end; gap: 7px; margin: 0; padding: 7px 10px; border-radius: 12px 10px 13px 11px; color: var(--annual-muted); background: rgb(var(--sky-100) / .44); }.annual-priorities > p > span { display: grid; }.annual-priorities > p strong { font-size: 7px; }.annual-priorities > p small { font-size: 6px; }.annual-priorities article { display: grid; gap: 8px; padding: 11px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 19px 15px 20px 16px; background: var(--annual-paper); }.annual-priorities article.selected { border-color: rgb(var(--sky-400) / .44); background: rgb(var(--color-primary-soft) / .36); }.annual-priorities article > button { display: grid; grid-template-columns: auto 1fr; gap: 9px; align-items: center; padding: 0; border: 0; color: var(--annual-ink); background: transparent; text-align: left; cursor: pointer; }.annual-priorities article > button > span:first-child { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--annual-strong); background: rgb(var(--sky-200) / .7); }.annual-priorities article > button > span:last-child { display: grid; }.annual-priorities small { color: var(--annual-blue); font-size: 5.5px; font-weight: 900; }.annual-priorities strong { font-size: 9px; }.annual-priorities em { color: var(--annual-muted); font-size: 6.5px; font-style: normal; }.annual-priorities article > div { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding-top: 8px; border-top: 1px dashed rgb(var(--sky-300) / .4); }
.annual-summary { display: grid; align-content: center; gap: 13px; max-width: 860px; margin: auto; }.annual-summary__metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }.annual-summary__metrics > span { display: grid; grid-template-columns: auto auto; align-items: center; gap: 1px 7px; padding: 13px; border-radius: 17px 14px 18px 15px; background: var(--annual-paper); }.annual-summary__metrics .material-symbols-outlined { grid-row: 1 / 3; color: var(--annual-strong); }.annual-summary__metrics strong { font-size: 12px; }.annual-summary__metrics small { color: var(--annual-muted); font-size: 6px; }.annual-summary > section { display: flex; flex-wrap: wrap; gap: 7px; padding: 14px; border-radius: 18px 15px 19px 16px; background: rgb(var(--sky-100) / .38); }.annual-summary > section h3 { width: 100%; margin: 0; font-size: 9px; }.annual-summary > section span { display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-radius: 10px; background: var(--annual-paper); font-size: 7px; }.annual-summary > section .material-symbols-outlined { color: var(--annual-strong); font-size: 13px; }
.annual-stage__footer { position: relative; z-index: 1; display: grid; grid-template-columns: 110px 1fr 110px; align-items: center; gap: 10px; padding: 10px 18px; border-top: 1px solid rgb(var(--neo-border) / .1); }.annual-stage__footer > span { display: grid; justify-items: center; gap: 4px; }.annual-stage__footer > span > i { display: none; }.annual-stage__footer > span { grid-template-columns: repeat(6, 18px); }.annual-stage__footer > span i { display: block; width: 17px; height: 4px; border-radius: 999px; background: rgb(var(--neo-muted) / .22); }.annual-stage__footer > span i.active, .annual-stage__footer > span i.done { background: rgb(var(--sky-500)); }.annual-stage__footer > span small { grid-column: 1 / -1; display: flex; align-items: center; gap: 3px; color: var(--annual-muted); font-size: 5.5px; }.annual-stage__footer > span small .material-symbols-outlined { color: var(--annual-blue); font-size: 11px; }.annual-back, .annual-next { display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 35px; border-radius: 15px 12px 16px 13px; font-size: 7px; font-weight: 900; cursor: pointer; }.annual-back { border: 0; color: var(--annual-muted); background: transparent; }.annual-next { border: 1px solid rgb(var(--color-primary) / .12); color: var(--annual-strong); background: rgb(var(--sky-200) / .78); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .65), 3px 3px 7px rgb(var(--neo-shadow-dark) / .17); }.annual-back:disabled { opacity: .4; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) { .annual-ritual *, .annual-ritual *::before, .annual-ritual *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
</style>
