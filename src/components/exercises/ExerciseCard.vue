<template>
  <button type="button" class="mg-v2-tile exercise-tile" @click="$emit('click')">
    <span
      class="mg-v2-icon-board"
      :class="{ 'mg-v2-icon-board--tinted': Boolean(category) }"
      :style="tintStyle"
      aria-hidden="true"
    >
      <AppIcon class="material-symbols-outlined" :name="icon" />
    </span>

    <span class="mg-v2-tile__body">
      <span class="mg-v2-tile__head">
        <h3 class="mg-v2-tile__title">{{ title }}</h3>
        <AppIcon
          v-if="aiAssisted"
          name="auto_awesome"
          class="exercise-tile__ai"
          :title="t('exercises.aiAssisted')"
          :aria-label="t('exercises.aiAssisted')"
        />
      </span>
      <p class="mg-v2-meta">
        <span>{{ subtitle }}</span>
        <span v-if="lastCompleted" class="mg-v2-meta__status">{{ lastCompletedLabel }}</span>
      </p>
      <p class="mg-v2-tile__lead">{{ description }}</p>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import {
  EXERCISE_CATEGORY_TINT_STYLE,
  type ExerciseCategory,
} from '@/constants/exerciseColorRoles'

const { t } = useT()

const props = defineProps<{
  title: string
  subtitle: string
  description: string
  icon: string
  /**
   * One of the therapeutic tabs in ExercisesView. When set, the icon board
   * takes that category's tint (blended into the sky field by the anatomy).
   */
  category?: ExerciseCategory
  lastCompleted?: string // ISO timestamp
  aiAssisted?: boolean
}>()

defineEmits<{
  click: []
}>()

const tintStyle = computed(() =>
  props.category ? EXERCISE_CATEGORY_TINT_STYLE[props.category] : undefined,
)

const lastCompletedLabel = computed(() => {
  if (!props.lastCompleted) return ''
  const date = new Date(props.lastCompleted)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('common.time.today')
  if (diffDays === 1) return t('common.time.yesterday')
  if (diffDays < 7) return t('common.time.daysAgo', { n: diffDays })
  if (diffDays < 30) return t('common.time.weeksAgo', { n: Math.floor(diffDays / 7) })
  return date.toLocaleDateString()
})
</script>

<style scoped>
.exercise-tile__ai {
  flex-shrink: 0;
  color: var(--mg-color-primary);
  font-size: 1rem;
}
</style>
