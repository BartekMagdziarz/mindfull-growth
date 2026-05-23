<template>
  <span :class="badgeClasses" class="neo-pill text-xs px-2 py-0.5 inline-flex items-center">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { IFSPartRole } from '@/domain/exercises'
import { IFS_ROLE_CLASSES } from '@/constants/exerciseColorRoles'

const { t } = useT()

const props = defineProps<{
  role: IFSPartRole
}>()

const badgeClasses = computed(() => {
  const c = IFS_ROLE_CLASSES[props.role]
  return `${c.bg} ${c.text}`
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
