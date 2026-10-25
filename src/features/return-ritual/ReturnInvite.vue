<template>
  <!-- Today's invitation after a break: one quiet card in the right column,
       a sentence and two actions. No counts of what piled up. -->
  <DsSurface
    v-if="brk"
    elevation="raised-sm"
    class="ndt-card return-invite"
    aria-label="Wracasz po przerwie"
    data-testid="return-invite"
  >
    <header>
      <span>Wracasz po przerwie</span>
    </header>
    <p class="return-invite__lead">{{ lead }}</p>
    <p class="ndt-empty">Uporządkujmy, co się nazbierało, i zacznijmy na nowo. Kilka minut.</p>
    <div class="return-invite__actions">
      <RouterLink
        :to="{ name: 'return-ritual' }"
        class="mg-v2-button mg-v2-button--primary"
        data-testid="return-invite-open"
      >
        Uporządkuj i zacznij
      </RouterLink>
      <button
        type="button"
        class="mg-v2-button mg-v2-button--quiet"
        :disabled="busy"
        data-testid="return-invite-later"
        @click="later"
      >
        Później
      </button>
    </div>
  </DsSurface>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DsSurface from '@/design-system/components/DsSurface.vue'
import { useReturnStore } from '@/stores/return.store'
import { formatDayShort } from '@/utils/periodLabels'
import { reportError } from '@/utils/reportError'
import { breakLengthLabel } from './useReturnRitual'

const store = useReturnStore()
const busy = ref(false)
const brk = computed(() => store.pending)

const lead = computed(() => {
  const current = brk.value
  if (!current) return ''
  const boundary = current.crossedYear
    ? ', po drodze początek roku'
    : current.crossedMonth
      ? ', po drodze początek miesiąca'
      : ''
  return `Bez zapisów od ${formatDayShort(current.lastSignalDay, 'pl-PL')} · ${breakLengthLabel(current.days, current.weeks.length)}${boundary}.`
})

async function later(): Promise<void> {
  busy.value = true
  try {
    await store.dismiss()
  } catch (error) {
    reportError('ReturnInvite.later', error)
  } finally {
    busy.value = false
  }
}
</script>

<style src="./return-ritual.css"></style>
