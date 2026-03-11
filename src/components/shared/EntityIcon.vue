<template>
  <span
    :class="wrapperClass"
    :style="wrapperStyle"
    :title="title"
    aria-hidden="true"
  >
    <component
      v-if="iconOption"
      :is="iconOption.component"
      :class="iconClass"
    />
    <span
      v-else-if="legacyEmoji"
      class="leading-none"
      :class="emojiClass"
    >
      {{ legacyEmoji }}
    </span>
    <span
      v-else
      class="rounded-full bg-current/65"
      :class="dotClass"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getEntityIconOption,
  isLegacyEmojiIcon,
} from '@/constants/entityIconCatalog'

const props = withDefaults(
  defineProps<{
    icon?: string
    color?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    circle?: boolean
    title?: string
  }>(),
  {
    size: 'sm',
    circle: true,
    title: undefined,
    color: undefined,
    icon: undefined,
  }
)

const iconOption = computed(() => getEntityIconOption(props.icon))
const legacyEmoji = computed(() => (isLegacyEmojiIcon(props.icon) ? props.icon : undefined))

const sizeConfig = computed(() => {
  if (props.size === 'xs') {
    return {
      container: 'h-5 w-5 text-[10px]',
      icon: 'h-3 w-3',
      emoji: 'text-[10px]',
      dot: 'h-1.5 w-1.5',
    }
  }
  if (props.size === 'md') {
    return {
      container: 'h-8 w-8 text-sm',
      icon: 'h-4 w-4',
      emoji: 'text-sm',
      dot: 'h-2 w-2',
    }
  }
  if (props.size === 'lg') {
    return {
      container: 'h-10 w-10 text-base',
      icon: 'h-5 w-5',
      emoji: 'text-base',
      dot: 'h-2.5 w-2.5',
    }
  }
  return {
    container: 'h-6 w-6 text-xs',
    icon: 'h-3.5 w-3.5',
    emoji: 'text-xs',
    dot: 'h-1.5 w-1.5',
  }
})

const wrapperClass = computed(() => {
  const base = [
    'inline-flex items-center justify-center shrink-0 text-on-surface-variant',
    sizeConfig.value.container,
  ]

  if (props.circle) {
    base.push('rounded-full border border-neu-border/25 bg-section/60')
  }

  return base.join(' ')
})

const wrapperStyle = computed(() => {
  if (!props.color || !props.circle) return undefined
  return {
    borderColor: `${props.color}66`,
    color: props.color,
    backgroundColor: `${props.color}1f`,
  }
})

const iconClass = computed(() => sizeConfig.value.icon)
const emojiClass = computed(() => sizeConfig.value.emoji)
const dotClass = computed(() => sizeConfig.value.dot)
</script>
