<template>
  <div ref="rootRef" class="relative">
    <!-- Icon-only trigger -->
    <div v-if="iconOnly" class="relative">
      <button
        type="button"
        class="neo-icon-button neo-focus"
        :title="t('planning.objects.actions.links')"
        :aria-label="t('planning.objects.actions.links')"
        @click.stop="open = !open"
      >
        <AppIcon name="link" class="text-base" />
      </button>
      <span
        v-if="totalLinked > 0"
        class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white"
      >
        {{ totalLinked }}
      </span>
    </div>
    <!-- Pill trigger (default) -->
    <button
      v-else
      type="button"
      class="neo-pill neo-focus flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold"
      @click.stop="open = !open"
    >
      {{ t('planning.objects.actions.links') }}
      <span v-if="totalLinked > 0" class="text-primary">({{ totalLinked }})</span>
      <AppIcon name="expand_more" class="text-xs transition-transform duration-200" :class="open ? 'rotate-180' : ''" />
    </button>

    <!-- Level 1 -->
    <div
      v-if="open"
      class="absolute left-0 z-20 mt-1 min-w-[160px] rounded-xl border border-white/40 bg-white shadow-lg"
      @click.stop
    >
      <button
        v-if="goalOptions && goalOptions.length > 0"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
        @mouseenter="activeCategory = 'goal'"
        @click="activeCategory = activeCategory === 'goal' ? null : 'goal'"
      >
        <span>
          {{ t('planning.objects.linksDropdown.goals') }}
          <span v-if="goalId" class="text-primary">(1)</span>
        </span>
        <AppIcon name="chevron_right" class="text-xs text-on-surface-variant" />
      </button>
      <button
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
        @mouseenter="activeCategory = 'lifeArea'"
        @click="activeCategory = activeCategory === 'lifeArea' ? null : 'lifeArea'"
      >
        <span>
          {{ t('planning.objects.linksDropdown.lifeAreas') }}
          <span v-if="lifeAreaIds.length > 0" class="text-primary">({{ lifeAreaIds.length }})</span>
        </span>
        <AppIcon name="chevron_right" class="text-xs text-on-surface-variant" />
      </button>
      <button
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
        @mouseenter="activeCategory = 'priority'"
        @click="activeCategory = activeCategory === 'priority' ? null : 'priority'"
      >
        <span>
          {{ t('planning.objects.linksDropdown.priorities') }}
          <span v-if="priorityIds.length > 0" class="text-primary">({{ priorityIds.length }})</span>
        </span>
        <AppIcon name="chevron_right" class="text-xs text-on-surface-variant" />
      </button>

      <!-- Level 2 -->
      <div
        v-if="activeCategory && activeCategoryOptions.length > 0"
        class="absolute left-full top-0 z-30 ml-0.5 max-h-[240px] min-w-[160px] overflow-y-auto rounded-xl border border-white/40 bg-white shadow-lg"
        @click.stop
      >
        <button
          v-for="option in activeCategoryOptions"
          :key="option.id"
          type="button"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-on-surface hover:bg-primary-soft/30"
          @click="toggleOption(option.id)"
        >
          <AppIcon v-if="isLinked(option.id)" name="check" class="text-xs flex-shrink-0 text-primary" />
          <span v-else class="h-3 w-3 flex-shrink-0" />
          {{ option.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const props = withDefaults(
  defineProps<{
    priorityIds: string[]
    lifeAreaIds: string[]
    priorityOptions: ObjectsLibraryFilterOption[]
    lifeAreaOptions: ObjectsLibraryFilterOption[]
    goalId?: string
    goalOptions?: ObjectsLibraryFilterOption[]
    iconOnly?: boolean
  }>(),
  { iconOnly: false, goalId: undefined, goalOptions: undefined },
)

const emit = defineEmits<{
  'toggle-priority': [id: string]
  'toggle-life-area': [id: string]
  'update:goal-id': [id: string | undefined]
}>()

const { t } = useT()
const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const activeCategory = ref<'lifeArea' | 'priority' | 'goal' | null>(null)

const totalLinked = computed(() => props.priorityIds.length + props.lifeAreaIds.length + (props.goalId ? 1 : 0))

const linkedPrioritySet = computed(() => new Set(props.priorityIds))
const linkedLifeAreaSet = computed(() => new Set(props.lifeAreaIds))

const activeCategoryOptions = computed(() => {
  if (activeCategory.value === 'lifeArea') return props.lifeAreaOptions
  if (activeCategory.value === 'priority') return props.priorityOptions
  if (activeCategory.value === 'goal') return props.goalOptions ?? []
  return []
})

function isLinked(id: string): boolean {
  if (activeCategory.value === 'lifeArea') return linkedLifeAreaSet.value.has(id)
  if (activeCategory.value === 'priority') return linkedPrioritySet.value.has(id)
  if (activeCategory.value === 'goal') return props.goalId === id
  return false
}

function toggleOption(id: string): void {
  if (activeCategory.value === 'lifeArea') {
    emit('toggle-life-area', id)
  } else if (activeCategory.value === 'priority') {
    emit('toggle-priority', id)
  } else if (activeCategory.value === 'goal') {
    emit('update:goal-id', props.goalId === id ? undefined : id)
  }
}

function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false
    activeCategory.value = null
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
