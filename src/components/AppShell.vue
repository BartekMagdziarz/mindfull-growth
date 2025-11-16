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

const isJournalEditorRoute = computed(() => {
  return (
    route.path === '/journal/edit' ||
    route.path.match(/^\/journal\/[^/]+\/edit$/)
  )
})

const isEmotionEditorRoute = computed(() => {
  return (
    route.path === '/emotions/edit' ||
    route.path.match(/^\/emotions\/[^/]+\/edit$/)
  )
})

const showBackButton = computed(() => {
  return isJournalEditorRoute.value || isEmotionEditorRoute.value
})

const backRoute = computed(() => {
  if (isJournalEditorRoute.value) {
    return '/journal'
  }

  if (isEmotionEditorRoute.value) {
    return '/emotions'
  }

  return undefined
})
</script>

