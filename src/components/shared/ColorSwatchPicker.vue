<template>
  <div ref="containerRef" class="relative inline-flex">
    <button
      type="button"
      :disabled="disabled"
      :class="triggerClass"
      :style="triggerStyle"
      :aria-label="ariaLabel"
      :title="selectedLabel || placeholder"
      @click="toggle"
    >
      <span
        v-if="modelValue"
        class="block h-5 w-5 rounded-full border border-white/40 shadow-inner"
        :style="{ backgroundColor: modelValue }"
      />
      <AppIcon
        v-else
        name="palette"
        class="text-base text-on-surface-variant"
      />
    </button>

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
          class="fixed z-50 w-72 rounded-2xl border border-neu-border/30 bg-neu-base p-3 shadow-neu-raised"
          :style="menuStyle"
        >
          <p
            v-if="title"
            class="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-on-surface-variant"
          >
            {{ title }}
          </p>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="preset in presets"
              :key="preset.hex"
              type="button"
              class="group relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 neo-focus"
              :class="modelValue === preset.hex
                ? 'scale-110 ring-2 ring-offset-2 ring-offset-neu-base ring-on-surface/60'
                : 'hover:scale-105'"
              :style="{ backgroundColor: preset.hex }"
              :aria-label="preset.label"
              :aria-pressed="modelValue === preset.hex"
              :title="preset.label"
              @click="select(preset.hex)"
            >
              <svg
                v-if="modelValue === preset.hex"
                class="h-4 w-4 text-white drop-shadow-sm"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
          <button
            v-if="allowClear && modelValue"
            type="button"
            class="mt-3 block w-full rounded-lg px-2 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-section/60 hover:text-on-surface"
            @click="clearSelection"
          >
            {{ clearLabel }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

export interface ColorPreset {
  hex: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    presets: ColorPreset[]
    disabled?: boolean
    placeholder?: string
    ariaLabel?: string
    allowClear?: boolean
    clearLabel?: string
    title?: string
  }>(),
  {
    modelValue: undefined,
    disabled: false,
    placeholder: 'Select color',
    ariaLabel: 'Select color',
    allowClear: true,
    clearLabel: 'Clear color',
    title: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const selectedLabel = computed(() => {
  if (!props.modelValue) return undefined
  return props.presets.find((p) => p.hex === props.modelValue)?.label
})

const triggerClass = computed(() => {
  return [
    'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 neo-focus',
    props.modelValue ? '' : 'neo-icon-button',
    props.disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 active:scale-95',
  ]
    .filter(Boolean)
    .join(' ')
})

const triggerStyle = computed(() => {
  if (!props.modelValue) return undefined
  return {
    boxShadow:
      '-3px -3px 6px rgb(var(--neo-shadow-light) / 0.85), 3px 3px 6px rgb(var(--neo-shadow-dark) / 0.32)',
  }
})

function updateMenuPosition() {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const menuWidth = menuRef.value?.offsetWidth ?? 288
  const menuHeight = menuRef.value?.offsetHeight ?? 200
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Anchor to the right edge of the trigger so the menu opens "to the left"
  let left = rect.right - menuWidth
  let top = rect.bottom + 6

  if (left + menuWidth > viewportWidth - 8) {
    left = viewportWidth - menuWidth - 8
  }
  if (left < 8) {
    left = 8
  }

  if (top + menuHeight > viewportHeight - 8) {
    top = rect.top - menuHeight - 6
  }
  if (top < 8) {
    top = 8
  }

  menuStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  }
}

async function open() {
  if (props.disabled) return
  isOpen.value = true
  await nextTick()
  updateMenuPosition()
}

function close() {
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) {
    close()
    return
  }
  void open()
}

function select(hex: string) {
  emit('update:modelValue', hex)
  close()
}

function clearSelection() {
  emit('update:modelValue', undefined)
  close()
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    containerRef.value &&
    !containerRef.value.contains(target) &&
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

function handleWindowChange() {
  if (!isOpen.value) return
  updateMenuPosition()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
})
</script>
