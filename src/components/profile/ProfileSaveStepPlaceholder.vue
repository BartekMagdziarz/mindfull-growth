<template>
  <div
    class="neo-warning p-4 rounded-2xl text-sm text-on-surface"
    data-test-save-placeholder
  >
    {{ t('profile.psychologicalProfile.wizard.save.comingSoon') }}
  </div>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'

const { t } = useT()
</script>
