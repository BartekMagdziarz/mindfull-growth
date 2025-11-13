<template>
  <header class="bg-surface border-b border-outline/20 shadow-elevation-1">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            v-if="showBack"
            @click="handleBackClick"
            class="p-2 rounded-lg text-on-surface hover:bg-surface-variant active:bg-surface-variant transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Go back"
          >
            <ArrowLeftIcon class="w-6 h-6" />
          </button>
          <h1 class="text-xl font-semibold text-on-surface">Mindful Growth</h1>
        </div>
        <div v-if="$slots.actions" class="flex gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'

interface Props {
  showBack?: boolean
  backRoute?: string
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  backRoute: undefined,
})

const emit = defineEmits<{
  back: []
}>()

const router = useRouter()

const handleBackClick = () => {
  if (props.backRoute) {
    router.push(props.backRoute)
  } else {
    emit('back')
  }
}
</script>

