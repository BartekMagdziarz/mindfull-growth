<template>
  <span :class="badgeClasses" class="neo-pill text-xs px-2 py-0.5 inline-flex items-center">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { IFSPartRole } from '@/domain/exercises'

const { t } = useT()

const props = defineProps<{
  role: IFSPartRole
}>()

const badgeClasses = computed(() => {
  switch (props.role) {
    case 'manager':
      return 'bg-blue-100 text-blue-700'
    case 'firefighter':
      return 'bg-orange-100 text-orange-700'
    case 'exile':
      return 'bg-purple-100 text-purple-700'
    case 'unknown':
    default:
      return 'bg-neu-base text-neu-muted'
  }
})

const label = computed(() => {
  switch (props.role) {
    case 'manager':
      return t('exerciseWizards.shared.ifs.partRoles.manager')
    case 'firefighter':
      return t('exerciseWizards.shared.ifs.partRoles.firefighter')
    case 'exile':
      return t('exerciseWizards.shared.ifs.partRoles.exile')
    case 'unknown':
    default:
      return t('exerciseWizards.shared.ifs.partRoles.unknown')
  }
})
</script>
