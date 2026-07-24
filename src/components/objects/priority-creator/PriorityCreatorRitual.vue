<template>
  <div class="priority-creator">
    <!-- Success -->
    <section v-if="ritual.result.value" class="mg-v2-surface mg-v2-surface--raised mx-auto max-w-2xl space-y-5 p-8 text-center">
      <AppIcon name="check_circle" class="text-4xl text-primary" />
      <div class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          {{ ritual.result.value.priority.status === 'draft'
            ? t('planning.priorityRitual.success.eyebrowDraft')
            : t('planning.priorityRitual.success.eyebrowActive') }}
        </p>
        <h2 class="text-xl font-semibold text-on-surface">{{ ritual.result.value.priority.title }}</h2>
        <p class="text-sm text-on-surface-variant">{{ t('planning.priorityRitual.success.body') }}</p>
      </div>

      <PriorityDraftChecklist
        :priority-id="ritual.result.value.priority.id"
        @notify="emit('notify', $event)"
        @error="emit('error', $event)"
      />

      <div class="flex justify-center">
        <button type="button" class="mg-v2-button mg-v2-button--primary" @click="emit('finished', ritual.result.value.priority.id)">
          {{ t('planning.priorityRitual.success.goToLibrary') }}
        </button>
      </div>
    </section>

    <!-- Ritual -->
    <DsWizardShell
      v-else
      :eyebrow="t('planning.priorityRitual.eyebrow')"
      :title="t('planning.priorityRitual.title')"
      :description="t('planning.priorityRitual.description')"
      :current="ritual.stepIndex.value"
      :steps="shellSteps"
    >
      <template #header-actions>
        <button
          type="button"
          class="mg-v2-button mg-v2-button--icon"
          :aria-label="t('common.buttons.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" class="text-base" />
        </button>
      </template>

      <div v-if="ritual.loading.value" class="py-10 text-center text-sm text-on-surface-variant">
        {{ t('common.loading') }}
      </div>

      <div v-else class="space-y-5">
        <!-- Resume banner -->
        <div
          v-if="ritual.resumedFromDraft.value && showResumeBanner"
          class="mg-v2-surface mg-v2-surface--inset flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div class="flex items-center gap-2 text-sm text-on-surface">
            <AppIcon name="history" class="text-base text-on-surface-variant" />
            <span>{{ t('planning.priorityRitual.resume.banner', { date: draftDateLabel }) }}</span>
          </div>
          <div class="flex gap-2">
            <button type="button" class="mg-v2-button mg-v2-button--quiet text-sm" @click="handleDiscardDraft">
              {{ t('planning.priorityRitual.resume.discard') }}
            </button>
            <button type="button" class="mg-v2-button mg-v2-button--icon-sm" :aria-label="t('common.buttons.close')" @click="showResumeBanner = false">
              <AppIcon name="close" class="text-sm" />
            </button>
          </div>
        </div>

        <h2 class="text-lg font-semibold text-on-surface">
          {{ t(`planning.priorityRitual.steps.${ritual.currentStep.value}.title`) }}
        </h2>

        <Transition name="priority-creator-step" mode="out-in">
          <!-- 1 · Meaning -->
          <div v-if="ritual.currentStep.value === 'meaning'" key="meaning" class="space-y-4">
            <label class="mg-v2-field-wrap">
              <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.meaning.titleLabel') }}</span>
              <input v-model="ritual.form.title" class="mg-v2-field w-full text-sm" :placeholder="t('planning.priorityRitual.meaning.titlePlaceholder')" />
            </label>
            <label class="mg-v2-field-wrap">
              <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.meaning.whyNow') }}</span>
              <textarea v-model="ritual.form.whyNow" rows="4" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.meaning.whyNowPlaceholder')" />
            </label>
            <label class="mg-v2-field-wrap">
              <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.meaning.direction') }}</span>
              <textarea v-model="ritual.form.direction" rows="4" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.meaning.directionPlaceholder')" />
            </label>
            <p class="text-xs text-on-surface-variant">{{ t('planning.priorityRitual.meaning.requiredHint') }}</p>
          </div>

          <!-- 2 · Boundaries + portfolio -->
          <div v-else-if="ritual.currentStep.value === 'boundaries'" key="boundaries" class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="mg-v2-field-wrap">
                <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.boundaries.influence') }}</span>
                <textarea v-model="ritual.form.influence" rows="4" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.boundaries.influencePlaceholder')" />
              </label>
              <label class="mg-v2-field-wrap">
                <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.boundaries.notControlled') }}</span>
                <textarea v-model="ritual.form.notControlled" rows="4" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.boundaries.notControlledPlaceholder')" />
              </label>
            </div>
            <label class="mg-v2-field-wrap">
              <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.boundaries.tradeoffs') }}</span>
              <textarea v-model="ritual.form.tradeoffs" rows="4" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.boundaries.tradeoffsPlaceholder')" />
            </label>

            <div class="mg-v2-surface mg-v2-surface--inset space-y-3 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.priorityRitual.boundaries.portfolioTitle') }}
              </p>
              <p v-if="ritual.activePriorities.value.length === 0" class="text-sm text-on-surface-variant">
                {{ t('planning.priorityRitual.boundaries.portfolioEmpty') }}
              </p>
              <ul v-else class="space-y-2">
                <li
                  v-for="priority in ritual.activePriorities.value"
                  :key="priority.id"
                  class="flex items-center justify-between gap-3 text-sm text-on-surface"
                >
                  <span class="flex items-center gap-2">
                    <AppIcon :name="priority.icon || 'north_star'" class="text-base text-on-surface-variant" />
                    {{ priority.title }}
                  </span>
                  <button
                    v-if="ritual.atPortfolioLimit.value"
                    type="button"
                    class="mg-v2-button mg-v2-button--quiet text-xs"
                    @click="handlePause(priority.id)"
                  >
                    <AppIcon name="pause" class="text-sm" />
                    {{ t('planning.priorityRitual.boundaries.pause') }}
                  </button>
                </li>
              </ul>
              <div v-if="ritual.atPortfolioLimit.value" class="rounded-xl bg-status-warn-soft p-3 text-status-warn-on">
                <p class="text-sm font-semibold">
                  {{ t('planning.priorityRitual.boundaries.limitTitle', { count: ritual.activePriorities.value.length, max: maxActivePriorities }) }}
                </p>
                <p class="text-xs">{{ t('planning.priorityRitual.boundaries.limitBody') }}</p>
              </div>
            </div>
          </div>

          <!-- 3 · Signals -->
          <div v-else-if="ritual.currentStep.value === 'signals'" key="signals" class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <div v-for="kind in (['progress', 'risk'] as const)" :key="kind" class="mg-v2-surface mg-v2-surface--flat space-y-3 p-4">
                <p class="text-sm font-semibold text-on-surface">
                  {{ t(`planning.priorityRitual.signals.${kind}Title`) }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="signal in (kind === 'progress' ? ritual.progressSignals.value : ritual.riskSignals.value)"
                    :key="signal"
                    type="button"
                    class="mg-v2-pill"
                    @click="ritual.removeSignal(kind, signal)"
                  >
                    {{ signal }}
                    <AppIcon name="close" class="text-xs text-on-surface-variant" />
                  </button>
                </div>
                <input
                  class="mg-v2-field w-full text-sm"
                  :placeholder="t('planning.priorityRitual.signals.addPlaceholder')"
                  :aria-label="t(`planning.priorityRitual.signals.${kind}Title`)"
                  @keydown.enter.prevent="handleAddSignal(kind, $event)"
                />
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-semibold text-on-surface">{{ t('planning.priorityRitual.signals.endingLabel') }}</p>
              <div class="grid gap-2 md:grid-cols-2">
                <button
                  v-for="ending in endingOptions"
                  :key="ending.value"
                  type="button"
                  class="mg-v2-surface p-4 text-left transition"
                  :class="ritual.form.endingType === ending.value ? 'mg-v2-surface--raised-sm ring-1 ring-primary' : 'mg-v2-surface--flat'"
                  :aria-pressed="ritual.form.endingType === ending.value"
                  @click="ritual.form.endingType = ending.value"
                >
                  <span class="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <AppIcon :name="ending.icon" class="text-base" />
                    {{ ending.label }}
                  </span>
                  <span class="mt-1 block text-xs text-on-surface-variant">{{ ending.hint }}</span>
                </button>
              </div>
              <label v-if="ritual.form.endingType === 'natural'" class="mg-v2-field-wrap">
                <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.signals.endingDescriptionLabel') }}</span>
                <textarea v-model="ritual.form.endingDescription" rows="3" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.signals.endingDescriptionPlaceholder')" />
              </label>
            </div>
          </div>

          <!-- 4 · Support map -->
          <div v-else-if="ritual.currentStep.value === 'support'" key="support" class="space-y-4">
            <p class="text-sm text-on-surface-variant">{{ t('planning.priorityRitual.support.intro') }}</p>

            <div class="mg-v2-surface mg-v2-surface--flat space-y-3 p-4">
              <div>
                <p class="text-sm font-semibold text-on-surface">{{ t('planning.priorityRitual.support.newTitle') }}</p>
                <p class="text-xs text-on-surface-variant">{{ t('planning.priorityRitual.support.newHint') }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex gap-1">
                  <button
                    v-for="option in newProposalTypes"
                    :key="option.value"
                    type="button"
                    class="mg-v2-pill"
                    :class="{ 'ring-1 ring-primary': newProposalType === option.value }"
                    :aria-pressed="newProposalType === option.value"
                    @click="newProposalType = option.value"
                  >
                    <AppIcon :name="option.icon" class="text-xs" />
                    {{ option.label }}
                  </button>
                </div>
                <input
                  v-model="newProposalTitle"
                  class="mg-v2-field min-w-[200px] flex-1 text-sm"
                  :placeholder="t('planning.priorityRitual.support.addTitlePlaceholder')"
                  @keydown.enter.prevent="handleAddProposal"
                />
                <button type="button" class="mg-v2-button text-sm" :disabled="!newProposalTitle.trim()" @click="handleAddProposal">
                  <AppIcon name="add" class="text-base" />
                  {{ t('planning.priorityRitual.support.addButton') }}
                </button>
              </div>

              <p v-if="ritual.proposals.value.length === 0" class="text-sm text-on-surface-variant">
                {{ t('planning.priorityRitual.support.noneYet') }}
              </p>
              <div v-else class="grid gap-2 md:grid-cols-2">
                <div
                  v-for="proposal in ritual.proposals.value"
                  :key="proposal.id"
                  class="mg-v2-surface flex items-start justify-between gap-2 p-3"
                  :class="proposal.selected ? 'mg-v2-surface--raised-sm ring-1 ring-primary' : 'mg-v2-surface--flat'"
                >
                  <button type="button" class="flex flex-1 items-start gap-2 text-left" :aria-pressed="proposal.selected" @click="ritual.toggleProposalSelected(proposal.id)">
                    <AppIcon :name="proposal.selected ? 'check_circle' : proposalIcon(proposal.kind === 'new' ? proposal.objectType : proposal.subjectRef?.subjectType)" class="mt-0.5 text-base" :class="proposal.selected ? 'text-primary' : 'text-on-surface-variant'" />
                    <span>
                      <span class="block text-xs text-on-surface-variant">
                        {{ proposal.kind === 'new'
                          ? `${proposalTypeLabel(proposal.objectType)} · ${t('planning.priorityRitual.relations.newBadge')}`
                          : `${proposalTypeLabel(proposal.subjectRef?.subjectType)} · ${t('planning.priorityRitual.relations.existingBadge')}` }}
                      </span>
                      <span class="block text-sm font-medium text-on-surface">{{ proposal.title }}</span>
                    </span>
                  </button>
                  <button
                    v-if="proposal.kind === 'new'"
                    type="button"
                    class="mg-v2-button mg-v2-button--icon-sm"
                    :aria-label="t('planning.priorityRitual.support.removeLabel')"
                    @click="ritual.removeProposal(proposal.id)"
                  >
                    <AppIcon name="delete" class="text-sm" />
                  </button>
                </div>
              </div>
            </div>

            <div class="mg-v2-surface mg-v2-surface--flat space-y-3 p-4">
              <div>
                <p class="text-sm font-semibold text-on-surface">{{ t('planning.priorityRitual.support.libraryTitle') }}</p>
                <p class="text-xs text-on-surface-variant">{{ t('planning.priorityRitual.support.libraryHint') }}</p>
              </div>
              <p v-if="ritual.libraryCandidates.value.length === 0" class="text-sm text-on-surface-variant">
                {{ t('planning.priorityRitual.support.libraryEmpty') }}
              </p>
              <div v-else class="grid gap-2 md:grid-cols-2">
                <button
                  v-for="candidate in ritual.libraryCandidates.value"
                  :key="`${candidate.subjectRef.subjectType}:${candidate.subjectRef.subjectId}`"
                  type="button"
                  class="mg-v2-surface flex items-center gap-2 p-3 text-left"
                  :class="ritual.isLinkedCandidate(candidate.subjectRef) ? 'mg-v2-surface--raised-sm ring-1 ring-primary' : 'mg-v2-surface--flat'"
                  :aria-pressed="ritual.isLinkedCandidate(candidate.subjectRef)"
                  @click="ritual.toggleExistingCandidate(candidate)"
                >
                  <AppIcon :name="ritual.isLinkedCandidate(candidate.subjectRef) ? 'check_circle' : proposalIcon(candidate.subjectRef.subjectType)" class="text-base" :class="ritual.isLinkedCandidate(candidate.subjectRef) ? 'text-primary' : 'text-on-surface-variant'" />
                  <span>
                    <span class="block text-xs text-on-surface-variant">{{ proposalTypeLabel(candidate.subjectRef.subjectType) }}</span>
                    <span class="block text-sm font-medium text-on-surface">{{ candidate.title }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- 5 · Relations -->
          <div v-else-if="ritual.currentStep.value === 'relations'" key="relations" class="space-y-4">
            <p class="text-sm text-on-surface-variant">{{ t('planning.priorityRitual.relations.intro') }}</p>
            <p v-if="ritual.selectedProposals.value.length === 0" class="mg-v2-surface mg-v2-surface--inset p-4 text-sm text-on-surface-variant">
              {{ t('planning.priorityRitual.relations.empty') }}
            </p>
            <div v-else class="space-y-3">
              <div v-for="proposal in ritual.selectedProposals.value" :key="proposal.id" class="mg-v2-surface mg-v2-surface--flat space-y-3 p-4">
                <div class="flex items-center gap-2">
                  <AppIcon :name="proposalIcon(proposal.kind === 'new' ? proposal.objectType : proposal.subjectRef?.subjectType)" class="text-base text-on-surface-variant" />
                  <span class="text-sm font-semibold text-on-surface">{{ proposal.title }}</span>
                  <span class="mg-v2-badge">
                    {{ proposal.kind === 'new' ? t('planning.priorityRitual.relations.newBadge') : t('planning.priorityRitual.relations.existingBadge') }}
                  </span>
                </div>
                <label class="mg-v2-field-wrap">
                  <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.relations.contributionLabel') }}</span>
                  <textarea :value="proposal.contribution" rows="2" class="mg-v2-field w-full resize-none text-sm" :placeholder="t('planning.priorityRitual.relations.contributionPlaceholder')" @input="ritual.updateProposalField(proposal.id, 'contribution', ($event.target as HTMLTextAreaElement).value)" />
                </label>
                <label class="mg-v2-field-wrap">
                  <span class="mg-v2-field-wrap__label">{{ t('planning.priorityRitual.relations.expectedSignalLabel') }}</span>
                  <input :value="proposal.expectedSignal" class="mg-v2-field w-full text-sm" :placeholder="t('planning.priorityRitual.relations.expectedSignalPlaceholder')" @input="ritual.updateProposalField(proposal.id, 'expectedSignal', ($event.target as HTMLInputElement).value)" />
                </label>
              </div>
            </div>
          </div>

          <!-- 6 · Review -->
          <div v-else key="review" class="space-y-4">
            <div class="mg-v2-surface mg-v2-surface--raised-sm flex items-start gap-3 p-4">
              <AppIcon name="north_star" class="mt-1 text-xl text-primary" />
              <div>
                <p class="text-base font-semibold text-on-surface">{{ ritual.form.title || '—' }}</p>
                <p class="text-sm text-on-surface-variant">{{ ritual.form.direction }}</p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-3">
                <div class="mg-v2-surface mg-v2-surface--flat space-y-1 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{{ t('planning.priorityRitual.review.meaningTitle') }}</p>
                  <p class="text-sm text-on-surface">{{ ritual.form.whyNow || '—' }}</p>
                </div>
                <div class="mg-v2-surface mg-v2-surface--flat space-y-1 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{{ t('planning.priorityRitual.review.endingTitle') }}</p>
                  <p class="text-sm text-on-surface">
                    {{ ritual.form.endingType === 'open' ? t('planning.priorityRitual.review.endingOpenText') : (ritual.form.endingDescription || '—') }}
                  </p>
                </div>
                <div class="mg-v2-surface mg-v2-surface--flat space-y-2 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{{ t('planning.priorityRitual.review.signalsTitle') }}</p>
                  <p v-if="!ritual.progressSignals.value.length && !ritual.riskSignals.value.length" class="text-sm text-on-surface-variant">
                    {{ t('planning.priorityRitual.review.signalsEmpty') }}
                  </p>
                  <div v-else class="flex flex-wrap gap-2">
                    <span v-for="signal in ritual.progressSignals.value" :key="`p-${signal}`" class="mg-v2-pill bg-primary-soft">{{ signal }}</span>
                    <span v-for="signal in ritual.riskSignals.value" :key="`r-${signal}`" class="mg-v2-pill bg-status-warn-soft text-status-warn-on">{{ signal }}</span>
                  </div>
                </div>
              </div>

              <div class="mg-v2-surface mg-v2-surface--flat space-y-2 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{{ t('planning.priorityRitual.review.supportTitle') }}</p>
                <p v-if="ritual.selectedProposals.value.length === 0" class="text-sm text-on-surface-variant">
                  {{ t('planning.priorityRitual.review.supportEmpty') }}
                </p>
                <ul v-else class="space-y-2">
                  <li v-for="proposal in ritual.selectedProposals.value" :key="proposal.id" class="flex items-start gap-2 text-sm">
                    <AppIcon :name="proposalIcon(proposal.kind === 'new' ? proposal.objectType : proposal.subjectRef?.subjectType)" class="mt-0.5 text-base text-on-surface-variant" />
                    <span>
                      <span class="font-medium text-on-surface">{{ proposal.title }}</span>
                      <span v-if="proposal.contribution" class="block text-xs text-on-surface-variant">{{ proposal.contribution }}</span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div v-if="ritual.selectedNewCount.value > 0" class="rounded-xl bg-primary-soft p-3 text-sm text-on-surface">
              {{ t('planning.priorityRitual.review.pendingNotice', { count: ritual.selectedNewCount.value }) }}
            </div>
            <div v-if="ritual.willCreateAsDraft.value" class="rounded-xl bg-status-warn-soft p-3 text-sm text-status-warn-on">
              {{ t('planning.priorityRitual.review.draftNotice') }}
            </div>
          </div>
        </Transition>
      </div>

      <template #footer>
        <div class="flex w-full items-center justify-between gap-3">
          <button type="button" class="mg-v2-button mg-v2-button--quiet text-sm" :disabled="!ritual.canGoBack.value" @click="ritual.goBack()">
            <AppIcon name="arrow_back" class="text-base" />
            {{ t('planning.priorityRitual.footer.back') }}
          </button>
          <button
            v-if="ritual.currentStep.value !== 'review'"
            type="button"
            class="mg-v2-button mg-v2-button--primary text-sm"
            @click="ritual.goNext()"
          >
            {{ t('planning.priorityRitual.footer.next') }}
            <AppIcon name="arrow_forward" class="text-base" />
          </button>
          <button
            v-else
            type="button"
            class="mg-v2-button mg-v2-button--primary text-sm"
            :disabled="!ritual.canFinish.value || ritual.finishing.value"
            @click="handleFinish"
          >
            <AppIcon name="rocket_launch" class="text-base" />
            {{ finishLabel }}
          </button>
        </div>
      </template>
    </DsWizardShell>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PriorityDraftChecklist from '@/components/objects/priority-creator/PriorityDraftChecklist.vue'
import { DsWizardShell } from '@/design-system/components'
import { MAX_ACTIVE_PRIORITIES, type PriorityEndingType } from '@/domain/planning'
import { RITUAL_STEPS, usePriorityCreatorRitual } from '@/composables/usePriorityCreatorRitual'
import { useT } from '@/composables/useT'

const emit = defineEmits<{
  close: []
  finished: [priorityId: string]
  notify: [message: string]
  error: [message: string]
}>()

const { t, locale } = useT()
const ritual = usePriorityCreatorRitual()

const showResumeBanner = ref(true)
const newProposalType = ref<'goal' | 'habit' | 'tracker'>('goal')
const newProposalTitle = ref('')

const shellSteps = computed(() =>
  RITUAL_STEPS.map(id => ({ id, label: t(`planning.priorityRitual.steps.${id}.label`) })),
)

const endingOptions = computed(() => [
  {
    value: 'open' as PriorityEndingType,
    icon: 'all_inclusive',
    label: t('planning.priorityRitual.signals.endingOpen'),
    hint: t('planning.priorityRitual.signals.endingOpenHint'),
  },
  {
    value: 'natural' as PriorityEndingType,
    icon: 'flag',
    label: t('planning.priorityRitual.signals.endingNatural'),
    hint: t('planning.priorityRitual.signals.endingNaturalHint'),
  },
])

/** New proposals are goal/habit/tracker; intentions are linked from the library instead. */
const newProposalTypes = computed(() => ([
  { value: 'goal' as const, icon: 'flag', label: t('planning.priorityRitual.support.types.goal') },
  { value: 'habit' as const, icon: 'routine', label: t('planning.priorityRitual.support.types.habit') },
  { value: 'tracker' as const, icon: 'monitoring', label: t('planning.priorityRitual.support.types.tracker') },
]))

const maxActivePriorities = MAX_ACTIVE_PRIORITIES

const draftDateLabel = computed(() => {
  if (!ritual.draftSavedAt.value) return ''
  const date = new Date(ritual.draftSavedAt.value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale.value === 'pl' ? 'pl-PL' : 'en-US', { day: 'numeric', month: 'long' })
})

const finishLabel = computed(() => {
  if (ritual.finishing.value) return t('planning.priorityRitual.footer.saving')
  if (ritual.willCreateAsDraft.value) return t('planning.priorityRitual.footer.finishDraft')
  const count = ritual.selectedProposals.value.length
  return count > 0
    ? t('planning.priorityRitual.footer.finishWithCount', { count })
    : t('planning.priorityRitual.footer.finish')
})

const PROPOSAL_ICONS: Record<string, string> = {
  goal: 'flag',
  keyResult: 'flag',
  habit: 'routine',
  tracker: 'monitoring',
  weeklyIntention: 'gps_fixed',
  initiative: 'rocket_launch',
}

function proposalIcon(type?: string): string {
  return (type && PROPOSAL_ICONS[type]) || 'category'
}

function proposalTypeLabel(type?: string): string {
  if (!type) return ''
  const key = type === 'keyResult' || type === 'initiative' ? 'goal' : type
  return t(`planning.priorityRitual.support.types.${key}`)
}

function handleAddSignal(kind: 'progress' | 'risk', event: Event): void {
  const input = event.target as HTMLInputElement
  ritual.addSignal(kind, input.value)
  input.value = ''
}

function handleAddProposal(): void {
  ritual.addNewProposal(newProposalType.value, newProposalTitle.value)
  newProposalTitle.value = ''
}

async function handlePause(priorityId: string): Promise<void> {
  try {
    await ritual.pausePriority(priorityId)
  } catch {
    emit('error', t('planning.objects.messages.saveError'))
  }
}

async function handleDiscardDraft(): Promise<void> {
  await ritual.discardDraft()
  showResumeBanner.value = false
}

async function handleFinish(): Promise<void> {
  const ok = await ritual.finish()
  if (!ok && ritual.finishError.value) {
    emit('error', t('planning.priorityRitual.errors.finishFailed'))
  }
}

onMounted(() => {
  void ritual.initialize()
})
</script>

<style scoped>
.priority-creator-step-enter-active {
  transition: opacity 0.2s ease;
}
.priority-creator-step-enter-from {
  opacity: 0;
}
</style>
