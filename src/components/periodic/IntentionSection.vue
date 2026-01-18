<template>
  <AppCard padding="lg" class="space-y-4">
    <!-- Reflection Mode: Show previous intention with reflection prompt -->
    <template v-if="mode === 'reflection' && previousIntention">
      <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
        <ArrowPathIcon class="w-5 h-5 text-primary" />
        Previous Intention
      </h2>

      <div class="p-4 rounded-xl bg-section border border-outline/30">
        <p class="text-on-surface italic">
          "{{ previousIntention }}"
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-on-surface-variant">
          How did it go?
        </label>
        <textarea
          :value="reflection"
          class="w-full min-h-[100px] p-4 rounded-xl border border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
          @input="$emit('update:reflection', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </template>

    <!-- Set Mode: Set new intention -->
    <template v-if="mode === 'set'">
      <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
        <FlagIcon class="w-5 h-5 text-primary" />
        Intention for {{ periodLabel }}
      </h2>

      <p class="text-sm text-on-surface-variant">
        What do you want to focus on or be mindful of?
      </p>

      <textarea
        :value="intention"
        class="w-full min-h-[80px] p-4 rounded-xl border border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
        @input="$emit('update:intention', ($event.target as HTMLTextAreaElement).value)"
      />
    </template>
  </AppCard>
</template>

<script setup lang="ts">
import { ArrowPathIcon, FlagIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'

defineProps<{
  mode: 'reflection' | 'set'
  // Reflection mode props
  previousIntention?: string
  reflection?: string
  // Set mode props
  intention?: string
  periodLabel?: string
}>()

defineEmits<{
  'update:reflection': [value: string]
  'update:intention': [value: string]
}>()
</script>
