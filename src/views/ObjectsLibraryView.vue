<template>
  <div class="mx-auto w-full max-w-[1280px] px-4 py-6 pb-16">
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

    <section
      v-if="isComposerOpen"
      class="neo-card neo-raised-strong mt-6 overflow-hidden border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/70 to-section/60 p-5 md:p-6"
    >
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div class="space-y-4">
          <label class="space-y-2">
            <span class="text-sm font-semibold text-on-surface">
              {{ t('planning.objects.form.title') }}
            </span>
            <input
              v-model="draft.title"
              type="text"
              class="neo-input w-full px-4 py-3"
            />
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-on-surface">
              {{ t('planning.objects.form.description') }}
            </span>
            <textarea
              v-model="draft.description"
              class="neo-input min-h-[8rem] w-full resize-none px-4 py-3"
            />
          </label>

          <label
            v-if="resolvedComposerType === 'keyResult' || resolvedComposerType === 'initiative'"
            class="space-y-2"
          >
            <span class="text-sm font-semibold text-on-surface">
              {{ t('planning.objects.form.goal') }}
            </span>
            <select v-model="draft.goalId" class="neo-input w-full px-4 py-3">
              <option value="">{{ t('common.none') }}</option>
              <option v-for="goal in store.filterOptions.goals" :key="goal.id" :value="goal.id">
                {{ goal.label }}
              </option>
            </select>
          </label>

          <label
            v-if="
              resolvedComposerType === 'habit' ||
              resolvedComposerType === 'keyResult' ||
              resolvedComposerType === 'tracker'
            "
            class="space-y-2"
          >
            <span class="text-sm font-semibold text-on-surface">
              {{ t('planning.objects.form.cadence') }}
            </span>
            <select v-model="draft.cadence" class="neo-input w-full px-4 py-3">
              <option value="weekly">{{ t('planning.objects.badges.cadence.weekly') }}</option>
              <option value="monthly">{{ t('planning.objects.badges.cadence.monthly') }}</option>
            </select>
          </label>

          <label
            v-if="
              resolvedComposerType === 'habit' ||
              resolvedComposerType === 'keyResult' ||
              resolvedComposerType === 'tracker'
            "
            class="space-y-2"
          >
            <span class="text-sm font-semibold text-on-surface">
              {{ t('planning.objects.form.entryMode') }}
            </span>
            <select v-model="draft.entryMode" class="neo-input w-full px-4 py-3">
              <option value="completion">{{ t('planning.objects.badges.entryMode.completion') }}</option>
              <option value="counter">{{ t('planning.objects.badges.entryMode.counter') }}</option>
              <option value="value">{{ t('planning.objects.badges.entryMode.value') }}</option>
              <option value="rating">{{ t('planning.objects.badges.entryMode.rating') }}</option>
            </select>
          </label>

          <div
            v-if="resolvedComposerType === 'habit' || resolvedComposerType === 'keyResult'"
            class="grid gap-4 sm:grid-cols-2"
          >
            <label class="space-y-2">
              <span class="text-sm font-semibold text-on-surface">
                {{ t('planning.objects.form.targetOperator') }}
              </span>
              <select v-model="draft.target.operator" class="neo-input w-full px-4 py-3">
                <option
                  v-for="option in targetOperatorOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label v-if="showTargetAggregation" class="space-y-2">
              <span class="text-sm font-semibold text-on-surface">
                {{ t('planning.objects.form.targetAggregation') }}
              </span>
              <select v-model="draft.target.aggregation" class="neo-input w-full px-4 py-3">
                <option
                  v-for="option in targetAggregationOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-on-surface">
                {{ t('planning.objects.form.targetValue') }}
              </span>
              <input
                v-model.number="draft.target.value"
                type="number"
                step="any"
                class="neo-input w-full px-4 py-3"
              />
            </label>
          </div>
        </div>

        <div class="space-y-4">
          <label class="space-y-2">
            <span class="text-sm font-semibold text-on-surface">
              {{ t('planning.objects.form.status') }}
            </span>
            <select v-model="draft.status" class="neo-input w-full px-4 py-3">
              <option value="open">{{ t('planning.objects.badges.status.open') }}</option>
              <option
                v-if="resolvedComposerType !== 'habit' && resolvedComposerType !== 'tracker'"
                value="completed"
              >
                {{ t('planning.objects.badges.status.completed') }}
              </option>
              <option value="dropped">{{ t('planning.objects.badges.status.dropped') }}</option>
              <option
                v-if="resolvedComposerType === 'habit' || resolvedComposerType === 'tracker'"
                value="retired"
              >
                {{ t('planning.objects.badges.status.retired') }}
              </option>
            </select>
          </label>

          <label
            v-if="!isCreateMode"
            class="flex items-center gap-3 rounded-[1.35rem] border border-neu-border/25 bg-white/35 px-4 py-3 text-sm font-medium text-on-surface"
          >
            <input v-model="draft.isActive" type="checkbox" class="neo-checkbox" />
            {{ t('planning.objects.form.activeHint') }}
          </label>

          <ObjectsLibraryMultiSelect
            v-if="resolvedComposerType !== 'keyResult'"
            v-model="draft.lifeAreaIds"
            :label="t('planning.objects.form.lifeAreas')"
            :options="store.filterOptions.lifeAreas"
            :empty-label="t('planning.objects.form.noneSelected')"
            :clear-label="t('planning.objects.filters.clear')"
            :close-label="t('common.buttons.close')"
          />

          <ObjectsLibraryMultiSelect
            v-if="resolvedComposerType !== 'keyResult'"
            v-model="draft.priorityIds"
            :label="t('planning.objects.form.priorities')"
            :options="store.filterOptions.priorities"
            :empty-label="t('planning.objects.form.noneSelected')"
            :clear-label="t('planning.objects.filters.clear')"
            :close-label="t('common.buttons.close')"
          />
        </div>
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/45 pt-5">
        <AppButton variant="outlined" @click="handleCancelComposer">
          {{ t('common.buttons.cancel') }}
        </AppButton>
        <AppButton variant="filled" :disabled="!canSaveDraft" @click="handleSaveComposer">
          {{ isCreateMode ? t('common.buttons.create') : t('common.buttons.save') }}
        </AppButton>
      </div>
    </section>

    <section class="mt-6 space-y-4">
      <section v-if="store.isLoading" class="neo-card p-8 text-center text-on-surface-variant">
        {{ t('common.loading') }}
      </section>

      <section v-else-if="store.error" class="neo-card p-8 text-center">
        <h3 class="text-xl font-semibold text-on-surface">
          {{ t('planning.objects.loadError') }}
        </h3>
        <p class="mt-3 text-sm text-on-surface-variant">
          {{ store.error }}
        </p>
      </section>

      <section v-else-if="store.items.length === 0 && isFamilyEmptyState" class="neo-card p-6 md:p-8">
        <div class="neo-surface flex flex-col items-center rounded-[2rem] px-6 py-10 text-center">
          <h3 class="mt-5 text-2xl font-semibold text-on-surface">
            {{ t('planning.objects.empty.familyTitle') }}
          </h3>
          <div class="mt-6">
            <AppButton variant="filled" @click="handleOpenCreate">
              <PlusIcon class="h-4 w-4" />
              {{ createButtonLabel }}
            </AppButton>
          </div>
        </div>
      </section>

      <section v-else-if="store.items.length === 0" class="neo-card p-6 md:p-8">
        <div class="neo-surface flex flex-col items-center rounded-[2rem] px-6 py-10 text-center">
          <h3 class="mt-5 text-2xl font-semibold text-on-surface">
            {{ t('planning.objects.empty.filteredTitle') }}
          </h3>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <AppButton variant="outlined" @click="handleClearFilters">
              {{ t('planning.objects.filters.resetAll') }}
            </AppButton>
            <AppButton variant="filled" @click="handleOpenCreate">
              <PlusIcon class="h-4 w-4" />
              {{ createButtonLabel }}
            </AppButton>
          </div>
        </div>
      </section>

      <div v-else class="space-y-4">
        <div v-for="item in store.items" :key="`${item.panelType}:${item.id}`" class="space-y-3">
          <ObjectsLibraryListCard
            :item="item"
            :expanded="isExpanded(item.panelType, item.id)"
            :open-label="t('planning.objects.actions.showDetails')"
            :collapse-label="t('planning.objects.actions.hideDetails')"
            :child-label="t('planning.objects.sections.relatedKeyResults')"
            @toggle="handleToggleExpanded"
            @open="handleExpandItem"
          />

          <section
            v-if="isExpanded(item.panelType, item.id) && expandedItem"
            class="neo-card ml-4 rounded-[2rem] border border-white/40 bg-white/45 p-5 md:ml-8 md:p-6"
          >
            <div class="space-y-5">
              <section
                v-if="expandedItem.owner"
                class="space-y-3"
              >
                <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {{ t('planning.objects.form.goal') }}
                </div>
                <button
                  type="button"
                  class="neo-pill neo-focus"
                  @click="handleExpandItem(expandedItem.owner.panelType, expandedItem.owner.id)"
                >
                  {{ expandedItem.owner.title }}
                </button>
              </section>

              <section v-if="expandedItem.linkedEntities.length > 0" class="space-y-3">
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
                      class="neo-pill neo-focus"
                      @click="handleOpenLinkedEntity(entity.type, entity.id)"
                    >
                      {{ entity.label }}
                    </button>
                    <span v-else class="neo-pill">
                      {{ entity.label }}
                    </span>
                  </template>
                </div>
              </section>

              <section v-if="expandedItem.linkedPeriods.length > 0" class="space-y-3">
                <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {{ t('planning.objects.sections.linkedPeriods') }}
                </div>

                <button
                  v-for="period in expandedItem.linkedPeriods"
                  :key="period.key"
                  type="button"
                  class="neo-surface neo-focus flex w-full items-center justify-between gap-3 rounded-[1.35rem] px-4 py-3 text-left"
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
              </section>

              <section
                v-if="expandedItem.childPreviews && expandedItem.childPreviews.length > 0"
                class="space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    {{ t('planning.objects.sections.relatedKeyResults') }}
                  </div>
                  <button
                    v-if="expandedItem.panelType === 'goal'"
                    type="button"
                    class="text-sm font-medium text-primary hover:underline"
                    @click="handleCreateChildKeyResult(expandedItem.id)"
                  >
                    {{ t('planning.objects.actions.addKeyResult') }}
                  </button>
                </div>

                <button
                  v-for="child in expandedItem.childPreviews"
                  :key="child.id"
                  type="button"
                  class="neo-surface neo-focus flex w-full items-center justify-between gap-3 rounded-[1.35rem] px-4 py-3 text-left"
                  @click="handleExpandItem(child.type, child.id)"
                >
                  <div class="min-w-0">
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
                  </div>
                  <ChevronRightIcon class="h-4 w-4 shrink-0 text-on-surface-variant" />
                </button>
              </section>

              <section v-if="visibleHistory.length > 0" class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                    {{ t('planning.objects.sections.history') }}
                  </div>
                  <button
                    v-if="expandedItem.historyItems.length > 3"
                    type="button"
                    class="text-sm font-medium text-primary hover:underline"
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
                  class="neo-inset rounded-[1.35rem] p-4"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-on-surface">
                      {{ formatPeriod(historyItem.periodRef) }}
                    </div>
                    <span
                      class="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant"
                    >
                      {{ historySourceLabel(historyItem.source) }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm leading-6 text-on-surface-variant">
                    {{ historyItem.note }}
                  </p>
                </div>
              </section>

              <section class="neo-surface rounded-[1.6rem] px-4 py-4">
                <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <dl class="grid gap-3 text-sm sm:grid-cols-2">
                    <div
                      v-for="field in expandedItem.fields"
                      :key="`${resolveLabel(field.label)}-${field.value}`"
                      class="space-y-1"
                    >
                      <dt class="text-on-surface-variant">{{ resolveLabel(field.label) }}</dt>
                      <dd class="font-medium text-on-surface">
                        {{ formatFieldValue(field.value, field.valueType) }}
                      </dd>
                    </div>
                  </dl>

                  <div class="flex flex-wrap items-center justify-end gap-3">
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
                      class="text-sm font-medium text-primary hover:underline"
                      @click="handleToggleArchive"
                    >
                      {{
                        expandedItem.isActive
                          ? t('planning.objects.actions.archive')
                          : t('planning.objects.actions.unarchive')
                      }}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </section>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRightIcon, PlusIcon } from '@heroicons/vue/24/outline'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import ObjectsLibraryFilters from '@/components/objects/ObjectsLibraryFilters.vue'
import ObjectsLibraryListCard from '@/components/objects/ObjectsLibraryListCard.vue'
import ObjectsLibraryMultiSelect from '@/components/objects/ObjectsLibraryMultiSelect.vue'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'
import { useT } from '@/composables/useT'
import type {
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

const expandedItem = computed(() => store.expandedItem)
const composerMode = computed(() => store.query.composerMode)
const resolvedComposerType = computed<ObjectsLibraryPanelType>(() => {
  return store.query.composerType ?? getObjectsLibraryFamilyPanelType(store.query.family)
})
const isComposerOpen = computed(() => Boolean(store.query.composerMode))
const isCreateMode = computed(() => composerMode.value === 'create')

const visibleHistory = computed(() => {
  if (!expandedItem.value) {
    return []
  }

  return historyExpanded.value
    ? expandedItem.value.historyItems
    : expandedItem.value.historyItems.slice(0, 3)
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

const targetOperatorOptions = computed(() => {
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

const targetAggregationOptions = computed(() => {
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
  if (store.query.expandedType === panelType && store.query.expandedId === id) {
    store.collapseItem()
  } else {
    historyExpanded.value = false
    store.expandItem(panelType, id)
  }
  void syncRoute()
}

function handleOpenCreate(): void {
  store.openComposer('create', getObjectsLibraryFamilyPanelType(store.query.family))
  void syncRoute()
}

function handleCreateChildKeyResult(goalId: string): void {
  historyExpanded.value = false
  store.expandItem('goal', goalId)
  store.openComposer('create', 'keyResult', undefined, {
    composerParentType: 'goal',
    composerParentId: goalId,
  })
  void syncRoute()
}

function handleOpenEdit(): void {
  if (!expandedItem.value) {
    return
  }

  store.openComposer('edit', expandedItem.value.panelType, expandedItem.value.id, currentParentContext())
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

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function resolveLabel(label: ObjectsLibraryLabel): string {
  return resolveObjectsLibraryLabel(label, t)
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
</script>
