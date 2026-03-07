<template>
  <div class="space-y-5">
    <div>
      <label for="habit-name" class="block text-sm font-medium text-on-surface mb-1">
        {{ t('habits.form.nameLabel') }} <span class="text-error">*</span>
      </label>
      <input
        id="habit-name"
        v-model="form.name"
        type="text"
        :placeholder="t('habits.form.namePlaceholder')"
        class="neo-input w-full px-3 py-2"
      />
    </div>

    <div>
      <label for="habit-cadence" class="block text-sm font-medium text-on-surface mb-1">
        {{ t('habits.form.cadenceLabel') }}
      </label>
      <select
        id="habit-cadence"
        v-model="form.cadence"
        class="neo-input w-full px-3 py-2"
      >
        <option value="weekly">{{ t('habits.form.cadenceOptions.weekly') }}</option>
        <option value="monthly">{{ t('habits.form.cadenceOptions.monthly') }}</option>
      </select>
    </div>

    <!-- Tracker Configuration -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-on-surface">{{ t('habits.form.trackingTypeLabel') }}</label>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in trackerTypeOptions"
          :key="option.value"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
          :class="
            form.trackerType === option.value
              ? 'shadow-neu-pressed bg-neu-base text-primary border-neu-border/40'
              : 'bg-surface text-on-surface border-neu-border/30 hover:bg-section'
          "
          @click="setTrackerType(option.value)"
        >
          <component :is="option.icon" class="w-4 h-4" />
          {{ option.label }}
        </button>
      </div>

      <!-- Completion config -->
      <div v-if="form.trackerType === 'adherence'" class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-on-surface-variant mb-1">
            {{ t('habits.form.targetPerPeriodLabel') }}
          </label>
          <input
            v-model.number="form.targetCount"
            type="number"
            min="1"
            :placeholder="t('habits.form.targetPerPeriodPlaceholder')"
            class="neo-input w-full px-3 py-2"
          />
        </div>
      </div>

      <!-- Value config -->
      <div v-if="form.trackerType === 'value'" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('habits.form.targetLabel') }}
            </label>
            <input
              v-model.number="form.targetValue"
              type="number"
              :placeholder="t('habits.form.targetPlaceholder')"
              class="neo-input w-full px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('habits.form.unitLabel') }}
            </label>
            <input
              v-model="form.unit"
              type="text"
              :placeholder="t('habits.form.unitPlaceholder')"
              class="neo-input w-full px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-on-surface-variant mb-1">
            {{ t('habits.form.directionLabel') }}
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              :class="
                form.direction === 'increase'
                  ? 'shadow-neu-pressed bg-neu-base text-primary border-neu-border/40'
                  : 'bg-surface text-on-surface border-neu-border/30 hover:bg-section'
              "
              @click="form.direction = 'increase'"
            >
              <ArrowUpIcon class="w-3.5 h-3.5" />
              {{ t('habits.form.directionIncrease') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              :class="
                form.direction === 'decrease'
                  ? 'shadow-neu-pressed bg-neu-base text-primary border-neu-border/40'
                  : 'bg-surface text-on-surface border-neu-border/30 hover:bg-section'
              "
              @click="form.direction = 'decrease'"
            >
              <ArrowDownIcon class="w-3.5 h-3.5" />
              {{ t('habits.form.directionDecrease') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Rating config -->
      <div v-if="form.trackerType === 'rating'" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('habits.form.scaleFromLabel') }}
            </label>
            <input
              v-model.number="form.ratingScaleMin"
              type="number"
              class="neo-input w-full px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('habits.form.scaleToLabel') }}
            </label>
            <input
              v-model.number="form.ratingScaleMax"
              type="number"
              class="neo-input w-full px-3 py-2"
            />
          </div>
        </div>
      </div>

    </div>

    <!-- Links -->
    <div class="space-y-2">
      <label class="block text-sm font-medium text-on-surface mb-1">{{ t('habits.form.linksLabel') }}</label>

      <div v-if="selectedLifeAreas.length" class="space-y-1">
        <p class="text-[11px] font-medium text-on-surface-variant">{{ t('habits.form.lifeAreasLabel') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <LinkedPill
            v-for="lifeArea in selectedLifeAreas"
            :key="lifeArea.id"
            :label="lifeArea.name"
            :color="lifeArea.color"
            @remove="removeLifeArea(lifeArea.id)"
          />
        </div>
      </div>

      <div v-if="selectedPriorities.length" class="space-y-1">
        <p class="text-[11px] font-medium text-on-surface-variant">{{ t('habits.form.prioritiesLabel') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <LinkedPill
            v-for="priority in selectedPriorities"
            :key="priority.id"
            :label="priority.name"
            @remove="removePriority(priority.id)"
          />
        </div>
      </div>

      <CascadingLinkMenu
        :categories="linkCategories"
        :items-by-category="linkItemsByCategory"
        @select="handleAddLink"
      />
    </div>

    <div class="flex items-center gap-3">
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="form.isActive" class="sr-only peer" />
        <div
          class="w-11 h-6 bg-section rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"
        />
      </label>
      <span class="text-sm text-on-surface">{{ t('habits.form.activeLabel') }}</span>
    </div>

    <div class="flex items-center gap-3">
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="form.isPaused" class="sr-only peer" />
        <div
          class="w-11 h-6 bg-section rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning"
        />
      </label>
      <span class="text-sm text-on-surface">{{ t('habits.form.pausedLabel') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LinkedPill from '@/components/planning/LinkedPill.vue'
import CascadingLinkMenu from '@/components/planning/CascadingLinkMenu.vue'
import { useT } from '@/composables/useT'
import type { LifeArea } from '@/domain/lifeArea'
import type { Priority, TrackerType, ValueDirection } from '@/domain/planning'
import {
  ChartBarIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/vue/20/solid'

const { t } = useT()

export interface HabitFormData {
  name: string
  cadence: 'weekly' | 'monthly'
  lifeAreaIds: string[]
  priorityIds: string[]
  isActive: boolean
  isPaused: boolean
  // Tracker config (embedded)
  trackerType: TrackerType
  targetCount?: number
  targetValue?: number
  baselineValue?: number
  direction?: ValueDirection
  unit?: string
  ratingScaleMin?: number
  ratingScaleMax?: number
  rollup?: 'sum' | 'average' | 'last'
}

const props = defineProps<{
  lifeAreas: LifeArea[]
  priorities: Priority[]
}>()

const form = defineModel<HabitFormData>('form', { required: true })

const trackerTypeOptions = computed(() => [
  { value: 'count' as TrackerType, label: t('habits.form.trackerTypes.count'), icon: ChartBarIcon },
  { value: 'adherence' as TrackerType, label: t('habits.form.trackerTypes.adherence'), icon: CheckCircleIcon },
  { value: 'value' as TrackerType, label: t('habits.form.trackerTypes.value'), icon: ArrowTrendingUpIcon },
  { value: 'rating' as TrackerType, label: t('habits.form.trackerTypes.rating'), icon: StarIcon },
])

function setTrackerType(type: TrackerType) {
  form.value.trackerType = type
  // Apply sensible defaults when switching type
  if (type === 'count') {
    form.value.rollup = 'sum'
    form.value.targetCount = undefined
  } else if (type === 'adherence') {
    form.value.rollup = 'sum'
    if (!form.value.targetCount || form.value.targetCount < 1) {
      form.value.targetCount = 1
    }
  } else if (type === 'value') {
    form.value.rollup = 'last'
    if (!form.value.direction) {
      form.value.direction = 'increase'
    }
  } else if (type === 'rating') {
    form.value.rollup = 'average'
    if (!form.value.ratingScaleMin) form.value.ratingScaleMin = 1
    if (!form.value.ratingScaleMax) form.value.ratingScaleMax = 10
  }
}

const selectedLifeAreas = computed(() =>
  form.value.lifeAreaIds
    .map((id) => props.lifeAreas.find((la) => la.id === id))
    .filter(Boolean) as LifeArea[]
)

const selectedPriorities = computed(() =>
  form.value.priorityIds
    .map((id) => props.priorities.find((p) => p.id === id))
    .filter(Boolean) as Priority[]
)

const linkCategories = computed(() => [
  { id: 'lifeArea', label: t('habits.form.linkCategories.lifeArea') },
  { id: 'priority', label: t('habits.form.linkCategories.priority') },
])

const linkItemsByCategory = computed(() => {
  const lifeAreaOptions = props.lifeAreas
    .filter((la) => !form.value.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))
  const priorityOptions = props.priorities
    .filter((p) => !form.value.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    form.value.lifeAreaIds = [...form.value.lifeAreaIds, payload.itemId]
  }
  if (payload.category === 'priority') {
    form.value.priorityIds = [...form.value.priorityIds, payload.itemId]
  }
}

function removeLifeArea(id: string) {
  form.value.lifeAreaIds = form.value.lifeAreaIds.filter((item) => item !== id)
}

function removePriority(id: string) {
  form.value.priorityIds = form.value.priorityIds.filter((item) => item !== id)
}
</script>
