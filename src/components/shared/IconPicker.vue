<template>
  <div ref="containerRef" class="relative inline-flex">
    <button
      type="button"
      :disabled="disabled"
      :class="triggerClass"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <EntityIcon
        :icon="modelValue"
        :size="iconSize ?? (compact ? 'sm' : 'md')"
        :color="previewColor"
      />
      <span v-if="!compact" class="truncate text-left text-sm text-on-surface">
        {{ selectedLabel || placeholder }}
      </span>
      <AppIcon
        v-if="!minimal"
        name="expand_more"
        class="text-sm text-on-surface-variant transition-transform"
        :class="{ 'rotate-180': isOpen }"
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
          class="fixed z-50 w-[30rem] rounded-2xl border border-neu-border/28 bg-neu-base p-3 shadow-neu-raised"
          :style="menuStyle"
        >
          <div class="mb-2 flex items-center gap-2">
            <label class="flex flex-1 items-center gap-2 rounded-xl border border-neu-border/22 bg-section/45 px-2.5 py-1.5">
              <AppIcon name="search" class="text-sm text-on-surface-variant" />
              <input
                ref="searchInputRef"
                v-model.trim="query"
                type="text"
                class="w-full bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                placeholder="Search icons"
                aria-label="Search icons"
              />
            </label>
            <button
              v-if="allowClear && modelValue"
              type="button"
              class="neo-pill px-2 py-0.5 text-[11px]"
              @click="clearSelection"
            >
              Clear
            </button>
          </div>

          <div class="max-h-[22rem] overflow-y-auto pb-1 pr-1">
            <!-- Empty prompt -->
            <div v-if="!query" class="py-10 text-center">
              <AppIcon name="search" class="text-3xl text-on-surface-variant/40" />
              <p class="mt-2 text-xs text-on-surface-variant">
                Search from {{ totalSymbolCount.toLocaleString() }} icons
              </p>
            </div>

            <!-- Results -->
            <div v-else-if="filteredOptions.length" class="grid grid-cols-9 gap-2 pb-1">
              <button
                v-for="icon in filteredOptions"
                :key="icon"
                type="button"
                class="neo-icon-button neo-focus h-10 w-10 p-0"
                :class="{ 'neo-icon-button--primary': icon === modelValue }"
                :title="icon.replace(/_/g, ' ')"
                :aria-label="icon.replace(/_/g, ' ')"
                @click="select(icon)"
              >
                <span class="material-symbols-outlined text-xl leading-none">{{ icon }}</span>
              </button>
            </div>

            <!-- No results -->
            <p
              v-else
              class="py-8 text-center text-xs text-on-surface-variant"
            >
              No icons match "{{ query }}".
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getEntityIconOption } from '@/constants/entityIconCatalog'
import { searchSymbols, totalSymbolCount } from '@/services/materialSymbolsService'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    compact?: boolean
    minimal?: boolean
    iconSize?: 'xs' | 'sm' | 'md' | 'lg'
    placeholder?: string
    ariaLabel?: string
    allowClear?: boolean
    previewColor?: string
  }>(),
  {
    modelValue: undefined,
    disabled: false,
    compact: false,
    minimal: false,
    iconSize: undefined,
    placeholder: 'Select icon',
    ariaLabel: 'Select icon',
    allowClear: true,
    previewColor: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const query = ref('')

const selectedIconOption = computed(() => getEntityIconOption(props.modelValue))
const selectedLabel = computed(() => {
  if (selectedIconOption.value) return selectedIconOption.value.label
  if (props.modelValue) return props.modelValue.replace(/_/g, ' ')
  return undefined
})
const filteredOptions = computed(() => searchSymbols(query.value))

const triggerClass = computed(() => {
  if (props.compact && props.minimal) {
    return [
      'inline-flex items-center justify-center rounded-lg p-0.5 transition-colors hover:bg-section/50 neo-focus',
      props.disabled ? 'opacity-60 cursor-not-allowed' : '',
    ].join(' ')
  }

  if (props.compact) {
    return [
      'neo-icon-button neo-focus h-9 w-9 p-0',
      props.disabled ? 'opacity-60 cursor-not-allowed' : '',
    ].join(' ')
  }

  return [
    'neo-input neo-focus inline-flex w-full min-w-[13rem] items-center gap-2 px-2.5 py-2',
    props.disabled ? 'opacity-60 cursor-not-allowed' : '',
  ].join(' ')
})

function updateMenuPosition() {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const menuWidth = menuRef.value?.offsetWidth ?? 480
  const menuHeight = menuRef.value?.offsetHeight ?? 440
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = rect.left
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
  query.value = ''
  isOpen.value = true
  await nextTick()
  updateMenuPosition()
  searchInputRef.value?.focus()
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

function select(iconName: string) {
  emit('update:modelValue', iconName)
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
