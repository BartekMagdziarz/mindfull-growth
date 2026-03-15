<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <!-- Date navigation header -->
    <section class="neo-card mb-6 px-5 py-4">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="neo-control neo-focus"
          :disabled="store.isLoading"
          @click="void store.goToPreviousDay()"
        >
          <AppIcon name="chevron_left" class="text-base" />
        </button>
        <button
          class="neo-inset rounded-full px-4 py-2 text-sm font-semibold text-on-surface"
          @click="openDatePicker"
        >
          {{ dayLabel }}
        </button>
        <button
          class="neo-control neo-focus"
          :disabled="store.isLoading"
          @click="void store.goToNextDay()"
        >
          <AppIcon name="chevron_right" class="text-base" />
        </button>
        <div class="hidden h-8 w-px rounded-full bg-outline/35 md:block" />
        <div class="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
          <span class="neo-pill px-2 py-0.5">{{ store.goalKrItems.length }} KRs</span>
          <span class="neo-pill px-2 py-0.5">{{ store.habitItems.length }} {{ t('planning.calendar.sections.habits') }}</span>
          <span class="neo-pill px-2 py-0.5">{{ store.trackerItems.length }} {{ t('planning.calendar.sections.trackers') }}</span>
          <span class="neo-pill px-2 py-0.5">{{ store.initiativeItems.length }} {{ t('planning.calendar.sections.initiatives') }}</span>
        </div>
      </div>
      <input
        ref="dateInputRef"
        type="date"
        class="sr-only"
        :value="bundleDayRef"
        @change="handleDateChange"
      />
    </section>

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
      @action="void store.loadBundle()"
    />

    <template v-else-if="store.bundle">
      <!-- 4-column grid -->
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <!-- Goals & KRs column -->
        <section>
          <h2 class="mb-3 text-base font-semibold tracking-[-0.01em] text-on-surface">
            {{ t('planning.today.columns.goalsKrs') }}
          </h2>
          <template v-if="store.goalGroupedKrItems.length > 0">
            <div v-for="group in store.goalGroupedKrItems" :key="group.goal.id" class="mb-4 last:mb-0">
              <div class="mb-2 flex items-center gap-1.5">
                <AppIcon name="emoji_events" class="text-sm text-primary" />
                <span class="truncate text-xs font-semibold text-on-surface">{{ group.goal.title }}</span>
              </div>
              <div class="space-y-2.5 pl-1">
                <TodayItemRow
                  v-for="item in group.items"
                  :key="item.key"
                  :item="item"
                  :today-day-ref="bundleDayRef"
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
            </div>
          </template>
          <p v-else class="py-8 text-center text-xs text-on-surface-variant/50">
            {{ t('planning.today.emptyColumn') }}
          </p>
        </section>

        <!-- Habits column -->
        <section>
          <h2 class="mb-3 text-base font-semibold tracking-[-0.01em] text-on-surface">
            {{ t('planning.today.columns.habits') }}
          </h2>
          <div v-if="store.habitItems.length > 0" class="space-y-2.5">
            <template v-for="(item, idx) in store.habitItems" :key="item.key">
              <p
                v-if="idx === 0 || item.sectionId !== store.habitItems[idx - 1].sectionId"
                class="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/40"
                :class="idx > 0 ? 'mt-2 pt-2' : ''"
              >
                <span class="h-px flex-1 bg-neu-border/10" />
                <span>{{ t(`planning.today.sectionLabel.${item.sectionId}`) }}</span>
                <span class="h-px flex-1 bg-neu-border/10" />
              </p>
              <TodayItemRow
                :item="item"
                :today-day-ref="bundleDayRef"
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
            </template>
          </div>
          <p v-else class="py-8 text-center text-xs text-on-surface-variant/50">
            {{ t('planning.today.emptyColumn') }}
          </p>
        </section>

        <!-- Trackers column -->
        <section>
          <h2 class="mb-3 text-base font-semibold tracking-[-0.01em] text-on-surface">
            {{ t('planning.today.columns.trackers') }}
          </h2>
          <div v-if="store.trackerItems.length > 0" class="space-y-2.5">
            <template v-for="(item, idx) in store.trackerItems" :key="item.key">
              <p
                v-if="idx === 0 || item.sectionId !== store.trackerItems[idx - 1].sectionId"
                class="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/40"
                :class="idx > 0 ? 'mt-2 pt-2' : ''"
              >
                <span class="h-px flex-1 bg-neu-border/10" />
                <span>{{ t(`planning.today.sectionLabel.${item.sectionId}`) }}</span>
                <span class="h-px flex-1 bg-neu-border/10" />
              </p>
              <TodayItemRow
                :item="item"
                :today-day-ref="bundleDayRef"
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
            </template>
          </div>
          <p v-else class="py-8 text-center text-xs text-on-surface-variant/50">
            {{ t('planning.today.emptyColumn') }}
          </p>
        </section>

        <!-- Initiatives column -->
        <section>
          <h2 class="mb-3 text-base font-semibold tracking-[-0.01em] text-on-surface">
            {{ t('planning.today.columns.initiatives') }}
          </h2>
          <div v-if="store.initiativeItems.length > 0" class="space-y-2.5">
            <template v-for="(item, idx) in store.initiativeItems" :key="item.key">
              <p
                v-if="idx === 0 || item.sectionId !== store.initiativeItems[idx - 1].sectionId"
                class="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/40"
                :class="idx > 0 ? 'mt-2 pt-2' : ''"
              >
                <span class="h-px flex-1 bg-neu-border/10" />
                <span>{{ t(`planning.today.sectionLabel.${item.sectionId}`) }}</span>
                <span class="h-px flex-1 bg-neu-border/10" />
              </p>
              <TodayItemRow
                :item="item"
                :today-day-ref="bundleDayRef"
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
            </template>
          </div>
          <p v-else class="py-8 text-center text-xs text-on-surface-variant/50">
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import TodayItemRow from '@/components/today/TodayItemRow.vue'
import { useT } from '@/composables/useT'
import { getObjectsLibraryFamilyForPanelType } from '@/services/objectsLibraryQueries'
import type { TodayItem } from '@/services/todayViewQueries'
import { useTodayStore } from '@/stores/today.store'
import { formatDayTitle } from '@/utils/periodLabels'
import type { DayRef } from '@/domain/period'

const router = useRouter()
const { t, locale } = useT()
const store = useTodayStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const hiddenExpanded = ref(false)
const deleteDialogOpen = ref(false)
const pendingDeleteItem = ref<TodayItem | null>(null)
const dateInputRef = ref<HTMLInputElement | null>(null)

const bundleDayRef = computed(() => (store.dayRef ?? '') as DayRef)
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

onMounted(() => {
  void store.loadBundle()
})

function itemTitle(item: TodayItem): string {
  return item.kind === 'initiative' ? item.initiative.title : item.subject.title
}

function openDatePicker(): void {
  dateInputRef.value?.showPicker()
}

function handleDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value) {
    void store.goToDay(input.value as DayRef)
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
  if (periodRef.length === 7 && periodRef.includes('-W')) {
    void router.push({ name: 'calendar-week', params: { weekRef: periodRef } })
    return
  }
  if (periodRef.length === 7) {
    void router.push({ name: 'calendar-month', params: { monthRef: periodRef } })
    return
  }
  void router.push({ name: 'calendar-day', params: { dayRef: periodRef } })
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
</script>
