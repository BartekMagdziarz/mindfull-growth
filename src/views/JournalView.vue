<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Action Cards Section -->
    <div class="flex flex-col items-center justify-center gap-6 mt-8 mb-8">
      <!-- Free form Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:-translate-y-px"
        @click="handleFreeFormClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <AppIcon name="edit" class="text-4xl text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('journal.view.freeForm') }}</h3>
            <p class="text-on-surface-variant">
              {{ t('journal.view.freeFormDescription') }}
            </p>
          </div>
        </div>
      </AppCard>

      <!-- Guided Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:-translate-y-px"
        @click="handleGuidedClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <AppIcon name="lightbulb" class="text-4xl text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('journal.view.guided') }}</h3>
            <p class="text-on-surface-variant">
              {{ t('journal.view.guidedDescription') }}
            </p>
          </div>
        </div>
      </AppCard>

    </div>

    <!-- Snackbar -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const router = useRouter()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const handleFreeFormClick = () => {
  router.push('/journal/edit')
}

const handleGuidedClick = () => {
  snackbarRef.value?.show(t('journal.view.comingSoon'))
}

</script>
