<template>
  <div class="tag-emotion-list">
    <!-- Empty State -->
    <div
      v-if="associations.length === 0"
      class="text-center py-6 text-on-surface-variant"
    >
      <TagIcon class="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p class="text-sm">{{ emptyMessage }}</p>
    </div>

    <div v-else class="space-y-6">
      <!-- People Tags -->
      <div v-if="peopleTags.length > 0">
        <h3 class="flex items-center gap-2 text-sm font-medium text-on-surface-variant mb-3">
          <UserIcon class="w-4 h-4" />
          People
        </h3>
        <div class="space-y-2">
          <div
            v-for="assoc in peopleTags"
            :key="assoc.tagId"
            class="flex items-center gap-3 p-3 rounded-xl bg-section/50 border border-outline/20"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-on-surface truncate">
                  {{ getTagName(assoc.tagId, 'people') }}
                </span>
                <span class="text-xs text-on-surface-variant flex-shrink-0">
                  {{ assoc.frequency }}x
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <span class="text-xs text-on-surface-variant mr-1">with</span>
              <span
                v-for="emotionId in assoc.topEmotionIds"
                :key="emotionId"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="getEmotionClasses(emotionId)"
              >
                {{ getEmotionName(emotionId) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Context Tags -->
      <div v-if="contextTags.length > 0">
        <h3 class="flex items-center gap-2 text-sm font-medium text-on-surface-variant mb-3">
          <HashtagIcon class="w-4 h-4" />
          Contexts
        </h3>
        <div class="space-y-2">
          <div
            v-for="assoc in contextTags"
            :key="assoc.tagId"
            class="flex items-center gap-3 p-3 rounded-xl bg-section/50 border border-outline/20"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-on-surface truncate">
                  {{ getTagName(assoc.tagId, 'context') }}
                </span>
                <span class="text-xs text-on-surface-variant flex-shrink-0">
                  {{ assoc.frequency }}x
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
              <span class="text-xs text-on-surface-variant mr-1">with</span>
              <span
                v-for="emotionId in assoc.topEmotionIds"
                :key="emotionId"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="getEmotionClasses(emotionId)"
              >
                {{ getEmotionName(emotionId) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TagIcon, UserIcon, HashtagIcon } from '@heroicons/vue/24/outline'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import type { TagEmotionAssociation } from '@/domain/periodicEntry'

const props = defineProps<{
  associations: TagEmotionAssociation[]
  emptyMessage?: string
}>()

const emotionStore = useEmotionStore()
const tagStore = useTagStore()

const peopleTags = computed(() =>
  props.associations.filter((a) => a.tagType === 'people')
)

const contextTags = computed(() =>
  props.associations.filter((a) => a.tagType === 'context')
)

function getTagName(tagId: string, type: 'people' | 'context'): string {
  if (type === 'people') {
    return tagStore.getPeopleTagById(tagId)?.name ?? 'Unknown'
  }
  return tagStore.getContextTagById(tagId)?.name ?? 'Unknown'
}

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

function getEmotionClasses(emotionId: string): string {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return 'bg-section text-on-surface-variant'

  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-high-energy-high-pleasantness text-on-surface'
  } else if (isHighEnergy && !isHighPleasantness) {
    return 'bg-quadrant-high-energy-low-pleasantness text-on-surface'
  } else if (!isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-low-energy-high-pleasantness text-on-surface'
  } else {
    return 'bg-quadrant-low-energy-low-pleasantness text-on-surface'
  }
}
</script>
