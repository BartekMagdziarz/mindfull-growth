<template>
  <section class="review-grid neo-raised">
    <div v-if="items.length > 0" class="review-grid__grid">
      <div
        v-for="item in items"
        :key="item.key"
        class="review-item"
        :class="{ 'review-item--expanded': isExpanded(item.key) }"
      >
        <div
          class="review-item__tile"
          role="button"
          tabindex="0"
          @click="toggle(item.key)"
          @keydown.enter.prevent="toggle(item.key)"
          @keydown.space.prevent="toggle(item.key)"
        >
          <span
            v-if="topPriorityKeys.includes(item.key)"
            class="review-item__star"
            :title="t('planning.today.topPriorityBadge')"
          >
            <AppIcon name="star" />
          </span>
          <span v-if="hasComment(item.key)" class="review-item__has-comment" :title="t('planning.reflection.review.hasComment')">
            <AppIcon name="comment" />
          </span>
          <WeekObjectTile
            :subject="item.subject"
            :subject-type="item.subjectType"
            :planning="item.planning"
            :measurement="item.measurement"
            :raw-entries="rawEntries"
            :all-day-assignments="allDayAssignments"
            :week-ref="weekRef"
            :today-day-ref="todayDayRef"
            :parent-goal-icon="item.parentGoalIcon"
          />
        </div>
        <textarea
          v-if="isExpanded(item.key)"
          :value="comments[item.key] ?? ''"
          class="neo-input review-item__comment"
          rows="2"
          :placeholder="t('planning.reflection.review.commentPlaceholder')"
          :aria-label="t('planning.reflection.review.commentLabel')"
          @input="onComment(item.key, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
    <p v-else class="review-grid__empty">
      {{ t('planning.reflection.review.empty') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import WeekObjectTile from '@/components/calendar/WeekObjectTile.vue'
import { useT } from '@/composables/useT'
import type { DayRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'

defineProps<{
  items: WeekObjectItem[]
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  weekRef: WeekRef
  todayDayRef: DayRef
  topPriorityKeys: string[]
}>()

const comments = defineModel<Record<string, string>>('comments', { default: () => ({}) })

const { t } = useT()

// Objects with an existing comment start expanded so the user sees them.
const expanded = ref<Set<string>>(
  new Set(Object.keys(comments.value).filter((key) => (comments.value[key] ?? '').trim().length > 0)),
)

function hasComment(key: string): boolean {
  return (comments.value[key] ?? '').trim().length > 0
}

function isExpanded(key: string): boolean {
  return expanded.value.has(key)
}

function toggle(key: string): void {
  const next = new Set(expanded.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expanded.value = next
}

function onComment(key: string, value: string): void {
  comments.value = { ...comments.value, [key]: value }
}
</script>

<style scoped>
.review-grid {
  width: 100%;
  padding: 14px;
  border-radius: 22px;
}

.review-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  align-items: start;
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-item__tile {
  position: relative;
  cursor: pointer;
  border-radius: 16px;
  transition: box-shadow 150ms ease;
}

.review-item__tile:hover {
  box-shadow: 0 0 0 2px rgb(var(--color-primary) / 0.35);
}

.review-item--expanded .review-item__tile {
  box-shadow: 0 0 0 2px rgb(var(--color-primary) / 0.55);
}

.review-item__star {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  font-size: 15px;
  line-height: 1;
  color: rgb(var(--color-amber-500, 245 158 11));
}

.review-item__has-comment {
  position: absolute;
  top: 6px;
  right: 26px;
  z-index: 1;
  font-size: 14px;
  line-height: 1;
  color: rgb(var(--color-primary));
}

.review-item__comment {
  width: 100%;
  padding: 8px 10px;
  font-size: 12.5px;
  resize: vertical;
}
</style>
