<template>
  <header
    class="mg-v2-page-head"
    :class="{ 'mg-v2-page-head--no-back': !backTo, 'mg-v2-page-head--icon': icon || $slots.leading }"
  >
    <button
      v-if="backTo"
      type="button"
      class="mg-v2-button mg-v2-button--icon"
      :aria-label="backLabel || t('common.buttons.back')"
      @click="goBack"
    >
      <AppIcon name="arrow_back" class="text-xl" />
    </button>

    <span v-if="icon" class="mg-v2-icon-board mg-v2-icon-board--sm" aria-hidden="true">
      <AppIcon :name="icon" />
    </span>
    <slot v-else name="leading" />

    <div class="mg-v2-page-head__copy">
      <span v-if="eyebrow" class="mg-v2-page-head__eyebrow">{{ eyebrow }}</span>
      <h1 class="mg-v2-page-head__title">{{ title }}</h1>
      <p v-if="description" class="mg-v2-page-head__lead">{{ description }}</p>
      <slot name="meta" />
    </div>

    <div v-if="$slots.actions" class="mg-v2-page-head__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

/**
 * Design V2 page header: optional organic back control, eyebrow (section
 * name), title, lead and a quiet meta line slot; actions sit on the right.
 * Shared by exercises, profile, history and life areas.
 */
const props = withDefaults(
  defineProps<{
    title: string
    eyebrow?: string
    description?: string
    /** Material symbol shown in an icon board between back and copy. */
    icon?: string
    /** Route to push, or a handler for views with their own back logic. */
    backTo?: RouteLocationRaw | (() => void)
    backLabel?: string
  }>(),
  { eyebrow: '', description: '', icon: '', backTo: undefined, backLabel: '' },
)

const router = useRouter()
const { t } = useT()

function goBack() {
  if (typeof props.backTo === 'function') props.backTo()
  else if (props.backTo) router.push(props.backTo)
}
</script>
