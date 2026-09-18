<template>
  <span class="focus-icons" :aria-label="label" :title="label" role="img">
    <template v-if="priorities.length">
      <AppIcon v-for="priority in priorities" :key="priority.key" :name="priority.icon" />
    </template>
    <i v-else class="focus-icons__dash" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { ScenarioPriority } from '~lab/lab/calendarPriorityScenario'

const props = defineProps<{ priorities: ScenarioPriority[]; context: string }>()
const label = computed(() => props.priorities.length
  ? `${props.context}: fokus ${props.priorities.map(p => p.title).join(', ')}`
  : `${props.context}: brak planu okresu`)
</script>

<style scoped>
.focus-icons { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 18px; color: rgb(var(--sky-700)); }
.focus-icons .material-symbols-outlined { font-size: 18px; }
.focus-icons__dash { display: inline-block; width: 14px; height: 2px; border-radius: 1px; background: rgb(var(--neo-muted) / .7); }
</style>
