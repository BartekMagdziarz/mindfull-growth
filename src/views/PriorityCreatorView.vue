<template>
  <div class="mg-design-v2 priority-creator-view">
    <PageContainer width="default">
      <PriorityCreatorRitual
        @close="handleLeave"
        @finished="handleFinished"
        @notify="showSnackbar"
        @error="showSnackbar"
      />
    </PageContainer>
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSnackbar from '@/components/AppSnackbar.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PriorityCreatorRitual from '@/components/objects/priority-creator/PriorityCreatorRitual.vue'

const route = useRoute()
const router = useRouter()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

/** Optional in-app path to go back to (annual wizard passes its own URL). */
function resolveReturnTarget(): string {
  const raw = route.query.returnTo
  const value = Array.isArray(raw) ? raw[0] : raw
  // Same-app relative paths only — anything else falls back to the library.
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/objects/priorities'
}

function handleLeave(): void {
  void router.push(resolveReturnTarget())
}

function handleFinished(): void {
  void router.push(resolveReturnTarget())
}

function showSnackbar(message: string): void {
  snackbarRef.value?.show(message)
}
</script>
