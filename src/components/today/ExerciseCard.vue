<template>
  <article class="wellness-card neo-raised group flex flex-col p-3 transition-shadow duration-200">
    <!-- Header: title + add button (disabled-look) -->
    <div class="flex shrink-0 items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {{ t('planning.calendar.wellness.exercises') }}
      </span>
      <span
        class="wellness-add-btn grid place-items-center"
        :aria-hidden="true"
      >
        <AppIcon name="add" class="text-xs text-on-surface-variant/60" />
      </span>
    </div>

    <!-- Placeholder body -->
    <div class="flex flex-1 flex-col items-center justify-center gap-2 py-2 opacity-35">
      <div class="exercise-placeholder grid place-items-center">
        <AppIcon name="fitness_center" class="text-lg text-on-surface-variant/60" />
      </div>
      <span class="text-center text-[10px] leading-tight text-on-surface-variant/60">
        {{ t('planning.calendar.wellness.exercisesPlaceholder') }}
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
  border-radius: 1.5rem;
  user-select: none;
  aspect-ratio: 1;
}

.wellness-add-btn {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.8),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.33);
  opacity: 0.4;
}

.exercise-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.8),
    inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.33);
}
</style>
