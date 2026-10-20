<template>
  <AppShell />
  <component :is="DemoBanner" v-if="DemoBanner" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
const DemoBanner =
  import.meta.env.DEV && import.meta.env.MODE === 'ai-demo'
    ? defineAsyncComponent(() => import('./dev/ai-companion/CompanionDemoBanner.vue'))
    : null
import AppShell from './components/AppShell.vue'
</script>
