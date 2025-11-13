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
          class="relative z-10 bg-surface rounded-xl shadow-elevation-3 p-6 max-w-md w-full mx-4 border border-outline/20"
        >
          <!-- Title -->
          <h2 :id="titleId" class="text-xl font-semibold text-on-surface mb-4">
            {{ title }}
          </h2>

          <!-- Message -->
          <p :id="messageId" class="text-on-surface-variant mb-6">
            {{ message }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3 justify-end">
            <AppButton variant="text" @click="handleCancel">
              {{ cancelText }}
            </AppButton>
            <AppButton :variant="confirmVariant" @click="handleConfirm">
              {{ confirmText }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import AppButton from './AppButton.vue'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'filled' | 'outlined' | 'text' | 'tonal'
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmVariant: 'filled',
})

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
  handleCancel()
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

.dialog-enter-active .bg-surface,
.dialog-leave-active .bg-surface {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .bg-surface,
.dialog-leave-to .bg-surface {
  transform: scale(0.95);
  opacity: 0;
}
</style>

