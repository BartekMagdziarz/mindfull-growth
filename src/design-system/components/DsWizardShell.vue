<template>
  <section class="mg-v2-wizard-shell">
    <nav v-if="steps.length" class="mg-v2-wizard-shell__chapters" aria-label="Rozdziały">
      <header>
        <span>Ścieżka</span><small>{{ current + 1 }}/{{ steps.length }}</small>
      </header>
      <ol>
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          :class="{ active: index === current, done: index < current }"
          :aria-current="index === current ? 'step' : undefined"
        >
          <span class="mg-v2-wizard-shell__chapter">
            <DsProgressMarker :done="index < current" :value="index + 1" :label="step.label" />
            <span v-if="index === current" class="mg-v2-wizard-shell__chapter-copy">
              <strong>{{ step.label }}</strong>
              <small v-if="step.description">{{ step.description }}</small>
            </span>
          </span>
          <span
            v-if="index < steps.length - 1"
            class="mg-v2-wizard-shell__chapter-line"
            aria-hidden="true"
          />
        </li>
      </ol>
      <slot name="rail-footer" />
    </nav>
    <div class="mg-v2-wizard-shell__stage">
      <header class="mg-v2-wizard-shell__header">
        <div>
          <span v-if="eyebrow">{{ eyebrow }}</span>
          <h1>{{ title }}</h1>
          <p v-if="description">{{ description }}</p>
        </div>
        <slot name="header-actions" />
      </header>
      <div class="mg-v2-wizard-shell__body"><slot /></div>
      <footer v-if="$slots.footer" class="mg-v2-wizard-shell__footer">
        <slot name="footer" />
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import DsProgressMarker from './DsProgressMarker.vue'

withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
    current?: number
    steps?: Array<{ id: string; label: string; description?: string }>
  }>(),
  {
    eyebrow: '',
    description: '',
    current: 0,
    steps: () => [],
  }
)
</script>
