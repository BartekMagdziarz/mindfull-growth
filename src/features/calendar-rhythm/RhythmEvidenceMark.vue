<template>
  <i class="ev-mark" :class="`ev-mark--${presence}`" :aria-label="label" :title="label" role="img" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { presenceLabel, type Presence } from './rhythmProjections'

const props = defineProps<{ presence: Presence; label?: string }>()
const label = computed(() => props.label ?? presenceLabel(props.presence))
</script>

<style scoped>
.ev-mark { display: inline-block; flex: none; box-sizing: border-box; }
.ev-mark--recorded { width: 13px; height: 13px; border-radius: 999px; background: var(--cp-mark); }
.ev-mark--planned-only { width: 13px; height: 13px; border-radius: 999px; border: 2px solid var(--cp-accent-strong); }
.ev-mark--empty { width: 14px; height: 2px; border-radius: 1px; background: var(--cp-muted-line); }
</style>
