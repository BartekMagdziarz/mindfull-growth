<template>
  <div class="next-ritual">
    <aside class="next-ritual__rail-stack">
      <section class="next-ritual__nav">
        <header>
          <button type="button" aria-label="Zamknij rytuał" @click="$emit('close')"><AppIcon name="arrow_back" /></button>
          <div><small>{{ eyebrow }}</small><h2>{{ periodTitle }}</h2></div>
          <span><AppIcon :name="mode === 'plan' ? 'edit_calendar' : 'rate_review'" /></span>
        </header>
        <div class="next-ritual__mode" aria-label="Typ rytuału">
          <span :class="{ active: mode === 'plan' }"><AppIcon name="edit_calendar" />Plan</span>
          <span :class="{ active: mode === 'reflect' }"><AppIcon name="rate_review" />Refleksja</span>
        </div>
      </section>

      <section class="next-ritual__path" :class="{ 'next-ritual__path--long': steps.length > 6 }" aria-label="Rozdziały rytuału">
        <header><span>Ścieżka</span><small>{{ current + 1 }}/{{ steps.length }}</small></header>
        <ol>
          <li v-for="(step, index) in steps" :key="step.id">
            <button type="button" :class="{ active: index === current, done: index < current }" :disabled="step.locked" @click="$emit('go-to', index)">
              <span class="next-ritual__step-dot"><i /></span>
              <span><strong>{{ step.label }}</strong><small>{{ step.short }}</small></span>
            </button>
          </li>
        </ol>
        <div class="next-ritual__glance">
          <span><AppIcon name="target" /><strong>{{ selectedCount }}</strong><small>{{ selectionLabel }}</small></span>
          <span><AppIcon :name="periodIcon" /><strong>{{ periodPulse }}</strong><small>{{ pulseLabel }}</small></span>
        </div>
        <p><AppIcon name="visibility" />Każdy rozdział pokazuje tylko potrzebny krok.</p>
      </section>
    </aside>

    <main class="next-ritual__stage">
      <header class="next-ritual__stage-header">
        <div><span>{{ activeStep.kicker }}</span><h1>{{ activeStep.question }}</h1><p>{{ activeStep.description }}</p></div>
        <span>{{ String(current + 1).padStart(2, '0') }}</span>
      </header>

      <div class="next-ritual__body"><slot /></div>

      <footer class="next-ritual__footer">
        <button type="button" class="next-ritual__back" :disabled="current === 0 || saving" @click="$emit('previous')"><AppIcon name="arrow_back" />Wstecz</button>
        <span class="next-ritual__progress"><i v-for="(_, index) in steps" :key="index" :class="{ active: index === current, done: index < current }" /></span>
        <small>{{ saving ? 'Zapisywanie…' : 'Autosave aktywny' }}</small>
        <button v-if="current === steps.length - 1 && alternateFinishLabel" type="button" class="next-ritual__alternate" :disabled="!canAdvance || saving" @click="$emit('alternate-finish')"><AppIcon name="event_repeat" />{{ alternateFinishLabel }}</button>
        <button v-if="current < steps.length - 1" type="button" class="next-ritual__next" :disabled="!canAdvance || saving" @click="$emit('next')">Dalej<AppIcon name="arrow_forward" /></button>
        <button v-else type="button" class="next-ritual__next" :disabled="!canAdvance || saving" @click="$emit('finish')"><AppIcon name="save" />{{ finishLabel }}</button>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

export interface NextRitualStep {
  id: string
  label: string
  short: string
  kicker: string
  question: string
  description: string
  locked?: boolean
}

const props = withDefaults(defineProps<{
  eyebrow: string
  periodTitle: string
  mode: 'plan' | 'reflect'
  steps: NextRitualStep[]
  current: number
  selectedCount?: number
  selectionLabel?: string
  periodPulse?: string
  pulseLabel?: string
  periodIcon?: string
  canAdvance?: boolean
  saving?: boolean
  finishLabel?: string
  alternateFinishLabel?: string
}>(), {
  selectedCount: 0,
  selectionLabel: 'wybrane',
  periodPulse: '—',
  pulseLabel: 'kontekst okresu',
  periodIcon: 'calendar_view_week',
  canAdvance: true,
  saving: false,
  finishLabel: 'Zapisz',
})

defineEmits<{ close: []; previous: []; next: []; finish: []; 'alternate-finish': []; 'go-to': [index: number] }>()

const activeStep = computed(() => props.steps[props.current] ?? props.steps[0])
</script>
