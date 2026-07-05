<template>
  <div class="flex flex-col items-center gap-4">
    <div class="relative w-32 h-32">
      <svg class="w-32 h-32" viewBox="0 0 128 128">
        <rect x="14" y="14" width="100" height="100" rx="8" fill="none"
          stroke="currentColor" class="text-neu-border/20" stroke-width="3" />
        <rect x="14" y="14" width="100" height="100" rx="8" fill="none"
          stroke="currentColor" class="text-primary" stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="PERIMETER"
          :stroke-dashoffset="offset"
          style="transition: stroke-dashoffset 1s linear"
        />
      </svg>
      <span class="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary">
        {{ label }}
      </span>
    </div>
    <p class="text-sm text-on-surface-variant">{{ phaseText }}</p>
    <AppButton v-if="!active && !done" variant="tonal" @click="start()">
      {{ t('exerciseWizards.micro.shared.breath.start') }}
    </AppButton>
    <p v-if="done" class="text-sm text-primary font-medium">
      {{ t('exerciseWizards.micro.shared.breath.complete') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'

const props = defineProps<{
  /** Seconds per phase: inhale / hold / exhale / hold. */
  phaseSeconds: [number, number, number, number]
  totalSeconds: number
}>()

const emit = defineEmits<{
  /** Fires every elapsed second — the runner gates on progress. */
  progress: [elapsedSeconds: number]
  done: [completedSeconds: number]
}>()

const { t, tg } = useT()

const PERIMETER = 400

const active = ref(false)
const done = ref(false)
const label = ref(tg('exerciseWizards.micro.shared.breath.ready'))
const phaseText = ref(t('exerciseWizards.micro.shared.breath.tapToBegin'))
const offset = ref(PERIMETER)
let timer: ReturnType<typeof setTimeout> | null = null

function start() {
  active.value = true
  let elapsed = 0
  const [inhale, holdIn, exhale, holdOut] = props.phaseSeconds
  const cycleLength = inhale + holdIn + exhale + holdOut

  function tick() {
    if (elapsed >= props.totalSeconds) {
      active.value = false
      done.value = true
      label.value = t('exerciseWizards.micro.shared.breath.done')
      phaseText.value = t('exerciseWizards.micro.shared.breath.complete')
      offset.value = 0
      emit('done', props.totalSeconds)
      return
    }

    const phase = elapsed % cycleLength
    if (phase < inhale) {
      label.value = `${inhale - phase}`
      phaseText.value = t('exerciseWizards.micro.shared.breath.breatheIn')
    } else if (phase < inhale + holdIn) {
      label.value = `${inhale + holdIn - phase}`
      phaseText.value = t('exerciseWizards.micro.shared.breath.hold')
    } else if (phase < inhale + holdIn + exhale) {
      label.value = `${inhale + holdIn + exhale - phase}`
      phaseText.value = t('exerciseWizards.micro.shared.breath.breatheOut')
    } else {
      label.value = `${cycleLength - phase}`
      phaseText.value = t('exerciseWizards.micro.shared.breath.hold')
    }

    offset.value = PERIMETER * (1 - elapsed / props.totalSeconds)
    elapsed++
    emit('progress', elapsed)
    timer = setTimeout(tick, 1000)
  }

  tick()
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>
