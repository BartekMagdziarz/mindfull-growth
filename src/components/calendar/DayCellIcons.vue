<template>
  <div
    ref="containerEl"
    class="mt-1.5 flex flex-1 flex-wrap content-start overflow-hidden"
    :style="containerStyle"
  >
    <div
      v-for="item in props.items"
      :key="item.key"
      :title="item.title"
      class="relative flex shrink-0 items-center justify-center transition-all duration-200"
      :class="itemTextClass(item)"
      :style="{ width: `${iconSize}px`, height: `${iconSize}px` }"
    >
      <!-- Pentagon ring (active habits only — clip-path clips box-shadow so we fake a ring) -->
      <div
        v-if="item.subjectType === 'habit' && item.isActiveAssignment"
        class="absolute -inset-px bg-primary/25 pentagon-clip"
      />
      <!-- Shape background -->
      <div
        class="absolute inset-0"
        :class="[shapeBgClass(item.subjectType), shapeRingClass(item)]"
        :style="itemBgStyle(item)"
      />

      <span
        v-if="item.icon && resolvedIcon(item.icon)"
        class="material-symbols-outlined relative select-none leading-none"
        :style="{ fontSize: `${iconFontSize}px` }"
      >{{ resolvedIcon(item.icon) }}</span>
      <span
        v-else-if="item.icon && isEmoji(item.icon)"
        class="relative leading-none"
        :style="{ fontSize: `${iconFontSize * 0.85}px` }"
      >{{ item.icon }}</span>
      <span
        v-else
        class="relative truncate px-0.5 font-medium leading-none"
        :style="{ fontSize: `${Math.max(8, iconFontSize * 0.7)}px` }"
      >{{ item.title }}</span>
      <span
        v-if="item.count > 1"
        class="absolute z-10 flex items-center justify-center rounded-full bg-primary font-bold leading-none text-on-primary"
        :style="badgeStyle"
      >
        {{ item.count }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getEntityIconOption, isLegacyEmojiIcon } from '@/constants/entityIconCatalog'
import type { CollapsedIconItem, SubjectKind } from './plannerTypes'

const props = defineProps<{
  items: CollapsedIconItem[]
  density?: 'compact' | 'comfortable'
}>()

const density = computed(() => props.density ?? 'comfortable')
const gap = computed(() => (density.value === 'compact' ? 4 : 5))
const maxCols = computed(() => (density.value === 'compact' ? 10 : 9))
const minIconSize = computed(() => (density.value === 'compact' ? 12 : 16))
const maxIconSize = computed(() => (density.value === 'compact' ? 32 : 44))

const containerEl = ref<HTMLElement | null>(null)
const containerW = ref(0)
const containerH = ref(0)

let observer: ResizeObserver | null = null

onMounted(() => {
  if (!containerEl.value) return
  observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      containerW.value = entry.contentRect.width
      containerH.value = entry.contentRect.height
    }
  })
  observer.observe(containerEl.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

const typeColorVar: Record<SubjectKind, string> = {
  keyResult: '--neo-chart-kr-end',
  habit: '--neo-chart-kr-end',
  tracker: '--neo-chart-kr-end',
}

function resolvedIcon(icon: string): string | undefined {
  const opt = getEntityIconOption(icon)
  if (opt) return opt.materialIcon
  if (isLegacyEmojiIcon(icon)) return undefined
  return icon
}

function isEmoji(icon: string): boolean {
  return isLegacyEmojiIcon(icon)
}

function shapeBgClass(type: SubjectKind): string {
  switch (type) {
    case 'keyResult': return 'rounded-full'
    case 'tracker': return 'rounded-[22%]'
    case 'habit': return 'pentagon-clip'
  }
}

function shapeRingClass(item: CollapsedIconItem): string {
  if (!item.isActiveAssignment) return ''
  // Pentagon ring is handled by a separate overlay div (clip-path clips box-shadow)
  if (item.subjectType === 'habit') return ''
  return 'ring-1 ring-primary/25'
}

function itemBgStyle(item: CollapsedIconItem): Record<string, string> {
  const cssVar = typeColorVar[item.subjectType]
  const opacity = item.isActiveAssignment ? 0.25 : 0.10
  return { backgroundColor: `rgb(var(${cssVar}) / ${opacity})` }
}

function itemTextClass(item: CollapsedIconItem): string {
  return item.isActiveAssignment ? 'text-primary-strong' : 'text-on-surface-variant'
}

/**
 * Compute the largest square icon size that fits N items
 * into a container of W × H with `gap` spacing, max 9 per row.
 *
 * For each candidate column count C (1…min(9, N)):
 *   rows R = ceil(N / C)
 *   maxSizeByWidth  = (W - (C - 1) × gap) / C
 *   maxSizeByHeight = (H - (R - 1) × gap) / R
 *   size = min(sizeByW, sizeByH)
 * Pick the C that yields the largest size.
 */
const iconSize = computed(() => {
  const W = containerW.value
  const H = containerH.value
  const N = props.items.length
  if (N === 0 || W === 0 || H === 0) return 24

  let best = 0

  for (let cols = 1; cols <= Math.min(maxCols.value, N); cols++) {
    const rows = Math.ceil(N / cols)
    const sizeW = (W - (cols - 1) * gap.value) / cols
    const sizeH = (H - (rows - 1) * gap.value) / rows
    const size = Math.min(sizeW, sizeH)
    if (size > best) best = size
  }

  return Math.max(minIconSize.value, Math.min(Math.floor(best), maxIconSize.value))
})

const iconFontSize = computed(() => {
  const minSize = density.value === 'compact' ? 8 : 10
  const ratio = density.value === 'compact' ? 0.46 : 0.5
  return Math.max(minSize, Math.round(iconSize.value * ratio))
})

const badgeInset = computed(() => {
  const badgeSize = Math.max(12, Math.round(iconSize.value * 0.38))
  return Math.max(4, Math.round(badgeSize * 0.35))
})

const containerStyle = computed(() => ({
  gap: `${gap.value}px`,
  paddingTop: `${badgeInset.value}px`,
  paddingRight: `${badgeInset.value}px`,
  marginTop: `calc(0.375rem - ${badgeInset.value}px)`,
}))

const badgeStyle = computed(() => {
  const s = iconSize.value
  const badgeSize = Math.max(12, Math.round(s * 0.38))
  const offset = Math.round(badgeSize * -0.25)
  const fontSize = Math.max(7, Math.round(badgeSize * 0.6))
  return {
    width: `${badgeSize}px`,
    height: `${badgeSize}px`,
    fontSize: `${fontSize}px`,
    top: `${offset}px`,
    right: `${offset}px`,
  }
})
</script>

<style scoped>
.pentagon-clip {
  clip-path: polygon(50% 0%, 98% 35%, 79% 90%, 21% 90%, 2% 35%);
}
</style>
