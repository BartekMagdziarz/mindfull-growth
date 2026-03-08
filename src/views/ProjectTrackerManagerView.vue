<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 pb-24">
    <div class="mb-6 flex items-center gap-3">
      <button
        type="button"
        class="neo-back-btn p-2 text-neu-text neo-focus"
        aria-label="Back to planning"
        @click="router.push('/planning')"
      >
        <ArrowLeftIcon class="h-6 w-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('planning.projectTracker.title') }}</h1>
        <p class="text-sm text-on-surface-variant">
          {{ t('planning.projectTracker.subtitle') }}
        </p>
      </div>
    </div>

    <AppCard v-if="isLoading" padding="lg" class="mb-4">
      <p class="text-sm text-on-surface-variant">Loading projects, trackers, and plans...</p>
    </AppCard>

    <AppCard v-else-if="error" padding="lg" class="mb-4 border-error/40">
      <p class="text-sm text-error">{{ error }}</p>
      <div class="mt-3">
        <AppButton variant="tonal" @click="loadData">Try again</AppButton>
      </div>
    </AppCard>

    <AppCard
      v-else-if="sortedProjects.length === 0"
      padding="lg"
      class="mb-4"
    >
      <p class="text-sm text-on-surface-variant">
        No projects yet. Create projects from monthly planning first, then manage trackers here.
      </p>
    </AppCard>

    <div v-else class="space-y-6">
      <AppCard
        v-for="project in sortedProjects"
        :key="project.id"
        padding="lg"
        class="space-y-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-on-surface">{{ project.name }}</h2>
            <p class="text-xs text-on-surface-variant">
              {{ project.id }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="neo-icon-button neo-icon-button--danger neo-focus h-10 w-10 p-0"
              :aria-label="`Delete project ${project.name}`"
              :disabled="isProjectBusy(project.id)"
              @click="openDeleteProjectDialog(project.id)"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
            <AppButton
              variant="filled"
              size="sm"
              :disabled="isProjectBusy(project.id)"
              @click="saveProjectDraft(project.id)"
            >
              {{ isProjectSaving(project.id) ? t('planning.projectTracker.saving') : t('planning.projectTracker.save') }}
            </AppButton>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-on-surface-variant">{{ t('planning.projectTracker.fields.name') }}</label>
            <input
              type="text"
              class="neo-input w-full px-3 py-2 text-sm"
              :value="projectDrafts[project.id]?.name || ''"
              @input="updateProjectDraftField(project.id, 'name', getInputValue($event))"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-on-surface-variant">{{ t('planning.projectTracker.fields.icon') }}</label>
            <IconPicker
              :model-value="projectDrafts[project.id]?.icon"
              aria-label="Select project icon"
              @update:model-value="(icon) => updateProjectDraftField(project.id, 'icon', icon)"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-on-surface-variant">{{ t('planning.projectTracker.fields.status') }}</label>
            <select
              class="neo-input w-full px-3 py-2 text-sm"
              :value="projectDrafts[project.id]?.status || 'planned'"
              @change="updateProjectDraftField(project.id, 'status', getSelectValue($event) as ProjectStatus)"
            >
              <option value="planned">{{ t('planning.common.status.planned') }}</option>
              <option value="active">{{ t('planning.common.status.active') }}</option>
              <option value="paused">{{ t('planning.common.status.paused') }}</option>
              <option value="completed">{{ t('planning.common.status.completed') }}</option>
              <option value="abandoned">{{ t('planning.common.status.abandoned') }}</option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-on-surface-variant">{{ t('planning.projectTracker.fields.startDate') }}</label>
            <input
              type="date"
              class="neo-input w-full px-3 py-2 text-sm"
              :value="projectDrafts[project.id]?.startDate || ''"
              @input="updateProjectDraftField(project.id, 'startDate', getInputValue($event))"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-on-surface-variant">{{ t('planning.projectTracker.fields.endDate') }}</label>
            <input
              type="date"
              class="neo-input w-full px-3 py-2 text-sm"
              :value="projectDrafts[project.id]?.endDate || ''"
              @input="updateProjectDraftField(project.id, 'endDate', getInputValue($event))"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-on-surface-variant">{{ t('planning.projectTracker.fields.objective') }}</label>
          <textarea
            rows="2"
            class="neo-input w-full px-3 py-2 text-sm"
            :value="projectDrafts[project.id]?.objective || ''"
            @input="updateProjectDraftField(project.id, 'objective', getTextAreaValue($event))"
          />
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.projectTracker.linkedMonths') }}
            </p>
            <p
              v-if="selectedProjectPlans(project.id, 'monthIds').length === 0"
              class="text-xs text-on-surface-variant"
            >
              No linked months yet.
            </p>
            <div v-else class="flex flex-wrap gap-2">
              <span
                v-for="plan in selectedProjectPlans(project.id, 'monthIds')"
                :key="`month-link-selected-${project.id}-${plan.id}`"
                class="inline-flex items-center gap-1 rounded-full bg-section px-2.5 py-1 text-[11px] text-on-surface"
              >
                <span>{{ plan.label }}</span>
                <button
                  type="button"
                  class="rounded-full px-1 leading-none text-on-surface-variant transition-colors hover:bg-outline/20 hover:text-on-surface"
                  :aria-label="`Remove linked month ${plan.label}`"
                  @click="removeProjectPlanLink(project.id, 'monthIds', plan.id)"
                >
                  ×
                </button>
              </span>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                class="neo-input w-full px-3 py-2 text-xs"
                :aria-label="`Select linked month for ${project.name}`"
                :value="getProjectPlanAddSelection(project.id, 'monthIds')"
                @change="setProjectPlanAddSelection(project.id, 'monthIds', getSelectValue($event))"
              >
                <option value="">Add linked month...</option>
                <option
                  v-for="plan in availableProjectPlans(project.id, 'monthIds')"
                  :key="`month-link-option-${project.id}-${plan.id}`"
                  :value="plan.id"
                >
                  {{ plan.label }}
                </option>
              </select>
              <AppButton
                variant="tonal"
                size="sm"
                :disabled="!getProjectPlanAddSelection(project.id, 'monthIds')"
                @click="addProjectPlanLink(project.id, 'monthIds')"
              >
                Add
              </AppButton>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.projectTracker.focusMonths') }}
            </p>
            <p
              v-if="selectedProjectPlans(project.id, 'focusMonthIds').length === 0"
              class="text-xs text-on-surface-variant"
            >
              No focus months yet.
            </p>
            <div v-else class="flex flex-wrap gap-2">
              <span
                v-for="plan in selectedProjectPlans(project.id, 'focusMonthIds')"
                :key="`month-focus-selected-${project.id}-${plan.id}`"
                class="inline-flex items-center gap-1 rounded-full bg-section px-2.5 py-1 text-[11px] text-on-surface"
              >
                <span>{{ plan.label }}</span>
                <button
                  type="button"
                  class="rounded-full px-1 leading-none text-on-surface-variant transition-colors hover:bg-outline/20 hover:text-on-surface"
                  :aria-label="`Remove focus month ${plan.label}`"
                  @click="removeProjectPlanLink(project.id, 'focusMonthIds', plan.id)"
                >
                  ×
                </button>
              </span>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                class="neo-input w-full px-3 py-2 text-xs"
                :aria-label="`Select focus month for ${project.name}`"
                :value="getProjectPlanAddSelection(project.id, 'focusMonthIds')"
                @change="setProjectPlanAddSelection(project.id, 'focusMonthIds', getSelectValue($event))"
              >
                <option value="">Add focus month...</option>
                <option
                  v-for="plan in availableProjectPlans(project.id, 'focusMonthIds')"
                  :key="`month-focus-option-${project.id}-${plan.id}`"
                  :value="plan.id"
                >
                  {{ plan.label }}
                </option>
              </select>
              <AppButton
                variant="tonal"
                size="sm"
                :disabled="!getProjectPlanAddSelection(project.id, 'focusMonthIds')"
                @click="addProjectPlanLink(project.id, 'focusMonthIds')"
              >
                Add
              </AppButton>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.projectTracker.focusWeeks') }}
            </p>
            <p
              v-if="selectedProjectPlans(project.id, 'focusWeekIds').length === 0"
              class="text-xs text-on-surface-variant"
            >
              No focus weeks yet.
            </p>
            <div v-else class="flex flex-wrap gap-2">
              <span
                v-for="plan in selectedProjectPlans(project.id, 'focusWeekIds')"
                :key="`week-focus-selected-${project.id}-${plan.id}`"
                class="inline-flex items-center gap-1 rounded-full bg-section px-2.5 py-1 text-[11px] text-on-surface"
              >
                <span>{{ plan.label }}</span>
                <button
                  type="button"
                  class="rounded-full px-1 leading-none text-on-surface-variant transition-colors hover:bg-outline/20 hover:text-on-surface"
                  :aria-label="`Remove focus week ${plan.label}`"
                  @click="removeProjectPlanLink(project.id, 'focusWeekIds', plan.id)"
                >
                  ×
                </button>
              </span>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                class="neo-input w-full px-3 py-2 text-xs"
                :aria-label="`Select focus week for ${project.name}`"
                :value="getProjectPlanAddSelection(project.id, 'focusWeekIds')"
                @change="setProjectPlanAddSelection(project.id, 'focusWeekIds', getSelectValue($event))"
              >
                <option value="">Add focus week...</option>
                <option
                  v-for="plan in availableProjectPlans(project.id, 'focusWeekIds')"
                  :key="`week-focus-option-${project.id}-${plan.id}`"
                  :value="plan.id"
                >
                  {{ plan.label }}
                </option>
              </select>
              <AppButton
                variant="tonal"
                size="sm"
                :disabled="!getProjectPlanAddSelection(project.id, 'focusWeekIds')"
                @click="addProjectPlanLink(project.id, 'focusWeekIds')"
              >
                Add
              </AppButton>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-on-surface">{{ t('planning.projectTracker.keyResults') }}</h3>
            <AppButton
              variant="tonal"
              size="sm"
              :disabled="isTrackerSaving(project.id)"
              @click="saveProjectTrackers(project.id)"
            >
              {{ isTrackerSaving(project.id) ? 'Saving trackers...' : 'Save key results' }}
            </AppButton>
          </div>

          <KeyResultsEditor
            :ref="(el) => setKeyResultsEditorRef(project.id, el)"
            :model-value="trackerDrafts[project.id] || []"
            @update:model-value="updateTrackerDraft(project.id, $event)"
          />
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-on-surface">{{ t('planning.projectTracker.trackerSelection.title') }}</h3>

          <div class="grid gap-4 xl:grid-cols-2">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.projectTracker.trackerSelection.monthlyPlans') }}
              </p>
              <p
                v-if="monthlyTrackersForProject(project.id).length === 0"
                class="text-xs text-on-surface-variant"
              >
                Save at least one active monthly tracker to link it to monthly plans.
              </p>

              <div
                v-for="tracker in monthlyTrackersForProject(project.id)"
                :key="`monthly-tracker-links-${project.id}-${tracker.id}`"
                class="rounded-xl border border-neu-border/20 p-3"
              >
                <p class="text-xs font-medium text-on-surface">{{ tracker.name }}</p>
                <p class="text-[11px] text-on-surface-variant">{{ tracker.type }} · {{ tracker.cadence }}</p>

                <p
                  v-if="selectedPlansForTracker('monthly', tracker.id).length === 0"
                  class="mt-2 text-xs text-on-surface-variant"
                >
                  Not linked to any monthly plan yet.
                </p>
                <div v-else class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="plan in selectedPlansForTracker('monthly', tracker.id)"
                    :key="`monthly-tracker-selected-${project.id}-${tracker.id}-${plan.id}`"
                    class="inline-flex items-center gap-1 rounded-full bg-section px-2.5 py-1 text-[11px] text-on-surface"
                  >
                    <span>{{ plan.label }}</span>
                    <button
                      type="button"
                      class="rounded-full px-1 leading-none text-on-surface-variant transition-colors hover:bg-outline/20 hover:text-on-surface"
                      :aria-label="`Remove monthly period ${plan.label} from ${tracker.name}`"
                      @click="removeTrackerPlanLink('monthly', plan.id, project.id, tracker.id)"
                    >
                      ×
                    </button>
                  </span>
                </div>

                <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    class="neo-input w-full px-3 py-2 text-xs"
                    :aria-label="`Select monthly period for ${tracker.name}`"
                    :value="getTrackerPlanAddSelection('monthly', project.id, tracker.id)"
                    @change="setTrackerPlanAddSelection('monthly', project.id, tracker.id, getSelectValue($event))"
                  >
                    <option value="">Add monthly period...</option>
                    <option
                      v-for="plan in availablePlansForTracker('monthly', tracker.id)"
                      :key="`monthly-tracker-option-${project.id}-${tracker.id}-${plan.id}`"
                      :value="plan.id"
                    >
                      {{ plan.label }}
                    </option>
                  </select>
                  <AppButton
                    variant="tonal"
                    size="sm"
                    :aria-label="`Add monthly period for ${tracker.name}`"
                    :disabled="!getTrackerPlanAddSelection('monthly', project.id, tracker.id)"
                    @click="addTrackerPlanLink('monthly', project.id, tracker.id)"
                  >
                    Add period
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.projectTracker.trackerSelection.weeklyPlans') }}
              </p>
              <p
                v-if="weeklyTrackersForProject(project.id).length === 0"
                class="text-xs text-on-surface-variant"
              >
                Save at least one active weekly or monthly tracker to link it to weekly plans.
              </p>

              <div
                v-for="tracker in weeklyTrackersForProject(project.id)"
                :key="`weekly-tracker-links-${project.id}-${tracker.id}`"
                class="rounded-xl border border-neu-border/20 p-3"
              >
                <p class="text-xs font-medium text-on-surface">{{ tracker.name }}</p>
                <p class="text-[11px] text-on-surface-variant">{{ tracker.type }} · {{ tracker.cadence }}</p>

                <p
                  v-if="selectedPlansForTracker('weekly', tracker.id).length === 0"
                  class="mt-2 text-xs text-on-surface-variant"
                >
                  Not linked to any weekly plan yet.
                </p>
                <div v-else class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="plan in selectedPlansForTracker('weekly', tracker.id)"
                    :key="`weekly-tracker-selected-${project.id}-${tracker.id}-${plan.id}`"
                    class="inline-flex items-center gap-1 rounded-full bg-section px-2.5 py-1 text-[11px] text-on-surface"
                  >
                    <span>{{ plan.label }}</span>
                    <button
                      type="button"
                      class="rounded-full px-1 leading-none text-on-surface-variant transition-colors hover:bg-outline/20 hover:text-on-surface"
                      :aria-label="`Remove weekly period ${plan.label} from ${tracker.name}`"
                      @click="removeTrackerPlanLink('weekly', plan.id, project.id, tracker.id)"
                    >
                      ×
                    </button>
                  </span>
                </div>

                <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    class="neo-input w-full px-3 py-2 text-xs"
                    :aria-label="`Select weekly period for ${tracker.name}`"
                    :value="getTrackerPlanAddSelection('weekly', project.id, tracker.id)"
                    @change="setTrackerPlanAddSelection('weekly', project.id, tracker.id, getSelectValue($event))"
                  >
                    <option value="">Add weekly period...</option>
                    <option
                      v-for="plan in availablePlansForTracker('weekly', tracker.id)"
                      :key="`weekly-tracker-option-${project.id}-${tracker.id}-${plan.id}`"
                      :value="plan.id"
                    >
                      {{ plan.label }}
                    </option>
                  </select>
                  <AppButton
                    variant="tonal"
                    size="sm"
                    :aria-label="`Add weekly period for ${tracker.name}`"
                    :disabled="!getTrackerPlanAddSelection('weekly', project.id, tracker.id)"
                    @click="addTrackerPlanLink('weekly', project.id, tracker.id)"
                  >
                    Add period
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <AppDialog
      v-model="showDeleteProjectDialog"
      title="Delete project"
      :message="deleteProjectMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-variant="filled"
      @confirm="handleConfirmDeleteProject"
      @cancel="showDeleteProjectDialog = false"
    />

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type ComponentPublicInstance } from 'vue'
import { ArrowLeftIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import KeyResultsEditor from '@/components/planning/KeyResultsEditor.vue'
import IconPicker from '@/components/planning/IconPicker.vue'
import { useT } from '@/composables/useT'
import type { Project, ProjectStatus, Tracker } from '@/domain/planning'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useProjectStore } from '@/stores/project.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { resolvePeriodTrackerSelection } from '@/services/periodTrackerSelection.service'
import { formatPeriodDateRange } from '@/utils/periodUtils'

interface ProjectDraft {
  name: string
  icon?: string
  status: ProjectStatus
  objective: string
  startDate: string
  endDate: string
  monthIds: string[]
  focusMonthIds: string[]
  focusWeekIds: string[]
}

type ProjectPlanKey = 'monthIds' | 'focusMonthIds' | 'focusWeekIds'

interface ProjectPlanAddDraft {
  monthIds: string
  focusMonthIds: string
  focusWeekIds: string
}

interface PlanLike {
  id: string
  startDate: string
  endDate: string
  name?: string
}

interface PlanChip {
  id: string
  label: string
}

const router = useRouter()
const { t } = useT()
const projectStore = useProjectStore()
const trackerStore = useTrackerStore()
const weeklyPlanStore = useWeeklyPlanStore()
const monthlyPlanStore = useMonthlyPlanStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isLoading = ref(true)
const error = ref<string | null>(null)

const projectDrafts = ref<Record<string, ProjectDraft>>({})
const projectPlanAddDrafts = ref<Record<string, ProjectPlanAddDraft>>({})
const trackerDrafts = ref<Record<string, Partial<Tracker>[]>>({})
const trackerSnapshots = ref<Record<string, Tracker[]>>({})
const trackerPlanAddDrafts = ref<Record<string, string>>({})
const keyResultsEditorRefs = ref<Record<string, InstanceType<typeof KeyResultsEditor> | null>>({})

const savingProjectIds = ref(new Set<string>())
const savingTrackerIds = ref(new Set<string>())
const showDeleteProjectDialog = ref(false)
const projectToDelete = ref<Project | null>(null)

function showSnackbar(message: string): void {
  snackbarRef.value?.show(message)
}

function cloneTracker(tracker: Tracker): Tracker {
  return {
    ...tracker,
    lifeAreaIds: [...tracker.lifeAreaIds],
    priorityIds: [...tracker.priorityIds],
    tickLabels: tracker.tickLabels ? [...tracker.tickLabels] : undefined,
  }
}

function cloneTrackerDraft(tracker: Tracker): Partial<Tracker> {
  return {
    ...tracker,
    lifeAreaIds: [...tracker.lifeAreaIds],
    priorityIds: [...tracker.priorityIds],
    tickLabels: tracker.tickLabels ? [...tracker.tickLabels] : undefined,
  }
}

function toProjectDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    icon: project.icon,
    status: project.status,
    objective: project.objective ?? '',
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
    monthIds: [...(project.monthIds ?? [])],
    focusMonthIds: [...(project.focusMonthIds ?? [])],
    focusWeekIds: [...(project.focusWeekIds ?? [])],
  }
}

function ensureProjectPlanAddDraft(projectId: string): ProjectPlanAddDraft {
  const existing = projectPlanAddDrafts.value[projectId]
  if (existing) return existing

  const created: ProjectPlanAddDraft = {
    monthIds: '',
    focusMonthIds: '',
    focusWeekIds: '',
  }
  projectPlanAddDrafts.value[projectId] = created
  return created
}

function initializeProjectDraft(project: Project): void {
  if (projectDrafts.value[project.id]) return
  projectDrafts.value[project.id] = toProjectDraft(project)
  ensureProjectPlanAddDraft(project.id)
}

function initializeTrackerDraft(projectId: string): void {
  if (trackerDrafts.value[projectId]) return
  const trackers = trackerStore.getTrackersByProject(projectId)
  trackerSnapshots.value[projectId] = trackers.map(cloneTracker)
  trackerDrafts.value[projectId] = trackers.map(cloneTrackerDraft)
}

function resetProjectDraft(project: Project): void {
  projectDrafts.value[project.id] = toProjectDraft(project)
  ensureProjectPlanAddDraft(project.id)
}

function resetTrackerDraft(projectId: string): void {
  const trackers = trackerStore.getTrackersByProject(projectId)
  trackerSnapshots.value[projectId] = trackers.map(cloneTracker)
  trackerDrafts.value[projectId] = trackers.map(cloneTrackerDraft)
}

function setKeyResultsEditorRef(
  projectId: string,
  element: Element | ComponentPublicInstance | null
): void {
  keyResultsEditorRefs.value[projectId] = element as InstanceType<typeof KeyResultsEditor> | null
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids))
}

function formatPlanLabel(startDate: string, endDate: string, name?: string): string {
  const base = formatPeriodDateRange(startDate, endDate)
  const trimmed = name?.trim()
  return trimmed ? `${trimmed} (${base})` : base
}

function toPlanChip(plan: PlanLike): PlanChip {
  return {
    id: plan.id,
    label: formatPlanLabel(plan.startDate, plan.endDate, plan.name),
  }
}

function getInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : ''
}

function getTextAreaValue(event: Event): string {
  return event.target instanceof HTMLTextAreaElement ? event.target.value : ''
}

function getSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : ''
}

function updateProjectDraftField<K extends keyof ProjectDraft>(
  projectId: string,
  key: K,
  value: ProjectDraft[K]
): void {
  const existing = projectDrafts.value[projectId]
  if (!existing) return
  projectDrafts.value[projectId] = {
    ...existing,
    [key]: value,
  }
}

function toggleProjectPlanLink(
  projectId: string,
  key: ProjectPlanKey,
  planId: string,
  checked: boolean
): void {
  const draft = projectDrafts.value[projectId]
  if (!draft) return

  const next = new Set(draft[key])
  if (checked) {
    next.add(planId)
  } else {
    next.delete(planId)
  }

  projectDrafts.value[projectId] = {
    ...draft,
    [key]: Array.from(next),
  }
}

function selectedProjectPlans(projectId: string, key: ProjectPlanKey): PlanChip[] {
  const draft = projectDrafts.value[projectId]
  if (!draft) return []

  const selectedIds = draft[key] ?? []
  if (selectedIds.length === 0) return []

  const plans: PlanLike[] = key === 'focusWeekIds' ? weeklyPlans.value : monthlyPlans.value
  const planById = new Map(plans.map((plan) => [plan.id, plan]))

  return selectedIds
    .map((id) => planById.get(id))
    .filter((plan): plan is PlanLike => Boolean(plan))
    .map((plan) => toPlanChip(plan))
}

function availableProjectPlans(projectId: string, key: ProjectPlanKey): PlanChip[] {
  const draft = projectDrafts.value[projectId]
  const selected = new Set(draft?.[key] ?? [])
  const plans: PlanLike[] = key === 'focusWeekIds' ? weeklyPlans.value : monthlyPlans.value

  return plans.filter((plan) => !selected.has(plan.id)).map((plan) => toPlanChip(plan))
}

function getProjectPlanAddSelection(projectId: string, key: ProjectPlanKey): string {
  return ensureProjectPlanAddDraft(projectId)[key]
}

function setProjectPlanAddSelection(projectId: string, key: ProjectPlanKey, planId: string): void {
  const draft = ensureProjectPlanAddDraft(projectId)
  projectPlanAddDrafts.value[projectId] = {
    ...draft,
    [key]: planId,
  }
}

function addProjectPlanLink(projectId: string, key: ProjectPlanKey): void {
  const selectedPlanId = getProjectPlanAddSelection(projectId, key)
  if (!selectedPlanId) return
  toggleProjectPlanLink(projectId, key, selectedPlanId, true)
  setProjectPlanAddSelection(projectId, key, '')
}

function removeProjectPlanLink(projectId: string, key: ProjectPlanKey, planId: string): void {
  toggleProjectPlanLink(projectId, key, planId, false)
}

function isProjectSaving(projectId: string): boolean {
  return savingProjectIds.value.has(projectId)
}

function isTrackerSaving(projectId: string): boolean {
  return savingTrackerIds.value.has(projectId)
}

function isProjectBusy(projectId: string): boolean {
  return isProjectSaving(projectId) || isTrackerSaving(projectId)
}

const deleteProjectMessage = computed(() => {
  if (!projectToDelete.value) return ''
  return `This will permanently delete "${projectToDelete.value.name}" and any linked key results. This cannot be undone.`
})

function openDeleteProjectDialog(projectId: string): void {
  projectToDelete.value = projectStore.getProjectById(projectId) ?? null
  showDeleteProjectDialog.value = Boolean(projectToDelete.value)
}

async function handleConfirmDeleteProject(): Promise<void> {
  const project = projectToDelete.value
  if (!project) return

  savingProjectIds.value.add(project.id)

  try {
    await projectStore.deleteProject(project.id)
    delete projectDrafts.value[project.id]
    delete projectPlanAddDrafts.value[project.id]
    delete trackerDrafts.value[project.id]
    delete trackerSnapshots.value[project.id]
    delete keyResultsEditorRefs.value[project.id]
    showDeleteProjectDialog.value = false
    projectToDelete.value = null
    showSnackbar('Project deleted.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(project.id)
  }
}

const sortedProjects = computed(() => projectStore.sortedProjects)

const monthlyPlans = computed(() =>
  [...monthlyPlanStore.monthlyPlans].sort((a, b) => b.startDate.localeCompare(a.startDate))
)

const weeklyPlans = computed(() =>
  [...weeklyPlanStore.weeklyPlans].sort((a, b) => b.startDate.localeCompare(a.startDate))
)

const allMonthlyEligibleTrackerIds = computed(() =>
  trackerStore.trackers
    .filter(
      (tracker) =>
        tracker.parentType === 'project' &&
        tracker.parentId &&
        tracker.isActive &&
        tracker.cadence === 'monthly'
    )
    .map((tracker) => tracker.id)
)

const allWeeklyEligibleTrackerIds = computed(() =>
  trackerStore.trackers
    .filter(
      (tracker) =>
        tracker.parentType === 'project' &&
        tracker.parentId &&
        tracker.isActive &&
        (tracker.cadence === 'weekly' ||
          tracker.cadence === 'monthly')
    )
    .map((tracker) => tracker.id)
)

function monthlyTrackersForProject(projectId: string): Tracker[] {
  return trackerStore
    .getTrackersByProject(projectId)
    .filter((tracker) => tracker.isActive && tracker.cadence === 'monthly')
}

function weeklyTrackersForProject(projectId: string): Tracker[] {
  return trackerStore
    .getTrackersByProject(projectId)
    .filter(
      (tracker) =>
        tracker.isActive &&
        (tracker.cadence === 'weekly' || tracker.cadence === 'monthly')
    )
}

function selectedPlansForTracker(periodType: 'weekly' | 'monthly', trackerId: string): PlanChip[] {
  const plans: PlanLike[] = periodType === 'weekly' ? weeklyPlans.value : monthlyPlans.value
  return plans
    .filter((plan) => isTrackerLinkedToPlan(periodType, plan.id, trackerId))
    .map((plan) => toPlanChip(plan))
}

function availablePlansForTracker(periodType: 'weekly' | 'monthly', trackerId: string): PlanChip[] {
  const selectedIds = new Set(selectedPlansForTracker(periodType, trackerId).map((plan) => plan.id))
  const plans: PlanLike[] = periodType === 'weekly' ? weeklyPlans.value : monthlyPlans.value
  return plans.filter((plan) => !selectedIds.has(plan.id)).map((plan) => toPlanChip(plan))
}

function resolveSelectedTrackerIds(
  periodType: 'weekly' | 'monthly',
  selectedTrackerIds?: string[]
): string[] {
  return resolvePeriodTrackerSelection({
    selectedTrackerIds,
    eligibleTrackerIds:
      periodType === 'weekly'
        ? allWeeklyEligibleTrackerIds.value
        : allMonthlyEligibleTrackerIds.value,
  }).effectiveSelectedTrackerIds
}

function isTrackerLinkedToPlan(
  periodType: 'weekly' | 'monthly',
  planId: string,
  trackerId: string
): boolean {
  if (periodType === 'weekly') {
    const plan = weeklyPlanStore.getWeeklyPlanById(planId)
    if (!plan) return false
    return resolveSelectedTrackerIds('weekly', plan.selectedTrackerIds).includes(trackerId)
  }

  const plan = monthlyPlanStore.getMonthlyPlanById(planId)
  if (!plan) return false
  return resolveSelectedTrackerIds('monthly', plan.selectedTrackerIds).includes(trackerId)
}

function trackerPlanAddKey(
  periodType: 'weekly' | 'monthly',
  projectId: string,
  trackerId: string
): string {
  return `${periodType}:${projectId}:${trackerId}`
}

function getTrackerPlanAddSelection(
  periodType: 'weekly' | 'monthly',
  projectId: string,
  trackerId: string
): string {
  return trackerPlanAddDrafts.value[trackerPlanAddKey(periodType, projectId, trackerId)] ?? ''
}

function setTrackerPlanAddSelection(
  periodType: 'weekly' | 'monthly',
  projectId: string,
  trackerId: string,
  planId: string
): void {
  trackerPlanAddDrafts.value[trackerPlanAddKey(periodType, projectId, trackerId)] = planId
}

async function saveProjectDraft(projectId: string): Promise<void> {
  const project = projectStore.getProjectById(projectId)
  const draft = projectDrafts.value[projectId]
  if (!project || !draft) return

  savingProjectIds.value.add(projectId)

  try {
    const monthIds = uniqueIds([...draft.monthIds, ...draft.focusMonthIds])
    const updated = await projectStore.updateProject(projectId, {
      name: draft.name.trim(),
      icon: draft.icon,
      status: draft.status,
      objective: draft.objective.trim() || undefined,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      monthIds,
      focusMonthIds: uniqueIds(draft.focusMonthIds),
      focusWeekIds: uniqueIds(draft.focusWeekIds),
    })

    resetProjectDraft(updated)
    showSnackbar(t('planning.projectTracker.saved'))
  } catch (err) {
    const message = err instanceof Error ? err.message : t('planning.projectTracker.saveError')
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

function updateTrackerDraft(projectId: string, trackers: Partial<Tracker>[]): void {
  trackerDrafts.value[projectId] = trackers
}

async function saveProjectTrackers(projectId: string): Promise<void> {
  const editor = keyResultsEditorRefs.value[projectId]
  const isValid = editor?.validate() ?? true
  if (!isValid) return

  const snapshot = trackerSnapshots.value[projectId] ?? []
  const draft = trackerDrafts.value[projectId] ?? []

  savingTrackerIds.value.add(projectId)

  try {
    await trackerStore.reconcileProjectTrackers(projectId, snapshot, draft)
    resetTrackerDraft(projectId)
    showSnackbar('Key results saved.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save key results.'
    showSnackbar(message)
  } finally {
    savingTrackerIds.value.delete(projectId)
  }
}

async function autoLinkProjectToPlan(
  projectId: string,
  periodType: 'weekly' | 'monthly',
  planId: string
): Promise<void> {
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  if (periodType === 'weekly') {
    const nextFocusWeekIds = uniqueIds([...(project.focusWeekIds ?? []), planId])
    if (nextFocusWeekIds.length !== (project.focusWeekIds ?? []).length) {
      const updated = await projectStore.updateProject(project.id, { focusWeekIds: nextFocusWeekIds })
      resetProjectDraft(updated)
    }
    return
  }

  const nextMonthIds = uniqueIds([...(project.monthIds ?? []), planId])
  const nextFocusMonthIds = uniqueIds([...(project.focusMonthIds ?? []), planId])

  const monthIdsChanged = nextMonthIds.length !== (project.monthIds ?? []).length
  const focusMonthChanged = nextFocusMonthIds.length !== (project.focusMonthIds ?? []).length

  if (monthIdsChanged || focusMonthChanged) {
    const updated = await projectStore.updateProject(project.id, {
      monthIds: nextMonthIds,
      focusMonthIds: nextFocusMonthIds,
    })
    resetProjectDraft(updated)
  }
}

async function toggleTrackerForPlan(
  periodType: 'weekly' | 'monthly',
  planId: string,
  projectId: string,
  trackerId: string,
  checked: boolean
): Promise<void> {
  try {
    if (periodType === 'weekly') {
      const plan = weeklyPlanStore.getWeeklyPlanById(planId)
      if (!plan) return

      const next = new Set(resolveSelectedTrackerIds('weekly', plan.selectedTrackerIds))
      if (checked) next.add(trackerId)
      else next.delete(trackerId)

      await weeklyPlanStore.updateWeeklyPlan(plan.id, { selectedTrackerIds: Array.from(next) })
    } else {
      const plan = monthlyPlanStore.getMonthlyPlanById(planId)
      if (!plan) return

      const next = new Set(resolveSelectedTrackerIds('monthly', plan.selectedTrackerIds))
      if (checked) next.add(trackerId)
      else next.delete(trackerId)

      await monthlyPlanStore.updateMonthlyPlan(plan.id, { selectedTrackerIds: Array.from(next) })
    }

    if (checked) {
      await autoLinkProjectToPlan(projectId, periodType, planId)
    }

    showSnackbar('Tracker-period link updated.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update tracker-period link.'
    showSnackbar(message)
  }
}

async function addTrackerPlanLink(
  periodType: 'weekly' | 'monthly',
  projectId: string,
  trackerId: string
): Promise<void> {
  const selectedPlanId = getTrackerPlanAddSelection(periodType, projectId, trackerId)
  if (!selectedPlanId) return
  await toggleTrackerForPlan(periodType, selectedPlanId, projectId, trackerId, true)
  setTrackerPlanAddSelection(periodType, projectId, trackerId, '')
}

async function removeTrackerPlanLink(
  periodType: 'weekly' | 'monthly',
  planId: string,
  projectId: string,
  trackerId: string
): Promise<void> {
  await toggleTrackerForPlan(periodType, planId, projectId, trackerId, false)
}

async function loadData(): Promise<void> {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      projectStore.loadProjects(),
      trackerStore.loadTrackers(),
      weeklyPlanStore.loadWeeklyPlans(),
      monthlyPlanStore.loadMonthlyPlans(),
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(new Date().getFullYear()),
    ])

    for (const project of projectStore.projects) {
      initializeProjectDraft(project)
      initializeTrackerDraft(project.id)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
