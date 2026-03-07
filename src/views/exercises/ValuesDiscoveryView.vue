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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.valuesDiscovery.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.valuesDiscovery.subtitle') }}</p>
      </div>
    </div>

    <ValuesDiscoveryWizard @saved="handleSaved" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import ValuesDiscoveryWizard from '@/components/exercises/ValuesDiscoveryWizard.vue'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()

function handleSaved(_id: string) {
  router.push('/exercises')
}
</script>
