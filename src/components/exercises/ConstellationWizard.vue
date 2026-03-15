<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in visibleStepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < mappedStepIndex ? ' (completed)' : idx === mappedStepIndex ? ' (current)' : ''}`"
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
            <h2 class="text-lg font-bold text-on-surface">Inner System Constellation</h2>
            <p class="text-sm text-on-surface-variant">
              Parts form alliances, oppositions, and cascading chains. A Perfectionist and
              Procrastinator might look opposite but both protect the same wounded exile.
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
                :class="hasPrerequisites ? 'bg-green-100' : 'bg-orange-100'"
              >
                <AppIcon v-if="hasPrerequisites" name="check_circle" class="text-xl text-green-600" />
                <AppIcon v-else name="warning" class="text-xl text-orange-600" />
              </div>
              <p class="text-sm" :class="hasPrerequisites ? 'text-on-surface' : 'text-orange-700'">
                <template v-if="hasPrerequisites">
                  You have {{ partStore.sortedParts.length }} parts mapped. Ready to explore their relationships.
                </template>
                <template v-else>
                  You need at least 3 parts mapped. Try Parts Mapping first.
                </template>
              </p>
            </div>
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              Begin
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Select Focus Parts -->
      <template v-else-if="currentStep === 'select-parts'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">Choose Your Focus</h2>
            <p class="text-sm text-on-surface-variant">
              Select 3-5 parts you'd like to explore the relationships between.
            </p>

            <div class="text-sm text-on-surface-variant text-center font-medium">
              {{ selectedPartIds.length }} of 3-5 selected
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
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              Next
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Map Relationships -->
      <template v-else-if="currentStep === 'map-relationships'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">How Do They Relate?</h2>

            <div
              v-for="pair in allPairs"
              :key="`${pair.partAId}-${pair.partBId}`"
              class="space-y-3 pb-4 border-b border-neu-border/20 last:border-b-0 last:pb-0"
            >
              <!-- Pair header -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-on-surface">{{ getPartName(pair.partAId) }}</span>
                <PartRoleBadge :role="getPartRole(pair.partAId)!" />
                <span class="text-xs text-on-surface-variant">&#8596;</span>
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
                :placeholder="`When ${getPartName(pair.partAId)} is active, what happens to ${getPartName(pair.partBId)}?`"
                @input="setRelationshipNote(pair.partAId, pair.partBId, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              Next
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Polarization Deep-Dive (conditional) -->
      <template v-else-if="currentStep === 'polarization-deep-dive'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">Exploring Polarizations</h2>
            <p class="text-sm text-on-surface-variant">
              Polarized parts are often the most revealing — they may both be protecting the same wound.
            </p>

            <div
              v-for="dd in polarizationDeepDives"
              :key="`${dd.partAId}-${dd.partBId}`"
              class="space-y-3 pb-4 border-b border-neu-border/20 last:border-b-0 last:pb-0"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-on-surface">{{ getPartName(dd.partAId) }}</span>
                <span class="text-xs text-red-500 font-medium">vs</span>
                <span class="text-sm font-semibold text-on-surface">{{ getPartName(dd.partBId) }}</span>
              </div>

              <div class="neo-surface p-4 rounded-xl space-y-3">
                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    What does {{ getPartName(dd.partAId) }} think about {{ getPartName(dd.partBId) }}?
                  </label>
                  <textarea
                    v-model="dd.partAThinks"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    :placeholder="`e.g., '${getPartName(dd.partBId)} is lazy and irresponsible'`"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    What does {{ getPartName(dd.partBId) }} think about {{ getPartName(dd.partAId) }}?
                  </label>
                  <textarea
                    v-model="dd.partBThinks"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    :placeholder="`e.g., '${getPartName(dd.partAId)} is exhausting and never satisfied'`"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    What would happen if one of them "won"?
                  </label>
                  <textarea
                    v-model="dd.ifOneWon"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    placeholder="What if one part completely took over?"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-on-surface-variant mb-1">
                    What might they BOTH be protecting?
                  </label>
                  <textarea
                    v-model="dd.commonProtection"
                    rows="2"
                    class="neo-input w-full p-2 text-sm resize-none"
                    placeholder="Often, polarized parts protect the same exile from different angles."
                  />
                  <p class="text-xs text-on-surface-variant mt-1 italic">
                    Hint: Polarized parts often guard the same vulnerable part from different angles.
                  </p>
                </div>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" @click="nextStep()">Next</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Visual Constellation -->
      <template v-else-if="currentStep === 'visual'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">Your Constellation</h2>

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
                >Self</text>

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
                <div class="w-6 h-0.5 bg-red-400" />
                <span>Polarized</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-0.5 bg-blue-400" />
                <span>Allied</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-6 h-0.5 bg-purple-400 border-t border-dashed border-purple-400" style="border-style: dashed" />
                <span>Protects</span>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" @click="nextStep()">Next</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Reflection & Analysis -->
      <template v-else-if="currentStep === 'reflection'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">System Insights</h2>

            <textarea
              v-model="reflection"
              rows="3"
              placeholder="Looking at your inner constellation, what patterns do you see?"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <!-- LLM Analysis -->
            <div class="space-y-2">
              <AppButton
                v-if="!llmInsight"
                variant="tonal"
                :loading="isLLMLoading"
                @click="requestAnalysis()"
              >
                <span class="material-symbols-outlined text-base leading-none mr-1">auto_awesome</span>
                Analyze My System
              </AppButton>

              <div v-if="llmInsight" class="neo-surface p-4 rounded-xl space-y-3">
                <p class="text-sm text-on-surface whitespace-pre-line">{{ llmInsight }}</p>
                <p class="text-xs text-on-surface-variant italic">
                  This analysis reflects patterns in what you've shared. A therapist trained in
                  IFS can help explore these dynamics more deeply, especially where trauma may be involved.
                </p>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" @click="nextStep()">Next</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Save -->
      <template v-else-if="currentStep === 'save'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">Save Constellation</h2>

            <IFSSafetyBanner />

            <!-- Summary -->
            <div class="neo-surface p-4 rounded-xl space-y-3 text-sm">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-on-surface-variant">Parts:</span>
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
                  {{ relationshipCountByType.polarized }} polarized
                </span>
                <span v-if="relationshipCountByType.allied">
                  {{ relationshipCountByType.allied }} allied
                </span>
                <span v-if="relationshipCountByType['protector-exile']">
                  {{ relationshipCountByType['protector-exile'] }} protector-exile
                </span>
              </div>

              <div v-for="dd in polarizationDeepDives.filter(d => d.commonProtection.trim())" :key="`summary-${dd.partAId}-${dd.partBId}`">
                <p class="text-xs text-on-surface-variant">
                  <span class="font-medium text-on-surface">{{ getPartName(dd.partAId) }}</span> &
                  <span class="font-medium text-on-surface">{{ getPartName(dd.partBId) }}</span>
                  may both protect: <span class="italic">{{ dd.commonProtection }}</span>
                </p>
              </div>

              <p v-if="reflection.trim()" class="text-xs text-on-surface-variant">
                Reflection: {{ reflection.trim() }}
              </p>

              <p v-if="llmInsight" class="text-xs text-on-surface-variant">
                AI analysis included
              </p>
            </div>

            <textarea
              v-model="notes"
              rows="2"
              placeholder="Additional notes (optional)"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" :loading="isSaving" @click="handleSave">
              Save Constellation
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import IFSSafetyBanner from '@/components/exercises/ifs/IFSSafetyBanner.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import {
  useConstellationWizard,
} from '@/composables/useConstellationWizard'
import type { IFSPartRole, IFSConstellationRelationType } from '@/domain/exercises'

const emit = defineEmits<{
  saved: []
}>()

const partStore = useIFSPartStore()

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
const allStepLabels = ['Prerequisites', 'Select Parts', 'Relationships', 'Polarizations', 'Constellation', 'Insights', 'Save']
const visibleStepLabels = computed(() => {
  if (!hasPolarized.value) {
    return allStepLabels.filter((_, i) => i !== 3)
  }
  return allStepLabels
})

const currentStepLabel = computed(() => {
  const labels: Record<string, string> = {
    'prerequisites': 'Prerequisites',
    'select-parts': 'Select Parts',
    'map-relationships': 'Relationships',
    'polarization-deep-dive': 'Polarizations',
    'visual': 'Constellation',
    'reflection': 'Insights',
    'save': 'Save',
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

const relationshipTypes: {
  value: IFSConstellationRelationType
  label: string
  icon: string
  activeClass: string
}[] = [
  { value: 'polarized', label: 'Polarized', icon: 'compare_arrows', activeClass: 'bg-red-100 text-red-700' },
  { value: 'allied', label: 'Allied', icon: 'group', activeClass: 'bg-blue-100 text-blue-700' },
  { value: 'protector-exile', label: 'Protects', icon: 'verified_user', activeClass: 'bg-purple-100 text-purple-700' },
  { value: 'no-relationship', label: 'None', icon: 'remove', activeClass: 'bg-neu-base text-on-surface' },
]

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
  switch (role) {
    case 'manager': return 'fill-blue-100 stroke-blue-400'
    case 'firefighter': return 'fill-orange-100 stroke-orange-400'
    case 'exile': return 'fill-purple-100 stroke-purple-400'
    default: return 'fill-neu-base stroke-neu-border'
  }
}

function lineColor(type: IFSConstellationRelationType): string {
  switch (type) {
    case 'polarized': return '#f87171' // red-400
    case 'allied': return '#60a5fa' // blue-400
    case 'protector-exile': return '#c084fc' // purple-400
    default: return '#d1d5db' // gray-300
  }
}

function truncateName(name: string): string {
  return name.length > 12 ? name.slice(0, 10) + '...' : name
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? 'Unknown'
}

function getPartRole(id: string): IFSPartRole {
  return partStore.getPartById(id)?.role ?? 'unknown'
}

function roleBorderClass(role: IFSPartRole): string {
  switch (role) {
    case 'manager': return 'border-l-4 border-l-blue-400'
    case 'firefighter': return 'border-l-4 border-l-orange-400'
    case 'exile': return 'border-l-4 border-l-purple-400'
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
