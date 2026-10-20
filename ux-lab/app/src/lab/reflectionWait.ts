import { computed, onScopeDispose, ref } from 'vue'

export const waitSamples = {
  short: { label: 'Krótka odpowiedź', seconds: 6, stages: [
    { at: 0, label: 'Przygotowuję odpowiedź…', note: 'Przyjrzę się temu uważnie.' },
  ] },
  thoughtful: { label: 'Uważna odpowiedź', seconds: 18, stages: [
    { at: 0, label: 'Przygotowuję odpowiedź…', note: 'Przyjrzę się temu uważnie.' },
    { at: 3, label: 'Szukam wcześniejszego kontekstu…', note: 'Przyjrzę się temu uważnie.' },
    { at: 8, label: 'Czytam wybrane refleksje…', note: 'Przyjrzę się temu uważnie.' },
    { at: 13, label: 'Przygotowuję odpowiedź…', note: 'Uwzględnię też wcześniejsze zapisy.' },
  ] },
  research: { label: 'Dłuższy przegląd', seconds: 36, stages: [
    { at: 0, label: 'Przygotowuję odpowiedź…', note: 'Przyjrzę się temu uważnie.' },
    { at: 3, label: 'Szukam wcześniejszego kontekstu…', note: 'Przyjrzę się temu uważnie.' },
    { at: 9, label: 'Czytam wybrane refleksje…', note: 'Przyjrzę się temu uważnie.' },
    { at: 17, label: 'Sprawdzam wcześniejsze zapisy…', note: 'Sprawdzę także szerszy kontekst.' },
    { at: 26, label: 'Przygotowuję odpowiedź…', note: 'Zbieram to w jedną odpowiedź.' },
  ] },
} as const
export type WaitSample = keyof typeof waitSamples
export type WaitState = 'idle' | 'working' | 'done' | 'cancelled' | 'error'

/** A local scripted event fixture. No AI calls, personal history or persistence. */
export function useReflectionWait() {
  const sample = ref<WaitSample>('thoughtful')
  const state = ref<WaitState>('idle')
  const elapsed = ref(0)
  const paused = ref(false)
  const intro = ref<'typing' | 'instant'>('typing')
  let timer: ReturnType<typeof setInterval> | undefined
  let lastTick = 0
  let activeMilliseconds = 0
  const stages = computed(() => waitSamples[sample.value].stages)
  const stage = computed(() => [...stages.value].reverse().find(s => elapsed.value >= s.at) ?? stages.value[0])
  const busy = computed(() => state.value === 'working')
  const typing = computed(() => busy.value && intro.value === 'typing' && elapsed.value < 1.5)
  function stopTimer() { clearInterval(timer); timer = undefined }
  function complete() { stopTimer(); paused.value = false; state.value = 'done' }
  function start() {
    stopTimer()
    elapsed.value = 0
    activeMilliseconds = 0
    paused.value = false
    state.value = 'working'
    lastTick = Date.now()
    timer = setInterval(() => {
      const now = Date.now()
      if (!paused.value) {
        activeMilliseconds += now - lastTick
        elapsed.value = activeMilliseconds / 1000
      }
      lastTick = now
      if (elapsed.value >= waitSamples[sample.value].seconds) complete()
    }, 100)
  }
  function togglePause() { lastTick = Date.now(); paused.value = !paused.value }
  function finishWith(next: 'idle' | 'cancelled' | 'error') {
    stopTimer(); paused.value = false; state.value = next
    if (next === 'idle') elapsed.value = 0
  }
  onScopeDispose(stopTimer)
  return { sample, state, elapsed, paused, intro, typing, stage, busy, start, complete, togglePause, finishWith }
}
