<template>
  <PageContainer ref="pageRoot" :width="width" class="exercise-page">
    <PageHeader
      :eyebrow="eyebrow || t('exercises.title')"
      :title="title"
      :description="subtitle"
      :icon="icon"
      :back-to="backTo"
    >
      <template v-if="$slots.meta" #meta><slot name="meta" /></template>
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </PageHeader>
    <slot />
  </PageContainer>
</template>

<script setup lang="ts">
import './exercise-design.css'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import PageContainer, { type PageContainerWidth } from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useT } from '@/composables/useT'

/**
 * Shell for every exercise route: reading-width container, back to the
 * catalog, eyebrow "Ćwiczenia" and the exercise title/subtitle. Replaces
 * the header block that used to be copied into each exercise view.
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    eyebrow?: string
    icon?: string
    backTo?: RouteLocationRaw | (() => void)
    width?: PageContainerWidth
  }>(),
  { subtitle: '', eyebrow: '', icon: '', backTo: () => '/exercises', width: 'reading' },
)

const { t } = useT()

/**
 * Native `<input type="range">` in the wizards draws its track in the V2
 * control language (exercise-design.css); the filled part needs the value
 * as a custom property, which CSS alone cannot read. One delegated listener
 * and a mutation observer keep `--exercise-range-fill` current for every
 * range on the page, including those a later step mounts.
 */
const pageRoot = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)
let observer: MutationObserver | null = null

function rootElement(): HTMLElement | null {
  const value = pageRoot.value
  if (!value) return null
  return value instanceof HTMLElement ? value : (value.$el ?? null)
}

function paintRange(input: HTMLInputElement): void {
  if (input.type !== 'range' || input.classList.contains('exercise-range')) return
  const min = Number(input.min || 0)
  const max = Number(input.max || 100)
  const value = Number(input.value)
  const span = max - min
  const fill = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0
  input.style.setProperty('--exercise-range-fill', `${fill}%`)
}

function paintAll(): void {
  const root = rootElement()
  root?.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(paintRange)
}

function onRangeInput(event: Event): void {
  if (event.target instanceof HTMLInputElement) paintRange(event.target)
}

onMounted(() => {
  const root = rootElement()
  if (!root) return
  root.addEventListener('input', onRangeInput)
  paintAll()
  observer = new MutationObserver(() => paintAll())
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] })
})

onBeforeUnmount(() => {
  rootElement()?.removeEventListener('input', onRangeInput)
  observer?.disconnect()
  observer = null
})
</script>
