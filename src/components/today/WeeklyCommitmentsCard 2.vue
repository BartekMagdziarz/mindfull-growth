<template>
  <AppCard padding="lg" class="w-full max-w-md">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-on-surface flex items-center gap-2">
        <ClipboardDocumentCheckIcon class="w-5 h-5 text-primary" />
        {{ t('today.commitments.title') }}
      </h3>
      <!-- Progress Indicator -->
      <span v-if="commitments.length > 0" class="text-sm text-on-surface-variant">
        {{ t('today.commitments.progress', { done: doneCount, total: commitments.length }) }}
      </span>
    </div>

    <!-- Quick Add -->
    <form class="mb-4" @submit.prevent="handleQuickAdd">
      <label
        for="quick-add-commitment"
        class="block text-xs font-medium text-on-surface-variant mb-2"
      >
        {{ t('today.commitments.quickAddLabel') }}
      </label>
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <input
            ref="quickAddInputRef"
            id="quick-add-commitment"
            v-model="quickAddName"
            type="text"
            :placeholder="t('today.commitments.placeholder')"
            class="neo-input flex-1 px-3 py-2"
            :class="{ 'border-error': quickAddErrorMessage }"
            :disabled="isQuickAddSaving"
          />
          <AppButton
            type="submit"
            variant="tonal"
            class="px-4 py-2 text-sm"
            :disabled="isQuickAddSaving"
          >
            {{ isQuickAddSaving ? t('today.commitments.adding') : t('common.buttons.add') }}
          </AppButton>
        </div>

        <div v-if="quickAddErrorMessage" class="flex items-center justify-end">
          <span class="text-xs text-error">
            {{ quickAddErrorMessage }}
          </span>
        </div>
      </div>
    </form>

    <!-- Commitment List -->
    <div v-if="commitments.length > 0" class="space-y-3">
      <div
        v-for="commitment in sortedCommitments"
        :key="commitment.id"
        class="flex items-start gap-3"
      >
        <!-- Status Button Group -->
        <div class="flex gap-1 flex-shrink-0 pt-0.5">
          <button
            v-for="statusOption in statusOptions"
            :key="statusOption.value"
            type="button"
            :class="[
              'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
              commitment.status === statusOption.value
                ? statusOption.activeClass
                : 'bg-section text-on-surface-variant hover:bg-section-strong',
            ]"
            :aria-label="`Mark as ${statusOption.label}`"
            :title="statusOption.label"
            @click="handleStatusChange(commitment.id, statusOption.value)"
          >
            <component :is="statusOption.icon" class="w-4 h-4" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p
              class="font-medium text-on-surface truncate"
              :class="{ 'line-through opacity-60': commitment.status === 'done' }"
            >
              {{ commitment.name }}
            </p>
          </div>
          <div v-if="getCommitmentLinkSummary(commitment)" class="mt-0.5 text-xs text-on-surface-variant">
            {{ getCommitmentLinkSummary(commitment) }}
          </div>

        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-section flex items-center justify-center">
        <ClipboardDocumentListIcon class="w-6 h-6 text-on-surface-variant" />
      </div>
      <p class="text-on-surface-variant text-sm mb-4">
        {{ t('today.commitments.emptyState') }}
      </p>
      <AppButton v-if="hasWeeklyPlan" variant="tonal" @click="handleQuickAdd">
        {{ t('today.commitments.addCommitment') }}
      </AppButton>
      <AppButton v-else variant="tonal" @click="emit('createWeeklyPlan')">
        {{ t('today.commitments.createWeeklyPlan') }}
      </AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline'
import { CheckCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/solid'
import type { Commitment, Project, CommitmentStatus, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    commitments: Commitment[]
    lifeAreas: LifeArea[]
    priorities: Priority[]
    projects: Project[]
    hasWeeklyPlan?: boolean
    isQuickAddSaving?: boolean
    quickAddError?: string | null
    quickAddSuccessKey?: number
  }>(),
  {
    hasWeeklyPlan: true,
    isQuickAddSaving: false,
    quickAddError: null,
    quickAddSuccessKey: 0,
  }
)

const emit = defineEmits<{
  'statusChange': [commitmentId: string, status: CommitmentStatus]
  'quickAdd': [payload: { name: string }]
  'createWeeklyPlan': []
}>()

const statusOptions = computed(() => [
  {
    value: 'done' as CommitmentStatus,
    label: t('today.commitments.markDone'),
    icon: CheckCircleIcon,
    activeClass: 'bg-success/20 text-success',
  },
  {
    value: 'skipped' as CommitmentStatus,
    label: t('today.commitments.markSkipped'),
    icon: MinusCircleIcon,
    activeClass: 'bg-section text-on-surface-variant',
  },
])

const doneCount = computed(() =>
  props.commitments.filter((c) => c.status === 'done').length
)

const quickAddName = ref('')
const quickAddInputRef = ref<HTMLInputElement | null>(null)
const localQuickAddError = ref('')

const quickAddErrorMessage = computed(() => {
  return localQuickAddError.value || props.quickAddError || ''
})

const sortedCommitments = computed(() => {
  return [...props.commitments].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

function getProject(projectId: string | undefined): Project | undefined {
  if (!projectId) return undefined
  return props.projects.find((p) => p.id === projectId)
}

function getLifeAreaNamesForCommitment(commitment: Commitment): string[] {
  const ids = new Set<string>()
  commitment.lifeAreaIds?.forEach((id) => ids.add(id))

  if (commitment.projectId) {
    const project = getProject(commitment.projectId)
    project?.lifeAreaIds?.forEach((id) => ids.add(id))
  }

  const priorityIds = new Set<string>()
  commitment.priorityIds?.forEach((id) => priorityIds.add(id))
  if (commitment.projectId) {
    const project = getProject(commitment.projectId)
    project?.priorityIds?.forEach((id) => priorityIds.add(id))
  }

  priorityIds.forEach((priorityId) => {
    const priority = props.priorities.find((p) => p.id === priorityId)
    priority?.lifeAreaIds?.forEach((id) => ids.add(id))
  })

  return Array.from(ids)
    .map((id) => props.lifeAreas.find((la) => la.id === id)?.name)
    .filter((name): name is string => Boolean(name))
}

function getPriorityNamesForCommitment(commitment: Commitment): string[] {
  const ids = new Set<string>()
  commitment.priorityIds?.forEach((id) => ids.add(id))
  if (commitment.projectId) {
    const project = getProject(commitment.projectId)
    project?.priorityIds?.forEach((id) => ids.add(id))
  }
  return Array.from(ids)
    .map((id) => props.priorities.find((p) => p.id === id)?.name)
    .filter((name): name is string => Boolean(name))
}

function getCommitmentLinkSummary(commitment: Commitment): string {
  const parts: string[] = []
  const project = getProject(commitment.projectId)
  if (project) {
    parts.push(t('today.commitments.projectLabel', { name: project.name }))
  }
  const lifeAreas = getLifeAreaNamesForCommitment(commitment)
  if (lifeAreas.length > 0) {
    parts.push(t('today.commitments.lifeAreasLabel', { names: lifeAreas.join(', ') }))
  }
  const priorities = getPriorityNamesForCommitment(commitment)
  if (priorities.length > 0) {
    parts.push(t('today.commitments.prioritiesLabel', { names: priorities.join(', ') }))
  }
  return parts.join(' · ')
}

function handleStatusChange(commitmentId: string, status: CommitmentStatus) {
  emit('statusChange', commitmentId, status)
}

function handleQuickAdd() {
  if (props.isQuickAddSaving) return

  const name = quickAddName.value.trim()
  if (!name) {
    localQuickAddError.value = t('today.commitments.nameRequired')
    nextTick(() => quickAddInputRef.value?.focus())
    return
  }

  localQuickAddError.value = ''
  emit('quickAdd', { name })
}

watch(
  () => props.quickAddSuccessKey,
  () => {
    quickAddName.value = ''
    localQuickAddError.value = ''
    nextTick(() => quickAddInputRef.value?.focus())
  }
)

watch(quickAddName, (value) => {
  if (localQuickAddError.value && value.trim()) {
    localQuickAddError.value = ''
  }
})

</script>
