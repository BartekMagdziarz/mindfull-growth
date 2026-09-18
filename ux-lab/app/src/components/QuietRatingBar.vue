<template>
  <article class="qr-axis" :class="{ 'qr-axis--effort': effort }">
    <header>
      <h2>{{ label }}</h2>
      <details v-if="hint" class="qr-help">
        <summary :aria-label="`Co oznacza ${label}?`">?</summary>
        <p>{{ hint }}</p>
      </details>
    </header>
    <div class="qr-bar-body">
      <div class="qr-bar-ends" aria-hidden="true">
        <span>{{ effort ? 'Duży' : 'Bardzo dobry' }}</span
        ><span>{{ effort ? 'Niewielki' : 'Bardzo słaby' }}</span>
      </div>
      <div class="qr-bar-stack">
        <button
          class="qr-icon qr-bar-step"
          :aria-label="`Zwiększ: ${label}`"
          :disabled="modelValue === 5"
          @click="step(1)"
        >
          <AppIcon name="add" />
        </button>
        <div
          class="qr-scale qr-scale--vertical"
          role="group"
          :aria-label="label"
          tabindex="0"
          @keydown.up.prevent="step(1)"
          @keydown.right.prevent="step(1)"
          @keydown.down.prevent="step(-1)"
          @keydown.left.prevent="step(-1)"
        >
          <button
            v-for="n in 5"
            :key="n"
            :aria-label="`${label}: ${n} z 5`"
            :aria-pressed="modelValue === n"
            :class="{
              filled: (modelValue ?? 0) >= n,
              ghost: modelValue == null && !touched && (previous ?? 0) >= n,
            }"
            :title="
              modelValue == null && !touched && previous
                ? `Poprzedni miesiąc: ${previous}`
                : `${n} z 5`
            "
            @click="emit('update:modelValue', modelValue === n ? null : n)"
          />
        </div>
        <button
          class="qr-icon qr-bar-step"
          :aria-label="`Zmniejsz: ${label}`"
          :disabled="!modelValue"
          @click="step(-1)"
        >
          <AppIcon name="remove" />
        </button>
      </div>
      <output :aria-label="`${label}: ${modelValue ?? 'bez oceny'}`">{{
        modelValue ?? '—'
      }}</output>
    </div>
  </article>
</template>
<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'
const props = defineProps<{
  modelValue: number | null
  label: string
  hint?: string
  effort?: boolean
  previous?: number | null
  touched?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()
function step(delta: number) {
  emit('update:modelValue', Math.max(0, Math.min(5, (props.modelValue ?? 0) + delta)) || null)
}
</script>
<style scoped src="../experiments/quietWeeklyRitual.css"></style>
<style scoped>
.qr-axis {
  padding: 20px 14px;
  min-width: 0;
}
.qr-axis header {
  justify-content: space-between;
  gap: 8px;
}
.qr-axis h2 {
  font-size: 18px;
}
.qr-bar-body {
  display: flex;
  justify-content: center;
  position: relative;
  gap: 12px;
}
.qr-bar-body > output {
  width: 28px;
  font-size: 24px;
}
.qr-bar-ends {
  position: absolute;
  left: 0;
  inset-block: 0;
  pointer-events: none;
  font-size: 9px;
  padding: 48px 0;
}
.qr-bar-stack {
  margin-left: 10px;
}
.qr-scale--vertical button {
  width: 64px;
}
</style>
