<template>
  <nav class="bg-nav backdrop-blur border-t border-outline/30 shadow-elevation-1">
    <div class="container mx-auto">
      <div class="flex justify-around items-center py-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors duration-200',
            isActive(item.path)
              ? 'text-primary-strong bg-section-strong shadow-elevation-1'
              : 'text-on-surface-variant hover:bg-section',
          ]"
        >
          <span class="text-xs font-medium">{{ item.label }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/today', label: 'Today' },
  { path: '/journal', label: 'Journal' },
  { path: '/emotions', label: 'Emotions' },
  { path: '/exercises', label: 'Exercises' },
  { path: '/profile', label: 'Profile' },
]

const route = useRoute()

const isActive = (path: string): boolean => {
  return route.path === path
}
</script>
