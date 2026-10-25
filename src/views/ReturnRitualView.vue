<template>
  <div class="mg-design-v2 return-ritual-view">
    <ReturnRitual @close="leave" @finished="handleFinished" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ReturnRitual from '@/features/return-ritual/ReturnRitual.vue'

const router = useRouter()

function leave(): void {
  void router.push({ name: 'today' })
}

/** „Start” keeps the user on the summary with its links; closing goes to Today. */
function handleFinished(): void {
  /* stay — the step shows Dzisiaj / Zaplanuj tydzień / Ułóżmy plan / Cofnij */
}
</script>
