<template>
  <div class="min-h-screen flex flex-col">
    <AppTopAppBar />
    <main class="flex-1 overflow-y-auto pb-20">
      <router-view />
    </main>
    <AppBottomNav />
  </div>
</template>

<script setup lang="ts">
import AppTopAppBar from './AppTopAppBar.vue'
import AppBottomNav from './AppBottomNav.vue'
</script>

