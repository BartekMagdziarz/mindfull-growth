<template>
  <div class="quiet-ritual mg-design-v2" :class="{ 'quiet-ritual--week-review': wide && scale === 'week', 'qm--wide': wide && scale === 'month', qm: scale === 'month' }">
    <header class="qr-top">
      <button type="button" class="qr-icon" aria-label="Zamknij rytuał" @click="emit('close')">
        <AppIcon name="close" />
      </button>
      <span>{{ eyebrow }} <b>·</b> {{ periodTitle }}</span>
      <span class="qr-save" role="status">
        <AppIcon :name="saving ? 'sync' : 'check'" />{{ statusLabel }}
      </span>
    </header>

    <main class="qr-card">
      <header class="qr-heading">
        <h1 ref="headingRef" tabindex="-1">{{ activeStep.question }}</h1>
        <span v-if="count" class="qr-count">{{ count }}</span>
      </header>

      <slot />

      <footer class="qr-footer">
        <button
          type="button"
          class="qr-icon qr-arrow"
          aria-label="Poprzedni krok"
          :disabled="current === 0"
          @click="emit('go', current - 1)"
        >
          <AppIcon name="arrow_back" />
        </button>
        <nav aria-label="Etapy rytuału">
          <div class="qr-progress">
            <button
              v-for="(step, index) in steps"
              :key="step.id"
              type="button"
              :class="{ active: current === index }"
              :aria-current="current === index ? 'step' : undefined"
              :aria-label="`${index + 1}. ${step.label}`"
              :title="step.label"
              @click="emit('go', index)"
            >
              <i />
            </button>
          </div>
          <span>{{ current + 1 }}/{{ steps.length }} · {{ activeStep.label }}</span>
        </nav>
        <button
          v-if="current < steps.length - 1"
          type="button"
          class="qr-icon qr-arrow qr-arrow--next"
          aria-label="Następny krok"
          @click="emit('go', current + 1)"
        >
          <AppIcon name="arrow_forward" />
        </button>
        <div v-else class="qr-finish">
          <button v-if="alternateLabel" type="button" class="qr-quiet" :disabled="saving" @click="emit('alternate')">
            {{ alternateLabel }}
          </button>
          <button type="button" class="qr-primary" :disabled="saving" @click="emit('finish')">
            <AppIcon :name="finished ? 'check' : 'done_all'" />{{ finished ? finishedLabel : finishLabel }}
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script lang="ts">
export interface QuietRitualStep {
  id: string
  /** Footer dot label. */
  label: string
  /** The single question that heads the step. */
  question: string
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    scale: 'week' | 'month'
    eyebrow: string
    periodTitle: string
    steps: QuietRitualStep[]
    current: number
    /** Optional counter shown next to the question (e.g. "3 wybrane"). */
    count?: string
    /** Steps that need the full canvas (plan review, journal) widen the card. */
    wide?: boolean
    saving?: boolean
    /** Everything the ritual writes is already persisted. */
    finished?: boolean
    finishLabel?: string
    finishedLabel?: string
    alternateLabel?: string
  }>(),
  { count: '', wide: false, saving: false, finished: false, finishLabel: 'Zapisz', finishedLabel: 'Zapisano' },
)

const emit = defineEmits<{ close: []; go: [index: number]; finish: []; alternate: [] }>()

const headingRef = ref<HTMLElement | null>(null)
const activeStep = computed(() => props.steps[props.current] ?? props.steps[0])
const statusLabel = computed(() => (props.saving ? 'Zapisuję…' : props.finished ? 'Zapisano' : 'Zapis na bieżąco'))

// Moving between steps puts focus on the new question, so keyboard and screen
// reader users land on the one thing the step asks.
watch(
  () => props.current,
  async () => {
    await nextTick()
    headingRef.value?.focus({ preventScroll: true })
    headingRef.value?.scrollIntoView?.({ block: 'nearest' })
  },
)
</script>

<style src="./quiet-ritual.css"></style>
