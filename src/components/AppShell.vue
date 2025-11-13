<template>
  <div class="min-h-screen flex flex-col">
    <AppTopAppBar :show-back="showBackButton" :back-route="backRoute" />
    <main class="flex-1 overflow-y-auto pb-20">
      <router-view />
    </main>
    <AppBottomNav />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppTopAppBar from './AppTopAppBar.vue'
import AppBottomNav from './AppBottomNav.vue'

const route = useRoute()

const showBackButton = computed(() => {
  return route.path === '/journal/new'
})

const backRoute = computed(() => {
  return showBackButton.value ? '/journal' : undefined
})
</script>

