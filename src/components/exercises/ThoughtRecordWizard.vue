<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < step ? ' (completed)' : idx === step ? ' (current)' : ''}`"
          class="w-2.5 h-2.5 rounded-full transition-all duration-200"
          :class="idx < step
            ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
            : idx === step
              ? 'neo-step-active w-3.5 h-3.5'
              : 'neo-step-future w-2.5 h-2.5'"
          @click="idx < step && goToStep(idx)"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[step] }}
      </span>
    </div>

    <!-- Step 1: Intro -->
    <template v-if="step === 0">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.intro.title') }}</h2>
        <p class="text-sm text-on-surface-variant leading-relaxed">
          {{ t('exerciseWizards.thoughtRecord.intro.description') }}
        </p>
        <div class="neo-surface p-4 space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.thoughtRecord.intro.howItWorks') }}</p>
          <div class="flex items-center gap-3 text-sm text-on-surface">
            <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.thoughtRecord.steps.situation') }}</span>
            <ArrowRightIcon class="w-4 h-4 text-on-surface-variant flex-shrink-0" />
            <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.thoughtRecord.steps.thoughts') }}</span>
            <ArrowRightIcon class="w-4 h-4 text-on-surface-variant flex-shrink-0" />
            <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.thoughtRecord.steps.emotions') }}</span>
          </div>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.thoughtRecord.intro.howItWorksDescription') }}
          </p>
        </div>
      </AppCard>
      <div class="flex justify-end">
        <AppButton variant="filled" @click="step = 1">
          {{ t('common.buttons.start') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 2: Situation -->
    <template v-if="step === 1">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.situation.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.situation.description') }}
        </p>
        <textarea
          v-model="situation"
          rows="4"
          :placeholder="t('exerciseWizards.thoughtRecord.situation.placeholder')"
          class="neo-input w-full p-3 text-sm resize-none"
        />
        <div class="space-y-1">
          <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.thoughtRecord.situation.dateLabel') }}</label>
          <input
            v-model="situationDate"
            type="date"
            class="neo-input p-2 text-sm w-full"
          />
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 0">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" :disabled="!situation.trim()" @click="step = 2">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 3: Emotions Before -->
    <template v-if="step === 2">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.emotions.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.emotions.description') }}
        </p>
        <EmotionSelector
          :model-value="selectedEmotionIds"
          @update:model-value="handleEmotionSelectionChange"
        />
        <!-- Intensity sliders for selected emotions -->
        <div v-if="emotionsBefore.length > 0" class="space-y-3 mt-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('exerciseWizards.thoughtRecord.emotions.intensityRatings') }}
          </p>
          <div
            v-for="er in emotionsBefore"
            :key="er.emotionId"
            class="neo-surface p-3 space-y-2"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-on-surface">
                {{ getEmotionName(er.emotionId) }}
              </span>
              <span class="text-xs font-semibold text-primary">{{ er.intensity }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              :value="er.intensity"
              class="w-full accent-primary"
              @input="updateEmotionIntensity(er.emotionId, Number(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 1">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" :disabled="emotionsBefore.length === 0" @click="step = 3">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 4: Automatic Thoughts -->
    <template v-if="step === 3">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.thoughts.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.thoughts.description') }}
        </p>
        <div class="space-y-2">
          <div
            v-for="(thought, index) in automaticThoughts"
            :key="index"
            class="flex items-center gap-2 group"
          >
            <button
              type="button"
              class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 text-xs"
              :class="hotThoughtIndex === index
                ? 'neo-pill--primary text-primary font-bold'
                : 'neo-surface text-on-surface-variant hover:text-primary'"
              :aria-label="`Mark thought ${index + 1} as hot thought`"
              :aria-pressed="hotThoughtIndex === index"
              @click="hotThoughtIndex = index"
            >
              <FireIcon class="w-3.5 h-3.5" />
            </button>
            <input
              :value="thought"
              type="text"
              :placeholder="t('exerciseWizards.thoughtRecord.thoughts.placeholder')"
              class="neo-input flex-1 p-2 text-sm"
              @input="automaticThoughts[index] = ($event.target as HTMLInputElement).value"
            />
            <button
              v-if="automaticThoughts.length > 1"
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              @click="removeThought(index)"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <AppButton variant="text" @click="automaticThoughts.push('')">
            <PlusIcon class="w-4 h-4" />
            {{ t('exerciseWizards.thoughtRecord.thoughts.addThought') }}
          </AppButton>
        </div>

        <!-- LLM Assist: Identify thoughts -->
        <div class="border-t border-neu-border/20 pt-4 space-y-3">
          <AppButton
            variant="tonal"
            :disabled="!situation.trim() || isIdentifyLoading"
            @click="handleIdentifyThoughts"
          >
            <SparklesIcon class="w-4 h-4" />
            {{ isIdentifyLoading ? t('exerciseWizards.thoughtRecord.thoughts.identifyLoading') : t('exerciseWizards.thoughtRecord.thoughts.identifyLabel') }}
          </AppButton>
          <div v-if="identifySuggestions" class="neo-panel p-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.thoughtRecord.thoughts.suggestedThoughts') }}
            </p>
            <p class="text-sm text-on-surface whitespace-pre-line">{{ identifySuggestions }}</p>
          </div>
          <p v-if="identifyError" class="text-xs text-error">{{ identifyError }}</p>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 2">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" :disabled="!hasValidThoughts" @click="step = 4">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 5: Evidence For -->
    <template v-if="step === 4">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.evidenceFor.title') }}</h2>
        <div class="neo-panel p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.thoughtRecord.evidenceFor.hotThoughtLabel') }}</p>
          <p class="text-sm text-on-surface italic">"{{ hotThought }}"</p>
        </div>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.evidenceFor.description') }}
        </p>
        <div class="space-y-2">
          <div
            v-for="(item, index) in evidenceFor"
            :key="index"
            class="flex items-center gap-2 group"
          >
            <span class="text-primary text-sm flex-shrink-0">&#8226;</span>
            <input
              :value="item"
              type="text"
              :placeholder="t('exerciseWizards.thoughtRecord.evidenceFor.placeholder')"
              class="neo-input flex-1 p-2 text-sm"
              @input="evidenceFor[index] = ($event.target as HTMLInputElement).value"
            />
            <button
              v-if="evidenceFor.length > 1"
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              @click="evidenceFor.splice(index, 1)"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <AppButton variant="text" @click="evidenceFor.push('')">
            <PlusIcon class="w-4 h-4" />
            {{ t('exerciseWizards.thoughtRecord.evidenceFor.addEvidence') }}
          </AppButton>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 3">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" @click="step = 5">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 6: Evidence Against -->
    <template v-if="step === 5">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.evidenceAgainst.title') }}</h2>
        <div class="neo-panel p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.thoughtRecord.evidenceAgainst.hotThoughtLabel') }}</p>
          <p class="text-sm text-on-surface italic">"{{ hotThought }}"</p>
        </div>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.evidenceAgainst.description') }}
        </p>
        <div class="space-y-2">
          <div
            v-for="(item, index) in evidenceAgainst"
            :key="index"
            class="flex items-center gap-2 group"
          >
            <span class="text-primary text-sm flex-shrink-0">&#8226;</span>
            <input
              :value="item"
              type="text"
              :placeholder="t('exerciseWizards.thoughtRecord.evidenceAgainst.placeholder')"
              class="neo-input flex-1 p-2 text-sm"
              @input="evidenceAgainst[index] = ($event.target as HTMLInputElement).value"
            />
            <button
              v-if="evidenceAgainst.length > 1"
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              @click="evidenceAgainst.splice(index, 1)"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <AppButton variant="text" @click="evidenceAgainst.push('')">
            <PlusIcon class="w-4 h-4" />
            {{ t('exerciseWizards.thoughtRecord.evidenceAgainst.addEvidence') }}
          </AppButton>
        </div>

        <!-- LLM Assist: Find evidence -->
        <div class="border-t border-neu-border/20 pt-4 space-y-3">
          <AppButton
            variant="tonal"
            :disabled="isFindEvidenceLoading"
            @click="handleFindEvidence"
          >
            <SparklesIcon class="w-4 h-4" />
            {{ isFindEvidenceLoading ? t('exerciseWizards.thoughtRecord.evidenceAgainst.findEvidenceLoading') : t('exerciseWizards.thoughtRecord.evidenceAgainst.findEvidenceLabel') }}
          </AppButton>
          <div v-if="findEvidenceMessages.length > 0" class="space-y-2">
            <div
              v-for="(msg, idx) in findEvidenceMessages"
              :key="idx"
              class="neo-panel p-3"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
                {{ msg.role === 'assistant' ? t('exerciseWizards.thoughtRecord.evidenceAgainst.suggestion') : t('exerciseWizards.thoughtRecord.evidenceAgainst.you') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ msg.content }}</p>
            </div>
          </div>
          <div v-if="findEvidenceMessages.length > 0" class="flex gap-2">
            <input
              v-model="findEvidenceFollowUp"
              type="text"
              :placeholder="t('exerciseWizards.thoughtRecord.evidenceAgainst.followUpPlaceholder')"
              class="neo-input flex-1 p-2 text-sm"
              @keyup.enter="handleFindEvidenceFollowUp"
            />
            <AppButton
              variant="tonal"
              :disabled="!findEvidenceFollowUp.trim() || isFindEvidenceLoading"
              @click="handleFindEvidenceFollowUp"
            >
              {{ t('exerciseWizards.thoughtRecord.evidenceAgainst.send') }}
            </AppButton>
          </div>
          <p v-if="findEvidenceError" class="text-xs text-error">{{ findEvidenceError }}</p>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 4">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" @click="step = 6">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 7: Balanced Thought -->
    <template v-if="step === 6">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.balancedThought.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.balancedThought.description') }}
        </p>

        <!-- Evidence summary -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="neo-surface p-3 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.thoughtRecord.balancedThought.evidenceForLabel') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="item in filledEvidenceFor"
                :key="item"
                class="text-xs text-on-surface"
              >
                &#8226; {{ item }}
              </li>
            </ul>
            <p v-if="filledEvidenceFor.length === 0" class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.thoughtRecord.balancedThought.noEvidenceListed') }}
            </p>
          </div>
          <div class="neo-surface p-3 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.thoughtRecord.balancedThought.evidenceAgainstLabel') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="item in filledEvidenceAgainst"
                :key="item"
                class="text-xs text-on-surface"
              >
                &#8226; {{ item }}
              </li>
            </ul>
            <p v-if="filledEvidenceAgainst.length === 0" class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.thoughtRecord.balancedThought.noEvidenceListed') }}
            </p>
          </div>
        </div>

        <textarea
          v-model="balancedThought"
          rows="4"
          :placeholder="t('exerciseWizards.thoughtRecord.balancedThought.placeholder')"
          class="neo-input w-full p-3 text-sm resize-none"
        />

        <!-- LLM Assist: Reframe -->
        <div class="border-t border-neu-border/20 pt-4 space-y-3">
          <AppButton
            variant="tonal"
            :disabled="isReframeLoading"
            @click="handleReframeThought"
          >
            <SparklesIcon class="w-4 h-4" />
            {{ isReframeLoading ? t('exerciseWizards.thoughtRecord.balancedThought.reframeLoading') : t('exerciseWizards.thoughtRecord.balancedThought.reframeLabel') }}
          </AppButton>
          <div v-if="reframeSuggestions.length > 0" class="space-y-2">
            <div
              v-for="(msg, idx) in reframeSuggestions"
              :key="idx"
              class="neo-panel p-3"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
                {{ msg.role === 'assistant' ? t('exerciseWizards.thoughtRecord.balancedThought.suggestion') : t('exerciseWizards.thoughtRecord.balancedThought.you') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ msg.content }}</p>
              <button
                v-if="msg.role === 'assistant'"
                type="button"
                class="mt-2 text-xs text-primary font-medium hover:underline"
                @click="balancedThought = msg.content"
              >
                {{ t('exerciseWizards.thoughtRecord.balancedThought.useAsStartingPoint') }}
              </button>
            </div>
          </div>
          <div v-if="reframeSuggestions.length > 0" class="flex gap-2">
            <input
              v-model="reframeFollowUp"
              type="text"
              :placeholder="t('exerciseWizards.thoughtRecord.balancedThought.followUpPlaceholder')"
              class="neo-input flex-1 p-2 text-sm"
              @keyup.enter="handleReframeFollowUp"
            />
            <AppButton
              variant="tonal"
              :disabled="!reframeFollowUp.trim() || isReframeLoading"
              @click="handleReframeFollowUp"
            >
              {{ t('exerciseWizards.thoughtRecord.balancedThought.send') }}
            </AppButton>
          </div>
          <p v-if="reframeError" class="text-xs text-error">{{ reframeError }}</p>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 5">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" :disabled="!balancedThought.trim()" @click="step = 7">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 8: Emotions After -->
    <template v-if="step === 7">
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.rerate.title') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.thoughtRecord.rerate.description') }}
        </p>
        <div class="space-y-3">
          <div
            v-for="er in emotionsAfter"
            :key="er.emotionId"
            class="neo-surface p-3 space-y-2"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-on-surface">
                {{ getEmotionName(er.emotionId) }}
              </span>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-on-surface-variant">
                  {{ getBeforeIntensity(er.emotionId) }}%
                </span>
                <ArrowRightIcon class="w-3 h-3 text-on-surface-variant" />
                <span class="font-semibold" :class="getIntensityChangeClass(er.emotionId)">
                  {{ er.intensity }}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              :value="er.intensity"
              class="w-full accent-primary"
              @input="updateAfterIntensity(er.emotionId, Number(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 6">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" @click="step = 8">
          {{ t('common.buttons.next') }}
        </AppButton>
      </div>
    </template>

    <!-- Step 9: Summary -->
    <template v-if="step === 8">
      <AppCard variant="raised" padding="lg" class="space-y-5">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.thoughtRecord.summary.title') }}</h2>

        <!-- Situation -->
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.thoughtRecord.summary.situation') }}</p>
          <p class="text-sm text-on-surface">{{ situation }}</p>
          <p v-if="situationDate" class="text-xs text-on-surface-variant">{{ situationDate }}</p>
        </div>

        <!-- Emotions Before / After -->
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.thoughtRecord.summary.emotions') }}</p>
          <div class="space-y-1.5">
            <div
              v-for="er in emotionsAfter"
              :key="er.emotionId"
              class="flex items-center gap-2 text-sm"
            >
              <span class="font-medium text-on-surface min-w-[6rem]">
                {{ getEmotionName(er.emotionId) }}
              </span>
              <span class="text-on-surface-variant">{{ getBeforeIntensity(er.emotionId) }}%</span>
              <span class="flex items-center gap-1" :class="getIntensityChangeClass(er.emotionId)">
                <ArrowDownIcon v-if="er.intensity < getBeforeIntensity(er.emotionId)" class="w-3 h-3" />
                <ArrowUpIcon v-else-if="er.intensity > getBeforeIntensity(er.emotionId)" class="w-3 h-3" />
                <MinusIcon v-else class="w-3 h-3" />
                {{ er.intensity }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Hot Thought -->
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.thoughtRecord.summary.hotThought') }}</p>
          <p class="text-sm text-on-surface italic">"{{ hotThought }}"</p>
        </div>

        <!-- Evidence -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="neo-surface p-3 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.thoughtRecord.summary.evidenceFor') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="item in filledEvidenceFor"
                :key="item"
                class="text-xs text-on-surface"
              >
                &#8226; {{ item }}
              </li>
            </ul>
            <p v-if="filledEvidenceFor.length === 0" class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.thoughtRecord.summary.noneListed') }}
            </p>
          </div>
          <div class="neo-surface p-3 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.thoughtRecord.summary.evidenceAgainst') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="item in filledEvidenceAgainst"
                :key="item"
                class="text-xs text-on-surface"
              >
                &#8226; {{ item }}
              </li>
            </ul>
            <p v-if="filledEvidenceAgainst.length === 0" class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.thoughtRecord.summary.noneListed') }}
            </p>
          </div>
        </div>

        <!-- Balanced Thought -->
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.thoughtRecord.summary.balancedThought') }}</p>
          <p class="text-sm text-on-surface">"{{ balancedThought }}"</p>
        </div>
      </AppCard>
      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 7">{{ t('common.buttons.back') }}</AppButton>
        <AppButton variant="filled" @click="handleSave">
          {{ t('common.buttons.save') }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { EmotionRating, CreateThoughtRecordPayload } from '@/domain/exercises'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'
import {
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  FireIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'

const emit = defineEmits<{
  saved: [data: CreateThoughtRecordPayload]
}>()

const emotionStore = useEmotionStore()
const { t, locale } = useT()

// Step state
const step = ref(0)
const stepLabels = computed(() => [
  t('exerciseWizards.thoughtRecord.steps.intro'),
  t('exerciseWizards.thoughtRecord.steps.situation'),
  t('exerciseWizards.thoughtRecord.steps.emotions'),
  t('exerciseWizards.thoughtRecord.steps.thoughts'),
  t('exerciseWizards.thoughtRecord.steps.evidenceFor'),
  t('exerciseWizards.thoughtRecord.steps.evidenceAgainst'),
  t('exerciseWizards.thoughtRecord.steps.balancedThought'),
  t('exerciseWizards.thoughtRecord.steps.rerate'),
  t('exerciseWizards.thoughtRecord.steps.summary'),
])

function goToStep(target: number) {
  step.value = target
}

// --- Step 2: Situation ---
const situation = ref('')
const situationDate = ref('')

// --- Step 3: Emotions Before ---
const emotionsBefore = reactive<EmotionRating[]>([])

const selectedEmotionIds = computed(() => emotionsBefore.map((er) => er.emotionId))

function handleEmotionSelectionChange(ids: string[]) {
  // Add new emotions
  for (const id of ids) {
    if (!emotionsBefore.find((er) => er.emotionId === id)) {
      emotionsBefore.push({ emotionId: id, intensity: 50 })
    }
  }
  // Remove deselected emotions
  for (let i = emotionsBefore.length - 1; i >= 0; i--) {
    if (!ids.includes(emotionsBefore[i].emotionId)) {
      emotionsBefore.splice(i, 1)
    }
  }
}

function updateEmotionIntensity(emotionId: string, intensity: number) {
  const er = emotionsBefore.find((e) => e.emotionId === emotionId)
  if (er) er.intensity = intensity
}

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

// --- Step 4: Automatic Thoughts ---
const automaticThoughts = reactive<string[]>([''])
const hotThoughtIndex = ref(0)

const hasValidThoughts = computed(() => {
  return automaticThoughts.some((t) => t.trim().length > 0)
})

const hotThought = computed(() => {
  const idx = hotThoughtIndex.value
  if (idx >= 0 && idx < automaticThoughts.length && automaticThoughts[idx].trim()) {
    return automaticThoughts[idx]
  }
  // Fallback to first non-empty thought
  return automaticThoughts.find((t) => t.trim()) ?? ''
})

function removeThought(index: number) {
  automaticThoughts.splice(index, 1)
  // Adjust hot thought index
  if (hotThoughtIndex.value >= automaticThoughts.length) {
    hotThoughtIndex.value = Math.max(0, automaticThoughts.length - 1)
  } else if (hotThoughtIndex.value > index) {
    hotThoughtIndex.value--
  }
}

// LLM Assist: Identify Thoughts
const isIdentifyLoading = ref(false)
const identifySuggestions = ref('')
const identifyError = ref('')

const emotionNamesWithIntensity = computed(() =>
  emotionsBefore.map((er) => ({
    name: emotionStore.getEmotionById(er.emotionId)?.name ?? 'Unknown',
    intensity: er.intensity,
  })),
)

async function handleIdentifyThoughts() {
  isIdentifyLoading.value = true
  identifyError.value = ''
  try {
    const { identifyThoughts } = await import('@/services/cbtLLMAssists')
    identifySuggestions.value = await identifyThoughts({
      situation: situation.value,
      emotions: emotionNamesWithIntensity.value,
      locale: locale.value,
    })
    llmAssistsUsed.add('identify-thoughts')
  } catch (err) {
    identifyError.value = err instanceof Error ? err.message : 'Failed to get suggestions'
  } finally {
    isIdentifyLoading.value = false
  }
}

// --- Step 5: Evidence For ---
const evidenceFor = reactive<string[]>([''])

const filledEvidenceFor = computed(() => evidenceFor.filter((e) => e.trim().length > 0))

// --- Step 6: Evidence Against ---
const evidenceAgainst = reactive<string[]>([''])

const filledEvidenceAgainst = computed(() => evidenceAgainst.filter((e) => e.trim().length > 0))

// LLM Assist: Find Evidence
const isFindEvidenceLoading = ref(false)
const findEvidenceMessages = reactive<{ role: 'assistant' | 'user'; content: string }[]>([])
const findEvidenceFollowUp = ref('')
const findEvidenceError = ref('')

async function handleFindEvidence() {
  isFindEvidenceLoading.value = true
  findEvidenceError.value = ''
  try {
    const { findEvidence } = await import('@/services/cbtLLMAssists')
    const result = await findEvidence({
      situation: situation.value,
      hotThought: hotThought.value,
      emotions: emotionNamesWithIntensity.value,
      evidenceFor: filledEvidenceFor.value,
      evidenceAgainst: filledEvidenceAgainst.value,
      previousMessages: [...findEvidenceMessages],
      locale: locale.value,
    })
    findEvidenceMessages.push({ role: 'assistant', content: result })
    llmAssistsUsed.add('find-evidence')
  } catch (err) {
    findEvidenceError.value = err instanceof Error ? err.message : 'Failed to get suggestions'
  } finally {
    isFindEvidenceLoading.value = false
  }
}

async function handleFindEvidenceFollowUp() {
  if (!findEvidenceFollowUp.value.trim()) return
  findEvidenceMessages.push({ role: 'user', content: findEvidenceFollowUp.value })
  findEvidenceFollowUp.value = ''
  await handleFindEvidence()
}

// --- Step 7: Balanced Thought ---
const balancedThought = ref('')

// LLM Assist: Reframe
const isReframeLoading = ref(false)
const reframeSuggestions = reactive<{ role: 'assistant' | 'user'; content: string }[]>([])
const reframeFollowUp = ref('')
const reframeError = ref('')

async function handleReframeThought() {
  isReframeLoading.value = true
  reframeError.value = ''
  try {
    const { reframeThought } = await import('@/services/cbtLLMAssists')
    const result = await reframeThought({
      situation: situation.value,
      hotThought: hotThought.value,
      emotions: emotionNamesWithIntensity.value,
      evidenceFor: filledEvidenceFor.value,
      evidenceAgainst: filledEvidenceAgainst.value,
      previousMessages: [...reframeSuggestions],
      locale: locale.value,
    })
    reframeSuggestions.push({ role: 'assistant', content: result })
    llmAssistsUsed.add('reframe')
  } catch (err) {
    reframeError.value = err instanceof Error ? err.message : 'Failed to get suggestions'
  } finally {
    isReframeLoading.value = false
  }
}

async function handleReframeFollowUp() {
  if (!reframeFollowUp.value.trim()) return
  reframeSuggestions.push({ role: 'user', content: reframeFollowUp.value })
  reframeFollowUp.value = ''
  await handleReframeThought()
}

// --- Step 8: Emotions After ---
const emotionsAfter = reactive<EmotionRating[]>([])

// Initialize emotionsAfter when entering step 8
function initEmotionsAfter() {
  if (emotionsAfter.length === 0) {
    for (const er of emotionsBefore) {
      emotionsAfter.push({ emotionId: er.emotionId, intensity: er.intensity })
    }
  }
}

// Watch step to initialize emotionsAfter
import { watch } from 'vue'
watch(step, (newStep) => {
  if (newStep === 7) {
    initEmotionsAfter()
  }
})

function updateAfterIntensity(emotionId: string, intensity: number) {
  const er = emotionsAfter.find((e) => e.emotionId === emotionId)
  if (er) er.intensity = intensity
}

function getBeforeIntensity(emotionId: string): number {
  return emotionsBefore.find((e) => e.emotionId === emotionId)?.intensity ?? 0
}

function getIntensityChangeClass(emotionId: string): string {
  const before = getBeforeIntensity(emotionId)
  const after = emotionsAfter.find((e) => e.emotionId === emotionId)?.intensity ?? 0
  if (after < before) return 'text-green-600'
  if (after > before) return 'text-error'
  return 'text-on-surface-variant'
}

// --- Save ---
const llmAssistsUsed = reactive(new Set<'identify-thoughts' | 'find-evidence' | 'reframe'>())

function handleSave() {
  const filledThoughts = automaticThoughts.filter((t) => t.trim().length > 0)
  // Recompute hot thought index relative to filtered list
  const originalHotThought = hotThought.value
  const newHotIndex = filledThoughts.indexOf(originalHotThought)

  const payload: CreateThoughtRecordPayload = {
    situation: situation.value.trim(),
    situationDate: situationDate.value || undefined,
    emotionsBefore: emotionsBefore.map((er) => ({ ...er })),
    emotionsAfter: emotionsAfter.map((er) => ({ ...er })),
    automaticThoughts: filledThoughts,
    hotThoughtIndex: newHotIndex >= 0 ? newHotIndex : 0,
    evidenceFor: filledEvidenceFor.value,
    evidenceAgainst: filledEvidenceAgainst.value,
    balancedThought: balancedThought.value.trim(),
    llmAssistUsed: llmAssistsUsed.size > 0 ? [...llmAssistsUsed] : undefined,
  }
  emit('saved', payload)
}
</script>
