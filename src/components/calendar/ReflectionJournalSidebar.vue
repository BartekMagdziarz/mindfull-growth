<template>
  <div class="flex gap-4">
    <!-- Main textarea -->
    <div class="flex-1">
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        class="neo-input min-h-[16rem] w-full resize-none p-4 text-on-surface"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Sidebar -->
    <div
      class="shrink-0 transition-all duration-200"
      :class="sidebarOpen ? 'w-72' : 'w-8'"
    >
      <!-- Collapsed strip -->
      <button
        v-if="!sidebarOpen"
        type="button"
        class="neo-card flex h-full w-8 items-center justify-center"
        @click="sidebarOpen = true"
      >
        <AppIcon name="chevron_left" class="text-base text-on-surface-variant" />
      </button>

      <!-- Expanded panel -->
      <div v-else class="neo-inset space-y-3 overflow-y-auto rounded-xl p-3" style="max-height: 28rem">
        <!-- Collapse button -->
        <div class="flex justify-end">
          <button
            type="button"
            class="neo-control neo-focus h-6 w-6 shrink-0"
            @click="sidebarOpen = false"
          >
            <AppIcon name="chevron_right" class="text-sm" />
          </button>
        </div>

        <!-- Anchors section -->
        <div v-if="hasAnchors">
          <button
            type="button"
            class="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
            @click="anchorsOpen = !anchorsOpen"
          >
            <AppIcon :name="anchorsOpen ? 'expand_more' : 'chevron_right'" class="text-sm" />
            {{ t('planning.reflection.sidebar.anchors') }}
          </button>
          <div v-if="anchorsOpen" class="mt-2 space-y-2">
            <div
              v-for="cat in visibleAnchorCategories"
              :key="cat.key"
            >
              <button
                type="button"
                class="flex w-full items-center gap-1 text-xs font-medium text-on-surface"
                @click="toggleAnchorCategory(cat.key)"
              >
                <AppIcon :name="anchorCategoryOpen[cat.key] ? 'expand_more' : 'chevron_right'" class="text-xs" />
                {{ cat.label }}
              </button>
              <ul v-if="anchorCategoryOpen[cat.key]" class="ml-4 mt-1 space-y-0.5">
                <li
                  v-for="(line, idx) in getAnchorLines(cat.key)"
                  :key="idx"
                  class="text-xs text-on-surface-variant"
                >
                  {{ line }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Ratings section -->
        <div v-if="ratingGroups.length > 0">
          <button
            type="button"
            class="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
            @click="ratingsOpen = !ratingsOpen"
          >
            <AppIcon :name="ratingsOpen ? 'expand_more' : 'chevron_right'" class="text-sm" />
            {{ t('planning.reflection.sidebar.ratings') }}
          </button>
          <div v-if="ratingsOpen" class="mt-2 space-y-2">
            <div v-for="group in ratingGroups" :key="group.title">
              <button
                type="button"
                class="flex w-full items-center gap-1 text-xs font-medium text-on-surface"
                @click="toggleRatingGroup(group.title)"
              >
                <AppIcon :name="ratingGroupOpen[group.title] ? 'expand_more' : 'chevron_right'" class="text-xs" />
                {{ group.title }}
              </button>
              <div v-if="ratingGroupOpen[group.title]" class="ml-4 mt-1 space-y-0.5">
                <div
                  v-for="item in group.items"
                  :key="item.label"
                  class="flex items-center justify-between text-xs"
                >
                  <span class="text-on-surface-variant">{{ item.label }}</span>
                  <span class="font-medium text-on-surface">{{ item.value ?? '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

export interface SidebarRatingGroup {
  title: string
  items: Array<{ label: string; value: number | null }>
}

const props = defineProps<{
  modelValue: string
  placeholder: string
  anchors: Record<string, string>
  anchorCategories: Array<{ key: string; label: string }>
  ratingGroups: SidebarRatingGroup[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const sidebarOpen = ref(true)
const anchorsOpen = ref(true)
const ratingsOpen = ref(true)
const anchorCategoryOpen = reactive<Record<string, boolean>>({})
const ratingGroupOpen = reactive<Record<string, boolean>>({})

const visibleAnchorCategories = computed(() =>
  props.anchorCategories.filter((cat) => props.anchors[cat.key]?.trim())
)

const hasAnchors = computed(() => visibleAnchorCategories.value.length > 0)

function getAnchorLines(key: string): string[] {
  const text = props.anchors[key] ?? ''
  return text.split('\n').filter((l) => l.trim())
}

function toggleAnchorCategory(key: string) {
  anchorCategoryOpen[key] = !anchorCategoryOpen[key]
}

function toggleRatingGroup(title: string) {
  ratingGroupOpen[title] = !ratingGroupOpen[title]
}
</script>
