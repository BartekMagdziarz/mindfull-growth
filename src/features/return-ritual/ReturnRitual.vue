<template>
  <QuietRitualShell
    scale="week"
    eyebrow="Powrót"
    :period-title="brk ? `po ${breakLengthLabel(brk.days, brk.weeks.length)}` : '…'"
    :steps="steps"
    :current="current"
    :wide="currentStepId === 'tidy'"
    :saving="isSaving"
    :finished="saved"
    :status-label="saved ? 'Zapisano' : 'Szkic · zapis przy „Start”'"
    finish-label="Start"
    finished-label="Zrobione"
    @close="emit('close')"
    @go="go"
    @finish="handleFinish"
  >
    <p v-if="loading" class="qr-empty" role="status">Sprawdzam, co się nazbierało…</p>
    <p v-else-if="loadError" class="qr-mutation-error" role="alert">
      Nie udało się wczytać: {{ loadError }}
    </p>
    <section v-else-if="!inventory" class="qr-focus rr-step">
      <p class="qr-empty">Nie ma teraz żadnej przerwy do uporządkowania.</p>
      <RouterLink :to="{ name: 'today' }" class="qr-primary">Dzisiaj</RouterLink>
    </section>

    <template v-else>
      <!-- 1 · Co minęło -->
      <section v-if="currentStepId === 'gone'" class="qr-focus rr-step">
        <p class="rr-lead">
          Ostatni zapis <strong>{{ formatDayShort(inventory.break.lastSignalDay, 'pl-PL') }}</strong
          >, od tego czasu
          <strong>{{ breakLengthLabel(inventory.break.days, inventory.break.weeks.length) }}</strong
          ><template v-if="inventory.break.crossedYear"> i początek nowego roku</template
          ><template v-else-if="inventory.break.crossedMonth"> i początek miesiąca</template>.
          Tygodnie przerwy zostaną w historii jako nieplanowane, chyba że niżej zdecydujesz inaczej.
        </p>
        <textarea
          v-model="plan.note"
          rows="3"
          aria-label="Co się działo"
          placeholder="Co się działo? Jedno, dwa zdania — zostaną w dzienniku. Można pominąć."
          data-testid="return-note"
        />
      </section>

      <!-- 2 · Porządki -->
      <section v-else-if="currentStepId === 'tidy'" class="rr-step">
        <div class="rr-section">
          <h2>
            Co zachować
            <small
              >Zaznaczone tygodnie zostają w planie jak zaplanowane; reszta znika z planów. Kropka =
              był w planie.</small
            >
          </h2>
          <p v-if="!inventory.subjects.length" class="qr-empty">
            Nie masz otwartych nawyków, rezultatów ani trackerów.
          </p>
          <ReturnKeepMatrix
            v-else
            :inventory="inventory"
            :plan="plan"
            @toggle="toggleKeep"
            @row-keep="setRowKeep"
          />
        </div>

        <div v-if="keptWeeks.length" class="rr-section">
          <h2>
            Uzupełnij
            <small
              >Dysk = dzień zaplanowany, obok wykonanie. Pusty zaplanowany dzień znaczy: było w
              planie, nie zrobione.</small
            >
          </h2>
          <ReturnWeekEditor
            :weeks="keptWeeks"
            :subjects-by-key="subjectsByKey"
            :target-value="baseTargetValue"
            @planned-toggle="togglePlannedDay"
            @entry="setEntry"
            @done="markPlannedDone"
            @target="setTargetValue"
          />
        </div>

        <div v-if="hasOtherRows" class="rr-section">
          <h2>Pozostałe</h2>
          <div class="rr-rows">
            <div v-if="inventory.staleIntentions.length" class="rr-row">
              <AppIcon name="gps_fixed" />
              <span class="rr-row__text">
                <strong>Intencje z minionych tygodni</strong>
                <small>{{ intentionsLine }}</small>
              </span>
              <span class="rr-seg" role="radiogroup" aria-label="Intencje z minionych tygodni">
                <button
                  type="button"
                  role="radio"
                  :aria-checked="retireAll"
                  data-testid="return-intentions-retire"
                  @click="retireAll = true"
                >
                  Zamknij
                </button>
                <button
                  type="button"
                  role="radio"
                  :aria-checked="!retireAll"
                  @click="retireAll = false"
                >
                  Zostaw
                </button>
              </span>
            </div>
            <div v-if="inventory.overduePlanItems.length" class="rr-row">
              <AppIcon name="event_repeat" />
              <span class="rr-row__text">
                <strong>Praktyki i powtórki po terminie</strong>
                <small>Minione pozycje planu; dzisiejsze zostają.</small>
              </span>
              <span class="rr-seg" role="radiogroup" aria-label="Praktyki po terminie">
                <button
                  type="button"
                  role="radio"
                  :aria-checked="skipAll"
                  data-testid="return-plans-skip"
                  @click="skipAll = true"
                >
                  Pomiń minione
                </button>
                <button
                  type="button"
                  role="radio"
                  :aria-checked="!skipAll"
                  @click="skipAll = false"
                >
                  Zostaw
                </button>
              </span>
            </div>
            <div
              v-for="enrollment in inventory.activeEnrollments"
              :key="enrollment.id"
              class="rr-row"
              :data-testid="`return-enrollment-${enrollment.id}`"
            >
              <AppIcon name="play_arrow" />
              <span class="rr-row__text">
                <strong>{{ programTitle(enrollment.programSlug) }}</strong>
                <small
                  >Tygodnie ścieżki są kalendarzowe: wracasz tam, gdzie {{ gender.endVerb }}.</small
                >
              </span>
              <span
                class="rr-seg"
                role="radiogroup"
                :aria-label="programTitle(enrollment.programSlug)"
              >
                <button
                  v-for="option in ENROLLMENT_OPTIONS"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-checked="(plan.enrollments[enrollment.id] ?? 'continue') === option.value"
                  @click="setEnrollment(enrollment.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </span>
            </div>
            <div
              v-for="goal in inventory.overdueGoals"
              :key="goal.id"
              class="rr-row"
              :data-testid="`return-goal-${goal.id}`"
            >
              <AppIcon :name="goal.icon || 'flag'" />
              <span class="rr-row__text">
                <strong>{{ goal.title }}</strong>
                <small
                  >Termin {{ formatDayShort(goal.targetDate as DayRef, 'pl-PL') }} minął w czasie
                  przerwy · przesunięcie: {{ shiftedDateLabel(goal.targetDate) }}</small
                >
              </span>
              <span class="rr-seg" role="radiogroup" :aria-label="goal.title">
                <button
                  v-for="option in GOAL_OPTIONS"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-checked="(plan.goals[goal.id] ?? 'keep') === option.value"
                  @click="setGoal(goal.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 3 · Na nowo -->
      <section v-else-if="currentStepId === 'anew'" class="qr-focus rr-step">
        <p v-if="!inventory.subjects.length" class="qr-empty">
          Nie masz otwartych nawyków, rezultatów ani trackerów. Nowe rzeczy ułożysz w pomocniku
          planowania.
        </p>
        <div v-else class="rr-rows" role="group" aria-label="Co wraca od tego tygodnia">
          <button
            v-for="subject in inventory.subjects"
            :key="subjectKeyOf(subject)"
            type="button"
            class="rr-row rr-row--pick"
            :class="{ 'is-on': plan.resume[subjectKeyOf(subject)] }"
            role="checkbox"
            :aria-checked="Boolean(plan.resume[subjectKeyOf(subject)])"
            :data-testid="`return-resume-${subject.subject.id}`"
            @click="toggleResume(subjectKeyOf(subject))"
          >
            <span class="qr-check"
              ><AppIcon v-if="plan.resume[subjectKeyOf(subject)]" name="check"
            /></span>
            <AppIcon :name="subjectIcon(subject)" />
            <span class="rr-row__text">
              <strong>{{ subject.subject.title }}</strong>
              <small>{{ subjectLine(subject) }}</small>
            </span>
          </button>
        </div>
        <div class="rr-switch-row">
          <button
            type="button"
            class="mg-v2-switch"
            role="switch"
            :aria-checked="plan.gentleWeek"
            aria-label="Łagodny pierwszy tydzień"
            data-testid="return-gentle"
            @click="plan.gentleWeek = !plan.gentleWeek"
          />
          <span>
            <strong>Łagodny pierwszy tydzień</strong>
            <small
              >Targety o połowę niższe tylko w tym tygodniu; oceny i checklisty bez zmian.</small
            >
          </span>
        </div>
        <p class="rr-lead">
          Odznaczone nie planują się w tym miesiącu, ale zostają w bibliotece. Nowe rzeczy ułożysz w
          <RouterLink :to="{ name: 'planning-assistant' }">pomocniku planowania</RouterLink>.
        </p>
      </section>

      <!-- 4 · Start -->
      <section v-else class="qr-focus rr-step">
        <ul class="rr-summary" data-testid="return-summary">
          <li v-for="line in summaryLines" :key="line"><AppIcon name="check" />{{ line }}</li>
        </ul>
        <p v-if="saveError" class="qr-mutation-error" role="alert">
          Nie udało się zapisać: {{ saveError }}
        </p>
        <div v-if="saved" class="rr-after" data-testid="return-after">
          <RouterLink :to="{ name: 'today' }" class="qr-primary">Dzisiaj</RouterLink>
          <RouterLink :to="weekRitualRoute" class="qr-quiet">Zaplanuj tydzień</RouterLink>
          <RouterLink :to="{ name: 'planning-assistant' }" class="qr-quiet">Ułóżmy plan</RouterLink>
          <button
            v-if="store.canUndo"
            type="button"
            class="qr-quiet"
            data-testid="return-undo"
            @click="handleUndo"
          >
            <AppIcon name="undo" />Cofnij porządki
          </button>
        </div>
      </section>
    </template>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getProgramDefinition } from '@/data/programCatalog'
import type { DayRef } from '@/domain/period'
import {
  subjectKey,
  type ReturnEnrollmentChoice,
  type ReturnGoalChoice,
  type ReturnPlanSummary,
  type ReturnSubjectSummary,
} from '@/domain/returnRitual'
import QuietRitualShell from '@/features/quiet-ritual/QuietRitualShell.vue'
import { plural } from '@/features/quiet-ritual/quietRitualModel'
import { formatDayShort } from '@/utils/periodLabels'
import ReturnKeepMatrix from './ReturnKeepMatrix.vue'
import ReturnWeekEditor from './ReturnWeekEditor.vue'
import { breakLengthLabel, subjectIcon, useReturnRitual } from './useReturnRitual'

const emit = defineEmits<{ close: []; finished: [summary: ReturnPlanSummary] }>()

const ritual = useReturnRitual()
const {
  store,
  plan,
  inventory,
  loading,
  loadError,
  brk,
  steps,
  current,
  currentStepId,
  subjectsByKey,
  keptWeeks,
  isSaving,
  saved,
  saveError,
  summary,
  previewSummary,
  retireAll,
  skipAll,
  load,
  go,
  toggleKeep,
  setRowKeep,
  togglePlannedDay,
  setEntry,
  markPlannedDone,
  setTargetValue,
  baseTargetValue,
  setEnrollment,
  setGoal,
  shiftedDateLabel,
  toggleResume,
  finish,
  undo,
} = ritual

const { t, gender: grammaticalGender } = useT()
const gender = computed(() => ({
  endVerb: grammaticalGender.value === 'feminine' ? 'skończyłaś' : 'skończyłeś',
}))

const ENROLLMENT_OPTIONS: { value: ReturnEnrollmentChoice; label: string }[] = [
  { value: 'continue', label: 'Kontynuuj' },
  { value: 'pause', label: 'Wstrzymaj' },
  { value: 'abandon', label: 'Zakończ' },
]
const GOAL_OPTIONS: { value: ReturnGoalChoice; label: string }[] = [
  { value: 'keep', label: 'Zostaw' },
  { value: 'shift', label: 'Przesuń o przerwę' },
  { value: 'later', label: 'Zamknij później' },
]

const hasOtherRows = computed(
  () =>
    Boolean(inventory.value) &&
    (inventory.value!.staleIntentions.length > 0 ||
      inventory.value!.overduePlanItems.length > 0 ||
      inventory.value!.activeEnrollments.length > 0 ||
      inventory.value!.overdueGoals.length > 0)
)

const intentionsLine = computed(() => {
  const count = inventory.value?.staleIntentions.length ?? 0
  return `${count} ${plural(count, 'intencja', 'intencje', 'intencji')}, które nie doczekały swojego tygodnia.`
})

function programTitle(slug: string): string {
  const program = getProgramDefinition(slug)
  return program ? t(`${program.i18nKey}.title`) : slug
}

function subjectKeyOf(subject: ReturnSubjectSummary): string {
  return subjectKey({ subjectType: subject.subjectType, subjectId: subject.subject.id })
}

function subjectLine(subject: ReturnSubjectSummary): string {
  if (subject.aliveBeforeBreak && subject.lastEntryDay) {
    return `żył przed przerwą · ostatni wpis ${formatDayShort(subject.lastEntryDay, 'pl-PL')}`
  }
  if (subject.lastEntryDay) return `cicho od ${formatDayShort(subject.lastEntryDay, 'pl-PL')}`
  return 'bez wpisów'
}

const summaryLines = computed<string[]>(() => {
  const s = summary.value ?? previewSummary.value
  if (!s) return []
  const lines: string[] = []
  if (s.weeksSkipped)
    lines.push(
      `${s.weeksSkipped} ${plural(s.weeksSkipped, 'tydzień znika', 'tygodnie znikają', 'tygodni znika')} z planów.`
    )
  if (s.weeksKept)
    lines.push(
      `${s.weeksKept} ${plural(s.weeksKept, 'tydzień zostaje', 'tygodnie zostają', 'tygodni zostaje')} w planie` +
        (s.entriesFilled
          ? `, ${s.entriesFilled} ${plural(s.entriesFilled, 'wpis', 'wpisy', 'wpisów')} uzupełnione.`
          : '.')
    )
  if (s.intentionsRetired)
    lines.push(
      `${s.intentionsRetired} ${plural(s.intentionsRetired, 'intencja zamknięta', 'intencje zamknięte', 'intencji zamkniętych')}.`
    )
  if (s.planItemsSkipped)
    lines.push(
      `${s.planItemsSkipped} ${plural(s.planItemsSkipped, 'minioną praktykę pomijamy', 'minione praktyki pomijamy', 'minionych praktyk pomijamy')}.`
    )
  if (s.enrollmentsPaused) lines.push('Ścieżka wstrzymana.')
  if (s.enrollmentsClosed) lines.push('Ścieżka zakończona.')
  if (s.goalsShifted)
    lines.push(
      `${s.goalsShifted} ${plural(s.goalsShifted, 'cel dostaje', 'cele dostają', 'celów dostaje')} nowy termin.`
    )
  lines.push(
    s.subjectsResumed
      ? `Od tego tygodnia wraca ${s.subjectsResumed} ${plural(s.subjectsResumed, 'rzecz', 'rzeczy', 'rzeczy')}` +
          (s.subjectsParked ? `, ${s.subjectsParked} czeka do następnego miesiąca.` : '.')
      : 'Nic nie wraca od tego tygodnia; wszystko czeka do następnego miesiąca.'
  )
  if (s.gentleWeek) lines.push('Pierwszy tydzień łagodny: targety o połowę niższe.')
  if (plan.note.trim()) lines.push('Notatka trafi do dziennika.')
  return lines
})

const weekRitualRoute = computed(() => ({
  name: 'calendar-week',
  params: { weekRef: inventory.value?.currentWeekRef ?? '' },
  query: { action: 'plan' },
}))

async function handleFinish(): Promise<void> {
  if (saved.value) {
    emit('finished', summary.value!)
    return
  }
  const result = await finish()
  if (result) emit('finished', result)
}

async function handleUndo(): Promise<void> {
  await undo()
}

onMounted(() => {
  void load()
})
</script>

<style src="./return-ritual.css"></style>
