<template>
  <div v-if="route.path !== '/ai-demo'" class="demo-banner">
    <RouterLink to="/ai-demo">Demo AI · {{ name }} · wybór osoby i limit kosztu</RouterLink>
  </div>
</template>
<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { selectedPersona } from './demoEnvironment'
import { buildCompanionScenario } from './scenarios'
const route = useRoute()
const name = buildCompanionScenario(selectedPersona()).displayName
</script>
<style scoped>
.demo-banner {
  position: fixed;
  z-index: 100;
  bottom: 8px;
  left: 110px;
  max-width: calc(100vw - 125px);
  padding: 6px 12px;
  border-radius: 12px;
  background: #fff;
  color: #23456c;
  border: 1px solid #88aacc;
  font-size: 12px;
}
.demo-banner a {
  text-decoration: underline;
}
</style>
