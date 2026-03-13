<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <div class="mb-6 space-y-4">
      <div class="px-1">
        <h1 class="text-3xl font-semibold tracking-[-0.03em] text-on-surface md:text-[2.35rem]">
          {{ activeFamilyTitle }}
        </h1>
      </div>

      <section class="neo-card px-5 py-4 md:px-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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

          <AppButton variant="filled" @click="handleOpenCreate">
            <PlusIcon class="h-4 w-4" />
            {{ createButtonLabel }}
          </AppButton>
        </div>
      </section>
    </div>

    <ObjectsLibraryFilters
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
              <PlusIcon class="h-4 w-4" />
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
          <ObjectsLibraryListCard
            :item="item"
            :expanded="isExpansionHost(item.panelType, item.id)"
            :open-label="t('planning.objects.actions.showDetails')"
            :collapse-label="t('planning.objects.actions.hideDetails')"
            :edit-label="t('planning.objects.actions.editObject')"
            @toggle="handleToggleExpanded"
            @edit="handleStartInlineEdit"
          />

          <section
            v-if="isExpansionHost(item.panelType, item.id) && expandedItem"
            class="rounded-2xl border border-white/40 bg-white/45 p-3"
          >
            <ObjectsLibraryInlineEditor
              v-if="isComposerHostedByItem(item.panelType, item.id) && isComposerReady"
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

            <div v-else class="space-y-3.5">
              <section
                v-if="expandedItem.owner || expandedItem.linkedEntities.length > 0"
                class="neo-surface rounded-xl p-2.5"
              >
                <div class="grid gap-4 md:grid-cols-2">
                  <section v-if="expandedItem.owner" class="space-y-2">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      {{ t('planning.objects.form.goal') }}
                    </div>
                    <button
                      type="button"
                      class="neo-pill neo-focus px-2 py-1 text-xs font-semibold"
                      @click="handleExpandItem(expandedItem.owner.panelType, expandedItem.owner.id)"
                    >
                      {{ expandedItem.owner.title }}
                    </button>
                  </section>

                  <section v-if="expandedItem.linkedEntities.length > 0" class="space-y-2">
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      {{ t('planning.objects.sections.links') }}
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <template
                        v-for="entity in expandedItem.linkedEntities"
                        :key="`${entity.type}:${entity.id}`"
                      >
                        <button
                          v-if="entity.type !== 'priority'"
                          type="button"
                          class="neo-pill neo-focus px-2 py-1 text-xs"
                          @click="handleOpenLinkedEntity(entity.type, entity.id)"
                        >
                          {{ entity.label }}
                        </button>
                        <span v-else class="neo-pill px-2 py-1 text-xs">
                          {{ entity.label }}
                        </span>
                      </template>
                    </div>
                  </section>
                </div>
              </section>

              <section class="neo-surface rounded-xl p-2.5">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      {{ resolvePanelTypeLabel(expandedItem.panelType) }}
                    </div>
                    <h4
                      v-if="expandedItem.id !== item.id || expandedItem.panelType !== item.panelType"
                      class="mt-1 text-sm font-semibold text-on-surface"
                    >
                      {{ expandedItem.title }}
                    </h4>
                    <p
                      v-if="expandedItem.description"
                      class="mt-1 max-w-3xl text-xs leading-5 text-on-surface-variant"
                    >
                      {{ expandedItem.description }}
                    </p>
                  </div>

                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="(badge, index) in expandedItem.badges"
                      :key="`${expandedItem.id}-${resolveLabel(badge.label)}-${index}`"
                      class="neo-pill px-2 py-0.5 text-[10px] font-semibold"
                      :class="badgeToneClass(badge.tone)"
                    >
                      {{ resolveLabel(badge.label) }}
                    </span>
                  </div>
                </div>

                <dl
                  v-if="expandedItem.fields.length > 0"
                  class="mt-2 grid gap-2 text-xs sm:grid-cols-2"
                >
                  <div
                    v-for="field in expandedItem.fields"
                    :key="`${resolveLabel(field.label)}-${field.value}`"
                    class="neo-inset rounded-lg px-2.5 py-1.5"
                  >
                    <dt class="text-on-surface-variant">{{ resolveLabel(field.label) }}</dt>
                    <dd class="mt-0.5 font-medium text-on-surface">
                      {{ formatFieldValue(field.value, field.valueType) }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                v-if="expandedItem.childPreviews && expandedItem.childPreviews.length > 0"
                class="space-y-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    {{ t('planning.objects.sections.relatedKeyResults') }}
                  </div>
                  <button
                    v-if="expandedItem.panelType === 'goal'"
                    type="button"
                    class="text-xs font-medium text-primary hover:underline"
                    @click="handleCreateChildKeyResult(expandedItem.id)"
                  >
                    {{ t('planning.objects.actions.addKeyResult') }}
                  </button>
                </div>

                <div class="space-y-1.5">
                  <div
                    v-for="child in expandedItem.childPreviews"
                    :key="child.id"
                    class="neo-surface flex items-center gap-2 rounded-lg px-2.5 py-2"
                  >
                    <button
                      type="button"
                      class="neo-focus min-w-0 flex-1 text-left"
                      @click="handleExpandItem(child.type, child.id)"
                    >
                      <div class="truncate text-sm font-semibold text-on-surface">
                        {{ child.title }}
                      </div>
                      <div class="mt-1 flex flex-wrap gap-2">
                        <span
                          v-for="(badge, index) in child.badges"
                          :key="`${child.id}-${resolveLabel(badge.label)}-${index}`"
                          class="text-[11px] font-medium text-on-surface-variant"
                        >
                          {{ resolveLabel(badge.label) }}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="neo-icon-button neo-focus"
                      :aria-label="t('planning.objects.actions.editObject')"
                      @click="handleEditChildKeyResult(expandedItem.id, child.id)"
                    >
                      <PencilSquareIcon class="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      class="neo-icon-button neo-focus"
                      :aria-label="t('planning.objects.actions.showDetails')"
                      @click="handleExpandItem(child.type, child.id)"
                    >
                      <ChevronRightIcon class="h-4 w-4 shrink-0 text-on-surface-variant" />
                    </button>
                  </div>
                </div>
              </section>

              <section v-if="expandedItem.linkedPeriods.length > 0" class="space-y-2">
                <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {{ t('planning.objects.sections.linkedPeriods') }}
                </div>

                <div class="grid gap-1.5">
                  <button
                    v-for="period in expandedItem.linkedPeriods"
                    :key="period.key"
                    type="button"
                  class="neo-surface neo-focus flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left"
                  @click="handleOpenPeriod(period.periodRef)"
                >
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-on-surface">
                        {{ formatPeriod(period.periodRef) }}
                      </div>
                      <div class="mt-1 text-xs text-on-surface-variant">
                        {{ resolveLabel(period.reasonLabel) }}
                      </div>
                    </div>
                    <div class="flex flex-wrap justify-end gap-2">
                      <span
                        v-for="source in period.sources"
                        :key="`${period.key}-${source}`"
                        class="rounded-full px-2 py-1 text-[11px] font-medium"
                        :class="periodSourceClass(source)"
                      >
                        {{ periodSourceLabel(source) }}
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              <section v-if="visibleHistory.length > 0" class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    {{ t('planning.objects.sections.history') }}
                  </div>
                  <button
                    v-if="expandedItem.historyItems.length > 3"
                    type="button"
                    class="text-xs font-medium text-primary hover:underline"
                    @click="historyExpanded = !historyExpanded"
                  >
                    {{
                      historyExpanded
                        ? t('planning.objects.actions.showLess')
                        : t('planning.objects.actions.showMore')
                    }}
                  </button>
                </div>

                <div
                  v-for="historyItem in visibleHistory"
                  :key="historyItem.key"
                  class="neo-inset rounded-lg p-2.5"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-on-surface">
                      {{ formatPeriod(historyItem.periodRef) }}
                    </div>
                    <span class="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                      {{ historySourceLabel(historyItem.source) }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm leading-6 text-on-surface-variant">
                    {{ historyItem.note }}
                  </p>
                </div>
              </section>

              <section class="neo-surface rounded-xl p-2.5">
                <div class="flex flex-wrap items-center gap-2">
                  <AppButton
                    v-if="expandedItem.panelType === 'goal'"
                    variant="tonal"
                    @click="handleCreateChildKeyResult(expandedItem.id)"
                  >
                    {{ t('planning.objects.actions.addKeyResult') }}
                  </AppButton>
                  <AppButton variant="outlined" @click="handleOpenEdit">
                    {{ t('common.buttons.edit') }}
                  </AppButton>
                  <button
                    type="button"
                    class="neo-pill neo-focus px-3 py-1.5 text-xs font-semibold"
                    @click="handleToggleArchive"
                  >
                    {{
                      expandedItem.isActive
                        ? t('planning.objects.actions.archive')
                        : t('planning.objects.actions.unarchive')
                    }}
                  </button>
                  <button
                    type="button"
                    class="neo-pill neo-focus px-3 py-1.5 text-xs font-semibold text-danger"
                    @click="handleRequestDeleteFromExpanded"
                  >
                    {{ t('common.buttons.delete') }}
                  </button>
                </div>
              </section>
            </div>
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
import { ChevronRightIcon, PencilSquareIcon, PlusIcon } from '@heroicons/vue/24/outline'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import ObjectsLibraryFilters from '@/components/objects/ObjectsLibraryFilters.vue'
import ObjectsLibraryInlineEditor from '@/components/objects/ObjectsLibraryInlineEditor.vue'
import ObjectsLibraryListCard from '@/components/objects/ObjectsLibraryListCard.vue'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'
import { useT } from '@/composables/useT'
import type {
  ObjectsLibraryBadgeTone,
  ObjectsLibraryFamily,
  ObjectsLibraryDetailRecord,
  ObjectsLibraryHistorySource,
  ObjectsLibraryLabel,
  ObjectsLibraryLinkedEntity,
  ObjectsLibraryLinkedPeriodSource,
  ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
import { getObjectsLibraryFamilyPanelType } from '@/services/objectsLibraryQueries'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { isPeriodRef } from '@/utils/periods'
import type { PeriodRef } from '@/domain/period'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import { resolveObjectsLibraryLabel } from '@/utils/objectsLibraryLabels'
import { formatPeriodLabel, formatTimestamp } from '@/utils/periodLabels'

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
const { t, locale } = useT()
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
  () => isComposerOpen.value && isCreateMode.value && resolvedComposerType.value !== 'keyResult',
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

const visibleHistory = computed(() => {
  if (!expandedItem.value) {
    return []
  }

  return historyExpanded.value
    ? expandedItem.value.historyItems
    : expandedItem.value.historyItems.slice(0, 3)
})

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

function handleToggleExpanded(panelType: ObjectsLibraryPanelType, id: string): void {
  if (isExpansionHost(panelType, id)) {
    if (isComposerHostedByItem(panelType, id)) {
      store.closeComposer()
    }
    store.collapseItem()
  } else {
    historyExpanded.value = false
    store.expandItem(panelType, id)
  }
  void syncRoute()
}

function handleOpenCreate(): void {
  const panelType = getObjectsLibraryFamilyPanelType(store.query.family)
  store.collapseItem()
  store.openComposer('create', panelType)
  draft.value = createEmptyDraft(panelType)
  void syncRoute()
}

function handleStartInlineEdit(panelType: ObjectsLibraryPanelType, id: string): void {
  historyExpanded.value = false
  store.expandItem(panelType, id)
  store.openComposer('edit', panelType, id, currentParentContextFor(panelType, id))

  if (expandedItem.value?.panelType === panelType && expandedItem.value.id === id) {
    draft.value = createDraftFromDefaults(expandedItem.value.formDefaults, panelType)
  }

  void syncRoute()
}

function handleCreateChildKeyResult(goalId: string): void {
  historyExpanded.value = false
  store.expandItem('goal', goalId)
  store.openComposer('create', 'keyResult', undefined, {
    composerParentType: 'goal',
    composerParentId: goalId,
  })
  draft.value = createEmptyDraft('keyResult', goalId)
  void syncRoute()
}

function handleOpenEdit(): void {
  if (!expandedItem.value) {
    return
  }

  store.openComposer('edit', expandedItem.value.panelType, expandedItem.value.id, currentParentContext())
  draft.value = createDraftFromDefaults(
    expandedItem.value.formDefaults,
    expandedItem.value.panelType,
  )
  void syncRoute()
}

function handleEditChildKeyResult(goalId: string, keyResultId: string): void {
  historyExpanded.value = false
  store.expandItem('keyResult', keyResultId)
  store.openComposer('edit', 'keyResult', keyResultId, {
    composerParentType: 'goal',
    composerParentId: goalId,
  })
  if (expandedItem.value?.panelType === 'keyResult' && expandedItem.value.id === keyResultId) {
    draft.value = createDraftFromDefaults(expandedItem.value.formDefaults, 'keyResult')
  }
  void syncRoute()
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

async function handleToggleArchive(): Promise<void> {
  if (!expandedItem.value) {
    return
  }

  try {
    await updateObjectActive(
      expandedItem.value.panelType,
      expandedItem.value.id,
      !expandedItem.value.isActive,
    )
    snackbarRef.value?.show(
      expandedItem.value.isActive
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

function handleOpenLinkedEntity(type: ObjectsLibraryLinkedEntity['type'], id: string): void {
  if (type === 'goal') {
    handleExpandItem('goal', id)
    return
  }

  if (type === 'lifeArea') {
    void router.push({ name: 'life-area-detail', params: { id } })
  }
}

function handleOpenPeriod(periodRef: PeriodRef): void {
  switch (periodRef.length) {
    case 4:
      void router.push({ name: 'calendar-year', params: { yearRef: periodRef } })
      return
    case 7:
      if (periodRef.includes('-W')) {
        void router.push({ name: 'calendar-week', params: { weekRef: periodRef } })
      } else {
        void router.push({ name: 'calendar-month', params: { monthRef: periodRef } })
      }
      return
    default:
      void router.push({ name: 'calendar-day', params: { dayRef: periodRef } })
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

function resolveLabel(label: ObjectsLibraryLabel): string {
  return resolveObjectsLibraryLabel(label, t)
}

function resolvePanelTypeLabel(panelType: ObjectsLibraryPanelType): string {
  return t(`planning.objects.labels.${panelType}`)
}

function formatPeriod(periodRef: PeriodRef): string {
  return formatPeriodLabel(periodRef, locale.value, t('planning.calendar.scales.week'))
}

function formatFieldValue(value: string, valueType?: 'date'): string {
  if (valueType === 'date') {
    return formatTimestamp(value, locale.value)
  }

  return value
}

function periodSourceLabel(source: ObjectsLibraryLinkedPeriodSource): string {
  return t(`planning.objects.periodSources.${source}`)
}

function badgeToneClass(tone?: ObjectsLibraryBadgeTone): string {
  switch (tone) {
    case 'accent':
      return 'neo-pill--primary'
    case 'success':
      return 'neo-pill--success'
    case 'warning':
      return 'neo-pill--warning'
    case 'danger':
      return 'neo-pill--danger'
    default:
      return ''
  }
}

function periodSourceClass(source: ObjectsLibraryLinkedPeriodSource): string {
  switch (source) {
    case 'plan':
      return 'bg-primary-soft text-primary-strong'
    case 'progress':
      return 'bg-green-100 text-green-700'
    case 'object-reflection':
      return 'bg-chip text-chip-text'
    case 'period-reflection':
      return 'bg-section text-on-surface-variant'
  }
}

function historySourceLabel(source: ObjectsLibraryHistorySource): string {
  return source === 'object-reflection'
    ? t('planning.objects.periodSources.object-reflection')
    : t('planning.objects.periodSources.period-reflection')
}

function currentParentContext():
  | { composerParentType?: 'goal'; composerParentId?: string }
  | undefined {
  if (store.query.composerParentType === 'goal' && store.query.composerParentId) {
    return {
      composerParentType: 'goal',
      composerParentId: store.query.composerParentId,
    }
  }

  if (expandedItem.value?.owner) {
    return {
      composerParentType: 'goal',
      composerParentId: expandedItem.value.owner.id,
    }
  }

  return undefined
}

function currentParentContextFor(
  panelType: ObjectsLibraryPanelType,
  id: string,
): { composerParentType?: 'goal'; composerParentId?: string } | undefined {
  if (panelType !== 'keyResult') {
    return undefined
  }

  if (expandedItem.value?.panelType === 'keyResult' && expandedItem.value.id === id && expandedItem.value.owner) {
    return {
      composerParentType: 'goal',
      composerParentId: expandedItem.value.owner.id,
    }
  }

  return currentParentContext()
}
</script>
