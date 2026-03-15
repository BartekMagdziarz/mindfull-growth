<template>
  <button
    class="w-full text-left"
    @click="$emit('click')"
  >
    <AppCard padding="lg" class="space-y-2 transition-shadow cursor-pointer">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="iconBgClass">
            <span class="material-symbols-outlined text-xl leading-none" :class="iconClass">{{ icon }}</span>
          </div>
          <div>
            <h3 class="text-base font-semibold text-on-surface">{{ title }}</h3>
            <p class="text-xs text-on-surface-variant">{{ subtitle }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="aiAssisted"
            class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
            :title="t('exercises.aiAssisted')"
          >
            <span class="material-symbols-outlined text-sm leading-none text-primary">auto_awesome</span>
          </span>
          <span
            v-if="lastCompleted"
            class="text-xs text-on-surface-variant bg-section px-2 py-1 rounded-full whitespace-nowrap"
          >
            {{ lastCompletedLabel }}
          </span>
        </div>
      </div>
      <p class="text-sm text-on-surface-variant">{{ description }}</p>
    </AppCard>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  title: string
  subtitle: string
  description: string
  icon: string
  iconBgClass?: string
  iconClass?: string
  lastCompleted?: string // ISO timestamp
  aiAssisted?: boolean
}>()

defineEmits<{
  click: []
}>()

const lastCompletedLabel = computed(() => {
  if (!props.lastCompleted) return ''
  const date = new Date(props.lastCompleted)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('common.time.today')
  if (diffDays === 1) return t('common.time.yesterday')
  if (diffDays < 7) return t('common.time.daysAgo', { n: diffDays })
  if (diffDays < 30) return t('common.time.weeksAgo', { n: Math.floor(diffDays / 7) })
  return date.toLocaleDateString()
})
</script>
