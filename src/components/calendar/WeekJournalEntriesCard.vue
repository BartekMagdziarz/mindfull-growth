<template>
  <SummaryCard :title="t('planning.reflection.review.journalShort')">
    <p v-if="entries.length === 0" class="text-center text-xs text-on-surface-variant/70">
      —
    </p>
    <ul v-else class="journal-list">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="journal-row"
        :data-expanded="expandedIds.has(entry.id)"
      >
        <button
          type="button"
          class="journal-row__head neo-focus"
          :aria-expanded="expandedIds.has(entry.id)"
          @click="toggle(entry.id)"
        >
          <span class="journal-row__title">{{ entryTitle(entry) }}</span>
          <AppIcon
            :name="expandedIds.has(entry.id) ? 'expand_less' : 'expand_more'"
            class="journal-row__chevron"
          />
        </button>

        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[400px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[400px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="expandedIds.has(entry.id)" class="journal-row__body">
            <p v-if="entry.body" class="journal-row__text">{{ entry.body }}</p>

            <div v-if="hasEmotions(entry)" class="journal-row__pills">
              <span
                v-for="emotionId in entry.emotionIds"
                :key="`e-${emotionId}`"
                v-show="emotionName(emotionId)"
                class="journal-pill journal-pill--emotion"
                :style="emotionPillStyle(emotionId)"
              >
                {{ emotionName(emotionId) }}
              </span>
            </div>

            <div v-if="hasTags(entry)" class="journal-row__pills">
              <span
                v-for="tagId in entry.peopleTagIds ?? []"
                :key="`p-${tagId}`"
                v-show="peopleTagName(tagId)"
                class="journal-pill journal-pill--people"
              >
                {{ peopleTagName(tagId) }}
              </span>
              <span
                v-for="tagId in entry.contextTagIds ?? []"
                :key="`c-${tagId}`"
                v-show="contextTagName(tagId)"
                class="journal-pill journal-pill--context"
              >
                {{ contextTagName(tagId) }}
              </span>
            </div>
          </div>
        </transition>
      </li>
    </ul>
  </SummaryCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import SummaryCard from './WeeklyReviewSummaryCard.vue'
import { useT } from '@/composables/useT'
import { useEmotionStore } from '@/stores/emotion.store'
import { useJournalStore } from '@/stores/journal.store'
import { useTagStore } from '@/stores/tag.store'
import { getDisplayTitle } from '@/domain/journal'
import type { JournalEntry } from '@/domain/journal'
import { getQuadrant } from '@/domain/emotion'
import type { Quadrant } from '@/domain/emotion'
import type { WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'

const props = defineProps<{
  weekRef: WeekRef
}>()

const { t } = useT()
const journalStore = useJournalStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()

const entries = computed<JournalEntry[]>(() => {
  const bounds = getPeriodBounds(props.weekRef)
  const startISO = `${bounds.start}T00:00:00.000Z`
  const endISO = `${bounds.end}T23:59:59.999Z`
  return journalStore.sortedEntries.filter(
    (entry) => entry.createdAt >= startISO && entry.createdAt <= endISO,
  )
})

const expandedIds = ref(new Set<string>())

function toggle(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
  // Trigger reactivity for Set
  expandedIds.value = new Set(expandedIds.value)
}

function entryTitle(entry: JournalEntry): string {
  return getDisplayTitle(entry) || t('planning.reflection.review.untitled')
}

function hasEmotions(entry: JournalEntry): boolean {
  return Array.isArray(entry.emotionIds) && entry.emotionIds.length > 0
}

function hasTags(entry: JournalEntry): boolean {
  return (
    (Array.isArray(entry.peopleTagIds) && entry.peopleTagIds.length > 0) ||
    (Array.isArray(entry.contextTagIds) && entry.contextTagIds.length > 0)
  )
}

function emotionName(id: string): string | undefined {
  return emotionStore.getEmotionById(id)?.name
}

function emotionPillStyle(id: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(id)
  if (!emotion) return {}
  const quadrant: Quadrant = getQuadrant(emotion)
  return {
    backgroundColor: `var(--color-quadrant-${quadrant}-selected)`,
    color: 'white',
  }
}

function peopleTagName(id: string): string | undefined {
  return tagStore.getPeopleTagById(id)?.name
}

function contextTagName(id: string): string | undefined {
  return tagStore.getContextTagById(id)?.name
}
</script>

<style scoped>
.journal-list {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
}

.journal-row {
  overflow: hidden;
  position: relative;
}

.journal-row + .journal-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 1px;
  right: 1px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--neo-border) / 0.45),
    transparent
  );
  pointer-events: none;
}

.journal-row__head {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
  padding: 7px 10px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  min-height: 32px;
}

.journal-row__title {
  flex: 1 1 auto;
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--neo-text));
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.journal-row__chevron {
  flex: 0 0 auto;
  font-size: 14px;
  color: rgb(var(--neo-muted) / 0.7);
  opacity: 0;
  transition: opacity 150ms ease;
}

.journal-row__head:hover .journal-row__chevron,
.journal-row__head:focus-visible .journal-row__chevron,
.journal-row[data-expanded='true'] .journal-row__chevron {
  opacity: 1;
}

.journal-row__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 10px 9px;
  overflow: hidden;
}

.journal-row__text {
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--neo-text) / 0.9);
  white-space: pre-wrap;
  word-break: break-word;
}

.journal-row__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.journal-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
}

.journal-pill--people {
  background: rgb(var(--neo-surface-base));
  color: rgb(var(--neo-text));
  border: 1px solid rgb(var(--neo-border) / 0.4);
}

.journal-pill--context {
  background: rgb(var(--color-primary-soft, var(--neo-chart-primary-start)) / 0.18);
  color: rgb(var(--neo-text));
  border: 1px solid rgb(var(--color-primary-strong, var(--neo-chart-primary-end)) / 0.3);
}
</style>
