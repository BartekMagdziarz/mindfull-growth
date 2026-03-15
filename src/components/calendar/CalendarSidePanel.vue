<template>
  <aside class="neo-card sticky top-24 flex min-h-[28rem] flex-col gap-5 p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-on-surface">
          {{ resolvedTitle }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-on-surface-variant">
          {{ resolvedBody }}
        </p>
      </div>

      <button
        v-if="open"
        type="button"
        class="neo-control neo-focus h-10 w-10 shrink-0"
        :aria-label="closeLabel"
        @click="$emit('close')"
      >
        <AppIcon name="close" class="text-base" />
      </button>
    </div>

    <div v-if="meta.length > 0" class="neo-inset rounded-[1.75rem] p-4">
      <dl class="space-y-3">
        <div
          v-for="item in meta"
          :key="`${item.label}-${item.value}`"
          class="flex items-center justify-between gap-3 text-sm"
        >
          <dt class="text-on-surface-variant">
            {{ item.label }}
          </dt>
          <dd class="font-medium text-on-surface">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </div>

    <div v-if="showNoteField" class="space-y-2">
      <label class="text-sm font-semibold text-on-surface" for="calendar-reflection-note">
        {{ noteLabel }}
      </label>
      <textarea
        id="calendar-reflection-note"
        :value="note"
        :placeholder="notePlaceholder"
        class="neo-input min-h-[12rem] w-full resize-none p-4 text-on-surface"
        @input="$emit('update:note', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <slot />

    <div v-if="open && showConfirm" class="mt-auto flex justify-end">
      <AppButton
        :disabled="confirmDisabled || saving"
        @click="$emit('confirm')"
      >
        {{ saving ? savingLabel : confirmLabel }}
      </AppButton>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

interface MetaItem {
  label: string
  value: string
}

interface Props {
  open: boolean
  title?: string
  body?: string
  emptyTitle: string
  emptyBody: string
  meta?: MetaItem[]
  showNoteField?: boolean
  note?: string
  noteLabel?: string
  notePlaceholder?: string
  showConfirm?: boolean
  confirmLabel?: string
  confirmDisabled?: boolean
  closeLabel: string
  saving?: boolean
  savingLabel: string
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  body: undefined,
  meta: () => [],
  showNoteField: false,
  note: '',
  noteLabel: '',
  notePlaceholder: '',
  showConfirm: false,
  confirmLabel: '',
  confirmDisabled: false,
  saving: false,
})

defineEmits<{
  close: []
  confirm: []
  'update:note': [value: string]
}>()

const resolvedTitle = computed(() => props.title ?? props.emptyTitle)
const resolvedBody = computed(() => props.body ?? props.emptyBody)
</script>
