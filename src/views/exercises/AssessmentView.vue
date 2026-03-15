<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="mb-6 flex items-center gap-4">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t(session.definition.titleKey) }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t(session.definition.subtitleKey) }}</p>
      </div>
    </div>

    <div v-if="session.isInitializing" class="py-8 text-center text-sm text-on-surface-variant">
      {{ t('common.loading') }}
    </div>

    <template v-else>
      <AssessmentProgress
        :step="session.step"
        :current-page="session.currentPage"
        :total-pages="session.totalPages"
        :answered-count="session.answeredCount"
        :total-count="session.totalCount"
        class="mb-4"
      />

      <AssessmentIntroCard
        v-if="session.step === 'intro'"
        :definition="session.definition"
        :has-in-progress="Boolean(session.inProgressAttempt)"
        :has-history="Boolean(session.latestCompletedAttempt)"
        :can-retake="session.retakeStatus.canRetake"
        :retake-eligible-at="session.retakeStatus.retakeEligibleAt"
        :latest-completed-at="session.latestCompletedAttempt?.completedAt"
        @start="session.goToConsent"
        @resume="handleResume"
        @retake="handleRetake"
      />

      <ConsentDisclaimerStep
        v-else-if="session.step === 'consent'"
        v-model="session.consentAccepted"
        :title="t(`${assessmentPrefix}.consent.title`)"
        :body="t(`${assessmentPrefix}.consent.body`)"
        @back="session.goToIntro"
        @continue="handleConsentContinue"
      />

      <template v-else-if="session.step === 'questions'">
        <LikertItemList
          :definition="session.definition"
          :items="session.pageItems"
          :responses="session.responsesMap"
          :page-start-index="session.currentPage * session.definition.pageSize"
          @update-response="handleUpdateResponse"
        />

        <div class="mt-4 flex items-center justify-between gap-2">
          <AppButton
            variant="text"
            @click="session.currentPage === 0 ? session.goToIntro() : session.previousPage()"
          >
            {{ t('common.buttons.back') }}
          </AppButton>

          <div class="flex items-center gap-2">
            <AppButton
              v-if="session.currentPage < session.totalPages - 1"
              variant="filled"
              @click="session.nextPage"
            >
              {{ t('common.buttons.next') }}
            </AppButton>
            <AppButton
              v-else
              variant="filled"
              @click="session.openReview"
            >
              {{ t('assessments.common.flow.review') }}
            </AppButton>
          </div>
        </div>
      </template>

      <AssessmentReview
        v-else-if="session.step === 'review'"
        :definition="session.definition"
        :responses="session.responsesMap"
        :unanswered-items="session.unansweredItems"
        :can-submit="session.canSubmit"
        @back="session.backToQuestions()"
        @edit-item="handleEditItem"
        @submit="handleSubmit"
      />

      <AssessmentResults
        v-else-if="session.step === 'results'"
        :definition="session.definition"
        :computation="session.effectiveComputation"
        :completed-at="session.latestCompletedAttempt?.completedAt"
        :retake-eligible-at="session.retakeStatus.retakeEligibleAt"
        :can-retake="session.retakeStatus.canRetake"
        :supports-centering="Boolean(session.definition.supportsCentering)"
        :centered-enabled="session.centeredResultsEnabled"
        @toggle-centering="handleCenteringToggle"
        @back="session.goToIntro"
        @retake="handleRetake"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppButton from '@/components/AppButton.vue'
import AssessmentIntroCard from '@/components/assessments/AssessmentIntroCard.vue'
import ConsentDisclaimerStep from '@/components/assessments/ConsentDisclaimerStep.vue'
import LikertItemList from '@/components/assessments/LikertItemList.vue'
import AssessmentProgress from '@/components/assessments/AssessmentProgress.vue'
import AssessmentReview from '@/components/assessments/AssessmentReview.vue'
import AssessmentResults from '@/components/assessments/AssessmentResults.vue'
import { useAssessmentSession } from '@/composables/useAssessmentSession'
import { useT } from '@/composables/useT'
import type { AssessmentId } from '@/domain/assessments'

const router = useRouter()
const route = useRoute()
const { t } = useT()

const assessmentId = computed(() => route.params.assessmentId as string)

const validAssessmentIds: AssessmentId[] = ['ipip-bfm-50', 'ipip-neo-120', 'hexaco-60', 'pvq-40', 'vlq']
const currentAssessmentId = validAssessmentIds.includes(assessmentId.value as AssessmentId)
  ? (assessmentId.value as AssessmentId)
  : 'ipip-bfm-50'

if (!validAssessmentIds.includes(assessmentId.value as AssessmentId)) {
  router.replace('/exercises')
}

const session = reactive(useAssessmentSession(currentAssessmentId))

const assessmentPrefix = computed(() => {
  const marker = '.meta.title'
  const key = session.definition.titleKey
  if (!key.includes(marker)) return 'assessments.common'
  return key.slice(0, key.indexOf(marker))
})

onMounted(async () => {
  await session.initialize()
})

async function handleResume(): Promise<void> {
  await session.resumeAttempt()
}

async function handleRetake(): Promise<void> {
  if (!session.retakeStatus.canRetake) return
  await session.startRetake()
}

async function handleConsentContinue(): Promise<void> {
  if (!session.consentAccepted) return
  await session.startNewAttemptAfterConsent()
}

function handleUpdateResponse(itemId: string, value: number): void {
  void session.saveResponse(itemId, value)
}

function handleEditItem(itemId: string): void {
  const index = session.definition.items.findIndex((item) => item.id === itemId)
  const page = index >= 0 ? Math.floor(index / session.definition.pageSize) : 0
  session.backToQuestions(page)
}

async function handleSubmit(): Promise<void> {
  await session.submit()
}

function handleCenteringToggle(enabled: boolean): void {
  void session.refreshResults(enabled)
}
</script>
