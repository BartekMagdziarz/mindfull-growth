<template>
  <article class="wellness-card neo-raised group flex flex-col gap-2 p-3 transition-shadow duration-200" style="opacity: 0.6">
    <!-- Header: title only (placeholder) -->
    <div class="flex shrink-0 items-center justify-between">
      <span class="text-[11px] font-semibold uppercase tracking-[0.10em] text-on-surface-variant">
        {{ t('planning.today.wellness.exercises') }}
      </span>
    </div>

    <!-- Placeholder body -->
    <div class="flex flex-col items-center justify-center gap-2 py-2">
      <AppIcon name="spa" class="text-[30px] text-on-surface-variant/55" />
      <span class="text-[11px] tracking-[0.04em] text-on-surface-variant/70">
        {{ t('planning.today.wellness.exercisesComing') }}
      </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
</script>

<style scoped>
.wellness-card {
  border-radius: 1.4rem;
  user-select: none;
}
</style>
