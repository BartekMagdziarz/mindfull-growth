<template>
  <div class="product-replica sketch-ritual">
    <div class="sketch-ritual__sheet">
      <aside class="ritual-rail-stack">
        <section class="ritual-nav-card ritual-surface">
          <header><button type="button" class="ritual-round-button" aria-label="Zamknij rytuał"><AppIcon name="arrow_back" /></button><div><small>{{ eyebrow }}</small><h2>{{ periodTitle }}</h2></div><span class="ritual-mode-mark"><AppIcon :name="mode === 'plan' ? 'edit_calendar' : 'rate_review'" /></span></header>
          <div class="ritual-mode-switch" aria-label="Typ rytuału"><span :class="{ active: mode === 'plan' }"><AppIcon name="edit_calendar" />Plan</span><span :class="{ active: mode === 'reflect' }"><AppIcon name="rate_review" />Refleksja</span></div>
        </section>

        <section class="ritual-rail ritual-surface" :class="{ 'ritual-rail--long': steps.length > 6 }" aria-label="Rozdziały rytuału">
          <header><span>Ścieżka</span><small>{{ currentStep + 1 }}/{{ steps.length }}</small></header>
          <ol>
            <li v-for="(step, index) in steps" :key="step.id">
              <button type="button" :class="{ active: index === currentStep, done: index < currentStep }" @click="currentStep = index">
                <span class="ritual-step-dot"><i /></span>
                <span><strong>{{ step.label }}</strong><small>{{ step.short }}</small></span>
              </button>
            </li>
          </ol>
          <section class="ritual-glance">
            <span><AppIcon name="target" /><strong>{{ selectedCount }}</strong><small>{{ selectionLabel }}</small></span>
            <span><AppIcon :name="kind === 'week' ? 'calendar_view_week' : 'calendar_view_month'" /><strong>{{ periodPulse }}</strong><small>{{ pulseLabel }}</small></span>
          </section>
          <p><AppIcon name="visibility" /> {{ railDisclosure }}</p>
        </section>
      </aside>

      <main class="ritual-stage ritual-surface">
        <header class="ritual-stage__header">
          <div><span>{{ activeStep.kicker }}</span><h1>{{ activeStep.question }}</h1><p>{{ activeStep.description }}</p></div>
          <span class="ritual-step-counter">{{ String(currentStep + 1).padStart(2, '0') }}</span>
        </header>

        <div class="ritual-stage__body">
          <section v-if="activeStep.id === 'week-focus'" class="ritual-choice-grid ritual-choice-grid--objects">
            <p class="ritual-soft-limit" :class="{ warning: selectedObjects.size > 3 }"><AppIcon :name="selectedObjects.size > 3 ? 'warning' : 'info'" /><span><strong>{{ selectedObjects.size }} wybrane</strong><small>Trzy to sugestia, nie blokada.</small></span></p>
            <article v-for="item in weekCandidates" :key="item.key" :class="{ selected: selectedObjects.has(item.key), expanded: expandedKey === item.key }">
              <button type="button" class="ritual-choice-select" @click="toggleObject(item.key)"><span class="ritual-choice-icon"><AppIcon :name="selectedObjects.has(item.key) ? 'check' : iconFor(item.family)" /></span><span><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong><em>{{ item.targetLabel }}</em></span></button>
              <button type="button" class="ritual-disclosure" :aria-label="`Pokaż znaczenie: ${item.title}`" @click.stop="expandedKey = expandedKey === item.key ? null : item.key"><AppIcon name="expand_more" /></button>
              <div v-if="expandedKey === item.key" class="ritual-choice-detail"><p>{{ item.contribution ?? 'Ten obiekt nie ma jeszcze opisu wkładu.' }}</p><button v-if="createdIntentionKeys.has(item.key)" type="button" @click="removeIntention(item.key)"><AppIcon name="delete" />Usuń intencję</button></div>
            </article>
            <form class="ritual-intention-composer" @submit.prevent="addIntention">
              <header><AppIcon name="gps_fixed" /><span><strong>Dodaj intencję tygodnia</strong><small>Opcjonalnie połącz ją z kierunkami.</small></span></header>
              <label><span>Nazwa</span><input v-model="newIntentionTitle" type="text" placeholder="Np. Domknąć decyzję o zakresie" /></label>
              <fieldset><legend>Kierunki <small>opcjonalnie</small></legend><button v-for="priority in labStore.fixture.priorities" :key="priority.key" type="button" :class="{ active: newIntentionPriorities.has(priority.key) }" @click="toggleNewIntentionPriority(priority.key)">{{ priority.title }}</button></fieldset>
              <button type="submit" class="ritual-intention-add" :disabled="!newIntentionTitle.trim()"><AppIcon name="add" />Dodaj intencję</button>
            </form>
          </section>

          <section v-else-if="activeStep.id === 'month-directions'" class="ritual-choice-grid ritual-choice-grid--priorities">
            <article v-for="priority in labStore.fixture.priorities" :key="priority.key" :class="[{ selected: selectedPriorities.has(priority.key), expanded: expandedKey === priority.key }, `tone-${priority.tone}`]">
              <button type="button" class="ritual-choice-select" @click="togglePriority(priority.key)"><span class="ritual-choice-icon"><AppIcon :name="selectedPriorities.has(priority.key) ? 'check' : priorityIcon(priority.key)" /></span><span><small>Kierunek</small><strong>{{ priority.title }}</strong><em>{{ priority.desiredDirection }}</em></span></button>
              <button type="button" class="ritual-disclosure" :aria-label="`Pokaż dlaczego teraz: ${priority.title}`" @click.stop="expandedKey = expandedKey === priority.key ? null : priority.key"><AppIcon name="expand_more" /></button>
              <p v-if="expandedKey === priority.key">{{ priority.whyNow }}</p>
            </article>
          </section>

          <section v-else-if="activeStep.id === 'month-support'" class="ritual-choice-grid ritual-choice-grid--objects">
            <article v-for="item in monthCandidates" :key="item.key" :class="{ selected: selectedMonthObjectKeys.has(item.key), expanded: expandedKey === item.key }">
              <button type="button" class="ritual-choice-select" @click="toggleMonthObject(item.key)"><span class="ritual-choice-icon"><AppIcon :name="selectedMonthObjectKeys.has(item.key) ? 'check' : iconFor(item.family)" /></span><span><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong><em>{{ item.targetLabel }}</em></span></button>
              <button type="button" class="ritual-disclosure" :aria-label="`Pokaż znaczenie: ${item.title}`" @click.stop="expandedKey = expandedKey === item.key ? null : item.key"><AppIcon name="expand_more" /></button>
              <p v-if="expandedKey === item.key">{{ item.contribution ?? 'Ten obiekt nie ma jeszcze opisu wkładu.' }}</p>
            </article>
          </section>

          <section v-else-if="activeStep.id === 'week-days'" class="ritual-assignment">
            <RitualWeeklyPlanner v-model="assignments" :items="weekCandidates" :days="week.days" :priority-keys="selectedObjects" @summary-change="weeklyPlannerSummary = $event" />
          </section>

          <section v-else-if="activeStep.id === 'month-weeks'" class="ritual-assignment ritual-assignment--month">
            <RitualMonthlyTargetPlanner v-model="assignments" :items="selectedMonthObjects" :weeks="month.weeks" @summary-change="monthlyPlannerSummary = $event" />
          </section>

          <section v-else-if="activeStep.id === 'week-picture'" class="ritual-period-picture">
            <div class="ritual-picture-facts" aria-label="Najważniejsze fakty tygodnia">
              <article v-for="fact in weekPictureFacts" :key="fact.label"><AppIcon :name="fact.icon" /><span><strong>{{ fact.value }}</strong><small>{{ fact.label }}</small></span></article>
            </div>
            <div class="ritual-picture-legend"><span><i class="planned" />zaplanowane</span><span><i class="completed"><b /></i>wykonane</span><small>Kliknij dzień po szczegóły.</small></div>
            <div class="ritual-day-strip">
              <button v-for="day in week.days" :key="day.dayRef" type="button" :class="{ active: expandedKey === day.dayRef, today: day.isToday }" @click="expandedKey = expandedKey === day.dayRef ? null : day.dayRef">
                <span>{{ day.shortLabel }} <b>{{ day.dayNumber }}</b></span>
                <i :class="{ planned: dayPlanCount(day.dayRef) > 0, completed: dayDoneCount(day) > 0 }"><b v-if="dayDoneCount(day) > 0" /></i>
                <strong>{{ dayPlanCount(day.dayRef) ? `${dayDoneCount(day)}/${dayPlanCount(day.dayRef)}` : '—' }}</strong>
                <small>wykonane / plan</small>
                <em v-if="expandedKey === day.dayRef"><span><AppIcon name="task_alt" />{{ day.completion }}% wykonania</span><span><AppIcon name="menu_book" />{{ day.journalCount }} wpisy</span><span><AppIcon name="cognition" />{{ day.emotionCount }} emocji</span></em>
              </button>
            </div>
            <aside class="ritual-picture-next"><AppIcon name="view_list" /><span><strong>{{ reviewCandidates.length }} obiektów przejrzysz osobno</strong><small>W kolejnym kroku zobaczysz wynik i dodasz komentarz tylko tam, gdzie sam wynik nie wystarcza.</small></span><AppIcon name="arrow_forward" /></aside>
          </section>

          <section v-else-if="activeStep.id === 'week-object-review'" class="ritual-object-review">
            <article v-for="item in reviewCandidates" :key="item.key">
              <header><span><AppIcon :name="iconFor(item.family)" /></span><div><small>{{ familyLabel(item.family) }}</small><strong>{{ item.title }}</strong><em>{{ periodObjectStatus(item) }}</em></div></header>
              <label><span>Komentarz <small>opcjonalnie</small></span><textarea v-model="objectComments[item.key]" rows="3" placeholder="Co warto zapamiętać o tym obiekcie?" /></label>
            </article>
          </section>

          <section v-else-if="activeWeeklyArea" class="ritual-area-rating">
            <header><span><AppIcon :name="activeWeeklyArea.icon" /></span><div><small>OBSZAR</small><h2>{{ activeWeeklyArea.label }}</h2><p>{{ activeWeeklyArea.hint }}</p></div></header>
            <article v-for="axis in weeklyAxes" :key="axis.key" :class="`axis-${axis.key}`">
              <span><i /><strong>{{ axis.label }}</strong><small>{{ axis.hint }}</small></span>
              <div><button v-for="value in 5" :key="value" type="button" :class="{ active: ratingFor(`${activeWeeklyArea.key}:${axis.key}`) === value }" :aria-label="`${activeWeeklyArea.label}, ${axis.label}: ${value} z 5`" @click="setRating(`${activeWeeklyArea.key}:${axis.key}`, value)">{{ value }}</button></div>
            </article>
          </section>

          <section v-else-if="activeStep.id === 'month-direction-review'" class="ritual-priority-review">
            <article v-for="priority in monthlyReviewPriorities" :key="priority.key" :class="`tone-${priority.tone}`">
              <header><span><AppIcon :name="priorityIcon(priority.key)" /></span><div><small>PRIORYTET <AppIcon v-if="selectedPriorities.has(priority.key)" name="star" /></small><strong>{{ priority.title }}</strong><em>{{ priority.desiredDirection }}</em></div></header>
              <div class="ritual-priority-axis axis-effort"><span><i />Wysiłek</span><div><button v-for="value in 5" :key="value" type="button" :class="{ active: ratingFor(`priority:${priority.key}:effort`) === value }" :aria-label="`${priority.title}, Wysiłek: ${value} z 5`" @click="setRating(`priority:${priority.key}:effort`, value)">{{ value }}</button></div></div>
              <div class="ritual-priority-rollup"><span><AppIcon name="calendar_view_week" /><strong>{{ priorityFocusWeeks(priority.key) }}</strong><small>tygodnie z fokusem</small></span><p>{{ priorityFocusObjects(priority.key).map(item => item.title).join(' · ') || 'Brak przypisanych obiektów' }}</p></div>
              <label><span>Werdykt</span><select v-model="priorityVerdicts[priority.key]"><option value="continue">Kontynuuj</option><option value="adjust">Dostosuj</option><option value="pause">Wstrzymaj</option><option value="drop">Porzuć</option></select></label>
              <label><span>Dlaczego? <small>opcjonalnie</small></span><textarea v-model="priorityComments[priority.key]" rows="2" placeholder="Dlaczego? (opcjonalnie)" /></label>
            </article>
            <aside v-if="driftObjects.length" class="ritual-drift"><header><AppIcon name="alt_route" /><span><strong>Poza planem miesiąca</strong><small>Fokus tygodni, który nie wspierał aktywnych priorytetów.</small></span></header><span v-for="item in driftObjects" :key="item.key"><AppIcon :name="iconFor(item.family)" />{{ item.title }}</span></aside>
          </section>

          <section v-else-if="activeStep.id === 'month-compass'" class="ritual-rating-list">
            <article v-for="question in ratingQuestions" :key="question.key">
              <span class="ritual-rating-icon"><AppIcon :name="question.icon" /></span>
              <span><strong>{{ question.label }}</strong><small>{{ question.hint }}</small></span>
              <div><button v-for="value in 5" :key="value" type="button" :class="{ active: ratingFor(question.key) === value }" :aria-label="`${question.label}: ${value} z 5`" @click="setRating(question.key, value)">{{ value }}</button></div>
            </article>
          </section>

          <section v-else-if="activeStep.id === 'week-anchors' || activeStep.id === 'month-anchors'" class="ritual-anchor-list">
            <label v-for="(anchor, index) in reflectionAnchors" :key="anchor.label" :class="{ open: openAnchor === index }">
              <button type="button" @click="openAnchor = openAnchor === index ? null : index"><span><AppIcon :name="anchor.icon" /><strong>{{ anchor.label }}</strong></span><AppIcon name="expand_more" /></button>
              <textarea v-if="openAnchor === index" v-model="anchorAnswers[index]" rows="4" placeholder="Krótko — tylko to, co chcesz pamiętać." />
            </label>
          </section>

          <section v-else-if="activeStep.id === 'week-journal' || activeStep.id === 'month-journal'" class="ritual-journal">
            <RitualJournalWorkspace v-model="journalEntry" :kind="kind" :period-title="periodTitle" :rating-groups="journalRatingGroups" :anchors="journalAnchors" :emotion-snapshot="emotionSnapshot" />
          </section>

          <section v-else-if="activeStep.id === 'week-review'" class="ritual-plan-review">
            <header class="ritual-plan-review__status" :class="{ warning: weeklyUnplacedCount || weeklyPeakLoad > 2 }"><span><AppIcon :name="weeklyUnplacedCount ? 'event_busy' : weeklyPeakLoad > 2 ? 'warning' : 'task_alt'" /></span><div><small>PRZED ZAPISEM</small><h2>{{ weeklyUnplacedCount ? `${weeklyUnplacedCount} fokus wymaga dnia` : weeklyPeakLoad > 2 ? `Plan jest kompletny, ale ${weeklyPeakDayLabel} jest gęsty` : 'Plan ma rytm i może zostać zapisany' }}</h2><p>{{ weeklyUnplacedCount ? 'Przypisz przynajmniej jeden dzień albo świadomie usuń obiekt z fokusu.' : weeklyPeakLoad > 2 ? 'To nie blokuje zapisu — sprawdź tylko, czy spiętrzenie jest zamierzone.' : 'Wszystkie fokusy mają target i miejsce w tygodniu.' }}</p></div><button type="button" @click="currentStep = 1"><AppIcon name="edit_calendar" />Popraw rytm</button></header>
            <div class="ritual-plan-review__layout">
              <section class="ritual-plan-review__objects"><header><span>Fokus i terminy</span><small>{{ weeklyPlacedCount }}/{{ weeklyReviewItems.length }} rozmieszczone</small></header><article v-for="item in weeklyReviewItems" :key="item.key"><span><AppIcon :name="iconFor(item.family)" /></span><div><strong>{{ item.title }}</strong><small>{{ item.targetLabel }}</small></div><p><i v-for="day in item.days" :key="day.dayRef">{{ day.shortLabel }}</i><em v-if="!item.days.length">bez dnia</em></p></article></section>
              <section class="ritual-plan-review__rhythm"><header><span>Obciążenie dni</span><small>liczba fokusów</small></header><div><span v-for="day in weeklyDayLoad" :key="day.dayRef"><strong>{{ day.count }}</strong><i><b :style="{ height: `${Math.max(8, day.count * 28)}%` }" /></i><small>{{ day.shortLabel }}</small></span></div><p><AppIcon :name="weeklyPeakLoad > 2 ? 'warning' : 'air'" /><span><strong>{{ weeklyPeakLoad > 2 ? 'Jeden dzień jest gęsty' : 'Jest miejsce na oddech' }}</strong><small>{{ weeklyPeakLabel }}</small></span></p></section>
            </div>
            <div class="ritual-plan-review__checks"><span><AppIcon name="target" /><strong>{{ selectedObjects.size }}</strong><small>fokusy</small></span><span><AppIcon name="event_available" /><strong>{{ weeklyPlacedCount }}</strong><small>z terminem</small></span><span><AppIcon name="speed" /><strong>{{ weeklyPeakLoad }}</strong><small>maks. na dzień</small></span></div>
          </section>

          <section v-else-if="activeStep.id === 'month-review'" class="ritual-plan-review ritual-plan-review--month">
            <header class="ritual-plan-review__status" :class="{ warning: monthlyUncoveredCount || monthlyPeakLoad > 3 }"><span><AppIcon :name="monthlyUncoveredCount ? 'link_off' : monthlyPeakLoad > 3 ? 'warning' : 'task_alt'" /></span><div><small>PRZED ZAPISEM</small><h2>{{ monthlyUncoveredCount ? `${monthlyUncoveredCount} kierunek nie ma wsparcia` : monthlyPeakLoad > 3 ? `Plan ma wsparcie, ale ${monthlyPeakWeekLabel} jest gęsty` : 'Każdy kierunek ma konkretne wsparcie' }}</h2><p>{{ monthlyUncoveredCount ? 'Dobierz obiekt albo wróć do wyboru kierunków.' : monthlyPeakLoad > 3 ? 'To nie blokuje zapisu — sprawdź tylko, czy spiętrzenie jest zamierzone.' : 'Targety i rytm tygodni są gotowe do zapisu.' }}</p></div><button type="button" @click="currentStep = monthlyUncoveredCount ? 1 : 2"><AppIcon :name="monthlyUncoveredCount ? 'add_link' : 'calendar_view_week'" />{{ monthlyUncoveredCount ? 'Dobierz wsparcie' : 'Popraw tygodnie' }}</button></header>
            <div class="ritual-plan-review__layout">
              <section class="ritual-plan-review__objects ritual-plan-review__directions"><header><span>Kierunki i wsparcie</span><small>{{ selectedMonthObjects.length }} obiekty</small></header><article v-for="priority in monthlyDirectionReview" :key="priority.key"><span><AppIcon :name="priorityIcon(priority.key)" /></span><div><strong>{{ priority.title }}</strong><small>{{ priority.objects.length ? priority.objects.map(item => item.title).join(' · ') : 'Brak wybranego wsparcia' }}</small></div><p><i>{{ priority.weeks }} tyg.</i><em v-if="!priority.objects.length">do uzupełnienia</em></p></article></section>
              <section class="ritual-plan-review__rhythm"><header><span>Rytm miesiąca</span><small>obiekty w tygodniach</small></header><div><span v-for="weekItem in monthlyWeekLoad" :key="weekItem.weekRef"><strong>{{ weekItem.count }}</strong><i><b :style="{ height: `${Math.max(8, weekItem.count * 20)}%` }" /></i><small>T{{ weekItem.weekRef.split('-W')[1] }}</small></span></div><p><AppIcon :name="monthlyPeakLoad > 3 ? 'warning' : 'air'" /><span><strong>{{ monthlyPeakLoad > 3 ? 'Warto rozluźnić szczyt' : 'Rytm jest rozłożony' }}</strong><small>{{ monthlyPeakLabel }}</small></span></p></section>
            </div>
            <div class="ritual-plan-review__checks"><span><AppIcon name="north_star" /><strong>{{ selectedPriorities.size }}</strong><small>kierunki</small></span><span><AppIcon name="target" /><strong>{{ monthlyReadyTargets }}</strong><small>targety</small></span><span><AppIcon name="calendar_view_week" /><strong>{{ monthlyActiveWeeks }}</strong><small>aktywne tygodnie</small></span></div>
          </section>
        </div>

        <footer class="ritual-stage__footer">
          <button type="button" class="ritual-back" :disabled="currentStep === 0" @click="currentStep -= 1"><AppIcon name="arrow_back" />Wstecz</button>
          <span class="ritual-footer-progress"><span><i v-for="(_, index) in steps" :key="index" :class="{ active: index === currentStep, done: index < currentStep }" /></span><small><AppIcon name="cloud_done" />Szkic zapisuje się automatycznie</small></span>
          <button v-if="currentStep < steps.length - 1" type="button" class="ritual-next" @click="currentStep += 1">Dalej<AppIcon name="arrow_forward" /></button>
          <div v-else-if="kind === 'week' && mode === 'reflect'" class="ritual-final-actions"><button type="button" class="ritual-save-secondary" @click="saveAndPlanNextWeek"><AppIcon name="edit_calendar" />Zapisz i zaplanuj kolejny tydzień</button><button type="button" class="ritual-next" @click="saved = true"><AppIcon :name="saved ? 'cloud_done' : 'task_alt'" />{{ saved ? 'Zapisano' : 'Zapisz refleksję' }}</button></div>
          <button v-else type="button" class="ritual-next" @click="saved = true"><AppIcon :name="saved ? 'cloud_done' : 'task_alt'" />{{ saved ? 'Zapisano' : mode === 'plan' ? 'Zapisz plan' : 'Zapisz refleksję' }}</button>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject, LabWeekDay } from '@product/dev/richVerificationScenario'
import { useLabStore } from '~lab/stores/lab.store'
import RitualJournalWorkspace from '~lab/components/RitualJournalWorkspace.vue'
import RitualMonthlyTargetPlanner from '~lab/components/RitualMonthlyTargetPlanner.vue'
import RitualWeeklyPlanner from '~lab/components/RitualWeeklyPlanner.vue'

type Kind = 'week' | 'month'
type Mode = 'plan' | 'reflect'
interface RitualStep { id: string; label: string; short: string; kicker: string; question: string; description: string }
interface WeeklyPlannerSummary { itemKey: string; target: number; entryDays: number | null; assignedDayRefs: string[] }
interface MonthlyPlannerSummary { itemKey: string; operator: string; monthTarget: number; aggregation: string; entryDays: number | null; assignedWeekRefs: string[]; weekTargets: Record<string, number> }

const props = defineProps<{ kind: Kind; presetId: string }>()
const labStore = useLabStore()
const kind = computed(() => props.kind)
const mode = computed<Mode>(() => props.presetId === 'reflect' ? 'reflect' : 'plan')
const weekPreset = computed(() => labStore.fixture.presets['ritual-week'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['ritual-week'][0])
const monthPreset = computed(() => labStore.fixture.presets['ritual-month'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['ritual-month'][0])
const week = computed(() => labStore.fixture.weeks.find(item => item.weekRef === weekPreset.value.periodRef) ?? labStore.fixture.weeks.at(-1)!)
const month = computed(() => labStore.fixture.months.find(item => item.monthRef === monthPreset.value.periodRef) ?? labStore.fixture.months.at(-1)!)
const eyebrow = computed(() => `${mode.value === 'plan' ? 'PLANOWANIE' : 'REFLEKSJA'} · ${kind.value === 'week' ? 'TYDZIEŃ' : 'MIESIĄC'}`)
const periodTitle = computed(() => kind.value === 'week' ? `T${week.value.weekRef.split('-W')[1]} · ${week.value.rangeLabel}` : month.value.label.replace(/^./, letter => letter.toUpperCase()))
const currentStep = ref(0)
const expandedKey = ref<string | null>(null)
const openAnchor = ref<number | null>(null)
const selectedObjects = ref(new Set(['kr-runs', 'kr-deep-work', 'habit-stretch']))
const selectedMonthObjectKeys = ref(new Set(['goal-10k', 'habit-monthly-move', 'goal-mvp', 'kr-functions']))
const selectedPriorities = ref(new Set(['movement', 'stream', 'relationships']))
const assignments = ref(new Set<string>([
  ...week.value.days.slice(0, 3).map(day => `kr-runs:${day.dayRef}`),
  ...week.value.days.slice(1, 5).map(day => `kr-deep-work:${day.dayRef}`),
  ...week.value.days.slice(0, 5).map(day => `habit-stretch:${day.dayRef}`),
  ...month.value.weeks.slice(0, 3).map(weekItem => `goal-10k:${weekItem.weekRef}`),
  ...month.value.weeks.map(weekItem => `habit-monthly-move:${weekItem.weekRef}`),
  ...month.value.weeks.slice(1, 4).map(weekItem => `goal-mvp:${weekItem.weekRef}`),
  ...month.value.weeks.slice(0, 2).map(weekItem => `kr-functions:${weekItem.weekRef}`),
]))
const ratings = reactive<Record<string, number>>({})
const anchorAnswers = reactive<Record<number, string>>({ 0: kind.value === 'week' ? 'Najbardziej pomogło trzymanie porannego planu.' : 'Najlepiej działał rytm oparty na mniejszej liczbie równoległych zobowiązań.' })
const objectComments = reactive<Record<string, string>>({})
const priorityComments = reactive<Record<string, string>>({})
const priorityVerdicts = reactive<Record<string, 'continue' | 'adjust' | 'pause' | 'drop'>>({ movement: 'continue', stream: 'adjust', relationships: 'continue' })
const createdIntentions = ref<LabFixtureObject[]>([])
const newIntentionTitle = ref('')
const newIntentionPriorities = ref(new Set<string>())
const journalEntry = ref(kind.value === 'week' ? labStore.fixture.ritual.weeklyJournal : labStore.fixture.ritual.monthlyJournal)
const weeklyPlannerSummary = ref<WeeklyPlannerSummary[]>([])
const monthlyPlannerSummary = ref<MonthlyPlannerSummary[]>([])
const saved = ref(false)

const stepSets: Record<`${Kind}-${Mode}`, RitualStep[]> = {
  'week-plan': [
    { id: 'week-focus', label: 'Fokus', short: 'Zwykle do trzech rzeczy', kicker: 'NAJWAŻNIEJSZE', question: 'Co naprawdę zasługuje na uwagę?', description: 'Wybierz kilka zobowiązań. Pozostałe obiekty nadal istnieją, ale nie walczą o pierwszy plan.' },
    { id: 'week-days', label: 'Rytm', short: 'Rozłóż na siedem dni', kicker: 'RYTM TYGODNIA', question: 'Kiedy to ma realną szansę się wydarzyć?', description: 'Zaznacz dni bez budowania sztywnego harmonogramu.' },
    { id: 'week-review', label: 'Przegląd', short: 'Rytm, luki i spiętrzenia', kicker: 'PRZED ZAPISEM', question: 'Czy plan ma rytm i oddech?', description: 'Zobacz fokusy, przypisane dni i najbardziej obciążony punkt tygodnia. Wróć tylko tam, gdzie potrzebna jest korekta.' },
  ],
  'week-reflect': [
    { id: 'week-picture', label: 'Fakty', short: 'Rytm bez ocen', kicker: 'TYDZIEŃ W SKRÓCIE', question: 'Jak wyglądał rytm tygodnia?', description: 'Zobacz wykonanie, aktywne dni, dziennik i emocje. Obiekty oraz komentarze są w następnym kroku.' },
    { id: 'week-object-review', label: 'Przegląd', short: 'Obiekty i komentarze', kicker: 'PRZEGLĄD OBIEKTÓW', question: 'Co warto dopowiedzieć do faktów?', description: 'Przejrzyj plan i rezultat. Komentarz dodaj tylko tam, gdzie sam wynik nie wystarcza.' },
    { id: 'week-rating-body', label: 'Ciało', short: 'Wysiłek i stan', kicker: 'OCENA OBSZARU', question: 'Jak wyglądał obszar ciała?', description: 'Rozdziel wkład od tego, jak ten tydzień na Ciebie wpłynął.' },
    { id: 'week-rating-emotions', label: 'Emocje', short: 'Wysiłek i stan', kicker: 'OCENA OBSZARU', question: 'Jak wyglądał obszar emocji?', description: 'Oceń osobno pracę włożoną w ten obszar i swój stan.' },
    { id: 'week-rating-action', label: 'Działanie', short: 'Wysiłek i stan', kicker: 'OCENA OBSZARU', question: 'Jak wyglądał obszar działania?', description: 'Wysoki wysiłek i dobry stan nie muszą iść w parze — zachowujemy oba sygnały.' },
    { id: 'week-rating-relations', label: 'Relacje', short: 'Wysiłek i stan', kicker: 'OCENA OBSZARU', question: 'Jak wyglądał obszar relacji?', description: 'Oceń wkład oraz jakość własnego stanu w relacjach.' },
    { id: 'week-anchors', label: 'Kotwice', short: 'Dobrze · trudno · lekcje', kicker: 'PUNKTY ZACZEPIENIA', question: 'Co warto zachować z tego tygodnia?', description: 'Trzy pytania z aplikacji. Każde jest opcjonalne — otwórz tylko te, na które masz odpowiedź.' },
    { id: 'week-journal', label: 'Dziennik', short: 'Końcowa synteza', kicker: 'WPIS DO DZIENNIKA', question: 'Co chcesz zachować z tego tygodnia?', description: 'Na końcu powstaje jeden wpis. Szczegółowe oceny i komentarze pozostają schowane pod nim.' },
  ],
  'month-plan': [
    { id: 'month-directions', label: 'Kierunki', short: 'Zwykle do trzech', kicker: 'NAJWAŻNIEJSZE', question: 'Na czym chcesz świadomie skupić miesiąc?', description: 'Kierunki uwagi nie są dodatkową listą zadań.' },
    { id: 'month-support', label: 'Wsparcie', short: 'Dobierz konkretne obiekty', kicker: 'KONKRETNE WSPARCIE', question: 'Co ma przesuwać te kierunki?', description: 'W miesiącu najpierw łączymy priorytety z kilkoma celami, rezultatami i nawykami.' },
    { id: 'month-weeks', label: 'Tygodnie', short: 'Ułóż lekki rytm', kicker: 'RYTM MIESIĄCA', question: 'W których tygodniach jest na to miejsce?', description: 'Aktywuj obiekty w tygodniach bez udawania dziennej precyzji.' },
    { id: 'month-review', label: 'Przegląd', short: 'Wsparcie, rytm i targety', kicker: 'PRZED ZAPISEM', question: 'Czy każdy kierunek ma realne wsparcie?', description: 'Sprawdź powiązania, obciążenie tygodni i gotowość targetów. Korekta jest potrzebna tylko tam, gdzie widać lukę.' },
  ],
  'month-reflect': [
    { id: 'month-direction-review', label: 'Priorytety', short: 'Wysiłek i werdykty', kicker: 'PRIORYTETY MIESIĄCA', question: 'Jak poszło z priorytetami?', description: 'Oceń wysiłek włożony w każdy aktywny priorytet i zdecyduj o jego losie. Priorytety miesiąca oznaczamy gwiazdką.' },
    { id: 'month-compass', label: 'Kompas', short: 'Pięć wymiarów', kicker: 'KOMPAS MIESIĄCA', question: 'Jak miesiąc wyglądał jako całość?', description: 'Wartości są osobnymi sygnałami — nie składamy ich w jeden wynik.' },
    { id: 'month-anchors', label: 'Kotwice', short: 'Trzy opcjonalne pytania', kicker: 'PUNKTY ZACZEPIENIA', question: 'Co warto nazwać przed końcem miesiąca?', description: 'Opcjonalnie — odpowiedz na kilka pytań albo przejdź dalej.' },
    { id: 'month-journal', label: 'Dziennik', short: 'Końcowa synteza', kicker: 'WPIS DO DZIENNIKA', question: 'Co chcesz zachować z tego miesiąca?', description: 'Zbierz najważniejsze wnioski w jednym wpisie; oceny i odpowiedzi pozostają dostępne w kontekście.' },
  ],
}
const steps = computed(() => stepSets[`${kind.value}-${mode.value}`])
const activeStep = computed(() => steps.value[currentStep.value])
const weekCandidates = computed(() => [...labStore.fixture.objects.filter(item => ['keyResult', 'habit', 'intention'].includes(item.family) && item.status !== 'retired').slice(0, 9), ...createdIntentions.value])
const createdIntentionKeys = computed(() => new Set(createdIntentions.value.map(item => item.key)))
const selectedWeekObjects = computed(() => weekCandidates.value.filter(item => selectedObjects.value.has(item.key)))
const monthCandidates = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired' && (mode.value === 'reflect' || item.status !== 'orphan') && item.cadence === 'monthly' && item.family !== 'tracker' && item.family !== 'intention').slice(0, 7))
const selectedMonthObjects = computed(() => monthCandidates.value.filter(item => selectedMonthObjectKeys.value.has(item.key)))
const monthlyReviewPriorities = computed(() => labStore.fixture.priorities)
const reviewCandidates = computed(() => kind.value === 'week' ? weekCandidates.value.slice(0, 6) : selectedMonthObjects.value)
const selectedCount = computed(() => kind.value === 'week' ? selectedObjects.value.size : selectedPriorities.value.size)
const selectionLabel = computed(() => kind.value === 'week' ? 'fokusy' : 'kierunki')
const periodPulse = computed(() => kind.value === 'week' ? `${week.value.completion}%` : `${month.value.completion}%`)
const pulseLabel = computed(() => mode.value === 'plan' ? 'kontekst z poprzedniego okresu' : 'wykonanie okresu')
const railDisclosure = computed(() => currentStep.value < steps.value.length - 1
  ? 'Każdy rozdział pokazuje tylko potrzebny krok.'
  : mode.value === 'plan'
    ? 'Pełne podsumowanie jest gotowe do przeglądu.'
    : 'Wpis do dziennika domyka refleksję.')
const weeklyAreas = [
  { key: 'body', stepId: 'week-rating-body', label: 'Ciało', hint: 'Energia, regeneracja i fizyczne napięcie.', icon: 'accessibility_new' },
  { key: 'emotions', stepId: 'week-rating-emotions', label: 'Emocje', hint: 'Kontakt z emocjami i przestrzeń na ich przeżycie.', icon: 'cognition' },
  { key: 'action', stepId: 'week-rating-action', label: 'Działanie', hint: 'Ruch w ważnym kierunku i koszt tego tempa.', icon: 'directions_run' },
  { key: 'relations', stepId: 'week-rating-relations', label: 'Relacje', hint: 'Obecność, kontakt i wpływ relacji na Twój stan.', icon: 'diversity_1' },
]
const weeklyAxes = [
  { key: 'effort', label: 'Wysiłek', hint: 'Ile świadomej uwagi i energii włożyłeś?', fixtureOffset: 1 },
  { key: 'state', label: 'Stan', hint: 'Jak się czułeś w tym obszarze?', fixtureOffset: 2 },
]
const activeWeeklyArea = computed(() => weeklyAreas.find(area => area.stepId === activeStep.value.id))
const ratingQuestions = computed(() => [
  { key: 'balance', label: 'Balans', hint: 'Tempo, odpoczynek i napięcie.', icon: 'balance' },
  { key: 'meaning', label: 'Sens', hint: 'Ile było kontaktu z tym, co ważne?', icon: 'explore' },
  { key: 'growth', label: 'Rozwój', hint: 'Co realnie się przesunęło?', icon: 'trending_up' },
  { key: 'coherence', label: 'Spójność', hint: 'Na ile działania pasowały do kierunków?', icon: 'hub' },
  { key: 'agency', label: 'Sprawczość', hint: 'Ile było wpływu i wyboru?', icon: 'ads_click' },
])
const reflectionAnchors = computed(() => kind.value === 'week'
  ? [
      { label: 'Co poszło dobrze', icon: 'thumb_up' },
      { label: 'Co było trudne', icon: 'warning' },
      { label: 'Lekcje i spostrzeżenia', icon: 'lightbulb' },
    ]
  : [
      { label: 'Z czego jestem dumny', icon: 'workspace_premium' },
      { label: 'Największe wyzwania', icon: 'warning' },
      { label: 'Jak się rozwinąłem', icon: 'trending_up' },
    ])
const journalAnchors = computed(() => Object.values(anchorAnswers))
const journalRatingGroups = computed(() => kind.value === 'week'
  ? weeklyAreas.flatMap(area => weeklyAxes.map(axis => ({ label: `${area.label} · ${axis.label}`, value: ratingFor(`${area.key}:${axis.key}`) })))
  : ratingQuestions.value.map(question => ({ label: question.label, value: ratingFor(question.key) })))
const emotionSnapshot = computed(() => {
  const total = week.value.days.reduce((sum, day) => sum + day.emotionCount, 0)
  return {
    total,
    pleasant: total ? 62 : 0,
    quadrants: [
      { label: 'Energia +', value: Math.ceil(total * .31), tone: 'rose' },
      { label: 'Spokój +', value: Math.ceil(total * .31), tone: 'sky' },
      { label: 'Energia −', value: Math.floor(total * .23), tone: 'sand' },
      { label: 'Spokój −', value: Math.floor(total * .15), tone: 'lilac' },
    ],
    top: ['spokój', 'ciekawość', 'napięcie'],
  }
})
const weekPictureFacts = computed(() => [
  { icon: 'task_alt', value: `${week.value.completion}%`, label: 'wykonania planu' },
  { icon: 'calendar_today', value: week.value.days.filter(day => day.completion > 0).length, label: 'dni z aktywnością' },
  { icon: 'menu_book', value: week.value.days.reduce((sum, day) => sum + day.journalCount, 0), label: 'wpisy dziennika' },
  { icon: 'cognition', value: week.value.days.reduce((sum, day) => sum + day.emotionCount, 0), label: 'wpisy emocji' },
])
const weeklyReviewItems = computed(() => selectedWeekObjects.value.map(item => {
  const summary = weeklyPlannerSummary.value.find(entry => entry.itemKey === item.key)
  const dayRefs = summary?.assignedDayRefs ?? week.value.days.filter(day => isAssigned(item.key, day.dayRef)).map(day => day.dayRef)
  return {
    ...item,
    days: week.value.days.filter(day => dayRefs.includes(day.dayRef)),
    targetLabel: summary
      ? `Target ≥ ${summary.target}${summary.entryDays == null ? '' : ` · wpis w ${summary.entryDays} dniach`}`
      : item.targetLabel,
  }
}))
const weeklyPlacedCount = computed(() => weeklyReviewItems.value.filter(item => item.days.length).length)
const weeklyUnplacedCount = computed(() => weeklyReviewItems.value.length - weeklyPlacedCount.value)
const weeklyDayLoad = computed(() => week.value.days.map(day => ({
  ...day,
  count: weeklyReviewItems.value.filter(item => item.days.some(itemDay => itemDay.dayRef === day.dayRef)).length,
})))
const weeklyPeakLoad = computed(() => Math.max(0, ...weeklyDayLoad.value.map(day => day.count)))
const weeklyPeakDayLabel = computed(() => weeklyDayLoad.value.find(day => day.count === weeklyPeakLoad.value)?.shortLabel ?? 'najgęstszy dzień')
const weeklyPeakLabel = computed(() => {
  const peak = weeklyDayLoad.value.find(day => day.count === weeklyPeakLoad.value)
  return peak && peak.count ? `${peak.shortLabel}: ${peak.count} fokusy` : 'Brak przypisanych dni'
})
const monthlyDirectionReview = computed(() => labStore.fixture.priorities
  .filter(priority => selectedPriorities.value.has(priority.key))
  .map(priority => {
    const objects = selectedMonthObjects.value.filter(item => item.priorityKeys.includes(priority.key))
    const weekRefs = new Set(objects.flatMap(item => monthlyAssignedWeekRefs(item.key)))
    return { ...priority, objects, weeks: weekRefs.size }
  }))
const monthlyUncoveredCount = computed(() => monthlyDirectionReview.value.filter(priority => !priority.objects.length).length)
const monthlyWeekLoad = computed(() => month.value.weeks.map(weekItem => ({
  ...weekItem,
  count: selectedMonthObjects.value.filter(item => monthlyAssignedWeekRefs(item.key).includes(weekItem.weekRef)).length,
})))
const monthlyPeakLoad = computed(() => Math.max(0, ...monthlyWeekLoad.value.map(weekItem => weekItem.count)))
const monthlyPeakWeekLabel = computed(() => {
  const peak = monthlyWeekLoad.value.find(weekItem => weekItem.count === monthlyPeakLoad.value)
  return peak ? `T${peak.weekRef.split('-W')[1]}` : 'najgęstszy tydzień'
})
const monthlyPeakLabel = computed(() => {
  const peak = monthlyWeekLoad.value.find(weekItem => weekItem.count === monthlyPeakLoad.value)
  return peak && peak.count ? `T${peak.weekRef.split('-W')[1]}: ${peak.count} obiekty` : 'Brak aktywnych tygodni'
})
const monthlyReadyTargets = computed(() => {
  if (!monthlyPlannerSummary.value.length) return selectedMonthObjects.value.filter(item => monthlyAssignedWeekRefs(item.key).length).length
  return monthlyPlannerSummary.value.filter(item => item.monthTarget > 0 && item.assignedWeekRefs.length).length
})
const monthlyActiveWeeks = computed(() => new Set(selectedMonthObjects.value.flatMap(item => monthlyAssignedWeekRefs(item.key))).size)
const driftObjects = computed(() => selectedMonthObjects.value.filter(item => !item.priorityKeys.some(key => selectedPriorities.value.has(key))))
function toggleObject(key: string) { const next = new Set(selectedObjects.value); next.has(key) ? next.delete(key) : next.add(key); selectedObjects.value = next }
function toggleMonthObject(key: string) { const next = new Set(selectedMonthObjectKeys.value); next.has(key) ? next.delete(key) : next.add(key); selectedMonthObjectKeys.value = next }
function togglePriority(key: string) { const next = new Set(selectedPriorities.value); next.has(key) ? next.delete(key) : next.add(key); selectedPriorities.value = next }
function toggleNewIntentionPriority(key: string) { const next = new Set(newIntentionPriorities.value); next.has(key) ? next.delete(key) : next.add(key); newIntentionPriorities.value = next }
function addIntention() {
  const title = newIntentionTitle.value.trim()
  if (!title) return
  const key = `intention-local-${Date.now()}`
  createdIntentions.value = [...createdIntentions.value, { key, family: 'intention', title, cadence: 'weekly', entryMode: 'completion', targetLabel: 'Na ten tydzień', priorityKeys: [...newIntentionPriorities.value], contribution: 'Intencja utworzona w planowaniu tygodnia.', chart: [] }]
  selectedObjects.value = new Set([...selectedObjects.value, key])
  newIntentionTitle.value = ''
  newIntentionPriorities.value = new Set()
}
function removeIntention(key: string) { createdIntentions.value = createdIntentions.value.filter(item => item.key !== key); selectedObjects.value = new Set([...selectedObjects.value].filter(itemKey => itemKey !== key)) }
function assignmentKey(item: string, period: string) { return `${item}:${period}` }
function isAssigned(item: string, period: string) { return assignments.value.has(assignmentKey(item, period)) }
function toggleAssignment(item: string, period: string) { const next = new Set(assignments.value); const key = assignmentKey(item, period); next.has(key) ? next.delete(key) : next.add(key); assignments.value = next }
function dayPlanCount(dayRef: string) { return selectedWeekObjects.value.filter(item => isAssigned(item.key, dayRef)).length }
function dayDoneCount(day: LabWeekDay) { const planned = dayPlanCount(day.dayRef); return Math.min(planned, Math.round(planned * day.completion / 100)) }
function monthlyAssignedWeekRefs(itemKey: string) {
  const summary = monthlyPlannerSummary.value.find(item => item.itemKey === itemKey)
  return summary?.assignedWeekRefs ?? month.value.weeks.filter(weekItem => isAssigned(itemKey, weekItem.weekRef)).map(weekItem => weekItem.weekRef)
}
function priorityFocusObjects(priorityKey: string) { return selectedMonthObjects.value.filter(item => item.priorityKeys.includes(priorityKey)) }
function priorityFocusWeeks(priorityKey: string) {
  const objectKeys = new Set(priorityFocusObjects(priorityKey).map(item => item.key))
  return new Set([...assignments.value].filter(key => objectKeys.has(key.split(':')[0])).map(key => key.split(':').slice(1).join(':'))).size
}
function iconFor(family: LabFixtureObject['family']) { return ({ goal: 'outlined_flag', keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed' })[family] }
function familyLabel(family: LabFixtureObject['family']) { return ({ goal: 'Cel', keyResult: 'Rezultat', habit: 'Nawyk', tracker: 'Tracker', intention: 'Intencja' })[family] }
function priorityIcon(key: string) { return ({ movement: 'directions_run', stream: 'rocket_launch', relationships: 'favorite', learning: 'school' })[key] ?? 'north_star' }
function statusFor(item: LabFixtureObject) { const point = item.chart.find(chartPoint => chartPoint.periodRef === week.value.weekRef); return point?.status === 'met' ? 'Na celu' : point?.status === 'missed' ? 'Do uwagi' : point?.status === 'no-target' ? 'Obserwacja' : 'Bez danych' }
function periodObjectStatus(item: LabFixtureObject) {
  const periodRef = kind.value === 'week' ? week.value.weekRef : month.value.monthRef
  const point = item.chart.find(chartPoint => chartPoint.periodRef === periodRef)
  if (!point) return 'Brak danych w tym okresie'
  const status = point.status === 'met' ? 'Na celu' : point.status === 'missed' ? 'Do uwagi' : point.status === 'no-target' ? 'Obserwacja' : 'W toku'
  const value = point.value == null ? '' : point.target == null ? ` · ${point.value}` : ` · ${point.value} / ${point.target}`
  return `${status}${value}`
}
function ratingFor(key: string) {
  if (ratings[key] != null) return ratings[key]
  if (key.includes(':') && !key.startsWith('priority:')) {
    const [areaKey, axisKey] = key.split(':')
    const areaIndex = weeklyAreas.findIndex(area => area.key === areaKey)
    const axis = weeklyAxes.find(item => item.key === axisKey)
    return labStore.fixture.ritual.weeklyRatings[areaIndex * 3 + (axis?.fixtureOffset ?? 1)] ?? 3
  }
  if (key.startsWith('priority:')) {
    const [, priorityKey, axisKey] = key.split(':')
    const priorityIndex = monthlyReviewPriorities.value.findIndex(priority => priority.key === priorityKey)
    return axisKey === 'effort'
      ? month.value.priorityEffort[priorityIndex] ?? 3
      : labStore.fixture.ritual.monthlyRatings[priorityIndex] ?? 3
  }
  return labStore.fixture.ritual.monthlyRatings[Math.max(0, ratingQuestions.value.findIndex(question => question.key === key))] ?? 3
}
function setRating(key: string, value: number) { ratings[key] = value }
function saveAndPlanNextWeek() { saved.value = true; window.location.assign('/preview/ritual-week/sketchbook-v1/plan') }
</script>

<style scoped>
.sketch-ritual { --ritual-base: rgb(var(--color-background)); --ritual-surface: rgb(var(--neo-surface-base)); --ritual-paper: rgb(var(--color-surface-container)); --ritual-ink: rgb(var(--color-on-surface)); --ritual-muted: rgb(var(--neo-muted)); --ritual-blue: rgb(var(--color-primary)); --ritual-strong: rgb(var(--color-primary-strong)); min-height: 100vh; padding: 20px; color: var(--ritual-ink); background: var(--ritual-base); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.sketch-ritual *, .sketch-ritual *::before, .sketch-ritual *::after { box-sizing: border-box; }.sketch-ritual button, .sketch-ritual textarea { font: inherit; }.sketch-ritual button { transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease; }.sketch-ritual button:active { transform: scale(.985); }
.sketch-ritual__sheet { display: grid; grid-template-columns: minmax(300px, .36fr) minmax(0, 1fr); gap: 20px; height: calc(100vh - 40px); padding: 14px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: var(--ritual-base); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }
.ritual-surface { position: relative; border: 1px solid rgb(var(--neo-border) / .14); background: var(--ritual-surface); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }.ritual-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.ritual-rail-stack { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }.ritual-nav-card { display: grid; gap: 8px; padding: 10px 13px 11px; border-radius: 24px 20px 25px 21px; }.ritual-nav-card header { position: relative; z-index: 1; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 9px; }.ritual-nav-card header > div { display: grid; gap: 1px; min-width: 0; }.ritual-nav-card header small { color: var(--ritual-blue); font-size: 7px; font-weight: 900; letter-spacing: .14em; }.ritual-nav-card header h2 { overflow: hidden; margin: 0; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.ritual-round-button, .ritual-mode-mark { display: grid; place-items: center; width: 29px; height: 29px; border: 1px solid rgb(var(--color-primary) / .1); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .72); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); }.ritual-round-button { padding: 0; cursor: pointer; }.ritual-round-button .material-symbols-outlined, .ritual-mode-mark .material-symbols-outlined { font-size: 16px; }.ritual-mode-switch { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 3px; border-radius: 14px 17px 13px 16px; background: rgb(var(--sky-100) / .55); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12); }.ritual-mode-switch span { display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 27px; border-radius: 11px 14px 10px 13px; color: var(--ritual-muted); font-size: 8px; font-weight: 800; }.ritual-mode-switch span.active { color: var(--ritual-strong); background: var(--ritual-paper); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .6), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }.ritual-mode-switch .material-symbols-outlined { font-size: 13px; }
.ritual-rail { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; align-content: start; gap: 13px; min-height: 0; padding: 18px 16px; overflow: hidden; border-radius: 25px 30px 24px 28px; }.ritual-rail > header { position: relative; z-index: 1; display: flex; justify-content: space-between; }.ritual-rail > header span { color: var(--ritual-strong); font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }.ritual-rail > header small { color: var(--ritual-muted); font-size: 8px; }.ritual-rail ol { position: relative; z-index: 1; display: grid; align-content: start; gap: 5px; min-height: 0; margin: 0; padding: 0; overflow: auto; list-style: none; scrollbar-width: thin; }.ritual-rail li button { display: grid; grid-template-columns: 36px 1fr; align-items: center; gap: 9px; width: 100%; min-height: 58px; padding: 7px 9px; border: 0; border-radius: 17px 14px 18px 15px; color: var(--ritual-muted); background: transparent; text-align: left; cursor: pointer; }.ritual-rail li button:hover, .ritual-rail li button.active { color: var(--ritual-ink); background: rgb(var(--color-primary-soft) / .48); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }.ritual-step-dot { display: grid; place-items: center; width: 29px; height: 29px; border: 1px dashed rgb(var(--sky-300)); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: rgb(var(--sky-100) / .5); }.ritual-step-dot i { width: 8px; height: 8px; border-radius: 50%; }.ritual-rail button.active .ritual-step-dot { border-style: solid; background: rgb(var(--sky-200) / .78); }.ritual-rail button.active .ritual-step-dot i, .ritual-rail button.done .ritual-step-dot i { background: rgb(var(--sky-700)); }.ritual-rail li button > span:last-child { display: grid; gap: 2px; }.ritual-rail li strong { font-size: 10px; }.ritual-rail li small { font-size: 7px; }.ritual-rail--long { gap: 8px; padding-block: 14px; }.ritual-rail--long ol { gap: 2px; }.ritual-rail--long li button { grid-template-columns: 29px 1fr; gap: 7px; min-height: 42px; padding: 4px 7px; }.ritual-rail--long .ritual-step-dot { width: 24px; height: 24px; }.ritual-rail--long li strong { font-size: 9px; }.ritual-rail--long li small { font-size: 6px; }.ritual-glance { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 6px; border-top: 1px dashed rgb(var(--sky-300) / .45); }.ritual-glance > span { display: grid; grid-template-columns: auto 1fr; gap: 1px 6px; align-items: center; padding: 9px; border-radius: 14px 11px 15px 12px; background: rgb(var(--sky-100) / .42); }.ritual-glance .material-symbols-outlined { grid-row: 1 / 3; color: var(--ritual-strong); font-size: 20px; }.ritual-glance strong { font-size: 11px; }.ritual-glance small { overflow: hidden; color: var(--ritual-muted); font-size: 6px; text-overflow: ellipsis; white-space: nowrap; }.ritual-rail > p { position: relative; z-index: 1; display: flex; align-self: end; gap: 5px; margin: 0; color: var(--ritual-muted); font-size: 7px; }.ritual-rail > p .material-symbols-outlined { color: var(--ritual-blue); font-size: 13px; }
.ritual-stage { display: grid; grid-template-rows: auto minmax(0, 1fr) 58px; min-width: 0; min-height: 0; overflow: hidden; border-radius: 28px 23px 30px 25px; }.ritual-stage__header { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 25px 28px 17px; border-bottom: 1px solid rgb(var(--neo-border) / .11); }.ritual-stage__header div { display: grid; gap: 4px; }.ritual-stage__header div > span { color: var(--ritual-blue); font-size: 8px; font-weight: 900; letter-spacing: .17em; }.ritual-stage__header h1 { margin: 0; font-size: clamp(19px, 2.1vw, 28px); font-weight: 850; letter-spacing: -.02em; }.ritual-stage__header p { max-width: 680px; margin: 0; color: var(--ritual-muted); font-size: 9px; line-height: 1.5; }.ritual-step-counter { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid rgb(var(--sky-300) / .45); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .62); font-size: 12px; font-weight: 900; }.ritual-stage__body { position: relative; z-index: 1; min-height: 0; padding: 22px 28px; overflow: auto; scrollbar-width: thin; }.ritual-stage__footer { position: relative; z-index: 1; display: grid; grid-template-columns: 120px 1fr 140px; align-items: center; gap: 12px; padding: 9px 20px; border-top: 1px solid rgb(var(--neo-border) / .12); }.ritual-stage__footer > span { display: flex; justify-content: center; gap: 5px; }.ritual-stage__footer > span i { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--neo-border) / .34); }.ritual-stage__footer > span i.done { background: rgb(var(--sky-300)); }.ritual-stage__footer > span i.active { background: rgb(var(--sky-700)); }.ritual-back, .ritual-next { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 35px; border: 0; border-radius: 17px 14px 18px 15px; font-size: 9px; font-weight: 850; cursor: pointer; }.ritual-back { color: var(--ritual-muted); background: transparent; }.ritual-back:disabled { opacity: .3; }.ritual-next { color: var(--ritual-strong); background: rgb(var(--sky-200) / .78); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .6), 3px 3px 7px rgb(var(--neo-shadow-dark) / .14); }.ritual-stage__footer .material-symbols-outlined { font-size: 16px; }
.ritual-choice-grid { display: grid; gap: 11px; }.ritual-choice-grid--objects { grid-template-columns: repeat(3, minmax(0, 1fr)); }.ritual-choice-grid--priorities { grid-template-columns: repeat(2, minmax(0, 1fr)); }.ritual-choice-grid > article { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 82px; padding: 13px; border: 1px solid rgb(var(--neo-border) / .15); border-radius: 19px 15px 20px 16px; color: var(--ritual-ink); background: var(--ritual-paper); text-align: left; box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .55), 4px 4px 9px rgb(var(--neo-shadow-dark) / .13); }.ritual-choice-grid > article.selected { border-color: rgb(var(--sky-300) / .45); background: rgb(var(--color-primary-soft) / .52); box-shadow: inset 3px 3px 7px rgb(var(--neo-inset-dark) / .1); }.ritual-choice-select { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; min-width: 0; padding: 0; border: 0; color: inherit; background: transparent; text-align: left; cursor: pointer; }.ritual-choice-icon { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .7); }.ritual-choice-icon .material-symbols-outlined { font-size: 20px; }.ritual-choice-select > span:nth-child(2) { display: grid; gap: 2px; min-width: 0; }.ritual-choice-grid small { color: var(--ritual-blue); font-size: 6px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }.ritual-choice-grid strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.ritual-choice-grid em { overflow: hidden; color: var(--ritual-muted); font-size: 7px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }.ritual-choice-grid .ritual-disclosure { display: grid; place-items: center; width: 27px; height: 27px; padding: 0; border: 0; border-radius: 50%; color: var(--ritual-blue); background: rgb(var(--sky-100) / .65); cursor: pointer; }.ritual-choice-grid > article > p { grid-column: 1 / -1; margin: 2px 0 0 49px; color: var(--ritual-muted); font-size: 7.5px; line-height: 1.45; }
.ritual-assignment { display: grid; min-width: 690px; }.ritual-assignment__head, .ritual-assignment__row { display: grid; grid-template-columns: minmax(210px, 1fr) repeat(7, 52px); align-items: center; gap: 6px; padding: 7px 9px; border-bottom: 1px solid rgb(var(--neo-border) / .11); }.ritual-assignment--month .ritual-assignment__head, .ritual-assignment--month .ritual-assignment__row { grid-template-columns: minmax(240px, 1fr) repeat(5, 72px); }.ritual-assignment__head { color: var(--ritual-muted); font-size: 7px; font-weight: 900; text-align: center; text-transform: uppercase; }.ritual-assignment__head span:first-child { text-align: left; }.ritual-assignment__row > span { display: flex; align-items: center; gap: 7px; min-width: 0; }.ritual-assignment__row > span .material-symbols-outlined { color: var(--ritual-strong); font-size: 18px; }.ritual-assignment__row strong { overflow: hidden; font-size: 8.5px; text-overflow: ellipsis; white-space: nowrap; }.ritual-assignment__row > button { display: grid; place-items: center; width: 34px; height: 34px; margin: auto; border: 1px dashed rgb(var(--sky-300) / .65); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: transparent; cursor: pointer; }.ritual-assignment__row > button i { width: 12px; height: 12px; border-radius: 50%; }.ritual-assignment__row > button.active { border-style: solid; background: rgb(var(--sky-200) / .67); box-shadow: inset 2px 2px 4px rgb(var(--neo-inset-dark) / .1); }.ritual-assignment__row > button.active i { background: rgb(var(--sky-700)); }.ritual-empty { display: flex; align-items: center; gap: 6px; color: var(--ritual-muted); font-size: 8px; }
.ritual-period-picture { display: grid; gap: 19px; }.ritual-day-strip, .ritual-week-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }.ritual-week-strip { grid-template-columns: repeat(5, 1fr); }.ritual-day-strip button, .ritual-week-strip button { position: relative; display: grid; justify-items: center; gap: 7px; min-height: 126px; padding: 11px 7px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 19px 15px 20px 16px; color: var(--ritual-muted); background: var(--ritual-paper); cursor: pointer; }.ritual-day-strip button.active, .ritual-week-strip button.active { color: var(--ritual-strong); background: rgb(var(--color-primary-soft) / .52); box-shadow: inset 3px 3px 7px rgb(var(--neo-inset-dark) / .1); }.ritual-day-strip button > span, .ritual-week-strip button > span { font-size: 8px; font-weight: 900; }.ritual-day-strip button > i { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: rgb(var(--sky-200) / .65); }.ritual-day-strip button > i b { width: 13px; height: 13px; border-radius: 50%; background: rgb(var(--sky-700)); }.ritual-week-strip button > i { display: flex; align-items: end; width: 26px; height: 45px; border-radius: 10px 10px 4px 4px; background: rgb(var(--sky-100) / .7); }.ritual-week-strip button > i b { width: 100%; border-radius: inherit; background: rgb(var(--sky-400) / .7); }.ritual-day-strip button > strong, .ritual-week-strip button > strong { font-size: 9px; }.ritual-day-strip button > em, .ritual-week-strip button > em { position: absolute; z-index: 3; top: calc(100% + 6px); width: 150px; padding: 8px; border-radius: 11px; color: var(--ritual-ink); background: rgb(var(--sky-50)); font-size: 7px; font-style: normal; box-shadow: 0 5px 12px rgb(var(--neo-shadow-dark) / .18); }.ritual-evidence-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }.ritual-evidence-list button { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 10px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 14px 11px 15px 12px; color: var(--ritual-ink); background: var(--ritual-paper); text-align: left; cursor: pointer; }.ritual-evidence-list button > .material-symbols-outlined:first-child { color: var(--ritual-strong); }.ritual-evidence-list button > span { display: grid; gap: 2px; }.ritual-evidence-list strong { font-size: 8.5px; }.ritual-evidence-list small, .ritual-evidence-list p { color: var(--ritual-muted); font-size: 7px; }.ritual-evidence-list p { margin: 3px 0 0; }.ritual-picture-summary { display: flex; align-items: center; justify-self: center; gap: 9px; padding: 13px 18px; border-radius: 17px 14px 18px 15px; background: rgb(var(--sky-100) / .52); }.ritual-picture-summary > .material-symbols-outlined { color: var(--ritual-strong); }.ritual-picture-summary span { display: grid; gap: 2px; }.ritual-picture-summary strong { font-size: 10px; }.ritual-picture-summary small { color: var(--ritual-muted); font-size: 7px; }
.ritual-week-axes { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; width: 100%; }.ritual-week-axes > span { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto 42px; gap: 3px; align-items: end; justify-items: center; }.ritual-week-axes small { grid-column: 1 / -1; color: var(--ritual-muted); font-size: 6px; }.ritual-week-axes i { display: flex; align-items: end; width: 14px; height: 42px; border-radius: 8px 8px 4px 4px; background: rgb(var(--sky-100) / .72); }.ritual-week-axes i b { width: 100%; min-height: 4px; border-radius: inherit; }.ritual-week-axes strong { align-self: center; font-size: 9px; }.ritual-week-axes .effort i b { background: rgb(var(--rose-300) / .76); }.ritual-week-axes .state i b { background: rgb(var(--sky-500) / .78); }
.ritual-object-review { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }.ritual-object-review article { display: grid; gap: 11px; padding: 13px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 19px 15px 20px 16px; background: var(--ritual-paper); box-shadow: -3px -3px 8px rgb(var(--neo-shadow-light) / .5), 3px 3px 8px rgb(var(--neo-shadow-dark) / .1); }.ritual-object-review header, .ritual-priority-review header { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; align-items: center; }.ritual-object-review header > span, .ritual-priority-review header > span { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .68); }.ritual-object-review header > div, .ritual-priority-review header > div { display: grid; gap: 2px; min-width: 0; }.ritual-object-review header small, .ritual-priority-review header small { color: var(--ritual-blue); font-size: 6px; font-weight: 900; letter-spacing: .12em; }.ritual-object-review header strong, .ritual-priority-review header strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.ritual-object-review header em, .ritual-priority-review header em { color: var(--ritual-muted); font-size: 7px; font-style: normal; }.ritual-object-review label, .ritual-priority-review label { display: grid; gap: 5px; }.ritual-object-review label > span, .ritual-priority-review label > span { color: var(--ritual-strong); font-size: 7px; font-weight: 850; }.ritual-object-review label small, .ritual-priority-review label small { color: var(--ritual-muted); font-size: 6px; font-weight: 700; }.ritual-object-review textarea, .ritual-priority-review textarea { width: 100%; padding: 9px 10px; resize: vertical; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 13px 10px 14px 11px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .55); font-size: 8px; line-height: 1.4; outline: none; }
.ritual-area-rating { display: grid; align-content: center; gap: 13px; max-width: 760px; min-height: 100%; margin: 0 auto; }.ritual-area-rating > header { display: flex; align-items: center; gap: 13px; padding: 15px 18px; border-radius: 20px 16px 21px 17px; background: rgb(var(--color-primary-soft) / .45); }.ritual-area-rating > header > span { display: grid; place-items: center; width: 49px; height: 49px; border-radius: 50%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .75); }.ritual-area-rating > header > div { display: grid; gap: 2px; }.ritual-area-rating h2 { margin: 0; font-size: 18px; }.ritual-area-rating p { margin: 0; color: var(--ritual-muted); font-size: 8px; }.ritual-area-rating > header small { color: var(--ritual-blue); font-size: 6px; font-weight: 900; letter-spacing: .13em; }.ritual-area-rating > article { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 18px; padding: 17px 19px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 19px 15px 20px 16px; background: var(--ritual-paper); }.ritual-area-rating > article > span { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }.ritual-area-rating > article > span i, .ritual-priority-axis > span i { grid-row: 1 / 3; width: 8px; height: 8px; border-radius: 50%; }.axis-effort > span i { background: rgb(var(--rose-400)); }.axis-state > span i { background: rgb(var(--sky-600)); }.ritual-area-rating > article strong { font-size: 11px; }.ritual-area-rating > article small { color: var(--ritual-muted); font-size: 7px; }.ritual-area-rating > article > div, .ritual-priority-axis > div { display: flex; gap: 7px; }
.ritual-priority-review { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }.ritual-priority-review > article { display: grid; gap: 9px; padding: 11px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 19px 15px 20px 16px; background: var(--ritual-paper); }.ritual-priority-review header small { display: flex; align-items: center; gap: 3px; }.ritual-priority-review header small .material-symbols-outlined { color: var(--ritual-strong); font-size: 10px; }.ritual-priority-axis { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 7px; }.ritual-priority-axis > span { display: flex; align-items: center; gap: 5px; color: var(--ritual-muted); font-size: 7px; font-weight: 850; }.ritual-priority-axis > span i { grid-row: auto; flex: 0 0 auto; }
.ritual-rating-list { display: grid; gap: 9px; max-width: 820px; margin: 0 auto; }.ritual-rating-list article { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 17px 14px 18px 15px; background: var(--ritual-paper); }.ritual-rating-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .65); }.ritual-rating-icon .material-symbols-outlined { font-size: 20px; }.ritual-rating-list article > span:nth-child(2) { display: grid; gap: 2px; }.ritual-rating-list strong { font-size: 9px; }.ritual-rating-list small { color: var(--ritual-muted); font-size: 7px; }.ritual-rating-list article > div { display: flex; gap: 6px; }.ritual-rating-list article > div button, .ritual-area-rating article > div button, .ritual-priority-axis button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid rgb(var(--sky-300) / .45); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-muted); background: transparent; font-size: 8px; cursor: pointer; }.ritual-priority-axis button { width: 23px; height: 23px; font-size: 7px; }.ritual-rating-list article > div button.active, .ritual-area-rating article > div button.active, .ritual-priority-axis button.active { color: white; background: rgb(var(--sky-700)); box-shadow: 2px 2px 5px rgb(var(--neo-shadow-dark) / .2); }
.ritual-anchor-list { display: grid; gap: 10px; max-width: 780px; margin: 0 auto; }.ritual-anchor-list label { display: grid; border: 1px dashed rgb(var(--sky-300) / .55); border-radius: 19px 15px 20px 16px; background: rgb(var(--sky-50) / .35); }.ritual-anchor-list label.open { border-style: solid; background: var(--ritual-paper); }.ritual-anchor-list label > button { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 0; color: var(--ritual-ink); background: transparent; cursor: pointer; }.ritual-anchor-list label > button span { display: flex; align-items: center; gap: 8px; }.ritual-anchor-list label > button span .material-symbols-outlined { color: var(--ritual-strong); }.ritual-anchor-list label strong { font-size: 10px; }.ritual-anchor-list textarea, .ritual-decision textarea { margin: 0 14px 14px; padding: 12px; resize: vertical; border: 1px solid rgb(var(--neo-border) / .16); border-radius: 14px 11px 15px 12px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .65); font-size: 9px; line-height: 1.5; outline: none; }
.ritual-decision { display: grid; gap: 14px; max-width: 850px; margin: 0 auto; }.ritual-decision-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }.ritual-decision-options button { display: grid; justify-items: center; gap: 5px; padding: 14px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 19px 15px 20px 16px; color: var(--ritual-ink); background: var(--ritual-paper); text-align: center; cursor: pointer; }.ritual-decision-options button.active { background: rgb(var(--color-primary-soft) / .55); box-shadow: inset 3px 3px 7px rgb(var(--neo-inset-dark) / .1); }.ritual-decision-options button > span { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 50%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .68); }.ritual-decision-options strong { font-size: 9px; }.ritual-decision-options small { color: var(--ritual-muted); font-size: 7px; }.ritual-decision > label { display: grid; gap: 6px; }.ritual-decision > label > span { color: var(--ritual-strong); font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.ritual-decision > label textarea { margin: 0; }.ritual-ai-trigger { display: flex; align-items: center; justify-content: center; gap: 6px; justify-self: start; min-height: 34px; padding: 0 13px; border: 1px solid rgb(var(--sky-300) / .45); border-radius: 16px 13px 17px 14px; color: var(--ritual-strong); background: rgb(var(--sky-100) / .58); font-size: 8px; font-weight: 850; cursor: pointer; }.ritual-ai-consent { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgb(var(--sky-300) / .4); border-radius: 16px 13px 17px 14px; background: rgb(var(--sky-100) / .5); }.ritual-ai-consent > .material-symbols-outlined { color: var(--ritual-strong); }.ritual-ai-consent span { display: grid; gap: 2px; }.ritual-ai-consent strong { font-size: 8px; }.ritual-ai-consent small { color: var(--ritual-muted); font-size: 7px; }.ritual-ai-consent button { padding: 7px 10px; border: 0; border-radius: 12px; color: white; background: rgb(var(--sky-700)); font-size: 7px; cursor: pointer; }.ritual-decision blockquote { display: flex; gap: 7px; margin: 0; padding: 11px; border-left: 3px solid rgb(var(--sky-400)); border-radius: 0 13px 13px 0; background: rgb(var(--sky-100) / .42); font-size: 8px; }.ritual-decision blockquote .material-symbols-outlined { color: var(--ritual-strong); font-size: 16px; }
.ritual-journal { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(220px, .6fr); gap: 15px; max-width: 880px; margin: 0 auto; }.ritual-journal > label, .ritual-journal > aside { display: grid; gap: 11px; padding: 17px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 21px 17px 22px 18px; background: var(--ritual-paper); }.ritual-journal > label > span { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }.ritual-journal > label > span .material-symbols-outlined { grid-row: 1 / 3; color: var(--ritual-strong); font-size: 24px; }.ritual-journal > label strong { font-size: 11px; }.ritual-journal > label small { color: var(--ritual-muted); font-size: 7px; }.ritual-journal textarea { width: 100%; min-height: 218px; padding: 14px; resize: vertical; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 16px 13px 17px 14px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .58); font-size: 9px; line-height: 1.6; outline: none; }.ritual-journal > aside { align-content: start; background: rgb(var(--color-primary-soft) / .34); }.ritual-journal > aside > small { color: var(--ritual-blue); font-size: 7px; font-weight: 900; letter-spacing: .13em; }.ritual-journal > aside > span { display: grid; grid-template-columns: auto auto 1fr; gap: 6px; align-items: center; padding: 8px; border-radius: 13px 10px 14px 11px; background: rgb(var(--sky-50) / .5); }.ritual-journal > aside > span .material-symbols-outlined { color: var(--ritual-strong); font-size: 17px; }.ritual-journal > aside > span strong { font-size: 10px; }.ritual-journal > aside > span em { color: var(--ritual-muted); font-size: 7px; font-style: normal; }.ritual-journal > aside > p { display: flex; gap: 5px; margin: 3px 0 0; color: var(--ritual-muted); font-size: 7px; line-height: 1.4; }.ritual-journal > aside > p .material-symbols-outlined { color: var(--ritual-blue); font-size: 14px; }
.ritual-review { display: grid; align-content: center; gap: 20px; max-width: 820px; min-height: 100%; margin: 0 auto; }.ritual-review-hero { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 23px 18px 24px 19px; background: rgb(var(--color-primary-soft) / .52); }.ritual-review-hero > span { display: grid; place-items: center; width: 62px; height: 62px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .72); }.ritual-review-hero > span .material-symbols-outlined { font-size: 30px; }.ritual-review-hero > div { display: grid; gap: 3px; }.ritual-review-hero small { color: var(--ritual-blue); font-size: 7px; font-weight: 900; letter-spacing: .14em; }.ritual-review-hero h2 { margin: 0; font-size: 20px; }.ritual-review-hero p { margin: 0; color: var(--ritual-muted); font-size: 8px; }.ritual-review-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }.ritual-review-grid article { display: flex; align-items: center; gap: 9px; padding: 13px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 17px 14px 18px 15px; background: var(--ritual-paper); }.ritual-review-grid article > .material-symbols-outlined { color: var(--ritual-strong); }.ritual-review-grid article span { display: grid; gap: 1px; }.ritual-review-grid strong { font-size: 10px; }.ritual-review-grid small { color: var(--ritual-muted); font-size: 7px; }
.ritual-choice-select:disabled { opacity: .48; cursor: not-allowed; }
.ritual-soft-limit { grid-column: 1 / -1; display: flex; align-items: center; justify-self: end; gap: 7px; margin: 0; padding: 7px 10px; border-radius: 12px 10px 13px 11px; color: var(--ritual-muted); background: rgb(var(--sky-100) / .44); }.ritual-soft-limit.warning { color: rgb(var(--rose-700)); background: rgb(var(--rose-100) / .5); }.ritual-soft-limit > .material-symbols-outlined { font-size: 15px; }.ritual-soft-limit > span { display: grid; gap: 1px; }.ritual-soft-limit strong { font-size: 7px; }.ritual-soft-limit small { color: inherit; font-size: 6px; letter-spacing: 0; text-transform: none; }
.ritual-choice-detail { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-left: 49px; }.ritual-choice-detail p { margin: 0; color: var(--ritual-muted); font-size: 7.5px; line-height: 1.45; }.ritual-choice-detail button { display: flex; align-items: center; gap: 3px; flex: 0 0 auto; padding: 5px 7px; border: 0; border-radius: 9px; color: rgb(var(--rose-700)); background: rgb(var(--rose-100) / .48); font-size: 6px; cursor: pointer; }.ritual-choice-detail .material-symbols-outlined { font-size: 12px; }
.ritual-intention-composer { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(220px, .9fr) minmax(270px, 1.2fr) auto; align-items: end; gap: 10px; padding: 13px; border: 1px dashed rgb(var(--sky-300) / .56); border-radius: 18px 15px 19px 16px; background: rgb(var(--sky-100) / .3); }.ritual-intention-composer header { grid-column: 1 / -1; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 7px; }.ritual-intention-composer header > .material-symbols-outlined { color: var(--ritual-strong); }.ritual-intention-composer header span { display: grid; gap: 1px; }.ritual-intention-composer header strong { font-size: 8px; }.ritual-intention-composer header small { color: var(--ritual-muted); font-size: 6px; letter-spacing: 0; text-transform: none; }.ritual-intention-composer label { display: grid; gap: 4px; }.ritual-intention-composer label > span, .ritual-intention-composer legend { color: var(--ritual-muted); font-size: 6px; font-weight: 850; }.ritual-intention-composer input { min-height: 34px; padding: 0 10px; border: 1px solid rgb(var(--neo-border) / .13); border-radius: 12px 10px 13px 11px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .72); font-size: 8px; outline: none; }.ritual-intention-composer fieldset { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; border: 0; }.ritual-intention-composer legend { margin-bottom: 4px; }.ritual-intention-composer fieldset button { padding: 5px 7px; border: 0; border-radius: 9px; color: var(--ritual-muted); background: rgb(var(--sky-50) / .6); font-size: 6px; cursor: pointer; }.ritual-intention-composer fieldset button.active { color: var(--ritual-strong); background: rgb(var(--sky-200) / .75); }.ritual-intention-add { display: flex; align-items: center; gap: 4px; min-height: 34px; padding: 0 11px; border: 0; border-radius: 13px 10px 14px 11px; color: var(--ritual-strong); background: rgb(var(--sky-200) / .78); font-size: 7px; font-weight: 900; cursor: pointer; }.ritual-intention-add:disabled { opacity: .4; cursor: not-allowed; }
.ritual-priority-review select { min-height: 31px; padding: 0 8px; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 12px 10px 13px 11px; color: var(--ritual-ink); background: rgb(var(--sky-50) / .6); font-size: 7px; outline: none; }.ritual-priority-rollup { display: grid; gap: 5px; padding: 8px; border-radius: 12px 10px 13px 11px; background: rgb(var(--sky-100) / .46); }.ritual-priority-rollup > span { display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 4px; }.ritual-priority-rollup .material-symbols-outlined { color: var(--ritual-strong); font-size: 14px; }.ritual-priority-rollup strong { font-size: 8px; }.ritual-priority-rollup small, .ritual-priority-rollup p { color: var(--ritual-muted); font-size: 6px; }.ritual-priority-rollup p { margin: 0; line-height: 1.35; }.ritual-drift { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 11px; border: 1px dashed rgb(var(--sky-300) / .5); border-radius: 16px 13px 17px 14px; background: rgb(var(--sky-100) / .3); }.ritual-drift header { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 7px; margin-right: auto; }.ritual-drift header > .material-symbols-outlined { color: var(--ritual-strong); }.ritual-drift header > span { display: grid; place-items: initial; gap: 1px; width: auto; height: auto; border-radius: 0; background: transparent; }.ritual-drift header strong { font-size: 8px; }.ritual-drift header small { color: var(--ritual-muted); font-size: 6px; }.ritual-drift > span { display: flex; align-items: center; gap: 4px; padding: 5px 7px; border-radius: 9px; background: rgb(var(--sky-50) / .6); font-size: 6px; }.ritual-drift > span .material-symbols-outlined { font-size: 12px; }.ritual-drift > p { margin: 0; color: var(--ritual-muted); font-size: 7px; }
.ritual-priority-review .ritual-priority-axis > div { gap: 4px; }.ritual-priority-review .ritual-priority-axis button { width: 21px; height: 21px; }
.ritual-journal { display: block; max-width: none; margin: 0; }.ritual-final-actions { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }.ritual-final-actions .ritual-next { min-width: 125px; }.ritual-save-secondary { display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 35px; padding: 0 10px; border: 1px solid rgb(var(--sky-300) / .45); border-radius: 15px 12px 16px 13px; color: var(--ritual-strong); background: rgb(var(--sky-100) / .48); font-size: 7px; font-weight: 850; white-space: nowrap; cursor: pointer; }.ritual-stage__footer { grid-template-columns: 120px minmax(80px, 1fr) auto; }.ritual-stage__footer > .ritual-footer-progress { display: grid; justify-items: center; gap: 3px; }.ritual-footer-progress > span { display: flex; gap: 5px; }.ritual-footer-progress small { display: flex; align-items: center; gap: 3px; color: var(--ritual-muted); font-size: 5.5px; }.ritual-footer-progress small .material-symbols-outlined { color: var(--ritual-blue); font-size: 11px; }

.ritual-period-picture { gap: 11px; }
.ritual-picture-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.ritual-picture-facts article { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 9px 11px; border: 1px solid rgb(var(--neo-border) / .11); border-radius: 15px 12px 16px 13px; background: rgb(var(--sky-50) / .42); }
.ritual-picture-facts article > .material-symbols-outlined { flex: 0 0 auto; color: var(--ritual-strong); font-size: 19px; }
.ritual-picture-facts article > span { display: grid; min-width: 0; }
.ritual-picture-facts strong { font-size: 11px; }
.ritual-picture-facts small { overflow: hidden; color: var(--ritual-muted); font-size: 6px; text-overflow: ellipsis; white-space: nowrap; }
.ritual-picture-legend { display: flex; align-items: center; gap: 12px; color: var(--ritual-muted); font-size: 6px; }
.ritual-picture-legend > span { display: flex; align-items: center; gap: 4px; }
.ritual-picture-legend > small { margin-left: auto; color: var(--ritual-muted); font-size: 6px; }
.ritual-picture-legend i { display: grid; place-items: center; width: 13px; height: 13px; border: 1px dashed rgb(var(--sky-300)); border-radius: 50%; }
.ritual-picture-legend i.planned { border-style: solid; background: rgb(var(--sky-200) / .72); }
.ritual-picture-legend i.completed { border-style: solid; background: rgb(var(--sky-200) / .72); }
.ritual-picture-legend i.completed b { width: 5px; height: 5px; border-radius: 50%; background: rgb(var(--sky-700)); }
.ritual-day-strip { gap: 7px; }
.ritual-day-strip button { align-content: start; gap: 5px; min-height: 119px; padding: 9px 6px; }
.ritual-day-strip button > span { display: flex; align-items: baseline; gap: 4px; }
.ritual-day-strip button > span b { color: var(--ritual-muted); font-size: 6px; }
.ritual-day-strip button > i { width: 31px; height: 31px; border: 1px dashed rgb(var(--sky-300) / .7); background: transparent; }
.ritual-day-strip button > i.planned { border-style: solid; background: rgb(var(--sky-200) / .65); }
.ritual-day-strip button > i.completed b { width: 12px; height: 12px; }
.ritual-day-strip button > strong { margin-top: 2px; color: var(--ritual-ink); font-size: 9px; }
.ritual-day-strip button > small { color: var(--ritual-muted); font-size: 5px; }
.ritual-day-strip button > em { display: grid; gap: 4px; width: 168px; text-align: left; }
.ritual-day-strip button > em span { display: flex; align-items: center; gap: 4px; }
.ritual-day-strip button > em .material-symbols-outlined { color: var(--ritual-strong); font-size: 12px; }
.ritual-picture-next { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 10px 12px; border: 1px dashed rgb(var(--sky-300) / .46); border-radius: 16px 13px 17px 14px; background: rgb(var(--sky-100) / .28); }
.ritual-picture-next > .material-symbols-outlined { color: var(--ritual-strong); }
.ritual-picture-next > .material-symbols-outlined:last-child { color: var(--ritual-blue); font-size: 15px; }
.ritual-picture-next > span { display: grid; gap: 1px; }
.ritual-picture-next strong { font-size: 8px; }
.ritual-picture-next small { color: var(--ritual-muted); font-size: 6.5px; line-height: 1.35; }

.ritual-plan-review { display: grid; align-content: start; gap: 11px; max-width: 900px; margin: 0 auto; }
.ritual-plan-review__status { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 13px 15px; border-radius: 20px 16px 21px 17px; background: rgb(var(--color-primary-soft) / .46); }
.ritual-plan-review__status.warning { background: rgb(var(--rose-100) / .4); }
.ritual-plan-review__status > span { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .72); }
.ritual-plan-review__status.warning > span { color: rgb(var(--rose-700)); background: rgb(var(--rose-200) / .62); }
.ritual-plan-review__status > div { display: grid; gap: 1px; min-width: 0; }
.ritual-plan-review__status small { color: var(--ritual-muted); font-size: 6px; }
.ritual-plan-review__status > div > small { color: var(--ritual-blue); font-weight: 900; letter-spacing: .12em; }
.ritual-plan-review__status h2 { margin: 0; font-size: 14px; }
.ritual-plan-review__status p { margin: 0; color: var(--ritual-muted); font-size: 7px; line-height: 1.35; }
.ritual-plan-review__status > button { display: flex; align-items: center; gap: 5px; min-height: 31px; padding: 0 10px; border: 0; border-radius: 13px 10px 14px 11px; color: var(--ritual-strong); background: rgb(var(--sky-50) / .65); font-size: 7px; font-weight: 850; cursor: pointer; }
.ritual-plan-review__status > button .material-symbols-outlined { font-size: 14px; }
.ritual-plan-review__layout { display: grid; grid-template-columns: minmax(0, 1.42fr) minmax(245px, .74fr); gap: 10px; }
.ritual-plan-review__objects, .ritual-plan-review__rhythm { display: grid; align-content: start; gap: 6px; padding: 10px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 18px 15px 19px 16px; background: var(--ritual-paper); }
.ritual-plan-review__objects > header, .ritual-plan-review__rhythm > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px 4px; border-bottom: 1px dashed rgb(var(--sky-300) / .34); }
.ritual-plan-review__objects > header span, .ritual-plan-review__rhythm > header span { color: var(--ritual-strong); font-size: 7px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.ritual-plan-review__objects > header small, .ritual-plan-review__rhythm > header small { color: var(--ritual-muted); font-size: 6px; }
.ritual-plan-review__objects article { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(90px, auto); align-items: center; gap: 7px; min-height: 41px; padding: 6px 7px; border-radius: 12px 10px 13px 11px; background: rgb(var(--sky-50) / .42); }
.ritual-plan-review__objects article > span { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 50%; color: var(--ritual-strong); background: rgb(var(--sky-200) / .66); }
.ritual-plan-review__objects article > span .material-symbols-outlined { font-size: 16px; }
.ritual-plan-review__objects article > div { display: grid; min-width: 0; }
.ritual-plan-review__objects article strong { overflow: hidden; font-size: 7.5px; text-overflow: ellipsis; white-space: nowrap; }
.ritual-plan-review__objects article small { overflow: hidden; color: var(--ritual-muted); font-size: 5.5px; text-overflow: ellipsis; white-space: nowrap; }
.ritual-plan-review__objects article > p { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 3px; margin: 0; }
.ritual-plan-review__objects article > p i, .ritual-plan-review__objects article > p em { padding: 3px 5px; border-radius: 7px; color: var(--ritual-strong); background: rgb(var(--sky-200) / .64); font-size: 5.5px; font-style: normal; font-weight: 850; }
.ritual-plan-review__objects article > p em { color: rgb(var(--rose-700)); background: rgb(var(--rose-100) / .6); }
.ritual-plan-review__directions article { grid-template-columns: auto minmax(0, 1fr) 72px; }
.ritual-plan-review__rhythm > div { display: grid; grid-template-columns: repeat(7, 1fr); align-items: end; gap: 5px; min-height: 91px; padding: 4px 1px 0; }
.ritual-plan-review--month .ritual-plan-review__rhythm > div { grid-template-columns: repeat(5, 1fr); }
.ritual-plan-review__rhythm > div > span { display: grid; grid-template-rows: auto 58px auto; justify-items: center; gap: 3px; min-width: 0; }
.ritual-plan-review__rhythm > div strong { color: var(--ritual-strong); font-size: 6.5px; }
.ritual-plan-review__rhythm > div i { display: flex; align-items: end; width: 16px; height: 58px; overflow: hidden; border-radius: 8px 8px 4px 4px; background: rgb(var(--sky-100) / .6); }
.ritual-plan-review__rhythm > div i b { display: block; width: 100%; max-height: 100%; border-radius: inherit; background: rgb(var(--sky-500) / .72); }
.ritual-plan-review__rhythm > div small { color: var(--ritual-muted); font-size: 5.5px; }
.ritual-plan-review__rhythm > p { display: flex; align-items: center; gap: 6px; margin: 0; padding: 7px 8px; border-radius: 11px 9px 12px 10px; background: rgb(var(--sky-100) / .44); }
.ritual-plan-review__rhythm > p > .material-symbols-outlined { color: var(--ritual-strong); font-size: 15px; }
.ritual-plan-review__rhythm > p > span { display: grid; min-width: 0; }
.ritual-plan-review__rhythm > p strong { font-size: 6.5px; }
.ritual-plan-review__rhythm > p small { overflow: hidden; color: var(--ritual-muted); font-size: 5.5px; text-overflow: ellipsis; white-space: nowrap; }
.ritual-plan-review__checks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.ritual-plan-review__checks > span { display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 5px; padding: 8px 10px; border-radius: 14px 11px 15px 12px; background: rgb(var(--sky-100) / .4); }
.ritual-plan-review__checks .material-symbols-outlined { color: var(--ritual-strong); font-size: 17px; }
.ritual-plan-review__checks strong { font-size: 9px; }
.ritual-plan-review__checks small { color: var(--ritual-muted); font-size: 6px; }
@media (prefers-reduced-motion: reduce) { .sketch-ritual button { transition: none; } }
</style>
