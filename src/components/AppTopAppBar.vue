<template>
  <header class="sticky top-0 z-50 bg-nav backdrop-blur border-b border-outline/30 shadow-elevation-1">
    <div class="container mx-auto px-4">
      <div class="flex items-center gap-8 py-2">
        <!-- Left: Back button (when shown) and title -->
        <div class="flex items-center gap-3">
          <button
            v-if="showBack"
            @click="handleBackClick"
            class="p-2 rounded-xl text-on-surface hover:bg-section active:bg-section transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Go back"
          >
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <h1 class="text-lg font-semibold text-on-surface">Mindful Growth</h1>
        </div>

        <!-- Right: Navigation tabs -->
        <nav v-if="!hideNav" class="flex items-center gap-2">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-medium transition-colors duration-200',
              isActive(item.path)
                ? 'text-primary-strong bg-section-strong shadow-elevation-1'
                : 'text-on-surface-variant hover:bg-section',
            ]"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <!-- Actions slot (if provided) -->
        <div v-if="$slots.actions" class="flex gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/today', label: 'Today' },
  { path: '/journal', label: 'Journal' },
  { path: '/journey', label: 'Journey' },
  { path: '/emotions', label: 'Emotions' },
  { path: '/history', label: 'History' },
  { path: '/profile', label: 'Profile' },
]

interface Props {
  showBack?: boolean
  backRoute?: string
  hideNav?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  backRoute: undefined,
  hideNav: false,
})

const emit = defineEmits<{
  back: []
}>()

const router = useRouter()
const route = useRoute()

const isActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(path + '/')
}

const handleBackClick = () => {
  if (props.backRoute) {
    router.push(props.backRoute)
  } else {
    emit('back')
  }
}
</script>
