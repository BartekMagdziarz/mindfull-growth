<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
        <ArrowUturnLeftIcon class="w-4 h-4 text-purple-600" />
      </div>
      <h2 class="text-lg font-semibold text-on-surface">Looking Back</h2>
    </div>

    <!-- Year in Review -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Year in Review
      </label>
      <textarea
        :value="modelValue.yearOverview"
        @input="updateField('yearOverview', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Looking back at this year as a whole..."
        rows="4"
        class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
      />
    </section>

    <!-- What Went Well -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        What Went Well
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        What accomplishments are you proud of?
      </p>
      <ListInput
        :items="modelValue.whatWentWell"
        @update:items="updateField('whatWentWell', $event)"
        placeholder="Add an accomplishment..."
        :max-items="10"
      />
    </section>

    <!-- Challenges Faced -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Challenges Faced
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        What was particularly difficult?
      </p>
      <ListInput
        :items="modelValue.challengesFaced"
        @update:items="updateField('challengesFaced', $event)"
        placeholder="Add a challenge..."
        :max-items="10"
      />
    </section>

    <!-- Lessons Learned -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Lessons Learned
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        What key insights will you carry forward?
      </p>
      <ListInput
        :items="modelValue.lessonsLearned"
        @update:items="updateField('lessonsLearned', $event)"
        placeholder="Add a lesson..."
        :max-items="10"
      />
    </section>

    <!-- Sources of Joy -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Sources of Joy
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        What brought you the most happiness?
      </p>
      <ListInput
        :items="modelValue.sourcesOfJoy"
        @update:items="updateField('sourcesOfJoy', $event)"
        placeholder="Add something that brought joy..."
        :max-items="10"
      />
    </section>

    <!-- Gratitude -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Gratitude
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        What are you most grateful for this year?
      </p>
      <ListInput
        :items="modelValue.gratitude"
        @update:items="updateField('gratitude', $event)"
        placeholder="Add something you're grateful for..."
        :max-items="5"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowUturnLeftIcon } from '@heroicons/vue/24/outline'
import ListInput from './ListInput.vue'

export interface YearlyReflectionData {
  yearOverview: string
  whatWentWell: string[]
  challengesFaced: string[]
  lessonsLearned: string[]
  sourcesOfJoy: string[]
  gratitude: string[]
}

interface Props {
  modelValue: YearlyReflectionData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: YearlyReflectionData]
}>()

function updateField<K extends keyof YearlyReflectionData>(
  field: K,
  value: YearlyReflectionData[K]
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>
