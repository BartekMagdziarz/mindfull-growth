<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" aria-hidden="true"></div>

        <!-- Dialog Card -->
        <div
          ref="dialogRef"
          role="dialog"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          class="relative z-10 neo-raised-strong p-6 w-full mx-4 rounded-2xl"
          :class="sizeClass"
        >
          <!-- Title -->
          <h2 :id="titleId" class="text-xl font-semibold text-neu-text mb-4">
            {{ title }}
          </h2>

          <!-- Body: custom slot or default message + actions -->
          <template v-if="hasDefaultSlot">
            <div :id="messageId">
              <slot />
            </div>
          </template>
          <template v-else>
            <!-- Message -->
            <p :id="messageId" class="text-neu-muted mb-6">
              {{ message }}
            </p>

            <!-- Actions -->
            <div class="flex gap-3 justify-end">
              <AppButton variant="text" @click="handleCancel">
                {{ resolvedCancelText }}
              </AppButton>
              <AppButton :variant="confirmVariant" @click="handleConfirm">
                {{ resolvedConfirmText }}
              </AppButton>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, useSlots } from 'vue'
import AppButton from './AppButton.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

type DialogSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

interface Props {
  modelValue: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'filled' | 'outlined' | 'text' | 'tonal'
  size?: DialogSize
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmVariant: 'filled',
  message: '',
  size: 'md',
  closeOnBackdrop: true,
})

const slots = useSlots()
const hasDefaultSlot = computed(() => Boolean(slots.default))

const sizeClass = computed(() => {
  switch (props.size) {
    case 'lg':
      return 'max-w-lg'
    case 'xl':
      return 'max-w-xl'
    case '2xl':
      return 'max-w-2xl'
    case '3xl':
      return 'max-w-3xl'
    case '4xl':
      return 'max-w-4xl'
    case 'md':
    default:
      return 'max-w-md'
  }
})

const resolvedConfirmText = computed(() => props.confirmText ?? t('common.buttons.confirm'))
const resolvedCancelText = computed(() => props.cancelText ?? t('common.buttons.cancel'))

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const titleId = 'dialog-title'
const messageId = 'dialog-message'
let previousActiveElement: HTMLElement | null = null

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    handleCancel()
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    handleCancel()
  }
}

// Focus management: When dialog opens, focus the dialog. When it closes, restore focus.
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement = (document.activeElement as HTMLElement) || null

      // Wait for DOM update, then focus the dialog
      await nextTick()
      if (dialogRef.value) {
        // Focus the first focusable element (confirm button)
        const confirmButton = dialogRef.value.querySelector(
          'button:last-of-type'
        ) as HTMLElement
        if (confirmButton) {
          confirmButton.focus()
        } else {
          dialogRef.value.focus()
        }
      }
    } else {
      // Restore focus to the previously focused element
      if (previousActiveElement) {
        previousActiveElement.focus()
        previousActiveElement = null
      }
    }
  }
)

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .neo-raised-strong,
.dialog-leave-active .neo-raised-strong {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .neo-raised-strong,
.dialog-leave-to .neo-raised-strong {
  transform: scale(0.95);
  opacity: 0;
}
</style>
