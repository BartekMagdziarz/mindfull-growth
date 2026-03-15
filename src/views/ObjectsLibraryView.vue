<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <div class="mb-6 space-y-4">
      <div class="px-1">
        <h1 class="text-3xl font-semibold tracking-[-0.03em] text-on-surface md:text-[2.35rem]">
          {{ activeFamilyTitle }}
        </h1>
      </div>

      <div class="flex flex-col gap-4 xl:flex-row xl:items-start">
        <section class="neo-card flex flex-shrink-0 items-center gap-3 px-5 py-4">
          <AppButton variant="filled" class="!px-3" :aria-label="createButtonLabel" @click="handleOpenCreate">
            <AppIcon name="add" class="text-base" />
          </AppButton>

          <div class="neo-segmented">
            <button
              v-for="item in familyOptions"
              :key="item.family"
              type="button"
              :class="[
                'neo-segmented__item neo-focus',
                item.family === store.query.family ? 'neo-segmented__item--active' : '',
              ]"
              @click="handleFamilyChange(item.family)"
            >
              {{ item.label }}
            </button>
          </div>
        </section>

        <ObjectsLibraryFilters
          class="min-w-0 flex-1"
          :query="store.query"
          :period-value="periodDraft"
          :period-error="periodError"
          :has-active-filters="store.hasActiveFilters"
          :reset-all-label="t('planning.objects.filters.resetAll')"
          :empty-state-label="t('planning.objects.filters.noOptions')"
          :filters-label="t('planning.objects.filters.showMore')"
          :hide-filters-label="t('planning.objects.filters.showLess')"
          :life-areas="store.filterOptions.lifeAreas"
          :priorities="store.filterOptions.priorities"
          :search-label="t('planning.objects.filters.search')"
          :search-placeholder="t('planning.objects.filters.searchPlaceholder')"
          :period-label="t('planning.objects.filters.period')"
          :period-placeholder="t('planning.objects.filters.periodPlaceholder')"
          :closed-label="t('planning.objects.filters.showClosedAndArchived')"
          :life-areas-label="t('planning.objects.filters.lifeAreas')"
          :priorities-label="t('planning.objects.filters.priorities')"
          :clear-label="t('planning.objects.filters.clear')"
          @update:search="handleSearch"
          @update:period-value="handlePeriodDraftUpdate"
          @commit:period="handlePeriodCommit"
          @toggle:life-area="handleLifeAreaToggle"
          @toggle:priority="handlePriorityToggle"
          @toggle:closed="handleClosedToggle"
          @reset:all="handleClearFilters"
          @clear:life-areas="handleClearLifeAreas"
          @clear:priorities="handleClearPriorities"
        />
      </div>
    </div>

    <section class="mt-6 space-y-4">
      <PlanningStatePanel
        v-if="store.isLoading && !isComposerOpen"
        :title="t('common.loading')"
        :body="activeFamilyTitle"
        :eyebrow="activeFamilyTitle"
      />

      <PlanningStatePanel
        v-else-if="store.error && !isComposerOpen"
        :title="t('planning.objects.loadError')"
        :body="store.error"
        :eyebrow="activeFamilyTitle"
        :action-label="t('common.buttons.tryAgain')"
        @action="void store.loadBundle()"
      />

      <PlanningStatePanel
        v-else-if="store.items.length === 0 && isFamilyEmptyState && !isComposerOpen"
        :title="t('planning.objects.empty.familyTitle')"
        :eyebrow="activeFamilyTitle"
        :action-label="createButtonLabel"
        @action="handleOpenCreate"
      />

      <PlanningStatePanel
        v-else-if="store.items.length === 0 && !isComposerOpen"
        :title="t('planning.objects.empty.filteredTitle')"
        :eyebrow="activeFamilyTitle"
      >
        <template #actions>
          <div class="flex flex-wrap justify-center gap-3">
            <AppButton variant="outlined" @click="handleClearFilters">
              {{ t('planning.objects.filters.resetAll') }}
            </AppButton>
            <AppButton variant="filled" @click="handleOpenCreate">
              <AppIcon name="add" class="text-base" />
              {{ createButtonLabel }}
            </AppButton>
          </div>
        </template>
      </PlanningStatePanel>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-if="showCreateCard"
          class="space-y-3"
        >
          <ObjectsLibraryInlineEditor
            :draft="draft"
            :panel-type="resolvedComposerType"
            :is-create-mode="true"
            :heading="composerHeading"
            :mode-label="t('planning.objects.panel.modeCreate')"
            :type-label="resolvePanelTypeLabel(resolvedComposerType)"
            :parent-label="composerParentGoalLabel"
            :help-text="t('planning.objects.panel.createHelp')"
            :save-label="t('common.buttons.create')"
            :cancel-label="t('common.buttons.cancel')"
            :delete-label="t('common.buttons.delete')"
            :none-label="t('common.none')"
            :clear-label="t('planning.objects.filters.clear')"
            :add-label="t('common.buttons.add')"
            :can-save="canSaveDraft"
            :show-delete="false"
            :hide-goal-select="resolvedComposerType === 'keyResult' && Boolean(store.query.composerParentId)"
            :goal-options="store.filterOptions.goals"
            :life-area-options="store.filterOptions.lifeAreas"
            :priority-options="store.filterOptions.priorities"
            :status-options="statusOptions"
            :cadence-options="cadenceOptions"
            :entry-mode-options="entryModeOptions"
            :target-operator-options="targetOperatorOptions"
            :target-aggregation-options="targetAggregationOptions"
            :show-target-aggregation="showTargetAggregation"
            :labels="editorLabels"
            @cancel="handleCancelComposer"
            @save="handleSaveComposer"
          />
        </div>

        <div
          v-for="item in store.items"
          :key="`${item.panelType}:${item.id}`"
          class="space-y-3"
          :class="cardGridClasses(item.panelType, item.id)"
        >
          <!-- Goal-specific unified card -->
          <ObjectsLibraryGoalCard
            v-if="item.panelType === 'goal'"
            :item="item"
            :linked-months="goalLinkedMonths(item)"
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
            :is-new="newGoalId === item.id"
            @field-change="handleGoalFieldChange"
            @link-month="handleGoalLinkMonth"
            @unlink-month="handleGoalUnlinkMonth"
            @archive="handleGoalArchive"
            @delete="handleGoalDelete"
            @add-key-result="handleCreateChildKeyResult"
            @kr-toggle-expand="handleKrToggleExpand"
            @kr-field-change="handleKrFieldChange"
            @kr-link-period="handleKrLinkPeriod"
            @kr-unlink-period="handleKrUnlinkPeriod"
            @kr-delete="handleKrDelete"
            @kr-archive="handleKrArchive"
          />

          <!-- Habit/Tracker unified inline card -->
          <ObjectsLibraryMeasurementCard
            v-else-if="item.panelType === 'habit' || item.panelType === 'tracker'"
            :item="item"
            :panel-type="item.panelType"
            :is-expanded="expandedMeasurementId === item.id"
            :is-new="newMeasurementId === item.id"
            :linked-periods="expandedMeasurementId === item.id ? expandedMeasurementPeriods : []"
            :cadence-options="cadenceOptions"
            :entry-mode-options="entryModeOptions"
            :status-options="statusOptionsForType(item.panelType)"
            :priority-options="store.filterOptions.priorities"
            :life-area-options="store.filterOptions.lifeAreas"
            @toggle-expand="handleMeasurementToggleExpand(item.id, item.panelType as 'habit' | 'tracker', item.cadence ?? 'weekly')"
            @field-change="handleMeasurementFieldChange"
            @link-period="(id, ref) => handleMeasurementLinkPeriod(id, item.panelType as 'habit' | 'tracker', ref, item.cadence ?? 'weekly')"
            @unlink-period="(id, ref) => handleMeasurementUnlinkPeriod(id, item.panelType as 'habit' | 'tracker', ref, item.cadence ?? 'weekly')"
            @archive="(id, isActive) => handleArchiveFromCard(item.panelType, id, isActive)"
            @delete="(id, title) => handleDeleteFromCard(item.panelType, id, title)"
          />

          <!-- Initiative unified inline card -->
          <ObjectsLibraryInitiativeCard
            v-else-if="item.panelType === 'initiative'"
            :item="item"
            :status-options="statusOptionsForType('initiative')"
            :priority-options="store.filterOptions.priorities"
            :life-area-options="store.filterOptions.lifeAreas"
            :goal-options="store.filterOptions.goals"
            :is-new="newInitiativeId === item.id"
            @field-change="handleInitiativeFieldChange"
            @archive="(id, isActive) => handleArchiveFromCard('initiative', id, isActive)"
            @delete="(id, title) => handleDeleteFromCard('initiative', id, title)"
          />

          <section
            v-if="item.panelType !== 'goal' && item.panelType !== 'habit' && item.panelType !== 'tracker' && item.panelType !== 'initiative' && isExpansionHost(item.panelType, item.id) && isComposerHostedByItem(item.panelType, item.id) && isComposerReady && !(composerMode === 'edit' && resolvedComposerType === 'keyResult')"
            class="rounded-2xl border border-white/40 bg-white/45 p-3"
          >
            <ObjectsLibraryInlineEditor
              :draft="draft"
              :panel-type="resolvedComposerType"
              :is-create-mode="isCreateMode"
              :heading="composerHeading"
              :mode-label="isCreateMode ? t('planning.objects.panel.modeCreate') : t('planning.objects.panel.modeEdit')"
              :type-label="resolvePanelTypeLabel(resolvedComposerType)"
              :parent-label="composerParentGoalLabel"
              :help-text="isCreateMode ? t('planning.objects.panel.createHelp') : t('planning.objects.panel.editHelp')"
              :save-label="isCreateMode ? t('common.buttons.create') : t('common.buttons.save')"
              :cancel-label="t('common.buttons.cancel')"
              :delete-label="t('common.buttons.delete')"
              :none-label="t('common.none')"
              :clear-label="t('planning.objects.filters.clear')"
              :add-label="t('common.buttons.add')"
              :can-save="canSaveDraft"
              :show-delete="!isCreateMode"
              :hide-goal-select="resolvedComposerType === 'keyResult' && Boolean(store.query.composerParentId)"
              :goal-options="store.filterOptions.goals"
              :life-area-options="store.filterOptions.lifeAreas"
              :priority-options="store.filterOptions.priorities"
              :status-options="statusOptions"
              :cadence-options="cadenceOptions"
              :entry-mode-options="entryModeOptions"
              :target-operator-options="targetOperatorOptions"
              :target-aggregation-options="targetAggregationOptions"
              :show-target-aggregation="showTargetAggregation"
              :labels="editorLabels"
              @cancel="handleCancelComposer"
              @delete="handleRequestDeleteFromExpanded"
              @save="handleSaveComposer"
            />
          </section>
        </div>
      </div>
    </section>

    <AppDialog
      v-model="deleteDialogOpen"
      :title="t('planning.objects.deleteDialog.title')"
      :message="deleteDialogMessage"
      :confirm-text="t('common.buttons.delete')"
      confirm-variant="filled"
      @confirm="handleConfirmDelete"
    />
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import ObjectsLibraryFilters from '@/components/objects/ObjectsLibraryFilters.vue'
import ObjectsLibraryInlineEditor from '@/components/objects/ObjectsLibraryInlineEditor.vue'
import ObjectsLibraryGoalCard from '@/components/objects/ObjectsLibraryGoalCard.vue'
import ObjectsLibraryMeasurementCard from '@/components/objects/ObjectsLibraryMeasurementCard.vue'
import ObjectsLibraryInitiativeCard from '@/components/objects/ObjectsLibraryInitiativeCard.vue'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'
import { useT } from '@/composables/useT'
import type {
  ObjectsLibraryFamily,
  ObjectsLibraryDetailRecord,
  ObjectsLibraryListItem,
  ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
import { getObjectsLibraryFamilyPanelType } from '@/services/objectsLibraryQueries'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  linkGoalToMonth,
  unlinkGoalFromMonth,
  linkMeasurementPeriod,
  unlinkMeasurementPeriod,
} from '@/services/planningMutations'
import { isPeriodRef } from '@/utils/periods'
import type { PeriodRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedMonth } from '@/components/objects/GoalMonthsDropdown.vue'

interface Props {
  family: string | string[]
}

interface LibraryTargetDraft {
  kind: 'count' | 'value' | 'rating'
  operator: 'min' | 'max' | 'gte' | 'lte'
  aggregation?: 'sum' | 'average' | 'last'
  value: number
}

interface LibraryDraft {
  title: string
  description: string
  isActive: boolean
  status: string
  goalId?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  cadence?: 'weekly' | 'monthly'
  entryMode?: MeasurementEntryMode
  target: LibraryTargetDraft
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()
const { t } = useT()
const store = useObjectsLibraryStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const historyExpanded = ref(false)
const draft = ref<LibraryDraft>(createEmptyDraft('goal'))
const periodDraft = ref('')
const periodError = ref('')
const deleteDialogOpen = ref(false)
const pendingDelete = ref<{
  panelType: ObjectsLibraryPanelType
  id: string
  title: string
  parentGoalId?: string
} | null>(null)

const expandedKrId = ref<string | null>(null)
const expandedKrPeriods = ref<LinkedPeriod[]>([])
const newGoalId = ref<string | null>(null)
const expandedMeasurementId = ref<string | null>(null)
const expandedMeasurementPeriods = ref<LinkedPeriod[]>([])
const newMeasurementId = ref<string | null>(null)
const newInitiativeId = ref<string | null>(null)

let searchSyncTimeout: ReturnType<typeof setTimeout> | null = null

const familyOptions = computed(() => [
  { family: 'goals' as const, label: t('planning.objects.families.goals') },
  { family: 'habits' as const, label: t('planning.objects.families.habits') },
  { family: 'trackers' as const, label: t('planning.objects.families.trackers') },
  { family: 'initiatives' as const, label: t('planning.objects.families.initiatives') },
])

const activeFamilyTitle = computed(() => {
  const active = familyOptions.value.find(item => item.family === store.query.family)
  return active?.label ?? t('planning.objects.title')
})

const createButtonLabel = computed(() => {
  switch (store.query.family) {
    case 'goals':
      return t('planning.objects.actions.addGoal')
    case 'habits':
      return t('planning.objects.actions.addHabit')
    case 'trackers':
      return t('planning.objects.actions.addTracker')
    case 'initiatives':
      return t('planning.objects.actions.addInitiative')
  }
})

const editorLabels = computed(() => ({
  title: t('planning.objects.form.title'),
  description: t('planning.objects.form.description'),
  status: t('planning.objects.form.status'),
  activeHint: t('planning.objects.form.activeHint'),
  goal: t('planning.objects.form.goal'),
  cadence: t('planning.objects.form.cadence'),
  entryMode: t('planning.objects.form.entryMode'),
  target: t('planning.objects.form.target'),
  targetOperator: t('planning.objects.form.targetOperator'),
  targetAggregation: t('planning.objects.form.targetAggregation'),
  targetValue: t('planning.objects.form.targetValue'),
  lifeAreas: t('planning.objects.form.lifeAreas'),
  priorities: t('planning.objects.form.priorities'),
}))

const composerHeading = computed(() => {
  const modeLabel = isCreateMode.value
    ? t('planning.objects.panel.modeCreate')
    : t('planning.objects.panel.modeEdit')
  return `${modeLabel} · ${resolvePanelTypeLabel(resolvedComposerType.value)}`
})

const showCreateCard = computed(
  () => isComposerOpen.value && isCreateMode.value
    && resolvedComposerType.value !== 'keyResult'
    && resolvedComposerType.value !== 'goal'
    && resolvedComposerType.value !== 'habit'
    && resolvedComposerType.value !== 'tracker'
    && resolvedComposerType.value !== 'initiative',
)

const composerParentGoalLabel = computed(() => {
  const goalId = store.query.composerParentId ?? draft.value.goalId
  if (!goalId) {
    return undefined
  }

  return (
    store.filterOptions.goals.find((goal) => goal.id === goalId)?.label ??
    store.composerItem?.owner?.title ??
    expandedItem.value?.owner?.title
  )
})

const expandedItem = computed(() => store.expandedItem)
const composerMode = computed(() => store.query.composerMode)
const resolvedComposerType = computed<ObjectsLibraryPanelType>(() => {
  return store.query.composerType ?? getObjectsLibraryFamilyPanelType(store.query.family)
})
const isComposerOpen = computed(() => Boolean(store.query.composerMode))
const isCreateMode = computed(() => composerMode.value === 'create')
const isComposerReady = computed(() => composerMode.value !== 'edit' || Boolean(store.composerItem))
const statusOptions = computed(() => {
  if (resolvedComposerType.value === 'habit' || resolvedComposerType.value === 'tracker') {
    return [
      { value: 'open', label: t('planning.objects.badges.status.open') },
      { value: 'retired', label: t('planning.objects.badges.status.retired') },
      { value: 'dropped', label: t('planning.objects.badges.status.dropped') },
    ]
  }

  return [
    { value: 'open', label: t('planning.objects.badges.status.open') },
    { value: 'completed', label: t('planning.objects.badges.status.completed') },
    { value: 'dropped', label: t('planning.objects.badges.status.dropped') },
  ]
})
const cadenceOptions = computed(() => [
  { value: 'weekly' as const, label: t('planning.objects.badges.cadence.weekly') },
  { value: 'monthly' as const, label: t('planning.objects.badges.cadence.monthly') },
])
const entryModeOptions = computed(() => [
  { value: 'completion' as const, label: t('planning.objects.badges.entryMode.completion') },
  { value: 'counter' as const, label: t('planning.objects.badges.entryMode.counter') },
  { value: 'value' as const, label: t('planning.objects.badges.entryMode.value') },
  { value: 'rating' as const, label: t('planning.objects.badges.entryMode.rating') },
])

const deleteDialogMessage = computed(() => {
  if (!pendingDelete.value) {
    return ''
  }

  return t('planning.objects.deleteDialog.message', {
    title: pendingDelete.value.title,
  })
})

const canSaveDraft = computed(() => {
  if (!draft.value.title.trim()) {
    return false
  }

  if (resolvedComposerType.value === 'keyResult') {
    return Boolean(draft.value.goalId) && hasValidTargetDraft()
  }

  if (resolvedComposerType.value === 'habit') {
    return hasValidTargetDraft()
  }

  return true
})

const isFamilyEmptyState = computed(() => Boolean(store.bundle && store.bundle.familyTotalCount === 0))

watch(
  () => route.fullPath,
  async () => {
    store.hydrateFromRoute(props.family, route.query as Record<string, unknown>)
    historyExpanded.value = false
    periodDraft.value = store.query.period ?? ''
    periodError.value = ''
    await store.loadBundle()
    initializeDraft()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (searchSyncTimeout) {
    clearTimeout(searchSyncTimeout)
    searchSyncTimeout = null
  }
})

function initializeDraft(): void {
  if (composerMode.value === 'edit' && store.composerItem) {
    draft.value = createDraftFromDefaults(store.composerItem.formDefaults, resolvedComposerType.value)
    return
  }

  draft.value = createEmptyDraft(resolvedComposerType.value, store.query.composerParentId)
}

function createEmptyDraft(panelType: ObjectsLibraryPanelType, goalId?: string): LibraryDraft {
  switch (panelType) {
    case 'goal':
      return {
        title: '',
        description: '',
        isActive: true,
        status: 'open',
        priorityIds: [],
        lifeAreaIds: [],
        target: createDefaultTarget('completion'),
      }
    case 'keyResult':
      return {
        title: '',
        description: '',
        isActive: true,
        status: 'open',
        goalId,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        target: createDefaultTarget('completion'),
      }
    case 'habit':
      return {
        title: '',
        description: '',
        isActive: true,
        status: 'open',
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        target: createDefaultTarget('completion'),
      }
    case 'tracker':
      return {
        title: '',
        description: '',
        isActive: true,
        status: 'open',
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        target: createDefaultTarget('completion'),
      }
    case 'initiative':
      return {
        title: '',
        description: '',
        isActive: true,
        status: 'open',
        goalId: undefined,
        priorityIds: [],
        lifeAreaIds: [],
        target: createDefaultTarget('completion'),
      }
  }
}

function createDefaultTarget(entryMode: MeasurementEntryMode): LibraryTargetDraft {
  switch (entryMode) {
    case 'completion':
    case 'counter':
      return { kind: 'count', operator: 'min', value: 1 }
    case 'value':
      return { kind: 'value', aggregation: 'sum', operator: 'gte', value: 1 }
    case 'rating':
      return { kind: 'rating', aggregation: 'average', operator: 'gte', value: 1 }
  }
}

function toTargetDraft(target: MeasurementTarget | undefined, entryMode: MeasurementEntryMode): LibraryTargetDraft {
  if (!target) {
    return createDefaultTarget(entryMode)
  }

  switch (target.kind) {
    case 'count':
      return { kind: 'count', operator: target.operator, value: target.value }
    case 'value':
      return {
        kind: 'value',
        aggregation: target.aggregation,
        operator: target.operator,
        value: target.value,
      }
    case 'rating':
      return {
        kind: 'rating',
        aggregation: 'average',
        operator: target.operator,
        value: target.value,
      }
  }
}

function createDraftFromDefaults(
  defaults: ObjectsLibraryDetailRecord['formDefaults'],
  panelType: ObjectsLibraryPanelType,
): LibraryDraft {
  const fallback = createEmptyDraft(panelType, defaults.goalId)
  const entryMode = defaults.entryMode ?? fallback.entryMode ?? 'completion'

  return {
    ...fallback,
    ...defaults,
    entryMode,
    target: toTargetDraft(defaults.target, entryMode),
  }
}

function syncTargetToEntryMode(entryMode: MeasurementEntryMode): void {
  const current = draft.value.target

  if (entryMode === 'completion' || entryMode === 'counter') {
    if (current.kind !== 'count') {
      draft.value.target = createDefaultTarget(entryMode)
    } else if (current.operator !== 'min' && current.operator !== 'max') {
      draft.value.target = { kind: 'count', operator: 'min', value: current.value || 1 }
    }
    return
  }

  if (entryMode === 'value') {
    if (current.kind !== 'value') {
      draft.value.target = createDefaultTarget(entryMode)
    } else if (!current.aggregation) {
      draft.value.target = { kind: 'value', aggregation: 'sum', operator: 'gte', value: current.value || 1 }
    }
    return
  }

  if (current.kind !== 'rating') {
    draft.value.target = createDefaultTarget(entryMode)
  } else {
    draft.value.target = {
      kind: 'rating',
      aggregation: 'average',
      operator: current.operator === 'gte' || current.operator === 'lte' ? current.operator : 'gte',
      value: current.value,
    }
  }
}

function normalizeTargetDraft(entryMode: MeasurementEntryMode, target: LibraryTargetDraft): MeasurementTarget {
  switch (entryMode) {
    case 'completion':
    case 'counter':
      return {
        kind: 'count',
        operator: target.operator === 'max' ? 'max' : 'min',
        value: Math.max(0, Math.trunc(target.value)),
      }
    case 'value':
      return {
        kind: 'value',
        aggregation: target.aggregation === 'average' || target.aggregation === 'last' ? target.aggregation : 'sum',
        operator: target.operator === 'lte' ? 'lte' : 'gte',
        value: Number(target.value),
      }
    case 'rating':
      return {
        kind: 'rating',
        aggregation: 'average',
        operator: target.operator === 'lte' ? 'lte' : 'gte',
        value: Number(target.value),
      }
  }
}

function hasValidTargetDraft(): boolean {
  return Number.isFinite(draft.value.target.value)
}

watch(
  () => draft.value.entryMode,
  (entryMode) => {
    if (!entryMode) {
      return
    }

    if (resolvedComposerType.value === 'keyResult' || resolvedComposerType.value === 'habit') {
      syncTargetToEntryMode(entryMode)
    }
  },
)

const showTargetAggregation = computed(
  () =>
    resolvedComposerType.value === 'keyResult' || resolvedComposerType.value === 'habit'
      ? draft.value.entryMode === 'value' || draft.value.entryMode === 'rating'
      : false,
)

const targetOperatorOptions = computed<
  Array<{ value: LibraryTargetDraft['operator']; label: string }>
>(() => {
  if (draft.value.entryMode === 'completion' || draft.value.entryMode === 'counter') {
    return [
      { value: 'min', label: t('planning.objects.targetOperators.min') },
      { value: 'max', label: t('planning.objects.targetOperators.max') },
    ]
  }

  return [
    { value: 'gte', label: t('planning.objects.targetOperators.gte') },
    { value: 'lte', label: t('planning.objects.targetOperators.lte') },
  ]
})

const targetAggregationOptions = computed<
  Array<{ value: NonNullable<LibraryTargetDraft['aggregation']>; label: string }>
>(() => {
  if (draft.value.entryMode === 'rating') {
    return [{ value: 'average', label: t('planning.objects.targetAggregations.average') }]
  }

  return [
    { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
    { value: 'average', label: t('planning.objects.targetAggregations.average') },
    { value: 'last', label: t('planning.objects.targetAggregations.last') },
  ]
})

async function syncRoute(): Promise<void> {
  await router.replace({
    name: 'objects-family',
    params: { family: store.query.family },
    query: store.serializeForRoute(),
  })
}

function scheduleSearchSync(): void {
  if (searchSyncTimeout) {
    clearTimeout(searchSyncTimeout)
  }

  searchSyncTimeout = setTimeout(() => {
    void syncRoute()
  }, 220)
}

function handleFamilyChange(family: ObjectsLibraryFamily): void {
  store.setFamily(family)
  void syncRoute()
}

function handleSearch(value: string): void {
  store.setSearch(value)
  scheduleSearchSync()
}

function handlePeriodDraftUpdate(value: string): void {
  const normalized = value.trim()
  periodDraft.value = value
  periodError.value = ''

  if (normalized) {
    return
  }

  store.setPeriod(undefined)
  void syncRoute()
}

function handlePeriodCommit(): void {
  const normalized = periodDraft.value.trim()
  if (!normalized) {
    store.setPeriod(undefined)
    periodDraft.value = ''
    periodError.value = ''
    void syncRoute()
    return
  }

  if (!isPeriodRef(normalized)) {
    periodError.value = t('planning.objects.periodInvalid')
    return
  }

  store.setPeriod(normalized as PeriodRef)
  periodDraft.value = normalized
  periodError.value = ''
  void syncRoute()
}

function handleLifeAreaToggle(id: string): void {
  store.toggleLifeArea(id)
  void syncRoute()
}

function handlePriorityToggle(id: string): void {
  store.togglePriority(id)
  void syncRoute()
}

function handleClosedToggle(): void {
  store.setShowClosed(!store.query.showClosed)
  void syncRoute()
}

function handleClearLifeAreas(): void {
  for (const id of [...store.query.lifeAreaIds]) {
    store.toggleLifeArea(id)
  }
  void syncRoute()
}

function handleClearPriorities(): void {
  for (const id of [...store.query.priorityIds]) {
    store.togglePriority(id)
  }
  void syncRoute()
}

function handleClearFilters(): void {
  store.clearFilters()
  periodDraft.value = ''
  periodError.value = ''
  void syncRoute()
}

function handleExpandItem(panelType: ObjectsLibraryPanelType, id: string): void {
  historyExpanded.value = false
  store.expandItem(panelType, id)
  void syncRoute()
}

async function handleOpenCreate(): Promise<void> {
  const panelType = getObjectsLibraryFamilyPanelType(store.query.family)

  if (panelType === 'goal') {
    try {
      const created = await goalDexieRepository.create({
        title: '',
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
      })
      newGoalId.value = created.id
      await store.loadBundle()
    } catch (err) {
      snackbarRef.value?.show(
        err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
      )
    }
    return
  }

  if (panelType === 'habit') {
    try {
      const created = await habitDexieRepository.create({
        title: '',
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        entryMode: 'completion',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
        status: 'open',
      })
      newMeasurementId.value = created.id
      expandedMeasurementId.value = created.id
      await store.loadBundle()
      await loadMeasurementPeriods(created.id, 'habit', 'weekly')
    } catch (err) {
      snackbarRef.value?.show(
        err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
      )
    }
    return
  }

  if (panelType === 'tracker') {
    try {
      const created = await trackerDexieRepository.create({
        title: '',
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        status: 'open',
      })
      newMeasurementId.value = created.id
      expandedMeasurementId.value = created.id
      await store.loadBundle()
      await loadMeasurementPeriods(created.id, 'tracker', 'weekly')
    } catch (err) {
      snackbarRef.value?.show(
        err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
      )
    }
    return
  }

  if (panelType === 'initiative') {
    try {
      const created = await initiativeDexieRepository.create({
        title: '',
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
      })
      newInitiativeId.value = created.id
      await store.loadBundle()
    } catch (err) {
      snackbarRef.value?.show(
        err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
      )
    }
    return
  }

  store.collapseItem()
  store.openComposer('create', panelType)
  draft.value = createEmptyDraft(panelType)
  void syncRoute()
}

async function handleCreateChildKeyResult(goalId: string): Promise<void> {
  try {
    const created = await keyResultDexieRepository.create({
      title: '',
      description: undefined,
      isActive: true,
      goalId,
      entryMode: 'counter',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
    })
    await store.loadBundle()
    expandedKrId.value = created.id
    await loadKrPeriods(created.id)
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}


async function handleKrToggleExpand(krId: string): Promise<void> {
  if (expandedKrId.value === krId) {
    expandedKrId.value = null
    expandedKrPeriods.value = []
    return
  }
  expandedKrId.value = krId
  await loadKrPeriods(krId)
}

async function loadKrPeriods(krId: string): Promise<void> {
  const child = store.items
    .flatMap((item) => item.childPreviews ?? [])
    .find((c) => c.id === krId)

  if (!child) {
    expandedKrPeriods.value = []
    return
  }

  try {
    if (child.cadence === 'monthly') {
      const states = await planningStateDexieRepository.listMeasurementMonthStatesForSubject('keyResult', krId)
      expandedKrPeriods.value = states.map((s) => ({
        periodRef: s.monthRef,
        displayLabel: formatMonthShort(s.monthRef),
      }))
    } else {
      const states = await planningStateDexieRepository.listMeasurementWeekStatesForSubject('keyResult', krId)
      expandedKrPeriods.value = states.map((s) => ({
        periodRef: s.weekRef,
        displayLabel: formatWeekShort(s.weekRef),
      }))
    }
  } catch {
    expandedKrPeriods.value = []
  }
}

function formatWeekShort(weekRef: string): string {
  const week = weekRef.slice(6)
  const year = weekRef.slice(2, 4)
  return `W${week}-${year}`
}

function formatMonthShort(monthRef: string): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(2, 4)
  const monthName = new Intl.DateTimeFormat('en', { month: 'short' }).format(
    new Date(Number(monthRef.slice(0, 4)), monthIndex, 1),
  )
  return `${monthName} ${year}`
}

async function handleKrFieldChange(krId: string, field: string, value: unknown): Promise<void> {
  try {
    const child = store.items
      .flatMap((item) => item.childPreviews ?? [])
      .find((c) => c.id === krId)

    if (!child) return

    let needsReload = true
    switch (field) {
      case 'title':
        await keyResultDexieRepository.update(krId, { title: (value as string).trim() })
        needsReload = false
        break
      case 'cadence':
        await keyResultDexieRepository.update(krId, { cadence: value as 'weekly' | 'monthly' })
        break
      case 'status':
        await keyResultDexieRepository.update(krId, { status: value as 'open' | 'completed' | 'dropped' })
        break
      case 'entryMode': {
        const newEntryMode = value as MeasurementEntryMode
        const newTarget = buildTargetForEntryMode(newEntryMode, child.target)
        await keyResultDexieRepository.update(krId, { entryMode: newEntryMode, target: newTarget })
        break
      }
      case 'target.operator': {
        const updated = updateTargetField(child.entryMode, child.target, 'operator', value as string)
        await keyResultDexieRepository.update(krId, { target: updated })
        break
      }
      case 'target.aggregation': {
        const updated = updateTargetField(child.entryMode, child.target, 'aggregation', value as string)
        await keyResultDexieRepository.update(krId, { target: updated })
        break
      }
      case 'target.value': {
        const updated = updateTargetField(child.entryMode, child.target, 'value', value as number)
        await keyResultDexieRepository.update(krId, { target: updated })
        break
      }
    }
    if (needsReload) {
      await store.loadBundle()
    }
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

function buildTargetForEntryMode(entryMode: MeasurementEntryMode, currentTarget: MeasurementTarget): MeasurementTarget {
  switch (entryMode) {
    case 'completion':
    case 'counter':
      if (currentTarget.kind === 'count') return currentTarget
      return { kind: 'count', operator: 'min', value: 1 }
    case 'value':
      if (currentTarget.kind === 'value') return currentTarget
      return { kind: 'value', aggregation: 'sum', operator: 'gte', value: 1 }
    case 'rating':
      if (currentTarget.kind === 'rating') return currentTarget
      return { kind: 'rating', aggregation: 'average', operator: 'gte', value: 1 }
  }
}

function updateTargetField(
  _entryMode: MeasurementEntryMode,
  currentTarget: MeasurementTarget,
  field: 'operator' | 'aggregation' | 'value',
  value: string | number,
): MeasurementTarget {
  switch (currentTarget.kind) {
    case 'count':
      if (field === 'operator') return { ...currentTarget, operator: value as 'min' | 'max' }
      if (field === 'value') return { ...currentTarget, value: value as number }
      return currentTarget
    case 'value':
      if (field === 'operator') return { ...currentTarget, operator: value as 'gte' | 'lte' }
      if (field === 'aggregation') return { ...currentTarget, aggregation: value as 'sum' | 'average' | 'last' }
      if (field === 'value') return { ...currentTarget, value: value as number }
      return currentTarget
    case 'rating':
      if (field === 'operator') return { ...currentTarget, operator: value as 'gte' | 'lte' }
      if (field === 'value') return { ...currentTarget, value: value as number }
      return currentTarget
  }
}

async function handleKrLinkPeriod(krId: string, periodRef: string): Promise<void> {
  try {
    const child = store.items
      .flatMap((item) => item.childPreviews ?? [])
      .find((c) => c.id === krId)

    if (!child) return

    await linkMeasurementPeriod({
      subjectType: 'keyResult',
      subjectId: krId,
      cadence: child.cadence,
      periodRef: child.cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
    })

    await loadKrPeriods(krId)
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleKrUnlinkPeriod(krId: string, periodRef: string): Promise<void> {
  try {
    const child = store.items
      .flatMap((item) => item.childPreviews ?? [])
      .find((c) => c.id === krId)

    if (!child) return

    await unlinkMeasurementPeriod({
      subjectType: 'keyResult',
      subjectId: krId,
      cadence: child.cadence,
      periodRef: child.cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
    })

    await loadKrPeriods(krId)
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleKrDelete(krId: string): Promise<void> {
  const child = store.items
    .flatMap((item) => item.childPreviews ?? [])
    .find((c) => c.id === krId)

  if (!child) return

  pendingDelete.value = {
    panelType: 'keyResult',
    id: krId,
    title: child.title,
    parentGoalId: child.goalId,
  }
  deleteDialogOpen.value = true
}

async function handleKrArchive(krId: string): Promise<void> {
  try {
    const child = store.items
      .flatMap((item) => item.childPreviews ?? [])
      .find((c) => c.id === krId)

    if (!child) return

    await keyResultDexieRepository.update(krId, { isActive: !child.isActive })
    snackbarRef.value?.show(
      child.isActive
        ? t('planning.objects.messages.archived')
        : t('planning.objects.messages.unarchived'),
    )
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleMeasurementToggleExpand(
  id: string,
  panelType: 'habit' | 'tracker',
  cadence: string,
): Promise<void> {
  if (expandedMeasurementId.value === id) {
    expandedMeasurementId.value = null
    expandedMeasurementPeriods.value = []
    return
  }
  expandedMeasurementId.value = id
  await loadMeasurementPeriods(id, panelType, cadence)
}

async function loadMeasurementPeriods(
  id: string,
  panelType: 'habit' | 'tracker',
  cadence: string,
): Promise<void> {
  try {
    if (cadence === 'monthly') {
      const states = await planningStateDexieRepository.listMeasurementMonthStatesForSubject(panelType, id)
      expandedMeasurementPeriods.value = states.map((s) => ({
        periodRef: s.monthRef,
        displayLabel: formatMonthShort(s.monthRef),
      }))
    } else {
      const states = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(panelType, id)
      expandedMeasurementPeriods.value = states.map((s) => ({
        periodRef: s.weekRef,
        displayLabel: formatWeekShort(s.weekRef),
      }))
    }
  } catch {
    expandedMeasurementPeriods.value = []
  }
}

async function handleMeasurementFieldChange(id: string, field: string, value: unknown): Promise<void> {
  try {
    const item = store.items.find((i) => i.id === id)
    if (!item || (item.panelType !== 'habit' && item.panelType !== 'tracker')) return

    const isHabit = item.panelType === 'habit'

    let needsReload = true
    switch (field) {
      case 'title':
        if (isHabit) await habitDexieRepository.update(id, { title: (value as string).trim() })
        else await trackerDexieRepository.update(id, { title: (value as string).trim() })
        if (newMeasurementId.value === id) newMeasurementId.value = null
        needsReload = false
        break
      case 'icon': {
        const iconVal = (value as string | undefined) ?? undefined
        if (isHabit) await habitDexieRepository.update(id, { icon: iconVal })
        else await trackerDexieRepository.update(id, { icon: iconVal })
        break
      }
      case 'description':
        if (isHabit) await habitDexieRepository.update(id, { description: normalizeOptionalText(value as string) })
        else await trackerDexieRepository.update(id, { description: normalizeOptionalText(value as string) })
        needsReload = false
        break
      case 'status':
        if (isHabit) await habitDexieRepository.update(id, { status: value as 'open' | 'retired' | 'dropped' })
        else await trackerDexieRepository.update(id, { status: value as 'open' | 'retired' | 'dropped' })
        break
      case 'cadence': {
        const newCadence = value as 'weekly' | 'monthly'
        if (isHabit) await habitDexieRepository.update(id, { cadence: newCadence })
        else await trackerDexieRepository.update(id, { cadence: newCadence })
        if (expandedMeasurementId.value === id) {
          await loadMeasurementPeriods(id, item.panelType, newCadence)
        }
        break
      }
      case 'entryMode': {
        const newEntryMode = value as MeasurementEntryMode
        if (isHabit) {
          const newTarget = buildTargetForEntryMode(newEntryMode, item.target ?? { kind: 'count', operator: 'min', value: 1 })
          await habitDexieRepository.update(id, { entryMode: newEntryMode, target: newTarget })
        } else {
          await trackerDexieRepository.update(id, { entryMode: newEntryMode })
        }
        break
      }
      case 'target.operator': {
        if (!item.target || !isHabit) break
        const updated = updateTargetField(item.entryMode ?? 'completion', item.target, 'operator', value as string)
        await habitDexieRepository.update(id, { target: updated })
        break
      }
      case 'target.aggregation': {
        if (!item.target || !isHabit) break
        const updated = updateTargetField(item.entryMode ?? 'completion', item.target, 'aggregation', value as string)
        await habitDexieRepository.update(id, { target: updated })
        break
      }
      case 'target.value': {
        if (!item.target || !isHabit) break
        const updated = updateTargetField(item.entryMode ?? 'completion', item.target, 'value', value as number)
        await habitDexieRepository.update(id, { target: updated })
        break
      }
      case 'togglePriority': {
        const toggleId = value as string
        if (isHabit) {
          const current = await habitDexieRepository.getById(id)
          if (!current) break
          const newIds = current.priorityIds.includes(toggleId)
            ? current.priorityIds.filter((pid) => pid !== toggleId)
            : [...current.priorityIds, toggleId]
          await habitDexieRepository.update(id, { priorityIds: newIds })
        } else {
          const current = await trackerDexieRepository.getById(id)
          if (!current) break
          const newIds = current.priorityIds.includes(toggleId)
            ? current.priorityIds.filter((pid) => pid !== toggleId)
            : [...current.priorityIds, toggleId]
          await trackerDexieRepository.update(id, { priorityIds: newIds })
        }
        break
      }
      case 'toggleLifeArea': {
        const toggleId = value as string
        if (isHabit) {
          const current = await habitDexieRepository.getById(id)
          if (!current) break
          const newIds = current.lifeAreaIds.includes(toggleId)
            ? current.lifeAreaIds.filter((lid) => lid !== toggleId)
            : [...current.lifeAreaIds, toggleId]
          await habitDexieRepository.update(id, { lifeAreaIds: newIds })
        } else {
          const current = await trackerDexieRepository.getById(id)
          if (!current) break
          const newIds = current.lifeAreaIds.includes(toggleId)
            ? current.lifeAreaIds.filter((lid) => lid !== toggleId)
            : [...current.lifeAreaIds, toggleId]
          await trackerDexieRepository.update(id, { lifeAreaIds: newIds })
        }
        break
      }
    }
    if (needsReload) {
      await store.loadBundle()
    }
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleMeasurementLinkPeriod(
  id: string,
  panelType: 'habit' | 'tracker',
  periodRef: string,
  cadence: string,
): Promise<void> {
  try {
    await linkMeasurementPeriod({
      subjectType: panelType,
      subjectId: id,
      cadence: cadence as 'weekly' | 'monthly',
      periodRef: cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
    })
    await loadMeasurementPeriods(id, panelType, cadence)
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleMeasurementUnlinkPeriod(
  id: string,
  panelType: 'habit' | 'tracker',
  periodRef: string,
  cadence: string,
): Promise<void> {
  try {
    await unlinkMeasurementPeriod({
      subjectType: panelType,
      subjectId: id,
      cadence: cadence as 'weekly' | 'monthly',
      periodRef: cadence === 'monthly' ? (periodRef as MonthRef) : (periodRef as WeekRef),
    })
    await loadMeasurementPeriods(id, panelType, cadence)
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

function krTargetOperatorOptions(entryMode: MeasurementEntryMode): Array<{ value: string; label: string }> {
  if (entryMode === 'completion' || entryMode === 'counter') {
    return [
      { value: 'min', label: t('planning.objects.targetOperators.min') },
      { value: 'max', label: t('planning.objects.targetOperators.max') },
    ]
  }
  return [
    { value: 'gte', label: t('planning.objects.targetOperators.gte') },
    { value: 'lte', label: t('planning.objects.targetOperators.lte') },
  ]
}

function krTargetAggregationOptions(entryMode: MeasurementEntryMode): Array<{ value: string; label: string }> {
  if (entryMode === 'rating') {
    return [{ value: 'average', label: t('planning.objects.targetAggregations.average') }]
  }
  return [
    { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
    { value: 'average', label: t('planning.objects.targetAggregations.average') },
    { value: 'last', label: t('planning.objects.targetAggregations.last') },
  ]
}

function krShowTargetAggregation(entryMode: MeasurementEntryMode): boolean {
  return entryMode === 'value' || entryMode === 'rating'
}

function goalLinkedMonths(item: ObjectsLibraryListItem): LinkedMonth[] {
  return (item.goalMonthRefs ?? []).map((ref) => ({
    monthRef: ref,
    displayLabel: formatMonthShort(ref),
  }))
}

async function handleGoalFieldChange(goalId: string, field: string, value: unknown): Promise<void> {
  try {
    let needsReload = true
    switch (field) {
      case 'title':
        await goalDexieRepository.update(goalId, { title: (value as string).trim() })
        if (newGoalId.value === goalId) newGoalId.value = null
        needsReload = false
        break
      case 'icon':
        await goalDexieRepository.update(goalId, { icon: (value as string | undefined) ?? undefined })
        break
      case 'description':
        await goalDexieRepository.update(goalId, {
          description: normalizeOptionalText(value as string),
        })
        needsReload = false
        break
      case 'status':
        await goalDexieRepository.update(goalId, {
          status: value as 'open' | 'completed' | 'dropped',
        })
        break
      case 'togglePriority': {
        const goal = await goalDexieRepository.getById(goalId)
        if (!goal) return
        const id = value as string
        const newIds = goal.priorityIds.includes(id)
          ? goal.priorityIds.filter((pid) => pid !== id)
          : [...goal.priorityIds, id]
        await goalDexieRepository.update(goalId, { priorityIds: newIds })
        break
      }
      case 'toggleLifeArea': {
        const goal = await goalDexieRepository.getById(goalId)
        if (!goal) return
        const id = value as string
        const newIds = goal.lifeAreaIds.includes(id)
          ? goal.lifeAreaIds.filter((lid) => lid !== id)
          : [...goal.lifeAreaIds, id]
        await goalDexieRepository.update(goalId, { lifeAreaIds: newIds })
        break
      }
    }
    if (needsReload) {
      await store.loadBundle()
    }
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleGoalLinkMonth(goalId: string, monthRef: string): Promise<void> {
  try {
    await linkGoalToMonth(goalId, monthRef as MonthRef)
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function handleGoalUnlinkMonth(goalId: string, monthRef: string): Promise<void> {
  try {
    await unlinkGoalFromMonth(goalId, monthRef as MonthRef)
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

function handleGoalArchive(goalId: string, isCurrentlyActive: boolean): void {
  void handleArchiveFromCard('goal', goalId, isCurrentlyActive)
}

function handleGoalDelete(goalId: string, title: string): void {
  handleDeleteFromCard('goal', goalId, title)
}

async function handleInitiativeFieldChange(id: string, field: string, value: unknown): Promise<void> {
  try {
    let needsReload = true
    switch (field) {
      case 'title':
        await initiativeDexieRepository.update(id, { title: (value as string).trim() })
        if (newInitiativeId.value === id) newInitiativeId.value = null
        needsReload = false
        break
      case 'icon':
        await initiativeDexieRepository.update(id, { icon: (value as string | undefined) ?? undefined })
        break
      case 'description':
        await initiativeDexieRepository.update(id, { description: normalizeOptionalText(value as string) })
        needsReload = false
        break
      case 'status':
        await initiativeDexieRepository.update(id, { status: value as 'open' | 'completed' | 'dropped' })
        break
      case 'goalId':
        await initiativeDexieRepository.update(id, { goalId: (value as string | undefined) || undefined })
        break
      case 'togglePriority': {
        const initiative = await initiativeDexieRepository.getById(id)
        if (!initiative) return
        const pid = value as string
        const newIds = initiative.priorityIds.includes(pid)
          ? initiative.priorityIds.filter((x) => x !== pid)
          : [...initiative.priorityIds, pid]
        await initiativeDexieRepository.update(id, { priorityIds: newIds })
        break
      }
      case 'toggleLifeArea': {
        const initiative = await initiativeDexieRepository.getById(id)
        if (!initiative) return
        const lid = value as string
        const newIds = initiative.lifeAreaIds.includes(lid)
          ? initiative.lifeAreaIds.filter((x) => x !== lid)
          : [...initiative.lifeAreaIds, lid]
        await initiativeDexieRepository.update(id, { lifeAreaIds: newIds })
        break
      }
    }
    if (needsReload) {
      await store.loadBundle()
    }
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

function handleCancelComposer(): void {
  if (
    store.query.composerParentType === 'goal' &&
    store.query.composerParentId &&
    !store.query.expandedId
  ) {
    store.expandItem('goal', store.query.composerParentId)
  }

  store.closeComposer()
  initializeDraft()
  void syncRoute()
}

function statusOptionsForType(panelType: ObjectsLibraryPanelType): Array<{ value: string; label: string }> {
  if (panelType === 'habit' || panelType === 'tracker') {
    return [
      { value: 'open', label: t('planning.objects.badges.status.open') },
      { value: 'retired', label: t('planning.objects.badges.status.retired') },
      { value: 'dropped', label: t('planning.objects.badges.status.dropped') },
    ]
  }
  return [
    { value: 'open', label: t('planning.objects.badges.status.open') },
    { value: 'completed', label: t('planning.objects.badges.status.completed') },
    { value: 'dropped', label: t('planning.objects.badges.status.dropped') },
  ]
}



async function handleArchiveFromCard(
  panelType: ObjectsLibraryPanelType,
  id: string,
  isCurrentlyActive: boolean,
): Promise<void> {
  try {
    await updateObjectActive(panelType, id, !isCurrentlyActive)
    snackbarRef.value?.show(
      isCurrentlyActive
        ? t('planning.objects.messages.archived')
        : t('planning.objects.messages.unarchived'),
    )
    await store.loadBundle()
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

function handleDeleteFromCard(
  panelType: ObjectsLibraryPanelType,
  id: string,
  title: string,
): void {
  pendingDelete.value = { panelType, id, title }
  deleteDialogOpen.value = true
}

function handleRequestDeleteFromExpanded(): void {
  if (!expandedItem.value) {
    return
  }

  pendingDelete.value = {
    panelType: expandedItem.value.panelType,
    id: expandedItem.value.id,
    title: expandedItem.value.title,
    parentGoalId: expandedItem.value.owner?.id,
  }
  deleteDialogOpen.value = true
}

async function handleConfirmDelete(): Promise<void> {
  if (!pendingDelete.value) {
    return
  }

  const target = pendingDelete.value

  try {
    await deleteObject(target.panelType, target.id)
    store.closeComposer()
    if (target.parentGoalId) {
      store.expandItem('goal', target.parentGoalId)
    } else {
      store.collapseItem()
    }
    await syncRoute()
    snackbarRef.value?.show(t('planning.objects.messages.deleted'))
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  } finally {
    deleteDialogOpen.value = false
    pendingDelete.value = null
  }
}

async function handleSaveComposer(): Promise<void> {
  try {
    const saved = await saveDraft()
    store.closeComposer()
    store.expandItem(saved.type, saved.id)
    await syncRoute()
    snackbarRef.value?.show(t('planning.objects.messages.saved'))
  } catch (err) {
    snackbarRef.value?.show(
      err instanceof Error ? err.message : t('planning.objects.messages.saveError'),
    )
  }
}

async function saveDraft(): Promise<{ id: string; type: ObjectsLibraryPanelType }> {
  const mode = composerMode.value
  const composerId = store.query.composerId
  const panelType = resolvedComposerType.value

  if (mode === 'create') {
    switch (panelType) {
      case 'goal': {
        const created = await goalDexieRepository.create({
          title: draft.value.title.trim(),
          description: normalizeOptionalText(draft.value.description),
          isActive: true,
          priorityIds: draft.value.priorityIds,
          lifeAreaIds: draft.value.lifeAreaIds,
          status: draft.value.status as 'open' | 'completed' | 'dropped',
        })
        return { ...created, type: panelType }
      }
      case 'keyResult': {
        const created = await keyResultDexieRepository.create({
          title: draft.value.title.trim(),
          description: normalizeOptionalText(draft.value.description),
          isActive: true,
          goalId:
            draft.value.goalId ?? store.query.composerParentId ?? composerId ?? '',
          entryMode: draft.value.entryMode ?? 'completion',
          cadence: draft.value.cadence ?? 'weekly',
          target: normalizeTargetDraft(draft.value.entryMode ?? 'completion', draft.value.target),
          status: draft.value.status as 'open' | 'completed' | 'dropped',
        })
        return { ...created, type: panelType }
      }
      case 'habit': {
        const created = await habitDexieRepository.create({
          title: draft.value.title.trim(),
          description: normalizeOptionalText(draft.value.description),
          isActive: true,
          priorityIds: draft.value.priorityIds,
          lifeAreaIds: draft.value.lifeAreaIds,
          entryMode: draft.value.entryMode ?? 'completion',
          cadence: draft.value.cadence ?? 'weekly',
          target: normalizeTargetDraft(draft.value.entryMode ?? 'completion', draft.value.target),
          status: draft.value.status as 'open' | 'retired' | 'dropped',
        })
        return { ...created, type: panelType }
      }
      case 'tracker': {
        const created = await trackerDexieRepository.create({
          title: draft.value.title.trim(),
          description: normalizeOptionalText(draft.value.description),
          isActive: true,
          priorityIds: draft.value.priorityIds,
          lifeAreaIds: draft.value.lifeAreaIds,
          cadence: draft.value.cadence ?? 'weekly',
          entryMode: draft.value.entryMode ?? 'completion',
          status: draft.value.status as 'open' | 'retired' | 'dropped',
        })
        return { ...created, type: panelType }
      }
      case 'initiative': {
        const created = await initiativeDexieRepository.create({
          title: draft.value.title.trim(),
          description: normalizeOptionalText(draft.value.description),
          isActive: true,
          goalId: draft.value.goalId || undefined,
          priorityIds: draft.value.priorityIds,
          lifeAreaIds: draft.value.lifeAreaIds,
          status: draft.value.status as 'open' | 'completed' | 'dropped',
        })
        return { ...created, type: panelType }
      }
    }
  }

  if (!composerId) {
    throw new Error(t('planning.objects.messages.missingObject'))
  }

  switch (panelType) {
    case 'goal': {
      const updated = await goalDexieRepository.update(composerId, {
        title: draft.value.title.trim(),
        description: normalizeOptionalText(draft.value.description),
        isActive: draft.value.isActive,
        priorityIds: draft.value.priorityIds,
        lifeAreaIds: draft.value.lifeAreaIds,
        status: draft.value.status as 'open' | 'completed' | 'dropped',
      })
      return { ...updated, type: panelType }
    }
    case 'keyResult': {
      const updated = await keyResultDexieRepository.update(composerId, {
        title: draft.value.title.trim(),
        description: normalizeOptionalText(draft.value.description),
        isActive: draft.value.isActive,
        goalId: draft.value.goalId,
        entryMode: draft.value.entryMode ?? 'completion',
        cadence: draft.value.cadence ?? 'weekly',
        target: normalizeTargetDraft(draft.value.entryMode ?? 'completion', draft.value.target),
        status: draft.value.status as 'open' | 'completed' | 'dropped',
      })
      return { ...updated, type: panelType }
    }
    case 'habit': {
      const updated = await habitDexieRepository.update(composerId, {
        title: draft.value.title.trim(),
        description: normalizeOptionalText(draft.value.description),
        isActive: draft.value.isActive,
        priorityIds: draft.value.priorityIds,
        lifeAreaIds: draft.value.lifeAreaIds,
        entryMode: draft.value.entryMode ?? 'completion',
        cadence: draft.value.cadence ?? 'weekly',
        target: normalizeTargetDraft(draft.value.entryMode ?? 'completion', draft.value.target),
        status: draft.value.status as 'open' | 'retired' | 'dropped',
      })
      return { ...updated, type: panelType }
    }
    case 'tracker': {
      const updated = await trackerDexieRepository.update(composerId, {
        title: draft.value.title.trim(),
        description: normalizeOptionalText(draft.value.description),
        isActive: draft.value.isActive,
        priorityIds: draft.value.priorityIds,
        lifeAreaIds: draft.value.lifeAreaIds,
        cadence: draft.value.cadence ?? 'weekly',
        entryMode: draft.value.entryMode ?? 'completion',
        status: draft.value.status as 'open' | 'retired' | 'dropped',
      })
      return { ...updated, type: panelType }
    }
    case 'initiative': {
      const updated = await initiativeDexieRepository.update(composerId, {
        title: draft.value.title.trim(),
        description: normalizeOptionalText(draft.value.description),
        isActive: draft.value.isActive,
        goalId: draft.value.goalId || undefined,
        priorityIds: draft.value.priorityIds,
        lifeAreaIds: draft.value.lifeAreaIds,
        status: draft.value.status as 'open' | 'completed' | 'dropped',
      })
      return { ...updated, type: panelType }
    }
  }
}

async function updateObjectActive(
  panelType: ObjectsLibraryPanelType,
  id: string,
  isActive: boolean,
): Promise<void> {
  switch (panelType) {
    case 'goal':
      await goalDexieRepository.update(id, { isActive })
      return
    case 'keyResult':
      await keyResultDexieRepository.update(id, { isActive })
      return
    case 'habit':
      await habitDexieRepository.update(id, { isActive })
      return
    case 'tracker':
      await trackerDexieRepository.update(id, { isActive })
      return
    case 'initiative':
      await initiativeDexieRepository.update(id, { isActive })
      return
  }
}

async function updateObjectStatus(
  panelType: ObjectsLibraryPanelType,
  id: string,
  status: string,
): Promise<void> {
  switch (panelType) {
    case 'goal':
      await goalDexieRepository.update(id, { status: status as 'open' | 'completed' | 'dropped' })
      return
    case 'keyResult':
      await keyResultDexieRepository.update(id, { status: status as 'open' | 'completed' | 'dropped' })
      return
    case 'habit':
      await habitDexieRepository.update(id, { status: status as 'open' | 'retired' | 'dropped' })
      return
    case 'tracker':
      await trackerDexieRepository.update(id, { status: status as 'open' | 'retired' | 'dropped' })
      return
    case 'initiative':
      await initiativeDexieRepository.update(id, { status: status as 'open' | 'completed' | 'dropped' })
      return
  }
}

async function deleteObject(panelType: ObjectsLibraryPanelType, id: string): Promise<void> {
  switch (panelType) {
    case 'goal':
      await goalDexieRepository.delete(id)
      return
    case 'keyResult':
      await keyResultDexieRepository.delete(id)
      return
    case 'habit':
      await habitDexieRepository.delete(id)
      return
    case 'tracker':
      await trackerDexieRepository.delete(id)
      return
    case 'initiative':
      await initiativeDexieRepository.delete(id)
      return
  }
}

function isExpanded(panelType: ObjectsLibraryPanelType, id: string): boolean {
  return store.query.expandedType === panelType && store.query.expandedId === id
}

function isExpansionHost(panelType: ObjectsLibraryPanelType, id: string): boolean {
  if (isExpanded(panelType, id)) {
    return true
  }

  return (
    panelType === 'goal' &&
    store.query.expandedType === 'keyResult' &&
    expandedItem.value?.owner?.id === id
  )
}

function isComposerHostedByItem(panelType: ObjectsLibraryPanelType, id: string): boolean {
  if (!isComposerOpen.value) {
    return false
  }

  if (composerMode.value === 'create') {
    return panelType === 'goal' && store.query.composerType === 'keyResult' && store.query.composerParentId === id
  }

  if (store.query.composerType === 'keyResult') {
    return panelType === 'goal' && expandedItem.value?.owner?.id === id
  }

  return store.query.composerType === panelType && store.query.composerId === id
}

function cardGridClasses(_panelType: ObjectsLibraryPanelType, _id: string): string {
  return ''
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function resolvePanelTypeLabel(panelType: ObjectsLibraryPanelType): string {
  return t(`planning.objects.labels.${panelType}`)
}


</script>
