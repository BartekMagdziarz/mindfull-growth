<template>
  <div class="flex items-center justify-center gap-3">
    <div
      v-for="(label, idx) in labels"
      :key="label"
      class="flex flex-col items-center gap-1"
    >
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        :class="idx < currentIndex
          ? 'bg-primary/20 text-primary'
          : idx === currentIndex
            ? 'neo-step-active bg-primary text-white'
            : 'neo-surface shadow-neu-pressed text-on-surface-variant/40'"
      >
        {{ label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'

const { t } = useT()

defineProps<{
  currentIndex: number
}>()

const labels = computed(() => t('exerciseWizards.shared.ifs.tsibp.labels'))
</script>
