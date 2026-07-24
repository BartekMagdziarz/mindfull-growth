<template>
  <DsSurface class="next-day-rail">
    <header class="next-day-rail__heading"><span>Plan dnia</span><small>{{ visibleItemCount }} elementów</small></header>
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
      <section v-for="group in itemGroups" :key="group.id" class="next-day-rail__group">
        <header><span>{{ group.label }}</span><small>{{ group.items.length }}</small></header>
        <p v-if="!group.items.length">Brak elementów</p>
        <TodayItemRow
          v-for="item in group.items"
          v-else
          :key="item.key"
          :item="item"
          :today-day-ref="dayRef"
          :raw-entries="store.rawEntries"
          :all-day-assignments="store.allDayAssignments"
          :is-pending="store.isPending(item.key)"
          @open-object="openObject(item)"
          @open-context="openPeriod(item.contextPeriodRef)"
          @toggle-completion="handleToggleCompletion(item)"
          @toggle-multi-item="handleToggleMultiItem(item, $event)"
          @save-entry="handleSaveEntry(item, $event)"
          @clear-entry="handleClearEntry(item)"
          @hide="handleHide(item)"
          @move="handleMove(item, $event)"
          @clear-schedule="handleClearSchedule(item)"
          @request-delete="promptDelete(item)"
        />
      </section>

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
import { useT } from '@/composables/useT'
import { DsButton, DsState, DsSurface } from '@/design-system/components'
import TodayItemRow from '@/components/today/TodayItemRow.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = defineProps<{ dayRef: DayRef }>()
const router = useRouter()
const { t } = useT()
const store = useTodayStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const hiddenExpanded = ref(false)
const deleteDialogOpen = ref(false)
const pendingDeleteItem = ref<TodayItem | null>(null)

const itemGroups = computed(() => [
  { id: 'intentions', label: 'Intencje tygodnia', items: store.intentionItems },
  { id: 'goals', label: 'Cele i rezultaty', items: store.goalGroupedKrItems.flatMap(group => group.items) },
  { id: 'habits', label: 'Nawyki', items: store.habitItems },
  { id: 'trackers', label: 'Trackery', items: store.trackerItems },
])
const visibleItemCount = computed(() => itemGroups.value.reduce((sum, group) => sum + group.items.length, 0))
const deleteDialogMessage = computed(() => pendingDeleteItem.value
  ? t('planning.today.deleteDialog.message', { title: itemTitle(pendingDeleteItem.value) })
  : '')

onMounted(() => void loadDay())
watch(() => props.dayRef, () => void loadDay())

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

function openObject(item: TodayItem) {
  if (item.kind === 'initiative' || item.panelType === 'weeklyIntention') return
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

async function handleHide(item: TodayItem) {
  try { await store.hideItem(item); hiddenExpanded.value = true; snackbarRef.value?.show(t('planning.today.messages.hidden')) } catch (error) { showError(error) }
}

async function handleRestore(item: TodayItem) {
  try { await store.restoreItem(item); snackbarRef.value?.show(t('planning.today.messages.restored')) } catch (error) { showError(error) }
}

async function handleMove(item: TodayItem, dayRef: DayRef) {
  try { await store.moveScheduledItem(item, dayRef); snackbarRef.value?.show(t('planning.today.messages.moved')) } catch (error) { showError(error) }
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
