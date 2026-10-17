<template>
  <!-- Disc: a quiet "?" that opens a note beside the question; the layout never moves. -->
  <div v-if="text && variant === 'disc'" ref="discRoot" class="exercise-step-why exercise-step-why--disc">
    <button
      type="button"
      class="exercise-step-why__disc"
      :aria-expanded="open"
      :aria-label="t('exerciseWizards.shared.whyLabel')"
      :title="t('exerciseWizards.shared.whyLabel')"
      @click="open = !open"
      @keydown.escape.prevent="open = false"
    >
      <AppIcon name="help" class="exercise-step-why__icon" />
    </button>
    <p v-if="open" role="note" class="exercise-step-why__note" data-testid="step-why-note">{{ text }}</p>
  </div>
  <details v-else-if="text" class="exercise-step-why">
    <summary>
      <AppIcon name="help" class="exercise-step-why__icon" />
      {{ t('exerciseWizards.shared.whyLabel') }}
    </summary>
    <p>{{ text }}</p>
  </details>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

/**
 * The "why" of an exercise step, folded by default. The step's
 * description says what to do; this says why it helps — for those who
 * want it, without lengthening every step.
 *
 * `details` (default): a folded line in the content flow (bespoke wizards).
 * `disc`: a round "?" in the question row with a floating note, so the
 * answer never shifts (micro runner).
 */
const props = withDefaults(defineProps<{ text?: string; variant?: 'details' | 'disc' }>(), {
  text: '',
  variant: 'details',
})

const { t } = useT()
const open = ref(false)
const discRoot = ref<HTMLElement | null>(null)

// A new step (new text) starts folded again.
watch(
  () => props.text,
  () => {
    open.value = false
  },
)

// Click outside closes the note; the click still reaches what was under it.
function onPointerDown(event: PointerEvent): void {
  if (!open.value) return
  const root = discRoot.value
  if (root && event.target instanceof Node && !root.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<style scoped>
.exercise-step-why > summary {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-1);
  list-style: none;
  cursor: pointer;
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
  border-radius: var(--mg-radius-pill);
}

.exercise-step-why > summary::-webkit-details-marker {
  display: none;
}

.exercise-step-why > summary:hover,
.exercise-step-why[open] > summary {
  color: var(--mg-color-primary-strong);
}

.exercise-step-why > summary:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

.exercise-step-why__icon {
  font-size: 1rem;
}

.exercise-step-why > p {
  margin-top: var(--mg-space-2);
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-mist);
  font-size: var(--mg-font-size-sm);
  line-height: 1.55;
  color: var(--mg-color-muted);
}

/* ── disc ── */
.exercise-step-why--disc {
  position: relative;
  display: inline-grid;
}

.exercise-step-why__disc {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid var(--mg-color-border);
  border-radius: 50%;
  background: var(--mg-color-mist);
  color: var(--mg-color-muted);
  cursor: pointer;
  transition:
    background var(--mg-duration-fast) ease,
    color var(--mg-duration-fast) ease;
}

.exercise-step-why__disc:hover {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}

.exercise-step-why__disc[aria-expanded='true'] {
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
}

.exercise-step-why__disc:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

/* The note floats under the disc, flush with its right edge: a lighter cloud over the card. */
.exercise-step-why__note {
  position: absolute;
  top: calc(100% + var(--mg-space-2));
  right: 0;
  z-index: 5;
  width: 20rem;
  max-width: 70vw;
  margin: 0;
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  line-height: 1.55;
  text-align: left;
}
</style>
