<template>
  <Transition name="snackbar">
    <div
      v-if="visible"
      class="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div
        class="bg-surface-variant text-on-surface-variant px-6 py-3 rounded-lg shadow-elevation-3 border border-outline/20 min-w-[200px] text-center"
      >
        {{ message }}
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

const visible = ref(false)
const message = ref(props.message)

let timeoutId: ReturnType<typeof setTimeout> | null = null

const show = (msg: string) => {
  message.value = msg
  visible.value = true
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    visible.value = false
  }, props.duration)
}

const hide = () => {
  visible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
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

