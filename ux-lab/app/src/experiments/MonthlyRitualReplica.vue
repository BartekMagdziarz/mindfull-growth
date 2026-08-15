<template>
  <RitualSketchbookReplica v-if="props.variantId === 'sketchbook-v1'" kind="month" :preset-id="props.presetId" />
  <div v-else class="product-replica ritual-replica">
    <section class="replica-wizard neo-card">
      <ReplicaWizardHeader
        eyebrow="Rytuał miesięczny"
        :title="month.label"
        :subtitle="subtitle"
        :steps="steps"
        :current="currentStep"
        :locked="lockedSteps"
        @select="currentStep = $event"
      />

      <div class="replica-wizard__body">
        <section v-if="currentStep === 0" class="wizard-section">
          <header><div><span class="replica-eyebrow">Najważniejsze kierunki</span><h3>Na czym chcesz świadomie skupić ten miesiąc?</h3><p>To kierunki uwagi, nie dodatkowa lista zadań.</p></div><span class="quiet-pill">{{ selectedPriorities.size }} / 3 sugerowane</span></header>
          <div class="monthly-priority-selection">
            <button v-for="priority in labStore.fixture.priorities" :key="priority.key" type="button" :class="[`priority-context-card--${priority.tone}`, { selected: selectedPriorities.has(priority.key) }]" @click="togglePriority(priority.key)">
              <AppIcon :name="selectedPriorities.has(priority.key) ? 'check_circle' : 'north_star'" />
              <span><strong>{{ priority.title }}</strong><small>{{ priority.desiredDirection }}</small></span>
              <AppIcon name="chevron_right" />
            </button>
          </div>
        </section>

        <section v-else-if="currentStep === 1" class="wizard-section">
          <header><div><span class="replica-eyebrow">Aktywacja i rozmieszczenie</span><h3>Rozłóż obiekty na tygodnie bez fałszywej precyzji</h3></div></header>
          <div class="month-assignment-table">
            <div class="month-assignment-table__head"><span>Obiekt i cel</span><span v-for="week in month.weeks" :key="week.weekRef">{{ week.weekRef.slice(6) }}</span><span>Cel mies.</span></div>
            <div v-for="item in objects.slice(0, 8)" :key="item.key" class="month-assignment-row">
              <span><AppIcon :name="iconFor(item.family)" /><span><strong>{{ item.title }}</strong><small>{{ item.targetLabel }}</small></span></span>
              <button v-for="week in month.weeks" :key="week.weekRef" type="button" :class="{ active: isPlaced(item.key, week.weekRef) }" @click="togglePlacement(item.key, week.weekRef)"><AppIcon :name="isPlaced(item.key, week.weekRef) ? 'check' : 'add'" /></button>
              <span class="target-token">{{ item.targetLabel ?? '—' }}</span>
            </div>
          </div>
        </section>

        <section v-else-if="currentStep === 2" class="wizard-section">
          <header><div><span class="replica-eyebrow">Ocena kierunków</span><h3>Jak wyglądała realna praca nad priorytetami?</h3></div></header>
          <div class="priority-assessment-grid">
            <article v-for="(priority, index) in labStore.fixture.priorities" :key="priority.key" class="priority-assessment-card">
              <header><AppIcon name="north_star" /><strong>{{ priority.title }}</strong></header>
              <label><span>Wysiłek</span><div class="number-rating"><button v-for="value in 5" :key="value" type="button" :class="{ active: effort[priority.key] === value }" @click="effort[priority.key] = value">{{ value }}</button></div></label>
              <label><span>Werdykt</span><select v-model="verdicts[priority.key]"><option value="continue">Kontynuuj</option><option value="adjust">Skoryguj</option><option value="pause">Wstrzymaj</option></select></label>
              <textarea v-model="notes[priority.key]" rows="3" :placeholder="index % 2 ? 'Co wymaga korekty?' : 'Co potwierdza ten kierunek?'" />
              <div class="evidence-row"><MiniChart :points="objects[index]?.chart.slice(-6) ?? []" /><span><strong>{{ objects[index]?.chart.filter(point => point.status === 'met').length ?? 0 }}</strong><small>okresy na celu</small></span></div>
            </article>
          </div>
        </section>

        <section v-else-if="currentStep === 3" class="wizard-section rating-step">
          <header><div><span class="replica-eyebrow">Kompas jakościowy</span><h3>Jakiego miesiąca doświadczyłeś?</h3><p>Brak oceny pozostaje brakiem danych — nie zerem.</p></div></header>
          <div class="monthly-compass-grid">
            <article v-for="(label, index) in dimensionLabels" :key="label"><AppIcon :name="dimensionIcons[index]" /><span><strong>{{ label }}</strong><small>{{ dimensionHints[index] }}</small></span><div class="number-rating"><button v-for="value in 5" :key="value" type="button" :class="{ active: monthRatings[index] === value }" @click="monthRatings[index] = value">{{ value }}</button></div><button type="button" class="clear-rating" @click="monthRatings[index] = null">Wyczyść</button></article>
          </div>
        </section>

        <section v-else-if="currentStep === 4" class="wizard-section">
          <header><div><span class="replica-eyebrow">Kotwice miesiąca</span><h3>Co zabierasz dalej, a co świadomie zostawiasz?</h3></div></header>
          <div class="anchor-grid"><label v-for="anchor in monthlyAnchors" :key="anchor"><span>{{ anchor }}</span><textarea v-model="anchorAnswers[anchor]" rows="5" placeholder="Zapisz własnymi słowami…" /></label></div>
        </section>

        <section v-else class="wizard-section journal-step">
          <header><div><span class="replica-eyebrow">Synteza</span><h3>Zamknij miesiąc i nazwij korektę</h3></div><button type="button" class="tonal-control" @click="showAiConsent = !showAiConsent"><AppIcon name="auto_awesome" /> Synteza AI</button></header>
          <div class="monthly-summary-layout">
            <textarea v-model="journal" rows="10" />
            <aside><strong>Decyzje na kolejny miesiąc</strong><ul><li v-for="priority in selectedPriorityList" :key="priority.key"><AppIcon name="north_star" /><span>{{ priority.title }}</span><em>{{ verdictLabel(verdicts[priority.key]) }}</em></li></ul></aside>
          </div>
          <div v-if="showAiConsent" class="ai-consent-card"><AppIcon name="privacy_tip" /><div><strong>Każdorazowa zgoda</strong><p>AI użyje ocen, werdyktów i treści refleksji tylko do przygotowania propozycji syntezy.</p></div><button type="button" class="tonal-control" @click="aiSummary = 'Miesiąc potwierdził kierunek ruchu i relacji. Projekt wymaga mniej równoległych zobowiązań oraz wyraźniejszej ochrony czasu.'">Zgadzam się</button></div>
          <blockquote v-if="aiSummary"><AppIcon name="auto_awesome" />{{ aiSummary }}</blockquote>
        </section>
      </div>

      <footer class="replica-wizard__footer">
        <button type="button" class="lab-button lab-button--text" :disabled="currentStep === 0" @click="currentStep -= 1"><AppIcon name="arrow_back" /> Wstecz</button>
        <span>Krok {{ currentStep + 1 }} z {{ steps.length }}</span>
        <button v-if="currentStep < lastUnlockedStep" type="button" class="lab-button lab-button--filled" @click="currentStep += 1">Dalej <AppIcon name="arrow_forward" /></button>
        <button v-else type="button" class="lab-button lab-button--filled" @click="saved = true"><AppIcon :name="saved ? 'cloud_done' : 'save'" /> {{ saved ? 'Zapisano' : 'Zakończ' }}</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import MiniChart from '~lab/components/MiniChart.vue'
import ReplicaWizardHeader from '~lab/components/ReplicaWizardHeader.vue'
import RitualSketchbookReplica from '~lab/experiments/RitualSketchbookReplica.vue'
import { useLabStore } from '~lab/stores/lab.store'

const props = withDefaults(defineProps<{ presetId: string; variantId?: string }>(), { variantId: 'reference-v1' })
const labStore = useLabStore()
const currentStep = ref(0)
const saved = ref(false)
const showAiConsent = ref(false)
const aiSummary = ref('')
const journal = ref(labStore.fixture.ritual.monthlyJournal)
const selectedPriorities = ref(new Set(['movement', 'stream', 'relationships']))
const placementOverrides = ref(new Map<string, boolean>())
const effort = reactive<Record<string, number>>(Object.fromEntries(labStore.fixture.priorities.map((priority, index) => [priority.key, 2 + (index % 3)])))
const verdicts = reactive<Record<string, string>>(Object.fromEntries(labStore.fixture.priorities.map((priority, index) => [priority.key, index === 1 ? 'adjust' : 'continue'])))
const notes = reactive<Record<string, string>>({ movement: 'Dobra passa biegowa, utrzymuję kierunek.', stream: 'Za mało chronionego deep work — upraszczam plan.', relationships: 'Wspólne kolacje działają, gdy są wpisane wcześniej.', learning: 'Małe porcje nauki utrzymują ciągłość.' })
const anchorAnswers = reactive<Record<string, string>>({})
const monthRatings = reactive<Array<number | null>>([...labStore.fixture.ritual.monthlyRatings])
const preset = computed(() => labStore.fixture.presets['ritual-month'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['ritual-month'][0])
const month = computed(() => labStore.fixture.months.find(item => item.monthRef === preset.value.periodRef) ?? labStore.fixture.months.at(-1)!)
const reflectionLocked = computed(() => preset.value.id === 'plan')
const steps = computed(() => labStore.fixture.ritual.monthlySteps)
const lockedSteps = computed(() => reflectionLocked.value ? [2, 3, 4, 5] : [])
const lastUnlockedStep = computed(() => reflectionLocked.value ? 1 : steps.value.length - 1)
const subtitle = computed(() => reflectionLocked.value ? 'Wybierz kierunki i ułóż pracę na tygodnie.' : 'Oceń wysiłek, dowody i zdecyduj o korekcie kursu.')
const objects = computed(() => labStore.fixture.objects.filter(item => !['goal', 'tracker'].includes(item.family) && item.status !== 'retired').slice(0, 10))
const selectedPriorityList = computed(() => labStore.fixture.priorities.filter(priority => selectedPriorities.value.has(priority.key)))
const togglePriority = (key: string) => { const next = new Set(selectedPriorities.value); next.has(key) ? next.delete(key) : next.add(key); selectedPriorities.value = next }
const placementKey = (objectKey: string, weekRef: string) => `${objectKey}:${weekRef}`
const defaultPlacement = (objectKey: string, weekRef: string) => (objectKey.length + weekRef.length) % 3 !== 0
const isPlaced = (objectKey: string, weekRef: string) => placementOverrides.value.get(placementKey(objectKey, weekRef)) ?? defaultPlacement(objectKey, weekRef)
const togglePlacement = (objectKey: string, weekRef: string) => {
  const next = new Map(placementOverrides.value)
  const key = placementKey(objectKey, weekRef)
  next.set(key, !isPlaced(objectKey, weekRef))
  placementOverrides.value = next
}
const monthlyAnchors = ['Co przyniosło najwięcej realnej zmiany?', 'Gdzie koszt był większy niż korzyść?', 'Jaka jedna korekta ma największe znaczenie?']
const dimensionLabels = ['Balans', 'Sens', 'Rozwój', 'Spójność', 'Sprawczość']
const dimensionHints = ['Miejsce dla różnych obszarów', 'Kontakt z tym, co ważne', 'Uczenie się i poszerzanie', 'Zgodność działań z kierunkiem', 'Wpływ i możliwość działania']
const dimensionIcons = ['balance', 'favorite', 'trending_up', 'hub', 'bolt']
const familyLabel = (family: LabFixtureObject['family']) => ({ keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja', goal: 'Cel' })[family]
const iconFor = (family: LabFixtureObject['family']) => ({ keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed', goal: 'outlined_flag' })[family]
const verdictLabel = (value: string) => ({ continue: 'Kontynuuj', adjust: 'Skoryguj', pause: 'Wstrzymaj' })[value]
</script>
