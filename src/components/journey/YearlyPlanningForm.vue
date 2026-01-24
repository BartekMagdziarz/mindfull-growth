<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
        <ArrowTrendingUpIcon class="w-4 h-4 text-purple-600" />
      </div>
      <h2 class="text-lg font-semibold text-on-surface">Looking Forward</h2>
    </div>

    <!-- Theme / Word for the Year -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Theme / Word for the Year
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        One word or phrase to guide the year
      </p>
      <input
        :value="modelValue.theme"
        @input="updateField('theme', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="e.g., Growth, Balance, Courage..."
        class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus"
      />
    </section>

    <!-- Vision of Self -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Vision of Self
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        Who do you want to become? How do you want to feel?
      </p>
      <textarea
        :value="modelValue.vision"
        @input="updateField('vision', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Describe your ideal self at the end of this year..."
        rows="4"
        class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
      />
    </section>

    <!-- High-Level Goals -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        High-Level Goals
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        3-5 major goals for the year (these can become cascading goals)
      </p>
      <ListInput
        :items="modelValue.highLevelGoals"
        @update:items="updateField('highLevelGoals', $event)"
        placeholder="Add a yearly goal..."
        :max-items="5"
      />
      <p v-if="modelValue.highLevelGoals.length > 0" class="text-xs text-on-surface-variant mt-2">
        Tip: After saving, you can cascade these goals into quarterly priorities
      </p>
    </section>

    <!-- Areas of Focus -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Areas of Focus
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        What life areas need attention? (health, relationships, career, finances, etc.)
      </p>
      <ListInput
        :items="modelValue.areasOfFocus"
        @update:items="updateField('areasOfFocus', $event)"
        placeholder="Add an area of focus..."
        :max-items="6"
      />
    </section>

    <!-- Flexible Intentions -->
    <section>
      <label class="block text-sm font-medium text-on-surface mb-2">
        Flexible Intentions
      </label>
      <p class="text-sm text-on-surface-variant mb-3">
        Plans you're open to adjusting as life unfolds
      </p>
      <textarea
        :value="modelValue.flexibleIntentions"
        @input="updateField('flexibleIntentions', ($event.target as HTMLTextAreaElement).value)"
        placeholder="What would you like to explore or try, knowing plans may change?"
        rows="4"
        class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowTrendingUpIcon } from '@heroicons/vue/24/outline'
import ListInput from './ListInput.vue'

export interface YearlyPlanningData {
  theme: string
  vision: string
  highLevelGoals: string[]
  areasOfFocus: string[]
  flexibleIntentions: string
}

interface Props {
  modelValue: YearlyPlanningData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: YearlyPlanningData]
}>()

function updateField<K extends keyof YearlyPlanningData>(
  field: K,
  value: YearlyPlanningData[K]
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>
