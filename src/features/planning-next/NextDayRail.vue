<template>
  <DsSurface class="next-day-rail">
    <!-- Day progress: a mute filament on the top edge — no label, no counter on the surface. -->
    <span class="next-day-rail__filament" role="img" :aria-label="t('planning.today.progress', { done: doneCount, total: visibleCount })">
      <i :style="{ width: `${progressPct}%` }" />
    </span>
    <header class="next-day-rail__heading">
      <span>Plan dnia</span>
      <span class="next-day-rail__tools">
        <button
          type="button"
          class="next-day-rail__tool"
          :aria-pressed="collapseCompleted"
          :title="collapseCompleted ? t('planning.today.actions.expandCompleted') : t('planning.today.actions.collapseCompleted')"
          :aria-label="collapseCompleted ? t('planning.today.actions.expandCompleted') : t('planning.today.actions.collapseCompleted')"
          @click="toggleCollapseCompleted"
        >
          <AppIcon :name="collapseCompleted ? 'unfold_more' : 'unfold_less'" />
        </button>
      </span>
    </header>
    <DsState v-if="store.isLoading && !store.bundle" title="Ładuję dzień" body="Zbieram zaplanowane działania." />
    <DsState
      v-else-if="store.error && !store.bundle"
      icon="error"
      title="Nie udało się wczytać dnia"
      :body="store.error"
      action-label="Spróbuj ponownie"
      @action="void loadDay()"
    />
    <div v-else class="next-day-rail__scroll">
      <DsState
        v-if="!visibleGroups.length && !store.hiddenItems.length && !collapsedCount"
        icon="event_available"
        title="Nic na ten dzień"
        body="Nie ma tu jeszcze intencji, celów, nawyków ani trackerów."
      />

      <section v-for="group in visibleGroups" :key="group.id" class="next-day-rail__group">
        <header><span>{{ group.label }}</span></header>
        <NextDayItemRow
          v-for="item in group.items"
          :key="item.key"
          :item="item"
          :today-day-ref="dayRef"
          :raw-entries="store.rawEntries"
          :all-day-assignments="store.allDayAssignments"
          :is-pending="store.isPending(item.key)"
          :staged="stagedItem?.key === item.key"
          :lit="isRelatedToCompass(item, store.highlightKey)"
          :dim="store.highlightKey !== null && !isRelatedToCompass(item, store.highlightKey)"
          @select="stageKey = item.key"
          @open-object="openObject(item)"
          @open-context="openPeriod(item.contextPeriodRef)"
          @toggle-completion="handleToggleCompletion(item)"
          @toggle-multi-item="handleToggleMultiItem(item, $event)"
          @save-entry="handleSaveEntry(item, $event)"
          @clear-entry="handleClearEntry(item)"
          @hide="handleHide(item)"
          @move-tomorrow="handleMoveTomorrow(item)"
          @pick-day="store.startTargeting(item)"
          @clear-schedule="handleClearSchedule(item)"
          @request-delete="promptDelete(item)"
        >
          <!-- Stage expansion: the product chart for this week + labelled actions.
               Chart points come from the same raw entries the store patches, so the
               today dot always agrees with the control on the row. -->
          <template #expansion>
            <NextObjectChartCard
              v-if="item.kind === 'measurement'"
              bare
              scale="day"
              :icon="''"
              :title="item.subject.title"
              :summary="''"
              :entry-mode="item.subject.entryMode"
              :cadence="item.subject.cadence"
              :points="buildDayChartPoints(item, dayRef, store.rawEntries, store.allDayAssignments)"
              :actual-value="item.measurement.actualValue"
              :target-value="item.measurement.target?.value"
              :aggregate-status="item.measurement.evaluationStatus"
            />
            <span v-else />
            <div class="next-day-rail__stage-actions" role="group" :aria-label="t('planning.today.stage.actionsLabel', { title: itemTitle(item) })">
              <template v-if="item.isScheduledToday">
                <button type="button" @click="handleMoveTomorrow(item)"><AppIcon name="east" />{{ t('planning.today.stage.tomorrow') }}</button>
                <button type="button" :class="{ 'is-active': store.targetingItem?.key === item.key }" :aria-pressed="store.targetingItem?.key === item.key" @click="store.startTargeting(item)"><AppIcon name="calendar_month" />{{ t('planning.today.stage.day') }}</button>
                <button type="button" @click="handleClearSchedule(item)"><AppIcon name="event_busy" />{{ t('planning.today.stage.clearToday') }}</button>
              </template>
              <button v-else-if="item.canHide" type="button" @click="handleHide(item)"><AppIcon name="visibility_off" />{{ t('planning.today.stage.hide') }}</button>
              <button v-if="canOpenObject(item)" type="button" @click="openObject(item)"><AppIcon name="open_in_new" />{{ t('planning.today.stage.open') }}</button>
              <button v-else type="button" @click="openPeriod(item.contextPeriodRef)"><AppIcon name="event" />{{ t('planning.today.stage.context') }}</button>
            </div>
          </template>
        </NextDayItemRow>
      </section>

      <button v-if="collapseCompleted && collapsedCount" type="button" class="next-day-rail__collapsed" @click="toggleCollapseCompleted">
        <AppIcon name="expand_more" />{{ t('planning.today.completedCount', { n: collapsedCount }) }}
      </button>

      <section v-if="store.hiddenItems.length" class="next-day-rail__hidden">
        <button type="button" @click="hiddenExpanded = !hiddenExpanded"><AppIcon name="visibility_off" />Ukryte ({{ store.hiddenItems.length }})<AppIcon :name="hiddenExpanded ? 'expand_less' : 'expand_more'" /></button>
        <div v-if="hiddenExpanded">
          <span v-for="item in store.hiddenItems" :key="item.key"><strong>{{ itemTitle(item) }}</strong><DsButton icon-only variant="quiet" aria-label="Przywróć" @click="handleRestore(item)"><AppIcon name="undo" /></DsButton></span>
        </div>
      </section>
    </div>

    <AppDialog
      v-model="deleteDialogOpen"
      :title="t('planning.today.deleteDialog.title')"
      :message="deleteDialogMessage"
      :confirm-text="t('common.buttons.delete')"
      confirm-variant="filled"
      @confirm="handleConfirmDelete"
    />
    <AppSnackbar ref="snackbarRef" />
  </DsSurface>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import type { TodayItem } from '@/services/todayViewQueries'
import { getObjectsLibraryFamilyForPanelType } from '@/services/objectsLibraryQueries'
import { useTodayStore } from '@/stores/today.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useT } from '@/composables/useT'
import { getPeriodRefsForDate } from '@/utils/periods'
import { DsButton, DsState, DsSurface } from '@/design-system/components'
import NextDayItemRow from './NextDayItemRow.vue'
import NextObjectChartCard from './NextObjectChartCard.vue'
import { buildDayChartPoints } from './nextObjectChart'
import { isRelatedToCompass } from './dayViewModels'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const UNDO_SNACKBAR_MS = 7000

const props = defineProps<{ dayRef: DayRef }>()
const router = useRouter()
const { t } = useT()
const store = useTodayStore()
const preferences = useUserPreferencesStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const hiddenExpanded = ref(false)
const deleteDialogOpen = ref(false)
const pendingDeleteItem = ref<TodayItem | null>(null)
/** Row chosen as the stage by click; null = the first open item takes the stage. */
const stageKey = ref<string | null>(null)

const collapseCompleted = computed(() => preferences.todayCollapseCompleted)

const itemGroups = computed(() => [
  { id: 'intentions', label: 'Intencje tygodnia', items: store.intentionItems as TodayItem[] },
  { id: 'goals', label: 'Cele i rezultaty', items: store.goalGroupedKrItems.flatMap(group => group.items) as TodayItem[] },
  { id: 'habits', label: 'Nawyki', items: store.habitItems as TodayItem[] },
  { id: 'trackers', label: 'Trackery', items: store.trackerItems as TodayItem[] },
])
const allItems = computed(() => itemGroups.value.flatMap(group => group.items))
// Collapsing hides only finished completion-style rows; recorded numbers stay visible.
const visibleGroups = computed(() => itemGroups.value
  .map(group => ({ ...group, items: collapseCompleted.value ? group.items.filter(item => !isCompletedForCollapse(item)) : group.items }))
  .filter(group => group.items.length > 0))
const visibleItems = computed(() => visibleGroups.value.flatMap(group => group.items))
const collapsedCount = computed(() => (collapseCompleted.value ? allItems.value.filter(isCompletedForCollapse).length : 0))
const visibleCount = computed(() => allItems.value.length)
const doneCount = computed(() => allItems.value.filter(hasEntry).length)
const progressPct = computed(() => (visibleCount.value ? Math.round((doneCount.value / visibleCount.value) * 100) : 0))
// The stage follows the click; without one it rests on the first item still open,
// and moves on by itself once that item is done.
const stagedItem = computed<TodayItem | null>(() => {
  const selected = visibleItems.value.find(item => item.key === stageKey.value)
  if (selected) return selected
  return visibleItems.value.find(item => !hasEntry(item)) ?? null
})
const deleteDialogMessage = computed(() => pendingDeleteItem.value
  ? t('planning.today.deleteDialog.message', { title: itemTitle(pendingDeleteItem.value) })
  : '')

onMounted(() => void loadDay())
watch(() => props.dayRef, () => {
  stageKey.value = null
  void loadDay()
})
// The calendar card hands the picked day over through the store; the rail keeps
// ownership of the write and of the undo snackbar.
watch(() => store.pendingPick, pick => {
  if (!pick) return
  const consumed = store.consumePendingPick()
  if (consumed && consumed.dayRef !== props.dayRef) void handleMove(consumed.item, consumed.dayRef)
})

async function loadDay() {
  try {
    await store.loadBundle(props.dayRef)
  } catch {
    // The store exposes the normalized error to the shared error state.
  }
}

function itemTitle(item: TodayItem): string {
  return item.kind === 'initiative' ? item.initiative.title : item.subject.title
}

function hasEntry(item: TodayItem): boolean {
  if (item.kind === 'initiative') return Boolean(item.planState.dayRef)
  const entry = item.todayEntry
  if (!entry) return false
  if (item.subject.entryMode === 'multi-completion') return (entry.checkedItemIds?.length ?? 0) > 0
  if (item.subject.entryMode === 'completion') return true
  return typeof entry.value === 'number' && entry.value !== 0
}

function isCompletedForCollapse(item: TodayItem): boolean {
  if (item.kind === 'initiative') return Boolean(item.planState.dayRef)
  if (item.subject.entryMode === 'completion') return Boolean(item.todayEntry)
  if (item.subject.entryMode === 'multi-completion') {
    const active = (item.subject.multiItems ?? []).filter(entry => !entry.archived)
    const checked = new Set(item.todayEntry?.checkedItemIds ?? [])
    return active.length > 0 && active.every(entry => checked.has(entry.id))
  }
  return false
}

function canOpenObject(item: TodayItem): boolean {
  return item.kind === 'measurement' && item.panelType !== 'weeklyIntention'
}

function tomorrowOf(dayRef: DayRef): DayRef {
  const date = new Date(`${dayRef}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return getPeriodRefsForDate(date).day
}

function openObject(item: TodayItem) {
  if (!canOpenObject(item) || item.kind !== 'measurement') return
  void router.push({
    name: 'objects-family',
    params: { family: getObjectsLibraryFamilyForPanelType(item.panelType) },
    query: { expandedType: item.panelType, expandedId: item.subject.id },
  })
}

function openPeriod(periodRef: string) {
  if (periodRef.length === 4) void router.push({ name: 'calendar-year', params: { yearRef: periodRef } })
  else if (periodRef.includes('-W')) void router.push({ name: 'calendar-week', params: { weekRef: periodRef } })
  else if (periodRef.length === 7) void router.push({ name: 'calendar-month', params: { monthRef: periodRef } })
  else void router.push({ name: 'calendar-day', params: { dayRef: periodRef } })
}

async function toggleCollapseCompleted() {
  try {
    await preferences.setTodayCollapseCompleted(!collapseCompleted.value)
  } catch (error) {
    showError(error)
  }
}

async function handleToggleCompletion(item: TodayItem) {
  if (item.kind !== 'measurement') return
  try { await store.toggleCompletion(item) } catch (error) { showError(error) }
}

async function handleToggleMultiItem(item: TodayItem, multiItemId: string) {
  if (item.kind !== 'measurement') return
  try { await store.toggleMultiItem(item, multiItemId) } catch (error) { showError(error) }
}

async function handleSaveEntry(item: TodayItem, value: number) {
  if (item.kind !== 'measurement') return
  try { await store.saveEntry(item, value); snackbarRef.value?.show(t('planning.today.messages.entrySaved')) } catch (error) { showError(error) }
}

async function handleClearEntry(item: TodayItem) {
  if (item.kind !== 'measurement') return
  try { await store.clearEntry(item); snackbarRef.value?.show(t('planning.today.messages.entryCleared')) } catch (error) { showError(error) }
}

function showUndo(message: string) {
  snackbarRef.value?.show(message, {
    actionLabel: t('planning.today.actions.undo'),
    duration: UNDO_SNACKBAR_MS,
    onAction: () => void handleUndo(),
  })
}

async function handleUndo() {
  try { await store.undoLast(); snackbarRef.value?.show(t('planning.today.messages.undone')) } catch (error) { showError(error) }
}

async function handleHide(item: TodayItem) {
  try { await store.hideItem(item); showUndo(t('planning.today.messages.hidden')) } catch (error) { showError(error) }
}

async function handleRestore(item: TodayItem) {
  try { await store.restoreItem(item); snackbarRef.value?.show(t('planning.today.messages.restored')) } catch (error) { showError(error) }
}

async function handleMoveTomorrow(item: TodayItem) {
  await handleMove(item, tomorrowOf(props.dayRef))
}

async function handleMove(item: TodayItem, dayRef: DayRef) {
  try { await store.moveScheduledItem(item, dayRef); showUndo(t('planning.today.messages.moved')) } catch (error) { showError(error) }
}

async function handleClearSchedule(item: TodayItem) {
  try { await store.clearScheduledItem(item); snackbarRef.value?.show(t('planning.today.messages.scheduleCleared')) } catch (error) { showError(error) }
}

function promptDelete(item: TodayItem) {
  pendingDeleteItem.value = item
  deleteDialogOpen.value = true
}

async function handleConfirmDelete() {
  if (!pendingDeleteItem.value) return
  try { await store.deleteItem(pendingDeleteItem.value); snackbarRef.value?.show(t('planning.today.messages.deleted')) } catch (error) { showError(error) } finally { pendingDeleteItem.value = null }
}

function showError(error: unknown) {
  snackbarRef.value?.show(error instanceof Error ? error.message : String(error))
}
</script>
