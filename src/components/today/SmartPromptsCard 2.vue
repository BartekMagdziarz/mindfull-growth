<template>
  <AppCard
    v-if="visiblePrompts.length > 0"
    padding="lg"
    class="w-full max-w-md"
  >
    <div class="space-y-3">
      <div
        v-for="prompt in visiblePrompts"
        :key="prompt.id"
        :class="[
          'flex items-start gap-4 p-4 rounded-xl transition-colors',
          toneClasses[prompt.tone],
        ]"
      >
        <!-- Icon -->
        <div class="flex-shrink-0 mt-0.5">
          <component
            :is="getIconComponent(prompt.icon)"
            :class="['w-7 h-7', iconColorClasses[prompt.tone]]"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <h4 class="text-base font-semibold text-on-surface mb-1">
            {{ prompt.title }}
          </h4>
          <p class="text-sm text-on-surface-variant mb-3">
            {{ prompt.description }}
          </p>
          <AppButton
            :variant="prompt.tone === 'urgent' ? 'filled' : 'tonal'"
            class="text-sm"
            @click="navigateTo(prompt.ctaRoute)"
          >
            {{ prompt.ctaLabel }}
          </AppButton>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowsPointingInIcon,
  MapPinIcon,
  SunIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline'
import type { SmartPrompt, PromptTone } from '@/utils/planningPromptUtils'

const props = withDefaults(
  defineProps<{
    prompts: SmartPrompt[]
    maxPrompts?: number
  }>(),
  {
    maxPrompts: 2,
  }
)

const router = useRouter()

const visiblePrompts = computed(() => {
  return props.prompts.slice(0, props.maxPrompts)
})

const toneClasses: Record<PromptTone, string> = {
  urgent: 'bg-primary-soft border border-primary/20',
  info: 'bg-section',
  celebration: 'bg-success/10 border border-success/20',
}

const iconColorClasses: Record<PromptTone, string> = {
  urgent: 'text-primary',
  info: 'text-on-surface-variant',
  celebration: 'text-success',
}

const iconMap: Record<string, Component> = {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowsPointingInIcon,
  MapPinIcon,
  SunIcon,
  ShieldCheckIcon,
}

function getIconComponent(iconName: string): Component {
  return iconMap[iconName] || CalendarDaysIcon
}

function navigateTo(route: string) {
  router.push(route)
}
</script>
