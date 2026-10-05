<template>
  <QuietRitualShell
    scale="week"
    eyebrow="Podsumowanie celu"
    :period-title="goal?.title ?? '…'"
    :steps="steps"
    :current="current"
    :count="currentStepId === 'verdict' ? windowLabel : currentStepId === 'mirror' ? mirrorLabel : ''"
    :saving="isSaving"
    :finished="saved"
    :status-label="saved ? 'Zamknięty' : editing ? 'Edycja podsumowania' : 'Szkic · zapis przy „Zamknij cel”'"
    finish-label="Zamknij cel"
    finished-label="Zamknięty"
    :alternate-label="editing ? undefined : 'Zamknij bez wniosków'"
    @close="emit('close')"
    @go="go"
    @finish="handleFinish"
    @alternate="handleFinishQuick"
  >
    <p v-if="loading" class="qr-empty" role="status">Zbieram fakty o celu…</p>
    <p v-else-if="loadError" class="qr-mutation-error" role="alert">Nie udało się wczytać celu: {{ loadError }}</p>

    <template v-else-if="goal && snapshot">
      <!-- 1 · Facts and verdict -->
      <section v-if="currentStepId === 'verdict'" class="qr-focus gc-step">
        <template v-if="snapshot.keyResultSnapshots.length">
          <div
            v-for="table in factTables"
            :key="table.key"
            class="gc-table"
            :class="`gc-table--${table.key}`"
            role="table"
            :aria-label="table.ariaLabel"
            :style="{ '--gc-col-count': table.columns.length }"
          >
            <div class="gc-table-head" role="row">
              <span role="columnheader">{{ table.heading }}</span>
              <span
                v-for="column in table.columns"
                :key="column.ref"
                role="columnheader"
                :title="column.title"
                :aria-label="column.title"
              >{{ column.label }}</span>
              <span role="columnheader" aria-label="Łącznie">Σ</span>
            </div>
            <div v-for="row in table.rows" :key="row.item.id" class="gc-table-row" role="row">
              <span class="gc-row-name" role="cell">
                <AppIcon name="flag" />
                <span><strong :title="row.item.title">{{ row.item.title }}</strong><small>{{ describeKeyResult(row.item) }}</small></span>
              </span>
              <span
                v-for="cell in row.cells"
                :key="cell.ref"
                class="gc-cell"
                role="cell"
                :title="`${cell.title}: ${PERIOD_STATE_LABEL[cell.state]}`"
              >
                <template v-if="cell.state !== 'unplanned'">
                  <i class="gc-dot" :class="`gc-dot--${cell.state}`" />
                  <span class="sr-only">{{ PERIOD_STATE_LABEL[cell.state] }}</span>
                </template>
                <span v-else class="sr-only">{{ PERIOD_STATE_LABEL[cell.state] }}</span>
              </span>
              <span class="gc-result" role="cell">
                <b>{{ row.item.lastReadout ?? '—' }}</b>
                <small v-if="row.item.evaluation !== 'no-data'">{{ row.item.evaluation === 'met' ? 'osiągnięty' : 'nieosiągnięty' }}</small>
              </span>
            </div>
          </div>
        </template>
        <p v-else class="qr-empty">Ten cel nie ma rezultatów kluczowych w planie — werdykt bez podpowiedzi.</p>

        <p class="gc-facts">
          <span><b>{{ snapshot.weeksPlanned }}</b> {{ plural(snapshot.weeksPlanned, 'tydzień', 'tygodnie', 'tygodni') }} w planie</span>
          <span v-if="snapshot.keyResultSnapshots.length"><b>{{ metCount }}</b> z {{ snapshot.keyResultSnapshots.length }} {{ plural(snapshot.keyResultSnapshots.length, 'rezultatu', 'rezultatów', 'rezultatów') }} {{ metCount === 1 ? 'osiągnięty' : 'osiągnięte' }}</span>
          <span v-for="note in hiddenNotes" :key="note">{{ note }}</span>
        </p>

        <div class="qr-choices gc-choices" role="radiogroup" aria-label="Wynik celu">
          <div
            v-for="option in outcomeOptions"
            :key="option.value"
            class="qr-choice"
            :class="{ selected: outcome === option.value }"
          >
            <button
              type="button"
              class="qr-choice-pick"
              role="radio"
              :aria-checked="outcome === option.value"
              @click="outcome = option.value"
            >
              <span class="qr-check"><AppIcon v-if="outcome === option.value" name="check" /></span>
              <span>
                <strong>{{ option.title }}<em v-if="suggestion === option.value && !editing" class="gc-hint">podpowiedź</em></strong>
                <small>{{ option.hint }}</small>
              </span>
            </button>
          </div>
        </div>

        <div v-if="!editing" class="gc-deadline">
          <button type="button" class="qr-quiet" :aria-expanded="deadlineOpen" @click="deadlineOpen = !deadlineOpen">
            <AppIcon name="event_upcoming" />To jeszcze nie koniec · <b>Przesuń termin</b>
          </button>
          <div v-if="deadlineOpen" class="gc-deadline-form" role="group" aria-label="Przesunięcie terminu celu">
            <label>
              <span>Nowy termin</span>
              <input v-model="deadlineDate" type="date" :min="todayRef" />
            </label>
            <button type="button" class="qr-primary" :disabled="isSaving" @click="handleMoveDeadline">Przesuń termin</button>
            <p>Cel zostaje otwarty, bez podsumowania. Miesiące do nowej daty zostaną dopięte do planu.</p>
          </div>
        </div>

        <details class="qr-help">
          <summary aria-label="Jak czytać wyniki?">?</summary>
          <p>
            Każda kropka to jeden okres, do którego rezultat był przypisany: tydzień dla rezultatów tygodniowych,
            miesiąc dla miesięcznych. Kolumny to okresy, w których przypisany był choć jeden rezultat; puste pole =
            rezultat nie był wtedy przypisany. Wypełniona = osiągnięty, różowy obrys = nieosiągnięty, niebieski obrys
            = przypisany bez zapisów, przerywany obrys = okres jeszcze trwa i nie liczy się do wyniku. Tydzień na
            przełomie miesięcy liczy się raz. Podpowiedź wyniku bierze pod uwagę tylko rezultaty, które miały dane.
          </p>
        </details>
      </section>

      <!-- 2 · Mirror of the start -->
      <section v-else-if="currentStepId === 'mirror'" class="qr-focus gc-step">
        <div v-if="goal.successDefinition" class="gc-mirror">
          <div class="gc-then">
            <b>Definicja sukcesu</b>
            <q>{{ goal.successDefinition }}</q>
          </div>
          <div class="gc-now">
            <span class="gc-label">Czy to się wydarzyło?</span>
            <div class="gc-seg" role="radiogroup" aria-label="Czy definicja sukcesu się spełniła?">
              <button
                v-for="option in SUCCESS_OPTIONS"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="draft.successMet === option.value"
                :class="{ on: draft.successMet === option.value }"
                @click="draft.successMet = draft.successMet === option.value ? null : option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <textarea v-model="draft.successNote" rows="2" aria-label="Komentarz do definicji sukcesu" placeholder="Jedno zdanie, jeśli trzeba" />
          </div>
        </div>

        <div v-if="goal.confidenceRating !== undefined" class="gc-mirror">
          <div class="gc-then">
            <b>Pewność na starcie · {{ goal.confidenceRating }}/10</b>
            <q v-if="goal.achievabilityRationale">{{ goal.achievabilityRationale }}</q>
            <small v-else>Bez uzasadnienia w kreatorze.</small>
          </div>
          <div class="gc-now">
            <span class="gc-label">Z dzisiejszej perspektywy: jaka pewność była uzasadniona?</span>
            <div class="gc-scale" role="radiogroup" aria-label="Pewność z perspektywy czasu">
              <button
                v-for="value in 10"
                :key="value"
                type="button"
                role="radio"
                :aria-checked="draft.confidenceInHindsight === value"
                :aria-label="`${value} z 10`"
                :title="`${value}/10`"
                :class="{
                  now: draft.confidenceInHindsight !== null && value <= draft.confidenceInHindsight,
                  then: value <= goal.confidenceRating,
                }"
                @click="draft.confidenceInHindsight = draft.confidenceInHindsight === value ? null : value"
              />
              <small>wtedy {{ goal.confidenceRating }}<template v-if="draft.confidenceInHindsight !== null"> · dziś {{ draft.confidenceInHindsight }}</template></small>
            </div>
            <textarea v-model="draft.confidenceNote" rows="2" aria-label="Komentarz do pewności" :placeholder="masculine ? 'Co dziś powiedziałbyś sobie z tamtego dnia?' : 'Co dziś powiedziałabyś sobie z tamtego dnia?'" />
          </div>
        </div>

        <div v-if="goal.obstacles" class="gc-mirror">
          <div class="gc-then">
            <b>Przewidywane przeszkody</b>
            <q>{{ goal.obstacles }}</q>
          </div>
          <div class="gc-now">
            <span class="gc-label">Które wystąpiły, a co zaskoczyło?</span>
            <textarea v-model="draft.obstaclesHit" rows="3" aria-label="Przeszkody, które wystąpiły" />
          </div>
        </div>
      </section>

      <!-- 3 · Lessons (same three fields as a priority's closing) -->
      <section v-else-if="currentStepId === 'lessons'" class="qr-focus gc-step gc-step--lessons">
        <label class="gc-field">
          <span class="gc-label">Co działało dobrze</span>
          <textarea v-model="draft.workedWell" rows="3" />
          <small v-if="goal.resources">Na starcie jako zasoby: „{{ goal.resources }}”.</small>
        </label>
        <label class="gc-field">
          <span class="gc-label">Co było trudne</span>
          <textarea v-model="draft.wasDifficult" rows="3" />
        </label>
        <label class="gc-field">
          <span class="gc-label">{{ masculine ? 'Czego się nauczyłem' : 'Czego się nauczyłam' }}</span>
          <textarea v-model="draft.learned" rows="3" />
        </label>
      </section>

      <!-- 4 · What next -->
      <section v-else class="qr-focus gc-step">
        <div class="qr-choices gc-choices gc-choices--2" role="radiogroup" aria-label="Co dalej">
          <div
            v-for="option in FOLLOW_UP_OPTIONS"
            :key="option.value"
            class="qr-choice"
            :class="{ selected: draft.followUpKind === option.value }"
          >
            <button
              type="button"
              class="qr-choice-pick"
              role="radio"
              :aria-checked="draft.followUpKind === option.value"
              @click="draft.followUpKind = draft.followUpKind === option.value ? null : option.value"
            >
              <span class="qr-check"><AppIcon v-if="draft.followUpKind === option.value" name="check" /></span>
              <span><strong>{{ option.title }}</strong><small>{{ option.hint }}</small></span>
            </button>
          </div>
        </div>

        <div v-if="draft.followUpKind === 'habit'" class="gc-sub" role="group" aria-label="Które rezultaty zostają jako nawyki">
          <p v-if="!snapshot.keyResults.length" class="qr-empty">Ten cel nie ma rezultatów do przeniesienia.</p>
          <label v-for="keyResult in snapshot.keyResults" :key="keyResult.id" class="gc-sub-row">
            <input
              type="checkbox"
              :checked="draft.habitKeyResultIds.includes(keyResult.id)"
              @change="toggleHabitKeyResult(keyResult.id)"
            />
            <span><strong>{{ keyResult.title }}</strong><small> · {{ describeKeyResult(keyResult) }} · ten sam priorytet i obszar</small></span>
            <em v-if="draft.habitKeyResultIds.includes(keyResult.id)">→ nawyk</em>
          </label>
        </div>
        <p v-else-if="draft.followUpKind === 'new-goal'" class="gc-note">
          Po zamknięciu wrócisz do biblioteki celów — nowy cel zakładasz tam, w kreatorze.
        </p>

        <textarea v-model="draft.followUpNote" rows="2" aria-label="Notatka o tym, co dalej" placeholder="Jedno zdanie o tym, co dalej (opcjonalnie)" />
        <p v-if="saveError" class="qr-mutation-error" role="alert">Nie udało się zamknąć celu: {{ saveError }}</p>
      </section>
    </template>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { MonthRef } from '@/domain/period'
import type { GoalClosingKeyResultSnapshot, GoalClosingMonthState, GoalFollowUpKind, GoalOutcome, GoalSuccessMet, KeyResult } from '@/domain/planning'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import QuietRitualShell from '@/features/quiet-ritual/QuietRitualShell.vue'
import { formatDay, plural } from '@/features/quiet-ritual/quietRitualModel'
import type { GoalClosingResult } from '@/services/goalClosingService'
import { formatMonthTitle, formatWeekRange } from '@/utils/periodLabels'
import { getPeriodBounds } from '@/utils/periods'
import { GOAL_OUTCOME_ORDER, useGoalClosingRitual } from './useGoalClosingRitual'

const props = defineProps<{
  goalId: string
  /** Pre-selected outcome (the card's status menu passes it). */
  presetOutcome?: GoalOutcome | null
  /** Start with the „Przesuń termin” form open (Najbliżej → „Przesuń termin”). */
  openDeadline?: boolean
}>()

const emit = defineEmits<{
  close: []
  finished: [result: GoalClosingResult]
  moved: [targetDate: string]
}>()

const { gender } = useT()
const masculine = computed(() => gender.value !== 'feminine')

const ritual = useGoalClosingRitual(toRef(props, 'goalId'), {
  presetOutcome: computed(() => props.presetOutcome ?? null),
  masculine,
  openDeadline: computed(() => Boolean(props.openDeadline)),
})
const {
  snapshot, goal, loading, loadError, editing, draft, outcome, suggestion, steps, current, currentStepId,
  months, overdueDays, todayRef, isSaving, saved, saveError, deadlineOpen, deadlineDate,
  go, toggleHabitKeyResult, finish, finishQuick, moveDeadline,
} = ritual

const MAX_VISIBLE_MONTHS = 12
const MAX_VISIBLE_WEEKS = 26
const PERIOD_STATE_LABEL: Record<GoalClosingMonthState, string> = {
  met: 'osiągnięty',
  missed: 'nieosiągnięty',
  'no-data': 'bez zapisów',
  unplanned: 'poza planem',
  ongoing: 'w toku',
}
const OUTCOME_COPY: Record<GoalOutcome, { title: string; hint: string }> = {
  partial: { title: 'Częściowo', hint: 'część rezultatów doszła do skutku' },
  achieved: { title: 'Osiągnięty', hint: 'to, co zdefiniowano, stało się' },
  missed: { title: 'Nieosiągnięty', hint: 'dobiegł końca, ale nie wyszło' },
  abandoned: { title: 'Porzucony', hint: 'świadomie odpuszczony po drodze' },
}
const SUCCESS_OPTIONS: { value: GoalSuccessMet; label: string }[] = [
  { value: 'yes', label: 'Tak' },
  { value: 'partly', label: 'Częściowo' },
  { value: 'no', label: 'Nie' },
]
const FOLLOW_UP_OPTIONS: { value: GoalFollowUpKind; title: string; hint: string }[] = [
  { value: 'habit', title: 'Zostaje nawyk', hint: 'rezultat przechodzi do nawyków' },
  { value: 'new-goal', title: 'Nowy cel', hint: 'kreator z tymi obszarami' },
  { value: 'revisit', title: 'Wrócę do tematu', hint: 'bez planu na teraz' },
  { value: 'none', title: 'Nic', hint: 'temat zamknięty' },
]
const ENTRY_MODE_LABEL: Record<KeyResult['entryMode'], string> = {
  completion: 'wykonanie',
  counter: 'liczba',
  value: 'wartość',
  rating: 'ocena',
  'multi-completion': 'checklista',
}

const outcomeOptions = computed(() => GOAL_OUTCOME_ORDER.map((value) => ({ value, ...OUTCOME_COPY[value] })))
const weeklyItems = computed(() => (snapshot.value?.keyResultSnapshots ?? []).filter((item) => item.weeks))
const monthlyItems = computed(() => (snapshot.value?.keyResultSnapshots ?? []).filter((item) => !item.weeks))

/**
 * The shared axis of each table: only periods at least one key result was
 * assigned to, oldest first — the same week always sits in the same column.
 */
const assignedWeeks = computed(() => {
  const assigned = new Set(
    weeklyItems.value.flatMap((item) => (item.weeks ?? []).filter((week) => week.state !== 'unplanned').map((week) => week.weekRef)),
  )
  return (snapshot.value?.weeks ?? []).filter((weekRef) => assigned.has(weekRef))
})
const assignedMonths = computed(() => {
  const assigned = new Set(
    monthlyItems.value.flatMap((item) => item.months.filter((month) => month.state !== 'unplanned').map((month) => month.monthRef)),
  )
  return months.value.filter((monthRef) => assigned.has(monthRef))
})
const visibleWeeks = computed(() => assignedWeeks.value.slice(-MAX_VISIBLE_WEEKS))
const visibleMonths = computed(() => assignedMonths.value.slice(-MAX_VISIBLE_MONTHS))

interface FactColumn { ref: string; label: string; title: string }
interface FactTable {
  key: 'weekly' | 'monthly'
  heading: string
  ariaLabel: string
  columns: FactColumn[]
  rows: { item: GoalClosingKeyResultSnapshot; cells: (FactColumn & { state: GoalClosingMonthState })[] }[]
}

/**
 * One table per cadence, each on its own time axis: weekly key results week by
 * week, monthly ones month by month. A weekly result never collapses into
 * months; a row shows a dot only where its key result was assigned.
 */
const factTables = computed<FactTable[]>(() => {
  const mixed = weeklyItems.value.length > 0 && monthlyItems.value.length > 0
  const tables: FactTable[] = []
  if (weeklyItems.value.length) {
    const columns = visibleWeeks.value.map((weekRef, index) => {
      const monthRef = getPeriodBounds(weekRef).start.slice(0, 7) as MonthRef
      const previous = visibleWeeks.value[index - 1]
      const monthStarts = !previous || getPeriodBounds(previous).start.slice(0, 7) !== monthRef
      return {
        ref: weekRef,
        label: monthStarts ? monthShort(monthRef) : '',
        title: `Tydzień ${Number(weekRef.slice(-2))} · ${formatWeekRange(weekRef, 'pl-PL')}`,
      }
    })
    tables.push({
      key: 'weekly',
      heading: mixed ? 'Rezultat tygodniowy' : 'Rezultat kluczowy',
      ariaLabel: 'Rezultaty tygodniowe tydzień po tygodniu',
      columns,
      rows: weeklyItems.value.map((item) => ({
        item,
        cells: columns.map((column) => ({
          ...column,
          state: item.weeks?.find((week) => week.weekRef === column.ref)?.state ?? 'unplanned',
        })),
      })),
    })
  }
  if (monthlyItems.value.length) {
    const columns = visibleMonths.value.map((monthRef) => ({
      ref: monthRef,
      label: monthShort(monthRef),
      title: formatMonthTitle(monthRef, 'pl-PL'),
    }))
    tables.push({
      key: 'monthly',
      heading: mixed ? 'Rezultat miesięczny' : 'Rezultat kluczowy',
      ariaLabel: 'Rezultaty miesięczne miesiąc po miesiącu',
      columns,
      rows: monthlyItems.value.map((item) => ({
        item,
        cells: columns.map((column) => ({
          ...column,
          state: item.months.find((month) => month.monthRef === column.ref)?.state ?? 'unplanned',
        })),
      })),
    })
  }
  return tables
})

const hiddenNotes = computed(() => {
  const notes: string[] = []
  if (assignedWeeks.value.length > visibleWeeks.value.length) {
    notes.push(`pokazuję ostatnie ${visibleWeeks.value.length} z ${assignedWeeks.value.length} tygodni`)
  }
  if (assignedMonths.value.length > visibleMonths.value.length) {
    notes.push(`pokazuję ostatnie ${visibleMonths.value.length} z ${assignedMonths.value.length} miesięcy`)
  }
  return notes
})
const metCount = computed(() => snapshot.value?.keyResultSnapshots.filter((item) => item.evaluation === 'met').length ?? 0)

const windowLabel = computed(() => {
  if (!goal.value) return ''
  const start = goal.value.startDate ?? (months.value[0] ? `${months.value[0]}-01` : undefined)
  const parts: string[] = []
  if (start && goal.value.targetDate) parts.push(`${formatDay(start)} → ${formatDay(goal.value.targetDate)}`)
  else if (goal.value.targetDate) parts.push(`termin ${formatDay(goal.value.targetDate)}`)
  const late = overdueDays.value
  if (late !== null && late > 0) parts.push(`${late} ${plural(late, 'dzień', 'dni', 'dni')} po terminie`)
  else if (late === 0) parts.push('termin dziś')
  return parts.join(' · ')
})
const mirrorLabel = computed(() => (goal.value ? `z kreatora · ${formatDay(goal.value.createdAt.slice(0, 10))}` : ''))

function monthShort(monthRef: MonthRef): string {
  return new Intl.DateTimeFormat('pl-PL', { month: 'short' })
    .format(new Date(`${monthRef}-01T12:00:00`))
    .replace(/\.$/, '')
}

function describeKeyResult(item: Pick<KeyResult, 'entryMode' | 'cadence'>): string {
  return `${ENTRY_MODE_LABEL[item.entryMode]} · ${item.cadence === 'weekly' ? 'tygodniowo' : 'miesięcznie'}`
}

async function handleFinish(): Promise<void> {
  const result = await finish()
  if (result) emit('finished', result)
}

async function handleFinishQuick(): Promise<void> {
  const result = await finishQuick()
  if (result) emit('finished', result)
}

async function handleMoveDeadline(): Promise<void> {
  const moved = await moveDeadline()
  if (moved) emit('moved', moved)
}
</script>

<style src="./goal-closing.css"></style>
