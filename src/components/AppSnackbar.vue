<template>
  <Transition name="snackbar">
    <div
      v-if="visible"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div
        class="bg-gradient-to-r from-primary to-primary-strong text-on-primary px-6 py-3 rounded-2xl shadow-neu-raised min-w-[200px] text-center flex items-center justify-center gap-4"
        role="status"
      >
        <span>{{ message }}</span>
        <button
          v-if="actionLabel"
          type="button"
          class="snackbar__action font-bold underline underline-offset-2 whitespace-nowrap"
          @click="runAction"
        >
          {{ actionLabel }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  message?: string
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  duration: 3000,
})

export interface SnackbarShowOptions {
  /** Optional inline action (e.g. "Undo"); the snackbar closes after it runs. */
  actionLabel?: string
  onAction?: () => void
  /** Overrides the default duration for this message only. */
  duration?: number
}

const visible = ref(false)
const message = ref(props.message)
const actionLabel = ref<string | undefined>(undefined)
let onAction: (() => void) | undefined

let timeoutId: ReturnType<typeof setTimeout> | null = null

const show = (msg: string, options: SnackbarShowOptions = {}) => {
  message.value = msg
  actionLabel.value = options.actionLabel
  onAction = options.onAction
  visible.value = true
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    visible.value = false
  }, options.duration ?? props.duration)
}

const hide = () => {
  visible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
}

const runAction = () => {
  const action = onAction
  hide()
  action?.()
}

defineExpose({
  show,
  hide,
})
</script>

<style scoped>
.snackbar-enter-active,
.snackbar-leave-active {
  transition: all 0.3s ease;
}

.snackbar-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.snackbar-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
