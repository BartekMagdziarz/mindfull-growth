<template>
  <button
    v-if="available"
    type="button"
    class="neo-pill text-xs gap-1.5 px-3 py-1.5"
    :class="modelValue ? 'neo-pill--primary' : ''"
    :aria-pressed="modelValue"
    :aria-label="modelValue ? t('common.profileContext.on') : t('common.profileContext.off')"
    data-test-profile-context-toggle
    @click="$emit('update:modelValue', !modelValue)"
  >
    <AppIcon :name="modelValue ? 'person_check' : 'person_off'" class="text-base" />
    <span>
      {{ modelValue ? t('common.profileContext.on') : t('common.profileContext.off') }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { liveQuery } from 'dexie'
import type { ProfileScope } from '@/domain/approvedProfile'
import AppIcon from '@/components/shared/AppIcon.vue'
import { profileContextAvailable } from '@/services/userContext'
import { useT } from '@/composables/useT'

const props = defineProps<{ modelValue: boolean; scope?: ProfileScope }>()
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const { t } = useT()
const available = ref(false)
let subscription: { unsubscribe: () => void } | undefined
onMounted(() => {
  subscription = liveQuery(() => profileContextAvailable(props.scope)).subscribe({
    next: value => {
      available.value = value
    },
    error: () => {
      available.value = false
    },
  })
})
onBeforeUnmount(() => subscription?.unsubscribe())
</script>
