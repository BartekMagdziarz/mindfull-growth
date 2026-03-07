<template>
  <div
    v-if="rows.length > 0"
    ref="containerRef"
    class="relative"
  >
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'neo-focus inline-flex items-center text-left transition-all duration-180 ease-out',
        showBackdrop ? 'neo-surface border border-neu-border/22' : 'border border-transparent',
        isExpanded
          ? `z-30 rounded-xl px-2.5 py-2 shadow-neu-raised ${showBackdrop ? '' : 'bg-neu-base border-neu-border/22'}`
          : showBackdrop
            ? 'rounded-full px-2 py-1.5 hover:border-primary/30'
            : 'rounded-full px-1.5 py-1 hover:bg-section/55',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ]"
      :aria-label="isExpanded ? 'Collapse linked objects' : 'Expand linked objects'"
      :aria-expanded="isExpanded"
      @click="toggle"
    >
      <div :class="['flex items-center', isExpanded ? 'flex-wrap gap-1' : 'gap-0']">
        <template v-for="(row, rowIndex) in rows" :key="row.key">
          <!-- Vertical divider between groups -->
          <div
            v-if="rowIndex > 0"
            :class="[
              'bg-outline/25',
              isExpanded ? 'mx-1 self-stretch w-px' : 'mx-1.5 h-4 w-px',
            ]"
            aria-hidden="true"
          />

          <!-- Items in this group -->
          <div :class="['flex items-center gap-1', isExpanded ? 'flex-wrap' : '']">
            <template v-if="isExpanded">
              <span
                v-for="item in row.items"
                :key="`${row.key}-${item.id}`"
                class="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-neu-border/25 bg-section/75 px-2 py-0.5 text-[11px] text-on-surface"
                :title="item.name"
              >
                <EntityIcon
                  :icon="item.icon"
                  :color="item.color"
                  size="xs"
                />
                <span class="max-w-[11rem] truncate">{{ item.name }}</span>
              </span>
            </template>
            <template v-else>
              <EntityIcon
                v-for="item in row.items"
                :key="`${row.key}-${item.id}`"
                :icon="item.icon"
                :color="item.color"
                size="xs"
                :title="item.name"
              />
            </template>
          </div>
        </template>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Project, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import EntityIcon from './EntityIcon.vue'

type RowKind = 'lifeArea' | 'priority' | 'project'

interface ClusterItem {
  id: string
  name: string
  icon?: string
  color?: string
}

interface ClusterRow {
  key: RowKind
  items: ClusterItem[]
}

const props = withDefaults(
  defineProps<{
    project?: Project
    lifeAreas: LifeArea[]
    priorities: Priority[]
    derivedLifeAreas?: LifeArea[]
    derivedPriorities?: Priority[]
    disabled?: boolean
    showBackdrop?: boolean
  }>(),
  {
    project: undefined,
    derivedLifeAreas: () => [],
    derivedPriorities: () => [],
    disabled: false,
    showBackdrop: true,
  }
)

const containerRef = ref<HTMLElement | null>(null)
const isExpanded = ref(false)

function mergeLifeAreas(primary: LifeArea[], secondary: LifeArea[]): ClusterItem[] {
  const map = new Map<string, ClusterItem>()
  for (const lifeArea of [...primary, ...secondary]) {
    if (map.has(lifeArea.id)) continue
    map.set(lifeArea.id, {
      id: lifeArea.id,
      name: lifeArea.name,
      icon: lifeArea.icon,
      color: lifeArea.color,
    })
  }
  return Array.from(map.values())
}

function mergePriorities(primary: Priority[], secondary: Priority[]): ClusterItem[] {
  const map = new Map<string, ClusterItem>()
  for (const priority of [...primary, ...secondary]) {
    if (map.has(priority.id)) continue
    map.set(priority.id, {
      id: priority.id,
      name: priority.name,
      icon: priority.icon,
    })
  }
  return Array.from(map.values())
}

const rows = computed<ClusterRow[]>(() => {
  const lifeAreaRow: ClusterRow = {
    key: 'lifeArea',
    items: mergeLifeAreas(props.lifeAreas, props.derivedLifeAreas),
  }
  const priorityRow: ClusterRow = {
    key: 'priority',
    items: mergePriorities(props.priorities, props.derivedPriorities),
  }
  const projectRow: ClusterRow = {
    key: 'project',
    items: props.project
      ? [
          {
            id: props.project.id,
            name: props.project.name,
            icon: props.project.icon,
          },
        ]
      : [],
  }

  return [lifeAreaRow, priorityRow, projectRow].filter((row) => row.items.length > 0)
})

function close() {
  isExpanded.value = false
}

function toggle() {
  if (props.disabled) return
  isExpanded.value = !isExpanded.value
}

function handleClickOutside(event: MouseEvent) {
  if (!isExpanded.value) return
  const target = event.target as Node
  if (containerRef.value && !containerRef.value.contains(target)) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
