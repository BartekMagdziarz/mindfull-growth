<template>
  <div class="mg-design-v2 return-ritual-view">
    <ReturnRitual :manual="manual" @close="leave" @finished="handleFinished" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReturnRitual from '@/features/return-ritual/ReturnRitual.vue'

const route = useRoute()
const router = useRouter()
/** `/return?manual=1`: opened by hand, without the break threshold. */
const manual = computed(() => {
  const raw = route.query.manual
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === '1'
})

function leave(): void {
  void router.push({ name: 'today' })
}

/** „Start” keeps the user on the summary with its links; closing goes to Today. */
function handleFinished(): void {
  /* stay — the step shows Dzisiaj / Zaplanuj tydzień / Ułóżmy plan / Cofnij */
}
</script>
