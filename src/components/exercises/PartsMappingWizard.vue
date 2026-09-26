<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <ExerciseStepper :labels="stepLabels" :current="stepIndex" @go="goToStep(STEPS[$event])" />

    <!-- Step 1: Introduction -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <template v-if="currentStep === 'intro'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.partsMapping.intro.title') }}</h2>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.partsMapping.intro.description') }}
            </p>
            <div class="neo-surface p-4 rounded-xl space-y-4">
              <div class="flex items-start gap-3">
                <AppIcon name="group" class="text-xl text-ifs-manager shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.partsMapping.intro.managers.title') }}</p>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.partsMapping.intro.managers.description') }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <AppIcon name="local_fire_department" class="text-xl text-ifs-firefighter shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.partsMapping.intro.firefighters.title') }}</p>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.partsMapping.intro.firefighters.description') }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <AppIcon name="favorite" class="text-xl text-ifs-exile shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.partsMapping.intro.exiles.title') }}</p>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.partsMapping.intro.exiles.description') }}</p>
                </div>
              </div>
            </div>
            <div class="neo-surface p-3 rounded-lg">
              <p class="text-sm italic text-on-surface-variant">
                "{{ t('exerciseWizards.partsMapping.intro.quote') }}"
                <span class="text-xs">— {{ t('exerciseWizards.partsMapping.intro.quoteAuthor') }}</span>
              </p>
            </div>

            <div class="space-y-2">
              <EmotionSelector
                :label="t('exerciseWizards.partsMapping.intro.emotionLabel')"
                v-model="beforeEmotionIds"
                v-model:families="beforeEmotionFamilyIds"
                v-model:quadrant="activeEmotionQuadrantIntro"
                :allow-family-only="true"
              />
            </div>
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" @click="nextStep()">
              {{ t('exerciseWizards.partsMapping.intro.startButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Trailhead -->
      <template v-else-if="currentStep === 'trailhead'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.trailhead.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ tg('exerciseWizards.partsMapping.trailhead.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.partsMapping.trailhead.why')" />

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.trailhead.situationLabel') }}</label>
              <textarea
                v-model="trailheadSituation"
                rows="3"
                :placeholder="t('exerciseWizards.partsMapping.trailhead.situationPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <div class="space-y-2">
              <EmotionSelector
                :label="t('exerciseWizards.partsMapping.trailhead.emotionsLabel')"
                v-model="trailheadEmotionIds"
                v-model:families="trailheadEmotionFamilyIds"
                v-model:quadrant="activeEmotionQuadrantTrailhead"
                :allow-family-only="true"
              />
            </div>

            <BodyLocationPicker
              v-model="trailheadBodyLocations"
              :label="tg('exerciseWizards.partsMapping.trailhead.bodyLocationLabel')"
              :multiple="false"
            />

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.trailhead.thoughtsLabel') }}</label>
              <textarea
                v-model="trailheadThoughts"
                rows="2"
                :placeholder="t('exerciseWizards.partsMapping.trailhead.thoughtsPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Identify Part -->
      <template v-else-if="currentStep === 'identify-part'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">
              {{ editingPartIndex !== null ? t('exerciseWizards.partsMapping.identifyPart.editTitle') : t('exerciseWizards.partsMapping.identifyPart.title') }}
            </h2>
            <p class="text-sm text-on-surface-variant">
              {{ tg('exerciseWizards.partsMapping.identifyPart.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.partsMapping.identifyPart.why')" />

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ tg('exerciseWizards.partsMapping.identifyPart.nameLabel') }}</label>
              <input
                v-model="currentPartName"
                type="text"
                class="neo-input w-full p-3 text-sm"
                :placeholder="t('exerciseWizards.partsMapping.identifyPart.namePlaceholder')"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.roleLabel') }}</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="role in roleOptions"
                  :key="role.value"
                  class="exercise-pill px-3 py-1.5 text-xs neo-focus transition-all"
                  :class="currentPartRole === role.value
                    ? `${role.activeClass} shadow-neu-pressed`
                    : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                  @click="currentPartRole = role.value"
                >
                  {{ role.label }}
                </button>
              </div>
            </div>

            <p class="text-xs text-on-surface-variant italic">{{ t('exerciseWizards.partsMapping.identifyPart.roleHint') }}</p>

            <!-- Protector questions (managers, firefighters, unknown) -->
            <template v-if="currentPartRole !== 'exile'">
              <div class="space-y-1">
                <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.protectionLabel') }}</label>
                <textarea
                  v-model="currentPartPositiveIntention"
                  rows="2"
                  :placeholder="t('exerciseWizards.partsMapping.identifyPart.protectionPlaceholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>

              <div class="space-y-1">
                <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.fearLabel') }}</label>
                <textarea
                  v-model="currentPartFears"
                  rows="2"
                  :placeholder="tg('exerciseWizards.partsMapping.identifyPart.fearPlaceholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </template>

            <!-- Exile questions: an exile doesn't protect — it carries and needs -->
            <template v-else>
              <div class="space-y-1">
                <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.exileCarriesLabel') }}</label>
                <textarea
                  v-model="currentPartBurden"
                  rows="2"
                  :placeholder="t('exerciseWizards.partsMapping.identifyPart.exileCarriesPlaceholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>

              <div class="space-y-1">
                <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.identifyPart.exileNeedsLabel') }}</label>
                <textarea
                  v-model="currentPartNeeds"
                  rows="2"
                  :placeholder="t('exerciseWizards.partsMapping.identifyPart.exileNeedsPlaceholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </template>

            <BodyLocationPicker
              v-model="currentPartBodyLocations"
              :label="t('exerciseWizards.partsMapping.identifyPart.bodyLabel')"
              :multiple="true"
            />

            <!-- Part preview -->
            <AppCard v-if="currentPartName.trim()" variant="inset" padding="sm" class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-on-surface">{{ currentPartName }}</span>
                <PartRoleBadge :role="currentPartRole" />
              </div>
              <p v-if="currentPartPositiveIntention.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.partsMapping.identifyPart.protectsFrom', { text: currentPartPositiveIntention }) }}
              </p>
              <p v-if="currentPartFears.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.partsMapping.identifyPart.fears', { text: currentPartFears }) }}
              </p>
              <p v-if="currentPartRole === 'exile' && currentPartBurden.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.partsMapping.identifyPart.carries', { text: currentPartBurden }) }}
              </p>
              <p v-if="currentPartRole === 'exile' && currentPartNeeds.trim()" class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.partsMapping.identifyPart.needs', { text: currentPartNeeds }) }}
              </p>
            </AppCard>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Add More -->
      <template v-else-if="currentStep === 'add-more'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.addMore.title') }}</h2>

            <div class="space-y-3">
              <AppCard
                v-for="(part, idx) in identifiedParts"
                :key="idx"
                variant="raised"
                padding="sm"
                class="flex items-start justify-between gap-2"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-on-surface">{{ part.name }}</span>
                    <PartRoleBadge :role="part.role" />
                  </div>
                  <p v-if="part.positiveIntention" class="text-xs text-on-surface-variant truncate">
                    {{ t('exerciseWizards.partsMapping.identifyPart.protectsFrom', { text: part.positiveIntention }) }}
                  </p>
                  <p v-if="part.bodyLocations.length" class="text-xs text-on-surface-variant">
                    {{ part.bodyLocations.map(formatLocation).join(', ') }}
                  </p>
                </div>
                <div class="flex gap-1 shrink-0">
                  <button class="neo-focus rounded-full p-1 text-on-surface-variant hover:text-primary" @click="editPart(idx)">
                    <AppIcon name="edit" class="text-base" />
                  </button>
                  <button class="neo-focus rounded-full p-1 text-on-surface-variant hover:text-error" @click="removePart(idx)">
                    <AppIcon name="delete" class="text-base" />
                  </button>
                </div>
              </AppCard>
            </div>

            <div class="flex gap-3">
              <AppButton variant="tonal" @click="addAnotherPart()">
                <AppIcon name="add" class="text-base mr-1" />
                {{ t('exerciseWizards.partsMapping.addMore.addButton') }}
              </AppButton>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('exerciseWizards.partsMapping.addMore.continueButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Visual Map -->
      <template v-else-if="currentStep === 'visual-map'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.visualMap.title') }}</h2>
            <ExerciseStepWhy :text="tg('exerciseWizards.partsMapping.visualMap.why')" />

            <!-- SVG Map -->
            <div class="neo-surface rounded-2xl p-4" style="min-height: 300px">
              <svg :width="mapWidth" :height="mapHeight" :viewBox="`0 0 ${mapWidth} ${mapHeight}`" class="w-full">
                <!-- Relationship lines -->
                <line
                  v-for="(rel, idx) in relationships"
                  :key="`rel-${idx}`"
                  :x1="partPosition(getPartIndex(rel.fromPartId)).x"
                  :y1="partPosition(getPartIndex(rel.fromPartId)).y"
                  :x2="partPosition(getPartIndex(rel.toPartId)).x"
                  :y2="partPosition(getPartIndex(rel.toPartId)).y"
                  :stroke="relationshipColor(rel.type)"
                  stroke-width="2"
                  :stroke-dasharray="rel.type === 'protects' || rel.type === 'triggers' ? '6 3' : 'none'"
                />
                <!-- Self circle -->
                <circle :cx="mapWidth / 2" :cy="mapHeight / 2" r="28" class="fill-primary/20 stroke-primary" stroke-width="2" />
                <text :x="mapWidth / 2" :y="mapHeight / 2" text-anchor="middle" dominant-baseline="middle" class="fill-primary text-xs font-bold select-none">{{ t('exerciseWizards.partsMapping.visualMap.self') }}</text>
                <!-- Part circles -->
                <g
                  v-for="(part, idx) in identifiedParts"
                  :key="`part-${idx}`"
                  :transform="`translate(${partPosition(idx).x}, ${partPosition(idx).y})`"
                  class="cursor-pointer"
                  @click="togglePartSelection(idx)"
                >
                  <circle
                    r="24"
                    :class="[
                      partFillClass(part.role),
                      selectedPartIndices.includes(idx) ? 'stroke-primary stroke-[3]' : 'stroke-current stroke-1',
                    ]"
                  />
                  <text y="1" text-anchor="middle" dominant-baseline="middle" class="fill-on-surface text-[10px] font-medium select-none pointer-events-none">
                    {{ part.name.length > 8 ? part.name.slice(0, 7) + '…' : part.name }}
                  </text>
                </g>
              </svg>
            </div>

            <!-- Relationship builder -->
            <div class="space-y-2">
              <p class="text-sm text-on-surface-variant">
                {{ selectedPartIndices.length === 0 ? t('exerciseWizards.partsMapping.visualMap.instructions.tapTwo') :
                   selectedPartIndices.length === 1 ? t('exerciseWizards.partsMapping.visualMap.instructions.tapSecond') :
                   t('exerciseWizards.partsMapping.visualMap.instructions.chooseType') }}
              </p>
              <div v-if="selectedPartIndices.length === 2" class="flex flex-wrap gap-2">
                <button
                  v-for="relType in relationshipTypes"
                  :key="relType.value"
                  class="exercise-pill px-3 py-1 text-xs neo-focus shadow-neu-raised-sm hover:-translate-y-px transition-all"
                  @click="createRelationship(relType.value)"
                >
                  {{ relType.label }}
                </button>
              </div>
            </div>

            <!-- Relationship list -->
            <div v-if="relationships.length" class="space-y-2">
              <p class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">{{ t('exerciseWizards.partsMapping.visualMap.relationships.heading') }}</p>
              <div
                v-for="(rel, idx) in relationships"
                :key="`rlist-${idx}`"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-on-surface">
                  {{ getPartName(rel.fromPartId) }}
                  <span class="text-on-surface-variant mx-1">{{ formatRelationshipType(rel.type) }}</span>
                  {{ getPartName(rel.toPartId) }}
                </span>
                <button class="neo-focus rounded-full p-1 text-on-surface-variant hover:text-error" @click="removeRelationship(idx)">
                  <AppIcon name="close" class="text-sm" />
                </button>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Reflection -->
      <template v-else-if="currentStep === 'reflection'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ tg('exerciseWizards.partsMapping.reflection.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.reflection.description') }}
            </p>
            <ExerciseStepWhy :text="tg('exerciseWizards.partsMapping.reflection.why')" />
            <textarea
              v-model="reflection"
              rows="4"
              :placeholder="t('exerciseWizards.partsMapping.reflection.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />

            <div class="flex flex-wrap items-center gap-2">
              <AppButton
                variant="tonal"
                :disabled="identifiedParts.length < 2 || isLoadingLLM"
                @click="handleFetchInsight"
              >
                <AppIcon name="auto_awesome" class="text-base mr-1" />
                {{ isLoadingLLM ? t('exerciseWizards.partsMapping.reflection.aiButtonLoading') : t('exerciseWizards.partsMapping.reflection.aiButton') }}
              </AppButton>
              <ProfileContextToggle v-model="useProfileReflection" />
            </div>

            <div v-if="llmInsight" class="neo-surface p-4 rounded-xl">
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmInsight }}</p>
              <p class="text-xs text-on-surface-variant/60 italic mt-3">
                {{ tg('exerciseWizards.partsMapping.reflection.aiDisclaimer') }}
              </p>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Life Area Links -->
      <template v-else-if="currentStep === 'life-areas'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.partsMapping.lifeAreas.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.lifeAreas.description') }}
            </p>

            <template v-if="lifeAreas.length">
              <div v-for="(part, idx) in identifiedParts" :key="idx" class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-on-surface">{{ part.name }}</span>
                  <PartRoleBadge :role="part.role" />
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="area in lifeAreas"
                    :key="area.id"
                    class="exercise-pill px-2.5 py-1 text-xs neo-focus transition-all"
                    :class="isLifeAreaSelected(idx, area.id)
                      ? 'bg-primary/20 text-primary shadow-neu-pressed'
                      : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                    @click="toggleLifeArea(idx, area.id)"
                  >
                    {{ area.name }}
                  </button>
                </div>
              </div>
            </template>
            <p v-else class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.partsMapping.lifeAreas.emptyState') }}
            </p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 8: Summary -->
      <template v-else-if="currentStep === 'summary'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-5">
            <div>
              <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.partsMapping.summary.title') }}</h2>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ tp(identifiedParts.length, 'exerciseWizards.partsMapping.summary.partCount.one', 'exerciseWizards.partsMapping.summary.partCount.few', 'exerciseWizards.partsMapping.summary.partCount.many') }}
              </p>
            </div>

            <!-- Parts List -->
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.parts') }}</p>
              <AppCard
                v-for="(part, idx) in identifiedParts"
                :key="idx"
                variant="inset"
                padding="sm"
                class="space-y-1"
              >
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-on-surface">{{ part.name }}</span>
                  <PartRoleBadge :role="part.role" />
                </div>
                <p v-if="part.positiveIntention" class="text-xs text-on-surface-variant">
                  {{ t('exerciseWizards.partsMapping.identifyPart.protectsFrom', { text: part.positiveIntention }) }}
                </p>
                <p v-if="part.fears" class="text-xs text-on-surface-variant">
                  {{ t('exerciseWizards.partsMapping.identifyPart.fears', { text: part.fears }) }}
                </p>
                <p v-if="part.bodyLocations.length" class="text-xs text-on-surface-variant">
                  {{ t('exerciseWizards.partsMapping.summary.bodyPrefix') }} {{ part.bodyLocations.map(formatLocation).join(', ') }}
                </p>
              </AppCard>
            </div>

            <!-- Relationships -->
            <div v-if="relationships.length" class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.relationships') }}</p>
              <p
                v-for="(rel, idx) in relationships"
                :key="idx"
                class="text-sm text-on-surface"
              >
                {{ getPartName(rel.fromPartId) }}
                <span class="text-on-surface-variant">{{ formatRelationshipType(rel.type) }}</span>
                {{ getPartName(rel.toPartId) }}
              </p>
            </div>

            <!-- Reflection -->
            <div v-if="reflection.trim()" class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.reflection') }}</p>
              <p class="text-sm text-on-surface">{{ reflection }}</p>
            </div>

            <!-- LLM Insight -->
            <div v-if="llmInsight" class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.sections.aiInsights') }}</p>
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmInsight }}</p>
            </div>

            <div class="space-y-2">
              <EmotionSelector
                :label="t('exerciseWizards.partsMapping.summary.emotionLabel')"
                v-model="afterEmotionIds"
                v-model:families="afterEmotionFamilyIds"
                v-model:quadrant="activeEmotionQuadrantSummary"
                :allow-family-only="true"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.partsMapping.summary.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.partsMapping.summary.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.partsMapping.summary.saving') : t('exerciseWizards.partsMapping.summary.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import ExerciseStepper from './ExerciseStepper.vue'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import { ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import BodyLocationPicker from '@/components/exercises/ifs/BodyLocationPicker.vue'
import ProfileContextToggle from '@/components/profile/ProfileContextToggle.vue'
import { usePartsMappingWizard, type PartsMappingStep } from '@/composables/usePartsMappingWizard'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useT } from '@/composables/useT'
import { useIfsLabels } from '@/composables/useIfsLabels'
import type { Quadrant } from '@/domain/emotion'
import type { IFSPartRole, IFSRelationship } from '@/domain/exercises'
import {
  IFS_ROLE_CLASSES,
  IFS_ROLE_SVG_CLASSES,
  RELATIONSHIP_STROKE_VAR,
} from '@/constants/exerciseColorRoles'

const emit = defineEmits<{
  saved: []
}>()

const { t, tg, tp } = useT()

const { formatBodyLocation: formatLocation, formatRelationshipType, unknownPartName } = useIfsLabels()

const lifeAreaStore = useLifeAreaStore()
const lifeAreas = computed(() => lifeAreaStore.lifeAreas)
const userPreferencesStore = useUserPreferencesStore()
const useProfileReflection = ref(userPreferencesStore.profileContextDefault)

const STEPS: PartsMappingStep[] = [
  'intro', 'trailhead', 'identify-part', 'add-more',
  'visual-map', 'reflection', 'life-areas', 'summary',
]

const stepLabels = computed(() => [
  t('exerciseWizards.partsMapping.steps.intro'),
  t('exerciseWizards.partsMapping.steps.trailhead'),
  t('exerciseWizards.partsMapping.steps.identifyPart'),
  t('exerciseWizards.partsMapping.steps.addMore'),
  t('exerciseWizards.partsMapping.steps.visualMap'),
  t('exerciseWizards.partsMapping.steps.reflection'),
  t('exerciseWizards.partsMapping.steps.lifeAreas'),
  t('exerciseWizards.partsMapping.steps.summary'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  trailheadSituation,
  trailheadEmotionIds,
  trailheadEmotionFamilyIds,
  trailheadBodyLocations,
  trailheadThoughts,
  beforeEmotionIds,
  beforeEmotionFamilyIds,
  afterEmotionIds,
  afterEmotionFamilyIds,
  identifiedParts,
  editingPartIndex,
  currentPartName,
  currentPartRole,
  currentPartPositiveIntention,
  currentPartFears,
  currentPartBurden,
  currentPartNeeds,
  currentPartBodyLocations,
  editPart,
  removePart,
  addAnotherPart,
  relationships,
  removeRelationship,
  addRelationship,
  reflection,
  llmInsight,
  isLoadingLLM,
  fetchLLMInsight,
  partLifeAreaIds,
  notes,
  isSaving,
  save,
} = usePartsMappingWizard()

const activeEmotionQuadrantIntro = ref<Quadrant | null>(null)
const activeEmotionQuadrantTrailhead = ref<Quadrant | null>(null)
const activeEmotionQuadrantSummary = ref<Quadrant | null>(null)

const roleOptions = computed(() => [
  { value: 'manager' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.manager'), activeClass: `${IFS_ROLE_CLASSES.manager.bg} ${IFS_ROLE_CLASSES.manager.text}` },
  { value: 'firefighter' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.firefighter'), activeClass: `${IFS_ROLE_CLASSES.firefighter.bg} ${IFS_ROLE_CLASSES.firefighter.text}` },
  { value: 'exile' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.exile'), activeClass: `${IFS_ROLE_CLASSES.exile.bg} ${IFS_ROLE_CLASSES.exile.text}` },
  { value: 'unknown' as IFSPartRole, label: tg('exerciseWizards.shared.ifs.partSelector.roleOptions.notSure'), activeClass: 'bg-neu-base text-on-surface' },
])

const relationshipTypes = computed(() => [
  { value: 'protects' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.protects') },
  { value: 'polarized' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.polarized') },
  { value: 'allied' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.allied') },
  { value: 'triggers' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.triggers') },
  { value: 'soothes' as IFSRelationship['type'], label: t('exerciseWizards.partsMapping.visualMap.relationships.soothes') },
])

// Visual Map
const mapWidth = 320
const mapHeight = 300
const selectedPartIndices = ref<number[]>([])

function partPosition(index: number): { x: number; y: number } {
  const count = identifiedParts.value.length
  if (count === 0) return { x: mapWidth / 2, y: mapHeight / 2 }
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2
  const radius = Math.min(mapWidth, mapHeight) / 2 - 40
  return {
    x: mapWidth / 2 + radius * Math.cos(angle),
    y: mapHeight / 2 + radius * Math.sin(angle),
  }
}

function partFillClass(role: IFSPartRole): string {
  return IFS_ROLE_SVG_CLASSES[role]
}

function relationshipColor(type: IFSRelationship['type']): string {
  return RELATIONSHIP_STROKE_VAR[type] ?? RELATIONSHIP_STROKE_VAR.default
}

function togglePartSelection(idx: number) {
  const indices = selectedPartIndices.value
  if (indices.includes(idx)) {
    selectedPartIndices.value = indices.filter((i) => i !== idx)
  } else if (indices.length < 2) {
    selectedPartIndices.value = [...indices, idx]
  } else {
    selectedPartIndices.value = [idx]
  }
}

function createRelationship(type: IFSRelationship['type']) {
  if (selectedPartIndices.value.length !== 2) return
  const [fromIdx, toIdx] = selectedPartIndices.value
  addRelationship({
    fromPartId: `temp-${fromIdx}`,
    toPartId: `temp-${toIdx}`,
    type,
  })
  selectedPartIndices.value = []
}

function getPartName(tempId: string): string {
  const idx = getPartIndex(tempId)
  return identifiedParts.value[idx]?.name ?? unknownPartName.value
}

function getPartIndex(tempId: string): number {
  return parseInt(tempId.replace('temp-', ''), 10)
}


// Life Area toggling
function isLifeAreaSelected(partIdx: number, areaId: string): boolean {
  return partLifeAreaIds.value[partIdx]?.includes(areaId) ?? false
}

function toggleLifeArea(partIdx: number, areaId: string) {
  const current = partLifeAreaIds.value[partIdx] ?? []
  if (current.includes(areaId)) {
    partLifeAreaIds.value[partIdx] = current.filter((id) => id !== areaId)
  } else {
    partLifeAreaIds.value[partIdx] = [...current, areaId]
  }
}

async function handleFetchInsight() {
  const lifeAreaNames = lifeAreas.value.map((a) => a.name)
  await fetchLLMInsight({ lifeAreaNames, useProfile: useProfileReflection.value })
}

async function handleSave() {
  await save()
  emit('saved')
}
</script>
