<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ title }}</h1>
        <p class="text-sm text-on-surface-variant">{{ subtitle }}</p>
      </div>
    </div>

    <AppCard padding="lg" class="space-y-4">
      <div class="flex items-center gap-3">
        <div :class="['p-3 rounded-full', iconBgClass]">
          <component :is="icon" :class="['w-6 h-6', iconClass]" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.comingSoon.title') }}</h2>
          <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.comingSoon.description') }}</p>
        </div>
      </div>

      <div class="neo-surface p-4 rounded-xl space-y-2">
        <p class="text-sm text-on-surface font-medium">{{ t('exerciseWizards.comingSoon.includesHeading') }}</p>
        <p class="text-sm text-on-surface-variant">{{ description }}</p>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import type { Component } from 'vue'

const { t } = useT()

defineProps<{
  title: string
  subtitle: string
  description: string
  icon: Component
  iconBgClass: string
  iconClass: string
}>()

const router = useRouter()
</script>
