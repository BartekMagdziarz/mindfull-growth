<template>
  <div class="space-y-6">
    <AppCard padding="lg" class="space-y-4">
      <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.title') }}</h2>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.description') }}
      </p>
    </AppCard>

    <!-- Identify beliefs -->
    <AppCard padding="lg" class="space-y-4">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.beliefs.title') }}</h3>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.beliefs.description') }}
      </p>

      <!-- Common shadow beliefs as chips -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="key in commonBeliefKeys"
          :key="key"
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
          :class="isCommonSelected(key)
            ? 'bg-primary/20 text-primary border-primary/40'
            : 'bg-chip text-on-surface border-chip-border hover:bg-section'"
          @click="toggleCommonBelief(key)"
        >
          {{ commonLabel(key) }}
        </button>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
        @click="addCustomBelief"
      >
        <AppIcon name="add" class="text-base" />
        {{ t('exerciseWizards.shadowBeliefs.beliefs.addCustom') }}
      </button>
    </AppCard>

    <!-- Examine each belief: evidence + reframe -->
    <AppCard v-if="draft.beliefs.length > 0" padding="lg" class="space-y-4">
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.beliefs.examineHint') }}
      </p>
      <div class="space-y-4">
        <div
          v-for="(entry, index) in draft.beliefs"
          :key="index"
          class="rounded-xl border border-chip-border p-3 space-y-3"
        >
          <div class="flex items-center gap-2">
            <span class="text-primary">&#8226;</span>
            <span
              v-if="entry.commonKey"
              class="flex-1 p-2 text-sm font-medium text-on-surface"
            >{{ commonLabel(entry.commonKey) }}</span>
            <input
              v-else
              :value="entry.belief"
              type="text"
              :placeholder="t('exerciseWizards.shadowBeliefs.beliefs.customPlaceholder')"
              class="neo-input flex-1 p-2 text-sm font-medium"
              @input="entry.belief = ($event.target as HTMLInputElement).value"
            />
            <button
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors"
              @click="removeBelief(index)"
            >
              <AppIcon name="close" class="text-base" />
            </button>
          </div>

          <div class="space-y-1 pl-5">
            <label class="text-xs font-medium text-on-surface-variant">
              {{ t('exerciseWizards.shadowBeliefs.beliefs.evidenceForLabel') }}
            </label>
            <textarea
              :value="entry.evidenceFor"
              rows="2"
              :placeholder="t('exerciseWizards.shadowBeliefs.beliefs.evidenceForPlaceholder')"
              class="neo-input w-full p-2 text-sm resize-none"
              @input="entry.evidenceFor = ($event.target as HTMLTextAreaElement).value"
            />
          </div>

          <div class="space-y-1 pl-5">
            <label class="text-xs font-medium text-on-surface-variant">
              {{ t('exerciseWizards.shadowBeliefs.beliefs.evidenceAgainstLabel') }}
            </label>
            <textarea
              :value="entry.evidenceAgainst"
              rows="2"
              :placeholder="t('exerciseWizards.shadowBeliefs.beliefs.evidenceAgainstPlaceholder')"
              class="neo-input w-full p-2 text-sm resize-none"
              @input="entry.evidenceAgainst = ($event.target as HTMLTextAreaElement).value"
            />
          </div>

          <div class="space-y-1 pl-5">
            <label class="text-xs font-medium text-primary">
              {{ t('exerciseWizards.shadowBeliefs.beliefs.reframeLabel') }}
            </label>
            <textarea
              :value="entry.reframe"
              rows="2"
              :placeholder="t('exerciseWizards.shadowBeliefs.beliefs.reframePlaceholder')"
              class="neo-input w-full p-2 text-sm resize-none"
              @input="entry.reframe = ($event.target as HTMLTextAreaElement).value"
            />
          </div>
        </div>
      </div>
    </AppCard>

    <!-- Advice to others -->
    <AppCard padding="lg" class="space-y-4">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.advice.title') }}</h3>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.advice.description') }}
      </p>
      <div class="space-y-4">
        <div
          v-for="(item, index) in draft.advice"
          :key="index"
          class="rounded-xl border border-chip-border p-3 space-y-3"
        >
          <div class="flex items-center gap-2">
            <span class="text-primary">&#8226;</span>
            <input
              :value="item.advice"
              type="text"
              :placeholder="t('exerciseWizards.shadowBeliefs.advice.placeholder')"
              class="neo-input flex-1 p-2 text-sm"
              @input="item.advice = ($event.target as HTMLInputElement).value"
            />
            <button
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors"
              @click="draft.advice.splice(index, 1)"
            >
              <AppIcon name="close" class="text-base" />
            </button>
          </div>

          <div class="pl-5 space-y-2">
            <div class="flex items-center flex-wrap gap-x-3 gap-y-2">
              <span class="text-xs font-medium text-on-surface-variant">
                {{ t('exerciseWizards.shadowBeliefs.advice.followLabel') }}
              </span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in followOptions"
                  :key="opt"
                  type="button"
                  class="px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                  :class="item.followsSelf === opt
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-chip text-on-surface border-chip-border hover:bg-section'"
                  @click="item.followsSelf = item.followsSelf === opt ? '' : opt"
                >
                  {{ t(`exerciseWizards.shadowBeliefs.advice.follow.${opt}`) }}
                </button>
              </div>
            </div>

            <div v-if="item.followsSelf === 'sometimes' || item.followsSelf === 'no'" class="space-y-1 pt-1">
              <label class="text-xs font-medium text-on-surface-variant">
                {{ t('exerciseWizards.shadowBeliefs.advice.blockerLabel') }}
              </label>
              <textarea
                :value="item.blocker"
                rows="2"
                :placeholder="t('exerciseWizards.shadowBeliefs.advice.blockerPlaceholder')"
                class="neo-input w-full p-2 text-sm resize-none"
                @input="item.blocker = ($event.target as HTMLTextAreaElement).value"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
          @click="addAdvice"
        >
          <AppIcon name="add" class="text-base" />
          {{ t('exerciseWizards.shadowBeliefs.advice.addAdvice') }}
        </button>
      </div>
    </AppCard>

    <!-- Notes -->
    <AppCard padding="lg" class="space-y-3">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.reflectionTitle') }}</h3>
      <textarea
        v-model="draft.notes"
        rows="3"
        :placeholder="tg('exerciseWizards.shadowBeliefs.reflectionPlaceholder')"
        class="neo-input w-full p-3 text-sm resize-none"
      />
    </AppCard>

    <div class="flex justify-end">
      <AppButton variant="filled" :disabled="!canSave" @click="handleSave">
        {{ t('exerciseWizards.shadowBeliefs.saveButton') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useT } from '@/composables/useT'
import type { AdviceFollowThrough } from '@/domain/exercises'

const { t, tg } = useT()

const emit = defineEmits<{
  saved: [id: string]
}>()

const shadowBeliefsStore = useShadowBeliefsStore()

const COMMON_BELIEFS_BASE = 'exerciseWizards.shadowBeliefs.commonBeliefs'
const commonBeliefKeys = [
  'somethingWrong',
  'dontDeserve',
  'cantTrust',
  'neverSuccessful',
  'notGoodEnough',
  'dontBelong',
  'doEverythingMyself',
  'tooLate',
] as const

const followOptions: AdviceFollowThrough[] = ['yes', 'sometimes', 'no']

interface DraftBelief {
  commonKey?: string // set when this entry came from a common-belief chip
  belief: string // free text for custom beliefs
  evidenceFor: string
  evidenceAgainst: string
  reframe: string
}

interface DraftAdvice {
  advice: string
  followsSelf: AdviceFollowThrough | ''
  blocker: string
}

const draft = reactive({
  beliefs: [] as DraftBelief[],
  advice: [{ advice: '', followsSelf: '', blocker: '' }] as DraftAdvice[],
  notes: '',
})

function commonLabel(key: string): string {
  return tg(`${COMMON_BELIEFS_BASE}.${key}`)
}

function isCommonSelected(key: string): boolean {
  return draft.beliefs.some((b) => b.commonKey === key)
}

function toggleCommonBelief(key: string) {
  const index = draft.beliefs.findIndex((b) => b.commonKey === key)
  if (index === -1) {
    draft.beliefs.push({ commonKey: key, belief: '', evidenceFor: '', evidenceAgainst: '', reframe: '' })
  } else {
    draft.beliefs.splice(index, 1)
  }
}

function addCustomBelief() {
  draft.beliefs.push({ belief: '', evidenceFor: '', evidenceAgainst: '', reframe: '' })
}

function removeBelief(index: number) {
  draft.beliefs.splice(index, 1)
}

function addAdvice() {
  draft.advice.push({ advice: '', followsSelf: '', blocker: '' })
}

// Common beliefs display via i18n (so the gendered label stays consistent);
// custom beliefs use the typed text.
function beliefText(entry: DraftBelief): string {
  return entry.commonKey ? commonLabel(entry.commonKey) : entry.belief.trim()
}

const canSave = computed(() => draft.beliefs.some((b) => beliefText(b).length > 0))

async function handleSave() {
  const beliefs = draft.beliefs
    .map((b) => ({
      belief: beliefText(b),
      evidenceFor: b.evidenceFor.trim() || undefined,
      evidenceAgainst: b.evidenceAgainst.trim() || undefined,
      reframe: b.reframe.trim() || undefined,
    }))
    .filter((b) => b.belief.length > 0)

  const adviceToOthers = draft.advice
    .map((a) => {
      const notFollowed = a.followsSelf === 'sometimes' || a.followsSelf === 'no'
      return {
        advice: a.advice.trim(),
        followsSelf: a.followsSelf || undefined,
        blocker: notFollowed && a.blocker.trim() ? a.blocker.trim() : undefined,
      }
    })
    .filter((a) => a.advice.length > 0)

  const saved = await shadowBeliefsStore.createBeliefs({
    beliefs,
    adviceToOthers,
    notes: draft.notes.trim() || undefined,
  })
  emit('saved', saved.id)
}
</script>
