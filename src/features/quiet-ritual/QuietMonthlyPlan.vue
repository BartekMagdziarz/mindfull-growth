<template>
  <QuietRitualShell
    scale="month"
    eyebrow="Plan miesiąca"
    :period-title="periodTitle"
    :steps="steps"
    :current="current"
    :count="current === 0 ? `${selectedPriorityIds.length} ${plural(selectedPriorityIds.length, 'wybrany', 'wybrane', 'wybranych')}` : ''"
    :wide="current >= 2"
    :saving="Boolean(planner.savingKey.value) || isSaving"
    finish-label="Zakończ planowanie"
    @close="emit('close')"
    @go="go"
    @finish="emit('close')"
  >
    <!-- 1 · Kierunki -->
    <section v-if="current === 0" class="qr-focus">
      <div class="qr-choices">
        <article
          v-for="priority in activePriorities"
          :key="priority.id"
          class="qr-choice"
          :class="{ selected: selectedPriorityIds.includes(priority.id) }"
        >
          <button
            type="button"
            class="qr-choice-pick"
            :aria-pressed="selectedPriorityIds.includes(priority.id)"
            @click="toggleDirection(priority.id)"
          >
            <span class="qr-object-icon"><AppIcon :name="priority.icon || 'explore'" /></span>
            <span><strong>{{ priority.title }}</strong></span>
            <span class="qr-check"><AppIcon v-if="selectedPriorityIds.includes(priority.id)" name="check" /></span>
          </button>
          <details v-if="priority.desiredDirection" class="qm-choice-detail">
            <summary :aria-label="`Kierunek: ${priority.title}`">Kierunek</summary>
            <p>{{ priority.desiredDirection }}</p>
          </details>
        </article>
      </div>
      <p v-if="!activePriorities.length" class="qr-empty">
        Brak aktywnych kierunków na ten rok. Możesz zacząć od praktyk i działań w kolejnym kroku albo dodać
        kierunek w bibliotece obiektów.
      </p>
      <details class="qm-help">
        <summary>Wybór kierunków</summary>
        <p>Trzy to sugestia. Możesz wybrać więcej albo zaplanować działania bez kierunku.</p>
      </details>
      <details v-if="previousDirections.length" class="qm-previous">
        <summary>Poprzedni miesiąc · {{ previousTitle }}</summary>
        <p v-for="entry in previousDirections" :key="entry.id">
          {{ entry.title }} · {{ VERDICT_LABEL[entry.verdict ?? ''] ?? 'Bez decyzji' }}
        </p>
        <button type="button" class="qr-quiet" @click="adoptPreviousDirections">
          Przyjmij poprzedni wybór kierunków
        </button>
      </details>
    </section>

    <!-- 2 · Wsparcie -->
    <section v-else-if="current === 1" class="qr-focus">
      <div class="qr-choices">
        <article
          v-for="row in primarySupport"
          :key="planner.rowKey(row)"
          class="qr-choice"
          :class="{ selected: row.isActive }"
        >
          <button
            type="button"
            class="qr-choice-pick"
            :aria-pressed="row.isActive"
            :disabled="isSaving"
            @click="toggleSupport(row)"
          >
            <span class="qr-object-icon"><AppIcon :name="row.icon ?? SUBJECT_ICON[row.subjectType]" /></span>
            <span><strong>{{ row.title }}</strong><small>{{ relationLabel(row) }}</small></span>
            <span class="qr-check"><AppIcon v-if="row.isActive" name="check" /></span>
          </button>
        </article>
      </div>
      <details v-if="extraSupport.length" class="qm-extra">
        <summary>Pozostałe działania i obserwacje ({{ extraSupport.length }})</summary>
        <div class="qr-choices">
          <article
            v-for="row in extraSupport"
            :key="planner.rowKey(row)"
            class="qr-choice"
            :class="{ selected: row.isActive }"
          >
            <button
              type="button"
              class="qr-choice-pick"
              :aria-pressed="row.isActive"
              :disabled="isSaving"
              @click="toggleSupport(row)"
            >
              <span class="qr-object-icon"><AppIcon :name="row.icon ?? SUBJECT_ICON[row.subjectType]" /></span>
              <span><strong>{{ row.title }}</strong><small>{{ relationLabel(row) }}</small></span>
              <span class="qr-check"><AppIcon v-if="row.isActive" name="check" /></span>
            </button>
          </article>
        </div>
      </details>
    </section>

    <!-- 3 · Tygodnie -->
    <section v-else-if="current === 2" class="qm-planner">
      <p v-if="!supportRows.length" class="qr-empty">
        Nie wybrano działań. <button type="button" class="qr-quiet" @click="go(1)">Dobierz wsparcie</button>
      </p>
      <div v-else class="qm-table-scroll">
        <div class="qm-table" :style="{ '--qm-weeks': weeks.length }">
          <div class="qm-row qm-table-head">
            <span>Wsparcie</span>
            <span v-for="week in weeks" :key="week.weekRef">{{ week.label }}<small>{{ week.range }}</small></span>
            <span>Cel</span>
          </div>
          <article
            v-for="row in supportRows"
            :key="planner.rowKey(row)"
            class="qm-plan-item"
            :class="{ 'qm-editing': expanded === planner.rowKey(row) }"
          >
            <div class="qm-row">
              <span class="qm-object">
                <AppIcon :name="row.icon ?? SUBJECT_ICON[row.subjectType]" /><strong>{{ row.title }}</strong>
              </span>
              <div v-for="week in weeks" :key="week.weekRef" class="qm-cell">
                <button
                  type="button"
                  class="qm-dot"
                  :class="{
                    active: planner.weekCellState(row, week.weekRef) === 'checked',
                    whole: planner.weekCellState(row, week.weekRef) === 'soft',
                  }"
                  :aria-label="`${row.title}, ${week.label}, ${week.range}`"
                  :aria-pressed="planner.weekCellState(row, week.weekRef) !== 'empty'"
                  @click="planner.handleMatrixCellToggle(row, week.weekRef)"
                >
                  <i />
                </button>
                <template v-if="expanded === planner.rowKey(row) && planner.canSplitTarget(row)">
                  <input
                    v-if="planner.weekCellState(row, week.weekRef) === 'checked'"
                    type="number"
                    min="0"
                    :aria-label="`Cel ${week.label}: ${row.title}`"
                    :value="row.weekTargetOverrideByRef[week.weekRef]?.value ?? ''"
                    placeholder="—"
                    @change="onWeekTarget(row, week.weekRef, $event)"
                  />
                  <small v-if="planner.weekDayBadge(row, week.weekRef)">{{ planner.weekDayBadge(row, week.weekRef) }} dni</small>
                </template>
                <small v-else-if="planner.weekDayBadge(row, week.weekRef)">{{ planner.weekDayBadge(row, week.weekRef) }} dni</small>
              </div>
              <button
                v-if="planner.editableTarget(row)"
                type="button"
                class="qm-target"
                :disabled="!planner.rowHasPlacement(row)"
                :title="targetTitle(row)"
                :aria-label="`Edytuj cel: ${row.title}`"
                :aria-expanded="expanded === planner.rowKey(row)"
                @click="expanded = expanded === planner.rowKey(row) ? '' : planner.rowKey(row)"
              >
                {{ planner.editableTarget(row)?.value }}
              </button>
              <span v-else class="qm-no-target">—</span>
            </div>
            <div class="qm-underbar">
              <button
                type="button"
                class="qr-quiet"
                :aria-pressed="planner.isWholePeriodApplied(row)"
                @click="planner.handleWholeMonthToggle(row)"
              >
                Cały miesiąc
              </button>
              <button
                type="button"
                class="qr-icon"
                :aria-label="`Wyczyść przypisania: ${row.title}`"
                @click="planner.handleRowClear(row)"
              >
                <AppIcon name="ink_eraser" />
              </button>
              <template v-if="expanded === planner.rowKey(row) && planner.editableTarget(row)">
                <label class="qm-target-input">
                  {{ row.cadence === 'monthly' ? 'Cel miesiąca' : 'Cel tygodniowy' }}
                  <input
                    type="number"
                    min="0"
                    :value="planner.editableTarget(row)?.value"
                    :aria-label="`Wartość celu: ${row.title}`"
                    @change="onTargetValue(row, $event)"
                  />
                </label>
                <template v-if="planner.canSplitTarget(row)">
                  <button
                    type="button"
                    class="qr-quiet"
                    :disabled="!planner.canDistribute(row)"
                    title="Rozłóż cel miesiąca równo na wybrane tygodnie"
                    @click="planner.handleDistributeEvenly(row)"
                  >
                    Rozłóż
                  </button>
                  <span v-if="planner.rowWeekTargetSummary(row)" class="qm-balance">
                    {{ balanceLabel(row) }}
                  </span>
                </template>
                <details>
                  <summary :aria-label="`Ustawienia celu: ${row.title}`"><AppIcon name="tune" /></summary>
                  <p>{{ targetTitle(row) }}</p>
                  <p v-if="row.cadence === 'weekly'">Wyjątek celu na jeden tydzień ustawisz w planowaniu tygodnia.</p>
                  <label>
                    Warunek
                    <select :value="planner.editableTarget(row)?.operator" @change="onOperator(row, $event)">
                      <option value="min">Co najmniej</option>
                      <option value="max">Co najwyżej</option>
                    </select>
                  </label>
                  <label v-if="planner.editableTarget(row)?.entryDays">
                    Dni z wpisem
                    <input
                      type="number"
                      min="1"
                      max="31"
                      :value="planner.editableTarget(row)?.entryDays?.value"
                      @change="onEntryDays(row, $event)"
                    />
                  </label>
                  <button v-if="row.targetOverride" type="button" class="qr-quiet" @click="planner.handleClearOverride(row)">
                    <AppIcon name="undo" />Wróć do celu bazowego
                  </button>
                </details>
              </template>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 4 · Przegląd -->
    <section v-else class="qm-review">
      <div v-if="gaps.length" class="qm-gaps">
        <button v-for="gap in gaps" :key="gap.label" type="button" class="qr-quiet" @click="go(gap.step)">
          {{ gap.label }}<AppIcon name="arrow_forward" />
        </button>
      </div>
      <div v-if="selectedPriorityIds.length" class="qm-direction-filter">
        <button type="button" class="qr-quiet" :aria-pressed="!filter" @click="filter = ''">Wszystkie</button>
        <button
          v-for="priority in selectedPriorities"
          :key="priority.id"
          type="button"
          class="qr-quiet"
          :aria-pressed="filter === priority.id"
          @click="filter = filter === priority.id ? '' : priority.id"
        >
          {{ priority.title }}
        </button>
      </div>
      <div class="qm-week-cards" :style="{ '--qm-weeks': weeks.length }">
        <article v-for="week in weeks" :key="week.weekRef" class="qm-week-card">
          <header>
            <strong>{{ week.label }}</strong><small>{{ week.range }}</small>
          </header>
          <QuietPlanGroups
            :items="weekItems(week.weekRef)"
            :span-items="wholeMonthItems"
            span-label="cały miesiąc"
            :context="week.range"
            @edit="edit"
          />
          <span v-if="!weekItems(week.weekRef).length && !wholeMonthItems.length" class="qm-muted">—</span>
          <button type="button" class="qr-quiet" @click="emit('open-week', week.weekRef)">
            Zaplanuj tydzień<AppIcon name="arrow_forward" />
          </button>
        </article>
      </div>
    </section>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementTarget, Priority } from '@/domain/planning'
import type { PriorityVerdict } from '@/domain/planningState'
import type { PlannerMeasurementRow } from '@/components/calendar/plannerTypes'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { usePlannerState } from '@/composables/usePlannerState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { getActivePrioritiesForMonth, setMonthTopPriorities } from '@/services/monthlyPriorityService'
import { activateMeasurementInMonth, deactivateMeasurementInMonth } from '@/services/planningMutations'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import { getPreviousPeriod } from '@/utils/periods'
import QuietPlanGroups, { type QuietPlanGroupItem } from './QuietPlanGroups.vue'
import QuietRitualShell, { type QuietRitualStep } from './QuietRitualShell.vue'
import { SUBJECT_ICON, monthTitle, plural, quietMonthWeeks } from './quietRitualModel'

const props = defineProps<{ monthRef: MonthRef }>()
const emit = defineEmits<{ close: []; updated: []; 'open-week': [weekRef: WeekRef] }>()

const { t, locale } = useT()
const current = ref(0)
const expanded = ref('')
const filter = ref('')
const isSaving = ref(false)
const activePriorities = ref<Priority[]>([])
const selectedPriorityIds = ref<string[]>([])
const previousDirections = ref<Array<{ id: string; title: string; verdict: PriorityVerdict | null }>>([])

const VERDICT_LABEL: Record<string, string> = {
  continue: 'Kontynuuj',
  adjust: 'Dostosuj',
  pause: 'Wstrzymaj',
  drop: 'Porzuć',
}

const monthRefRef = toRef(props, 'monthRef')
const planner = usePlannerState(monthRefRef, locale, () => emit('updated'))

const steps: QuietRitualStep[] = [
  { id: 'directions', label: 'Kierunki', question: 'Na czym chcesz skupić ten miesiąc?' },
  { id: 'support', label: 'Wsparcie', question: 'Co wesprze te kierunki?' },
  { id: 'weeks', label: 'Tygodnie', question: 'Kiedy znajdziesz na to miejsce?' },
  { id: 'review', label: 'Przegląd', question: 'Czy ten plan jest dla Ciebie?' },
]

const periodTitle = computed(() => monthTitle(props.monthRef))
const previousTitle = computed(() => monthTitle(getPreviousPeriod(props.monthRef) as MonthRef))
const weeks = computed(() => quietMonthWeeks(props.monthRef))
const selectedPriorities = computed(() => activePriorities.value.filter(priority => selectedPriorityIds.value.includes(priority.id)))

/** Objects related to the chosen directions come first; everything else waits behind one reveal. */
function priorityIdsOf(row: PlannerMeasurementRow): string[] {
  if (row.subjectType === 'keyResult') return goalPriorityIds.value.get(row.goalId ?? '') ?? []
  return subjectPriorityIds.value.get(planner.rowKey(row)) ?? []
}
const matchesDirection = (row: PlannerMeasurementRow) =>
  priorityIdsOf(row).some(id => selectedPriorityIds.value.includes(id))

const primarySupport = computed(() =>
  planner.allRows.value.filter(row => row.subjectType !== 'tracker' && (matchesDirection(row) || row.isActive)),
)
const extraSupport = computed(() => planner.allRows.value.filter(row => !primarySupport.value.includes(row)))
const supportRows = computed(() => planner.allRows.value.filter(row => row.isActive))

const goalPriorityIds = ref(new Map<string, string[]>())
const subjectPriorityIds = ref(new Map<string, string[]>())

const wholeMonthItems = computed<QuietPlanGroupItem[]>(() =>
  supportRows.value
    .filter(row => visibleUnderFilter(row) && (planner.rowSoftKind(row) === 'whole-month' || planner.isWholePeriodApplied(row)))
    .map(planItem),
)

function visibleUnderFilter(row: PlannerMeasurementRow): boolean {
  return !filter.value || priorityIdsOf(row).includes(filter.value)
}

function planItem(row: PlannerMeasurementRow): QuietPlanGroupItem {
  return { key: planner.rowKey(row), title: row.title, subjectType: row.subjectType, icon: row.icon }
}

function weekItems(weekRef: WeekRef): QuietPlanGroupItem[] {
  return supportRows.value
    .filter(
      row =>
        visibleUnderFilter(row) &&
        planner.weekCellState(row, weekRef) === 'checked' &&
        !planner.isWholePeriodApplied(row),
    )
    .map(planItem)
}

/**
 * Only real gaps: a direction with no support, and a monthly target whose week
 * sub-targets do not add up. "Covers the whole month" is a legitimate plan, not
 * a gap — those rows show up quietly in every week card instead.
 */
const gaps = computed(() => [
  ...selectedPriorities.value
    .filter(priority => !supportRows.value.some(row => row.subjectType !== 'tracker' && priorityIdsOf(row).includes(priority.id)))
    .map(priority => ({ label: `${priority.title} · dobierz wsparcie`, step: 1 })),
  ...supportRows.value
    .filter(row => {
      const summary = planner.rowWeekTargetSummary(row)
      return summary && summary.assigned !== summary.total
    })
    .map(row => ({ label: `${row.title} · sprawdź rozpisanie celu`, step: 2 })),
])

function relationLabel(row: PlannerMeasurementRow): string {
  if (row.subjectType === 'tracker') return 'Obserwacja'
  const titles = activePriorities.value.filter(priority => priorityIdsOf(row).includes(priority.id)).map(priority => priority.title)
  return titles.join(' · ') || 'Dodatkowe wsparcie'
}

function targetTitle(row: PlannerMeasurementRow): string {
  const target = planner.editableTarget(row)
  if (!target) return 'Ten obiekt nie ma celu'
  return `${formatMeasurementTargetSummary(target, t)}${row.targetOverride ? ' · cel na ten miesiąc' : ''}`
}

function balanceLabel(row: PlannerMeasurementRow): string {
  const summary = planner.rowWeekTargetSummary(row)
  if (!summary) return ''
  if (summary.assigned === summary.total) return `Rozpisane ${summary.assigned} z ${summary.total}`
  const difference = Math.round(Math.abs(summary.total - summary.assigned) * 100) / 100
  return `${summary.assigned} z ${summary.total} · ${difference} ${summary.assigned < summary.total ? 'poza tygodniami' : 'ponad cel'}`
}

onMounted(() => void load())
watch(() => props.monthRef, () => void load())
watch(() => planner.allRows.value.map(row => row.id).join(','), () => void loadRelations())

async function load() {
  const [priorities, monthPlan] = await Promise.all([
    getActivePrioritiesForMonth(props.monthRef),
    periodPlanDexieRepository.getMonthPlan(props.monthRef),
  ])
  activePriorities.value = priorities
  selectedPriorityIds.value = monthPlan?.topPriorityIds ?? []
  await Promise.all([loadRelations(), loadPreviousMonth()])
}

/** Object → priority links (KR inherits from its goal), read once per load. */
async function loadRelations() {
  const [goals, habits, trackers] = await Promise.all([
    goalDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
  ])
  goalPriorityIds.value = new Map(goals.map(goal => [goal.id, goal.priorityIds ?? []]))
  subjectPriorityIds.value = new Map([
    ...habits.map(habit => [`habit:${habit.id}`, habit.priorityIds ?? []] as const),
    ...trackers.map(tracker => [`tracker:${tracker.id}`, tracker.priorityIds ?? []] as const),
  ])
}

async function loadPreviousMonth() {
  const previousMonth = getPreviousPeriod(props.monthRef) as MonthRef
  const [plan, reflections] = await Promise.all([
    periodPlanDexieRepository.getMonthPlan(previousMonth),
    reflectionDexieRepository.listPeriodObjectReflections(),
  ])
  const verdicts = new Map(
    reflections
      .filter(item => item.periodType === 'month' && item.periodRef === previousMonth && item.subjectType === 'priority')
      .map(item => [item.subjectId, item.verdict ?? null]),
  )
  const ids = [...new Set([...(plan?.topPriorityIds ?? []), ...verdicts.keys()])]
  previousDirections.value = ids.flatMap(id => {
    const priority = activePriorities.value.find(entry => entry.id === id)
    return priority ? [{ id, title: priority.title, verdict: verdicts.get(id) ?? null }] : []
  })
}

function go(index: number) {
  current.value = Math.max(0, Math.min(steps.length - 1, index))
}

async function persistDirections() {
  isSaving.value = true
  try {
    await setMonthTopPriorities(props.monthRef, selectedPriorityIds.value)
    emit('updated')
  } finally {
    isSaving.value = false
  }
}

async function toggleDirection(priorityId: string) {
  const set = new Set(selectedPriorityIds.value)
  if (set.has(priorityId)) set.delete(priorityId)
  else set.add(priorityId)
  selectedPriorityIds.value = activePriorities.value.map(priority => priority.id).filter(id => set.has(id))
  await persistDirections()
}

async function adoptPreviousDirections() {
  selectedPriorityIds.value = previousDirections.value
    .filter(entry => entry.verdict !== 'pause' && entry.verdict !== 'drop')
    .map(entry => entry.id)
  await persistDirections()
}

/**
 * Support = the month portfolio. Activating without a placement is the
 * production model's "covers the whole month" state, which the weeks step then
 * shows as soft coverage.
 */
async function toggleSupport(row: PlannerMeasurementRow) {
  isSaving.value = true
  try {
    if (row.isActive) {
      await deactivateMeasurementInMonth({ monthRef: props.monthRef, subjectType: row.subjectType, subjectId: row.id })
    } else {
      await activateMeasurementInMonth({
        monthRef: props.monthRef,
        subjectType: row.subjectType,
        subjectId: row.id,
        targetOverride: row.targetOverride,
      })
    }
    await planner.loadPlannerData()
    emit('updated')
  } finally {
    isSaving.value = false
  }
}

async function edit(key: string) {
  expanded.value = key
  go(2)
}

async function onTargetValue(row: PlannerMeasurementRow, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  await planner.handleTargetValueChange(row, Math.max(0, value))
}

async function onWeekTarget(row: PlannerMeasurementRow, weekRef: WeekRef, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (!raw.trim()) {
    await planner.handleWeekTargetClear(row, weekRef)
    return
  }
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  await planner.handleWeekTargetChange(row, weekRef, Math.max(0, value))
}

async function onOperator(row: PlannerMeasurementRow, event: Event) {
  await planner.handleTargetOperatorChange(row, (event.target as HTMLSelectElement).value)
}

async function onEntryDays(row: PlannerMeasurementRow, event: Event) {
  const target = planner.editableTarget(row)
  const condition = target?.entryDays
  const value = Number((event.target as HTMLInputElement).value)
  if (!condition || !Number.isFinite(value)) return
  await planner.handleEntryDaysChange(row, { ...condition, value: Math.max(1, Math.round(value)) } as MeasurementTarget['entryDays'])
}
</script>
