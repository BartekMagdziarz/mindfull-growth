<template>
  <span :class="wrapperClass" :style="wrapperStyle" :title="title" aria-hidden="true">
    <AppIcon
      v-if="iconOption || directSymbol"
      class="material-symbols-outlined leading-none select-none"
      :class="iconFontClass"
      :name="iconOption ? iconOption.materialIcon : (directSymbol ?? '')"
    />
    <span v-else-if="legacyEmoji" class="leading-none" :class="emojiClass">
      {{ legacyEmoji }}
    </span>
    <span
      v-else
      class="mg-pip"
      :class="dotClass"
      style="--mg-pip-color: color-mix(in srgb, currentColor 65%, transparent)"
    />
  </span>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

import { computed } from 'vue'
import { getEntityIconOption, isLegacyEmojiIcon } from '@/constants/entityIconCatalog'

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
// For icons picked from the full symbol set — stored directly as material symbol name
const directSymbol = computed(() => {
  if (!props.icon || iconOption.value || legacyEmoji.value) return undefined
  return props.icon
})

const sizeConfig = computed(() => {
  if (props.size === 'xs') {
    return {
      container: 'h-5 w-5 text-mg-xs',
      iconFont: 'text-xs',
      emoji: 'text-mg-xs',
      dot: '',
    }
  }
  if (props.size === 'md') {
    return {
      container: 'h-8 w-8 text-sm',
      iconFont: 'text-base',
      emoji: 'text-sm',
      dot: 'mg-pip--md',
    }
  }
  if (props.size === 'lg') {
    return {
      container: 'h-10 w-10 text-base',
      iconFont: 'text-xl',
      emoji: 'text-base',
      dot: 'mg-pip--lg',
    }
  }
  return {
    container: 'h-6 w-6 text-xs',
    iconFont: 'text-sm',
    emoji: 'text-xs',
    dot: '',
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

const iconFontClass = computed(() => sizeConfig.value.iconFont)
const emojiClass = computed(() => sizeConfig.value.emoji)
const dotClass = computed(() => sizeConfig.value.dot)
</script>
