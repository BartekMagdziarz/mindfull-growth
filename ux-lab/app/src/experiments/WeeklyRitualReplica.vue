<template>
  <RitualSketchbookReplica v-if="props.variantId === 'sketchbook-v1'" kind="week" :preset-id="props.presetId" />
  <div v-else class="product-replica ritual-replica">
    <section class="replica-wizard neo-card">
      <ReplicaWizardHeader
        eyebrow="Rytuał tygodniowy"
        :title="`${week.weekRef} · ${week.rangeLabel}`"
        :subtitle="subtitle"
        :steps="steps"
        :current="currentStep"
        :locked="lockedSteps"
        @select="currentStep = $event"
      />

      <div class="replica-wizard__body">
        <section v-if="currentStep === 0" class="wizard-section">
          <header><div><span class="replica-eyebrow">Najważniejsze</span><h3>Co naprawdę zasługuje na uwagę?</h3></div><span class="quiet-pill">{{ selectedObjects.size }} / 3 sugerowane</span></header>
          <div class="wizard-object-grid">
            <button v-for="item in candidates" :key="item.key" type="button" class="selectable-object-card" :class="{ selected: selectedObjects.has(item.key) }" @click="toggleObject(item.key)">
              <AppIcon :name="selectedObjects.has(item.key) ? 'check_circle' : iconFor(item.family)" />
              <span><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong><em>{{ item.targetLabel }}</em></span>
            </button>
            <button type="button" class="selectable-object-card selectable-object-card--add" @click="showComposer = !showComposer"><AppIcon name="add" /><span><strong>Dodaj intencję</strong><small>Jednorazowa rzecz na ten tydzień</small></span></button>
          </div>
          <div v-if="showComposer" class="inline-composer"><input v-model="newIntention" placeholder="Np. porozmawiać o zakresie projektu" /><button type="button" class="tonal-control" @click="addIntention"><AppIcon name="add" /> Dodaj</button></div>
          <p v-if="reflectionLocked" class="locked-hint"><AppIcon name="lock_clock" /> Część refleksyjna odblokuje się w sobotę. Plan zapisuje się niezależnie.</p>
        </section>

        <section v-else-if="currentStep === 1" class="wizard-section">
          <header><div><span class="replica-eyebrow">Rytm tygodnia</span><h3>Rozłóż działania na konkretne dni</h3></div></header>
          <div class="assignment-board">
            <div class="assignment-board__head"><span>Obiekt</span><span v-for="day in week.days" :key="day.dayRef">{{ day.shortLabel }}</span></div>
            <div v-for="item in candidates.slice(0, 6)" :key="item.key" class="assignment-row">
              <span><AppIcon :name="iconFor(item.family)" /> {{ item.title }}</span>
              <button v-for="day in week.days" :key="day.dayRef" type="button" :class="{ active: isAssigned(item.key, day.dayRef) }" @click="toggleAssignment(item.key, day.dayRef)"><AppIcon :name="isAssigned(item.key, day.dayRef) ? 'check' : 'add'" /></button>
            </div>
          </div>
        </section>

        <section v-else-if="currentStep === 2" class="wizard-section">
          <header><div><span class="replica-eyebrow">Plan a wykonanie</span><h3>Co wydarzyło się naprawdę?</h3></div></header>
          <div class="review-grid">
            <article v-for="item in candidates.slice(0, 6)" :key="item.key" class="review-object-card"><header><AppIcon :name="iconFor(item.family)" /><span><strong>{{ item.title }}</strong><small>{{ item.targetLabel }}</small></span><span class="status-badge" :class="`status-badge--${item.chart.at(-1)?.status}`">{{ statusLabel(item.chart.at(-1)?.status) }}</span></header><MiniChart :points="item.chart.slice(-5)" /><textarea rows="2" placeholder="Co pomogło lub przeszkodziło?" /></article>
          </div>
        </section>

        <section v-else-if="currentStep >= 3 && currentStep <= 6" class="wizard-section rating-step">
          <header><div><span class="replica-eyebrow">{{ areaNames[currentStep - 3] }}</span><h3>{{ areaQuestions[currentStep - 3] }}</h3></div></header>
          <div class="rating-question-grid">
            <article v-for="question in ratingQuestions" :key="question.label"><span><AppIcon :name="question.icon" /><strong>{{ question.label }}</strong><small>{{ question.hint }}</small></span><div><button v-for="value in 5" :key="value" type="button" :class="{ active: ratingFor(currentStep, question.label) === value }" @click="setRating(currentStep, question.label, value)">{{ value }}</button></div></article>
          </div>
        </section>

        <section v-else-if="currentStep === 7" class="wizard-section">
          <header><div><span class="replica-eyebrow">Kotwice refleksji</span><h3>Trzy pytania, które porządkują tydzień</h3></div></header>
          <div class="anchor-grid"><label v-for="anchor in labStore.fixture.ritual.anchors" :key="anchor"><span>{{ anchor }}</span><textarea v-model="anchorAnswers[anchor]" rows="4" placeholder="Zapisz to, co chcesz pamiętać…" /></label></div>
        </section>

        <section v-else class="wizard-section journal-step">
          <header><div><span class="replica-eyebrow">Dziennik tygodnia</span><h3>Zamknij tydzień własnymi słowami</h3></div><button type="button" class="tonal-control" @click="aiRequested = !aiRequested"><AppIcon name="auto_awesome" /> {{ aiRequested ? 'Ukryj podsumowanie AI' : 'Poproś AI o syntezę' }}</button></header>
          <textarea v-model="journal" rows="8" />
          <div v-if="aiRequested" class="ai-consent-card"><AppIcon name="privacy_tip" /><div><strong>Jednorazowa zgoda</strong><p>AI otrzyma oceny, kotwice i ten tekst. Nic nie zostanie utworzone automatycznie.</p></div><button type="button" class="tonal-control" @click="aiSummary = 'Najbardziej wspierał Cię poranny rytm. Korekty wymaga regeneracja po intensywnych dniach pracy.'">Zgadzam się i generuję</button></div>
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
const showComposer = ref(false)
const newIntention = ref('')
const saved = ref(false)
const aiRequested = ref(false)
const aiSummary = ref('')
const journal = ref(labStore.fixture.ritual.weeklyJournal)
const anchorAnswers = reactive<Record<string, string>>({})
const ratings = reactive<Record<string, number>>({})
const assignments = ref(new Set<string>())
const selectedObjects = ref(new Set(['habit-stretch', 'kr-deep-work', 'intention-budget']))
const preset = computed(() => labStore.fixture.presets['ritual-week'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['ritual-week'][0])
const week = computed(() => labStore.fixture.weeks.find(item => item.weekRef === preset.value.periodRef) ?? labStore.fixture.weeks.at(-1)!)
const reflectionLocked = computed(() => preset.value.id === 'plan')
const steps = computed(() => labStore.fixture.ritual.weeklySteps)
const lockedSteps = computed(() => reflectionLocked.value ? steps.value.map((_, index) => index).filter(index => index > 1) : [])
const lastUnlockedStep = computed(() => reflectionLocked.value ? 1 : steps.value.length - 1)
const subtitle = computed(() => reflectionLocked.value ? 'Najpierw wybierz fokus i ułóż rytm dni.' : 'Porównaj plan z wykonaniem, nazwij sygnały i skoryguj kurs.')
const candidates = ref(labStore.fixture.objects.filter(item => ['keyResult', 'habit', 'intention'].includes(item.family) && item.status !== 'retired').slice(0, 9))
const areaNames = ['Ciało', 'Emocje', 'Działanie', 'Relacje']
const areaQuestions = ['Jak ciało przeżyło ten tydzień?', 'Co działo się w emocjach?', 'Jak wyglądało działanie?', 'Ile było prawdziwego kontaktu?']
const ratingQuestions = [
  { label: 'Wymagania', hint: 'Jak dużo ten obszar od Ciebie wymagał?', icon: 'speed' },
  { label: 'Odpowiedź', hint: 'Na ile Twoje działania były wspierające?', icon: 'directions_run' },
  { label: 'Stan', hint: 'Jak oceniasz końcowy stan tego obszaru?', icon: 'favorite' },
]
const toggleObject = (key: string) => { const next = new Set(selectedObjects.value); next.has(key) ? next.delete(key) : next.add(key); selectedObjects.value = next }
const addIntention = () => { if (!newIntention.value.trim()) return; candidates.value.push({ key: `new-${Date.now()}`, family: 'intention', title: newIntention.value.trim(), cadence: 'weekly', entryMode: 'completion', targetLabel: '1×', priorityKeys: [], chart: [] }); newIntention.value = ''; showComposer.value = false }
const assignmentKey = (objectKey: string, dayRef: string) => `${objectKey}:${dayRef}`
const isAssigned = (objectKey: string, dayRef: string) => assignments.value.has(assignmentKey(objectKey, dayRef))
const toggleAssignment = (objectKey: string, dayRef: string) => { const next = new Set(assignments.value); const key = assignmentKey(objectKey, dayRef); next.has(key) ? next.delete(key) : next.add(key); assignments.value = next }
const ratingFor = (step: number, label: string) => ratings[`${step}:${label}`] ?? labStore.fixture.ritual.weeklyRatings[(step * 3 + ratingQuestions.findIndex(item => item.label === label)) % 12]
const setRating = (step: number, label: string, value: number) => { ratings[`${step}:${label}`] = value }
const familyLabel = (family: LabFixtureObject['family']) => ({ keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja', goal: 'Cel' })[family]
const iconFor = (family: LabFixtureObject['family']) => ({ keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed', goal: 'outlined_flag' })[family]
const statusLabel = (status?: string) => ({ met: 'Na celu', missed: 'Poniżej', 'no-data': 'Brak danych', 'no-target': 'Obserwacja' })[status ?? 'no-data']
</script>
