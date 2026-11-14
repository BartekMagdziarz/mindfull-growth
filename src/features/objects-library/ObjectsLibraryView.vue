<template>
  <MeasurementCriteriaDialog
    :request="criteriaEditor.request.value"
    @choose="criteriaEditor.choose"
  />
  <div class="mg-design-v2 objects-v2 mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <ObjectsLibraryToolbar
      :create-label="createButtonLabel"
      :family-options="familyOptions"
      @create="handleOpenCreate"
      @family-change="handleFamilyChange"
      @search="handleSearch"
      @period="handlePeriodChange"
      @toggle-life-area="handleLifeAreaToggle"
      @toggle-priority="handlePriorityToggle"
      @toggle-closed="handleClosedToggle"
      @reset="handleClearFilters"
    />

    <section class="mt-6 space-y-4">
      <DsState
        v-if="store.isLoading && !isComposerOpen"
        :title="t('common.loading')"
        :body="activeFamilyTitle"
      />

      <DsState
        v-else-if="store.error && !isComposerOpen"
        icon="error"
        :title="t('planning.objects.loadError')"
        :body="store.error"
        :action-label="t('common.buttons.tryAgain')"
        @action="void store.loadBundle()"
      />

      <DsState
        v-else-if="store.items.length === 0 && isFamilyEmptyState && !isComposerOpen"
        icon="inbox"
        :title="familyEmptyTitle"
        :body="activeFamilyTitle"
        :action-label="createButtonLabel"
        @action="handleOpenCreate"
      />

      <DsState
        v-else-if="store.items.length === 0 && !isComposerOpen"
        icon="filter_alt"
        :title="t('planning.objects.empty.filteredTitle')"
        :body="filteredEmptyBody"
      >
        <template #actions>
          <div class="flex flex-wrap justify-center gap-3">
            <DsButton variant="quiet" @click="handleClearFilters">
              {{ t('planning.objects.filters.resetAll') }}
            </DsButton>
            <DsButton @click="handleOpenCreate">
              <AppIcon name="add" class="text-base" />
              {{ createButtonLabel }}
            </DsButton>
          </div>
        </template>
      </DsState>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="item in store.items" :key="`${item.panelType}:${item.id}`" class="space-y-3">
          <!-- Goal-specific unified card -->
          <ObjectsLibraryGoalCard
            v-if="item.panelType === 'goal'"
            :item="item"
            :linked-months="goalLinkedMonths(item)"
            :save-months="
              refs =>
                saveGoalMonths(
                  item.id,
                  goalLinkedMonths(item).map(month => month.monthRef),
                  refs
                )
            "
            :save-kr-periods="saveKrPeriods"
            :status-options="statusOptionsForType('goal')"
            :priority-options="store.filterOptions.priorities"
            :life-area-options="store.filterOptions.lifeAreas"
            :expanded-kr-id="expandedKrId"
            :expanded-kr-periods="expandedKrPeriods"
            :cadence-options="cadenceOptions"
            :entry-mode-options="entryModeOptions"
            :kr-status-options="statusOptionsForType('keyResult')"
            :kr-target-operator-options="krTargetOperatorOptions"
            :kr-target-aggregation-options="krTargetAggregationOptions"
            :kr-show-target-aggregation="krShowTargetAggregation"
            :is-new="newIds.goal.value === item.id"
            @field-change="handleGoalFieldChange"
            @link-month="handleGoalLinkMonth"
            @unlink-month="handleGoalUnlinkMonth"
            @archive="(id, isActive) => handleArchiveFromCard('goal', id, isActive)"
            @delete="(id, title) => handleDeleteFromCard('goal', id, title)"
            @edit="handleGoalEdit"
            @add-key-result="handleCreateChildKeyResult"
            @kr-toggle-expand="handleKrToggleExpand"
            @kr-field-change="handleKrFieldChange"
            @kr-link-period="handleKrLinkPeriod"
            @kr-unlink-period="handleKrUnlinkPeriod"
            @kr-delete="handleKrDelete"
            @kr-archive="handleKrArchive"
            @close-ritual="handleGoalCloseRitual"
          />

          <ObjectsLibraryPriorityCard
            v-else-if="item.panelType === 'priority'"
            :item="item"
            :status-options="statusOptionsForType('priority')"
            :life-area-options="store.filterOptions.lifeAreas"
            :is-new="newIds.priority.value === item.id"
            @field-change="handlePriorityFieldChange"
            @link-year="handlePriorityLinkYear"
            @unlink-year="handlePriorityUnlinkYear"
            @archive="handlePriorityArchive"
            @delete="(id, title) => handleDeleteFromCard('priority', id, title)"
            @drafts-changed="handlePriorityDraftsChanged"
            @drafts-notify="notify"
            @drafts-error="notify"
          />

          <!-- Habit/Tracker unified inline card -->
          <ObjectsLibraryMeasurementCard
            v-else-if="item.panelType === 'habit' || item.panelType === 'tracker'"
            :item="item"
            :panel-type="item.panelType"
            :save-periods="
              refs =>
                saveMeasurementPeriods(
                  item.id,
                  item.panelType as 'habit' | 'tracker',
                  item.cadence ?? 'weekly',
                  expandedMeasurementPeriods.map(period => period.periodRef),
                  refs
                )
            "
            :save-schedule="
              item.panelType === 'habit'
                ? (refs, permanent) =>
                    saveHabitSchedule(item.id, item.cadence ?? 'weekly', refs, permanent)
                : undefined
            "
            :is-expanded="expandedMeasurementId === item.id"
            :is-new="newIds.measurement.value === item.id"
            :linked-periods="expandedMeasurementId === item.id ? expandedMeasurementPeriods : []"
            :cadence-options="cadenceOptions"
            :entry-mode-options="entryModeOptions"
            :status-options="statusOptionsForType(item.panelType)"
            :priority-options="store.filterOptions.priorities"
            :life-area-options="store.filterOptions.lifeAreas"
            @toggle-expand="
              handleMeasurementToggleExpand(
                item.id,
                item.panelType as 'habit' | 'tracker',
                item.cadence ?? 'weekly'
              )
            "
            @field-change="handleMeasurementFieldChange"
            @link-period="
              (id, ref) =>
                handleMeasurementLinkPeriod(
                  id,
                  item.panelType as 'habit' | 'tracker',
                  ref,
                  item.cadence ?? 'weekly'
                )
            "
            @unlink-period="
              (id, ref) =>
                handleMeasurementUnlinkPeriod(
                  id,
                  item.panelType as 'habit' | 'tracker',
                  ref,
                  item.cadence ?? 'weekly'
                )
            "
            @archive="(id, isActive) => handleArchiveFromCard(item.panelType, id, isActive)"
            @delete="(id, title) => handleDeleteFromCard(item.panelType, id, title)"
          />

          <!-- Weekly intention inline card -->
          <ObjectsLibraryIntentionCard
            v-else-if="item.panelType === 'weeklyIntention'"
            :item="item"
            :priority-options="store.filterOptions.priorities"
            :is-new="newIds.intention.value === item.id"
            @save="handleIntentionSave"
            @delete="(id, title) => handleDeleteFromCard('weeklyIntention', id, title)"
          />
        </div>
      </div>
    </section>

    <AppDialog
      v-model="deleteDialogOpen"
      :title="t('planning.objects.deleteDialog.title')"
      :message="deleteDialogMessage"
      :confirm-text="t('common.buttons.delete')"
      confirm-variant="filled"
      panel-class="mg-v2-surface mg-v2-surface--raised"
      @confirm="handleConfirmDelete"
    />
    <AppDialog
      v-model="reopenDialogOpen"
      :title="t('planning.goalClosing.reopen.title')"
      :message="reopenDialogMessage"
      :confirm-text="t('planning.goalClosing.reopen.confirm')"
      confirm-variant="filled"
      panel-class="mg-v2-surface mg-v2-surface--raised"
      @confirm="handleConfirmReopen"
    />
    <AppDialog
      v-model="isGoalWizardOpen"
      :title="
        goalWizardMode === 'edit'
          ? t('planning.goalWizard.editTitle')
          : t('planning.goalWizard.title')
      "
      size="3xl"
      :close-on-backdrop="false"
      panel-class="mg-v2-surface mg-v2-surface--raised"
      @cancel="handleGoalWizardCancelled"
    >
      <GoalCreationWizard
        v-if="isGoalWizardOpen"
        :priority-options="store.filterOptions.priorities"
        :life-area-options="store.filterOptions.lifeAreas"
        :mode="goalWizardMode"
        :edit-input="goalWizardEditInput ?? undefined"
        @saved="handleGoalWizardSaved"
        @cancelled="handleGoalWizardCancelled"
        @error="handleGoalWizardError"
      />
    </AppDialog>
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MeasurementCriteriaDialog from '@/components/objects/MeasurementCriteriaDialog.vue'
import { useMeasurementCriteriaEditor } from '@/composables/useMeasurementCriteriaEditor'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { DsButton, DsState } from '@/design-system/components'
import { useT } from '@/composables/useT'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'
import GoalCreationWizard from './GoalCreationWizard.vue'
import ObjectsLibraryGoalCard from './ObjectsLibraryGoalCard.vue'
import ObjectsLibraryIntentionCard from './ObjectsLibraryIntentionCard.vue'
import ObjectsLibraryMeasurementCard from './ObjectsLibraryMeasurementCard.vue'
import ObjectsLibraryPriorityCard from './ObjectsLibraryPriorityCard.vue'
import ObjectsLibraryToolbar from './ObjectsLibraryToolbar.vue'
import type { LibraryContext } from './libraryContext'
import { useLibraryFieldChanges } from './useLibraryFieldChanges'
import { useLibraryGoals } from './useLibraryGoals'
import { useLibraryLifecycle } from './useLibraryLifecycle'
import { useLibraryOptions } from './useLibraryOptions'
import { useLibraryPeriods } from './useLibraryPeriods'
import { useLibraryRoute } from './useLibraryRoute'

/**
 * Biblioteka obiektów (/objects/:family): the toolbar, one card per object and
 * the dialogs. The view only wires the feature's composables together — state
 * and writes live in use*.ts next to it (P-5, 2026-11-01).
 */
const props = defineProps<{ family: string | string[] }>()

const router = useRouter()
const route = useRoute()
const { t, locale } = useT()
const store = useObjectsLibraryStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

function notify(message: string): void {
  snackbarRef.value?.show(message)
}

const criteriaEditor = useMeasurementCriteriaEditor()
const ctx: LibraryContext = {
  criteriaEditor,
  store,
  t,
  locale,
  notify,
  notifyError: (err, fallbackKey = 'planning.objects.messages.saveError') =>
    notify(err instanceof Error ? err.message : t(fallbackKey)),
  newIds: {
    goal: ref<string | null>(null),
    measurement: ref<string | null>(null),
    intention: ref<string | null>(null),
    priority: ref<string | null>(null),
  },
}
const { newIds } = ctx

const {
  familyOptions,
  activeFamilyTitle,
  filteredEmptyBody,
  createButtonLabel,
  familyEmptyTitle,
  isFamilyEmptyState,
  cadenceOptions,
  entryModeOptions,
  statusOptionsForType,
  krTargetOperatorOptions,
  krTargetAggregationOptions,
  krShowTargetAggregation,
} = useLibraryOptions(ctx)

const {
  syncRoute,
  handleFamilyChange,
  handleSearch,
  handlePeriodChange,
  handleLifeAreaToggle,
  handlePriorityToggle,
  handleClosedToggle,
  handleClearFilters,
} = useLibraryRoute(ctx, router)

const periods = useLibraryPeriods(ctx)
const {
  expandedKrId,
  expandedKrPeriods,
  expandedMeasurementId,
  expandedMeasurementPeriods,
  goalLinkedMonths,
  handleKrToggleExpand,
  handleMeasurementToggleExpand,
  saveGoalMonths,
  saveKrPeriods,
  saveHabitSchedule,
  saveMeasurementPeriods,
  handleKrLinkPeriod,
  handleKrUnlinkPeriod,
  handleMeasurementLinkPeriod,
  handleMeasurementUnlinkPeriod,
  handleGoalLinkMonth,
  handleGoalUnlinkMonth,
} = periods

const {
  isGoalWizardOpen,
  goalWizardMode,
  goalWizardEditInput,
  reopenDialogOpen,
  reopenDialogMessage,
  openGoalWizard,
  handleGoalWizardSaved,
  handleGoalWizardCancelled,
  handleGoalWizardError,
  handleGoalEdit,
  handleGoalFieldChange,
  handleConfirmReopen,
  handleGoalCloseRitual,
} = useLibraryGoals(ctx, router, route)

const {
  handleKrFieldChange,
  handleKrArchive,
  handleMeasurementFieldChange,
  handlePriorityFieldChange,
  handlePriorityLinkYear,
  handlePriorityUnlinkYear,
  handlePriorityDraftsChanged,
  handlePriorityArchive,
  handleIntentionSave,
} = useLibraryFieldChanges(ctx, periods)

const {
  deleteDialogOpen,
  deleteDialogMessage,
  handleOpenCreate,
  handleCreateChildKeyResult,
  handleArchiveFromCard,
  handleDeleteFromCard,
  handleKrDelete,
  handleConfirmDelete,
} = useLibraryLifecycle(ctx, {
  router,
  syncRoute,
  openGoalWizard,
  expandedKrId,
  expandedMeasurementId,
  loadKrPeriods: periods.loadKrPeriods,
  loadMeasurementPeriods: periods.loadMeasurementPeriods,
})

/** A `?composer=` deep link (legacy inline editor) keeps the list's states quiet. */
const isComposerOpen = computed(() => Boolean(store.query.composerMode))

watch(
  () => route.fullPath,
  async () => {
    store.hydrateFromRoute(props.family, route.query as Record<string, unknown>)
    await store.loadBundle()
  },
  { immediate: true }
)
</script>

<style scoped>
/* The v2 root's min-width/canvas background are meant for full-viewport
   workspaces; this view is a centered column inside AppShell. */
.objects-v2 {
  min-width: 0;
  background: transparent;
}
</style>
