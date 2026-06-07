<template>
  <div class="flex flex-col min-h-[100dvh]">
    <!-- Sticky header -->
    <header
      class="sticky top-0 z-10 bg-neu-base/85 backdrop-blur px-4 pt-4 pb-3 flex items-center gap-3"
    >
      <button
        type="button"
        class="neo-back-btn p-2 text-neu-text neo-focus"
        :aria-label="t('common.buttons.back')"
        @click="handleBack"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>

      <div class="min-w-0 flex-1">
        <h1 class="text-base font-semibold text-on-surface truncate">
          {{ t('profile.psychologicalProfile.wizard.title') }}
        </h1>
        <p class="text-xs text-on-surface-variant truncate">
          {{ stepLabel }}
        </p>
      </div>

      <!-- Step dots -->
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(step, idx) in STEP_ORDER"
          :key="step"
          type="button"
          :disabled="idx > stepIndex"
          :aria-label="stepAriaLabel(step, idx)"
          class="rounded-full transition-all duration-200"
          :class="stepDotClass(idx)"
          :data-test-step-dot="step"
          @click="handleStepDot(step, idx)"
        />
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 px-4 py-4 pb-28">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        mode="out-in"
      >
        <ProfileScopeStep
          v-if="currentStep === 'scope'"
          :data-types="dataTypes"
          :date-range="dateRange"
          :filters="filters"
          @update:data-types="onDataTypesUpdate"
          @update:date-range="onDateRangeUpdate"
          @update:filters="onFiltersUpdate"
        />
        <ProfilePreviewStep
          v-else-if="currentStep === 'preview'"
          :is-loading="isPreviewLoading"
          :error="previewError"
          :counts-by-type="previewCountsByType"
          :headers="previewObjectHeaders"
          :approx-tokens="previewApproxTokens"
          :tokens-by-type="previewTokensByType"
          :tokens-by-age="previewTokensByAge"
          :dropped-by-type="previewDroppedByType"
          :summarized-periods="previewSummarizedPeriods"
          :data-types="dataTypes"
          :date-range="dateRange"
          @refresh="computePreview"
        />
        <ProfileGenerateStep
          v-else-if="currentStep === 'generate'"
          :state="generateState"
          :error-message="generateError"
          :error-code="generateErrorCode"
          @retry="retryGenerate"
          @go-to-settings="goToSettings"
          @edit-scope="() => goToStep('scope')"
        />
        <ProfileReviewStep
          v-else-if="currentStep === 'review' && generatedSections"
          :wizard="wizard"
        />
        <ProfileSaveStep
          v-else-if="currentStep === 'save'"
          :wizard="wizard"
          @update:note="onNoteUpdate"
        />
        <div v-else class="text-sm text-on-surface-variant">
          {{ t('profile.psychologicalProfile.wizard.generationComingSoon') }}
        </div>
      </Transition>
    </main>

    <!-- Sticky footer -->
    <footer
      class="sticky bottom-0 flex items-center gap-3 px-4 py-3 bg-neu-base/90 backdrop-blur border-t border-neu-border/30"
    >
      <AppButton
        v-if="currentStep !== 'scope'"
        variant="text"
        :disabled="backDisabled"
        data-test-back
        @click="onBack"
      >
        {{ t('common.buttons.back') }}
      </AppButton>
      <div class="flex-1" />
      <AppButton
        v-if="currentStep !== 'generate'"
        variant="filled"
        :disabled="!canAdvance"
        data-test-next
        @click="nextStep"
      >
        {{ nextLabel }}
      </AppButton>
    </footer>

    <AppSnackbar ref="snackbarRef" />

    <AppDialog
      v-model="showBackConfirm"
      :title="t('profile.psychologicalProfile.wizard.review.backDialog.title')"
      :message="t('profile.psychologicalProfile.wizard.review.backDialog.message')"
      :confirm-text="t('common.buttons.continue')"
      :cancel-text="t('common.buttons.stay')"
      @confirm="confirmBack"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ProfileScopeStep from '@/components/profile/ProfileScopeStep.vue'
import ProfilePreviewStep from '@/components/profile/ProfilePreviewStep.vue'
import ProfileGenerateStep from '@/components/profile/ProfileGenerateStep.vue'
import ProfileReviewStep from '@/components/profile/ProfileReviewStep.vue'
import ProfileSaveStep from '@/components/profile/ProfileSaveStep.vue'
import { useT } from '@/composables/useT'
import {
  STEP_ORDER,
  useProfileBuildWizard,
  type ProfileBuildStep,
} from '@/composables/useProfileBuildWizard'
import type {
  ProfileDataType,
  ProfileDateRange,
  ProfileScopeFilters,
} from '@/domain/userProfile'

const router = useRouter()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const wizard = useProfileBuildWizard()
const {
  currentStep,
  stepIndex,
  dataTypes,
  dateRange,
  filters,
  canAdvance,
  previewCountsByType,
  previewObjectHeaders,
  previewApproxTokens,
  previewTokensByType,
  previewTokensByAge,
  previewDroppedByType,
  previewSummarizedPeriods,
  isPreviewLoading,
  previewError,
  generateState,
  generateError,
  generateErrorCode,
  generatedSections,
  nextStep,
  goToStep,
  computePreview,
  retryGenerate,
  flushDraft,
} = wizard

const stepLabel = computed(() =>
  t(`profile.psychologicalProfile.wizard.steps.${currentStep.value}`),
)

const nextLabel = computed(() => {
  if (currentStep.value === 'scope') {
    return t('profile.psychologicalProfile.wizard.buttons.preview')
  }
  if (currentStep.value === 'preview') {
    return t('profile.psychologicalProfile.wizard.buttons.generate')
  }
  if (currentStep.value === 'review') {
    return t('profile.psychologicalProfile.wizard.buttons.saveStep')
  }
  if (currentStep.value === 'save') {
    return t('profile.psychologicalProfile.wizard.buttons.save')
  }
  return t('common.buttons.next')
})

// When the wizard reports a successful save, show confirmation, reset the
// in-memory wizard state (so a subsequent visit starts at scope), and
// navigate back to the overview with the new version preselected.
watch(
  () => wizard.onSaveComplete.value,
  (saved) => {
    if (!saved) return
    const savedId = saved.id
    snackbarRef.value?.show(
      t('profile.psychologicalProfile.wizard.save.success'),
    )
    wizard.resetWizard()
    void router.push({
      name: 'profile-psychological',
      query: { versionId: savedId },
    })
  },
)

// Back-confirmation dialog: fires only on the review step when the user has
// unsaved manual edits. Every other step delegates straight to
// `wizard.previousStep()`.
const showBackConfirm = ref(false)

function onBack(): void {
  if (currentStep.value === 'review' && wizard.hasUnsavedEdits.value) {
    showBackConfirm.value = true
    return
  }
  wizard.previousStep()
}

function confirmBack(): void {
  showBackConfirm.value = false
  wizard.previousStep()
}

// Block Back while a generation is in flight so the user can't navigate
// away mid-request and orphan the API call.
const backDisabled = computed(
  () => currentStep.value === 'generate' && generateState.value === 'in-flight',
)

function stepDotClass(idx: number): string {
  if (idx < stepIndex.value) return 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
  if (idx === stepIndex.value) return 'neo-step-active w-3.5 h-3.5'
  return 'neo-step-future w-2.5 h-2.5'
}

function stepAriaLabel(step: ProfileBuildStep, idx: number): string {
  const label = t(`profile.psychologicalProfile.wizard.steps.${step}`)
  if (idx < stepIndex.value) return `Step: ${label} (completed)`
  if (idx === stepIndex.value) return `Step: ${label} (current)`
  return `Step: ${label}`
}

function handleStepDot(step: ProfileBuildStep, idx: number): void {
  if (idx >= stepIndex.value) return
  goToStep(step)
}

function onDataTypesUpdate(next: ProfileDataType[]): void {
  dataTypes.value = next
}

function onDateRangeUpdate(next: ProfileDateRange): void {
  dateRange.value = next
}

function onFiltersUpdate(next: ProfileScopeFilters): void {
  Object.assign(filters, next)
}

function onNoteUpdate(next: string): void {
  wizard.note.value = next
}

async function handleBack(): Promise<void> {
  flushDraft()
  await router.push({ name: 'profile-psychological' })
}

async function goToSettings(): Promise<void> {
  await router.push({ name: 'profile', hash: '#ai-settings' })
}
</script>
