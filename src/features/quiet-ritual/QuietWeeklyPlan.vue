<template>
  <QuietRitualShell
    scale="week"
    eyebrow="Plan tygodnia"
    :period-title="periodTitle"
    :steps="steps"
    :current="current"
    :count="current === 0 ? `${selectedKeys.length} ${plural(selectedKeys.length, 'wybrane', 'wybrane', 'wybranych')}` : ''"
    :wide="current === 2"
    :saving="Boolean(planner.savingKey.value) || isSaving"
    finish-label="Zakończ planowanie"
    @close="emit('close')"
    @go="go"
    @finish="emit('close')"
  >
    <!-- 1 · Fokus — what deserves attention this week -->
    <div v-if="current === 0" class="qr-focus">
      <details v-if="monthSupport.length" class="qr-month-context">
        <summary>Wsparcie z planu miesiąca ({{ monthSupport.length }})</summary>
        <button
          v-for="row in monthSupport"
          :key="planner.rowKey(row)"
          type="button"
          class="qr-quiet"
          :aria-pressed="selectedKeys.includes(planner.rowKey(row))"
          @click="toggleFocusRow(row)"
        >
          {{ row.title }}
        </button>
      </details>

      <div class="qr-choices">
        <article
          v-for="candidate in visibleCandidates"
          :key="candidate.key"
          class="qr-choice"
          :class="{ selected: selectedKeys.includes(candidate.key) }"
        >
          <button
            type="button"
            class="qr-choice-pick"
            :aria-pressed="selectedKeys.includes(candidate.key)"
            @click="toggleFocus(candidate.key)"
          >
            <span class="qr-object-icon"><AppIcon :name="candidate.icon" /></span>
            <span>
              <strong>{{ candidate.title }}</strong>
              <small>{{ candidate.targetLabel }}</small>
            </span>
            <span class="qr-check"><AppIcon v-if="selectedKeys.includes(candidate.key)" name="check" /></span>
          </button>
          <button
            v-if="candidate.intention"
            type="button"
            class="qr-icon qr-edit"
            :aria-label="`Edytuj intencję: ${candidate.title}`"
            @click="editIntention(candidate.intention)"
          >
            <AppIcon name="edit" />
          </button>
        </article>
      </div>

      <button
        v-if="restCandidates.length"
        type="button"
        class="qr-quiet"
        :aria-expanded="showAll"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Zwiń listę' : `Pozostałe działania (${restCandidates.length})` }}
        <AppIcon :name="showAll ? 'expand_less' : 'expand_more'" />
      </button>

      <button v-if="!composerOpen" type="button" class="qr-add" @click="openComposer()">
        <AppIcon name="add" />Dodaj intencję
      </button>
      <form v-else class="qr-composer" @submit.prevent="saveIntention">
        <div class="qr-composer-row">
          <label class="qr-name">
            <span>Nazwa intencji</span>
            <input ref="nameInputRef" v-model="intentionTitle" required maxlength="180" />
          </label>
          <label class="qr-times">
            <span>Razy w tygodniu</span>
            <input v-model.number="intentionTimes" type="number" min="1" max="999" required />
          </label>
          <button type="submit" class="qr-primary" :disabled="!intentionTitle.trim() || isSaving">
            {{ editingIntentionId ? 'Zapisz' : 'Dodaj' }}
          </button>
          <button type="button" class="qr-icon" aria-label="Anuluj edycję intencji" @click="composerOpen = false">
            <AppIcon name="close" />
          </button>
        </div>
        <details>
          <summary>Więcej opcji</summary>
          <fieldset>
            <legend>Powiąż z kierunkami</legend>
            <label v-for="priority in priorityOptions" :key="priority.id">
              <input v-model="intentionPriorityIds" type="checkbox" :value="priority.id" />{{ priority.title }}
            </label>
            <p v-if="!priorityOptions.length">Brak aktywnych kierunków w tym miesiącu.</p>
          </fieldset>
          <button v-if="editingIntentionId" type="button" class="qr-quiet" @click="removeIntention(editingIntentionId)">
            <AppIcon name="delete" />Usuń intencję
          </button>
        </details>
      </form>
    </div>

    <!-- 2 · Rytm — where the focus lands in the seven days -->
    <section v-else-if="current === 1" class="qr-planner">
      <div class="qr-table-scroll">
        <div class="qr-table">
          <div class="qr-table-head">
            <span>Fokus tygodnia</span>
            <span v-for="day in days" :key="day.dayRef">{{ day.shortLabel }}<small>{{ day.dayNumber }}</small></span>
            <span>Cel</span>
            <span aria-hidden="true"></span>
          </div>
          <article v-for="row in plannerRows" :key="planner.rowKey(row)" class="qr-plan-row">
            <div class="qr-table-row">
              <span class="qr-row-name">
                <AppIcon :name="row.icon ?? SUBJECT_ICON[row.subjectType]" /><strong>{{ row.title }}</strong>
              </span>
              <button
                v-if="planner.rowSoftKind(row) === 'whole-week'"
                type="button"
                class="qr-whole"
                :aria-label="`Wybierz konkretne dni: ${row.title}`"
                title="Wybierz konkretne dni"
                @click="planner.handleWholeWeekToggle(row)"
              >
                W tym tygodniu · bez terminu<AppIcon name="edit_calendar" />
              </button>
              <template v-else>
                <button
                  v-for="day in days"
                  :key="day.dayRef"
                  type="button"
                  class="qr-day-button"
                  :class="{ soft: planner.dayCellState(row, day.dayRef) === 'soft' }"
                  :aria-label="`${row.title}, ${day.shortLabel} ${day.dayNumber}`"
                  :aria-pressed="planner.dayCellState(row, day.dayRef) !== 'empty'"
                  @click="planner.handleMatrixCellToggle(row, day.dayRef)"
                >
                  <span><i /></span>
                </button>
              </template>
              <button
                type="button"
                class="qr-target"
                :aria-label="`Cel tygodnia: ${row.title}`"
                :title="targetTitle(row)"
                :aria-expanded="targetOpen === planner.rowKey(row)"
                :disabled="!planner.weekTargetEditable(row)"
                @click="targetOpen = targetOpen === planner.rowKey(row) ? null : planner.rowKey(row)"
              >
                {{ planner.editableTarget(row)?.value ?? '—' }}
              </button>
              <div class="qr-row-tools">
                <button
                  type="button"
                  class="qr-quiet qr-flexible"
                  :aria-label="`Bez terminu: ${row.title}`"
                  :aria-pressed="planner.rowSoftKind(row) === 'whole-week'"
                  title="Na ten tydzień, bez konkretnych dni"
                  @click="planner.handleWholeWeekToggle(row)"
                >
                  Bez terminu
                </button>
                <button
                  type="button"
                  class="qr-quiet qr-clear"
                  :disabled="!planner.rowHasWeekPlacement(row)"
                  :aria-label="`Wyczyść dni: ${row.title}`"
                  title="Wyczyść przypisanie"
                  @click="planner.handleRowClear(row)"
                >
                  <AppIcon name="ink_eraser" />
                </button>
              </div>
            </div>
            <div v-if="targetOpen === planner.rowKey(row)" class="qr-target-edit">
              <label>
                Cel na tydzień
                <input
                  type="number"
                  min="0"
                  max="9999"
                  :value="planner.editableTarget(row)?.value ?? 0"
                  @change="onTargetValue(row, $event)"
                />
              </label>
              <details>
                <summary>Więcej opcji</summary>
                <p>{{ targetTitle(row) }}</p>
                <label v-if="planner.editableTarget(row)?.entryDays">
                  Dni z wpisem
                  <input
                    type="number"
                    min="1"
                    max="7"
                    :value="planner.editableTarget(row)?.entryDays?.value ?? 1"
                    @change="onEntryDays(row, $event)"
                  />
                </label>
                <button
                  v-if="planner.hasWeekOverride(row)"
                  type="button"
                  class="qr-quiet"
                  @click="planner.handleClearOverride(row)"
                >
                  <AppIcon name="undo" />Wróć do celu bazowego
                </button>
              </details>
            </div>
          </article>
        </div>
      </div>
      <p v-if="!selectedKeys.length" class="qr-empty">
        Nie wybrano fokusu. <button type="button" class="qr-quiet" @click="go(0)">Wybierz działania</button>
      </p>
      <button type="button" class="qr-quiet" :aria-expanded="showRest" @click="showRest = !showRest">
        {{ showRest ? 'Zwiń pozostałe działania' : 'Pozostałe działania' }}<AppIcon name="expand_more" />
      </button>
    </section>

    <!-- 3 · Przegląd — the week as seven day cards -->
    <section v-else class="qr-review-plan">
      <div class="qr-week-cards" aria-label="Plan na poszczególne dni">
        <article v-for="day in days" :key="day.dayRef" class="qr-day-card">
          <header>
            <h2>{{ day.fullLabel }}<span>{{ day.dayNumber }}</span></h2>
            <button type="button" class="qr-icon" :aria-label="`Zmień plan: ${day.fullLabel}`" @click="go(1)">
              <AppIcon name="edit_calendar" />
            </button>
          </header>
          <QuietPlanGroups
            v-if="dayItems(day.dayRef).length || flexibleItems.length"
            :items="dayItems(day.dayRef)"
            :span-items="flexibleItems"
            :context="day.fullLabel"
            @edit="reviewEdit"
          />
          <p v-else class="qr-day-empty">Bez planów</p>
        </article>
      </div>
      <section v-if="unplaced.length" class="qr-unplaced">
        <h2>Jeszcze nieprzypisane</h2>
        <button
          v-for="row in unplaced"
          :key="planner.rowKey(row)"
          type="button"
          class="qr-quiet"
          @click="reviewEdit(planner.rowKey(row))"
        >
          {{ row.title }}<AppIcon name="arrow_forward" />
        </button>
      </section>
    </section>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Priority, WeeklyIntention } from '@/domain/planning'
import type { WeekTopPriorityRef } from '@/domain/planningState'
import type { PlannerMeasurementRow } from '@/components/calendar/plannerTypes'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import { getActivePrioritiesForMonth } from '@/services/monthlyPriorityService'
import {
  createWeeklyIntention,
  deleteWeeklyIntention,
  listWeeklyIntentions,
  setWeekTopPriorities,
  updateWeeklyIntention,
} from '@/services/weeklyIntentionService'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import { getParentPeriod, getPeriodRefsForDate } from '@/utils/periods'
import QuietPlanGroups, { type QuietPlanGroupItem } from './QuietPlanGroups.vue'
import QuietRitualShell, { type QuietRitualStep } from './QuietRitualShell.vue'
import { SUBJECT_ICON, plural, quietWeekDays, weekRangeTitle } from './quietRitualModel'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: [] }>()

const { t, locale } = useT()
const current = ref(0)
const showAll = ref(false)
const showRest = ref(false)
const targetOpen = ref<string | null>(null)
const isSaving = ref(false)

const composerOpen = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)
const intentionTitle = ref('')
const intentionTimes = ref(1)
const intentionPriorityIds = ref<string[]>([])
const editingIntentionId = ref<string | null>(null)

const selectedKeys = ref<string[]>([])
const intentions = ref<WeeklyIntention[]>([])
const priorityOptions = ref<Priority[]>([])

const weekRefRef = toRef(props, 'weekRef')
const planner = useWeeklyPlannerState(weekRefRef, locale, () => emit('updated'))

const steps: QuietRitualStep[] = [
  { id: 'focus', label: 'Fokus', question: 'Na czym chcesz się skupić?' },
  { id: 'rhythm', label: 'Rytm', question: 'Kiedy znajdziesz na to miejsce?' },
  { id: 'review', label: 'Przegląd', question: 'Czy ten plan jest dla Ciebie?' },
]

const todayDayRef = getPeriodRefsForDate(new Date()).day
const days = computed(() => quietWeekDays(props.weekRef, todayDayRef))
const periodTitle = computed(() => weekRangeTitle(props.weekRef))

interface Candidate {
  key: string
  title: string
  icon: string
  targetLabel: string
  row?: PlannerMeasurementRow
  intention?: WeeklyIntention
}

function rowCandidate(row: PlannerMeasurementRow): Candidate {
  const target = planner.editableTarget(row)
  return {
    key: planner.rowKey(row),
    title: row.title,
    icon: row.icon ?? SUBJECT_ICON[row.subjectType],
    targetLabel: target ? formatMeasurementTargetSummary(target, t) : 'Bez celu',
    row,
    intention: row.subjectType === 'weeklyIntention' ? intentions.value.find(item => item.id === row.id) : undefined,
  }
}

/** Objects already engaged in this week — the quiet first screen. */
const primaryCandidates = computed<Candidate[]>(() => [
  ...planner.engagedKeyResultRows.value.map(rowCandidate),
  ...planner.engagedHabitRows.value.map(rowCandidate),
  ...planner.engagedIntentionRows.value.map(rowCandidate),
])
/** Everything else (dormant weekly objects and observations) waits behind one reveal. */
const restCandidates = computed<Candidate[]>(() => [
  ...planner.dormantRows.value.map(rowCandidate),
  ...planner.engagedTrackerRows.value.map(rowCandidate),
])
const visibleCandidates = computed(() =>
  showAll.value
    ? [...primaryCandidates.value, ...restCandidates.value]
    : [...primaryCandidates.value, ...restCandidates.value.filter(candidate => selectedKeys.value.includes(candidate.key))],
)

/**
 * Support the month plan already put into this week: monthly-cadence objects
 * and rows whose coverage is inherited from a whole-month placement.
 */
const monthSupport = computed(() =>
  planner.allRows.value.filter(
    row =>
      planner.rowHasWeekPlacement(row) &&
      (row.cadence === 'monthly' || planner.rowSoftKind(row) === 'whole-month') &&
      !selectedKeys.value.includes(planner.rowKey(row)),
  ),
)

const selectedRows = computed(() =>
  planner.allRows.value.filter(row => selectedKeys.value.includes(planner.rowKey(row))),
)
const plannerRows = computed(() =>
  showRest.value
    ? [...selectedRows.value, ...planner.allRows.value.filter(row => !selectedKeys.value.includes(planner.rowKey(row)))]
    : selectedRows.value,
)
const unplaced = computed(() => selectedRows.value.filter(row => !planner.rowHasWeekPlacement(row)))
const flexibleItems = computed<QuietPlanGroupItem[]>(() =>
  planner.allRows.value.filter(row => planner.rowSoftKind(row) === 'whole-week').map(planItem),
)

function planItem(row: PlannerMeasurementRow): QuietPlanGroupItem {
  return { key: planner.rowKey(row), title: row.title, subjectType: row.subjectType, icon: row.icon }
}

function dayItems(dayRef: DayRef): QuietPlanGroupItem[] {
  return planner.allRows.value
    .filter(row => planner.rowSoftKind(row) !== 'whole-week' && planner.dayCellState(row, dayRef) !== 'empty')
    .map(planItem)
}

function targetTitle(row: PlannerMeasurementRow): string {
  const target = planner.editableTarget(row)
  if (!target) return 'Ten obiekt nie ma celu'
  return `${formatMeasurementTargetSummary(target, t)}${planner.hasWeekOverride(row) ? ' · cel na ten tydzień' : ''}`
}

onMounted(() => void load())
watch(() => props.weekRef, () => void load())

async function load() {
  const monthRef = getParentPeriod(props.weekRef)
  const [weekPlan, weekIntentions, priorities] = await Promise.all([
    periodPlanDexieRepository.getWeekPlan(props.weekRef),
    listWeeklyIntentions(props.weekRef),
    getActivePrioritiesForMonth(monthRef),
  ])
  selectedKeys.value = (weekPlan?.topPriorities ?? []).map(ref => `${ref.subjectType}:${ref.subjectId}`)
  intentions.value = weekIntentions
  priorityOptions.value = priorities
}

function go(index: number) {
  current.value = Math.max(0, Math.min(steps.length - 1, index))
}

async function persistFocus() {
  const refs: WeekTopPriorityRef[] = selectedKeys.value.flatMap(key => {
    const separator = key.indexOf(':')
    if (separator < 0) return []
    return [{ subjectType: key.slice(0, separator) as WeekTopPriorityRef['subjectType'], subjectId: key.slice(separator + 1) }]
  })
  isSaving.value = true
  try {
    await setWeekTopPriorities(props.weekRef, refs)
    emit('updated')
  } finally {
    isSaving.value = false
  }
}

async function toggleFocus(key: string) {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter(entry => entry !== key)
    : [...selectedKeys.value, key]
  await persistFocus()
}

function toggleFocusRow(row: PlannerMeasurementRow) {
  return toggleFocus(planner.rowKey(row))
}

async function reviewEdit(key: string) {
  showRest.value = !selectedKeys.value.includes(key)
  targetOpen.value = null
  go(1)
}

async function onTargetValue(row: PlannerMeasurementRow, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  await planner.handleTargetValueChange(row, Math.max(0, value))
}

async function onEntryDays(row: PlannerMeasurementRow, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  await planner.handleEntryDaysValueChange(row, value)
}

async function openComposer(intention?: WeeklyIntention) {
  editingIntentionId.value = intention?.id ?? null
  intentionTitle.value = intention?.title ?? ''
  intentionTimes.value = intention?.target.value ?? 1
  intentionPriorityIds.value = [...(intention?.priorityIds ?? [])]
  composerOpen.value = true
  await nextTick()
  nameInputRef.value?.focus()
}

function editIntention(intention: WeeklyIntention) {
  return openComposer(intention)
}

async function saveIntention() {
  const title = intentionTitle.value.trim()
  const times = Math.max(1, Math.round(Number(intentionTimes.value) || 1))
  if (!title || isSaving.value) return
  isSaving.value = true
  try {
    if (editingIntentionId.value) {
      await updateWeeklyIntention(editingIntentionId.value, {
        title,
        target: { kind: 'count', operator: 'min', value: times },
        priorityIds: [...intentionPriorityIds.value],
      })
    } else {
      const created = await createWeeklyIntention({
        weekRef: props.weekRef,
        title,
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: times },
        priorityIds: [...intentionPriorityIds.value],
      })
      selectedKeys.value = [...selectedKeys.value, `weeklyIntention:${created.id}`]
    }
    composerOpen.value = false
  } finally {
    isSaving.value = false
  }
  await persistFocus()
  await load()
  await planner.loadPlannerData()
  emit('updated')
}

async function removeIntention(id: string) {
  isSaving.value = true
  try {
    await deleteWeeklyIntention(id, props.weekRef)
    selectedKeys.value = selectedKeys.value.filter(key => key !== `weeklyIntention:${id}`)
    composerOpen.value = false
  } finally {
    isSaving.value = false
  }
  await persistFocus()
  await load()
  await planner.loadPlannerData()
  emit('updated')
}
</script>
