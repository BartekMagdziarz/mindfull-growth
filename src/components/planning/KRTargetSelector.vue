<template>
  <div v-if="trackers.length > 0" class="space-y-1">
    <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
      {{ t('planning.components.krTargetSelector.advances') }}
    </span>
    <div class="relative inline-block" ref="containerRef">
      <!-- Targeted tracker pill -->
      <button
        v-if="targetedTracker"
        type="button"
        :disabled="disabled"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
        @click="toggleMenu"
      >
        <ChartBarIcon class="w-3.5 h-3.5 flex-shrink-0" />
        <span class="truncate max-w-[180px]">{{ targetedTracker.name }}</span>
        <ChevronDownIcon class="w-3 h-3 flex-shrink-0 transition-transform" :class="{ 'rotate-180': isOpen }" />
      </button>

      <!-- Warning: no tracker targeted -->
      <button
        v-else
        type="button"
        :disabled="disabled"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 transition-colors"
        @click="toggleMenu"
      >
        <ExclamationTriangleIcon class="w-3.5 h-3.5 flex-shrink-0" />
        <span>{{ t('planning.components.krTargetSelector.noTrackerTargeted') }}</span>
        <ChevronDownIcon class="w-3 h-3 flex-shrink-0 transition-transform" :class="{ 'rotate-180': isOpen }" />
      </button>

      <!-- Dropdown -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="isOpen"
            ref="menuRef"
            class="fixed min-w-[220px] max-h-56 overflow-y-auto bg-neu-base border border-neu-border/30 rounded-xl shadow-neu-raised py-1 z-50"
            :style="menuStyle"
          >
            <button
              v-for="t in trackers"
              :key="t.id"
              type="button"
              :class="[
                'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
                t.id === trackerId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-on-surface hover:bg-section',
              ]"
              @click="handleSelect(t.id)"
            >
              <ChartBarIcon class="w-3.5 h-3.5 flex-shrink-0" />
              <span class="truncate">{{ t.name }}</span>
              <CheckIcon v-if="t.id === trackerId" class="w-3.5 h-3.5 flex-shrink-0 ml-auto" />
            </button>
            <button
              v-if="trackerId"
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-on-surface-variant hover:bg-section transition-colors flex items-center gap-2 border-t border-neu-border/20"
              @click="handleSelect(undefined)"
            >
              <XMarkIcon class="w-3.5 h-3.5 flex-shrink-0" />
              <span>{{ t('planning.components.krTargetSelector.removeTrackerTarget') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  ChartBarIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'
import type { Tracker } from '@/domain/planning'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    trackers: Tracker[]
    trackerId?: string
    disabled?: boolean
  }>(),
  {
    trackerId: undefined,
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:trackerId': [trackerId: string | undefined]
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const targetedTracker = computed(() => {
  if (!props.trackerId) return undefined
  return props.trackers.find((t) => t.id === props.trackerId)
})

function updateMenuPosition() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const menuWidth = 240
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let menuLeft = rect.left
  let menuTop = rect.bottom + 4

  if (menuLeft + menuWidth > viewportWidth) {
    menuLeft = viewportWidth - menuWidth - 8
  }
  if (menuTop + 200 > viewportHeight) {
    menuTop = rect.top - 200 - 4
  }

  menuStyle.value = {
    left: `${menuLeft}px`,
    top: `${menuTop}px`,
  }
}

function toggleMenu() {
  if (props.disabled) return
  if (isOpen.value) {
    close()
  } else {
    isOpen.value = true
    updateMenuPosition()
  }
}

function close() {
  isOpen.value = false
}

function handleSelect(id: string | undefined) {
  emit('update:trackerId', id)
  close()
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    containerRef.value && !containerRef.value.contains(target) &&
    (!menuRef.value || !menuRef.value.contains(target))
  ) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
