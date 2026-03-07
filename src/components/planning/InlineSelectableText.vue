<template>
  <div class="relative inline-flex" ref="containerRef">
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'inline-flex items-center gap-1.5 rounded-lg transition-colors text-left',
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-section/60 cursor-pointer',
        buttonClass,
      ]"
      @click="toggle"
    >
      <slot>
        <span :class="textClass">{{ displayValue }}</span>
      </slot>
      <ChevronDownIcon
        v-if="!disabled"
        :class="[
          'w-3 h-3 text-on-surface-variant transition-transform duration-200',
          isOpen ? 'rotate-180' : '',
        ]"
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
          ref="dropdownRef"
          class="fixed min-w-[160px] max-h-48 overflow-y-auto bg-neu-base border border-neu-border/30 rounded-xl shadow-neu-raised py-1 z-50"
          :style="dropdownStyle"
        >
          <button
            v-if="allowNone"
            type="button"
            :class="[
              'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
              !modelValue ? 'text-primary font-medium bg-primary/5' : 'text-on-surface-variant hover:bg-section',
            ]"
            @click="handleSelect(undefined)"
          >
            None
          </button>
          <button
            v-for="option in options"
            :key="option.id"
            type="button"
            :class="[
              'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
              option.id === modelValue ? 'text-primary font-medium bg-primary/5' : 'text-on-surface hover:bg-section',
            ]"
            @click="handleSelect(option.id)"
          >
            <span
              v-if="option.color"
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: option.color }"
            />
            {{ option.label }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

export interface SelectOption {
  id: string
  label: string
  color?: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    allowNone?: boolean
    textClass?: string
    buttonClass?: string
  }>(),
  {
    placeholder: 'Select...',
    disabled: false,
    allowNone: true,
    textClass: 'text-xs text-on-surface-variant',
    buttonClass: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  select: [value: string | undefined]
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const displayValue = computed(() => {
  const option = props.options.find((o) => o.id === props.modelValue)
  return option?.label ?? props.placeholder
})

function updateDropdownPosition() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
  }
}

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

function handleSelect(id: string | undefined) {
  emit('update:modelValue', id)
  emit('select', id)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    containerRef.value && !containerRef.value.contains(target) &&
    (!dropdownRef.value || !dropdownRef.value.contains(target))
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
