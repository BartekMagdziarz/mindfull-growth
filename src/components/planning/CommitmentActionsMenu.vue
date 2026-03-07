<template>
  <div ref="containerRef" class="relative inline-flex">
    <button
      type="button"
      :disabled="disabled"
      class="neo-icon-button neo-focus h-8 w-8 p-0"
      :aria-label="resolvedTriggerAriaLabel"
      @click="toggle"
    >
      <EllipsisHorizontalIcon class="h-4 w-4" />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-120 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-90 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="isOpen"
          ref="menuRef"
          class="fixed z-50 min-w-[11rem] rounded-xl border border-neu-border/25 bg-neu-base p-1.5 shadow-neu-raised"
          :style="menuStyle"
        >
          <button
            type="button"
            class="neo-focus flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-on-surface transition-colors hover:bg-section"
            :disabled="isAddDisabled"
            :class="isAddDisabled ? 'opacity-45 cursor-not-allowed' : ''"
            @click="openPanel('add')"
          >
            <LinkIcon class="h-4 w-4" />
            <span class="flex-1">{{ t('planning.common.links.addLink') }}</span>
            <ChevronRightIcon class="h-3.5 w-3.5 text-on-surface-variant" />
          </button>

          <button
            type="button"
            class="neo-focus mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-on-surface transition-colors hover:bg-section"
            :disabled="isRemoveDisabled"
            :class="isRemoveDisabled ? 'opacity-45 cursor-not-allowed' : ''"
            @click="openPanel('remove')"
          >
            <MinusCircleIcon class="h-4 w-4" />
            <span class="flex-1">{{ t('planning.common.links.removeLink') }}</span>
            <ChevronRightIcon class="h-3.5 w-3.5 text-on-surface-variant" />
          </button>

          <template v-if="showTrackerOptions">
            <div class="my-1 h-px bg-outline/18" />

            <button
              v-if="!hasTracker"
              type="button"
              class="neo-focus flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-on-surface transition-colors hover:bg-section"
              @click="openPanel('add-tracker')"
            >
              <ChartBarIcon class="h-4 w-4" />
              <span class="flex-1">{{ t('planning.common.links.addTracker') }}</span>
              <ChevronRightIcon class="h-3.5 w-3.5 text-on-surface-variant" />
            </button>

            <button
              v-if="hasTracker"
              type="button"
              class="neo-focus flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-on-surface transition-colors hover:bg-section"
              @click="handleRemoveTracker"
            >
              <XMarkIcon class="h-4 w-4" />
              {{ t('planning.common.links.removeTracker') }}
            </button>
          </template>

          <template v-if="showDelete">
            <div class="my-1 h-px bg-outline/18" />

            <button
              type="button"
              class="neo-focus flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-error transition-colors hover:bg-error/10"
              @click="handleDelete"
            >
              <TrashIcon class="h-4 w-4" />
              {{ resolvedDeleteLabel }}
            </button>
          </template>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition duration-120 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-90 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="isOpen && activePanel"
          ref="submenuRef"
          class="fixed z-50 max-h-[17rem] min-w-[15rem] overflow-y-auto rounded-xl border border-neu-border/25 bg-neu-base p-2 shadow-neu-raised"
          :style="submenuStyle"
        >
          <template v-if="activePanel === 'add'">
            <div
              v-for="category in visibleAddCategories"
              :key="category.id"
              class="mb-2 last:mb-0"
            >
              <p class="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ category.label }}
              </p>
              <button
                v-for="item in addItemsByCategory[category.id]"
                :key="`${category.id}-${item.id}`"
                type="button"
                class="neo-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-section"
                @click="handleAdd(category.id, item.id)"
              >
                <EntityIcon
                  v-if="item.icon"
                  :icon="item.icon"
                  :color="item.color"
                  size="xs"
                />
                <span
                  v-else-if="item.color"
                  class="h-2 w-2 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="truncate">{{ item.label }}</span>
              </button>
            </div>
          </template>

          <template v-else-if="activePanel === 'remove'">
            <div
              v-for="group in removableGroups"
              :key="group.category"
              class="mb-2 last:mb-0"
            >
              <p class="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ group.label }}
              </p>
              <button
                v-for="item in group.items"
                :key="`${item.category}-${item.id}`"
                type="button"
                class="neo-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-section"
                @click="handleRemove(item.category, item.id)"
              >
                <EntityIcon
                  v-if="item.icon"
                  :icon="item.icon"
                  :color="item.color"
                  size="xs"
                />
                <span
                  v-else-if="item.color"
                  class="h-2 w-2 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="truncate">{{ item.label }}</span>
              </button>
            </div>
          </template>

          <template v-else-if="activePanel === 'add-tracker'">
            <p class="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('planning.components.commitmentActionsMenu.trackerType') }}
            </p>
            <button
              type="button"
              class="neo-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-section"
              @click="handleAddTracker('count')"
            >
              <span class="text-base">&#9745;</span>
              <span>{{ t('planning.components.commitmentActionsMenu.countTickBoxes') }}</span>
            </button>
            <button
              type="button"
              class="neo-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-section"
              @click="handleAddTracker('value')"
            >
              <span class="text-base">#</span>
              <span>{{ t('planning.components.commitmentActionsMenu.valueNumber') }}</span>
            </button>
            <button
              type="button"
              class="neo-focus flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-on-surface transition-colors hover:bg-section"
              @click="handleAddTracker('rating')"
            >
              <span class="text-base">&#9733;</span>
              <span>{{ t('planning.components.commitmentActionsMenu.ratingScale') }}</span>
            </button>
          </template>

          <p
            v-if="activePanel === 'add' && visibleAddCategories.length === 0"
            class="px-1 py-2 text-xs text-on-surface-variant"
          >
            {{ t('planning.common.links.noLinksAvailable') }}
          </p>
          <p
            v-if="activePanel === 'remove' && removableLinks.length === 0"
            class="px-1 py-2 text-xs text-on-surface-variant"
          >
            {{ t('planning.common.links.noExplicitLinks') }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  ChartBarIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  LinkIcon,
  MinusCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import EntityIcon from './EntityIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

interface CommitmentActionCategory {
  id: string
  label: string
}

interface CommitmentActionItem {
  id: string
  label: string
  icon?: string
  color?: string
}

interface CommitmentRemovableLink extends CommitmentActionItem {
  category: 'project' | 'lifeArea' | 'priority'
}

const props = withDefaults(
  defineProps<{
    addCategories: CommitmentActionCategory[]
    addItemsByCategory: Record<string, CommitmentActionItem[]>
    removableLinks: CommitmentRemovableLink[]
    hasTracker?: boolean
    showTrackerOptions?: boolean
    showDelete?: boolean
    disabled?: boolean
    deleteLabel?: string
    triggerAriaLabel?: string
  }>(),
  {
    addCategories: () => [],
    addItemsByCategory: () => ({}),
    removableLinks: () => [],
    hasTracker: false,
    showTrackerOptions: true,
    showDelete: true,
    disabled: false,
    deleteLabel: undefined,
    triggerAriaLabel: undefined,
  }
)

const emit = defineEmits<{
  'add-link': [payload: { category: string; itemId: string }]
  'remove-link': [payload: { category: 'project' | 'lifeArea' | 'priority'; itemId: string }]
  'add-tracker': [type: string]
  'remove-tracker': []
  delete: []
}>()

const resolvedDeleteLabel = computed(() => props.deleteLabel ?? t('planning.components.commitmentCard.deleteCommitment'))
const resolvedTriggerAriaLabel = computed(() => props.triggerAriaLabel ?? t('planning.components.commitmentCard.openActions'))

const isOpen = ref(false)
const activePanel = ref<'add' | 'remove' | 'add-tracker' | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const submenuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const submenuStyle = ref<Record<string, string>>({})

const visibleAddCategories = computed(() =>
  props.addCategories.filter((category) => (props.addItemsByCategory[category.id] ?? []).length > 0)
)

const isAddDisabled = computed(() => visibleAddCategories.value.length === 0)
const isRemoveDisabled = computed(() => props.removableLinks.length === 0)

const removableGroups = computed(() => {
  const groups: Array<{ category: 'project' | 'lifeArea' | 'priority'; label: string; items: CommitmentRemovableLink[] }> = [
    {
      category: 'project',
      label: t('planning.common.entities.project'),
      items: props.removableLinks.filter((item) => item.category === 'project'),
    },
    {
      category: 'lifeArea',
      label: t('planning.common.entities.lifeAreas'),
      items: props.removableLinks.filter((item) => item.category === 'lifeArea'),
    },
    {
      category: 'priority',
      label: t('planning.common.entities.priorities'),
      items: props.removableLinks.filter((item) => item.category === 'priority'),
    },
  ]

  return groups.filter((group) => group.items.length > 0)
})

function updatePositions() {
  if (!containerRef.value) return

  const trigger = containerRef.value.getBoundingClientRect()
  const menuWidth = 176
  const menuHeight = 220
  const submenuWidth = 250
  const submenuHeight = 272
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let menuLeft = trigger.left
  let menuTop = trigger.bottom + 6

  if (menuLeft + menuWidth > viewportWidth - 8) {
    menuLeft = viewportWidth - menuWidth - 8
  }
  if (menuLeft < 8) {
    menuLeft = 8
  }

  if (menuTop + menuHeight > viewportHeight - 8) {
    menuTop = trigger.top - menuHeight - 6
  }
  if (menuTop < 8) {
    menuTop = 8
  }

  menuStyle.value = {
    left: `${menuLeft}px`,
    top: `${menuTop}px`,
  }

  const openRight = menuLeft + menuWidth + 8 + submenuWidth <= viewportWidth - 8
  const submenuLeft = openRight ? menuLeft + menuWidth + 6 : menuLeft - submenuWidth - 6

  let submenuTop = menuTop
  if (submenuTop + submenuHeight > viewportHeight - 8) {
    submenuTop = viewportHeight - submenuHeight - 8
  }
  if (submenuTop < 8) {
    submenuTop = 8
  }

  submenuStyle.value = {
    left: `${Math.max(8, submenuLeft)}px`,
    top: `${submenuTop}px`,
  }
}

function open() {
  if (props.disabled) return
  isOpen.value = true
  activePanel.value = null
  updatePositions()
}

function close() {
  isOpen.value = false
  activePanel.value = null
}

function toggle() {
  if (isOpen.value) {
    close()
    return
  }
  open()
}

function openPanel(panel: 'add' | 'remove' | 'add-tracker') {
  if (panel === 'add' && isAddDisabled.value) return
  if (panel === 'remove' && isRemoveDisabled.value) return
  activePanel.value = panel
  updatePositions()
}

function handleAddTracker(type: string) {
  emit('add-tracker', type)
  close()
}

function handleRemoveTracker() {
  emit('remove-tracker')
  close()
}

function handleAdd(category: string, itemId: string) {
  emit('add-link', { category, itemId })
  close()
}

function handleRemove(category: 'project' | 'lifeArea' | 'priority', itemId: string) {
  emit('remove-link', { category, itemId })
  close()
}

function handleDelete() {
  emit('delete')
  close()
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    containerRef.value &&
    !containerRef.value.contains(target) &&
    (!menuRef.value || !menuRef.value.contains(target)) &&
    (!submenuRef.value || !submenuRef.value.contains(target))
  ) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

function handleWindowChange() {
  if (!isOpen.value) return
  updatePositions()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
})
</script>
