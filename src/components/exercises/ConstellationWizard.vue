<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in visibleStepLabels"
          :key="idx"
          type="button"
          :aria-label="`${t('exerciseWizards.constellation.ariaStepLabel', { index: idx + 1, label })}${idx < mappedStepIndex ? t('exerciseWizards.constellation.ariaStepCompleted') : idx === mappedStepIndex ? t('exerciseWizards.constellation.ariaStepCurrent') : ''}`"
          class="rounded-full transition-all duration-200"
          :class="idx < mappedStepIndex
            ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
            : idx === mappedStepIndex
              ? 'neo-step-active w-3.5 h-3.5'
              : 'neo-step-future w-2.5 h-2.5'"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ currentStepLabel }}
      </span>
    </div>

    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <!-- Step 1: Prerequisites -->
      <template v-if="currentStep === 'prerequisites'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.constellation.prerequisites.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.constellation.prerequisites.description') }}
            </p>

            <IFSSafetyBanner
              :require-acknowledgment="true"
              :acknowledged="safetyAcknowledged"
              @update:acknowledged="safetyAcknowledged = $event"
            />

            <!-- Prerequisites check -->
            <div class="neo-surface p-3 rounded-xl flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                :class="hasPrerequisites ? 'bg-status-good-soft' : 'bg-status-warn-soft'"
              >
                <AppIcon v-if="hasPrerequisites" name="check_circle" class="text-xl text-status-good" />
                <AppIcon v-else name="warning" class="text-xl text-status-warn" />
              </div>
              <p class="text-sm" :class="hasPrerequisites ? 'text-on-surface' : 'text-status-warn-on'">
                <template v-if="hasPrerequisites">
                  {{ tg('exerciseWizards.constellation.prerequisites.checkPassed', { count: partStore.sortedParts.length }) }}
                </template>
                <template v-else>
                  {{ t('exerciseWizards.constellation.prerequisites.checkFailed') }}
                </template>
              </p>
            </div>
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('exerciseWizards.constellation.prerequisites.beginButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Select Focus Parts -->
      <template v-else-if="currentStep === 'select-parts'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.constellation.selectParts.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ tg('exerciseWizards.constellation.selectParts.description') }}
            </p>

            <div class="text-sm text-on-surface-variant text-center font-medium">
              {{ t('exerciseWizards.constellation.selectParts.counter', { count: selectedPartIds.length }) }}
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="part in partStore.sortedParts"
                :key="part.id"
                class="neo-focus rounded-xl p-3 text-left transition-all"
                :class="[
                  selectedPartIds.includes(part.id)
                    ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                    : selectedPartIds.length >= 5
                      ? 'neo-surface shadow-neu-raised-sm opacity-40 cursor-not-allowed'
                      : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px',
                  roleBorderClass(part.role),
                ]"
                :disabled="!selectedPartIds.includes(part.id) && selectedPartIds.length >= 5"
                @click="togglePart(part.id)"
              >
                <p class="text-sm font-medium text-on-surface truncate">{{ part.name }}</p>
                <PartRoleBadge :role="part.role" class="mt-1" />
              </button>
            </div>

            <!-- Selected summary -->
            <div v-if="selectedPartIds.length" class="flex flex-wrap gap-1">
              <span
                v-for="pid in selectedPartIds"
                :key="pid"
                class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-medium"
              >
                {{ getPartName(pid) }}
              </span>
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

      <!-- Step 3: Map Relationships -->
      <template v-else-if="currentStep === 'map-relationships'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.constellation.mapRelationships.title') }}</h2>

            <div
              v-for="pair in allPairs"
              :key="`${pair.partAId}-${pair.partBId}`"
              class="space-y-3 pb-4 border-b border-neu-border/20 last:border-b-0 last:pb-0"
            >
              <!-- Pair header -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-on-surface">{{ getPartName(pair.partAId) }}</span>
                <PartRoleBadge :role="getPartRole(pair.partAId)!" />
                <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.constellation.mapRelationships.pairSeparator') }}</span>
                <span class="text-sm font-medium text-on-surface">{{ getPartName(pair.partBId) }}</span>
                <PartRoleBadge :role="getPartRole(pair.partBId)!" />
              </div>

              <!-- Relationship type buttons -->
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="relType in relationshipTypes"
                  :key="relType.value"
                  class="neo-pill px-2.5 py-1 text-xs neo-focus transition-all flex items-center gap-1"
                  :class="getRelationship(pair.partAId, pair.partBId)?.type === relType.value
                    ? `${relType.activeClass} shadow-neu-pressed`
                    : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                  @click="setRelationshipType(pair.partAId, pair.partBId, relType.value)"
                >
                  <AppIcon :name="relType.icon" class="text-sm" />
                  {{ relType.label }}
                </button>
              </div>

              <!-- Optional note -->
              <input
                type="text"
                :value="getRelationship(pair.partAId, pair.partBId)?.notes ?? ''"
                class="neo-input w-full p-2 text-xs"
                :placeholder="t('exerciseWizards.constellation.mapRelationships.notePlaceholder', { partA: getPartName(pair.partAId), partB: getPartName(pair.partBId) })"
                @input="setRelationshipNote(pair.partAId, pair.partBId, ($event.target as HTMLInputElement).value)"
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

      <!-- Step 4: Polarization Deep-Dive (conditional) -->
      <template v-else-if="currentStep === 'polarization-deep-dive'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.constellation.polarizationDeepDive.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.constellation.polarizationDeepDive.description') }}
            </p>

            <div
              v-for="dd in polarizationDeepDives"
              :key="`${dd.partAId}-${dd.partBId}`"
              class="space-y-3 pb-4 border-b border-neu-border/20 last:border-b-0 last:pb-0"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-on-surface">{{ getPartName(dd.partAId) }}</span>
                <span class="text-xs text-rel-polarized font-medium">{{ t('exerciseWizards.constellation.polarizationDeepDive.vs') }}</span>
                <span class="text-sm font-semibold text-on-surface">{{ getPartName(dd.partBId) }}</span>
              </div>

              <div class="neo-surface p-4 rounded-xl space-y-3">
                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    {{ t('exerciseWizards.constellation.polarizationDeepDive.partAThinks', { partA: getPartName(dd.partAId), partB: getPartName(dd.partBId) }) }}
                  </label>
                  <textarea
                    v-model="dd.partAThinks"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    :placeholder="t('exerciseWizards.constellation.polarizationDeepDive.partAThinkPlaceholder', { partB: getPartName(dd.partBId) })"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    {{ t('exerciseWizards.constellation.polarizationDeepDive.partBThinks', { partA: getPartName(dd.partAId), partB: getPartName(dd.partBId) }) }}
                  </label>
                  <textarea
                    v-model="dd.partBThinks"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    :placeholder="t('exerciseWizards.constellation.polarizationDeepDive.partBThinkPlaceholder', { partA: getPartName(dd.partAId) })"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    {{ t('exerciseWizards.constellation.polarizationDeepDive.ifOneWon') }}
                  </label>
                  <textarea
                    v-model="dd.ifOneWon"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    :placeholder="t('exerciseWizards.constellation.polarizationDeepDive.ifOneWonPlaceholder')"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    {{ t('exerciseWizards.constellation.polarizationDeepDive.commonProtection') }}
                  </label>
                  <textarea
                    v-model="dd.commonProtection"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    :placeholder="t('exerciseWizards.constellation.polarizationDeepDive.commonProtectionPlaceholder')"
                  />
                  <p class="text-xs text-on-surface-variant mt-1 italic">
                    {{ t('exerciseWizards.constellation.polarizationDeepDive.commonProtectionHint') }}
                  </p>
                </div>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Visual Constellation -->
      <template v-else-if="currentStep === 'visual'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.constellation.visual.title') }}</h2>

            <!-- SVG Visualization -->
            <div class="neo-surface rounded-2xl p-4">
              <svg :viewBox="`0 0 ${svgSize} ${svgSize}`" class="w-full" style="min-height: 300px">
                <!-- Relationship lines -->
                <template v-for="rel in relationships" :key="`line-${rel.partAId}-${rel.partBId}`">
                  <line
                    v-if="rel.type !== 'no-relationship'"
                    :x1="getNodePosition(rel.partAId).x"
                    :y1="getNodePosition(rel.partAId).y"
                    :x2="getNodePosition(rel.partBId).x"
                    :y2="getNodePosition(rel.partBId).y"
                    :stroke="lineColor(rel.type)"
                    stroke-width="2"
                    :stroke-dasharray="rel.type === 'protector-exile' ? '6 4' : 'none'"
                  />
                </template>

                <!-- Self at center -->
                <circle
                  :cx="center"
                  :cy="center"
                  :r="28"
                  class="fill-primary/15 stroke-primary"
                  stroke-width="2"
                />
                <text
                  :x="center"
                  :y="center + 5"
                  text-anchor="middle"
                  class="fill-primary text-sm font-semibold"
                >{{ t('exerciseWizards.constellation.visual.selfLabel') }}</text>

                <!-- Part nodes -->
                <g v-for="pid in selectedPartIds" :key="pid">
                  <circle
                    :cx="getNodePosition(pid).x"
                    :cy="getNodePosition(pid).y"
                    :r="nodeRadius"
                    :class="nodeClasses(pid)"
                    stroke-width="2"
                  />
                  <text
                    :x="getNodePosition(pid).x"
                    :y="getNodePosition(pid).y + nodeRadius + 14"
                    text-anchor="middle"
                    class="fill-current text-on-surface text-xs"
                  >{{ truncateName(getPartName(pid)) }}</text>
                </g>
              </svg>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap gap-4 justify-center text-xs text-on-surface-variant">
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-0.5 bg-rel-polarized" />
                <span>{{ t('exerciseWizards.constellation.visual.legend.polarized') }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-0.5 bg-rel-allied" />
                <span>{{ t('exerciseWizards.constellation.visual.legend.allied') }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-0.5 bg-rel-protects border-t border-dashed border-rel-protects" style="border-style: dashed" />
                <span>{{ t('exerciseWizards.constellation.visual.legend.protects') }}</span>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Reflection & Analysis -->
      <template v-else-if="currentStep === 'reflection'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.constellation.reflection.title') }}</h2>

            <textarea
              v-model="reflection"
              rows="3"
              :placeholder="t('exerciseWizards.constellation.reflection.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <!-- LLM Analysis -->
            <div class="space-y-2">
              <div v-if="!llmInsight" class="flex flex-wrap items-center gap-2">
                <AppButton
                  variant="tonal"
                  :loading="isLLMLoading"
                  @click="requestAnalysis({ useProfile: useProfileAnalysis })"
                >
                  <span class="material-symbols-outlined text-base leading-none mr-1">auto_awesome</span>
                  {{ t('exerciseWizards.constellation.reflection.aiButton') }}
                </AppButton>
                <ProfileContextToggle v-model="useProfileAnalysis" />
              </div>

              <div v-if="llmInsight" class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm text-on-surface whitespace-pre-line">{{ llmInsight }}</p>
                <p class="text-xs text-on-surface-variant italic">
                  {{ tg('exerciseWizards.constellation.reflection.aiDisclaimer') }}
                </p>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Save -->
      <template v-else-if="currentStep === 'save'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.constellation.save.title') }}</h2>

            <IFSSafetyBanner />

            <!-- Summary -->
            <div class="neo-surface p-4 rounded-xl space-y-3 text-sm">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.constellation.save.partsLabel') }}</span>
                <span
                  v-for="pid in selectedPartIds"
                  :key="pid"
                  class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-medium"
                >
                  {{ getPartName(pid) }}
                </span>
              </div>

              <div class="flex gap-3 text-xs text-on-surface-variant">
                <span v-if="relationshipCountByType.polarized">
                  {{ t('exerciseWizards.constellation.save.countPolarized', { count: relationshipCountByType.polarized }) }}
                </span>
                <span v-if="relationshipCountByType.allied">
                  {{ t('exerciseWizards.constellation.save.countAllied', { count: relationshipCountByType.allied }) }}
                </span>
                <span v-if="relationshipCountByType['protector-exile']">
                  {{ t('exerciseWizards.constellation.save.countProtectorExile', { count: relationshipCountByType['protector-exile'] }) }}
                </span>
              </div>

              <div v-for="dd in polarizationDeepDives.filter(d => d.commonProtection.trim())" :key="`summary-${dd.partAId}-${dd.partBId}`">
                <p class="text-xs text-on-surface-variant">
                  <span class="font-medium text-on-surface">{{ getPartName(dd.partAId) }}</span> &
                  <span class="font-medium text-on-surface">{{ getPartName(dd.partBId) }}</span>
                  {{ t('exerciseWizards.constellation.save.mayBothProtect') }} <span class="italic">{{ dd.commonProtection }}</span>
                </p>
              </div>

              <p v-if="reflection.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.constellation.save.reflectionLabel') }} {{ reflection.trim() }}
              </p>

              <p v-if="llmInsight" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.constellation.save.aiAnalysisIncluded') }}
              </p>
            </div>

            <textarea
              v-model="notes"
              rows="2"
              :placeholder="t('exerciseWizards.constellation.save.notesPlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :loading="isSaving" @click="handleSave">
              {{ t('exerciseWizards.constellation.save.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import IFSSafetyBanner from '@/components/exercises/ifs/IFSSafetyBanner.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import ProfileContextToggle from '@/components/profile/ProfileContextToggle.vue'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useT } from '@/composables/useT'
import {
  useConstellationWizard,
} from '@/composables/useConstellationWizard'
import type { IFSPartRole, IFSConstellationRelationType } from '@/domain/exercises'
import {
  IFS_ROLE_SVG_CLASSES,
  RELATIONSHIP_PILL_CLASSES,
  RELATIONSHIP_STROKE_VAR,
} from '@/constants/exerciseColorRoles'

const emit = defineEmits<{
  saved: []
}>()

const { t, tg } = useT()

const partStore = useIFSPartStore()
const userPreferencesStore = useUserPreferencesStore()
const useProfileAnalysis = ref(userPreferencesStore.profileContextDefault)

const {
  currentStep,
  canAdvance,
  nextStep,
  prevStep,
  safetyAcknowledged,
  selectedPartIds,
  hasPrerequisites,
  togglePart,
  relationships,
  allPairs,
  polarizationDeepDives,
  hasPolarized,
  setRelationshipType,
  setRelationshipNote,
  getRelationship,
  reflection,
  llmInsight,
  isLLMLoading,
  requestAnalysis,
  notes,
  isSaving,
  save,
} = useConstellationWizard()

// Step labels — dynamically skip polarization if not applicable
const allStepLabels = computed(() => [
  t('exerciseWizards.constellation.steps.prerequisites'),
  t('exerciseWizards.constellation.steps.selectParts'),
  t('exerciseWizards.constellation.steps.relationships'),
  t('exerciseWizards.constellation.steps.polarizations'),
  t('exerciseWizards.constellation.steps.constellation'),
  t('exerciseWizards.constellation.steps.insights'),
  t('exerciseWizards.constellation.steps.save'),
])
const visibleStepLabels = computed(() => {
  if (!hasPolarized.value) {
    return allStepLabels.value.filter((_, i) => i !== 3)
  }
  return allStepLabels.value
})

const currentStepLabel = computed(() => {
  const labels: Record<string, string> = {
    'prerequisites': t('exerciseWizards.constellation.steps.prerequisites'),
    'select-parts': t('exerciseWizards.constellation.steps.selectParts'),
    'map-relationships': t('exerciseWizards.constellation.steps.relationships'),
    'polarization-deep-dive': t('exerciseWizards.constellation.steps.polarizations'),
    'visual': t('exerciseWizards.constellation.steps.constellation'),
    'reflection': t('exerciseWizards.constellation.steps.insights'),
    'save': t('exerciseWizards.constellation.steps.save'),
  }
  return labels[currentStep.value] ?? ''
})

const mappedStepIndex = computed(() => {
  const allSteps = ['prerequisites', 'select-parts', 'map-relationships', 'polarization-deep-dive', 'visual', 'reflection', 'save']
  const visibleSteps = hasPolarized.value
    ? allSteps
    : allSteps.filter((s) => s !== 'polarization-deep-dive')
  return visibleSteps.indexOf(currentStep.value)
})

const relationshipTypes = computed<{
  value: IFSConstellationRelationType
  label: string
  icon: string
  activeClass: string
}[]>(() => [
  { value: 'polarized', label: t('exerciseWizards.constellation.mapRelationships.shortLabels.polarized'), icon: 'compare_arrows', activeClass: RELATIONSHIP_PILL_CLASSES.polarized },
  { value: 'allied', label: t('exerciseWizards.constellation.mapRelationships.shortLabels.allied'), icon: 'group', activeClass: RELATIONSHIP_PILL_CLASSES.allied },
  { value: 'protector-exile', label: t('exerciseWizards.constellation.mapRelationships.shortLabels.protects'), icon: 'verified_user', activeClass: RELATIONSHIP_PILL_CLASSES['protector-exile'] },
  { value: 'no-relationship', label: t('exerciseWizards.constellation.mapRelationships.shortLabels.none'), icon: 'remove', activeClass: 'bg-neu-base text-on-surface' },
])

const relationshipCountByType = computed(() => {
  const counts: Record<string, number> = {}
  for (const r of relationships.value) {
    if (r.type !== 'no-relationship') {
      counts[r.type] = (counts[r.type] || 0) + 1
    }
  }
  return counts
})

// SVG layout
const svgSize = 350
const center = svgSize / 2
const orbitRadius = 120
const nodeRadius = 22

function getNodePosition(partId: string): { x: number; y: number } {
  const idx = selectedPartIds.value.indexOf(partId)
  if (idx === -1) return { x: center, y: center }
  const angle = (2 * Math.PI * idx) / selectedPartIds.value.length - Math.PI / 2
  return {
    x: center + orbitRadius * Math.cos(angle),
    y: center + orbitRadius * Math.sin(angle),
  }
}

function nodeClasses(partId: string): string {
  const role = getPartRole(partId)
  return IFS_ROLE_SVG_CLASSES[role ?? 'unknown']
}

function lineColor(type: IFSConstellationRelationType): string {
  return RELATIONSHIP_STROKE_VAR[type] ?? RELATIONSHIP_STROKE_VAR.default
}

function truncateName(name: string): string {
  return name.length > 12 ? name.slice(0, 10) + '...' : name
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exerciseWizards.constellation.unknownPart')
}

function getPartRole(id: string): IFSPartRole {
  return partStore.getPartById(id)?.role ?? 'unknown'
}

function roleBorderClass(role: IFSPartRole): string {
  switch (role) {
    case 'manager': return 'border-l-4 border-l-ifs-manager'
    case 'firefighter': return 'border-l-4 border-l-ifs-firefighter'
    case 'exile': return 'border-l-4 border-l-ifs-exile'
    default: return ''
  }
}

async function handleSave() {
  try {
    await save()
    emit('saved')
  } catch {
    // Error already logged in composable
  }
}
</script>
