<template>
  <div class="mx-auto w-full max-w-[1280px] px-4 py-6 pb-16">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-3">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ t('planning.today.eyebrow') }}
        </p>
        <div>
          <h1 class="text-3xl font-semibold tracking-[-0.03em] text-on-surface md:text-[2.35rem]">
            {{ t('planning.today.title') }}
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant md:text-base">
            {{ t('planning.today.subtitle') }}
          </p>
        </div>
      </div>

      <section class="neo-card max-w-md p-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ t('common.nav.today') }}
        </p>
        <p class="mt-2 text-lg font-semibold text-on-surface">
          {{ todayLabel }}
        </p>
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ t('planning.today.summary', summaryCounts) }}
        </p>
      </section>
    </div>

    <PlanningStatePanel
      v-if="store.isLoading && !store.bundle"
      :title="t('common.loading')"
      :body="t('planning.today.subtitle')"
      :eyebrow="t('planning.today.eyebrow')"
    />

    <PlanningStatePanel
      v-else-if="store.error && !store.bundle"
      :title="t('planning.today.loadError')"
      :body="store.error"
      :eyebrow="t('planning.today.eyebrow')"
      :action-label="t('common.buttons.tryAgain')"
      @action="void store.loadBundle()"
    />

    <div v-else-if="store.bundle" class="space-y-6">
      <section v-for="section in sections" :key="section.id" class="neo-card p-5 md:p-6">
        <div
          class="flex flex-col gap-4 border-b border-white/35 pb-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="text-2xl font-semibold tracking-[-0.02em] text-on-surface">
              {{ section.title }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-on-surface-variant">
              {{ section.description }}
            </p>
          </div>

          <AppButton
            v-if="section.periodRef"
            variant="tonal"
            @click="openPeriod(section.periodRef)"
          >
            {{ section.openLabel }}
          </AppButton>
        </div>

        <div
          v-if="section.items.length === 0"
          class="neo-surface mt-5 rounded-[1.8rem] px-6 py-10 text-center text-on-surface-variant"
        >
          {{ section.empty }}
        </div>

        <div v-else class="mt-5 grid gap-4 xl:grid-cols-2">
          <TodayItemCard
            v-for="item in section.items"
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
      </section>

      <section v-if="store.hiddenItems.length > 0" class="neo-card p-5 md:p-6">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 text-left"
          @click="hiddenExpanded = !hiddenExpanded"
        >
          <div>
            <h2 class="text-xl font-semibold text-on-surface">
              {{ t('planning.today.hidden.title', { n: store.hiddenItems.length }) }}
            </h2>
            <p class="mt-2 text-sm text-on-surface-variant">
              {{ t('planning.today.hidden.description') }}
            </p>
          </div>
          <span
            class="rounded-full border border-outline/20 bg-section/70 px-3 py-1 text-xs font-semibold text-on-surface-variant"
          >
            {{
              hiddenExpanded
                ? t('planning.today.actions.hideHiddenSection')
                : t('planning.today.actions.showHiddenSection')
            }}
          </span>
        </button>

        <div v-if="hiddenExpanded" class="mt-5 space-y-3">
          <div
            v-for="item in store.hiddenItems"
            :key="item.key"
            class="neo-surface flex flex-col gap-4 rounded-[1.6rem] border border-white/35 px-4 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0">
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
              >
                {{ hiddenItemEyebrow(item) }}
              </p>
              <button
                type="button"
                class="mt-1 text-left text-base font-semibold text-on-surface transition-colors hover:text-primary-strong focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
                @click="openObject(item)"
              >
                {{ hiddenItemTitle(item) }}
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <AppButton
                variant="tonal"
                :disabled="store.isPending(item.key)"
                @click="openPeriod(item.contextPeriodRef)"
              >
                {{ t('planning.today.actions.openContext') }}
              </AppButton>
              <AppButton
                variant="filled"
                :disabled="store.isPending(item.key)"
                @click="handleRestore(item)"
              >
                {{ t('planning.today.actions.restore') }}
              </AppButton>
            </div>
          </div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import TodayItemCard from '@/components/today/TodayItemCard.vue'
import { useT } from '@/composables/useT'
import { getObjectsLibraryFamilyForPanelType } from '@/services/objectsLibraryQueries'
import type { TodayItem } from '@/services/todayViewQueries'
import { useTodayStore } from '@/stores/today.store'
import { formatPeriodLabel } from '@/utils/periodLabels'
import type { DayRef } from '@/domain/period'

const router = useRouter()
const { t, locale } = useT()
const store = useTodayStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const hiddenExpanded = ref(false)
const deleteDialogOpen = ref(false)
const pendingDeleteItem = ref<TodayItem | null>(null)

const bundleDayRef = computed(() => (store.dayRef ?? '') as DayRef)
const todayLabel = computed(() => {
  if (!store.bundle) {
    return ''
  }

  return formatPeriodLabel(store.bundle.dayRef, locale.value, t('planning.calendar.scales.week'))
})

const summaryCounts = computed(() => ({
  scheduled: store.scheduledItems.length,
  week: store.weekItems.length,
  month: store.monthItems.length,
}))

const sections = computed(() => {
  const refs = store.bundle?.refs

  return [
    {
      id: 'scheduled' as const,
      title: t('planning.today.sections.scheduled'),
      description: t('planning.today.sections.scheduledDescription'),
      items: store.scheduledItems,
      periodRef: undefined,
      openLabel: '',
      empty: t('planning.today.empty.scheduled'),
    },
    {
      id: 'week' as const,
      title: t('planning.today.sections.week'),
      description: t('planning.today.sections.weekDescription'),
      items: store.weekItems,
      periodRef: refs?.week,
      openLabel: t('planning.calendar.actions.openWeek'),
      empty: t('planning.today.empty.week'),
    },
    {
      id: 'month' as const,
      title: t('planning.today.sections.month'),
      description: t('planning.today.sections.monthDescription'),
      items: store.monthItems,
      periodRef: refs?.month,
      openLabel: t('planning.calendar.actions.openMonth'),
      empty: t('planning.today.empty.month'),
    },
  ]
})

const deleteDialogMessage = computed(() => {
  if (!pendingDeleteItem.value) {
    return ''
  }

  return t('planning.today.deleteDialog.message', {
    title: hiddenItemTitle(pendingDeleteItem.value),
  })
})

onMounted(() => {
  void store.loadBundle()
})

function hiddenItemTitle(item: TodayItem): string {
  return item.kind === 'initiative' ? item.initiative.title : item.subject.title
}

function hiddenItemEyebrow(item: TodayItem): string {
  if (item.kind === 'initiative') {
    return t('planning.objects.labels.initiative')
  }

  return t(`planning.objects.labels.${item.panelType}`)
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
  if (item.kind !== 'measurement') {
    return
  }

  try {
    await store.toggleCompletion(item)
  } catch (err) {
    showError(err)
  }
}

async function handleSaveEntry(item: TodayItem, value: number): Promise<void> {
  if (item.kind !== 'measurement') {
    return
  }

  try {
    await store.saveEntry(item, value)
    snackbarRef.value?.show(t('planning.today.messages.entrySaved'))
  } catch (err) {
    showError(err)
  }
}

async function handleClearEntry(item: TodayItem): Promise<void> {
  if (item.kind !== 'measurement') {
    return
  }

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
  if (!pendingDeleteItem.value) {
    return
  }

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
