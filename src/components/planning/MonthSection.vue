<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <AppCard v-if="isLoading">
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
          <span>{{ t('planning.components.monthSection.loading') }}</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="error">
      <div class="text-center py-6">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">Try Again</AppButton>
      </div>
    </AppCard>

    <!-- Empty State -->
    <AppCard v-else-if="sortedProjects.length === 0 && !isCreatingProject">
      <div class="text-center py-8">
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <RocketLaunchIcon class="w-8 h-8 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-on-surface mb-2">
          {{ t('planning.components.monthSection.emptyTitle') }}
        </h3>
        <p class="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto">
          Create your first project for {{ monthLabel }}. Use Add Project to
          capture your ideas and update statuses with quick actions as you go.
        </p>
        <div class="flex flex-col gap-3 items-center">
          <AppButton variant="filled" @click="openProjectComposer">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('planning.components.monthSection.addProject') }}
          </AppButton>
          <AppButton variant="tonal" @click="startMonthlyPlanning">
            {{ hasPlan ? t('planning.components.monthSection.editPlan') : t('planning.components.monthSection.startPlanning') }}
          </AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Header Card (when projects exist) -->
    <AppCard v-if="!isLoading && !error && sortedProjects.length > 0">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-on-surface">{{ monthLabel }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ projectCountText }}
          </p>
        </div>

        <!-- Status Badge -->
        <div class="flex items-center gap-2">
          <!-- Reflection Complete Badge -->
          <span
            v-if="hasReflection"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success"
          >
            <CheckCircleIcon class="w-3.5 h-3.5" />
            {{ t('planning.components.monthSection.reflected') }}
          </span>
          <span
            class="px-3 py-1 rounded-full text-xs font-medium bg-section text-on-surface-variant"
          >
            {{ hasPlan ? t('planning.components.monthSection.planReady') : t('planning.components.monthSection.noPlanYet') }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <AppButton variant="tonal" @click="startMonthlyPlanning">
          {{ hasPlan ? t('planning.components.monthSection.editPlan') : t('planning.components.monthSection.startPlanning') }}
        </AppButton>
        <!-- Reflection CTA -->
        <AppButton
          v-if="hasPlan"
          :variant="hasReflection ? 'text' : 'tonal'"
          @click="startReflection"
        >
          <ClipboardDocumentCheckIcon class="w-4 h-4 mr-2" />
          {{ hasReflection ? t('planning.components.monthSection.viewReflection') : t('planning.components.monthSection.startReflection') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Projects List -->
    <template v-if="!isLoading && !error && (sortedProjects.length > 0 || isCreatingProject)">
      <!-- Add Project Button (when list has items) -->
      <div v-if="!isCreatingProject" class="flex justify-end">
        <AppButton variant="tonal" @click="openProjectComposer">
          <PlusIcon class="w-4 h-4 mr-2" />
          {{ t('planning.components.monthSection.addProject') }}
        </AppButton>
      </div>

      <ProjectComposerCard
        v-if="isCreatingProject"
        :available-life-areas="availableLifeAreas"
        :available-priorities="allPriorities"
        :is-saving="isCreatingProjectSaving"
        @create="handleProjectCreate"
        @cancel="closeProjectComposer"
      />

      <!-- Project Cards -->
      <ProjectCard
        v-for="project in sortedProjects"
        :key="project.id"
        :project="project"
        :available-life-areas="availableLifeAreas"
        :available-priorities="allPriorities"
        :is-saving="isProjectSaving(project.id)"
        @delete="openDeleteProjectDialog"
        @status-change="handleStatusChange"
        @update-name="handleProjectNameUpdate"
        @update-icon="handleProjectIconUpdate"
        @update-life-areas="handleProjectLifeAreasUpdate"
        @update-priorities="handleProjectPrioritiesUpdate"
        @update-objective="handleProjectObjectiveUpdate"
        @update-dates="handleProjectDatesUpdate"
      />
    </template>

    <!-- Delete Project Confirmation Dialog -->
    <AppDialog
      v-model="showDeleteProjectDialog"
      :title="t('planning.components.monthSection.deleteProject')"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PlusIcon, RocketLaunchIcon, CheckCircleIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import ProjectCard from './ProjectCard.vue'
import ProjectComposerCard from './ProjectComposerCard.vue'
import { useT } from '@/composables/useT'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { getCurrentYear, getDefaultPeriodName } from '@/utils/periodUtils'
import type { Project, ProjectStatus } from '@/domain/planning'

// ============================================================================
// Router
// ============================================================================

const { t } = useT()
const router = useRouter()

// ============================================================================
// Stores and Data
// ============================================================================

const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const monthlyPlanStore = useMonthlyPlanStore()
const monthlyReflectionStore = useMonthlyReflectionStore()
const trackerStore = useTrackerStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const currentYear = getCurrentYear()

// ============================================================================
// Computed State
// ============================================================================

const isLoading = computed(
  () =>
    projectStore.isLoading ||
    trackerStore.isLoading ||
    lifeAreaStore.isLoading ||
    priorityStore.isLoading ||
    monthlyPlanStore.isLoading
)
const error = computed(
  () =>
    projectStore.error ||
    trackerStore.error ||
    lifeAreaStore.error ||
    priorityStore.error ||
    monthlyPlanStore.error
)

// Get the current monthly plan (the one where today falls within startDate-endDate)
const currentMonthlyPlan = computed(() => {
  const plans = monthlyPlanStore.getCurrentMonthPlans
  return plans.length > 0 ? plans[0] : undefined
})

const hasPlan = computed(() => !!currentMonthlyPlan.value)

// Check if reflection exists for the current monthly plan
const hasReflection = computed(() => {
  if (!currentMonthlyPlan.value) return false
  const reflection = monthlyReflectionStore.getReflectionByPlanId(currentMonthlyPlan.value.id)
  return Boolean(reflection?.completedAt)
})

// Month label - use plan name or default period name
const monthLabel = computed(() => {
  if (currentMonthlyPlan.value?.name) {
    return currentMonthlyPlan.value.name
  }
  if (currentMonthlyPlan.value) {
    return getDefaultPeriodName(currentMonthlyPlan.value.startDate, currentMonthlyPlan.value.endDate, 'monthly')
  }
  // Fallback for when no plan exists
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return getDefaultPeriodName(startDate, endDate, 'monthly')
})

// Get projects linked to the current monthly plan
const projects = computed(() => {
  if (!currentMonthlyPlan.value) return []
  return projectStore.getProjectsByMonthId(currentMonthlyPlan.value.id)
})

// Sort by status priority: active > planned > paused > completed > abandoned
const statusPriority: Record<ProjectStatus, number> = {
  active: 0,
  planned: 1,
  paused: 2,
  completed: 3,
  abandoned: 4,
}

const sortedProjects = computed(() =>
  [...projects.value].sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff
    return b.createdAt.localeCompare(a.createdAt)
  })
)

const projectCountText = computed(() => {
  const count = projects.value.length
  return count === 1
    ? t('planning.components.monthSection.projectCount', { count: 1 }).split(' | ')[0]
    : t('planning.components.monthSection.projectCount', { count }).split(' | ')[1] || `${count} projects`
})

const availableLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const allPriorities = computed(() => priorityStore.getPrioritiesByYear(currentYear))

const savingProjectIds = ref(new Set<string>())

function isProjectSaving(id: string) {
  return savingProjectIds.value.has(id)
}

function showSnackbar(message: string) {
  snackbarRef.value?.show(message)
}

// ============================================================================
// Helper Functions
// ============================================================================

// no-op helpers removed (links handled directly in ProjectCard)

// ============================================================================
// Project Composer State
// ============================================================================

const isCreatingProject = ref(false)
const isCreatingProjectSaving = ref(false)

function openProjectComposer() {
  if (!currentMonthlyPlan.value) {
    showSnackbar('Please create a monthly plan before adding projects.')
    return
  }
  isCreatingProject.value = true
}

function closeProjectComposer() {
  isCreatingProject.value = false
}

async function handleProjectCreate(payload: {
  name: string
  icon?: string
  lifeAreaIds: string[]
  priorityIds: string[]
  objective?: string
  startDate?: string
  endDate?: string
}) {
  if (!currentMonthlyPlan.value || isCreatingProjectSaving.value) return

  isCreatingProjectSaving.value = true
  try {
    await projectStore.createProject({
      name: payload.name.trim(),
      icon: payload.icon,
      lifeAreaIds: payload.lifeAreaIds,
      priorityIds: payload.priorityIds,
      objective: payload.objective?.trim() || undefined,
      startDate: payload.startDate || undefined,
      endDate: payload.endDate || undefined,
      status: 'planned',
      monthIds: [currentMonthlyPlan.value.id],
      focusMonthIds: [currentMonthlyPlan.value.id],
      focusWeekIds: [],
    })
    isCreatingProject.value = false
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project.'
    showSnackbar(message)
  } finally {
    isCreatingProjectSaving.value = false
  }
}

// ============================================================================
// Project Delete State
// ============================================================================

const showDeleteProjectDialog = ref(false)
const projectToDelete = ref<Project | undefined>(undefined)

const deleteProjectMessage = computed(() => {
  if (!projectToDelete.value) return ''
  return `Are you sure you want to delete "${projectToDelete.value.name}"? This cannot be undone.`
})

function openDeleteProjectDialog(projectId: string) {
  projectToDelete.value = projectStore.getProjectById(projectId)
  showDeleteProjectDialog.value = true
}

async function handleConfirmDeleteProject() {
  if (!projectToDelete.value) return

  try {
    await projectStore.deleteProject(projectToDelete.value.id)
    showDeleteProjectDialog.value = false
    projectToDelete.value = undefined
  } catch {
    // Error is handled by store
  }
}

// ============================================================================
// Status Change Handler
// ============================================================================

async function handleStatusChange(projectId: string, status: ProjectStatus) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.status = status
  if (status === 'completed' || status === 'abandoned') {
    project.completedAt = new Date().toISOString()
  } else {
    project.completedAt = undefined
  }
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProjectStatus(projectId, status)
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project status.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectNameUpdate(projectId: string, name: string) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  Object.assign(project, { name })
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { name })
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectIconUpdate(projectId: string, icon: string | undefined) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.icon = icon
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { icon })
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectLifeAreasUpdate(projectId: string, lifeAreaIds: string[]) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.lifeAreaIds = lifeAreaIds
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { lifeAreaIds })
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectPrioritiesUpdate(projectId: string, priorityIds: string[]) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.priorityIds = priorityIds
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { priorityIds })
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectObjectiveUpdate(projectId: string, objective?: string) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.objective = objective
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { objective })
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectDatesUpdate(projectId: string, startDate: string | undefined, endDate: string | undefined) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.startDate = startDate
  project.endDate = endDate
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { startDate, endDate })
  } catch (error) {
    Object.assign(project, previous)
    const message =
      error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  await Promise.all([
    monthlyPlanStore.loadMonthlyPlans(),
    lifeAreaStore.loadLifeAreas(),
    priorityStore.loadPriorities(currentYear),
    monthlyReflectionStore.loadMonthlyReflections(),
    trackerStore.loadTrackers(),
  ])

  // After loading plans, load projects for the current monthly plan
  if (currentMonthlyPlan.value) {
    await projectStore.loadProjects({ monthId: currentMonthlyPlan.value.id })
  }
}

// ============================================================================
// Monthly Planning Navigation
// ============================================================================

function startMonthlyPlanning() {
  if (hasPlan.value && currentMonthlyPlan.value) {
    router.push(`/planning/month/${currentMonthlyPlan.value.id}`)
  } else {
    router.push('/planning/month/new')
  }
}

function startReflection() {
  if (currentMonthlyPlan.value) {
    router.push(`/planning/month/${currentMonthlyPlan.value.id}/reflect`)
  }
}

onMounted(() => {
  loadData()
})
</script>
