<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <AppCard v-if="isCalendarLoading">
      <div class="flex items-center justify-center py-8">
        <div class="flex items-center gap-3 text-on-surface-variant">
          <svg
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading yearly plans...</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="calendarError">
      <div class="text-center py-6">
        <p class="text-error mb-4">{{ calendarError }}</p>
        <AppButton variant="tonal" @click="loadData">Try Again</AppButton>
      </div>
    </AppCard>

    <!-- Period Cards -->
    <div v-show="!isCalendarLoading && !calendarError" class="flex items-center gap-3">
      <AppButton
        variant="text"
        class="shrink-0"
        :disabled="!canPrev"
        aria-label="Previous year"
        @click="scrollPrev"
      >
        <ChevronLeftIcon class="w-5 h-5" />
      </AppButton>
      <div class="embla__viewport" ref="emblaRef">
        <div class="embla__container">
          <div
            v-for="(period, index) in allSlides"
            :key="period.key"
            class="embla__slide"
          >
            <div class="flex flex-col items-center w-full h-full">
              <AddPeriodCard
                v-if="period.isAddCard"
                class="w-full flex-1"
                label="Add Year"
                @click="isDialogOpen = true"
              />
              <PeriodCard
                v-else
                class="w-full flex-1"
                type="yearly"
                :start-date="period.startDate"
                :end-date="period.endDate"
                :name="period.name"
                :has-plan="period.hasPlan"
                :has-reflection="period.hasReflection"
                :is-selected="period.key === selectedPeriodKey"
                :item-statuses="getItemStatusesForPeriod(period)"
                @select="handleSlideSelect(index)"
                @plan="handleCardPlan(period)"
                @reflect="handleCardReflect(period)"
              />
              <!-- Selection line indicator -->
              <div
                class="mt-2 h-0.5 rounded-full transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)]"
                :class="!period.isAddCard && period.key === selectedPeriodKey ? 'bg-primary/70 w-10 opacity-100' : 'w-0 opacity-0'"
              />
            </div>
          </div>
        </div>
      </div>
      <AppButton
        variant="text"
        class="shrink-0"
        :disabled="!canNext"
        aria-label="Next year"
        @click="scrollNext"
      >
        <ChevronRightIcon class="w-5 h-5" />
      </AppButton>
    </div>

    <!-- Selected Year Dashboard -->
    <Transition name="fade" mode="out-in">
      <div
        v-if="!isCalendarLoading && !calendarError"
        :key="selectedPeriodKey ?? 'none'"
        class="mt-8 space-y-4"
      >
        <!-- Selected period title -->
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-on-surface">
              {{ selectedPeriodRange }}
            </h3>
            <p v-if="selectedPeriodTitle" class="mt-1 text-xs text-on-surface-variant">
              {{ selectedPeriodTitle }}
            </p>
          </div>
          <button
            v-if="hasSelectedPlan"
            type="button"
            class="neo-icon-button neo-icon-button--danger neo-focus h-10 gap-2 px-3 py-0 text-sm font-medium"
            aria-label="Delete selected year period"
            @click="openDeletePlanDialog"
          >
            <TrashIcon class="h-4 w-4" />
            <span>Delete period</span>
          </button>
        </div>

        <!-- Plan / Reflect panels -->
        <div class="grid gap-4 sm:grid-cols-2 items-start">
          <!-- Plan panel -->
          <div v-if="hasSelectedPlan && planHighlights.length" class="rounded-[32px] border border-neu-border/40 bg-neu-base px-6 py-5 shadow-neu-raised-sm flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Plan Snapshot
              </p>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit plan"
                  @click="handleSelectedPlan"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
                  aria-label="Delete plan"
                  @click="openDeletePlanDialog"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <div v-for="item in planHighlights" :key="item.label" class="space-y-0.5">
                <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
                  {{ item.label }}
                </p>
                <p class="text-sm leading-relaxed text-on-surface">{{ item.value }}</p>
              </div>
            </div>
          </div>
          <button
            v-else
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl shadow-neu-raised-sm hover:shadow-neu-raised hover:-translate-y-px transition-all duration-200 text-on-surface cursor-pointer self-start"
            style="background-color: rgb(var(--color-primary-soft)); border: 1px solid rgb(var(--color-primary-soft))"
            @click="handleSelectedPlan"
          >
            <ClipboardDocumentListIcon class="w-5 h-5" />
            <span class="text-sm font-semibold">Plan</span>
          </button>

          <!-- Reflect panel -->
          <div v-if="hasSelectedReflection && reflectionHighlights.length" class="rounded-[32px] border border-neu-border/40 bg-neu-base px-6 py-5 shadow-neu-raised-sm flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Reflection
              </p>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit reflection"
                  @click="handleSelectedReflect"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
                  aria-label="Delete reflection"
                  @click="openDeleteReflectionDialog"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <div
                v-for="item in reflectionHighlights"
                :key="item.label"
                class="space-y-0.5"
              >
                <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
                  {{ item.label }}
                </p>
                <p class="text-sm leading-relaxed text-on-surface">{{ item.value }}</p>
              </div>
            </div>
          </div>
          <button
            v-else
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl shadow-neu-raised-sm hover:shadow-neu-raised hover:-translate-y-px transition-all duration-200 text-on-surface cursor-pointer self-start"
            :class="{ 'opacity-40 pointer-events-none': !reflectionEnabled }"
            style="background-color: rgb(var(--color-primary-soft)); border: 1px solid rgb(var(--color-primary-soft))"
            @click="handleSelectedReflect"
          >
            <LightBulbIcon class="w-5 h-5" />
            <span class="text-sm font-semibold">Reflect</span>
          </button>
        </div>

        <AppCard v-if="detailsError || isDetailsLoading">
          <div class="flex items-center justify-center py-6">
            <div v-if="isDetailsLoading" class="flex items-center gap-3 text-on-surface-variant">
              <svg
                class="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading life areas...</span>
            </div>
            <p v-else class="text-error">{{ detailsError }}</p>
          </div>
        </AppCard>

        <template v-if="selectedYear && !isDetailsLoading && !detailsError">
          <!-- Priorities -->
          <div>
            <h3 class="text-lg font-semibold text-on-surface mb-4">Priorities</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <PriorityComposerCard
                v-if="isCreatingPriority"
                :available-life-areas="availableLifeAreasForNewPriority"
                :is-saving="isCreatingPrioritySaving"
                @create="handleCreatePriority"
                @cancel="closePriorityComposer"
              />
              <AppCard
                v-for="priority in sortedPriorities"
                :key="priority.id"
                class="neo-card neo-card--commitment relative h-full overflow-hidden group"
              >
                <div class="px-3 py-3 flex flex-col gap-2.5">
                  <!-- Row 1: Icon + Name -->
                  <div class="flex items-center gap-1.5">
                    <IconPicker
                      :model-value="priority.icon"
                      compact
                      minimal
                      :disabled="isPrioritySaving(priority.id)"
                      aria-label="Select priority icon"
                      class="flex-shrink-0"
                      @update:model-value="(icon) => handlePriorityIconUpdate(priority.id, icon)"
                    />
                    <InlineEditableText
                      :model-value="priority.name"
                      :disabled="isPrioritySaving(priority.id)"
                      :is-saving="isPrioritySaving(priority.id)"
                      text-class="block text-lg font-semibold leading-snug text-on-surface line-clamp-2"
                      input-class="text-lg font-semibold"
                      aria-label="Edit priority name"
                      @save="(name) => handlePriorityNameUpdate(priority.id, name)"
                    />
                  </div>

                  <!-- Row 2: Status + Actions + Linked Objects -->
                  <div class="flex items-center gap-1.5">
                    <AnimatedStatusPicker
                      :current-status="priority.isActive ? 'active' : 'paused'"
                      :options="priorityStatusOptions"
                      :disabled="isPrioritySaving(priority.id)"
                      class="flex-shrink-0"
                      @change="(status) => handleTogglePriorityActive(priority.id, status === 'active')"
                    />

                    <CommitmentActionsMenu
                      :add-categories="priorityLinkCategories"
                      :add-items-by-category="priorityLinkItemsByCategory(priority)"
                      :removable-links="priorityRemovableLinks(priority)"
                      :show-tracker-options="false"
                      :disabled="isPrioritySaving(priority.id)"
                      delete-label="Delete priority"
                      trigger-aria-label="Open priority actions"
                      class="flex-shrink-0"
                      @add-link="(payload) => handleAddPriorityLink(priority, payload)"
                      @remove-link="(payload) => handleRemovePriorityLink(priority, payload)"
                      @delete="openDeletePriorityDialog(priority.id)"
                    />

                    <CommitmentLinkedObjectsCluster
                      :life-areas="resolveLinkedLifeAreas(priority)"
                      :priorities="[]"
                      :derived-life-areas="[]"
                      :disabled="isPrioritySaving(priority.id)"
                    />
                  </div>

                  <!-- Success Signals -->
                  <div class="neo-surface p-3 space-y-2">
                    <div class="flex items-center gap-1.5">
                      <TrophyIcon class="w-3.5 h-3.5 text-primary" />
                      <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        Success Signals
                      </span>
                    </div>
                    <div class="space-y-1.5">
                      <div
                        v-for="(signal, index) in priority.successSignals"
                        :key="'signal-' + priority.id + '-' + index"
                        class="flex items-center gap-1.5 neo-inset rounded-xl px-3 py-2 group/signal"
                      >
                        <CheckIcon class="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                        <InlineEditableText
                          :model-value="signal"
                          :disabled="isPrioritySaving(priority.id)"
                          :is-saving="isPrioritySaving(priority.id)"
                          text-class="text-sm text-on-surface"
                          input-class="text-sm"
                          placeholder="Signal description"
                          aria-label="Edit success signal"
                          @save="(value) => handleUpdateSuccessSignal(priority, index, value)"
                        />
                        <button
                          type="button"
                          class="p-1 rounded text-on-surface-variant opacity-0 group-hover/signal:opacity-100 hover:text-error transition-all flex-shrink-0"
                          :disabled="isPrioritySaving(priority.id)"
                          @click="handleRemoveSuccessSignal(priority, index)"
                        >
                          <XMarkIcon class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs text-primary hover:text-primary-strong transition-colors"
                      :disabled="isPrioritySaving(priority.id)"
                      @click="handleAddSuccessSignal(priority)"
                    >
                      <PlusIcon class="w-3.5 h-3.5" />
                      Add signal
                    </button>
                  </div>

                  <!-- Constraints -->
                  <div class="neo-surface p-3 space-y-2">
                    <div class="flex items-center gap-1.5">
                      <ShieldExclamationIcon class="w-3.5 h-3.5 text-primary" />
                      <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        Constraints
                      </span>
                    </div>
                    <div class="space-y-1.5">
                      <div
                        v-for="(constraint, index) in (priority.constraints ?? [])"
                        :key="'constraint-' + priority.id + '-' + index"
                        class="flex items-center gap-1.5 neo-inset rounded-xl px-3 py-2 group/constraint"
                      >
                        <ShieldExclamationIcon class="w-3.5 h-3.5 text-on-surface-variant/50 flex-shrink-0" />
                        <InlineEditableText
                          :model-value="constraint"
                          :disabled="isPrioritySaving(priority.id)"
                          :is-saving="isPrioritySaving(priority.id)"
                          text-class="text-sm text-on-surface"
                          input-class="text-sm"
                          placeholder="Constraint description"
                          aria-label="Edit constraint"
                          @save="(value) => handleUpdateConstraint(priority, index, value)"
                        />
                        <button
                          type="button"
                          class="p-1 rounded text-on-surface-variant opacity-0 group-hover/constraint:opacity-100 hover:text-error transition-all flex-shrink-0"
                          :disabled="isPrioritySaving(priority.id)"
                          @click="handleRemoveConstraint(priority, index)"
                        >
                          <XMarkIcon class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="flex items-center gap-1 text-xs text-primary hover:text-primary-strong transition-colors"
                      :disabled="isPrioritySaving(priority.id)"
                      @click="handleAddConstraint(priority)"
                    >
                      <PlusIcon class="w-3.5 h-3.5" />
                      Add constraint
                    </button>
                  </div>
                </div>
              </AppCard>
              <AddPeriodCard
                v-if="!isCreatingPriority"
                label="Add Priority"
                @click="openPriorityComposer"
              />
            </div>
          </div>
        </template>

        <!-- Delete Priority Confirmation Dialog -->
        <AppDialog
          v-model="showDeletePriorityDialog"
          title="Delete Priority?"
          :message="deletePriorityMessage"
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeletePriority"
          @cancel="showDeletePriorityDialog = false"
        />

        <!-- Delete Plan Confirmation Dialog -->
        <AppDialog
          v-model="showDeletePlanDialog"
          title="Delete Yearly Plan?"
          message="This will permanently delete this plan and its reflection. Priorities will be kept. This cannot be undone."
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeletePlan"
          @cancel="showDeletePlanDialog = false"
        />

        <!-- Delete Reflection Confirmation Dialog -->
        <AppDialog
          v-model="showDeleteReflectionDialog"
          title="Delete Reflection?"
          message="This will permanently delete this year's reflection. This cannot be undone."
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeleteReflection"
          @cancel="showDeleteReflectionDialog = false"
        />

        <AppSnackbar ref="snackbarRef" />
      </div>
    </Transition>

    <PeriodCreationDialog
      v-model="isDialogOpen"
      type="yearly"
      :existing-periods="existingPeriods"
      @create="handleCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  LightBulbIcon,
  PencilSquareIcon,
  TrashIcon,
  TrophyIcon,
  ShieldExclamationIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import { PlayCircleIcon, PauseCircleIcon } from '@heroicons/vue/24/solid'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import InlineEditableText from './InlineEditableText.vue'
import IconPicker from './IconPicker.vue'
import AnimatedStatusPicker from './AnimatedStatusPicker.vue'
import CommitmentActionsMenu from './CommitmentActionsMenu.vue'
import CommitmentLinkedObjectsCluster from './CommitmentLinkedObjectsCluster.vue'
import PriorityComposerCard from './PriorityComposerCard.vue'
import AddPeriodCard from './AddPeriodCard.vue'
import PeriodCard from './PeriodCard.vue'
import PeriodCreationDialog from './PeriodCreationDialog.vue'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useYearlyReflectionStore } from '@/stores/yearlyReflection.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { usePeriodCarousel } from '@/composables/usePeriodCarousel'
import {
  formatPeriodDateRange,
  getCurrentYear,
  getDefaultPeriodName,
  getYearFromDate,
  isCurrentPeriod,
  isPastPeriod,
  suggestNextPeriodDates,
} from '@/utils/periodUtils'
import type { YearlyPlan, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

interface PeriodItem {
  key: string
  id?: string
  year: number
  startDate: string
  endDate: string
  name?: string
  hasPlan: boolean
  hasReflection: boolean
  isAddCard?: boolean
}

const router = useRouter()
const yearlyPlanStore = useYearlyPlanStore()
const yearlyReflectionStore = useYearlyReflectionStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isDialogOpen = ref(false)
const currentYear = getCurrentYear()
const selectedPeriodKey = ref<string | null>(null)

const isCalendarLoading = computed(
  () => yearlyPlanStore.isLoading || yearlyReflectionStore.isLoading
)
const calendarError = computed(
  () => yearlyPlanStore.error || yearlyReflectionStore.error
)
const isDetailsLoading = computed(
  () => lifeAreaStore.isLoading || priorityStore.isLoading
)
const detailsError = computed(
  () => lifeAreaStore.error || priorityStore.error
)

const existingPeriods = computed(() =>
  yearlyPlanStore.canonicalYearlyPlans.map((plan) => ({
    startDate: plan.startDate,
    endDate: plan.endDate,
  }))
)

const periods = computed<PeriodItem[]>(() => {
  const items: PeriodItem[] = yearlyPlanStore.canonicalYearlyPlans.map((plan: YearlyPlan) => {
    const reflection = yearlyReflectionStore.getReflectionByPlanId(plan.id)
    const hasPlanContent = Boolean(
      plan.yearTheme?.trim() ||
      Object.values(plan.lifeAreaNarratives ?? {}).some((narrative) => narrative.trim().length > 0) ||
      priorityStore.getPrioritiesByYear(plan.year).length > 0
    )
    return {
      key: plan.id,
      id: plan.id,
      year: plan.year,
      startDate: plan.startDate,
      endDate: plan.endDate,
      name: plan.name,
      hasPlan: hasPlanContent,
      hasReflection: Boolean(reflection?.completedAt),
    }
  })

  const hasCurrent = items.some((item) => isCurrentPeriod(item.startDate, item.endDate))

  if (!hasCurrent) {
    const suggestion = suggestNextPeriodDates('yearly')
    const year = getYearFromDate(suggestion.startDate)
    items.push({
      key: `current-${suggestion.startDate}`,
      year,
      startDate: suggestion.startDate,
      endDate: suggestion.endDate,
      name: undefined,
      hasPlan: false,
      hasReflection: false,
    })
  }

  return items.sort((a, b) => a.startDate.localeCompare(b.startDate))
})

const selectedPeriod = computed(() =>
  periods.value.find((period) => period.key === selectedPeriodKey.value)
)

const selectedYearlyPlan = computed(() => {
  const planId = selectedPeriod.value?.id
  return planId ? yearlyPlanStore.getYearlyPlanById(planId) : undefined
})

const selectedYear = computed(() => selectedPeriod.value?.year ?? currentYear)
const selectedYearlyReflection = computed(() => {
  const planId = selectedYearlyPlan.value?.id
  return planId ? yearlyReflectionStore.getReflectionByPlanId(planId) : undefined
})

const selectedPeriodRange = computed(() => {
  if (!selectedPeriod.value) return ''
  return formatPeriodDateRange(selectedPeriod.value.startDate, selectedPeriod.value.endDate)
})

const selectedPeriodTitle = computed(() => {
  if (!selectedPeriod.value?.name) return ''
  const trimmed = selectedPeriod.value.name.trim()
  if (!trimmed) return ''
  const defaultLabel = getDefaultPeriodName(
    selectedPeriod.value.startDate,
    selectedPeriod.value.endDate,
    'yearly'
  )
  return trimmed === defaultLabel ? '' : trimmed
})

const hasSelectedPlan = computed(() => Boolean(selectedYearlyPlan.value))
const hasSelectedReflection = computed(
  () => Boolean(selectedYearlyReflection.value?.completedAt)
)
const isSelectedCurrent = computed(() => {
  if (!selectedPeriod.value) return false
  return isCurrentPeriod(selectedPeriod.value.startDate, selectedPeriod.value.endDate)
})
const isSelectedPast = computed(() => {
  if (!selectedPeriod.value) return false
  return isPastPeriod(selectedPeriod.value.endDate)
})

const reflectionEnabled = computed(
  () => hasSelectedPlan.value && (isSelectedPast.value || isSelectedCurrent.value)
)
function setDefaultSelection() {
  const currentPeriod = periods.value.find((period) =>
    isCurrentPeriod(period.startDate, period.endDate)
  )
  const fallback = periods.value[periods.value.length - 1]
  selectedPeriodKey.value = currentPeriod?.key ?? fallback?.key ?? null
}

const selectedIndex = computed(() =>
  periods.value.findIndex((period) => period.key === selectedPeriodKey.value)
)

const allSlides = computed<PeriodItem[]>(() => {
  const slides: PeriodItem[] = [...periods.value]
  // Always show the "Add Year" card at the end for easy access
  slides.push({
    key: 'add-card',
    year: currentYear,
    startDate: '',
    endDate: '',
    hasPlan: false,
    hasReflection: false,
    isAddCard: true,
  })
  return slides
})

const slideCount = computed(() => allSlides.value.length)
const isCarouselActive = computed(
  () => !isCalendarLoading.value && !calendarError.value
)

const { emblaRef, canPrev, canNext, scrollPrev, scrollNext, scrollTo } = usePeriodCarousel({
  selectedIndex,
  slideCount,
  isActive: isCarouselActive,
  onSelect(index) {
    const period = periods.value[index]
    if (period) {
      selectedPeriodKey.value = period.key
    }
  },
})

function handleSlideSelect(index: number) {
  const period = periods.value[index]
  if (period) {
    selectedPeriodKey.value = period.key
    scrollTo(index)
  }
}

watch(
  periods,
  () => {
    const hasSelection =
      selectedPeriodKey.value &&
      periods.value.some((period) => period.key === selectedPeriodKey.value)

    if (!hasSelection) {
      setDefaultSelection()
    }
  },
  { immediate: true }
)

// Re-select current period after data finishes loading
watch(isCalendarLoading, (loading, wasLoading) => {
  if (!loading && wasLoading) {
    setDefaultSelection()
  }
})

watch(
  selectedYear,
  async (year) => {
    await Promise.all([
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(year),
    ])
  },
  { immediate: true }
)

const activeLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)

const planHighlights = computed(() => {
  if (!selectedYearlyPlan.value) return []
  const narrativeCount = Object.values(selectedYearlyPlan.value.lifeAreaNarratives ?? {}).filter(
    (narrative) => narrative.trim().length > 0
  ).length
  const priorityCount = priorityStore.getPrioritiesByYear(selectedYear.value).length
  const prioritySummary = priorityCount > 0 ? `${priorityCount} priorities` : undefined

  return [
    { label: 'Year theme', value: selectedYearlyPlan.value.yearTheme },
    {
      label: 'Life area narratives',
      value: narrativeCount > 0 ? `${narrativeCount} captured` : undefined,
    },
    { label: 'Priorities', value: prioritySummary },
  ].filter((item) => item.value && item.value.trim().length > 0) as {
    label: string
    value: string
  }[]
})

const reflectionHighlights = computed(() => {
  if (!selectedYearlyReflection.value) return []
  const biggestWin = selectedYearlyReflection.value.biggestWins?.[0]
  const biggestLesson = selectedYearlyReflection.value.biggestLessons?.[0]

  return [
    { label: 'Year in one phrase', value: selectedYearlyReflection.value.yearInOnePhrase },
    { label: 'Biggest win', value: biggestWin },
    { label: 'Biggest lesson', value: biggestLesson },
    { label: 'Carry forward', value: selectedYearlyReflection.value.carryForward },
  ].filter((item) => item.value && item.value.trim().length > 0) as {
    label: string
    value: string
  }[]
})

const savingPriorityIds = ref(new Set<string>())

function isPrioritySaving(id: string) {
  return savingPriorityIds.value.has(id)
}

function showSnackbar(message: string) {
  snackbarRef.value?.show(message)
}

// ============================================================================
// Plan & Reflection Delete State
// ============================================================================

const showDeletePlanDialog = ref(false)
const showDeleteReflectionDialog = ref(false)

function openDeletePlanDialog() {
  showDeletePlanDialog.value = true
}

function openDeleteReflectionDialog() {
  showDeleteReflectionDialog.value = true
}

async function handleConfirmDeletePlan() {
  const plan = selectedYearlyPlan.value
  if (!plan) return

  try {
    const reflection = yearlyReflectionStore.getReflectionByPlanId(plan.id)
    if (reflection) {
      await yearlyReflectionStore.deleteReflection(reflection.id)
    }
    await yearlyPlanStore.deleteYearlyPlan(plan.id)
    showDeletePlanDialog.value = false
  } catch {
    showSnackbar('Failed to delete yearly plan.')
  }
}

async function handleConfirmDeleteReflection() {
  const reflection = selectedYearlyReflection.value
  if (!reflection) return

  try {
    await yearlyReflectionStore.deleteReflection(reflection.id)
    showDeleteReflectionDialog.value = false
  } catch {
    showSnackbar('Failed to delete reflection.')
  }
}

// ============================================================================
// Priority Delete State
// ============================================================================

const showDeletePriorityDialog = ref(false)
const priorityToDelete = ref<Priority | undefined>(undefined)

const deletePriorityMessage = computed(() => {
  if (!priorityToDelete.value) return ''
  return `Are you sure you want to delete the priority "${priorityToDelete.value.name}"?`
})

function openDeletePriorityDialog(priorityId: string) {
  priorityToDelete.value = priorityStore.getPriorityById(priorityId)
  showDeletePriorityDialog.value = true
}

async function handleConfirmDeletePriority() {
  if (!priorityToDelete.value) return

  try {
    await priorityStore.deletePriority(priorityToDelete.value.id)
    showDeletePriorityDialog.value = false
    priorityToDelete.value = undefined
  } catch {
    // Error is handled by store
  }
}

// ============================================================================
// Priority Active Toggle
// ============================================================================

async function handleTogglePriorityActive(priorityId: string, isActive: boolean) {
  if (isPrioritySaving(priorityId)) return
  const priority = priorityStore.getPriorityById(priorityId)
  if (!priority) return

  const previous = { ...priority }
  Object.assign(priority, { isActive })
  savingPriorityIds.value.add(priorityId)

  try {
    await priorityStore.updatePriority(priorityId, { isActive })
  } catch (error) {
    Object.assign(priority, previous)
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priorityId)
  }
}

async function handlePriorityNameUpdate(priorityId: string, name: string) {
  if (isPrioritySaving(priorityId)) return
  const priority = priorityStore.getPriorityById(priorityId)
  if (!priority) return

  const previous = { ...priority }
  Object.assign(priority, { name })
  savingPriorityIds.value.add(priorityId)

  try {
    await priorityStore.updatePriority(priorityId, { name })
  } catch (error) {
    Object.assign(priority, previous)
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priorityId)
  }
}

async function handlePriorityIconUpdate(priorityId: string, icon: string | undefined) {
  if (isPrioritySaving(priorityId)) return
  const priority = priorityStore.getPriorityById(priorityId)
  if (!priority) return

  const previous = { ...priority }
  Object.assign(priority, { icon })
  savingPriorityIds.value.add(priorityId)

  try {
    await priorityStore.updatePriority(priorityId, { icon })
  } catch (error) {
    Object.assign(priority, previous)
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priorityId)
  }
}

function getItemStatusesForPeriod(period: PeriodItem) {
  if (!period.id) return []
  return priorityStore.getPrioritiesByYear(period.year).map((priority) => ({
    label: priority.name,
    status: priority.isActive ? 'active' : 'paused',
  }))
}

function handleCardPlan(period: PeriodItem) {
  handlePlan(period)
}

function handleCardReflect(period: PeriodItem) {
  handleReflect(period)
}

function handleSelectedPlan() {
  if (!selectedPeriod.value) return
  handlePlan(selectedPeriod.value)
}

function handleSelectedReflect() {
  if (!selectedPeriod.value || !reflectionEnabled.value) return
  handleReflect(selectedPeriod.value)
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  await Promise.all([
    yearlyPlanStore.loadYearlyPlans(),
    yearlyReflectionStore.loadYearlyReflections(),
  ])
}

async function handleCreate(payload: { startDate: string; endDate: string; name?: string }) {
  const year = getYearFromDate(payload.startDate)
  const existing = yearlyPlanStore.getCanonicalYearlyPlanByYear(year)
  const created = existing ?? await yearlyPlanStore.createYearlyPlan({
    startDate: payload.startDate,
    endDate: payload.endDate,
    name: payload.name,
    year,
    yearTheme: undefined,
  })

  isDialogOpen.value = false
  router.push(`/planning/year/${created.id}`)
}

async function handlePlan(period: PeriodItem) {
  const existing = yearlyPlanStore.getCanonicalYearlyPlanByYear(period.year)
  if (existing) {
    router.push(`/planning/year/${existing.id}`)
    return
  }

  const created = await yearlyPlanStore.createYearlyPlan({
    startDate: period.startDate,
    endDate: period.endDate,
    name: period.name,
    year: period.year,
    yearTheme: undefined,
  })

  router.push(`/planning/year/${created.id}`)
}

async function handleReflect(period: PeriodItem) {
  const existing = yearlyPlanStore.getCanonicalYearlyPlanByYear(period.year)
  if (existing) {
    router.push(`/planning/year/${existing.id}/reflect`)
    return
  }

  const created = await yearlyPlanStore.createYearlyPlan({
    startDate: period.startDate,
    endDate: period.endDate,
    name: period.name,
    year: period.year,
    yearTheme: undefined,
  })

  router.push(`/planning/year/${created.id}/reflect`)
}

onMounted(() => {
  loadData()
})

// ============================================================================
// Priority Inline Composer + Linking
// ============================================================================

const isCreatingPriority = ref(false)
const isCreatingPrioritySaving = ref(false)
const priorityLinkCategories = [{ id: 'lifeArea', label: 'Life area' }]

const sortedPriorities = computed(() => {
  return priorityStore.getPrioritiesByYear(selectedYear.value).sort((a, b) => a.sortOrder - b.sortOrder)
})

const availableLifeAreasForNewPriority = computed(() => activeLifeAreas.value)

function openPriorityComposer() {
  isCreatingPriority.value = true
}

function closePriorityComposer() {
  isCreatingPriority.value = false
}

async function handleCreatePriority(payload: {
  name: string
  icon?: string
  lifeAreaIds: string[]
  successSignals: string[]
  constraints: string[]
}) {
  if (isCreatingPrioritySaving.value) return
  isCreatingPrioritySaving.value = true
  try {
    await priorityStore.createPriority({
      name: payload.name,
      icon: payload.icon,
      year: selectedYear.value,
      lifeAreaIds: payload.lifeAreaIds,
      successSignals: payload.successSignals,
      constraints: payload.constraints,
      isActive: true,
      sortOrder: sortedPriorities.value.length,
    })
    isCreatingPriority.value = false
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create priority.'
    showSnackbar(message)
  } finally {
    isCreatingPrioritySaving.value = false
  }
}

function availableLifeAreasForPriority(priority: Priority): LifeArea[] {
  return activeLifeAreas.value.filter((la) => !priority.lifeAreaIds.includes(la.id))
}

function priorityLinkItemsByCategory(priority: Priority) {
  return {
    lifeArea: availableLifeAreasForPriority(priority).map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color })),
  }
}

async function handleAddPriorityLink(priority: Priority, payload: { category: string; itemId: string }) {
  if (payload.category !== 'lifeArea') return
  const lifeAreaId = payload.itemId
  if (!lifeAreaId || priority.lifeAreaIds.includes(lifeAreaId)) return
  if (isPrioritySaving(priority.id)) return

  const previous = [...priority.lifeAreaIds]
  const next = [...priority.lifeAreaIds, lifeAreaId]
  priority.lifeAreaIds = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { lifeAreaIds: next })
  } catch (error) {
    priority.lifeAreaIds = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

async function removePriorityLifeArea(priority: Priority, lifeAreaId: string) {
  if (isPrioritySaving(priority.id)) return
  const previous = [...priority.lifeAreaIds]
  const next = priority.lifeAreaIds.filter((id) => id !== lifeAreaId)
  priority.lifeAreaIds = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { lifeAreaIds: next })
  } catch (error) {
    priority.lifeAreaIds = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

// ============================================================================
// Success Signals & Constraints Management
// ============================================================================

async function handleAddSuccessSignal(priority: Priority) {
  if (isPrioritySaving(priority.id)) return
  const next = [...priority.successSignals, '']
  const previous = [...priority.successSignals]
  priority.successSignals = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { successSignals: next })
  } catch (error) {
    priority.successSignals = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

async function handleUpdateSuccessSignal(priority: Priority, index: number, value: string) {
  if (isPrioritySaving(priority.id)) return
  const previous = [...priority.successSignals]
  const next = [...priority.successSignals]
  next[index] = value
  priority.successSignals = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { successSignals: next })
  } catch (error) {
    priority.successSignals = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

async function handleRemoveSuccessSignal(priority: Priority, index: number) {
  if (isPrioritySaving(priority.id)) return
  const previous = [...priority.successSignals]
  const next = priority.successSignals.filter((_, i) => i !== index)
  priority.successSignals = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { successSignals: next })
  } catch (error) {
    priority.successSignals = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

async function handleAddConstraint(priority: Priority) {
  if (isPrioritySaving(priority.id)) return
  const constraints = priority.constraints ?? []
  const next = [...constraints, '']
  const previous = [...constraints]
  priority.constraints = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { constraints: next })
  } catch (error) {
    priority.constraints = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

async function handleUpdateConstraint(priority: Priority, index: number, value: string) {
  if (isPrioritySaving(priority.id)) return
  const constraints = priority.constraints ?? []
  const previous = [...constraints]
  const next = [...constraints]
  next[index] = value
  priority.constraints = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { constraints: next })
  } catch (error) {
    priority.constraints = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

async function handleRemoveConstraint(priority: Priority, index: number) {
  if (isPrioritySaving(priority.id)) return
  const constraints = priority.constraints ?? []
  const previous = [...constraints]
  const next = constraints.filter((_, i) => i !== index)
  priority.constraints = next
  savingPriorityIds.value.add(priority.id)

  try {
    await priorityStore.updatePriority(priority.id, { constraints: next })
  } catch (error) {
    priority.constraints = previous
    const message = error instanceof Error ? error.message : 'Failed to update priority.'
    showSnackbar(message)
  } finally {
    savingPriorityIds.value.delete(priority.id)
  }
}

const priorityStatusOptions = [
  {
    value: 'active',
    label: 'Active',
    icon: markRaw(PlayCircleIcon),
    activeClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'paused',
    label: 'Paused',
    icon: markRaw(PauseCircleIcon),
    activeClass: 'text-on-surface-variant',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-on-surface-variant/70',
  },
]

function resolveLinkedLifeAreas(priority: Priority): LifeArea[] {
  return priority.lifeAreaIds
    .map((id) => lifeAreaStore.getLifeAreaById(id))
    .filter(Boolean) as LifeArea[]
}

function priorityRemovableLinks(priority: Priority) {
  return resolveLinkedLifeAreas(priority).map((la) => ({
    id: la.id,
    label: la.name,
    icon: la.icon,
    color: la.color,
    category: 'lifeArea' as const,
  }))
}

function handleRemovePriorityLink(priority: Priority, payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    removePriorityLifeArea(priority, payload.itemId)
  }
}

</script>

<style scoped>
.embla__viewport {
  overflow: hidden;
  flex: 1;
  padding: 12px 8px 8px;
  margin: -12px -8px -8px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.embla__container {
  display: flex;
  gap: 1rem;
  touch-action: pan-y pinch-zoom;
  align-items: stretch;
}
.embla__slide {
  flex: 0 0 260px;
}
</style>
