<template>
  <header class="sticky top-0 z-50 bg-nav backdrop-blur border-b border-neu-border/30 shadow-neu-flat">
    <div class="container mx-auto px-4">
      <div class="flex items-center gap-8 py-2">
        <!-- Left: Back button (when shown) and title -->
        <div class="flex items-center gap-3">
          <button
            v-if="showBack"
            @click="handleBackClick"
            class="neo-back-btn p-2 text-neu-text neo-focus"
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
              'px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200',
              isActive(item.path)
                ? 'text-neu-text shadow-neu-raised-sm bg-neu-top'
                : 'text-on-surface-variant hover:bg-neu-base',
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
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

interface NavItem {
  path: string
  label: string
}

const { t } = useT()

const navItems = computed<NavItem[]>(() => [
  { path: '/today', label: t('common.nav.today') },
  { path: '/planning', label: t('common.nav.planning') },
  { path: '/journal', label: t('common.nav.journal') },
  { path: '/emotions', label: t('common.nav.emotions') },
  { path: '/history', label: t('common.nav.history') },
  { path: '/exercises', label: t('common.nav.exercises') },
  { path: '/areas', label: t('common.nav.lifeAreas') },
  { path: '/profile', label: t('common.nav.profile') },
])

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
