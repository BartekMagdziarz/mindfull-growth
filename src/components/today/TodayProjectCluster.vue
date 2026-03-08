<template>
  <div v-if="projects.length > 0" class="flex flex-wrap items-center gap-2">
    <span
      v-for="project in projects"
      :key="project.id"
      :class="[
        'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
        project.isDone
          ? 'border-neu-border/25 bg-section/40 text-on-surface-variant opacity-70'
          : 'border-primary/15 bg-primary/10 text-on-surface',
      ]"
      :title="project.name"
    >
      <EntityIcon :icon="project.icon" size="xs" :circle="false" />
      <span :class="project.isDone ? 'line-through' : ''">{{ project.name }}</span>
      <CheckCircleIcon v-if="project.isDone" class="h-3.5 w-3.5 shrink-0 text-success" />
    </span>
  </div>

  <p v-else class="text-sm text-on-surface-variant">
    {{ t('today.priorityCompass.noProjects') }}
  </p>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/24/solid'
import EntityIcon from '@/components/planning/EntityIcon.vue'
import { useT } from '@/composables/useT'
import type { TodayProjectSignal } from '@/types/today'

const { t } = useT()

defineProps<{
  projects: TodayProjectSignal[]
}>()
</script>
