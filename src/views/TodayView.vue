<template>
  <div class="today-view mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
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
      <!-- Three-zone day grid:
           A. Wellness column with date switcher + Dziennik / Emocje / Ćwiczenia
           B. Cele / Nawyki / Trackery stacked sections
           C. Przegląd overview with chart tiles -->
      <div class="today-grid">
        <!-- Zone A -->
        <aside class="zone-a">
          <TodayDateSwitcher
            :day-ref="bundleDayRef"
            :prev-disabled="store.isLoading"
            :next-disabled="store.isLoading"
            @prev="void handlePreviousDay()"
            @next="void handleNextDay()"
            @pill-click="openDatePicker"
          />
          <input
            ref="dateInputRef"
            type="date"
            class="sr-only"
            :value="bundleDayRef"
            @change="handleDateChange"
          />

          <JournalStreakCard
            :state="journalState"
            :entries7d="journalEntries7d"
            :week-streak="journalWeekStreak"
          />
          <EmotionStreakCard
            :target="DAILY_EMOTION_TARGET"
            :logs="todayEmotionLogs"
            :logs7d="emotionLogs7d"
            :week-streak="emotionWeekStreak"
          />
          <ExerciseCard />
        </aside>

        <!-- Zone B -->
        <aside class="zone-b">
          <section class="zb-section neo-raised">
            <header class="zb-section__head">
              <span class="zb-section__label">{{ t('planning.today.columns.goalsKrs') }}</span>
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
                    class="zb-section__divider"
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
            <p v-else class="zb-section__empty">
              {{ t('planning.today.emptyColumn') }}
            </p>
          </section>

          <section class="zb-section neo-raised">
            <header class="zb-section__head">
              <span class="zb-section__label">{{ t('planning.today.columns.habits') }}</span>
            </header>
            <template v-if="store.habitItems.length > 0">
              <div v-for="(item, itemIndex) in store.habitItems" :key="item.key">
                <div v-if="itemIndex !== 0" class="zb-section__divider" />
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
            <p v-else class="zb-section__empty">
              {{ t('planning.today.emptyColumn') }}
            </p>
          </section>

          <section class="zb-section neo-raised">
            <header class="zb-section__head">
              <span class="zb-section__label">{{ t('planning.today.columns.trackers') }}</span>
            </header>
            <template v-if="store.trackerItems.length > 0">
              <div v-for="(item, itemIndex) in store.trackerItems" :key="item.key">
                <div v-if="itemIndex !== 0" class="zb-section__divider" />
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
            <p v-else class="zb-section__empty">
              {{ t('planning.today.emptyColumn') }}
            </p>
          </section>
        </aside>

        <!-- Zone C: Przegląd -->
        <section class="zone-c">
          <TodayOverviewSection
            :goal-items="overviewGoalItems"
            :habit-items="store.habitItems"
            :tracker-items="store.trackerItems"
            :today-day-ref="bundleDayRef"
            :raw-entries="store.rawEntries"
            :all-day-assignments="store.allDayAssignments"
          />
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
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import JournalStreakCard from '@/components/today/JournalStreakCard.vue'
import EmotionStreakCard from '@/components/today/EmotionStreakCard.vue'
import ExerciseCard from '@/components/today/ExerciseCard.vue'
import TodayItemRow from '@/components/today/TodayItemRow.vue'
import TodayDateSwitcher from '@/components/today/TodayDateSwitcher.vue'
import TodayOverviewSection from '@/components/today/TodayOverviewSection.vue'
import { useT } from '@/composables/useT'
import { getObjectsLibraryFamilyForPanelType } from '@/services/objectsLibraryQueries'
import type { TodayItem } from '@/services/todayViewQueries'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTodayStore } from '@/stores/today.store'
import { getQuadrant } from '@/domain/emotion'
import type { Quadrant } from '@/domain/emotion'
import type { EmotionDonutLog } from '@/components/today/EmotionStreakCard.vue'
import type { DayRef } from '@/domain/period'
import { getPeriodRefsForDate } from '@/utils/periods'
import { computeWeeklyStreak, toLocalDateKey } from '@/utils/streaks'

const DAILY_EMOTION_TARGET = 3

const props = defineProps<{
  dayRef?: DayRef
}>()

const router = useRouter()
const { t } = useT()
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

const deleteDialogMessage = computed(() => {
  if (!pendingDeleteItem.value) return ''
  return t('planning.today.deleteDialog.message', {
    title: itemTitle(pendingDeleteItem.value),
  })
})

// Flatten grouped KR items into a single list for the Przegląd grid
const overviewGoalItems = computed<TodayItem[]>(() =>
  store.goalGroupedKrItems.flatMap((g) => g.items),
)

// Reference date the wellness cards calculate against (= visible bundle day).
const wellnessReferenceDate = computed(() => {
  const [y, m, d] = bundleDayRef.value.split('-').map(Number)
  return new Date(y, m - 1, d)
})

function lastSevenDayKeys(reference: Date): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - i)
    set.add(toLocalDateKey(d))
  }
  return set
}

// --- Dziennik / Journal card data ---------------------------------------
const journalEntryDays = computed<Set<string>>(() => {
  const set = new Set<string>()
  for (const entry of journalStore.entries) {
    set.add(entry.createdAt.slice(0, 10))
  }
  return set
})

const journalState = computed<'empty' | 'done'>(() =>
  journalEntryDays.value.has(toLocalDateKey(wellnessReferenceDate.value)) ? 'done' : 'empty',
)

const journalEntries7d = computed(() => {
  const window = lastSevenDayKeys(wellnessReferenceDate.value)
  let count = 0
  for (const entry of journalStore.entries) {
    if (window.has(entry.createdAt.slice(0, 10))) count++
  }
  return count
})

const journalWeekStreak = computed(() =>
  computeWeeklyStreak(
    journalStore.entries.map((e) => e.createdAt),
    wellnessReferenceDate.value,
  ),
)

// --- Emocje / Emotions card data ----------------------------------------
const todayEmotionLogs = computed<EmotionDonutLog[]>(() => {
  const todayKey = toLocalDateKey(wellnessReferenceDate.value)
  const logs = emotionLogStore.logs
    .filter((l) => l.createdAt.slice(0, 10) === todayKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return logs.map((log) => {
    const counts: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
    let total = 0
    for (const eid of log.emotionIds) {
      const em = emotionStore.getEmotionById(eid)
      if (em) {
        counts[getQuadrant(em)]++
        total++
      }
    }
    if (total === 0) {
      return { quadrants: {} }
    }
    return {
      quadrants: {
        'high-energy-high-pleasantness': counts['high-energy-high-pleasantness'] / total,
        'high-energy-low-pleasantness': counts['high-energy-low-pleasantness'] / total,
        'low-energy-high-pleasantness': counts['low-energy-high-pleasantness'] / total,
        'low-energy-low-pleasantness': counts['low-energy-low-pleasantness'] / total,
      },
    }
  })
})

const emotionLogs7d = computed(() => {
  const window = lastSevenDayKeys(wellnessReferenceDate.value)
  let count = 0
  for (const log of emotionLogStore.logs) {
    if (window.has(log.createdAt.slice(0, 10))) count++
  }
  return count
})

const emotionWeekStreak = computed(() =>
  computeWeeklyStreak(
    emotionLogStore.logs.map((l) => l.createdAt),
    wellnessReferenceDate.value,
  ),
)

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
.today-view {
  color: rgb(var(--neo-text));
}

/* Three-zone day layout. Each column owns its own height (no stretching) so
   wellness, the goal/habit/tracker stack, and the overview tile grid each
   stay as tall as their own content. */
.today-grid {
  display: grid;
  grid-template-columns: 168px 360px 1fr;
  gap: 16px;
  align-items: start;
}

.zone-a {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.zone-b {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.zone-c {
  min-width: 0;
}

/* Stacked section card (Cele/Nawyki/Trackery) */
.zb-section {
  padding: 10px 16px 8px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
}

.zb-section__head {
  display: flex;
  align-items: center;
  height: 24px;
  margin-bottom: 2px;
}

.zb-section__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  color: rgb(var(--neo-muted));
  text-transform: uppercase;
}

.zb-section__divider {
  height: 1px;
  margin: 0 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--neo-border) / 0.45),
    transparent
  );
}

.zb-section__empty {
  padding: 24px 0;
  text-align: center;
  font-size: 11px;
  color: rgb(var(--neo-muted) / 0.7);
}

@media (max-width: 1180px) {
  .today-grid {
    grid-template-columns: 168px 1fr;
  }

  .zone-c {
    grid-column: 1 / -1;
  }
}

@media (max-width: 880px) {
  .today-grid {
    grid-template-columns: 1fr;
  }
}
</style>
