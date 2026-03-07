<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <div class="flex items-center justify-center gap-2">
      <template v-for="(_, i) in totalSteps" :key="i">
        <div
          class="w-2.5 h-2.5 rounded-full transition-colors"
          :class="
            i === currentStep
              ? 'bg-primary/70 scale-110'
              : i < currentStep
                ? 'bg-primary/35'
                : 'bg-outline/20'
          "
        />
        <div
          v-if="i < totalSteps - 1"
          class="w-6 h-0.5 rounded-full"
          :class="i < currentStep ? 'bg-primary/30' : 'bg-outline/10'"
        />
      </template>
    </div>

    <!-- Step header -->
    <div class="text-center">
      <h2 class="text-lg font-semibold text-on-surface">
        {{ stepTitle }}
      </h2>
      <p v-if="stepSubtitle" class="text-sm text-on-surface-variant mt-1">
        {{ stepSubtitle }}
      </p>
    </div>

    <!-- Step 0: Introduction -->
    <AppCard v-if="currentStep === 0" padding="lg" class="space-y-4">
      <p class="text-sm text-on-surface-variant leading-relaxed" v-html="t('planning.components.dreamingExercise.intro.paragraph1')" />
      <p class="text-sm text-on-surface-variant leading-relaxed">
        {{ t('planning.components.dreamingExercise.intro.paragraph2') }}
      </p>
      <div class="p-3 rounded-lg bg-section">
        <p class="text-xs text-on-surface-variant italic leading-relaxed">
          "{{ t('planning.components.dreamingExercise.intro.quote') }}"
        </p>
        <p class="text-xs text-on-surface-variant mt-2">
          — {{ t('planning.components.dreamingExercise.intro.quoteAttribution') }}
        </p>
      </div>
      <p class="text-sm text-on-surface-variant leading-relaxed">
        {{ t('planning.components.dreamingExercise.intro.paragraph3') }}
      </p>
    </AppCard>

    <!-- Steps 1-10: Questions -->
    <template v-for="(q, i) in questions" :key="q.key">
      <AppCard v-if="currentStep === i + 1" padding="lg" class="space-y-4">
        <p class="text-sm text-on-surface leading-relaxed font-medium">
          {{ q.question }}
        </p>

        <!-- Example callout -->
        <div class="p-3 rounded-lg bg-section/80 border border-neu-border/10">
          <p class="text-xs text-on-surface-variant">
            <span class="font-medium">{{ t('planning.components.dreamingExercise.exampleLabel') }}</span> {{ q.example }}
          </p>
        </div>

        <!-- List builder for outcomes (Q1) and progressClues (Q10) -->
        <template v-if="q.type === 'list'">
          <div class="space-y-2">
            <div
              v-for="(item, idx) in (dreaming[q.key as 'outcomes' | 'progressClues'] as string[])"
              :key="idx"
              class="flex items-center gap-2 group"
            >
              <span class="text-xs text-on-surface-variant w-6 text-right flex-shrink-0">{{ idx + 1 }}.</span>
              <input
                :value="item"
                type="text"
                :placeholder="q.placeholder"
                class="neo-input flex-1 p-2 text-on-surface text-sm placeholder:text-on-surface-variant/60"
                @input="updateListItem(q.key as 'outcomes' | 'progressClues', idx, ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="removeListItem(q.key as 'outcomes' | 'progressClues', idx)"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <button
              type="button"
              class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
              @click="addListItem(q.key as 'outcomes' | 'progressClues')"
            >
              <PlusIcon class="w-4 h-4" />
              {{ t('planning.components.dreamingExercise.addAnother') }}
            </button>
            <span v-if="q.target" class="text-xs text-on-surface-variant">
              {{ (dreaming[q.key as 'outcomes' | 'progressClues'] as string[]).length }}/{{ q.target }}
            </span>
          </div>
        </template>

        <!-- Textarea for text questions -->
        <template v-else>
          <textarea
            :value="dreaming[q.key as keyof typeof dreaming] as string"
            rows="4"
            :placeholder="q.placeholder"
            class="neo-input w-full p-3 text-on-surface placeholder:text-on-surface-variant text-sm resize-none"
            @input="updateTextField(q.key, ($event.target as HTMLTextAreaElement).value)"
          />
        </template>
      </AppCard>
    </template>

    <!-- Navigation -->
    <div class="flex items-center justify-between">
      <div>
        <AppButton
          v-if="currentStep > 0"
          variant="text"
          @click="currentStep--"
        >
          Back
        </AppButton>
        <AppButton v-else variant="text" @click="$emit('cancel')">
          Cancel
        </AppButton>
      </div>

      <div class="flex gap-2">
        <AppButton
          v-if="currentStep === totalSteps - 1"
          variant="filled"
          @click="handleComplete"
        >
          {{ t('planning.components.dreamingExercise.continue') }}
        </AppButton>
        <AppButton
          v-else
          variant="filled"
          @click="currentStep++"
        >
          {{ t('planning.components.dreamingExercise.continue') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import { type DraftDreaming, createDefaultDreaming } from '@/composables/useYearlyPlanningDraft'

const { t } = useT()

const props = defineProps<{
  initialData?: DraftDreaming
}>()

const emit = defineEmits<{
  completed: [data: DraftDreaming]
  cancel: []
}>()

const currentStep = ref(0)
const dreaming = reactive<DraftDreaming>(
  props.initialData
    ? { ...props.initialData, outcomes: [...props.initialData.outcomes], progressClues: [...props.initialData.progressClues] }
    : createDefaultDreaming()
)

interface QuestionDef {
  key: string
  question: string
  example: string
  placeholder: string
  type: 'text' | 'list'
  target?: number
}

const questions = computed<QuestionDef[]>(() => [
  {
    key: 'outcomes',
    question: t('planning.components.dreamingExercise.questions.outcomes.question'),
    example: t('planning.components.dreamingExercise.questions.outcomes.example'),
    placeholder: t('planning.components.dreamingExercise.questions.outcomes.placeholder'),
    type: 'list',
    target: 25,
  },
  {
    key: 'difference',
    question: t('planning.components.dreamingExercise.questions.difference.question'),
    example: t('planning.components.dreamingExercise.questions.difference.example'),
    placeholder: t('planning.components.dreamingExercise.questions.difference.placeholder'),
    type: 'text',
  },
  {
    key: 'worthDoing',
    question: t('planning.components.dreamingExercise.questions.worthDoing.question'),
    example: t('planning.components.dreamingExercise.questions.worthDoing.example'),
    placeholder: t('planning.components.dreamingExercise.questions.worthDoing.placeholder'),
    type: 'text',
  },
  {
    key: 'vipsNotice',
    question: t('planning.components.dreamingExercise.questions.vipsNotice.question'),
    example: t('planning.components.dreamingExercise.questions.vipsNotice.example'),
    placeholder: t('planning.components.dreamingExercise.questions.vipsNotice.placeholder'),
    type: 'text',
  },
  {
    key: 'vipAfterYear',
    question: t('planning.components.dreamingExercise.questions.vipAfterYear.question'),
    example: t('planning.components.dreamingExercise.questions.vipAfterYear.example'),
    placeholder: t('planning.components.dreamingExercise.questions.vipAfterYear.placeholder'),
    type: 'text',
  },
  {
    key: 'vipsSeeInYou',
    question: t('planning.components.dreamingExercise.questions.vipsSeeInYou.question'),
    example: t('planning.components.dreamingExercise.questions.vipsSeeInYou.example'),
    placeholder: t('planning.components.dreamingExercise.questions.vipsSeeInYou.placeholder'),
    type: 'text',
  },
  {
    key: 'vipsNoticeProgress',
    question: t('planning.components.dreamingExercise.questions.vipsNoticeProgress.question'),
    example: t('planning.components.dreamingExercise.questions.vipsNoticeProgress.example'),
    placeholder: t('planning.components.dreamingExercise.questions.vipsNoticeProgress.placeholder'),
    type: 'text',
  },
  {
    key: 'knowAboutYourself',
    question: t('planning.components.dreamingExercise.questions.knowAboutYourself.question'),
    example: t('planning.components.dreamingExercise.questions.knowAboutYourself.example'),
    placeholder: t('planning.components.dreamingExercise.questions.knowAboutYourself.placeholder'),
    type: 'text',
  },
  {
    key: 'oneClue',
    question: t('planning.components.dreamingExercise.questions.oneClue.question'),
    example: t('planning.components.dreamingExercise.questions.oneClue.example'),
    placeholder: t('planning.components.dreamingExercise.questions.oneClue.placeholder'),
    type: 'text',
  },
  {
    key: 'progressClues',
    question: t('planning.components.dreamingExercise.questions.progressClues.question'),
    example: t('planning.components.dreamingExercise.questions.progressClues.example'),
    placeholder: t('planning.components.dreamingExercise.questions.progressClues.placeholder'),
    type: 'list',
  },
])

const totalSteps = computed(() => questions.value.length + 1) // intro + 10 questions

const stepTitle = ref('')
const stepSubtitle = ref('')

// Computed step title/subtitle — using watchEffect-like pattern
import { watchEffect } from 'vue'
watchEffect(() => {
  if (currentStep.value === 0) {
    stepTitle.value = t('planning.components.dreamingExercise.title')
    stepSubtitle.value = t('planning.components.dreamingExercise.subtitle')
  } else {
    const q = questions.value[currentStep.value - 1]
    stepTitle.value = t('planning.components.dreamingExercise.questionOf', { current: currentStep.value, total: questions.value.length })
    stepSubtitle.value = q.type === 'list' ? t('planning.components.dreamingExercise.listSubtitle') : t('planning.components.dreamingExercise.textSubtitle')
  }
})

function updateTextField(key: string, value: string) {
  ;(dreaming as Record<string, unknown>)[key] = value
}

function updateListItem(key: 'outcomes' | 'progressClues', index: number, value: string) {
  dreaming[key][index] = value
}

function addListItem(key: 'outcomes' | 'progressClues') {
  dreaming[key].push('')
}

function removeListItem(key: 'outcomes' | 'progressClues', index: number) {
  dreaming[key].splice(index, 1)
}

function handleComplete() {
  // Clean up empty items from lists
  const result: DraftDreaming = {
    ...dreaming,
    outcomes: dreaming.outcomes.filter((s) => s.trim()),
    progressClues: dreaming.progressClues.filter((s) => s.trim()),
  }
  emit('completed', result)
}
</script>
