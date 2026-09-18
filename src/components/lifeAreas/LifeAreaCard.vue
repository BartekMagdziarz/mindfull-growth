<template>
  <button type="button" class="mg-v2-tile" @click="$emit('click')">
    <span
      class="mg-v2-icon-board mg-v2-icon-board--tinted"
      :style="tintStyle"
      aria-hidden="true"
    >
      <EntityIcon :icon="area.icon" :color="area.color" size="md" :circle="false" />
    </span>

    <span class="mg-v2-tile__body">
      <h3 class="mg-v2-tile__title">{{ area.name }}</h3>
      <p class="mg-v2-meta">
        <span v-if="area.meaning" class="line-clamp-1">{{ area.meaning }}</span>
        <span v-if="latestScore !== undefined" :class="scoreClass">
          {{ t('lifeAreas.card.scoreFormat', { score: latestScore }) }}
        </span>
        <span v-if="!area.isActive">{{ t('lifeAreas.card.archived') }}</span>
      </p>
      <p v-if="area.desiredState" class="mg-v2-tile__lead">
        {{ area.desiredState }}
      </p>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LifeArea } from '@/domain/lifeArea'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  area: LifeArea
  latestScore?: number
}>()

defineEmits<{
  click: []
}>()

/** Area colour is domain data: it tints the icon board via the anatomy's
 *  CSS variable (blended into the sky field, never a raw fill). */
const tintStyle = computed(() =>
  props.area.color ? { '--mg-icon-board-tint': props.area.color, '--mg-icon-board-tint-mix': '26%' } : undefined,
)

/** Score reads as a word-and-number fact; colour only for warn/bad. */
const scoreClass = computed(() => {
  if (props.latestScore === undefined) return ''
  if (props.latestScore >= 7) return 'mg-v2-meta__status'
  if (props.latestScore >= 4) return 'mg-v2-meta__warn'
  return 'mg-v2-meta__bad'
})
</script>
