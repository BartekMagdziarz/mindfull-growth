<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Action Cards Section -->
    <div class="flex flex-col items-center justify-center gap-6 mt-8 mb-8">
      <!-- Free form Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
        @click="handleFreeFormClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <PencilIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">Free form</h3>
            <p class="text-on-surface-variant">
              Write freely about what comes to your mind
            </p>
          </div>
        </div>
      </AppCard>

      <!-- Guided Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
        @click="handleGuidedClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <LightBulbIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">Guided</h3>
            <p class="text-on-surface-variant">
              Follow prompts and questions
            </p>
          </div>
        </div>
      </AppCard>

      <!-- Periodic Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
        @click="handlePeriodicClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <CalendarIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">Periodic</h3>
            <p class="text-on-surface-variant">
              Scheduled reflection moments
            </p>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Link to History -->
    <div class="text-center mt-6">
      <router-link
        to="/history?type=journal"
        class="text-primary hover:underline inline-flex items-center gap-1"
      >
        View all journal entries
        <ArrowRightIcon class="w-4 h-4" />
      </router-link>
    </div>

    <!-- Snackbar -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import {
  PencilIcon,
  LightBulbIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const handleFreeFormClick = () => {
  router.push('/journal/edit')
}

const handleGuidedClick = () => {
  snackbarRef.value?.show('Coming soon')
}

const handlePeriodicClick = () => {
  router.push('/periodic')
}
</script>
