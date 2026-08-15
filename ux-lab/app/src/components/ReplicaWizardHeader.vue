<template>
  <header class="replica-wizard-header">
    <div class="replica-wizard-header__title">
      <span class="replica-eyebrow">{{ eyebrow }}</span>
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
    </div>
    <ol class="replica-stepper" aria-label="Kroki rytuału">
      <li v-for="(step, index) in steps" :key="step" :class="{ active: index === current, complete: index < current, locked: locked.includes(index) }">
        <button type="button" :disabled="locked.includes(index)" @click="$emit('select', index)">
          <span>
            <AppIcon v-if="locked.includes(index)" name="lock" />
            <AppIcon v-else-if="index < current" name="check" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <small>{{ step }}</small>
        </button>
      </li>
    </ol>
  </header>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
defineProps<{ title: string; subtitle: string; eyebrow: string; steps: string[]; current: number; locked: number[] }>()
defineEmits<{ select: [index: number] }>()
</script>
