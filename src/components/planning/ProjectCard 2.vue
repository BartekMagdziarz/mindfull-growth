<template>
  <AppCard class="neo-card neo-card--commitment relative h-full overflow-hidden group">
    <div class="px-3 py-3 flex h-full flex-col gap-2.5">
      <!-- Row 1: Icon + Title (up to 2 lines) -->
      <div class="flex items-center gap-1.5">
        <IconPicker
          :model-value="project.icon"
          compact
          minimal
          :disabled="isSaving"
          aria-label="Select project icon"
          class="flex-shrink-0"
          @update:model-value="handleIconUpdate"
        />
        <InlineEditableText
          :model-value="project.name"
          :disabled="isSaving"
          :is-saving="isSaving"
          text-class="block text-lg font-semibold leading-snug text-on-surface line-clamp-2"
          input-class="text-lg font-semibold"
          aria-label="Edit project name"
          @save="handleNameSave"
        />
      </div>

      <!-- Row 2: Status + Actions Menu + Linked Objects + Date -->
      <div class="flex items-center gap-1.5">
        <AnimatedStatusPicker
          :current-status="project.status"
          :options="statusOptions"
          :disabled="isSaving"
          class="flex-shrink-0"
          @change="handleStatusChange"
        />

        <CommitmentActionsMenu
          :add-categories="linkCategories"
          :add-items-by-category="linkItemsByCategory"
          :removable-links="removableLinks"
          :disabled="isSaving"
          :delete-label="t('planning.components.projectCard.deleteProject')"
          trigger-aria-label="Open project actions"
          class="flex-shrink-0"
          @add-link="handleAddLink"
          @remove-link="handleRemoveLink"
          @delete="handleDelete"
        />

        <CommitmentLinkedObjectsCluster
          :life-areas="explicitLifeAreas"
          :priorities="explicitPriorities"
          :derived-life-areas="derivedLifeAreas"
          :show-backdrop="false"
          :disabled="isSaving"
        />

        <div class="flex-1" />

        <InlineDateRangeEditor
          :start-date="project.startDate"
          :end-date="project.endDate"
          :disabled="isSaving"
          class="flex-shrink-0"
          @update:dates="handleDatesUpdate"
        />
      </div>

      <div class="neo-surface p-3 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.components.projectCard.objective') }}
          </span>
          <button
            v-if="showObjectiveExpandControl"
            type="button"
            class="neo-pill neo-focus px-2.5 py-1 text-xs font-medium"
            @click="isObjectiveExpanded = !isObjectiveExpanded"
          >
            {{ isObjectiveExpanded ? t('planning.components.projectCard.collapse') : t('planning.components.projectCard.expand') }}
          </button>
        </div>
        <InlineEditableText
          :model-value="project.objective || ''"
          :disabled="isSaving"
          :is-saving="isSaving"
          :text-class="objectiveTextClass"
          input-class="text-sm"
          :placeholder="t('planning.components.projectCard.addObjective')"
          aria-label="Edit project objective"
          :allow-empty="true"
          :multiline="true"
          :rows="3"
          @save="handleObjectiveSave"
        />
      </div>

      <div class="neo-surface p-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.components.projectCard.keyResults') }}
          </span>
          <button
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded-full
                   text-on-surface-variant hover:bg-section hover:text-primary transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isSaving"
            aria-label="Key results options"
            @click="toggleKREditor"
          >
            <EllipsisHorizontalIcon class="h-4 w-4" />
          </button>
        </div>

        <div v-if="isKeyResultLoading" class="text-xs text-on-surface-variant">
          {{ t('planning.components.projectCard.loadingKeyResults') }}
        </div>

        <div v-if="showKREditor" class="neo-surface p-3">
          <KeyResultsEditor
            ref="keyResultsEditorRef"
            :model-value="editableTrackers"
            @update:modelValue="handleTrackersChange"
          />
          <div class="flex justify-end mt-2">
            <button
              type="button"
              class="neo-pill neo-pill--success neo-focus px-3 py-1.5 text-xs font-medium"
              :disabled="isSaving"
              @click="saveTrackers"
            >
              {{ t('planning.components.projectCard.saveKeyResults') }}
            </button>
          </div>
          <p v-if="krEditorError" class="mt-2 text-xs text-error">{{ krEditorError }}</p>
        </div>

        <div v-else-if="keyResultError" class="text-xs text-error">
          {{ keyResultError }}
        </div>

        <div v-else-if="displayableTrackers.length" class="space-y-3">
          <div
            v-for="kr in displayableTrackers"
            :key="kr.id"
            class="neo-inset rounded-xl p-3"
          >
            <TrackerProgressRow
              :title="kr.name"
              :type="kr.type"
              :current-progress="{
                summary: keyResultProgress[kr.id]?.summary || t('planning.components.trackerProgressRow.noData'),
                percent: keyResultProgress[kr.id]?.percent ?? null,
                numerator: keyResultProgress[kr.id]?.numerator,
                denominator: keyResultProgress[kr.id]?.denominator,
                value: keyResultProgress[kr.id]?.value ?? keyResultProgress[kr.id]?.average,
              }"
              :trend-data="keyResultTrend[kr.id] || []"
              :tracker="kr"
              :start-date="getCurrentRangeForCadence(kr.cadence).startDate"
              :end-date="getCurrentRangeForCadence(kr.cadence).endDate"
              @logged="handleTrackerLogged"
            />
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, watch, onMounted, h } from 'vue'
import { CheckCircleIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'
import { EllipsisHorizontalIcon } from '@heroicons/vue/20/solid'
import { useT } from '@/composables/useT'

const { t } = useT()

const CircleOutlineIcon = markRaw({
  render() {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      'stroke-width': '1.5',
      stroke: 'currentColor',
    }, [h('circle', { cx: '12', cy: '12', r: '9' })])
  },
})
import AppCard from '@/components/AppCard.vue'
import InlineEditableText from './InlineEditableText.vue'
import AnimatedStatusPicker from './AnimatedStatusPicker.vue'
import CommitmentActionsMenu from './CommitmentActionsMenu.vue'
import CommitmentLinkedObjectsCluster from './CommitmentLinkedObjectsCluster.vue'
import InlineDateRangeEditor from './InlineDateRangeEditor.vue'
import TrackerProgressRow from './TrackerProgressRow.vue'
import KeyResultsEditor from './KeyResultsEditor.vue'
import IconPicker from './IconPicker.vue'
import { useTrackerStore } from '@/stores/tracker.store'
import { computeTrackerProgressDirect, resolveProjectTrendRanges, type TrackerProgressSummary } from '@/services/trackerRollup.service'
import type { Project, ProjectStatus, Priority, Tracker } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import {
  formatPeriodDateRangeNoYear,
  getMonthRange,
  getWeekRange,
  parseLocalISODate,
  toLocalISODateString,
  type IsoDateRange,
} from '@/utils/periodUtils'

const props = withDefaults(
  defineProps<{
    project: Project
    availableLifeAreas?: LifeArea[]
    availablePriorities?: Priority[]
    isSaving?: boolean
    progressRefreshKey?: number
    detailsOpenByDefault?: boolean
  }>(),
  {
    isSaving: false,
    availableLifeAreas: () => [],
    availablePriorities: () => [],
    progressRefreshKey: 0,
    detailsOpenByDefault: false,
  }
)

const emit = defineEmits<{
  delete: [projectId: string]
  'status-change': [projectId: string, status: ProjectStatus]
  updateName: [projectId: string, name: string]
  'update-icon': [projectId: string, icon: string | undefined]
  'update-life-areas': [projectId: string, lifeAreaIds: string[]]
  'update-priorities': [projectId: string, priorityIds: string[]]
  'update-objective': [projectId: string, objective: string | undefined]
  'update-trackers': [projectId: string, trackers: Partial<Tracker>[]]
  'update-dates': [projectId: string, startDate: string | undefined, endDate: string | undefined]
}>()

const statusOptions = computed(() => [
  {
    value: 'planned',
    label: t('planning.common.status.planned'),
    icon: CircleOutlineIcon,
    activeClass: 'text-primary',
    badgeClass: 'bg-primary-soft text-primary-strong border-primary/20',
    dotClass: 'bg-primary/70',
  },
  {
    value: 'active',
    label: t('planning.common.status.active'),
    icon: markRaw(PlayCircleIcon),
    activeClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'paused',
    label: t('planning.common.status.paused'),
    icon: markRaw(PauseCircleIcon),
    activeClass: 'text-on-surface-variant',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-on-surface-variant/70',
  },
  {
    value: 'completed',
    label: t('planning.common.status.done'),
    icon: markRaw(CheckCircleIcon),
    activeClass: 'text-primary',
    badgeClass: 'bg-gradient-to-r from-primary to-primary-strong text-on-primary border-primary/20',
    dotClass: 'bg-primary/70',
  },
  {
    value: 'abandoned',
    label: t('planning.common.status.dropped'),
    icon: markRaw(XCircleIcon),
    activeClass: 'text-on-surface-variant',
    badgeClass: 'bg-surface text-on-surface-variant border-outline/30',
    dotClass: 'bg-on-surface-variant/70',
  },
])

const trackerStore = useTrackerStore()

const showKREditor = ref(false)
const editableTrackers = ref<Partial<Tracker>[]>([])
const snapshotTrackersAtOpen = ref<Tracker[]>([])
const keyResultsEditorRef = ref<InstanceType<typeof KeyResultsEditor> | null>(null)
const krEditorError = ref('')
const isObjectiveExpanded = ref(false)

const lifeAreaById = computed(() =>
  new Map(props.availableLifeAreas.map((la) => [la.id, la]))
)
const priorityById = computed(() =>
  new Map(props.availablePriorities.map((p) => [p.id, p]))
)

const explicitLifeAreas = computed(() =>
  props.project.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const explicitPriorities = computed(() =>
  props.project.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedLifeAreas = computed(() => {
  const derivedIds = new Set<string>()
  for (const priorityId of props.project.priorityIds) {
    const priority = priorityById.value.get(priorityId)
    priority?.lifeAreaIds?.forEach((id) => derivedIds.add(id))
  }
  props.project.lifeAreaIds.forEach((id) => derivedIds.delete(id))
  return Array.from(derivedIds)
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
})

const accentColor = computed(() => {
  const preferred = explicitLifeAreas.value[0] || derivedLifeAreas.value[0]
  return preferred?.color || 'rgb(var(--color-primary))'
})

const trackers = computed(() => trackerStore.getTrackersByProject(props.project.id))
const hasTrackers = computed(() => trackers.value.length > 0)
const displayableTrackers = computed(() => trackers.value.filter((t) => t.type !== 'checkin'))

const keyResultProgress = ref<Record<string, TrackerProgressSummary>>({})
const keyResultTrend = ref<
  Record<string, Array<{ startDate: string; label: string; percent: number | null; summary: string; value?: number; numerator?: number; denominator?: number }>>
>({})
const isKeyResultLoading = ref(false)
const keyResultError = ref('')
const projectDateRange = ref<string | null>(null)

const showObjectiveExpandControl = computed(() => {
  const objective = props.project.objective?.trim() || ''
  return objective.length > 110 || objective.includes('\n')
})

const objectiveTextClass = computed(() =>
  [
    'text-sm text-on-surface-variant whitespace-pre-line break-words',
    !isObjectiveExpanded.value && showObjectiveExpandControl.value ? 'line-clamp-2' : '',
  ]
    .filter(Boolean)
    .join(' ')
)

let keyResultLoadToken = 0

function getCurrentRangeForCadence(cadence: Tracker['cadence']): IsoDateRange {
  if (cadence === 'monthly') {
    const range = getMonthRange(new Date())
    return {
      startDate: toLocalISODateString(range.start),
      endDate: toLocalISODateString(range.end),
    }
  }

  const range = getWeekRange(new Date())
  return {
    startDate: toLocalISODateString(range.start),
    endDate: toLocalISODateString(range.end),
  }
}

function getTrendLabel(cadence: Tracker['cadence'], startDate: string, endDate: string): string {
  if (cadence === 'monthly') {
    return parseLocalISODate(startDate).toLocaleDateString('en-US', { month: 'short' })
  }
  return formatPeriodDateRangeNoYear(startDate, endDate)
}

async function loadTrackerProgress() {
  const token = ++keyResultLoadToken
  const trackersSnapshot = trackers.value.map((tracker) => ({
    ...tracker,
    lifeAreaIds: [...tracker.lifeAreaIds],
    priorityIds: [...tracker.priorityIds],
    tickLabels: tracker.tickLabels ? [...tracker.tickLabels] : undefined,
  }))

  if (trackersSnapshot.length === 0) {
    keyResultProgress.value = {}
    keyResultTrend.value = {}
    keyResultError.value = ''
    projectDateRange.value = null
    isKeyResultLoading.value = false
    return
  }

  isKeyResultLoading.value = true
  keyResultError.value = ''

  try {
    // Resolve trend ranges per tracker (weekly focus can differ by selectedTrackerIds).
    const trendRangeByTrackerId = new Map<string, IsoDateRange[]>()
    let resolvedDateLabel: string | null = null

    for (const tracker of trackersSnapshot) {
      const result = await resolveProjectTrendRanges(props.project, tracker.cadence, {
        trackerId: tracker.id,
      })
      trendRangeByTrackerId.set(tracker.id, result.ranges)
      if (!resolvedDateLabel && result.dateRangeLabel) {
        resolvedDateLabel = result.dateRangeLabel
      }
    }

    if (token !== keyResultLoadToken) return
    projectDateRange.value = resolvedDateLabel

    const progressList = await Promise.all(
      trackersSnapshot.map(async (tracker) => {
        const currentRange = getCurrentRangeForCadence(tracker.cadence)
        const previousRanges = trendRangeByTrackerId.get(tracker.id) ?? []
        const [currentProgress, ...previousProgress] = await Promise.all([
          computeTrackerProgressDirect(tracker, currentRange),
          ...previousRanges.map((range) => computeTrackerProgressDirect(tracker, range)),
        ])

        return {
          trackerId: tracker.id,
          currentProgress,
          trend: previousRanges.map((range, index) => {
            const progress = previousProgress[index]
            return {
              startDate: range.startDate,
              label: getTrendLabel(tracker.cadence, range.startDate, range.endDate),
              percent: progress?.percent ?? null,
              summary: progress?.summary ?? t('planning.components.trackerProgressRow.noData'),
              value: progress?.value,
              numerator: progress?.numerator,
              denominator: progress?.denominator,
            }
          }),
        }
      })
    )

    if (token !== keyResultLoadToken) return

    const map: Record<string, TrackerProgressSummary> = {}
    const trendMap: Record<
      string,
      Array<{ startDate: string; label: string; percent: number | null; summary: string; value?: number; numerator?: number; denominator?: number }>
    > = {}
    progressList.forEach((progress) => {
      if (progress.currentProgress) {
        map[progress.trackerId] = progress.currentProgress
      }
      trendMap[progress.trackerId] = progress.trend
    })
    keyResultProgress.value = map
    keyResultTrend.value = trendMap
  } catch (error) {
    if (token !== keyResultLoadToken) return
    keyResultError.value =
      error instanceof Error ? error.message : 'Failed to load tracker progress.'
  } finally {
    if (token === keyResultLoadToken) {
      isKeyResultLoading.value = false
    }
  }
}

const linkCategories = computed(() => [
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
  { id: 'priority', label: t('planning.common.entities.priority') },
])

const linkItemsByCategory = computed(() => {
  const lifeAreaOptions = props.availableLifeAreas
    .filter((la) => !props.project.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))

  const priorityOptions = props.availablePriorities
    .filter((p) => !props.project.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const removableLinks = computed(() => {
  const links: Array<{ id: string; label: string; icon?: string; color?: string; category: 'lifeArea' | 'priority' }> = []
  for (const la of explicitLifeAreas.value) {
    links.push({
      category: 'lifeArea',
      id: la.id,
      label: la.name,
      icon: la.icon,
      color: la.color,
    })
  }
  for (const p of explicitPriorities.value) {
    links.push({
      category: 'priority',
      id: p.id,
      label: p.name,
      icon: p.icon,
    })
  }
  return links
})

function handleStatusChange(status: string) {
  if (status !== props.project.status) {
    emit('status-change', props.project.id, status as ProjectStatus)
  }
}

function handleDelete() {
  emit('delete', props.project.id)
}

function handleNameSave(name: string) {
  if (name.trim() && name.trim() !== props.project.name) {
    emit('updateName', props.project.id, name.trim())
  }
}

function handleIconUpdate(icon: string | undefined) {
  if (icon !== props.project.icon) {
    emit('update-icon', props.project.id, icon)
  }
}

function handleObjectiveSave(objective: string) {
  const next = objective.trim()
  const current = props.project.objective?.trim() || ''
  if (next === current) return
  emit('update-objective', props.project.id, next || undefined)
}

function handleTrackersChange(updated: Partial<Tracker>[]) {
  editableTrackers.value = updated
}

function cloneTrackerForEditor(tracker: Tracker): Partial<Tracker> {
  return {
    ...tracker,
    lifeAreaIds: [...tracker.lifeAreaIds],
    priorityIds: [...tracker.priorityIds],
    tickLabels: tracker.tickLabels ? [...tracker.tickLabels] : undefined,
  }
}

function initializeTrackerEditor() {
  const snapshot = trackers.value.map((tracker) => ({
    ...tracker,
    lifeAreaIds: [...tracker.lifeAreaIds],
    priorityIds: [...tracker.priorityIds],
    tickLabels: tracker.tickLabels ? [...tracker.tickLabels] : undefined,
  }))
  snapshotTrackersAtOpen.value = snapshot
  editableTrackers.value = snapshot.map(cloneTrackerForEditor)
  krEditorError.value = ''
}

function closeKREditor() {
  showKREditor.value = false
  krEditorError.value = ''
}

function toggleKREditor() {
  if (showKREditor.value) {
    closeKREditor()
    return
  }
  initializeTrackerEditor()
  showKREditor.value = true
}

async function saveTrackers() {
  const isValid = keyResultsEditorRef.value?.validate() ?? true
  if (!isValid) return

  if (snapshotTrackersAtOpen.value.length > 0 && editableTrackers.value.length === 0) {
    const confirmed = window.confirm(
      'This will delete all existing Key Results for this project. Continue?'
    )
    if (!confirmed) {
      return
    }
  }

  krEditorError.value = ''

  try {
    await trackerStore.reconcileProjectTrackers(
      props.project.id,
      snapshotTrackersAtOpen.value,
      editableTrackers.value
    )
    closeKREditor()
    await loadTrackerProgress()
  } catch (error) {
    krEditorError.value =
      error instanceof Error ? error.message : t('planning.projectTracker.saveError')
  }
}

function handleTrackerLogged(_trackerId: string) {
  void loadTrackerProgress()
}

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    emit('update-life-areas', props.project.id, [...props.project.lifeAreaIds, payload.itemId])
  }
  if (payload.category === 'priority') {
    emit('update-priorities', props.project.id, [...props.project.priorityIds, payload.itemId])
  }
}

function handleRemoveLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    handleRemoveLifeArea(payload.itemId)
  }
  if (payload.category === 'priority') {
    handleRemovePriority(payload.itemId)
  }
}

function handleDatesUpdate(startDate: string | undefined, endDate: string | undefined) {
  emit('update-dates', props.project.id, startDate, endDate)
}

function handleRemoveLifeArea(lifeAreaId: string) {
  emit(
    'update-life-areas',
    props.project.id,
    props.project.lifeAreaIds.filter((id) => id !== lifeAreaId)
  )
}

function handleRemovePriority(priorityId: string) {
  emit(
    'update-priorities',
    props.project.id,
    props.project.priorityIds.filter((id) => id !== priorityId)
  )
}

// Sync editable trackers when tracker store changes
watch(
  trackers,
  (newTrackers) => {
    if (!showKREditor.value) {
      editableTrackers.value = newTrackers.map(cloneTrackerForEditor)
    }
  },
  { immediate: true }
)

watch(
  trackers,
  () => {
    void loadTrackerProgress()
  },
  { deep: true }
)

watch(
  () => `${props.project.id}:${(props.project.monthIds ?? []).join('|')}`,
  () => {
    void loadTrackerProgress()
  }
)

watch(
  () => props.progressRefreshKey,
  () => {
    void loadTrackerProgress()
  }
)

onMounted(async () => {
  await loadTrackerProgress()
})
</script>
