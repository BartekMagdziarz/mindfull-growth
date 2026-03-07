<template>
  <div class="space-y-6">
    <AppCard padding="lg" class="space-y-4">
      <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.title') }}</h2>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.description') }}
      </p>
    </AppCard>

    <!-- Self-sabotaging beliefs -->
    <AppCard padding="lg" class="space-y-4">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.beliefs.title') }}</h3>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.beliefs.description') }}
      </p>

      <!-- Common shadow beliefs as chips -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="belief in commonBeliefs"
          :key="belief"
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
          :class="draft.selfSabotagingBeliefs.includes(belief)
            ? 'bg-primary/20 text-primary border-primary/40'
            : 'bg-chip text-on-surface border-chip-border hover:bg-section'"
          @click="toggleBelief(belief)"
        >
          {{ belief }}
        </button>
      </div>

      <!-- Custom beliefs -->
      <div class="space-y-2">
        <div
          v-for="(belief, index) in customBeliefsList"
          :key="index"
          class="flex items-center gap-2 group"
        >
          <span class="text-primary">&#8226;</span>
          <input
            :value="belief"
            type="text"
            :placeholder="t('exerciseWizards.shadowBeliefs.beliefs.customPlaceholder')"
            class="neo-input flex-1 p-2 text-sm"
            @input="updateCustomBelief(index, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
            @click="removeCustomBelief(index)"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
          @click="addCustomBelief"
        >
          <PlusIcon class="w-4 h-4" />
          {{ t('exerciseWizards.shadowBeliefs.beliefs.addCustom') }}
        </button>
      </div>
    </AppCard>

    <!-- Advice to others -->
    <AppCard padding="lg" class="space-y-4">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.advice.title') }}</h3>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.advice.description') }}
      </p>
      <div class="space-y-2">
        <div v-for="(advice, index) in draft.adviceToOthers" :key="index" class="flex items-center gap-2 group">
          <span class="text-primary">&#8226;</span>
          <input
            :value="advice"
            type="text"
            :placeholder="t('exerciseWizards.shadowBeliefs.advice.placeholder')"
            class="neo-input flex-1 p-2 text-sm"
            @input="draft.adviceToOthers[index] = ($event.target as HTMLInputElement).value"
          />
          <button
            type="button"
            class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
            @click="draft.adviceToOthers.splice(index, 1)"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
          @click="draft.adviceToOthers.push('')"
        >
          <PlusIcon class="w-4 h-4" />
          {{ t('exerciseWizards.shadowBeliefs.advice.addAdvice') }}
        </button>
      </div>
    </AppCard>

    <!-- Reframed beliefs -->
    <AppCard padding="lg" class="space-y-4">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.reframe.title') }}</h3>
      <p class="text-sm text-on-surface-variant">
        {{ t('exerciseWizards.shadowBeliefs.reframe.description') }}
      </p>
      <div class="space-y-2">
        <div v-for="(reframe, index) in draft.reframedBeliefs" :key="index" class="flex items-center gap-2 group">
          <span class="text-primary">&#8226;</span>
          <input
            :value="reframe"
            type="text"
            :placeholder="t('exerciseWizards.shadowBeliefs.reframe.placeholder')"
            class="neo-input flex-1 p-2 text-sm"
            @input="draft.reframedBeliefs[index] = ($event.target as HTMLInputElement).value"
          />
          <button
            type="button"
            class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
            @click="draft.reframedBeliefs.splice(index, 1)"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
          @click="draft.reframedBeliefs.push('')"
        >
          <PlusIcon class="w-4 h-4" />
          {{ t('exerciseWizards.shadowBeliefs.reframe.addReframe') }}
        </button>
      </div>
    </AppCard>

    <!-- Notes -->
    <AppCard padding="lg" class="space-y-3">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.shadowBeliefs.reflectionTitle') }}</h3>
      <textarea
        v-model="draft.notes"
        rows="3"
        :placeholder="t('exerciseWizards.shadowBeliefs.reflectionPlaceholder')"
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
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useT } from '@/composables/useT'

const { t } = useT()

const emit = defineEmits<{
  saved: [id: string]
}>()

const shadowBeliefsStore = useShadowBeliefsStore()

const commonBeliefs = computed(() => [
  t('exerciseWizards.shadowBeliefs.commonBeliefs.somethingWrong'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.dontDeserve'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.cantTrust'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.neverSuccessful'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.notGoodEnough'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.dontBelong'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.doEverythingMyself'),
  t('exerciseWizards.shadowBeliefs.commonBeliefs.tooLate'),
])

const draft = reactive({
  selfSabotagingBeliefs: [] as string[],
  customBeliefs: [] as string[],
  adviceToOthers: [''] as string[],
  reframedBeliefs: [''] as string[],
  notes: '',
})

const customBeliefsList = computed(() => draft.customBeliefs)

const canSave = computed(() => {
  return draft.selfSabotagingBeliefs.length > 0 || draft.customBeliefs.some((b) => b.trim().length > 0)
})

function toggleBelief(belief: string) {
  const index = draft.selfSabotagingBeliefs.indexOf(belief)
  if (index === -1) {
    draft.selfSabotagingBeliefs.push(belief)
  } else {
    draft.selfSabotagingBeliefs.splice(index, 1)
  }
}

function addCustomBelief() {
  draft.customBeliefs.push('')
}

function updateCustomBelief(index: number, value: string) {
  draft.customBeliefs[index] = value
}

function removeCustomBelief(index: number) {
  draft.customBeliefs.splice(index, 1)
}

async function handleSave() {
  const allBeliefs = [
    ...draft.selfSabotagingBeliefs,
    ...draft.customBeliefs.filter((b) => b.trim().length > 0),
  ]
  const beliefs = await shadowBeliefsStore.createBeliefs({
    selfSabotagingBeliefs: allBeliefs,
    adviceToOthers: draft.adviceToOthers.filter((a) => a.trim().length > 0),
    reframedBeliefs: draft.reframedBeliefs.filter((r) => r.trim().length > 0),
    notes: draft.notes || undefined,
  })
  emit('saved', beliefs.id)
}
</script>
