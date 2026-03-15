<template>
  <div class="space-y-4">
    <p class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.domainSelector.description') }}
    </p>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div
        v-for="(area, index) in areas"
        :key="index"
        class="group relative flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-section/60 border border-neu-border/15 hover:border-primary/30 hover:bg-section transition-all cursor-default"
      >
        <!-- Display mode -->
        <template v-if="editingIndex !== index">
          <span
            class="text-sm font-medium text-on-surface truncate cursor-text"
            @click="startEditing(index)"
          >
            {{ area.name || t('exerciseWizards.wheelOfLife.domainSelector.untitled') }}
          </span>
          <div class="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
              :aria-label="t('exerciseWizards.wheelOfLife.domainSelector.editArea')"
              @click="startEditing(index)"
            >
              <AppIcon name="edit" class="text-sm" />
            </button>
            <button
              type="button"
              class="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
              :aria-label="t('exerciseWizards.wheelOfLife.domainSelector.removeArea')"
              @click="$emit('remove', index)"
            >
              <AppIcon name="close" class="text-sm" />
            </button>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <input
            ref="editInputRef"
            :value="area.name"
            type="text"
            :placeholder="t('exerciseWizards.wheelOfLife.domainSelector.areaNamePlaceholder')"
            class="flex-1 min-w-0 bg-transparent text-sm font-medium text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
            @input="$emit('rename', index, ($event.target as HTMLInputElement).value)"
            @blur="editingIndex = -1"
            @keydown.enter="editingIndex = -1"
            @keydown.escape="editingIndex = -1"
          />
        </template>
      </div>

      <!-- Add area card -->
      <button
        type="button"
        class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-neu-border/20 text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
        @click="$emit('add', '')"
      >
        <AppIcon name="add" class="text-base" />
        <span class="text-sm font-medium">{{ t('exerciseWizards.wheelOfLife.domainSelector.addArea') }}</span>
      </button>
    </div>

    <div v-if="areas.length < 3" class="text-xs text-amber-600">
      {{ t('exerciseWizards.wheelOfLife.domainSelector.validationMessage') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useT } from '@/composables/useT'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { WheelOfLifeArea } from '@/domain/exercises'

const { t } = useT()

defineProps<{
  areas: WheelOfLifeArea[]
}>()

defineEmits<{
  add: [name: string]
  remove: [index: number]
  rename: [index: number, name: string]
}>()

const editingIndex = ref(-1)
const editInputRef = ref<HTMLInputElement[]>()

function startEditing(index: number) {
  editingIndex.value = index
  nextTick(() => {
    const inputs = editInputRef.value
    if (inputs && inputs.length > 0) {
      inputs[0].focus()
      inputs[0].select()
    }
  })
}

// Auto-enter edit mode for newly added empty areas
watch(
  () => editInputRef.value,
  () => {},
  { flush: 'post' },
)
</script>
