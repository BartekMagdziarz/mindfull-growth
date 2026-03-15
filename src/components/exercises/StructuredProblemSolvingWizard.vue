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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.structuredProblemSolving.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.intro.howItWorks') }}</p>
            <div class="flex items-center gap-3 text-sm text-on-surface flex-wrap">
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.structuredProblemSolving.intro.pillDefine') }}</span>
              <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.structuredProblemSolving.intro.pillBrainstorm') }}</span>
              <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.structuredProblemSolving.intro.pillEvaluate') }}</span>
              <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.structuredProblemSolving.intro.pillChoose') }}</span>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.structuredProblemSolving.intro.howItWorksDescription') }}
            </p>
          </div>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'problem'">
            {{ t('common.buttons.start') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Problem -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'problem'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.problem.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.problem.description') }}
          </p>
          <textarea
            v-model="problemStatement"
            rows="4"
            :placeholder="t('exerciseWizards.structuredProblemSolving.problem.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.problem.emotionsTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.problem.emotionsDescription') }}
          </p>
          <EmotionSelector
            v-model="emotionIds"
            :show-selected-section="true"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!problemStatement.trim()"
            @click="currentStep = 'brainstorm'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Brainstorm -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'brainstorm'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.brainstorm.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.brainstorm.description') }}
          </p>

          <!-- Add new solution -->
          <div class="flex gap-2">
            <input
              v-model="newSolutionText"
              type="text"
              :placeholder="t('exerciseWizards.structuredProblemSolving.brainstorm.solutionPlaceholder')"
              class="neo-input neo-focus flex-1 p-2.5 text-sm"
              @keyup.enter="addSolution"
            />
            <AppButton
              variant="filled"
              :disabled="!newSolutionText.trim()"
              @click="addSolution"
            >
              {{ t('exerciseWizards.structuredProblemSolving.brainstorm.addButton') }}
            </AppButton>
          </div>

          <!-- Solutions list -->
          <div v-if="solutions.length > 0" class="space-y-2">
            <div
              v-for="(sol, idx) in solutions"
              :key="sol.id"
              class="flex items-center gap-2 group"
            >
              <span class="text-primary text-sm flex-shrink-0 w-5 text-center">{{ idx + 1 }}.</span>
              <span class="neo-surface flex-1 p-2.5 text-sm text-on-surface rounded-xl">
                {{ sol.description }}
              </span>
              <button
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="removeSolution(sol.id)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-on-surface-variant italic">{{ t('exerciseWizards.structuredProblemSolving.brainstorm.noSolutions') }}</p>

          <!-- LLM Assist: Brainstorm -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="!problemStatement.trim() || isBrainstormLoading"
              @click="handleBrainstormAssist"
            >
              <AppIcon name="auto_awesome" class="text-base" />
              {{ isBrainstormLoading ? t('exerciseWizards.structuredProblemSolving.brainstorm.llmLoading') : t('exerciseWizards.structuredProblemSolving.brainstorm.llmLabel') }}
            </AppButton>
            <div v-if="brainstormResponse" class="neo-panel p-4 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.structuredProblemSolving.brainstorm.suggestedSolutions') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ brainstormResponse }}</p>
            </div>
            <p v-if="brainstormError" class="text-xs text-error">{{ brainstormError }}</p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'problem'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="solutions.length < 2"
            @click="currentStep = 'evaluate'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Evaluate -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'evaluate'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.evaluate.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.evaluate.description') }}
          </p>
        </AppCard>

        <!-- Individual solution evaluation cards -->
        <AppCard
          v-for="(sol, solIdx) in solutions"
          :key="sol.id"
          padding="lg"
          class="space-y-4"
        >
          <h3 class="text-base font-semibold text-on-surface">
            {{ solIdx + 1 }}. {{ sol.description }}
          </h3>

          <!-- Pros -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.evaluate.pros') }}</p>
            <div
              v-for="(pro, proIdx) in sol.pros"
              :key="`pro-${proIdx}`"
              class="flex items-center gap-2 group"
            >
              <span class="text-green-600 text-sm flex-shrink-0">+</span>
              <input
                :value="pro"
                type="text"
                :placeholder="t('exerciseWizards.structuredProblemSolving.evaluate.prosPlaceholder')"
                class="neo-input neo-focus flex-1 p-2 text-sm"
                @input="sol.pros[proIdx] = ($event.target as HTMLInputElement).value"
              />
              <button
                v-if="sol.pros.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="sol.pros.splice(proIdx, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
            <AppButton variant="text" @click="sol.pros.push('')">
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.structuredProblemSolving.evaluate.addPro') }}
            </AppButton>
          </div>

          <!-- Cons -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.evaluate.cons') }}</p>
            <div
              v-for="(con, conIdx) in sol.cons"
              :key="`con-${conIdx}`"
              class="flex items-center gap-2 group"
            >
              <span class="text-error text-sm flex-shrink-0">-</span>
              <input
                :value="con"
                type="text"
                :placeholder="t('exerciseWizards.structuredProblemSolving.evaluate.consPlaceholder')"
                class="neo-input neo-focus flex-1 p-2 text-sm"
                @input="sol.cons[conIdx] = ($event.target as HTMLInputElement).value"
              />
              <button
                v-if="sol.cons.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="sol.cons.splice(conIdx, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
            <AppButton variant="text" @click="sol.cons.push('')">
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.structuredProblemSolving.evaluate.addCon') }}
            </AppButton>
          </div>

          <!-- Feasibility Rating -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.structuredProblemSolving.evaluate.feasibility') }}
              </p>
              <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.evaluate.feasibilityDescription') }}</span>
            </div>
            <div class="flex gap-1.5">
              <button
                v-for="n in 5"
                :key="`feas-${n}`"
                type="button"
                class="w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-150"
                :class="
                  sol.feasibilityRating === n
                    ? 'neo-selector--active text-primary'
                    : 'neo-surface text-on-surface-variant hover:text-on-surface'
                "
                @click="sol.feasibilityRating = n"
              >
                {{ n }}
              </button>
            </div>
          </div>

          <!-- Effectiveness Rating -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.structuredProblemSolving.evaluate.effectiveness') }}
              </p>
              <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.evaluate.effectivenessDescription') }}</span>
            </div>
            <div class="flex gap-1.5">
              <button
                v-for="n in 5"
                :key="`eff-${n}`"
                type="button"
                class="w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-150"
                :class="
                  sol.effectivenessRating === n
                    ? 'neo-selector--active text-primary'
                    : 'neo-surface text-on-surface-variant hover:text-on-surface'
                "
                @click="sol.effectivenessRating = n"
              >
                {{ n }}
              </button>
            </div>
          </div>
        </AppCard>

        <!-- LLM Assist: Evaluate -->
        <AppCard padding="lg" class="space-y-3">
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="isEvaluateLoading"
              @click="handleEvaluateAssist"
            >
              <AppIcon name="auto_awesome" class="text-base" />
              {{ isEvaluateLoading ? t('exerciseWizards.structuredProblemSolving.evaluate.llmLoading') : t('exerciseWizards.structuredProblemSolving.evaluate.llmLabel') }}
            </AppButton>
            <div v-if="evaluateResponse" class="neo-panel p-4 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.structuredProblemSolving.evaluate.analysis') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ evaluateResponse }}</p>
            </div>
            <p v-if="evaluateError" class="text-xs text-error">{{ evaluateError }}</p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'brainstorm'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!allSolutionsRated"
            @click="currentStep = 'choose'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Choose -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'choose'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.choose.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.choose.description') }}
          </p>

          <!-- Ranked solutions -->
          <div class="space-y-2">
            <button
              v-for="sol in rankedSolutions"
              :key="sol.id"
              type="button"
              :class="[
                'neo-selector neo-focus w-full text-left p-4',
                chosenSolutionId === sol.id ? 'neo-selector--active' : '',
              ]"
              @click="chosenSolutionId = sol.id"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  :class="
                    chosenSolutionId === sol.id
                      ? 'border-primary bg-primary'
                      : 'border-outline'
                  "
                >
                  <div
                    v-if="chosenSolutionId === sol.id"
                    class="w-2 h-2 rounded-full bg-on-primary"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-on-surface">{{ sol.description }}</p>
                  <p class="text-xs text-on-surface-variant mt-0.5">
                    {{ t('exerciseWizards.structuredProblemSolving.choose.scoreLabel', { score: averageScore(sol).toFixed(1) }) }}
                    &middot; {{ t('exerciseWizards.structuredProblemSolving.choose.feasibilityLabel', { rating: sol.feasibilityRating }) }}
                    &middot; {{ t('exerciseWizards.structuredProblemSolving.choose.effectivenessLabel', { rating: sol.effectivenessRating }) }}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </AppCard>

        <!-- Action Plan -->
        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.choose.actionPlanTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.choose.actionPlanDescription') }}
          </p>
          <textarea
            v-model="actionPlan"
            rows="3"
            :placeholder="t('exerciseWizards.structuredProblemSolving.choose.actionPlanPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />

          <!-- Action Steps -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.choose.actionSteps') }}
            </p>
            <div
              v-for="(_step, idx) in actionSteps"
              :key="idx"
              class="flex items-center gap-2 group"
            >
              <span class="text-primary text-sm flex-shrink-0 w-5 text-center">{{ idx + 1 }}.</span>
              <input
                v-model="actionSteps[idx]"
                type="text"
                :placeholder="t('exerciseWizards.structuredProblemSolving.choose.stepPlaceholder', { n: idx + 1 })"
                class="neo-input neo-focus flex-1 p-2 text-sm"
              />
              <button
                v-if="actionSteps.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="actionSteps.splice(idx, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
            <AppButton variant="text" @click="actionSteps.push('')">
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.structuredProblemSolving.choose.addStep') }}
            </AppButton>
          </div>

          <!-- Target Date -->
          <div class="space-y-1">
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.choose.targetDateLabel') }}</label>
            <input
              v-model="targetDate"
              type="date"
              class="neo-input neo-focus w-full p-2.5 text-sm"
            />
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'evaluate'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!chosenSolutionId"
            @click="currentStep = 'review'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 6: Review -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'review'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-5">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.review.title') }}</h2>

          <!-- Problem -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.review.problem') }}</p>
            <p class="text-sm text-on-surface">{{ problemStatement }}</p>
          </div>

          <!-- Chosen Solution -->
          <div v-if="chosenSolution" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.review.chosenSolution') }}
            </p>
            <p class="text-sm font-medium text-on-surface">{{ chosenSolution.description }}</p>
            <div class="flex gap-4 mt-1">
              <span class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.structuredProblemSolving.review.feasibilityLabel', { rating: chosenSolution.feasibilityRating }) }}
              </span>
              <span class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.structuredProblemSolving.review.effectivenessLabel', { rating: chosenSolution.effectivenessRating }) }}
              </span>
            </div>
          </div>

          <!-- Action Plan -->
          <div v-if="actionPlan.trim()" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.review.actionPlan') }}
            </p>
            <p class="text-sm text-on-surface">{{ actionPlan }}</p>
          </div>

          <!-- Action Steps -->
          <div v-if="filledActionSteps.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.review.actionSteps') }}
            </p>
            <ol class="space-y-1 list-decimal list-inside">
              <li
                v-for="(s, idx) in filledActionSteps"
                :key="idx"
                class="text-sm text-on-surface"
              >
                {{ s }}
              </li>
            </ol>
          </div>

          <!-- Target Date -->
          <div v-if="targetDate" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.review.targetDate') }}
            </p>
            <p class="text-sm text-on-surface">{{ targetDate }}</p>
          </div>
        </AppCard>

        <!-- Outcome / Completion -->
        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.review.markCompletedTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.review.markCompletedDescription') }}
          </p>
          <label class="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
            <input
              v-model="markCompleted"
              type="checkbox"
              class="neo-checkbox"
            />
            {{ t('exerciseWizards.structuredProblemSolving.review.markCompleted') }}
          </label>
          <div v-if="markCompleted" class="space-y-3">
            <textarea
              v-model="outcome"
              rows="3"
              :placeholder="t('exerciseWizards.structuredProblemSolving.review.outcomePlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none"
            />
          </div>
        </AppCard>

        <!-- Emotions After -->
        <AppCard v-if="markCompleted" padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.review.emotionsAfterTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.structuredProblemSolving.review.emotionsAfterDescription') }}
          </p>
          <EmotionSelector
            v-model="emotionIdsAfter"
            :show-selected-section="true"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'choose'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'summary'">
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 7: Summary -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'summary'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-5">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.summary.title') }}</h2>

          <!-- Problem -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.summary.problem') }}</p>
            <p class="text-sm text-on-surface">{{ problemStatement }}</p>
          </div>

          <!-- Emotions Before -->
          <div v-if="emotionIds.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.emotionsBefore') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="id in emotionIds"
                :key="id"
                class="neo-pill px-2.5 py-0.5 text-xs"
              >
                {{ getEmotionName(id) }}
              </span>
            </div>
          </div>

          <!-- Solutions considered -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.solutionsConsidered', { count: solutions.length }) }}
            </p>
            <div class="space-y-1.5">
              <div
                v-for="sol in rankedSolutions"
                :key="sol.id"
                class="flex items-center gap-2"
              >
                <AppIcon
                  v-if="sol.id === chosenSolutionId"
                  name="check_circle"
                  class="text-base text-primary flex-shrink-0"
                />
                <span
                  v-else
                  class="w-4 h-4 flex-shrink-0"
                />
                <span
                  class="text-sm"
                  :class="sol.id === chosenSolutionId ? 'font-medium text-on-surface' : 'text-on-surface-variant'"
                >
                  {{ sol.description }}
                  <span class="text-xs text-on-surface-variant ml-1">
                    ({{ averageScore(sol).toFixed(1) }})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Chosen Solution & Plan -->
          <div v-if="chosenSolution" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.chosenSolution') }}
            </p>
            <p class="text-sm font-medium text-on-surface">{{ chosenSolution.description }}</p>
          </div>

          <div v-if="actionPlan.trim()" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.actionPlan') }}
            </p>
            <p class="text-sm text-on-surface">{{ actionPlan }}</p>
          </div>

          <div v-if="filledActionSteps.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.actionSteps') }}
            </p>
            <ol class="space-y-1 list-decimal list-inside">
              <li
                v-for="(s, idx) in filledActionSteps"
                :key="idx"
                class="text-sm text-on-surface"
              >
                {{ s }}
              </li>
            </ol>
          </div>

          <div v-if="targetDate" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.targetDate') }}
            </p>
            <p class="text-sm text-on-surface">{{ targetDate }}</p>
          </div>

          <!-- Status -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.summary.status') }}</p>
            <span
              class="neo-pill px-2.5 py-0.5 text-xs"
              :class="markCompleted ? 'neo-pill--primary' : ''"
            >
              {{ markCompleted ? t('exerciseWizards.structuredProblemSolving.summary.completed') : t('exerciseWizards.structuredProblemSolving.summary.inProgress') }}
            </span>
          </div>

          <!-- Outcome -->
          <div v-if="markCompleted && outcome.trim()" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.structuredProblemSolving.summary.outcome') }}</p>
            <p class="text-sm text-on-surface">{{ outcome }}</p>
          </div>

          <!-- Emotion shift -->
          <div v-if="markCompleted && emotionIdsAfter.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.emotionsAfter') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="id in emotionIdsAfter"
                :key="id"
                class="neo-pill px-2.5 py-0.5 text-xs"
              >
                {{ getEmotionName(id) }}
              </span>
            </div>
          </div>

          <!-- LLM assists used -->
          <div v-if="llmAssistsUsed.size > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.structuredProblemSolving.summary.aiAssistsUsed') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="assist in llmAssistsUsed"
                :key="assist"
                class="neo-pill px-2.5 py-0.5 text-xs"
              >
                {{ assist === 'brainstorm' ? t('exerciseWizards.structuredProblemSolving.summary.brainstormAssist') : t('exerciseWizards.structuredProblemSolving.summary.evaluateAssist') }}
              </span>
            </div>
          </div>
        </AppCard>

        <!-- Notes (optional) -->
        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.structuredProblemSolving.summary.notesTitle') }}</h3>
          <textarea
            v-model="notes"
            rows="2"
            :placeholder="t('exerciseWizards.structuredProblemSolving.summary.notesPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'review'">{{ t('common.buttons.back') }}</AppButton>
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
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'
import type { CreateStructuredProblemSolvingPayload, SolutionOption } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateStructuredProblemSolvingPayload]
}>()

const emotionStore = useEmotionStore()
const { t, locale } = useT()

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'problem' | 'brainstorm' | 'evaluate' | 'choose' | 'review' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.structuredProblemSolving.steps.intro'),
  t('exerciseWizards.structuredProblemSolving.steps.problem'),
  t('exerciseWizards.structuredProblemSolving.steps.brainstorm'),
  t('exerciseWizards.structuredProblemSolving.steps.evaluate'),
  t('exerciseWizards.structuredProblemSolving.steps.choose'),
  t('exerciseWizards.structuredProblemSolving.steps.review'),
  t('exerciseWizards.structuredProblemSolving.steps.summary'),
])

const stepOrder: Step[] = [
  'intro',
  'problem',
  'brainstorm',
  'evaluate',
  'choose',
  'review',
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
const problemStatement = ref('')
const emotionIds = ref<string[]>([])
const solutions = reactive<SolutionOption[]>([])
const newSolutionText = ref('')
const chosenSolutionId = ref<string | undefined>(undefined)
const actionPlan = ref('')
const actionSteps = reactive<string[]>([''])
const targetDate = ref('')
const markCompleted = ref(false)
const outcome = ref('')
const emotionIdsAfter = ref<string[]>([])
const notes = ref('')

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? t('common.unknown')
}

function addSolution() {
  if (!newSolutionText.value.trim()) return
  solutions.push({
    id: crypto.randomUUID(),
    description: newSolutionText.value.trim(),
    pros: [''],
    cons: [''],
    feasibilityRating: 0,
    effectivenessRating: 0,
    isChosen: false,
  })
  newSolutionText.value = ''
}

function removeSolution(id: string) {
  const idx = solutions.findIndex((s) => s.id === id)
  if (idx !== -1) {
    solutions.splice(idx, 1)
    if (chosenSolutionId.value === id) {
      chosenSolutionId.value = undefined
    }
  }
}

function averageScore(sol: SolutionOption): number {
  if (sol.feasibilityRating === 0 || sol.effectivenessRating === 0) return 0
  return (sol.feasibilityRating + sol.effectivenessRating) / 2
}

const allSolutionsRated = computed(() => {
  return solutions.every((s) => s.feasibilityRating > 0 && s.effectivenessRating > 0)
})

const rankedSolutions = computed(() => {
  return [...solutions].sort((a, b) => averageScore(b) - averageScore(a))
})

const chosenSolution = computed(() => {
  if (!chosenSolutionId.value) return null
  return solutions.find((s) => s.id === chosenSolutionId.value) ?? null
})

const filledActionSteps = computed(() => actionSteps.filter((s) => s.trim().length > 0))

// ─── LLM Assist: Brainstorm ─────────────────────────────────────────────────
const isBrainstormLoading = ref(false)
const brainstormResponse = ref('')
const brainstormError = ref('')
const llmAssistsUsed = reactive(new Set<'brainstorm' | 'evaluate'>())

async function handleBrainstormAssist() {
  isBrainstormLoading.value = true
  brainstormError.value = ''
  try {
    const { brainstormSolutions } = await import('@/services/cbtLLMAssists')
    const emotionNames = emotionIds.value
      .map((id) => emotionStore.getEmotionById(id)?.name)
      .filter((n): n is string => !!n)
    brainstormResponse.value = await brainstormSolutions({
      problemStatement: problemStatement.value,
      emotions: emotionNames.length > 0 ? emotionNames : undefined,
      locale: locale.value,
    })
    llmAssistsUsed.add('brainstorm')
  } catch (err) {
    brainstormError.value = err instanceof Error ? err.message : t('exerciseWizards.structuredProblemSolving.errors.brainstormFailed')
  } finally {
    isBrainstormLoading.value = false
  }
}

// ─── LLM Assist: Evaluate ───────────────────────────────────────────────────
const isEvaluateLoading = ref(false)
const evaluateResponse = ref('')
const evaluateError = ref('')

async function handleEvaluateAssist() {
  isEvaluateLoading.value = true
  evaluateError.value = ''
  try {
    const { evaluateSolutions } = await import('@/services/cbtLLMAssists')
    evaluateResponse.value = await evaluateSolutions({
      problemStatement: problemStatement.value,
      solutions: solutions.map((s) => ({
        description: s.description,
        pros: s.pros.filter((p) => p.trim()),
        cons: s.cons.filter((c) => c.trim()),
      })),
      locale: locale.value,
    })
    llmAssistsUsed.add('evaluate')
  } catch (err) {
    evaluateError.value = err instanceof Error ? err.message : t('exerciseWizards.structuredProblemSolving.errors.evaluateFailed')
  } finally {
    isEvaluateLoading.value = false
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  // Mark chosen solution
  for (const sol of solutions) {
    sol.isChosen = sol.id === chosenSolutionId.value
  }

  const payload: CreateStructuredProblemSolvingPayload = {
    problemStatement: problemStatement.value.trim(),
    emotionIds: [...emotionIds.value],
    solutions: solutions.map((s) => ({
      id: s.id,
      description: s.description,
      pros: s.pros.filter((p) => p.trim()),
      cons: s.cons.filter((c) => c.trim()),
      feasibilityRating: s.feasibilityRating,
      effectivenessRating: s.effectivenessRating,
      isChosen: s.isChosen,
    })),
    chosenSolutionId: chosenSolutionId.value,
    actionPlan: actionPlan.value.trim() || undefined,
    actionSteps: filledActionSteps.value.length > 0 ? filledActionSteps.value : undefined,
    targetDate: targetDate.value || undefined,
    status: markCompleted.value ? 'completed' : 'in-progress',
    outcome: markCompleted.value && outcome.value.trim() ? outcome.value.trim() : undefined,
    emotionIdsAfter: markCompleted.value && emotionIdsAfter.value.length > 0
      ? [...emotionIdsAfter.value]
      : undefined,
    llmAssistUsed: llmAssistsUsed.size > 0 ? [...llmAssistsUsed] : undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
