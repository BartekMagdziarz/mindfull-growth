<template>
  <button
    type="button"
    class="vms-value"
    :data-card="card.id"
    :aria-pressed="selected"
    draggable="true"
    @click="$emit('pick', $event)"
    @dragstart="$emit('lift', $event)"
    @dragend="$emit('release')"
  >
    <span v-if="showGrip" class="vms-grip" aria-hidden="true">⠿</span>
    <span>{{ card.label }}</span>
  </button>
</template>

<script setup lang="ts">
import type { ValueCard } from '~lab/lab/valueMapSort'

defineProps<{ card: ValueCard; selected: boolean; showGrip?: boolean }>()
defineEmits<{ pick: [MouseEvent]; lift: [DragEvent]; release: [] }>()
</script>
