<template>
  <div class="flex items-center justify-center gap-3">
    <div v-for="(label, idx) in labels" :key="label" class="flex flex-col items-center gap-1">
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        :class="
          idx < currentIndex
            ? 'bg-primary/20 text-primary'
            : idx === currentIndex
              ? 'tsibp-dot--current'
              : 'mg-v2-block text-on-surface-variant/40'
        "
      >
        {{ label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'

const { tList } = useT()

defineProps<{
  currentIndex: number
}>()

const labels = computed(() => tList('exerciseWizards.shared.ifs.tsibp.labels'))
</script>

<style scoped>
/* The current phase: the stepper's ink blob with a paper halo, slightly turned. */
.tsibp-dot--current {
  border: 0;
  border-radius: var(--mg-radius-organic-a);
  color: var(--mg-color-on-primary);
  background: var(--mg-color-ink);
  box-shadow: var(--mg-shadow-stepper-halo);
  transform: rotate(-2deg);
}
</style>
