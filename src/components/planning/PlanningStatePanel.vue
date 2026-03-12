<template>
  <section
    :class="[
      'neo-card overflow-hidden p-6 text-center md:p-8',
      compact ? 'rounded-[1.9rem]' : '',
    ]"
  >
    <div class="neo-surface rounded-[1.8rem] px-6 py-10">
      <p
        v-if="eyebrow"
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
      >
        {{ eyebrow }}
      </p>
      <h2 class="mt-3 text-xl font-semibold text-on-surface">
        {{ title }}
      </h2>
      <p v-if="body" class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
        {{ body }}
      </p>
      <div v-if="$slots.actions || actionLabel" class="mt-6 flex justify-center">
        <slot name="actions">
          <AppButton variant="filled" @click="$emit('action')">
            {{ actionLabel }}
          </AppButton>
        </slot>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'

defineProps<{
  title: string
  body?: string
  eyebrow?: string
  actionLabel?: string
  compact?: boolean
}>()

defineEmits<{
  action: []
}>()
</script>
