<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
          class="w-2.5 h-2.5 rounded-full transition-all duration-200"
          :class="idx < stepIndex
            ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
            : idx === stepIndex
              ? 'neo-step-active w-3.5 h-3.5'
              : 'neo-step-future w-2.5 h-2.5'"
          @click="idx < stepIndex && goToStep(STEPS[idx])"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[stepIndex] }}
      </span>
    </div>

    <!-- Step 1: Introduction -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <template v-if="currentStep === 'intro'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.partsMapping.intro.title') }}</h2>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.partsMapping.intro.description') }}
            </p>
            <div class="neo-surface p-4 rounded-xl space-y-4">
              <div class="flex items-start gap-3">
                <UserGroupIcon class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.partsMapping.intro.managers.title') }}</p>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.partsMapping.intro.managers.description') }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <FireIcon class="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.partsMapping.intro.firefighters.title') }}</p>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.partsMapping.intro.firefighters.description') }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <HeartIcon class="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.partsMapping.intro.exiles.title') }}</p>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.partsMapping.intro.exiles.description') }}</p>
                </div>
              </div>
            </div>
            <div class="neo-surface p-3 rounded-lg">
              <p class="text-sm italic text-on-surface-variant">
                "{{ t('exerciseWizards.partsMapping.intro.quote') }}"
                <span class="text-xs">— {{ t('exerciseWizards.partsMapping.intro.quoteAuthor') }}</span>
              </p>
            </div>

            <EmotionSelector
              v-model="beforeEmotionIds"
              :label="t('exerciseWizards.partsMapping.intro.emotionLabel')"
            />
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" @click="nextStep()">
              {{ t('exerciseWizards.partsMapping.intro.startButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Trailhead -->
      <template v-else-if="currentStep === 'trailhead'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.trailhead.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.trailhead.description') }}
            </p>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.trailhead.situationLabel') }}</label>
              <textarea
                v-model="trailheadSituation"
                rows="3"
                :placeholder="t('exerciseWizards.partsMapping.trailhead.situationPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <EmotionSelector
              v-model="trailheadEmotionIds"
              :label="t('exerciseWizards.partsMapping.trailhead.emotionsLabel')"
            />

            <BodyLocationPicker
              v-model="trailheadBodyLocations"
              :label="t('exerciseWizards.partsMapping.trailhead.bodyLocationLabel')"
              :multiple="false"
            />

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.trailhead.thoughtsLabel') }}</label>
              <textarea
                v-model="trailheadThoughts"
                rows="2"
                :placeholder="t('exerciseWizards.partsMapping.trailhead.thoughtsPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Identify Part -->
      <template v-else-if="currentStep === 'identify-part'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">
              {{ editingPartIndex !== null ? t('exerciseWizards.partsMapping.identifyPart.editTitle') : t('exerciseWizards.partsMapping.identifyPart.title') }}
            </h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.identifyPart.description') }}
            </p>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.nameLabel') }}</label>
              <input
                v-model="currentPartName"
                type="text"
                class="neo-input w-full p-3 text-sm"
                :placeholder="t('exerciseWizards.partsMapping.identifyPart.namePlaceholder')"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.roleLabel') }}</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="role in roleOptions"
                  :key="role.value"
                  class="neo-pill px-3 py-1.5 text-xs neo-focus transition-all"
                  :class="currentPartRole === role.value
                    ? `${role.activeClass} shadow-neu-pressed`
                    : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                  @click="currentPartRole = role.value"
                >
                  {{ role.label }}
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.protectionLabel') }}</label>
              <textarea
                v-model="currentPartPositiveIntention"
                rows="2"
                :placeholder="t('exerciseWizards.partsMapping.identifyPart.protectionPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.fearLabel') }}</label>
              <textarea
                v-model="currentPartFears"
                rows="2"
                :placeholder="t('exerciseWizards.partsMapping.identifyPart.fearPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <!-- Part preview -->
            <AppCard v-if="currentPartName.trim()" variant="inset" padding="sm" class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-on-surface">{{ currentPartName }}</span>
                <PartRoleBadge :role="currentPartRole" />
              </div>
              <p v-if="currentPartPositiveIntention.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.partsMapping.identifyPart.protectsFrom', { text: currentPartPositiveIntention }) }}
              </p>
              <p v-if="currentPartFears.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.partsMapping.identifyPart.fears', { text: currentPartFears }) }}
              </p>
            </AppCard>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Add More -->
      <template v-else-if="currentStep === 'add-more'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.addMore.title') }}</h2>

            <div class="space-y-3">
              <AppCard
                v-for="(part, idx) in identifiedParts"
                :key="idx"
                variant="raised"
                padding="sm"
                class="flex items-start justify-between gap-2"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-on-surface">{{ part.name }}</span>
                    <PartRoleBadge :role="part.role" />
                  </div>
                  <p v-if="part.positiveIntention" class="text-xs text-on-surface-variant truncate">
                    {{ t('exerciseWizards.partsMapping.identifyPart.protectsFrom', { text: part.positiveIntention }) }}
                  </p>
                  <p v-if="part.bodyLocations.length" class="text-xs text-on-surface-variant">
                    {{ part.bodyLocations.map(formatLocation).join(', ') }}
                  </p>
                </div>
                <div class="flex gap-1 shrink-0">
                  <button class="neo-focus rounded-full p-1 text-on-surface-variant hover:text-primary" @click="editPart(idx)">
                    <PencilIcon class="w-4 h-4" />
                  </button>
                  <button class="neo-focus rounded-full p-1 text-on-surface-variant hover:text-error" @click="removePart(idx)">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </AppCard>
            </div>

            <div class="flex gap-3">
              <AppButton variant="tonal" @click="addAnotherPart()">
                <PlusIcon class="w-4 h-4 mr-1" />
                {{ t('exerciseWizards.partsMapping.addMore.addButton') }}
              </AppButton>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('exerciseWizards.partsMapping.addMore.continueButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Visual Map -->
      <template v-else-if="currentStep === 'visual-map'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.visualMap.title') }}</h2>

            <!-- SVG Map -->
            <div class="neo-surface rounded-2xl p-4" style="min-height: 300px">
              <svg :width="mapWidth" :height="mapHeight" :viewBox="`0 0 ${mapWidth} ${mapHeight}`" class="w-full">
                <!-- Relationship lines -->
                <line
                  v-for="(rel, idx) in relationships"
                  :key="`rel-${idx}`"
                  :x1="partPosition(getPartIndex(rel.fromPartId)).x"
                  :y1="partPosition(getPartIndex(rel.fromPartId)).y"
                  :x2="partPosition(getPartIndex(rel.toPartId)).x"
                  :y2="partPosition(getPartIndex(rel.toPartId)).y"
                  :stroke="relationshipColor(rel.type)"
                  stroke-width="2"
                  :stroke-dasharray="rel.type === 'protects' || rel.type === 'triggers' ? '6 3' : 'none'"
                />
                <!-- Self circle -->
                <circle :cx="mapWidth / 2" :cy="mapHeight / 2" r="28" class="fill-primary/20 stroke-primary" stroke-width="2" />
                <text :x="mapWidth / 2" :y="mapHeight / 2" text-anchor="middle" dominant-baseline="middle" class="fill-primary text-xs font-bold select-none">{{ t('exerciseWizards.partsMapping.visualMap.self') }}</text>
                <!-- Part circles -->
                <g
                  v-for="(part, idx) in identifiedParts"
                  :key="`part-${idx}`"
                  :transform="`translate(${partPosition(idx).x}, ${partPosition(idx).y})`"
                  class="cursor-pointer"
                  @click="togglePartSelection(idx)"
                >
                  <circle
                    r="24"
                    :class="[
                      partFillClass(part.role),
                      selectedPartIndices.includes(idx) ? 'stroke-primary stroke-[3]' : 'stroke-current stroke-1',
                    ]"
                  />
                  <text y="1" text-anchor="middle" dominant-baseline="middle" class="fill-on-surface text-[10px] font-medium select-none pointer-events-none">
                    {{ part.name.length > 8 ? part.name.slice(0, 7) + '…' : part.name }}
                  </text>
                </g>
              </svg>
            </div>

            <!-- Relationship builder -->
            <div class="space-y-2">
              <p class="text-sm text-on-surface-variant">
                {{ selectedPartIndices.length === 0 ? t('exerciseWizards.partsMapping.visualMap.instructions.tapTwo') :
                   selectedPartIndices.length === 1 ? t('exerciseWizards.partsMapping.visualMap.instructions.tapSecond') :
                   t('exerciseWizards.partsMapping.visualMap.instructions.chooseType') }}
              </p>
              <div v-if="selectedPartIndices.length === 2" class="flex flex-wrap gap-2">
                <button
                  v-for="relType in relationshipTypes"
                  :key="relType.value"
                  class="neo-pill px-3 py-1 text-xs neo-focus shadow-neu-raised-sm hover:-translate-y-px transition-all"
                  @click="createRelationship(relType.value)"
                >
                  {{ relType.label }}
                </button>
              </div>
            </div>

            <!-- Relationship list -->
            <div v-if="relationships.length" class="space-y-2">
              <p class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">{{ t('exerciseWizards.partsMapping.visualMap.relationships.heading') }}</p>
              <div
                v-for="(rel, idx) in relationships"
                :key="`rlist-${idx}`"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-on-surface">
                  {{ getPartName(rel.fromPartId) }}
                  <span class="text-on-surface-variant mx-1">{{ rel.type }}</span>
                  {{ getPartName(rel.toPartId) }}
                </span>
                <button class="neo-focus rounded-full p-1 text-on-surface-variant hover:text-error" @click="removeRelationship(idx)">
                  <XMarkIcon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Reflection -->
      <template v-else-if="currentStep === 'reflection'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.reflection.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.reflection.description') }}
            </p>
            <textarea
              v-model="reflection"
              rows="4"
              :placeholder="t('exerciseWizards.partsMapping.reflection.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <AppButton
              variant="tonal"
              :disabled="identifiedParts.length < 2 || isLoadingLLM"
              @click="handleFetchInsight"
            >
              <SparklesIcon class="w-4 h-4 mr-1" />
              {{ isLoadingLLM ? t('exerciseWizards.partsMapping.reflection.aiButtonLoading') : t('exerciseWizards.partsMapping.reflection.aiButton') }}
            </AppButton>

            <div v-if="llmInsight" class="neo-surface p-4 rounded-xl">
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmInsight }}</p>
              <p class="text-xs text-on-surface-variant/60 italic mt-3">
                {{ t('exerciseWizards.partsMapping.reflection.aiDisclaimer') }}
              </p>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Life Area Links -->
      <template v-else-if="currentStep === 'life-areas'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.lifeAreas.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.lifeAreas.description') }}
            </p>

            <template v-if="lifeAreas.length">
              <div v-for="(part, idx) in identifiedParts" :key="idx" class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-on-surface">{{ part.name }}</span>
                  <PartRoleBadge :role="part.role" />
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="area in lifeAreas"
                    :key="area.id"
                    class="neo-pill px-2.5 py-1 text-xs neo-focus transition-all"
                    :class="isLifeAreaSelected(idx, area.id)
                      ? 'bg-primary/20 text-primary shadow-neu-pressed'
                      : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                    @click="toggleLifeArea(idx, area.id)"
                  >
                    {{ area.name }}
                  </button>
                </div>
              </div>
            </template>
            <p v-else class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.lifeAreas.emptyState') }}
            </p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 8: Summary -->
      <template v-else-if="currentStep === 'summary'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-5">
            <div>
              <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.partsMapping.summary.title') }}</h2>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ t('exerciseWizards.partsMapping.summary.partCount', { count: identifiedParts.length }) }}
              </p>
            </div>

            <!-- Parts List -->
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.parts') }}</p>
              <AppCard
                v-for="(part, idx) in identifiedParts"
                :key="idx"
                variant="inset"
                padding="sm"
                class="space-y-1"
              >
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-on-surface">{{ part.name }}</span>
                  <PartRoleBadge :role="part.role" />
                </div>
                <p v-if="part.positiveIntention" class="text-xs text-on-surface-variant">
                  {{ t('exerciseWizards.partsMapping.identifyPart.protectsFrom', { text: part.positiveIntention }) }}
                </p>
                <p v-if="part.fears" class="text-xs text-on-surface-variant">
                  {{ t('exerciseWizards.partsMapping.identifyPart.fears', { text: part.fears }) }}
                </p>
                <p v-if="part.bodyLocations.length" class="text-xs text-on-surface-variant">
                  {{ t('exerciseWizards.partsMapping.summary.bodyPrefix') }} {{ part.bodyLocations.map(formatLocation).join(', ') }}
                </p>
              </AppCard>
            </div>

            <!-- Relationships -->
            <div v-if="relationships.length" class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.relationships') }}</p>
              <p
                v-for="(rel, idx) in relationships"
                :key="idx"
                class="text-sm text-on-surface"
              >
                {{ getPartName(rel.fromPartId) }}
                <span class="text-on-surface-variant">{{ rel.type }}</span>
                {{ getPartName(rel.toPartId) }}
              </p>
            </div>

            <!-- Reflection -->
            <div v-if="reflection.trim()" class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.reflection') }}</p>
              <p class="text-sm text-on-surface">{{ reflection }}</p>
            </div>

            <!-- LLM Insight -->
            <div v-if="llmInsight" class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.aiInsights') }}</p>
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmInsight }}</p>
            </div>

            <EmotionSelector
              v-model="afterEmotionIds"
              :label="t('exerciseWizards.partsMapping.summary.emotionLabel')"
            />

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.partsMapping.summary.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.partsMapping.summary.saving') : t('exerciseWizards.partsMapping.summary.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  UserGroupIcon,
  FireIcon,
  HeartIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import BodyLocationPicker from '@/components/exercises/ifs/BodyLocationPicker.vue'
import { usePartsMappingWizard, type PartsMappingStep } from '@/composables/usePartsMappingWizard'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useT } from '@/composables/useT'
import type { IFSPartRole, IFSBodyLocation, IFSRelationship } from '@/domain/exercises'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useT()

const lifeAreaStore = useLifeAreaStore()
const lifeAreas = computed(() => lifeAreaStore.lifeAreas)

const STEPS: PartsMappingStep[] = [
  'intro', 'trailhead', 'identify-part', 'add-more',
  'visual-map', 'reflection', 'life-areas', 'summary',
]

const stepLabels = computed(() => [
  t('exerciseWizards.partsMapping.steps.intro'),
  t('exerciseWizards.partsMapping.steps.trailhead'),
  t('exerciseWizards.partsMapping.steps.identifyPart'),
  t('exerciseWizards.partsMapping.steps.addMore'),
  t('exerciseWizards.partsMapping.steps.visualMap'),
  t('exerciseWizards.partsMapping.steps.reflection'),
  t('exerciseWizards.partsMapping.steps.lifeAreas'),
  t('exerciseWizards.partsMapping.steps.summary'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  trailheadSituation,
  trailheadEmotionIds,
  trailheadThoughts,
  beforeEmotionIds,
  afterEmotionIds,
  identifiedParts,
  editingPartIndex,
  currentPartName,
  currentPartRole,
  currentPartBodyLocations,
  currentPartEmotionIds,
  currentPartPositiveIntention,
  currentPartFears,
  editPart,
  removePart,
  addAnotherPart,
  relationships,
  removeRelationship,
  addRelationship,
  reflection,
  llmInsight,
  isLoadingLLM,
  fetchLLMInsight,
  partLifeAreaIds,
  notes,
  isSaving,
  save,
} = usePartsMappingWizard()

// Trailhead body location is an array in BodyLocationPicker
const trailheadBodyLocations = ref<IFSBodyLocation[]>([])

const roleOptions = computed(() => [
  { value: 'manager' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.manager'), activeClass: 'bg-blue-100 text-blue-700' },
  { value: 'firefighter' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.firefighter'), activeClass: 'bg-orange-100 text-orange-700' },
  { value: 'exile' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.exile'), activeClass: 'bg-purple-100 text-purple-700' },
  { value: 'unknown' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.notSure'), activeClass: 'bg-neu-base text-on-surface' },
])

const relationshipTypes = computed(() => [
  { value: 'protects' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.protects') },
  { value: 'polarized' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.polarized') },
  { value: 'allied' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.allied') },
  { value: 'triggers' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.triggers') },
  { value: 'soothes' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.soothes') },
])

// Visual Map
const mapWidth = 320
const mapHeight = 300
const selectedPartIndices = ref<number[]>([])

function partPosition(index: number): { x: number; y: number } {
  const count = identifiedParts.value.length
  if (count === 0) return { x: mapWidth / 2, y: mapHeight / 2 }
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2
  const radius = Math.min(mapWidth, mapHeight) / 2 - 40
  return {
    x: mapWidth / 2 + radius * Math.cos(angle),
    y: mapHeight / 2 + radius * Math.sin(angle),
  }
}

function partFillClass(role: IFSPartRole): string {
  switch (role) {
    case 'manager': return 'fill-blue-100 stroke-blue-400'
    case 'firefighter': return 'fill-orange-100 stroke-orange-400'
    case 'exile': return 'fill-purple-100 stroke-purple-400'
    default: return 'fill-neu-base stroke-neu-border'
  }
}

function relationshipColor(type: IFSRelationship['type']): string {
  switch (type) {
    case 'protects': return '#a855f7'
    case 'polarized': return '#ef4444'
    case 'allied': return '#3b82f6'
    case 'triggers': return '#f97316'
    case 'soothes': return '#22c55e'
    default: return '#9ca3af'
  }
}

function togglePartSelection(idx: number) {
  const indices = selectedPartIndices.value
  if (indices.includes(idx)) {
    selectedPartIndices.value = indices.filter((i) => i !== idx)
  } else if (indices.length < 2) {
    selectedPartIndices.value = [...indices, idx]
  } else {
    selectedPartIndices.value = [idx]
  }
}

function createRelationship(type: IFSRelationship['type']) {
  if (selectedPartIndices.value.length !== 2) return
  const [fromIdx, toIdx] = selectedPartIndices.value
  addRelationship({
    fromPartId: `temp-${fromIdx}`,
    toPartId: `temp-${toIdx}`,
    type,
  })
  selectedPartIndices.value = []
}

function getPartName(tempId: string): string {
  const idx = getPartIndex(tempId)
  return identifiedParts.value[idx]?.name ?? 'Unknown'
}

function getPartIndex(tempId: string): number {
  return parseInt(tempId.replace('temp-', ''), 10)
}

function formatLocation(location: string): string {
  return location
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Life Area toggling
function isLifeAreaSelected(partIdx: number, areaId: string): boolean {
  return partLifeAreaIds.value[partIdx]?.includes(areaId) ?? false
}

function toggleLifeArea(partIdx: number, areaId: string) {
  const current = partLifeAreaIds.value[partIdx] ?? []
  if (current.includes(areaId)) {
    partLifeAreaIds.value[partIdx] = current.filter((id) => id !== areaId)
  } else {
    partLifeAreaIds.value[partIdx] = [...current, areaId]
  }
}

async function handleFetchInsight() {
  const lifeAreaNames = lifeAreas.value.map((a) => a.name)
  await fetchLLMInsight({ lifeAreaNames })
}

async function handleSave() {
  await save()
  emit('saved')
}
</script>
