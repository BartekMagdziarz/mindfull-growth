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
          class="rounded-full transition-all duration-200"
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

    <!-- Step 1: Select Practice -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <template v-if="currentStep === 'select-practice'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.dailyCheckIn.selectPractice.title') }}</h2>
            <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.dailyCheckIn.selectPractice.subtitle') }}</p>

            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="practice in practiceOptions"
                :key="practice.type"
                class="neo-focus rounded-xl p-4 text-left transition-all space-y-2"
                :class="[
                  practiceType === practice.type
                    ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                    : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px',
                ]"
                @click="practiceType = practice.type"
              >
                <div class="rounded-full w-10 h-10 flex items-center justify-center" :class="practice.bgClass">
                  <AppIcon :name="practice.icon" class="text-xl" :class="practice.iconClass" />
                </div>
                <p class="text-sm font-medium text-on-surface">{{ practice.label }}</p>
                <p class="text-xs text-on-surface-variant">{{ practice.description }}</p>
                <span class="text-xs text-on-surface-variant/60">{{ practice.duration }}</span>
              </button>
            </div>
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Practice -->
      <template v-else-if="currentStep === 'practice'">
        <div class="space-y-6">

          <!-- Practice A: Weather Report -->
          <template v-if="practiceType === 'weather-report'">
            <AppCard padding="lg" class="space-y-4">
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.dailyCheckIn.practice.weatherReport.title') }}</h2>
              <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.dailyCheckIn.practice.weatherReport.description') }}</p>

              <!-- Multi-select parts grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  v-for="part in partStore.sortedParts"
                  :key="part.id"
                  class="neo-focus rounded-xl p-3 text-left transition-all"
                  :class="[
                    isPartActive(part.id)
                      ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                      : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px',
                    roleBorderClass(part.role),
                  ]"
                  @click="toggleActivePart(part.id)"
                >
                  <p class="text-sm font-medium text-on-surface truncate">{{ part.name }}</p>
                  <PartRoleBadge :role="part.role" class="mt-1" />
                </button>
              </div>

              <!-- Active parts detail -->
              <div v-if="activeParts.length" class="space-y-3">
                <div
                  v-for="ap in activeParts"
                  :key="ap.partId"
                  class="neo-surface p-3 rounded-xl space-y-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-on-surface">{{ getPartName(ap.partId) }}</span>
                    <PartRoleBadge v-if="getPartRole(ap.partId)" :role="getPartRole(ap.partId)!" />
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-on-surface-variant w-16 shrink-0">{{ t('exerciseWizards.dailyCheckIn.practice.weatherReport.intensityLabel') }}</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      :value="ap.intensity"
                      class="flex-1 accent-primary"
                      @input="updatePartIntensity(ap.partId, Number(($event.target as HTMLInputElement).value))"
                    />
                    <span class="text-xs font-medium text-on-surface w-6 text-right">{{ ap.intensity }}</span>
                  </div>
                  <input
                    type="text"
                    :value="ap.triggerNote ?? ''"
                    class="neo-input w-full p-2 text-xs"
                    :placeholder="t('exerciseWizards.dailyCheckIn.practice.weatherReport.triggerPlaceholder')"
                    @input="updatePartTrigger(ap.partId, ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </AppCard>
          </template>

          <!-- Practice B: Gratitude to a Part -->
          <template v-else-if="practiceType === 'gratitude-to-part'">
            <AppCard padding="lg" class="space-y-4">
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.dailyCheckIn.practice.gratitudeToPart.title') }}</h2>
              <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.dailyCheckIn.practice.gratitudeToPart.description') }}</p>

              <PartSelector
                v-model="gratitudePartId"
                :parts="partStore.sortedParts"
                :allow-create="false"
                :label="t('exerciseWizards.dailyCheckIn.practice.gratitudeToPart.partLabel')"
              />

              <textarea
                v-model="gratitudeNote"
                rows="3"
                :placeholder="t('exerciseWizards.dailyCheckIn.practice.gratitudeToPart.notePlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />

              <div v-if="gratitudePartId && gratitudeNote.trim()" class="neo-surface p-3 rounded-xl">
                <p class="text-sm text-on-surface-variant italic">
                  "{{ t('exerciseWizards.dailyCheckIn.practice.gratitudeToPart.thankYou', { partName: gratitudePartId ? getPartName(gratitudePartId) : '', note: gratitudeNote.trim() }) }}"
                </p>
              </div>
            </AppCard>
          </template>

          <!-- Practice C: Self-Energy Moment -->
          <template v-else-if="practiceType === 'self-energy-moment'">
            <AppCard padding="lg" class="space-y-4">
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.dailyCheckIn.practice.selfEnergyMoment.title') }}</h2>
              <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.dailyCheckIn.practice.selfEnergyMoment.description') }}</p>

              <div class="flex flex-wrap gap-2">
                <button
                  v-for="q in allQualities"
                  :key="q"
                  class="neo-pill px-3 py-1.5 text-sm neo-focus transition-all capitalize"
                  :class="selfEnergyQuality === q
                    ? 'bg-primary/15 text-primary font-semibold shadow-neu-pressed'
                    : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                  @click="selfEnergyQuality = q"
                >
                  {{ q }}
                </button>
              </div>

              <!-- Micro-practice for selected quality -->
              <template v-if="selfEnergyQuality">
                <div class="neo-surface p-4 rounded-xl space-y-3">
                  <p class="text-sm font-medium text-on-surface">{{ microPracticeLabel }}</p>
                  <p class="text-sm text-on-surface-variant">{{ microPracticePrompt }}</p>
                  <textarea
                    v-model="microPracticeNotes"
                    rows="2"
                    :placeholder="microPracticePlaceholder"
                    class="neo-input w-full p-3 text-sm resize-none"
                  />
                </div>
              </template>
            </AppCard>
          </template>

          <!-- Practice D: Evening Reflection -->
          <template v-else-if="practiceType === 'evening-reflection'">
            <AppCard padding="lg" class="space-y-4">
              <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.dailyCheckIn.practice.eveningReflection.title') }}</h2>
              <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.dailyCheckIn.practice.eveningReflection.description') }}</p>

              <!-- Active parts multi-select -->
              <div>
                <label class="block text-sm font-medium text-on-surface mb-2">{{ t('exerciseWizards.dailyCheckIn.practice.eveningReflection.activePartsLabel') }}</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    v-for="part in partStore.sortedParts"
                    :key="part.id"
                    class="neo-focus rounded-xl p-3 text-left transition-all"
                    :class="[
                      isPartActive(part.id)
                        ? 'neo-surface shadow-neu-pressed border-2 border-primary'
                        : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px',
                      roleBorderClass(part.role),
                    ]"
                    @click="toggleActivePart(part.id)"
                  >
                    <p class="text-sm font-medium text-on-surface truncate">{{ part.name }}</p>
                    <PartRoleBadge :role="part.role" class="mt-1" />
                  </button>
                </div>
              </div>

              <!-- Active parts detail -->
              <div v-if="activeParts.length" class="space-y-3">
                <div
                  v-for="ap in activeParts"
                  :key="ap.partId"
                  class="neo-surface p-3 rounded-xl space-y-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-on-surface">{{ getPartName(ap.partId) }}</span>
                    <PartRoleBadge v-if="getPartRole(ap.partId)" :role="getPartRole(ap.partId)!" />
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-on-surface-variant w-16 shrink-0">{{ t('exerciseWizards.dailyCheckIn.practice.eveningReflection.intensityLabel') }}</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      :value="ap.intensity"
                      class="flex-1 accent-primary"
                      @input="updatePartIntensity(ap.partId, Number(($event.target as HTMLInputElement).value))"
                    />
                    <span class="text-xs font-medium text-on-surface w-6 text-right">{{ ap.intensity }}</span>
                  </div>
                  <input
                    type="text"
                    :value="ap.triggerNote ?? ''"
                    class="neo-input w-full p-2 text-xs"
                    :placeholder="t('exerciseWizards.dailyCheckIn.practice.eveningReflection.triggerPlaceholder')"
                    @input="updatePartTrigger(ap.partId, ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>

              <!-- Self-leadership rating -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-on-surface">{{ t('exerciseWizards.dailyCheckIn.practice.eveningReflection.responseLabel') }}</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in leadershipOptions"
                    :key="option.value"
                    class="neo-pill px-3 py-1.5 text-sm neo-focus transition-all"
                    :class="selfLeadershipRating === option.value
                      ? 'bg-primary/15 text-primary font-semibold shadow-neu-pressed'
                      : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                    @click="selfLeadershipRating = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- Evening reflection textarea -->
              <textarea
                v-model="eveningReflection"
                rows="3"
                :placeholder="t('exerciseWizards.dailyCheckIn.practice.eveningReflection.reflectionPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />

              <!-- Appreciation note -->
              <input
                v-model="appreciationNote"
                type="text"
                :placeholder="t('exerciseWizards.dailyCheckIn.practice.eveningReflection.appreciationPlaceholder')"
                class="neo-input w-full p-3 text-sm"
              />
            </AppCard>
          </template>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Save -->
      <template v-else-if="currentStep === 'save'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.dailyCheckIn.summary.title') }}</h2>

            <!-- Practice type badge -->
            <div class="flex items-center gap-2">
              <span class="neo-pill text-xs px-2 py-0.5 font-semibold" :class="practiceTypeBadgeClass">
                {{ practiceTypeLabel }}
              </span>
            </div>

            <!-- Summary -->
            <div class="neo-surface p-3 rounded-xl space-y-2 text-sm text-on-surface-variant">
              <template v-if="practiceType === 'weather-report'">
                <p v-for="ap in activeParts" :key="ap.partId">
                  <span class="font-medium text-on-surface">{{ getPartName(ap.partId) }}</span>
                  — {{ t('exerciseWizards.dailyCheckIn.summary.intensity', { value: ap.intensity }) }}
                  <span v-if="ap.triggerNote"> · {{ ap.triggerNote }}</span>
                </p>
              </template>
              <template v-else-if="practiceType === 'gratitude-to-part'">
                <p class="italic">"{{ t('exerciseWizards.dailyCheckIn.practice.gratitudeToPart.thankYou', { partName: gratitudePartId ? getPartName(gratitudePartId) : '', note: gratitudeNote.trim() }) }}"</p>
              </template>
              <template v-else-if="practiceType === 'self-energy-moment'">
                <p>{{ t('exerciseWizards.dailyCheckIn.summary.focusedOn', { quality: selfEnergyQuality ?? '' }) }}</p>
                <p v-if="microPracticeNotes.trim()">{{ microPracticeNotes.trim() }}</p>
              </template>
              <template v-else-if="practiceType === 'evening-reflection'">
                <p v-for="ap in activeParts" :key="ap.partId">
                  <span class="font-medium text-on-surface">{{ getPartName(ap.partId) }}</span>
                  — {{ t('exerciseWizards.dailyCheckIn.summary.intensity', { value: ap.intensity }) }}
                </p>
                <p v-if="selfLeadershipRating">
                  {{ t('exerciseWizards.dailyCheckIn.summary.selfLeadership', { label: selfLeadershipLabel }) }}
                </p>
                <p v-if="appreciationNote.trim()">{{ t('exerciseWizards.dailyCheckIn.summary.appreciation', { note: appreciationNote.trim() }) }}</p>
              </template>
            </div>

            <!-- Streak Display -->
            <div class="space-y-2">
              <div class="flex items-center gap-1.5 justify-center">
                <div
                  v-for="day in weekDays"
                  :key="day.label"
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  :class="day.completed
                    ? 'bg-primary text-white'
                    : day.isToday
                      ? 'border-2 border-primary text-primary'
                      : 'bg-neu-border/20 text-on-surface-variant'"
                >
                  {{ day.label }}
                </div>
              </div>
              <p class="text-xs text-on-surface-variant text-center">
                {{ checkInStore.weeklyCheckInCount === 1
                  ? t('exerciseWizards.dailyCheckIn.summary.weeklyCheckInsSingular', { count: checkInStore.weeklyCheckInCount })
                  : t('exerciseWizards.dailyCheckIn.summary.weeklyCheckInsPlural', { count: checkInStore.weeklyCheckInCount }) }}
              </p>
            </div>

            <!-- Weekly Summary -->
            <div v-if="checkInStore.weeklyCheckInCount >= 7" class="space-y-2">
              <AppButton
                v-if="!weeklySummary"
                variant="tonal"
                :loading="isLoadingSummary"
                class="w-full"
                @click="requestWeeklySummary()"
              >
                <AppIcon name="auto_awesome" class="text-base mr-1" />
                {{ t('exerciseWizards.dailyCheckIn.summary.getWeeklySummary') }}
              </AppButton>
              <div v-if="weeklySummary" class="neo-surface p-4 rounded-xl">
                <p class="text-sm text-on-surface whitespace-pre-line">{{ weeklySummary }}</p>
              </div>
            </div>
            <p v-else class="text-xs text-on-surface-variant text-center">
              {{ (7 - checkInStore.weeklyCheckInCount) === 1
                ? t('exerciseWizards.dailyCheckIn.summary.moreForSummarySingular', { count: 7 - checkInStore.weeklyCheckInCount })
                : t('exerciseWizards.dailyCheckIn.summary.moreForSummaryPlural', { count: 7 - checkInStore.weeklyCheckInCount }) }}
            </p>

            <!-- Notes -->
            <textarea
              v-model="notes"
              rows="2"
              :placeholder="t('exerciseWizards.dailyCheckIn.summary.notesPlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :loading="isSaving" @click="handleSave">
              {{ t('exerciseWizards.dailyCheckIn.summary.saveButton') }}
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
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useDailyCheckInWizard, type DailyCheckInStep } from '@/composables/useDailyCheckInWizard'
import { useT } from '@/composables/useT'
import type { IFSPartRole, IFSDailyCheckInType, SelfEnergyQuality } from '@/domain/exercises'
import { getChildPeriods, getPeriodRefsForDate } from '@/utils/periods'

const { t } = useT()

const emit = defineEmits<{
  saved: []
}>()

const partStore = useIFSPartStore()
const checkInStore = useIFSDailyCheckInStore()
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const STEPS: DailyCheckInStep[] = ['select-practice', 'practice', 'save']
const stepLabels = computed(() => [
  t('exerciseWizards.dailyCheckIn.steps.selectPractice'),
  t('exerciseWizards.dailyCheckIn.steps.practice'),
  t('exerciseWizards.dailyCheckIn.steps.summary'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  practiceType,
  activeParts,
  toggleActivePart,
  updatePartIntensity,
  updatePartTrigger,
  gratitudePartId,
  gratitudeNote,
  selfEnergyQuality,
  microPracticeNotes,
  eveningReflection,
  selfLeadershipRating,
  appreciationNote,
  notes,
  weeklySummary,
  isLoadingSummary,
  requestWeeklySummary,
  isSaving,
  save,
} = useDailyCheckInWizard()

const allQualities: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

const practiceOptions = computed(() => [
  {
    type: 'weather-report' as IFSDailyCheckInType,
    label: t('exerciseWizards.dailyCheckIn.selectPractice.practices.weatherReport.label'),
    description: t('exerciseWizards.dailyCheckIn.selectPractice.practices.weatherReport.description'),
    duration: t('exerciseWizards.dailyCheckIn.selectPractice.practices.weatherReport.duration'),
    icon: 'cloud',
    bgClass: 'bg-sky-50',
    iconClass: 'text-sky-600',
  },
  {
    type: 'gratitude-to-part' as IFSDailyCheckInType,
    label: t('exerciseWizards.dailyCheckIn.selectPractice.practices.gratitudeToPart.label'),
    description: t('exerciseWizards.dailyCheckIn.selectPractice.practices.gratitudeToPart.description'),
    duration: t('exerciseWizards.dailyCheckIn.selectPractice.practices.gratitudeToPart.duration'),
    icon: 'favorite',
    bgClass: 'bg-rose-50',
    iconClass: 'text-rose-600',
  },
  {
    type: 'self-energy-moment' as IFSDailyCheckInType,
    label: t('exerciseWizards.dailyCheckIn.selectPractice.practices.selfEnergyMoment.label'),
    description: t('exerciseWizards.dailyCheckIn.selectPractice.practices.selfEnergyMoment.description'),
    duration: t('exerciseWizards.dailyCheckIn.selectPractice.practices.selfEnergyMoment.duration'),
    icon: 'wb_sunny',
    bgClass: 'bg-yellow-50',
    iconClass: 'text-yellow-600',
  },
  {
    type: 'evening-reflection' as IFSDailyCheckInType,
    label: t('exerciseWizards.dailyCheckIn.selectPractice.practices.eveningReflection.label'),
    description: t('exerciseWizards.dailyCheckIn.selectPractice.practices.eveningReflection.description'),
    duration: t('exerciseWizards.dailyCheckIn.selectPractice.practices.eveningReflection.duration'),
    icon: 'dark_mode',
    bgClass: 'bg-indigo-50',
    iconClass: 'text-indigo-600',
  },
])

const leadershipOptions = computed(() => [
  { value: 'mostly-self' as const, label: t('exerciseWizards.dailyCheckIn.practice.eveningReflection.leadershipOptions.mostlySelf') },
  { value: 'mostly-part' as const, label: t('exerciseWizards.dailyCheckIn.practice.eveningReflection.leadershipOptions.mostlyPart') },
  { value: 'mixed' as const, label: t('exerciseWizards.dailyCheckIn.practice.eveningReflection.leadershipOptions.mixed') },
])

// Micro-practice content for Self-Energy Moment
const microPracticeLabel = computed(() =>
  selfEnergyQuality.value ? t(`exerciseWizards.dailyCheckIn.practice.selfEnergyMoment.microPractices.${selfEnergyQuality.value}.label`) : '',
)
const microPracticePrompt = computed(() =>
  selfEnergyQuality.value ? t(`exerciseWizards.dailyCheckIn.practice.selfEnergyMoment.microPractices.${selfEnergyQuality.value}.prompt`) : '',
)
const microPracticePlaceholder = computed(() =>
  selfEnergyQuality.value ? t(`exerciseWizards.dailyCheckIn.practice.selfEnergyMoment.microPractices.${selfEnergyQuality.value}.placeholder`) : '',
)

const practiceTypeLabel = computed(() => {
  const typeMap: Record<string, string> = {
    'weather-report': 'weatherReport',
    'gratitude-to-part': 'gratitudeToPart',
    'self-energy-moment': 'selfEnergyMoment',
    'evening-reflection': 'eveningReflection',
  }
  const key = typeMap[practiceType.value ?? '']
  return key ? t(`exerciseWizards.dailyCheckIn.summary.practiceLabels.${key}`) : ''
})

const practiceTypeBadgeClass = computed(() => {
  switch (practiceType.value) {
    case 'weather-report': return 'bg-sky-100 text-sky-700'
    case 'gratitude-to-part': return 'bg-rose-100 text-rose-700'
    case 'self-energy-moment': return 'bg-yellow-100 text-yellow-700'
    case 'evening-reflection': return 'bg-indigo-100 text-indigo-700'
    default: return 'bg-neu-base text-on-surface-variant'
  }
})

const selfLeadershipLabel = computed(() => {
  const opt = leadershipOptions.value.find((o) => o.value === selfLeadershipRating.value)
  return opt?.label ?? ''
})

// Week display
const weekDays = computed(() => {
  const refs = getPeriodRefsForDate(new Date())
  const days = getChildPeriods(refs.week)
  const checkInDates = new Set(
    checkInStore.currentWeekCheckIns.map((c) => getPeriodRefsForDate(c.createdAt).day),
  )

  return days.map((dayRef, idx) => {
    return {
      label: WEEKDAY_LABELS[idx],
      completed: checkInDates.has(dayRef),
      isToday: dayRef === refs.day,
    }
  })
})

function isPartActive(partId: string): boolean {
  return activeParts.value.some((ap) => ap.partId === partId)
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? 'Unknown'
}

function getPartRole(id: string): IFSPartRole | null {
  return partStore.getPartById(id)?.role ?? null
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
