<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < currentVisualStep ? ' (completed)' : idx === currentVisualStep ? ' (current)' : ''}`"
          class="w-2.5 h-2.5 rounded-full transition-all duration-200"
          :class="
            idx < currentVisualStep
              ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
              : idx === currentVisualStep
                ? 'neo-step-active w-6'
                : 'neo-step-future w-2.5 h-2.5'
          "
          @click="idx < currentVisualStep && goToStepByIndex(idx)"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[currentVisualStep] }}
      </span>
    </div>

    <!-- Step 1: Intro -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'intro'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.coreBeliefs.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.coreBeliefs.intro.techniqueName') }}
            </p>
            <div class="flex items-center gap-3 text-sm text-on-surface">
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.coreBeliefs.intro.flowSituation') }}</span>
              <AppIcon name="arrow_downward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.coreBeliefs.intro.flowAutomaticThought') }}</span>
              <AppIcon name="arrow_downward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.coreBeliefs.intro.flowCoreBelief') }}</span>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.coreBeliefs.intro.techniqueDescription') }}
            </p>
          </div>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'starting-thought'">
            {{ t('common.buttons.start') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Starting Thought -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'starting-thought'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.startingThought.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.coreBeliefs.startingThought.description') }}
          </p>
          <textarea
            v-model="startingThought"
            rows="3"
            :placeholder="t('exerciseWizards.coreBeliefs.startingThought.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
          <div class="space-y-1">
            <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.coreBeliefs.startingThought.sourceLabel') }}</label>
            <div class="flex gap-2">
              <button
                v-for="src in sourceTypes"
                :key="src.value"
                type="button"
                :class="[
                  'neo-pill px-3 py-1.5 text-xs transition-all',
                  sourceType === src.value ? 'neo-pill--primary' : '',
                ]"
                @click="sourceType = sourceType === src.value ? undefined : src.value"
              >
                {{ src.label }}
              </button>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!startingThought.trim()"
            @click="currentStep = 'downward-arrow'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Downward Arrow -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'downward-arrow'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.downwardArrow.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.coreBeliefs.downwardArrow.description') }}
          </p>

          <!-- Chain display -->
          <div class="space-y-3">
            <!-- Starting thought -->
            <div class="neo-panel p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
                {{ t('exerciseWizards.coreBeliefs.downwardArrow.startingThoughtLabel') }}
              </p>
              <p class="text-sm text-on-surface italic">"{{ startingThought }}"</p>
            </div>

            <!-- Previous downward arrow steps -->
            <template v-for="(answer, idx) in downwardArrowSteps" :key="idx">
              <div class="flex justify-center">
                <AppIcon name="arrow_downward" class="text-base text-on-surface-variant" />
              </div>
              <div class="neo-embedded p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
                  {{ t('exerciseWizards.coreBeliefs.downwardArrow.layerLabel', { n: idx + 1 }) }}
                </p>
                <p class="text-sm text-on-surface">"{{ answer }}"</p>
              </div>
            </template>

            <!-- Current input -->
            <div class="flex justify-center">
              <AppIcon name="arrow_downward" class="text-base text-on-surface-variant" />
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium text-on-surface">
                {{ t('exerciseWizards.coreBeliefs.downwardArrow.questionLabel') }}
              </label>
              <textarea
                v-model="currentArrowAnswer"
                rows="2"
                :placeholder="t('exerciseWizards.coreBeliefs.downwardArrow.placeholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none"
              />
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-wrap gap-2">
            <AppButton
              variant="filled"
              :disabled="!currentArrowAnswer.trim()"
              @click="addArrowStep"
            >
              {{ t('exerciseWizards.coreBeliefs.downwardArrow.addLayer') }}
            </AppButton>
            <AppButton
              variant="tonal"
              :disabled="downwardArrowSteps.length === 0 && !currentArrowAnswer.trim()"
              @click="finishDownwardArrow"
            >
              {{ t('exerciseWizards.coreBeliefs.downwardArrow.foundIt') }}
            </AppButton>
          </div>

          <!-- LLM Assist: Help me go deeper -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="isDeepenerLoading"
              @click="handleDeepenerAssist"
            >
              <AppIcon name="auto_awesome" class="text-base" />
              {{ isDeepenerLoading ? t('exerciseWizards.coreBeliefs.downwardArrow.deepenerLoading') : t('exerciseWizards.coreBeliefs.downwardArrow.deepenerLabel') }}
            </AppButton>
            <div v-if="deepenerResponse" class="neo-panel p-4">
              <p class="text-sm text-on-surface whitespace-pre-line">{{ deepenerResponse }}</p>
            </div>
            <p v-if="deepenerError" class="text-xs text-error">{{ deepenerError }}</p>
          </div>
        </AppCard>
        <div class="flex justify-start">
          <AppButton variant="text" @click="currentStep = 'starting-thought'">{{ t('common.buttons.back') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Core Belief & Category -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'core-belief'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.coreBelief.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.coreBeliefs.coreBelief.description') }}
          </p>
          <textarea
            v-model="coreBelief"
            rows="2"
            :placeholder="t('exerciseWizards.coreBeliefs.coreBelief.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.coreBelief.categoryTitle') }}</h3>
          <div class="space-y-2">
            <button
              v-for="cat in beliefCategories"
              :key="cat.value"
              type="button"
              :class="[
                'neo-selector neo-focus w-full text-left p-4',
                beliefCategory === cat.value ? 'neo-selector--active' : '',
              ]"
              @click="beliefCategory = cat.value"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  :class="
                    beliefCategory === cat.value
                      ? 'border-primary bg-primary'
                      : 'border-outline'
                  "
                >
                  <div
                    v-if="beliefCategory === cat.value"
                    class="w-2 h-2 rounded-full bg-on-primary"
                  />
                </div>
                <div>
                  <p class="text-base font-semibold text-on-surface">{{ cat.label }}</p>
                  <p class="text-sm text-on-surface-variant">{{ cat.description }}</p>
                </div>
              </div>
            </button>
          </div>
        </AppCard>

        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('exerciseWizards.coreBeliefs.coreBelief.believabilityTitle') }}
          </h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.coreBeliefs.coreBelief.believabilityLabel') }}</label>
              <span class="text-sm font-semibold text-primary">{{ believabilityBefore }}%</span>
            </div>
            <input
              v-model.number="believabilityBefore"
              type="range"
              min="0"
              max="100"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.coreBeliefs.coreBelief.notAtAll') }}</span>
              <span>{{ t('exerciseWizards.coreBeliefs.coreBelief.completely') }}</span>
            </div>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'downward-arrow'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!coreBelief.trim() || !beliefCategory"
            @click="currentStep = 'evidence-for'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Evidence For -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'evidence-for'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.evidenceFor.title') }}</h2>
          <div class="neo-panel p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
              {{ t('exerciseWizards.coreBeliefs.evidenceFor.coreBeliefLabel') }}
            </p>
            <p class="text-sm text-on-surface italic">"{{ coreBelief }}"</p>
          </div>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.coreBeliefs.evidenceFor.description') }}
          </p>
          <div class="space-y-2">
            <div
              v-for="(_item, idx) in evidenceFor"
              :key="idx"
              class="flex items-center gap-2 group"
            >
              <span class="text-primary text-sm flex-shrink-0">&#8226;</span>
              <input
                v-model="evidenceFor[idx]"
                type="text"
                class="neo-input neo-focus flex-1 p-2.5 text-sm"
                :placeholder="t('exerciseWizards.coreBeliefs.evidenceFor.placeholder')"
              />
              <button
                v-if="evidenceFor.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="evidenceFor.splice(idx, 1)"
              >
                <AppIcon name="close" class="text-xl" />
              </button>
            </div>
            <AppButton variant="text" @click="evidenceFor.push('')">
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.coreBeliefs.evidenceFor.addEvidence') }}
            </AppButton>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'core-belief'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'evidence-against'">
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 6: Evidence Against -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'evidence-against'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.evidenceAgainst.title') }}</h2>
          <div class="neo-panel p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
              {{ t('exerciseWizards.coreBeliefs.evidenceAgainst.coreBeliefLabel') }}
            </p>
            <p class="text-sm text-on-surface italic">"{{ coreBelief }}"</p>
          </div>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.coreBeliefs.evidenceAgainst.description') }}
          </p>
          <div class="space-y-2">
            <div
              v-for="(_item, idx) in evidenceAgainst"
              :key="idx"
              class="flex items-center gap-2 group"
            >
              <span class="text-primary text-sm flex-shrink-0">&#8226;</span>
              <input
                v-model="evidenceAgainst[idx]"
                type="text"
                class="neo-input neo-focus flex-1 p-2.5 text-sm"
                :placeholder="t('exerciseWizards.coreBeliefs.evidenceAgainst.placeholder')"
              />
              <button
                v-if="evidenceAgainst.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="evidenceAgainst.splice(idx, 1)"
              >
                <AppIcon name="close" class="text-xl" />
              </button>
            </div>
            <AppButton variant="text" @click="evidenceAgainst.push('')">
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.coreBeliefs.evidenceAgainst.addEvidence') }}
            </AppButton>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'evidence-for'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'alternative'">
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 7: Alternative Belief -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'alternative'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.alternative.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.coreBeliefs.alternative.description') }}
          </p>

          <!-- Evidence summary -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="neo-surface p-3 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.coreBeliefs.alternative.evidenceForLabel') }}
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
                {{ t('exerciseWizards.coreBeliefs.alternative.noEvidenceListed') }}
              </p>
            </div>
            <div class="neo-surface p-3 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.coreBeliefs.alternative.evidenceAgainstLabel') }}
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
                {{ t('exerciseWizards.coreBeliefs.alternative.noEvidenceListed') }}
              </p>
            </div>
          </div>

          <textarea
            v-model="alternativeBelief"
            rows="3"
            :placeholder="t('exerciseWizards.coreBeliefs.alternative.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />

          <!-- LLM Assist: Help me find alternatives -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="isAlternativeLoading || !coreBelief.trim()"
              @click="handleAlternativeAssist"
            >
              <AppIcon name="auto_awesome" class="text-base" />
              {{ isAlternativeLoading ? t('exerciseWizards.coreBeliefs.alternative.llmLoading') : t('exerciseWizards.coreBeliefs.alternative.llmLabel') }}
            </AppButton>
            <div v-if="alternativeMessages.length > 0" class="space-y-2">
              <div
                v-for="(msg, idx) in alternativeMessages"
                :key="idx"
                class="neo-panel p-3"
              >
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
                  {{ msg.role === 'assistant' ? t('exerciseWizards.coreBeliefs.alternative.suggestion') : t('exerciseWizards.coreBeliefs.alternative.you') }}
                </p>
                <p class="text-sm text-on-surface whitespace-pre-line">{{ msg.content }}</p>
                <button
                  v-if="msg.role === 'assistant'"
                  type="button"
                  class="mt-2 text-xs text-primary font-medium hover:underline"
                  @click="alternativeBelief = msg.content"
                >
                  {{ t('exerciseWizards.coreBeliefs.alternative.useAsStartingPoint') }}
                </button>
              </div>
            </div>
            <div v-if="alternativeMessages.length > 0" class="flex gap-2">
              <input
                v-model="alternativeFollowUp"
                type="text"
                :placeholder="t('exerciseWizards.coreBeliefs.alternative.followUpPlaceholder')"
                class="neo-input neo-focus flex-1 p-2 text-sm"
                @keyup.enter="handleAlternativeFollowUp"
              />
              <AppButton
                variant="tonal"
                :disabled="!alternativeFollowUp.trim() || isAlternativeLoading"
                @click="handleAlternativeFollowUp"
              >
                {{ t('exerciseWizards.coreBeliefs.alternative.send') }}
              </AppButton>
            </div>
            <p v-if="alternativeError" class="text-xs text-error">{{ alternativeError }}</p>
          </div>
        </AppCard>

        <!-- Re-rate believability -->
        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.alternative.rerateTitle') }}</h3>

          <div class="space-y-3">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-on-surface">
                  {{ t('exerciseWizards.coreBeliefs.alternative.originalBeliefNow') }}
                </label>
                <span class="text-sm font-semibold text-primary">{{ believabilityAfter }}%</span>
              </div>
              <input
                v-model.number="believabilityAfter"
                type="range"
                min="0"
                max="100"
                step="1"
                class="neo-focus w-full accent-primary"
              />
              <div class="flex justify-between text-xs text-on-surface-variant">
                <span>{{ t('exerciseWizards.coreBeliefs.alternative.notAtAll') }}</span>
                <span>{{ t('exerciseWizards.coreBeliefs.alternative.completely') }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-on-surface">
                  {{ t('exerciseWizards.coreBeliefs.alternative.alternativeBeliefLabel') }}
                </label>
                <span class="text-sm font-semibold text-primary">{{ alternativeBeliefBelievability }}%</span>
              </div>
              <input
                v-model.number="alternativeBeliefBelievability"
                type="range"
                min="0"
                max="100"
                step="1"
                class="neo-focus w-full accent-primary"
              />
              <div class="flex justify-between text-xs text-on-surface-variant">
                <span>{{ t('exerciseWizards.coreBeliefs.alternative.notAtAll') }}</span>
                <span>{{ t('exerciseWizards.coreBeliefs.alternative.completely') }}</span>
              </div>
            </div>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'evidence-against'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!alternativeBelief.trim()"
            @click="currentStep = 'summary'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 8: Summary -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'summary'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-5">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.coreBeliefs.summary.title') }}</h2>

          <!-- Downward Arrow Chain -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.coreBeliefs.summary.downwardArrowChain') }}
            </p>
            <div class="neo-surface p-3 space-y-2">
              <p class="text-sm text-on-surface italic">"{{ startingThought }}"</p>
              <div v-for="(answer, answerIdx) in downwardArrowSteps" :key="answerIdx" class="flex items-center gap-2">
                <AppIcon name="arrow_downward" class="text-xs text-on-surface-variant flex-shrink-0" />
                <p class="text-sm text-on-surface">"{{ answer }}"</p>
              </div>
            </div>
          </div>

          <!-- Core Belief -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.coreBeliefs.summary.coreBeliefLabel') }}
            </p>
            <p class="text-sm font-medium text-on-surface">"{{ coreBelief }}"</p>
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ categoryLabel }}</span>
          </div>

          <!-- Evidence -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="neo-surface p-3 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.coreBeliefs.summary.evidenceFor') }}
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
                {{ t('exerciseWizards.coreBeliefs.summary.noneListed') }}
              </p>
            </div>
            <div class="neo-surface p-3 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.coreBeliefs.summary.evidenceAgainst') }}
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
                {{ t('exerciseWizards.coreBeliefs.summary.noneListed') }}
              </p>
            </div>
          </div>

          <!-- Alternative Belief -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.coreBeliefs.summary.alternativeBelief') }}
            </p>
            <p class="text-sm text-on-surface">"{{ alternativeBelief }}"</p>
          </div>

          <!-- Believability Comparison -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.coreBeliefs.summary.believability') }}
            </p>
            <div class="flex items-center gap-4">
              <div class="flex-1 text-center">
                <p class="text-xs text-on-surface-variant mb-1">{{ t('exerciseWizards.coreBeliefs.summary.originalBefore') }}</p>
                <p class="text-2xl font-bold text-on-surface">{{ believabilityBefore }}%</p>
              </div>
              <AppIcon name="arrow_forward" class="text-xl text-on-surface-variant flex-shrink-0" />
              <div class="flex-1 text-center">
                <p class="text-xs text-on-surface-variant mb-1">{{ t('exerciseWizards.coreBeliefs.summary.originalAfter') }}</p>
                <p
                  class="text-2xl font-bold"
                  :class="believabilityAfter < believabilityBefore ? 'text-success' : believabilityAfter > believabilityBefore ? 'text-error' : 'text-on-surface'"
                >
                  {{ believabilityAfter }}%
                </p>
              </div>
            </div>
            <div class="text-center mt-2">
              <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.coreBeliefs.summary.alternativeBeliefRating') }}</p>
              <p class="text-xl font-bold text-primary">{{ alternativeBeliefBelievability }}%</p>
            </div>
            <p
              v-if="believabilityDelta !== 0"
              class="text-center text-sm"
              :class="believabilityDelta < 0 ? 'text-success' : 'text-on-surface-variant'"
            >
              {{ believabilityDelta < 0 ? t('exerciseWizards.coreBeliefs.summary.decreaseInBelief', { value: Math.abs(believabilityDelta) }) : t('exerciseWizards.coreBeliefs.summary.increaseInBelief', { value: believabilityDelta }) }}
            </p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'alternative'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">
            {{ t('common.buttons.save') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { CreateCoreBeliefsExplorationPayload } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateCoreBeliefsExplorationPayload]
}>()

const { t, locale } = useT()

// ─── Step State ──────────────────────────────────────────────────────────────
type Step =
  | 'intro'
  | 'starting-thought'
  | 'downward-arrow'
  | 'core-belief'
  | 'evidence-for'
  | 'evidence-against'
  | 'alternative'
  | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.coreBeliefs.steps.intro'),
  t('exerciseWizards.coreBeliefs.steps.startingThought'),
  t('exerciseWizards.coreBeliefs.steps.downwardArrow'),
  t('exerciseWizards.coreBeliefs.steps.coreBelief'),
  t('exerciseWizards.coreBeliefs.steps.evidenceFor'),
  t('exerciseWizards.coreBeliefs.steps.evidenceAgainst'),
  t('exerciseWizards.coreBeliefs.steps.alternative'),
  t('exerciseWizards.coreBeliefs.steps.summary'),
])

const stepOrder: Step[] = [
  'intro',
  'starting-thought',
  'downward-arrow',
  'core-belief',
  'evidence-for',
  'evidence-against',
  'alternative',
  'summary',
]

const currentVisualStep = computed(() => {
  return stepOrder.indexOf(currentStep.value)
})

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Form State ──────────────────────────────────────────────────────────────
const startingThought = ref('')
const sourceType = ref<'manual' | 'thought-record' | 'journal' | undefined>(undefined)

const sourceTypes = computed(() => [
  { value: 'manual' as const, label: t('exerciseWizards.coreBeliefs.startingThought.sourceTypes.manual') },
  { value: 'thought-record' as const, label: t('exerciseWizards.coreBeliefs.startingThought.sourceTypes.thoughtRecord') },
  { value: 'journal' as const, label: t('exerciseWizards.coreBeliefs.startingThought.sourceTypes.journal') },
])

// Downward Arrow
const downwardArrowSteps = reactive<string[]>([])
const currentArrowAnswer = ref('')

function addArrowStep() {
  if (currentArrowAnswer.value.trim()) {
    downwardArrowSteps.push(currentArrowAnswer.value.trim())
    currentArrowAnswer.value = ''
  }
}

function finishDownwardArrow() {
  // If there's a current answer, add it first
  if (currentArrowAnswer.value.trim()) {
    downwardArrowSteps.push(currentArrowAnswer.value.trim())
    currentArrowAnswer.value = ''
  }
  // Pre-fill core belief with the last downward arrow answer
  if (downwardArrowSteps.length > 0) {
    coreBelief.value = downwardArrowSteps[downwardArrowSteps.length - 1]
  }
  currentStep.value = 'core-belief'
}

// Core Belief
const coreBelief = ref('')
const beliefCategory = ref<'self' | 'others' | 'world' | null>(null)
const believabilityBefore = ref(50)
const believabilityAfter = ref(50)

const beliefCategories = computed(() => [
  {
    value: 'self' as const,
    label: t('exerciseWizards.coreBeliefs.coreBelief.categories.self.label'),
    description: t('exerciseWizards.coreBeliefs.coreBelief.categories.self.description'),
  },
  {
    value: 'others' as const,
    label: t('exerciseWizards.coreBeliefs.coreBelief.categories.others.label'),
    description: t('exerciseWizards.coreBeliefs.coreBelief.categories.others.description'),
  },
  {
    value: 'world' as const,
    label: t('exerciseWizards.coreBeliefs.coreBelief.categories.world.label'),
    description: t('exerciseWizards.coreBeliefs.coreBelief.categories.world.description'),
  },
])

const categoryLabel = computed(() => {
  const cat = beliefCategories.value.find((c) => c.value === beliefCategory.value)
  return cat?.label ?? ''
})

// Evidence
const evidenceFor = reactive<string[]>([''])
const evidenceAgainst = reactive<string[]>([''])

const filledEvidenceFor = computed(() => evidenceFor.filter((e) => e.trim().length > 0))
const filledEvidenceAgainst = computed(() => evidenceAgainst.filter((e) => e.trim().length > 0))

// Alternative Belief
const alternativeBelief = ref('')
const alternativeBeliefBelievability = ref(50)

// Believability comparison
const believabilityDelta = computed(() => {
  return believabilityAfter.value - believabilityBefore.value
})

// ─── LLM Assist: Help me go deeper ──────────────────────────────────────────
const isDeepenerLoading = ref(false)
const deepenerResponse = ref('')
const deepenerError = ref('')
const llmAssistsUsed = reactive(new Set<'identify-belief' | 'alternative-belief'>())

async function handleDeepenerAssist() {
  isDeepenerLoading.value = true
  deepenerError.value = ''
  try {
    const { guideCoreBeliefExploration } = await import('@/services/cbtLLMAssists')
    const allSteps = currentArrowAnswer.value.trim()
      ? [...downwardArrowSteps, currentArrowAnswer.value.trim()]
      : [...downwardArrowSteps]
    deepenerResponse.value = await guideCoreBeliefExploration({
      startingThought: startingThought.value,
      downwardArrowSteps: allSteps,
      locale: locale.value,
    })
    llmAssistsUsed.add('identify-belief')
  } catch (err) {
    deepenerError.value = err instanceof Error ? err.message : 'Failed to get guidance'
  } finally {
    isDeepenerLoading.value = false
  }
}

// ─── LLM Assist: Help me find alternatives ───────────────────────────────────
const isAlternativeLoading = ref(false)
const alternativeMessages = reactive<{ role: 'assistant' | 'user'; content: string }[]>([])
const alternativeFollowUp = ref('')
const alternativeError = ref('')

async function handleAlternativeAssist() {
  isAlternativeLoading.value = true
  alternativeError.value = ''
  try {
    const { suggestAlternativeBeliefs } = await import('@/services/cbtLLMAssists')
    const result = await suggestAlternativeBeliefs({
      coreBelief: coreBelief.value,
      beliefCategory: beliefCategory.value!,
      evidenceFor: filledEvidenceFor.value,
      evidenceAgainst: filledEvidenceAgainst.value,
      previousMessages: [...alternativeMessages],
      locale: locale.value,
    })
    alternativeMessages.push({ role: 'assistant', content: result })
    llmAssistsUsed.add('alternative-belief')
  } catch (err) {
    alternativeError.value = err instanceof Error ? err.message : 'Failed to get suggestions'
  } finally {
    isAlternativeLoading.value = false
  }
}

async function handleAlternativeFollowUp() {
  if (!alternativeFollowUp.value.trim()) return
  alternativeMessages.push({ role: 'user', content: alternativeFollowUp.value })
  alternativeFollowUp.value = ''
  await handleAlternativeAssist()
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateCoreBeliefsExplorationPayload = {
    startingThought: startingThought.value.trim(),
    sourceType: sourceType.value,
    downwardArrowSteps: [...downwardArrowSteps],
    coreBelief: coreBelief.value.trim(),
    beliefCategory: beliefCategory.value!,
    believabilityBefore: believabilityBefore.value,
    believabilityAfter: believabilityAfter.value,
    evidenceFor: filledEvidenceFor.value,
    evidenceAgainst: filledEvidenceAgainst.value,
    alternativeBelief: alternativeBelief.value.trim(),
    alternativeBeliefBelievability: alternativeBeliefBelievability.value,
    llmAssistUsed: llmAssistsUsed.size > 0 ? [...llmAssistsUsed] : undefined,
  }
  emit('saved', payload)
}
</script>
