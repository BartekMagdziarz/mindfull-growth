<template>
  <div class="relative inline-block" ref="containerRef">
    <button
      type="button"
      :disabled="disabled"
      class="neo-pill neo-pill--primary gap-1.5 px-2.5 py-1.5 text-[11px] font-medium"
      @click="toggleMenu"
    >
      <LinkIcon class="w-3.5 h-3.5" />
      Add link
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
          class="fixed z-50 min-w-[180px] rounded-xl border border-neu-border/30 bg-neu-base py-1 shadow-neu-raised"
          :style="menuStyle"
        >
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            :disabled="itemCount(cat.id) === 0"
            :class="[
              'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
              activeCategoryId === cat.id
                ? 'bg-primary-soft text-primary font-medium'
                : itemCount(cat.id) === 0
                  ? 'text-on-surface-variant/40 cursor-not-allowed'
                  : 'text-on-surface hover:bg-primary-soft',
            ]"
            @mouseenter="handleCategoryHover(cat.id)"
            @click="handleCategoryClick(cat.id)"
          >
            <span class="flex-1">{{ cat.label }}</span>
            <span
              v-if="itemCount(cat.id) > 0"
              class="text-[10px] text-on-surface-variant/60"
            >
              {{ itemCount(cat.id) }}
            </span>
            <ChevronRightIcon class="w-3.5 h-3.5 text-on-surface-variant/50 flex-shrink-0" />
          </button>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="isOpen && activeCategoryId"
          ref="submenuRef"
          class="fixed z-50 max-h-56 min-w-[200px] overflow-y-auto rounded-xl border border-neu-border/30 bg-neu-base py-1 shadow-neu-raised"
          :style="submenuStyle"
        >
          <div
            v-if="activeItems.length === 0"
            class="px-3 py-2 text-xs text-on-surface-variant"
          >
            No items available
          </div>
          <button
            v-for="item in activeItems"
            :key="item.id"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface transition-colors hover:bg-primary-soft"
            @click="handleItemSelect(item.id)"
          >
            <EntityIcon
              v-if="item.icon"
              :icon="item.icon"
              :color="item.color"
              size="xs"
            />
            <span
              v-else-if="item.color"
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: item.color }"
            />
            <span class="truncate">{{ item.label }}</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LinkIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import EntityIcon from './EntityIcon.vue'

export interface LinkCategory {
  id: string
  label: string
}

export interface LinkItem {
  id: string
  label: string
  icon?: string
  color?: string
}

const props = withDefaults(
  defineProps<{
    categories: LinkCategory[]
    itemsByCategory: Record<string, LinkItem[]>
    disabled?: boolean
  }>(),
  {
    disabled: false,
  }
)

const emit = defineEmits<{
  select: [payload: { category: string; itemId: string }]
}>()

const isOpen = ref(false)
const activeCategoryId = ref<string | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const submenuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const submenuStyle = ref<Record<string, string>>({})

const activeItems = computed(() => {
  if (!activeCategoryId.value) return []
  return props.itemsByCategory[activeCategoryId.value] || []
})

function itemCount(categoryId: string): number {
  return (props.itemsByCategory[categoryId] || []).length
}

function updateMenuPosition() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const menuWidth = 180
  const submenuWidth = 220
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Position level 1 below trigger
  let menuLeft = rect.left
  let menuTop = rect.bottom + 4

  // Clamp to viewport
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

  // Position level 2 to the right of level 1
  const submenuLeft = menuLeft + menuWidth + 4
  const wouldOverflow = submenuLeft + submenuWidth > viewportWidth

  submenuStyle.value = {
    left: wouldOverflow
      ? `${menuLeft - submenuWidth - 4}px`
      : `${submenuLeft}px`,
    top: `${menuTop}px`,
  }
}

function toggleMenu() {
  if (props.disabled) return
  if (isOpen.value) {
    close()
  } else {
    isOpen.value = true
    activeCategoryId.value = null
    updateMenuPosition()
  }
}

function close() {
  isOpen.value = false
  activeCategoryId.value = null
}

function handleCategoryHover(categoryId: string) {
  if (itemCount(categoryId) > 0) {
    activeCategoryId.value = categoryId
  }
}

function handleCategoryClick(categoryId: string) {
  if (itemCount(categoryId) > 0) {
    activeCategoryId.value = categoryId
  }
}

function handleItemSelect(itemId: string) {
  if (!activeCategoryId.value) return
  emit('select', { category: activeCategoryId.value, itemId })
  close()
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    containerRef.value && !containerRef.value.contains(target) &&
    (!menuRef.value || !menuRef.value.contains(target)) &&
    (!submenuRef.value || !submenuRef.value.contains(target))
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
