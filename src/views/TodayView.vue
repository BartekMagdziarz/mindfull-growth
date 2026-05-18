<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <header class="mb-6 space-y-4">
      <CalendarToolbar
        :label="dayLabel"
        :label-clickable="true"
        :prev-disabled="store.isLoading"
        :next-disabled="store.isLoading"
        @prev="void handlePreviousDay()"
        @next="void handleNextDay()"
        @label-click="openDatePicker"
      >
        <template #after>
          <input
            ref="dateInputRef"
            type="date"
            class="sr-only"
            :value="bundleDayRef"
            @change="handleDateChange"
          />
        </template>
      </CalendarToolbar>
    </header>

    <PlanningStatePanel
      v-if="store.isLoading && !store.bundle"
      :title="t('common.loading')"
      :body="t('planning.today.loadError')"
    />

    <PlanningStatePanel
      v-else-if="store.error && !store.bundle"
      :title="t('planning.today.loadError')"
      :body="store.error"
      :action-label="t('common.buttons.tryAgain')"
      @action="void loadInitialBundle()"
    />

    <template v-else-if="store.bundle">
      <!-- Unified day grid: 168px wellness column + goals/habits/trackers plates -->
      <div
        class="grid items-start gap-4"
        style="grid-template-columns: 168px 1fr 1fr 1fr"
      >
        <!-- LEFT: wellness stack -->
        <div class="flex flex-col gap-4">
          <JournalStreakCard
            :reference-date="wellnessReferenceDate"
            :day-word-counts="journalDayWordCounts"
          />

          <EmotionStreakCard
            :reference-date="wellnessReferenceDate"
            :day-emotion-data="dayEmotionData"
          />

          <ExerciseCard />
        </div>

        <!-- Goals & KRs plate -->
        <section class="today-section neo-raised flex min-w-0 flex-col gap-2 p-3.5">
          <header class="flex items-center justify-between px-1 pb-0.5">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.today.columns.goalsKrs') }}
            </h2>
            <button
              type="button"
              class="today-section-add neo-focus grid place-items-center"
              :aria-label="t('common.buttons.add')"
            >
              <AppIcon name="add" class="text-xs text-on-surface-variant/60" />
            </button>
          </header>
          <template v-if="store.goalGroupedKrItems.length > 0">
            <template
              v-for="(group, groupIndex) in store.goalGroupedKrItems"
              :key="group.goal.id"
            >
              <div
                v-for="(item, itemIndex) in group.items"
                :key="item.key"
              >
                <div
                  v-if="!(groupIndex === 0 && itemIndex === 0)"
                  class="today-section-divider mx-1"
                />
                <TodayItemRow
                  :item="item"
                  :today-day-ref="bundleDayRef"
                  :raw-entries="store.rawEntries"
                  :all-day-assignments="store.allDayAssignments"
                  :is-pending="store.isPending(item.key)"
                  @open-object="openObject(item)"
                  @open-context="openPeriod(item.contextPeriodRef)"
                  @toggle-completion="handleToggleCompletion(item)"
                  @save-entry="handleSaveEntry(item, $event)"
                  @clear-entry="handleClearEntry(item)"
                  @hide="handleHide(item)"
                  @move="handleMove(item, $event)"
                  @clear-schedule="handleClearSchedule(item)"
                  @request-delete="promptDelete(item)"
                />
              </div>
            </template>
          </template>
          <p v-else class="py-8 text-center text-[11px] text-on-surface-variant/50">
            {{ t('planning.today.emptyColumn') }}
          </p>
        </section>

        <!-- Habits plate -->
        <section class="today-section neo-raised flex min-w-0 flex-col gap-2 p-3.5">
          <header class="flex items-center justify-between px-1 pb-0.5">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.today.columns.habits') }}
            </h2>
            <button
              type="button"
              class="today-section-add neo-focus grid place-items-center"
              :aria-label="t('common.buttons.add')"
            >
              <AppIcon name="add" class="text-xs text-on-surface-variant/60" />
            </button>
          </header>
          <template v-if="store.habitItems.length > 0">
            <div v-for="(item, itemIndex) in store.habitItems" :key="item.key">
              <div v-if="itemIndex !== 0" class="today-section-divider mx-1" />
              <TodayItemRow
                :item="item"
                :today-day-ref="bundleDayRef"
                :raw-entries="store.rawEntries"
                :all-day-assignments="store.allDayAssignments"
                :is-pending="store.isPending(item.key)"
                @open-object="openObject(item)"
                @open-context="openPeriod(item.contextPeriodRef)"
                @toggle-completion="handleToggleCompletion(item)"
                @save-entry="handleSaveEntry(item, $event)"
                @clear-entry="handleClearEntry(item)"
                @hide="handleHide(item)"
                @move="handleMove(item, $event)"
                @clear-schedule="handleClearSchedule(item)"
                @request-delete="promptDelete(item)"
              />
            </div>
          </template>
          <p v-else class="py-8 text-center text-[11px] text-on-surface-variant/50">
            {{ t('planning.today.emptyColumn') }}
          </p>
        </section>

        <!-- Trackers plate -->
        <section class="today-section neo-raised flex min-w-0 flex-col gap-2 p-3.5">
          <header class="flex items-center justify-between px-1 pb-0.5">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.today.columns.trackers') }}
            </h2>
            <button
              type="button"
              class="today-section-add neo-focus grid place-items-center"
              :aria-label="t('common.buttons.add')"
            >
              <AppIcon name="add" class="text-xs text-on-surface-variant/60" />
            </button>
          </header>
          <template v-if="store.trackerItems.length > 0">
            <div v-for="(item, itemIndex) in store.trackerItems" :key="item.key">
              <div v-if="itemIndex !== 0" class="today-section-divider mx-1" />
              <TodayItemRow
                :item="item"
                :today-day-ref="bundleDayRef"
                :raw-entries="store.rawEntries"
                :all-day-assignments="store.allDayAssignments"
                :is-pending="store.isPending(item.key)"
                @open-object="openObject(item)"
                @open-context="openPeriod(item.contextPeriodRef)"
                @toggle-completion="handleToggleCompletion(item)"
                @save-entry="handleSaveEntry(item, $event)"
                @clear-entry="handleClearEntry(item)"
                @hide="handleHide(item)"
                @move="handleMove(item, $event)"
                @clear-schedule="handleClearSchedule(item)"
                @request-delete="promptDelete(item)"
              />
            </div>
          </template>
          <p v-else class="py-8 text-center text-[11px] text-on-surface-variant/50">
            {{ t('planning.today.emptyColumn') }}
          </p>
        </section>
      </div>

      <!-- Hidden items -->
      <div v-if="store.hiddenItems.length > 0" class="mt-6">
        <button
          type="button"
          class="flex items-center gap-2 text-xs text-on-surface-variant hover:text-on-surface"
          @click="hiddenExpanded = !hiddenExpanded"
        >
          <AppIcon
            name="chevron_right"
            class="text-xs transition-transform"
            :class="hiddenExpanded ? 'rotate-90' : ''"
          />
          <span>{{ t('planning.today.hidden.count', { n: store.hiddenItems.length }) }}</span>
        </button>
        <div v-if="hiddenExpanded" class="mt-2 space-y-1 pl-5">
          <div
            v-for="item in store.hiddenItems"
            :key="item.key"
            class="flex h-9 items-center gap-2 text-sm text-on-surface-variant"
          >
            <span class="flex-1 truncate">{{ itemTitle(item) }}</span>
            <button
              type="button"
              class="neo-icon-button neo-focus"
              :disabled="store.isPending(item.key)"
              :title="t('planning.today.actions.restore')"
              @click="handleRestore(item)"
            >
              <AppIcon name="undo" class="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <AppDialog
      v-model="deleteDialogOpen"
      :title="t('planning.today.deleteDialog.title')"
      :message="deleteDialogMessage"
      :confirm-text="t('common.buttons.delete')"
      confirm-variant="filled"
      @confirm="handleConfirmDelete"
    />
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import CalendarToolbar from '@/components/calendar/CalendarToolbar.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import JournalStreakCard from '@/components/today/JournalStreakCard.vue'
import EmotionStreakCard from '@/components/today/EmotionStreakCard.vue'
import ExerciseCard from '@/components/today/ExerciseCard.vue'
import TodayItemRow from '@/components/today/TodayItemRow.vue'
import { useT } from '@/composables/useT'
import { getObjectsLibraryFamilyForPanelType } from '@/services/objectsLibraryQueries'
import type { TodayItem } from '@/services/todayViewQueries'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTodayStore } from '@/stores/today.store'
import { getQuadrant } from '@/domain/emotion'
import type { Quadrant } from '@/domain/emotion'
import type { DayEmotionSummary } from '@/utils/wellnessCalendar'
import type { EmotionLog } from '@/domain/emotionLog'
import { formatDayTitle } from '@/utils/periodLabels'
import type { DayRef } from '@/domain/period'
import { getPeriodRefsForDate } from '@/utils/periods'

const props = defineProps<{
  dayRef?: DayRef
}>()

const router = useRouter()
const { t, locale } = useT()
const store = useTodayStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const hiddenExpanded = ref(false)
const deleteDialogOpen = ref(false)
const pendingDeleteItem = ref<TodayItem | null>(null)
const dateInputRef = ref<HTMLInputElement | null>(null)

const bundleDayRef = computed(() => (store.dayRef ?? '') as DayRef)
const effectiveDayRef = computed(() => props.dayRef ?? bundleDayRef.value)
const dayLabel = computed(() => {
  if (!store.bundle) return ''
  return formatDayTitle(store.bundle.dayRef, locale.value)
})

const deleteDialogMessage = computed(() => {
  if (!pendingDeleteItem.value) return ''
  return t('planning.today.deleteDialog.message', {
    title: itemTitle(pendingDeleteItem.value),
  })
})

// Wellness panel data
const wellnessReferenceDate = computed(() => {
  const [y, m, d] = bundleDayRef.value.split('-').map(Number)
  return new Date(y, m - 1, d)
})
const journalDayWordCounts = computed(() => {
  const map = new Map<string, number>()
  for (const entry of journalStore.entries) {
    const key = entry.createdAt.slice(0, 10)
    const words =
      entry.body.split(/\s+/).filter(Boolean).length +
      (entry.title ? entry.title.split(/\s+/).filter(Boolean).length : 0)
    map.set(key, (map.get(key) ?? 0) + words)
  }
  return map
})

const dayEmotionData = computed(() => {
  const map = new Map<string, DayEmotionSummary>()
  const logsByDay = new Map<string, EmotionLog[]>()

  for (const log of emotionLogStore.logs) {
    const key = log.createdAt.slice(0, 10)
    const existing = logsByDay.get(key) ?? []
    existing.push(log)
    logsByDay.set(key, existing)
  }

  for (const [dayKey, logs] of logsByDay) {
    const counts: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
    let total = 0
    for (const log of logs) {
      for (const eid of log.emotionIds) {
        const em = emotionStore.getEmotionById(eid)
        if (em) {
          counts[getQuadrant(em)]++
          total++
        }
      }
    }
    const proportions: Record<Quadrant, number> =
      total > 0
        ? {
            'high-energy-high-pleasantness': counts['high-energy-high-pleasantness'] / total,
            'high-energy-low-pleasantness': counts['high-energy-low-pleasantness'] / total,
            'low-energy-high-pleasantness': counts['low-energy-high-pleasantness'] / total,
            'low-energy-low-pleasantness': counts['low-energy-low-pleasantness'] / total,
          }
        : counts
    map.set(dayKey, { logCount: logs.length, quadrantProportions: proportions })
  }

  return map
})

onMounted(() => {
  void loadInitialBundle()
  Promise.all([journalStore.loadEntries(), emotionLogStore.loadLogs(), emotionStore.loadEmotions()])
})

watch(
  () => props.dayRef,
  (nextDayRef, previousDayRef) => {
    if (!nextDayRef || nextDayRef === previousDayRef) {
      return
    }
    void store.loadBundle(nextDayRef)
  }
)

function itemTitle(item: TodayItem): string {
  return item.kind === 'initiative' ? item.initiative.title : item.subject.title
}

function openDatePicker(): void {
  dateInputRef.value?.showPicker()
}

function handleDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value) {
    void navigateToDay(input.value as DayRef)
  }
}

function openObject(item: TodayItem): void {
  void router.push({
    name: 'objects-family',
    params: {
      family: getObjectsLibraryFamilyForPanelType(item.panelType),
    },
    query: {
      expandedType: item.panelType,
      expandedId: item.kind === 'initiative' ? item.initiative.id : item.subject.id,
    },
  })
}

function openPeriod(periodRef: string): void {
  if (periodRef.length === 4) {
    void router.push({ name: 'calendar-year', params: { yearRef: periodRef } })
    return
  }
  if (periodRef.length === 7 && periodRef.includes('-W')) {
    void router.push({ name: 'calendar-week', params: { weekRef: periodRef } })
    return
  }
  if (periodRef.length === 7) {
    void router.push({ name: 'calendar-month', params: { monthRef: periodRef } })
    return
  }
  void router.push({ name: 'today-day', params: { dayRef: periodRef } })
}

async function handleToggleCompletion(item: TodayItem): Promise<void> {
  if (item.kind !== 'measurement') return
  try {
    await store.toggleCompletion(item)
  } catch (err) {
    showError(err)
  }
}

async function handleSaveEntry(item: TodayItem, value: number): Promise<void> {
  if (item.kind !== 'measurement') return
  try {
    await store.saveEntry(item, value)
    snackbarRef.value?.show(t('planning.today.messages.entrySaved'))
  } catch (err) {
    showError(err)
  }
}

async function handleClearEntry(item: TodayItem): Promise<void> {
  if (item.kind !== 'measurement') return
  try {
    await store.clearEntry(item)
    snackbarRef.value?.show(t('planning.today.messages.entryCleared'))
  } catch (err) {
    showError(err)
  }
}

async function handleHide(item: TodayItem): Promise<void> {
  try {
    await store.hideItem(item)
    hiddenExpanded.value = true
    snackbarRef.value?.show(t('planning.today.messages.hidden'))
  } catch (err) {
    showError(err)
  }
}

async function handleRestore(item: TodayItem): Promise<void> {
  try {
    await store.restoreItem(item)
    snackbarRef.value?.show(t('planning.today.messages.restored'))
  } catch (err) {
    showError(err)
  }
}

async function handleMove(item: TodayItem, dayRef: DayRef): Promise<void> {
  try {
    await store.moveScheduledItem(item, dayRef)
    snackbarRef.value?.show(t('planning.today.messages.moved'))
  } catch (err) {
    showError(err)
  }
}

async function handleClearSchedule(item: TodayItem): Promise<void> {
  try {
    await store.clearScheduledItem(item)
    snackbarRef.value?.show(t('planning.today.messages.scheduleCleared'))
  } catch (err) {
    showError(err)
  }
}

function promptDelete(item: TodayItem): void {
  pendingDeleteItem.value = item
  deleteDialogOpen.value = true
}

async function handleConfirmDelete(): Promise<void> {
  if (!pendingDeleteItem.value) return
  try {
    await store.deleteItem(pendingDeleteItem.value)
    snackbarRef.value?.show(t('planning.today.messages.deleted'))
  } catch (err) {
    showError(err)
  } finally {
    pendingDeleteItem.value = null
  }
}

function showError(error: unknown): void {
  snackbarRef.value?.show(error instanceof Error ? error.message : String(error))
}

async function loadInitialBundle(): Promise<void> {
  if (props.dayRef) {
    await store.loadBundle(props.dayRef)
    return
  }

  await store.loadBundle()
}

async function navigateToDay(targetDayRef: DayRef): Promise<void> {
  await router.push({ name: 'today-day', params: { dayRef: targetDayRef } })
}

function shiftDay(currentDayRef: DayRef, delta: number): DayRef {
  const date = new Date(`${currentDayRef}T00:00:00`)
  date.setDate(date.getDate() + delta)
  return getPeriodRefsForDate(date).day
}

async function handlePreviousDay(): Promise<void> {
  if (!effectiveDayRef.value) {
    return
  }
  await navigateToDay(shiftDay(effectiveDayRef.value, -1))
}

async function handleNextDay(): Promise<void> {
  if (!effectiveDayRef.value) {
    return
  }
  await navigateToDay(shiftDay(effectiveDayRef.value, 1))
}

watch(
  () => store.bundle?.dayRef,
  (currentDayRef) => {
    if (!currentDayRef || !props.dayRef || currentDayRef === props.dayRef) {
      return
    }
    void router.replace({ name: 'today-day', params: { dayRef: currentDayRef } })
  }
)
</script>

<style scoped>
.today-section {
  border-radius: 1.5rem;
}

.today-section-add {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.8),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.33);
  opacity: 0.7;
  transition: opacity 200ms ease;
}

.today-section-add:hover {
  opacity: 1;
}

.today-section-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--neo-border) / 0.35) 15%,
    rgb(var(--neo-border) / 0.35) 85%,
    transparent
  );
}
</style>
