<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="(label, index) in stepLabels"
        :key="label"
        type="button"
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        :class="index === step
          ? 'bg-primary text-on-primary shadow-neu-raised-sm'
          : index < step
            ? 'bg-primary/15 text-primary'
            : 'bg-outline/10 text-on-surface-variant'"
        @click="index < step && (step = index)"
      >
        {{ index + 1 }}. {{ label }}
      </button>
    </div>

    <AppCard v-if="step === 0" padding="lg" class="space-y-5">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-on-surface">
          {{ t('exerciseWizards.valueMap.start.title') }}
        </h2>
        <p class="text-sm leading-6 text-on-surface-variant">
          {{ t('exerciseWizards.valueMap.start.description') }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="item in startHighlights"
          :key="item.icon"
          class="rounded-lg border border-neu-border/20 bg-section p-4"
        >
          <AppIcon :name="item.icon" class="mb-2 text-xl text-primary" />
          <p class="text-sm font-medium text-on-surface">{{ item.title }}</p>
          <p class="mt-1 text-xs leading-5 text-on-surface-variant">{{ item.body }}</p>
        </div>
      </div>
    </AppCard>

    <template v-else-if="step === 1">
      <AppCard padding="lg" class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-on-surface">
              {{ t('exerciseWizards.valueMap.sort.title') }}
            </h2>
            <p class="mt-1 text-sm text-on-surface-variant">
              {{ t('exerciseWizards.valueMap.sort.description') }}
            </p>
          </div>
          <div class="text-right text-xs text-on-surface-variant">
            {{ sortedCount }} / {{ allValues.length }}
          </div>
        </div>

      </AppCard>

      <div class="grid grid-cols-5 gap-3">
        <section
          v-for="category in importanceCategories"
          :key="category.id"
          class="min-h-[420px] rounded-lg border border-neu-border/20 bg-section p-3"
          @dragover.prevent
          @drop="handleDrop(category.id)"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-on-surface">{{ category.label }}</h3>
            <span class="text-xs font-medium text-on-surface-variant">{{ valuesByCategory[category.id].length }}</span>
          </div>
          <div class="space-y-2">
            <article
              v-for="value in valuesByCategory[category.id]"
              :key="value.id"
              class="group relative w-full rounded-lg border border-neu-border/20 bg-neu-base px-3 pb-4 pt-3 text-left shadow-neu-raised-sm transition hover:-translate-y-px hover:shadow-neu-raised"
              draggable="true"
              @dragstart="draggedValueId = value.id"
            >
              <p class="text-sm font-semibold text-on-surface">{{ value.label }}</p>
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="max-h-0 opacity-0"
                enter-to-class="max-h-24 opacity-100"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="max-h-24 opacity-100"
                leave-to-class="max-h-0 opacity-0"
              >
                <p v-if="isValueExpanded(value.id)" class="mt-2 overflow-hidden text-xs leading-5 text-on-surface-variant">
                  {{ value.description }}
                </p>
              </Transition>
              <button
                type="button"
                class="absolute -bottom-2 left-1/2 z-10 inline-flex h-5 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-neu-border/40 bg-neu-base text-on-surface-variant shadow-neu-raised-sm transition-all duration-200 hover:text-primary neo-focus"
                :class="isValueExpanded(value.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'"
                :aria-label="isValueExpanded(value.id)
                  ? t('exerciseWizards.valueMap.sort.collapseDescription')
                  : t('exerciseWizards.valueMap.sort.expandDescription')"
                @click.stop="toggleValueExpanded(value.id)"
              >
                <AppIcon
                  name="expand_more"
                  class="text-xs transition-transform duration-200"
                  :class="isValueExpanded(value.id) ? 'rotate-180 text-primary-strong' : ''"
                />
              </button>
            </article>
          </div>
        </section>
      </div>

      <AppCard padding="lg" class="space-y-3" @dragover.prevent @drop="handleUnsortedDrop">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-on-surface">
            {{ t('exerciseWizards.valueMap.sort.unsortedTitle') }}
          </h3>
          <span class="text-xs font-medium text-on-surface-variant">{{ unsortedValues.length }}</span>
        </div>
        <div v-if="unsortedValues.length > 0" class="grid grid-cols-3 gap-2">
          <article
            v-for="value in unsortedValues"
            :key="value.id"
            class="group relative rounded-lg border border-neu-border/20 bg-section px-3 pb-4 pt-3"
            draggable="true"
            @dragstart="draggedValueId = value.id"
          >
            <p class="text-sm font-semibold text-on-surface">{{ value.label }}</p>
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="max-h-0 opacity-0"
              enter-to-class="max-h-24 opacity-100"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="max-h-24 opacity-100"
              leave-to-class="max-h-0 opacity-0"
            >
              <p v-if="isValueExpanded(value.id)" class="mt-2 overflow-hidden text-xs leading-5 text-on-surface-variant">
                {{ value.description }}
              </p>
            </Transition>
            <button
              type="button"
              class="absolute -bottom-2 left-1/2 z-10 inline-flex h-5 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-neu-border/40 bg-neu-base text-on-surface-variant shadow-neu-raised-sm transition-all duration-200 hover:text-primary neo-focus"
              :class="isValueExpanded(value.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'"
              :aria-label="isValueExpanded(value.id)
                ? t('exerciseWizards.valueMap.sort.collapseDescription')
                : t('exerciseWizards.valueMap.sort.expandDescription')"
              @click.stop="toggleValueExpanded(value.id)"
            >
              <AppIcon
                name="expand_more"
                class="text-xs transition-transform duration-200"
                :class="isValueExpanded(value.id) ? 'rotate-180 text-primary-strong' : ''"
              />
            </button>
          </article>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-3 pt-2">
          <input
            v-model="customValueInput"
            type="text"
            class="neo-input p-3 text-sm"
            :placeholder="t('exerciseWizards.valueMap.sort.customPlaceholder')"
            @keydown.enter.prevent="addCustomValue"
          />
          <AppButton variant="tonal" :disabled="customValueInput.trim().length === 0" @click="addCustomValue">
            <AppIcon name="add" class="text-base" />
            {{ t('exerciseWizards.valueMap.sort.addCustom') }}
          </AppButton>
        </div>
      </AppCard>
    </template>

    <AppCard v-else-if="step === 2" padding="lg" class="space-y-4">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-on-surface">
          {{ t('exerciseWizards.valueMap.narrow.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.valueMap.narrow.description') }}
        </p>
      </div>

      <div
        v-if="topCandidateValues.length < 5"
        class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-on-surface"
      >
        {{ t('exerciseWizards.valueMap.narrow.tooFewCandidates') }}
      </div>
      <div
        v-else-if="selectedTopIds.length < 5 || selectedTopIds.length > 10"
        class="rounded-lg border border-neu-border/20 bg-section p-3 text-sm text-on-surface"
      >
        {{ t('exerciseWizards.valueMap.narrow.selectionHint', { count: selectedTopIds.length }) }}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="value in topCandidateValues"
          :key="value.id"
          type="button"
          class="rounded-lg border p-3 text-left transition"
          :class="selectedTopIds.includes(value.id)
            ? 'border-primary bg-primary/10 shadow-neu-pressed'
            : 'border-neu-border/20 bg-section hover:bg-neu-base'"
          @click="toggleSelectedTop(value.id)"
        >
          <span class="block text-sm font-semibold text-on-surface">{{ value.label }}</span>
          <span class="mt-1 block text-xs leading-5 text-on-surface-variant">{{ value.description }}</span>
        </button>
      </div>
    </AppCard>

    <AppCard v-else-if="step === 3" padding="lg" class="space-y-4">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.rank.title') }}</h2>
        <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.valueMap.rank.description') }}</p>
      </div>

      <div class="space-y-2">
        <div
          v-for="(valueId, index) in rankedIds"
          :key="valueId"
          class="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg border border-neu-border/20 bg-section p-3"
          draggable="true"
          @dragstart="draggedRankId = valueId"
          @dragover.prevent
          @drop="dropRankAt(index)"
        >
          <div class="text-center text-sm font-bold text-primary">#{{ index + 1 }}</div>
          <div>
            <p class="text-sm font-semibold text-on-surface">{{ getValueLabel(valueId) }}</p>
            <p class="text-xs text-on-surface-variant">
              {{ index < 3 ? t('exerciseWizards.valueMap.rank.core') : t('exerciseWizards.valueMap.rank.supporting') }}
            </p>
          </div>
          <div class="flex items-center gap-1">
            <button class="rounded p-2 text-on-surface-variant hover:bg-neu-base" :disabled="index === 0" @click="moveRank(index, -1)">
              <AppIcon name="keyboard_arrow_up" />
            </button>
            <button class="rounded p-2 text-on-surface-variant hover:bg-neu-base" :disabled="index === rankedIds.length - 1" @click="moveRank(index, 1)">
              <AppIcon name="keyboard_arrow_down" />
            </button>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard v-else-if="step === 4" padding="lg" class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.meaning.title') }}</h2>
        <p class="mt-1 text-sm text-on-surface-variant">{{ t('exerciseWizards.valueMap.meaning.description') }}</p>
      </div>

      <div class="space-y-3">
        <label v-for="(valueId, index) in rankedIds" :key="valueId" class="block space-y-2">
          <span class="text-sm font-semibold text-on-surface">
            #{{ index + 1 }} {{ getValueLabel(valueId) }}
            <span v-if="index < 3" class="text-error">*</span>
          </span>
          <textarea
            v-model="personalMeanings[valueId]"
            rows="3"
            class="neo-input w-full resize-none p-3 text-sm"
            :placeholder="t('exerciseWizards.valueMap.meaning.placeholder')"
          />
        </label>
      </div>
    </AppCard>

    <AppCard v-else-if="step === 5" padding="lg" class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.conflicts.title') }}</h2>
        <p class="mt-1 text-sm text-on-surface-variant">{{ t('exerciseWizards.valueMap.conflicts.description') }}</p>
      </div>

      <div v-for="valueId in coreRankedIds" :key="valueId" class="rounded-lg border border-neu-border/20 bg-section p-4">
        <label class="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <input v-model="conflictEnabled[valueId]" type="checkbox" />
          {{ t('exerciseWizards.valueMap.conflicts.itemQuestion', { value: getValueLabel(valueId) }) }}
        </label>
        <div v-if="conflictEnabled[valueId]" class="mt-3 grid grid-cols-[1fr_1.4fr] gap-3">
          <select v-model="conflictTargets[valueId]" class="neo-input p-2 text-sm">
            <option value="">{{ t('exerciseWizards.valueMap.conflicts.chooseValue') }}</option>
            <option
              v-for="option in rankedIds.filter((id) => id !== valueId)"
              :key="option"
              :value="option"
            >
              {{ getValueLabel(option) }}
            </option>
          </select>
          <input
            v-model="conflictNotes[valueId]"
            type="text"
            class="neo-input p-2 text-sm"
            :placeholder="t('exerciseWizards.valueMap.conflicts.notePlaceholder')"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div
          v-for="(conflict, index) in extraConflicts"
          :key="index"
          class="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2"
        >
          <select v-model="conflict.valueId" class="neo-input p-2 text-sm">
            <option value="">{{ t('exerciseWizards.valueMap.conflicts.valueA') }}</option>
            <option v-for="id in rankedIds" :key="id" :value="id">{{ getValueLabel(id) }}</option>
          </select>
          <select v-model="conflict.conflictingValueId" class="neo-input p-2 text-sm">
            <option value="">{{ t('exerciseWizards.valueMap.conflicts.valueB') }}</option>
            <option v-for="id in rankedIds.filter((id) => id !== conflict.valueId)" :key="id" :value="id">{{ getValueLabel(id) }}</option>
          </select>
          <input v-model="conflict.note" type="text" class="neo-input p-2 text-sm" :placeholder="t('exerciseWizards.valueMap.conflicts.notePlaceholder')" />
          <button class="rounded-lg p-2 text-on-surface-variant hover:bg-section hover:text-error" @click="extraConflicts.splice(index, 1)">
            <AppIcon name="close" />
          </button>
        </div>
        <AppButton variant="tonal" :disabled="compiledGlobalConflicts.length >= 5" @click="addExtraConflict">
          <AppIcon name="add" class="text-base" />
          {{ t('exerciseWizards.valueMap.conflicts.addExtra') }}
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-else-if="step === 6" padding="lg" class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.areas.title') }}</h2>
          <p class="mt-1 text-sm text-on-surface-variant">{{ t('exerciseWizards.valueMap.areas.description') }}</p>
        </div>
        <AppButton variant="text" @click="router.push('/areas')">
          {{ t('exerciseWizards.valueMap.areas.manage') }}
        </AppButton>
      </div>

      <div v-if="lifeAreaStore.activeLifeAreas.length === 0" class="rounded-lg bg-section p-4 text-sm text-on-surface-variant">
        {{ t('exerciseWizards.valueMap.areas.empty') }}
      </div>

      <div v-for="area in lifeAreaStore.activeLifeAreas" :key="area.id" class="space-y-3 rounded-lg border border-neu-border/20 bg-section p-4">
        <h3 class="text-sm font-semibold text-on-surface">{{ area.name }}</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="valueId in areaAssignments[area.id] ?? []"
            :key="valueId"
            type="button"
            class="rounded-full bg-chip px-3 py-1 text-xs text-on-surface"
            @click="removeAreaValue(area.id, valueId)"
          >
            {{ getValueLabel(valueId) }} x
          </button>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-2">
          <select v-model="areaValuePicker[area.id]" class="neo-input p-2 text-sm">
            <option value="">{{ t('exerciseWizards.valueMap.areas.chooseValue') }}</option>
            <option
              v-for="value in allValues"
              :key="value.id"
              :value="value.id"
              :disabled="(areaAssignments[area.id] ?? []).includes(value.id)"
            >
              {{ value.label }}
            </option>
          </select>
          <AppButton
            variant="tonal"
            :disabled="!canAddAreaValue(area.id)"
            @click="addAreaValue(area.id)"
          >
            <AppIcon name="add" class="text-base" />
            {{ t('exerciseWizards.valueMap.areas.add') }}
          </AppButton>
        </div>

        <label class="flex items-center gap-2 text-sm text-on-surface">
          <input v-model="areaTensionEnabled[area.id]" type="checkbox" />
          {{ t('exerciseWizards.valueMap.areas.tensionQuestion') }}
        </label>
        <div v-if="areaTensionEnabled[area.id]" class="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          <select v-model="areaTensionA[area.id]" class="neo-input p-2 text-sm">
            <option value="">{{ t('exerciseWizards.valueMap.conflicts.valueA') }}</option>
            <option v-for="id in areaAssignments[area.id] ?? []" :key="id" :value="id">{{ getValueLabel(id) }}</option>
          </select>
          <select v-model="areaTensionB[area.id]" class="neo-input p-2 text-sm">
            <option value="">{{ t('exerciseWizards.valueMap.conflicts.valueB') }}</option>
            <option v-for="id in (areaAssignments[area.id] ?? []).filter((id) => id !== areaTensionA[area.id])" :key="id" :value="id">{{ getValueLabel(id) }}</option>
          </select>
          <input v-model="areaTensionNotes[area.id]" class="neo-input p-2 text-sm" :placeholder="t('exerciseWizards.valueMap.conflicts.notePlaceholder')" />
        </div>
      </div>
    </AppCard>

    <AppCard v-else padding="lg" class="space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.summary.title') }}</h2>
        <p class="mt-1 text-sm text-on-surface-variant">{{ t('exerciseWizards.valueMap.summary.description') }}</p>
      </div>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.summary.core') }}</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="id in coreRankedIds" :key="id" class="rounded-full bg-primary/15 px-3 py-1 text-sm text-primary">
            {{ getValueLabel(id) }}
          </span>
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.summary.supporting') }}</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="id in supportingRankedIds" :key="id" class="rounded-full bg-chip px-3 py-1 text-sm text-on-surface">
            {{ getValueLabel(id) }}
          </span>
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.summary.conflicts') }}</h3>
        <p v-if="compiledGlobalConflicts.length === 0" class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.valueMap.summary.noConflicts') }}
        </p>
        <div v-for="conflict in compiledGlobalConflicts" :key="`${conflict.valueId}-${conflict.conflictingValueId}`" class="rounded-lg bg-section p-3 text-sm">
          <span class="font-medium text-on-surface">{{ getValueLabel(conflict.valueId) }}</span>
          <span class="text-on-surface-variant"> <-> </span>
          <span class="font-medium text-on-surface">{{ getValueLabel(conflict.conflictingValueId) }}</span>
          <p v-if="conflict.note" class="mt-1 text-xs text-on-surface-variant">{{ conflict.note }}</p>
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.valueMap.summary.areas') }}</h3>
        <div v-for="assignment in compiledLifeAreaAssignments" :key="assignment.lifeAreaId" class="rounded-lg bg-section p-3">
          <p class="text-sm font-medium text-on-surface">{{ getLifeAreaName(assignment.lifeAreaId) }}</p>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{ assignment.valueIds.map(getValueLabel).join(', ') || t('exerciseWizards.valueMap.summary.noAreaValues') }}
          </p>
        </div>
      </section>

      <textarea
        v-model="notes"
        rows="3"
        class="neo-input w-full resize-none p-3 text-sm"
        :placeholder="t('exerciseWizards.valueMap.summary.notesPlaceholder')"
      />
    </AppCard>

    <div class="flex justify-between">
      <AppButton variant="text" :disabled="step === 0" @click="step -= 1">
        {{ t('exerciseWizards.valueMap.back') }}
      </AppButton>
      <AppButton v-if="step < stepLabels.length - 1" variant="filled" :disabled="!canContinue" @click="handleNext">
        {{ t('exerciseWizards.valueMap.continue') }}
      </AppButton>
      <AppButton v-else variant="filled" :disabled="!canSave" @click="handleSave">
        {{ t('exerciseWizards.valueMap.save') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import valueCatalog from '@/data/valueCatalog.json'
import type { ValueImportance, ValueMapConflict } from '@/domain/exercises'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useValueMapStore } from '@/stores/valueMap.store'
import { useT } from '@/composables/useT'

type CatalogLocale = 'en' | 'pl'
type SortValue = ValueImportance | ''

interface DisplayValue {
  id: string
  label: string
  description: string
  sourceTags: string[]
}

const emit = defineEmits<{
  saved: [id: string]
}>()

const router = useRouter()
const { t, locale } = useT()
const valueMapStore = useValueMapStore()
const lifeAreaStore = useLifeAreaStore()

const step = ref(0)
const customValueInput = ref('')
const draggedValueId = ref<string | null>(null)
const draggedRankId = ref<string | null>(null)
const rankedIds = ref<string[]>([])
const selectedTopIds = ref<string[]>([])
const notes = ref('')
const expandedValueIds = ref<Set<string>>(new Set())

const sortState = reactive<Record<string, SortValue>>({})
const customValues = reactive<{ id: string; label: string }[]>([])
const personalMeanings = reactive<Record<string, string>>({})
const conflictEnabled = reactive<Record<string, boolean>>({})
const conflictTargets = reactive<Record<string, string>>({})
const conflictNotes = reactive<Record<string, string>>({})
const extraConflicts = reactive<Array<ValueMapConflict>>([])
const areaAssignments = reactive<Record<string, string[]>>({})
const areaValuePicker = reactive<Record<string, string>>({})
const areaTensionEnabled = reactive<Record<string, boolean>>({})
const areaTensionA = reactive<Record<string, string>>({})
const areaTensionB = reactive<Record<string, string>>({})
const areaTensionNotes = reactive<Record<string, string>>({})

const stepLabels = computed(() => [
  t('exerciseWizards.valueMap.steps.start'),
  t('exerciseWizards.valueMap.steps.sort'),
  t('exerciseWizards.valueMap.steps.narrow'),
  t('exerciseWizards.valueMap.steps.rank'),
  t('exerciseWizards.valueMap.steps.meaning'),
  t('exerciseWizards.valueMap.steps.conflicts'),
  t('exerciseWizards.valueMap.steps.areas'),
  t('exerciseWizards.valueMap.steps.summary'),
])

const importanceCategories = computed<Array<{ id: ValueImportance; label: string }>>(() => [
  { id: 'mostImportant', label: t('exerciseWizards.valueMap.importance.mostImportant') },
  { id: 'veryImportant', label: t('exerciseWizards.valueMap.importance.veryImportant') },
  { id: 'important', label: t('exerciseWizards.valueMap.importance.important') },
  { id: 'somewhatImportant', label: t('exerciseWizards.valueMap.importance.somewhatImportant') },
  { id: 'notImportant', label: t('exerciseWizards.valueMap.importance.notImportant') },
])

const startHighlights = computed(() => [
  {
    icon: 'sort',
    title: t('exerciseWizards.valueMap.start.sortTitle'),
    body: t('exerciseWizards.valueMap.start.sortBody'),
  },
  {
    icon: 'format_list_numbered',
    title: t('exerciseWizards.valueMap.start.rankTitle'),
    body: t('exerciseWizards.valueMap.start.rankBody'),
  },
  {
    icon: 'sync_alt',
    title: t('exerciseWizards.valueMap.start.conflictsTitle'),
    body: t('exerciseWizards.valueMap.start.conflictsBody'),
  },
  {
    icon: 'account_tree',
    title: t('exerciseWizards.valueMap.start.areasTitle'),
    body: t('exerciseWizards.valueMap.start.areasBody'),
  },
])

const catalogValues = computed<DisplayValue[]>(() => {
  const catalogLocale = locale.value as CatalogLocale
  return valueCatalog.values.map((value) => ({
    id: value.id,
    label: value.label[catalogLocale] ?? value.label.en,
    description: value.description[catalogLocale] ?? value.description.en,
    sourceTags: value.sourceTags,
  }))
})

const allValues = computed<DisplayValue[]>(() => [
  ...catalogValues.value,
  ...customValues.map((value) => ({
    id: value.id,
    label: value.label,
    description: t('exerciseWizards.valueMap.sort.customDescription'),
    sourceTags: ['custom'],
  })),
])

const valuesByCategory = computed<Record<ValueImportance, DisplayValue[]>>(() => {
  const grouped: Record<ValueImportance, DisplayValue[]> = {
    mostImportant: [],
    veryImportant: [],
    important: [],
    somewhatImportant: [],
    notImportant: [],
  }

  for (const value of allValues.value) {
    const importance = sortState[value.id]
    if (importance) grouped[importance].push(value)
  }
  return grouped
})

const unsortedValues = computed(() => allValues.value.filter((value) => !sortState[value.id]))
const sortedCount = computed(() => allValues.value.filter((value) => sortState[value.id]).length)
const topCandidateValues = computed(() =>
  allValues.value.filter((value) => ['mostImportant', 'veryImportant'].includes(sortState[value.id])),
)
const coreRankedIds = computed(() => rankedIds.value.slice(0, 3))
const supportingRankedIds = computed(() => rankedIds.value.slice(3))

const compiledGlobalConflicts = computed(() => {
  const conflicts: ValueMapConflict[] = []
  for (const valueId of coreRankedIds.value) {
    const conflictingValueId = conflictTargets[valueId]
    if (conflictEnabled[valueId] && conflictingValueId && conflictingValueId !== valueId) {
      conflicts.push({
        valueId,
        conflictingValueId,
        note: cleanOptionalText(conflictNotes[valueId]),
      })
    }
  }
  for (const conflict of extraConflicts) {
    if (conflict.valueId && conflict.conflictingValueId && conflict.valueId !== conflict.conflictingValueId) {
      conflicts.push({
        valueId: conflict.valueId,
        conflictingValueId: conflict.conflictingValueId,
        note: cleanOptionalText(conflict.note),
      })
    }
  }
  return conflicts.slice(0, 5)
})

const compiledLifeAreaAssignments = computed(() => {
  return lifeAreaStore.activeLifeAreas.map((area) => {
    const valueIds = areaAssignments[area.id] ?? []
    const tension =
      areaTensionEnabled[area.id] &&
      areaTensionA[area.id] &&
      areaTensionB[area.id] &&
      areaTensionA[area.id] !== areaTensionB[area.id]
        ? {
            valueId: areaTensionA[area.id],
            conflictingValueId: areaTensionB[area.id],
            note: cleanOptionalText(areaTensionNotes[area.id]),
          }
        : undefined

    return { lifeAreaId: area.id, valueIds, tension }
  })
})

const canContinue = computed(() => {
  switch (step.value) {
    case 0:
      return true
    case 1:
      return sortedCount.value >= 5
    case 2:
      return selectedTopIds.value.length >= 5 && selectedTopIds.value.length <= 10
    case 3:
      return rankedIds.value.length >= 5 && rankedIds.value.length <= 10
    case 4:
      return coreRankedIds.value.every((id) => personalMeanings[id]?.trim().length > 0)
    case 5:
      return compiledGlobalConflicts.value.every((conflict) => conflict.valueId !== conflict.conflictingValueId)
    case 6:
      return true
    default:
      return false
  }
})

const canSave = computed(() => rankedIds.value.length >= 5 && coreRankedIds.value.length === 3)

onMounted(() => {
  lifeAreaStore.loadLifeAreas()
})

function handleDrop(category: ValueImportance): void {
  if (!draggedValueId.value) return
  sortState[draggedValueId.value] = category
  draggedValueId.value = null
}

function handleUnsortedDrop(): void {
  if (!draggedValueId.value) return
  sortState[draggedValueId.value] = ''
  draggedValueId.value = null
}

function addCustomValue(): void {
  const label = customValueInput.value.trim()
  if (!label) return
  const id = `custom-${crypto.randomUUID()}`
  customValues.push({ id, label })
  sortState[id] = ''
  customValueInput.value = ''
}

function isValueExpanded(valueId: string): boolean {
  return expandedValueIds.value.has(valueId)
}

function toggleValueExpanded(valueId: string): void {
  const next = new Set(expandedValueIds.value)
  if (next.has(valueId)) {
    next.delete(valueId)
  } else {
    next.add(valueId)
  }
  expandedValueIds.value = next
}

function toggleSelectedTop(valueId: string): void {
  if (selectedTopIds.value.includes(valueId)) {
    selectedTopIds.value = selectedTopIds.value.filter((id) => id !== valueId)
    return
  }
  if (selectedTopIds.value.length >= 10) return
  selectedTopIds.value = [...selectedTopIds.value, valueId]
}

function handleNext(): void {
  if (step.value === 2) {
    rankedIds.value = selectedTopIds.value.filter((id) => allValues.value.some((value) => value.id === id))
  }
  step.value += 1
}

function moveRank(index: number, direction: -1 | 1): void {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= rankedIds.value.length) return
  const next = [...rankedIds.value]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  rankedIds.value = next
}

function dropRankAt(index: number): void {
  const id = draggedRankId.value
  if (!id) return
  const currentIndex = rankedIds.value.indexOf(id)
  if (currentIndex === -1 || currentIndex === index) return
  const next = [...rankedIds.value]
  next.splice(currentIndex, 1)
  next.splice(index, 0, id)
  rankedIds.value = next
  draggedRankId.value = null
}

function addExtraConflict(): void {
  if (compiledGlobalConflicts.value.length >= 5) return
  extraConflicts.push({ valueId: '', conflictingValueId: '' })
}

function canAddAreaValue(areaId: string): boolean {
  const selected = areaValuePicker[areaId]
  const current = areaAssignments[areaId] ?? []
  return Boolean(selected) && current.length < 5 && !current.includes(selected)
}

function addAreaValue(areaId: string): void {
  if (!canAddAreaValue(areaId)) return
  areaAssignments[areaId] = [...(areaAssignments[areaId] ?? []), areaValuePicker[areaId]]
  areaValuePicker[areaId] = ''
}

function removeAreaValue(areaId: string, valueId: string): void {
  areaAssignments[areaId] = (areaAssignments[areaId] ?? []).filter((id) => id !== valueId)
  if (areaTensionA[areaId] === valueId) areaTensionA[areaId] = ''
  if (areaTensionB[areaId] === valueId) areaTensionB[areaId] = ''
}

function getValueLabel(valueId: string): string {
  return allValues.value.find((value) => value.id === valueId)?.label ?? valueId
}

function getLifeAreaName(lifeAreaId: string): string {
  return lifeAreaStore.getLifeAreaById(lifeAreaId)?.name ?? lifeAreaId
}

function cleanOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : undefined
}

async function handleSave(): Promise<void> {
  const rankedValues = rankedIds.value.map((valueId, index) => ({
    valueId,
    rank: index + 1,
    personalMeaning: cleanOptionalText(personalMeanings[valueId]),
  }))

  const sort: Record<string, ValueImportance> = {}
  for (const [valueId, importance] of Object.entries(sortState)) {
    if (importance) sort[valueId] = importance
  }

  const map = await valueMapStore.createMap({
    catalogVersion: '2026-05',
    sort,
    customValues: customValues.map((value) => ({ ...value })),
    rankedValues,
    coreValues: coreRankedIds.value.map(getValueLabel),
    globalConflicts: compiledGlobalConflicts.value,
    lifeAreaAssignments: compiledLifeAreaAssignments.value,
    notes: cleanOptionalText(notes.value),
  })

  emit('saved', map.id)
}
</script>
