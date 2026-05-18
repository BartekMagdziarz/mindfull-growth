<template>
  <div class="space-y-6">
    <!-- Data types -->
    <section>
      <h2 class="text-base font-semibold text-on-surface">
        {{ t('profile.psychologicalProfile.wizard.scope.dataTypes.title') }}
      </h2>
      <p class="text-sm text-on-surface-variant mt-1">
        {{ t('profile.psychologicalProfile.wizard.scope.dataTypes.help') }}
      </p>
      <div class="mt-3 space-y-2">
        <label
          v-for="type in PROFILE_DATA_TYPES"
          :key="type"
          class="neo-surface rounded-2xl p-3 flex items-center gap-3 cursor-pointer"
          :class="{ 'opacity-70': !isTypeEnabled(type) }"
        >
          <input
            type="checkbox"
            class="neo-checkbox"
            :checked="isTypeEnabled(type)"
            :data-test-type="type"
            @change="toggleType(type)"
          />
          <AppIcon :name="DATA_TYPE_ICONS[type]" class="text-xl text-primary" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-on-surface">
              {{ t(`profile.psychologicalProfile.wizard.scope.types.${type}.title`) }}
            </p>
            <p class="text-xs text-on-surface-variant">
              {{ t(`profile.psychologicalProfile.wizard.scope.types.${type}.help`) }}
            </p>
          </div>
        </label>
      </div>
    </section>

    <!-- Date range -->
    <section>
      <h2 class="text-base font-semibold text-on-surface">
        {{ t('profile.psychologicalProfile.wizard.scope.dateRange.title') }}
      </h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="preset in DATE_PRESETS"
          :key="preset"
          type="button"
          class="neo-pill px-3 py-1.5 text-sm"
          :class="{ 'neo-pill--primary': isPresetActive(preset) }"
          :data-test-preset="preset"
          @click="selectPreset(preset)"
        >
          {{ t(`profile.psychologicalProfile.wizard.scope.dateRange.presets.${preset}`) }}
        </button>
        <button
          type="button"
          class="neo-pill px-3 py-1.5 text-sm"
          :class="{ 'neo-pill--primary': props.dateRange.kind === 'custom' }"
          data-test-preset="custom"
          @click="selectCustom()"
        >
          {{ t('profile.psychologicalProfile.wizard.scope.dateRange.presets.custom') }}
        </button>
      </div>

      <div v-if="props.dateRange.kind === 'custom'" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <span class="block text-xs text-on-surface-variant mb-1">
            {{ t('profile.psychologicalProfile.wizard.scope.dateRange.start') }}
          </span>
          <input
            type="date"
            class="neo-input w-full p-3 text-sm"
            :value="customStart"
            data-test-custom-start
            @input="updateCustomStart(($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="block">
          <span class="block text-xs text-on-surface-variant mb-1">
            {{ t('profile.psychologicalProfile.wizard.scope.dateRange.end') }}
          </span>
          <input
            type="date"
            class="neo-input w-full p-3 text-sm"
            :value="customEnd"
            data-test-custom-end
            @input="updateCustomEnd(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </section>

    <!-- Filters (optional, collapsed by default) -->
    <details class="neo-surface rounded-2xl">
      <summary class="cursor-pointer p-3 text-sm font-medium text-on-surface">
        {{ t('profile.psychologicalProfile.wizard.scope.filters.title') }}
      </summary>
      <div class="px-3 pb-4 space-y-4">
        <!-- Emotion quadrants -->
        <div>
          <p class="text-xs text-on-surface-variant mb-2">
            {{ t('profile.psychologicalProfile.wizard.scope.filters.emotionQuadrants') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="code in EMOTION_QUADRANT_CODES"
              :key="code"
              type="button"
              class="neo-pill px-3 py-1.5 text-xs"
              :class="{ 'neo-pill--primary': isQuadrantActive(code) }"
              :data-test-quadrant="code"
              @click="toggleQuadrant(code)"
            >
              {{ t(`profile.psychologicalProfile.wizard.scope.filters.quadrants.${code}`) }}
            </button>
          </div>
        </div>

        <!-- Life areas -->
        <div v-if="lifeAreaOptions.length > 0">
          <p class="text-xs text-on-surface-variant mb-2">
            {{ t('profile.psychologicalProfile.wizard.scope.filters.lifeAreas') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="la in lifeAreaOptions"
              :key="la.id"
              type="button"
              class="neo-pill px-3 py-1.5 text-xs"
              :class="{ 'neo-pill--primary': isFilterActive('lifeAreaIds', la.id) }"
              @click="toggleFilter('lifeAreaIds', la.id)"
            >
              {{ la.name }}
            </button>
          </div>
        </div>

        <!-- People tags -->
        <div v-if="peopleTagOptions.length > 0">
          <p class="text-xs text-on-surface-variant mb-2">
            {{ t('profile.psychologicalProfile.wizard.scope.filters.peopleTags') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in peopleTagOptions"
              :key="tag.id"
              type="button"
              class="neo-pill px-3 py-1.5 text-xs"
              :class="{ 'neo-pill--primary': isFilterActive('peopleTagIds', tag.id) }"
              @click="toggleFilter('peopleTagIds', tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>

        <!-- Context tags -->
        <div v-if="contextTagOptions.length > 0">
          <p class="text-xs text-on-surface-variant mb-2">
            {{ t('profile.psychologicalProfile.wizard.scope.filters.contextTags') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in contextTagOptions"
              :key="tag.id"
              type="button"
              class="neo-pill px-3 py-1.5 text-xs"
              :class="{ 'neo-pill--primary': isFilterActive('contextTagIds', tag.id) }"
              @click="toggleFilter('contextTagIds', tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useTagStore } from '@/stores/tag.store'
import {
  PROFILE_DATA_TYPES,
  type ProfileDataType,
  type ProfileDateRange,
  type ProfileDateRangePreset,
  type ProfileScopeFilters,
} from '@/domain/userProfile'

const props = defineProps<{
  dataTypes: ProfileDataType[]
  dateRange: ProfileDateRange
  filters: ProfileScopeFilters
}>()

const emit = defineEmits<{
  'update:dataTypes': [types: ProfileDataType[]]
  'update:dateRange': [range: ProfileDateRange]
  'update:filters': [filters: ProfileScopeFilters]
}>()

const { t } = useT()
const lifeAreaStore = useLifeAreaStore()
const tagStore = useTagStore()

const DATE_PRESETS: ProfileDateRangePreset[] = ['last30', 'last90', 'last12m', 'all']

const EMOTION_QUADRANT_CODES = ['hp-he', 'hp-le', 'lp-he', 'lp-le'] as const
type EmotionQuadrantCode = (typeof EMOTION_QUADRANT_CODES)[number]

// Material Symbols icons per data type.
const DATA_TYPE_ICONS: Record<ProfileDataType, string> = {
  journal: 'edit_note',
  emotionLogs: 'mood',
  exerciseSessions: 'self_improvement',
  weeklyReflections: 'calendar_view_week',
  monthlyReflections: 'calendar_month',
  foundation: 'foundation',
  planning: 'flag',
}

const lifeAreaOptions = computed(() => lifeAreaStore.sortedLifeAreas)
const peopleTagOptions = computed(() => tagStore.peopleTags)
const contextTagOptions = computed(() => tagStore.contextTags)

// --- Data types ---------------------------------------------------------
function isTypeEnabled(type: ProfileDataType): boolean {
  return props.dataTypes.includes(type)
}

function toggleType(type: ProfileDataType): void {
  const next = props.dataTypes.includes(type)
    ? props.dataTypes.filter((t) => t !== type)
    : [...props.dataTypes, type]
  emit('update:dataTypes', next)
}

// --- Date presets -------------------------------------------------------
function isPresetActive(preset: ProfileDateRangePreset): boolean {
  return props.dateRange.kind === 'preset' && props.dateRange.preset === preset
}

function selectPreset(preset: ProfileDateRangePreset): void {
  emit('update:dateRange', { kind: 'preset', preset })
}

const customStart = computed(() =>
  props.dateRange.kind === 'custom' ? props.dateRange.start : '',
)
const customEnd = computed(() =>
  props.dateRange.kind === 'custom' ? props.dateRange.end : '',
)

function selectCustom(): void {
  if (props.dateRange.kind === 'custom') return
  const today = new Date().toISOString().slice(0, 10)
  const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  emit('update:dateRange', { kind: 'custom', start: ninetyAgo, end: today })
}

function updateCustomStart(start: string): void {
  if (props.dateRange.kind !== 'custom') return
  emit('update:dateRange', { ...props.dateRange, start })
}

function updateCustomEnd(end: string): void {
  if (props.dateRange.kind !== 'custom') return
  emit('update:dateRange', { ...props.dateRange, end })
}

// --- Filters ------------------------------------------------------------
function isQuadrantActive(code: EmotionQuadrantCode): boolean {
  return props.filters.emotionQuadrants?.includes(code) ?? false
}

function toggleQuadrant(code: EmotionQuadrantCode): void {
  const current = props.filters.emotionQuadrants ?? []
  const next = current.includes(code)
    ? current.filter((c) => c !== code)
    : [...current, code]
  emit('update:filters', { ...props.filters, emotionQuadrants: next })
}

type TagFilterKey = 'lifeAreaIds' | 'peopleTagIds' | 'contextTagIds'

function isFilterActive(key: TagFilterKey, id: string): boolean {
  return props.filters[key]?.includes(id) ?? false
}

function toggleFilter(key: TagFilterKey, id: string): void {
  const current = props.filters[key] ?? []
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id]
  emit('update:filters', { ...props.filters, [key]: next })
}
</script>
