<template>
  <PageContainer :width="width">
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
  { subtitle: '', eyebrow: '', icon: '', backTo: '/exercises', width: 'reading' },
)

const { t } = useT()
</script>
