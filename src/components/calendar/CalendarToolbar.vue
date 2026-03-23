<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

export interface ScaleOption {
  scale: string
  label: string
}

withDefaults(
  defineProps<{
    label: string
    scaleOptions?: ScaleOption[]
    activeScale?: string
    prevDisabled?: boolean
    nextDisabled?: boolean
    labelClickable?: boolean
  }>(),
  {
    scaleOptions: undefined,
    activeScale: undefined,
    prevDisabled: false,
    nextDisabled: false,
    labelClickable: false,
  },
)

const emit = defineEmits<{
  prev: []
  next: []
  'label-click': []
  scale: [scale: string]
}>()
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
    <section class="px-1">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="neo-control neo-focus"
          :disabled="prevDisabled"
          @click="emit('prev')"
        >
          <AppIcon name="chevron_left" class="text-base" />
        </button>

        <component
          :is="labelClickable ? 'button' : 'div'"
          class="neo-inset rounded-full px-4 py-2 text-sm font-semibold text-on-surface"
          v-bind="labelClickable ? { type: 'button' } : {}"
          @click="labelClickable ? emit('label-click') : undefined"
        >
          {{ label }}
        </component>

        <button
          type="button"
          class="neo-control neo-focus"
          :disabled="nextDisabled"
          @click="emit('next')"
        >
          <AppIcon name="chevron_right" class="text-base" />
        </button>

        <template v-if="scaleOptions?.length">
          <div class="hidden h-10 w-px rounded-full bg-outline/35 xl:block" />

          <div class="neo-segmented">
            <button
              v-for="item in scaleOptions"
              :key="item.scale"
              type="button"
              :class="[
                'neo-segmented__item neo-focus',
                item.scale === activeScale ? 'neo-segmented__item--active' : '',
              ]"
              @click="emit('scale', item.scale)"
            >
              {{ item.label }}
            </button>
          </div>
        </template>
      </div>

      <slot name="after" />
    </section>

    <section v-if="$slots.actions" class="px-1">
      <div class="flex flex-wrap items-center gap-3 xl:justify-end">
        <slot name="actions" />
      </div>
    </section>
  </div>
</template>
