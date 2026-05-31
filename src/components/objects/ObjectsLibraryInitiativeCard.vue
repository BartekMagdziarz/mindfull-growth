<template>
  <article
    class="group/card neo-card neo-raised border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title + [hover: menu] + Status -->
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          aria-label="Initiative icon"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.title')"
          @blur="flushTitle"
        />
        <div class="-mr-10 flex shrink-0 items-center gap-1.5 opacity-0 transition-all duration-200 ease-in-out group-hover/card:mr-0 group-hover/card:opacity-100">
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="neo-icon-button neo-focus shrink-0"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleArchive"
              >
                {{ item.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
                @click="handleDelete"
              >
                {{ t('common.buttons.delete') }}
              </button>
            </div>
          </div>
        </div>
        <StatusIconButton
          :model-value="item.status"
          :options="statusOptions"
          @update:model-value="emitFieldChange('status', $event)"
        />
      </div>

      <!-- Row 2: Links -->
      <div class="flex items-center gap-1.5">
        <GoalLinksDropdown
          icon-only
          :goal-id="item.goalId"
          :goal-options="goalOptions"
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          @update:goal-id="emitFieldChange('goalId', $event)"
          @toggle-priority="emitFieldChange('togglePriority', $event)"
          @toggle-life-area="emitFieldChange('toggleLifeArea', $event)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import IconPicker from '@/components/shared/IconPicker.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import { useEditableField } from '@/composables/useEditableField'
import type { ObjectsLibraryFilterOption, ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  item: ObjectsLibraryListItem
  statusOptions: Array<{ value: string; label: string }>
  priorityOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  goalOptions: ObjectsLibraryFilterOption[]
  isNew?: boolean
}>()

const emit = defineEmits<{
  'field-change': [id: string, field: string, value: unknown]
  archive: [id: string, isCurrentlyActive: boolean]
  delete: [id: string, title: string]
}>()

const { t } = useT()

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.item.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.isActive)
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

watch(
  () => props.isNew,
  (isNew) => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>
