<template>
  <div class="space-y-2">
    <div
      v-if="compactSummary"
      class="neo-surface px-3 py-2"
    >
      <template v-if="compactSummaryMode === 'pills'">
        <div v-if="visibleCompactSummaryPills.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="pill in visibleCompactSummaryPills"
            :key="pill.key"
            :class="[
              'neo-pill inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium',
              pill.kind === 'priority'
                ? 'border-primary/20 bg-primary-soft/70 text-primary-strong'
                : pill.kind === 'project'
                  ? 'border-outline/22 bg-section/55 text-on-surface-variant'
                  : 'text-on-surface',
            ]"
          >
            <EntityIcon
              v-if="pill.icon"
              :icon="pill.icon"
              :color="pill.color"
              size="xs"
            />
            <span
              v-else-if="pill.color"
              class="h-1.5 w-1.5 rounded-full"
              :style="{ backgroundColor: pill.color }"
            />
            <span class="max-w-[11rem] truncate">{{ pill.label }}</span>
          </span>
          <span
            v-if="hiddenCompactSummaryPillCount > 0"
            class="neo-pill inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-on-surface-variant"
          >
            +{{ hiddenCompactSummaryPillCount }}
          </span>
        </div>
        <p v-else class="text-xs text-on-surface-variant">{{ t('planning.common.links.noLinksYet') }}</p>
      </template>
      <p v-else class="text-xs text-on-surface truncate" :title="summaryText">
        {{ summaryText }}
      </p>
    </div>

      <button
        v-if="compactSummary && collapsible"
        type="button"
        :class="[
          iconOnlyToggle
            ? `neo-icon-button neo-focus flex h-8 w-8 items-center justify-center p-0 ${isExpanded ? 'neo-icon-button--primary' : ''}`
            : 'neo-pill neo-focus gap-1 px-2.5 py-1 text-xs font-medium',
        ]"
        :disabled="disabled"
        :aria-label="isExpanded ? effectiveExpandedLabel : effectiveCollapsedLabel"
      :title="isExpanded ? effectiveExpandedLabel : effectiveCollapsedLabel"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span v-if="!iconOnlyToggle">{{ isExpanded ? effectiveExpandedLabel : effectiveCollapsedLabel }}</span>
      <span v-else class="sr-only">{{ isExpanded ? effectiveExpandedLabel : effectiveCollapsedLabel }}</span>
      <ChevronDownIcon class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': isExpanded }" />
    </button>

    <div v-if="!compactSummary || !collapsible || isExpanded" class="space-y-2.5">
      <!-- Project section (only if showProject && project exists) -->
      <div v-if="showProject && project" class="space-y-1">
        <p class="text-[11px] font-medium text-on-surface-variant">{{ t('planning.components.linkedObjectsSection.project') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <LinkedPill
            :label="project.name"
            :icon="project.icon"
            :editable="editable"
            :disabled="disabled"
            @remove="$emit('remove-project')"
          />
        </div>
      </div>

      <!-- Life Areas section (only if any linked OR derived exist) -->
      <div v-if="allLifeAreas.length > 0" class="space-y-1">
        <p class="text-[11px] font-medium text-on-surface-variant">{{ t('planning.components.linkedObjectsSection.lifeAreas') }}</p>
        <TransitionGroup
          tag="div"
          class="flex flex-wrap gap-1.5"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-90"
        >
          <LinkedPill
            v-for="la in lifeAreas"
            :key="la.id"
            :label="la.name"
            :icon="la.icon"
            :color="la.color"
            :editable="editable"
            :disabled="disabled"
            @remove="$emit('remove-life-area', la.id)"
          />
          <DerivedPill
            v-for="la in effectiveDerivedLifeAreas"
            :key="'d-' + la.id"
            :label="la.name"
            :icon="la.icon"
            :color="la.color"
          />
        </TransitionGroup>
      </div>

      <!-- Priorities section (only if any linked OR derived exist) -->
      <div v-if="allPriorities.length > 0" class="space-y-1">
        <p class="text-[11px] font-medium text-on-surface-variant">{{ t('planning.components.linkedObjectsSection.priorities') }}</p>
        <TransitionGroup
          tag="div"
          class="flex flex-wrap gap-1.5"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-90"
        >
          <LinkedPill
            v-for="p in priorities"
            :key="p.id"
            :label="p.name"
            :icon="p.icon"
            :editable="editable"
            :disabled="disabled"
            @remove="$emit('remove-priority', p.id)"
          />
          <DerivedPill
            v-for="p in effectiveDerivedPriorities"
            :key="'d-' + p.id"
            :label="p.name"
            :icon="p.icon"
          />
        </TransitionGroup>
      </div>

      <!-- Add link button (only in editable mode) -->
      <CascadingLinkMenu
        v-if="editable"
        :categories="linkCategories"
        :items-by-category="linkItemsByCategory"
        :disabled="disabled"
        @select="$emit('add-link', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import { useT } from '@/composables/useT'
import LinkedPill from './LinkedPill.vue'
import DerivedPill from './DerivedPill.vue'
import CascadingLinkMenu from './CascadingLinkMenu.vue'
import EntityIcon from './EntityIcon.vue'
import type { Project, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

export interface LinkCategoryOption {
  id: string
  label: string
}

export interface LinkItemOption {
  id: string
  label: string
  icon?: string
  color?: string
}

const { t } = useT()

interface CompactSummaryPill {
  key: string
  label: string
  icon?: string
  color?: string
  kind: 'lifeArea' | 'priority' | 'project'
}

const props = withDefaults(
  defineProps<{
    project?: Project
    lifeAreas: LifeArea[]
    priorities: Priority[]
    derivedLifeAreas?: LifeArea[]
    derivedPriorities?: Priority[]
    linkCategories: LinkCategoryOption[]
    linkItemsByCategory: Record<string, LinkItemOption[]>
    editable?: boolean
    disabled?: boolean
    showProject?: boolean
    compactSummary?: boolean
    compactSummaryMode?: 'text' | 'pills'
    compactSummaryPillLimit?: number
    collapsible?: boolean
    defaultExpanded?: boolean
    detailsCollapsedLabel?: string
    detailsExpandedLabel?: string
    iconOnlyToggle?: boolean
  }>(),
  {
    editable: true,
    disabled: false,
    showProject: false,
    derivedLifeAreas: () => [],
    derivedPriorities: () => [],
    linkCategories: () => [],
    linkItemsByCategory: () => ({}),
    compactSummary: false,
    compactSummaryMode: 'text',
    compactSummaryPillLimit: 6,
    collapsible: false,
    defaultExpanded: false,
    detailsCollapsedLabel: undefined,
    detailsExpandedLabel: undefined,
    iconOnlyToggle: false,
  }
)

defineEmits<{
  'add-link': [payload: { category: string; itemId: string }]
  'remove-project': []
  'remove-life-area': [lifeAreaId: string]
  'remove-priority': [priorityId: string]
}>()

const effectiveCollapsedLabel = computed(() => props.effectiveCollapsedLabel ?? t('planning.common.links.showLinkDetails'))
const effectiveExpandedLabel = computed(() => props.effectiveExpandedLabel ?? t('planning.common.links.hideLinkDetails'))

const effectiveDerivedLifeAreas = computed(() => props.derivedLifeAreas || [])
const effectiveDerivedPriorities = computed(() => props.derivedPriorities || [])

const allLifeAreas = computed(() => [
  ...props.lifeAreas,
  ...effectiveDerivedLifeAreas.value,
])

const allPriorities = computed(() => [
  ...props.priorities,
  ...effectiveDerivedPriorities.value,
])

const isExpanded = ref(props.defaultExpanded)

watch(
  () => props.defaultExpanded,
  (next) => {
    isExpanded.value = next
  }
)

const summaryText = computed(() => {
  const segments: string[] = []

  if (props.showProject && props.project) {
    segments.push(`Project: ${props.project.name}`)
  }

  if (allLifeAreas.value.length > 0) {
    const count = allLifeAreas.value.length
    segments.push(`${count} life area${count === 1 ? '' : 's'}`)
  }

  if (allPriorities.value.length > 0) {
    const count = allPriorities.value.length
    segments.push(`${count} priorit${count === 1 ? 'y' : 'ies'}`)
  }

  if (segments.length === 0) {
    return t('planning.common.links.noLinksYet')
  }

  return segments.join(' · ')
})

const compactSummaryPills = computed<CompactSummaryPill[]>(() => {
  const pills: CompactSummaryPill[] = []

  const seenLifeAreas = new Set<string>()
  for (const lifeArea of [...props.lifeAreas, ...effectiveDerivedLifeAreas.value]) {
    if (seenLifeAreas.has(lifeArea.id)) continue
    seenLifeAreas.add(lifeArea.id)
    pills.push({
      key: `life-area-${lifeArea.id}`,
      label: lifeArea.name,
      icon: lifeArea.icon,
      color: lifeArea.color,
      kind: 'lifeArea',
    })
  }

  const seenPriorities = new Set<string>()
  for (const priority of [...props.priorities, ...effectiveDerivedPriorities.value]) {
    if (seenPriorities.has(priority.id)) continue
    seenPriorities.add(priority.id)
    pills.push({
      key: `priority-${priority.id}`,
      label: priority.name,
      icon: priority.icon,
      kind: 'priority',
    })
  }

  if (props.showProject && props.project) {
    pills.push({
      key: `project-${props.project.id}`,
      label: props.project.name,
      icon: props.project.icon,
      kind: 'project',
    })
  }

  return pills
})

const compactSummaryPillLimit = computed(() => Math.max(1, props.compactSummaryPillLimit))

const visibleCompactSummaryPills = computed(() =>
  compactSummaryPills.value.slice(0, compactSummaryPillLimit.value)
)

const hiddenCompactSummaryPillCount = computed(() =>
  Math.max(0, compactSummaryPills.value.length - visibleCompactSummaryPills.value.length)
)
</script>
