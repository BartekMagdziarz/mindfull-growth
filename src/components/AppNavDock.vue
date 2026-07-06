<template>
  <nav
    :aria-label="t('common.nav.mainNavigation')"
    class="pointer-events-none fixed inset-y-0 left-0 z-40"
  >
    <!-- Edge hot zone + handle (peek mode only). The zone must receive
         pointer events to drive the hover-intent reveal; it sits at the very
         left edge where views only have empty gutter. -->
    <div
      v-if="!pinned"
      class="pointer-events-auto absolute inset-y-0 left-0 w-7"
      @pointerenter="onZoneEnter"
      @pointerleave="onZoneLeave"
    >
      <button
        type="button"
        class="dock-handle"
        :class="{ 'dock-handle--hidden': revealed }"
        :aria-label="t('common.nav.openNavigation')"
        @click="revealNow"
        @focus="revealNow"
      >
        <AppIcon :name="activeIcon" class="text-base" />
      </button>
    </div>

    <div
      class="dock-capsule neo-scroll pointer-events-auto"
      :class="dockVisible ? 'dock-capsule--visible' : 'dock-capsule--hidden'"
      @pointerenter="cancelHide"
      @pointerleave="scheduleHide"
      @focusin="revealNow"
      @focusout="onFocusOut"
    >
      <div class="dock-title">
        <span class="dock-glyph" aria-hidden="true">
          <AppIcon name="spa" class="text-[17px]" />
        </span>
        <span class="dock-label dock-title-label">Mindful Growth</span>
      </div>

      <div class="dock-sep" aria-hidden="true"></div>

      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="dock-item"
        :class="{ 'dock-item--active': isActive(item.path) }"
        :aria-label="item.label"
      >
        <AppIcon :name="item.icon" class="dock-item-icon" />
        <span class="dock-label">{{ item.label }}</span>
      </router-link>

      <div class="dock-sep mt-auto" aria-hidden="true"></div>

      <button
        type="button"
        class="dock-item"
        :aria-label="pinned ? t('common.nav.unpinDock') : t('common.nav.pinDock')"
        @click="emit('update:pinned', !pinned)"
      >
        <AppIcon name="keep" class="dock-item-icon" :class="{ 'rotate-45': !pinned }" />
        <span class="dock-label">
          {{ pinned ? t('common.nav.unpinDock') : t('common.nav.pinDock') }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

interface NavItem {
  path: string
  label: string
  icon: string
}

const props = defineProps<{
  /** Pinned: dock stays visible and AppShell offsets <main>. Unpinned: peek mode. */
  pinned: boolean
}>()

const emit = defineEmits<{
  'update:pinned': [value: boolean]
}>()

const route = useRoute()
const { t } = useT()

const navItems = computed<NavItem[]>(() => [
  { path: '/today', label: t('common.nav.today'), icon: 'wb_sunny' },
  { path: '/calendar', label: t('common.nav.calendar'), icon: 'calendar_month' },
  { path: '/objects/goals', label: t('common.nav.objects'), icon: 'target' },
  { path: '/journal', label: t('common.nav.journal'), icon: 'edit_note' },
  { path: '/emotions', label: t('common.nav.emotions'), icon: 'favorite' },
  { path: '/history', label: t('common.nav.history'), icon: 'history' },
  { path: '/exercises', label: t('common.nav.exercises'), icon: 'self_improvement' },
  { path: '/profile', label: t('common.nav.profile'), icon: 'person' },
])

const isActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(path + '/')
}

const activeIcon = computed(
  () => navItems.value.find((item) => isActive(item.path))?.icon ?? 'menu',
)

// --- Peek reveal state --------------------------------------------------
// Hover-intent lives in JS (not CSS transition-delay): a pending reveal must
// be cancellable when the pointer leaves the edge zone early, and keyboard
// focus must reveal instantly with no delay.
const REVEAL_DELAY_MS = 150
const HIDE_DELAY_MS = 300

const revealed = ref(false)
const dockVisible = computed(() => props.pinned || revealed.value)

let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

function clearTimers(): void {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
}

function revealNow(): void {
  clearTimers()
  revealed.value = true
}

function onZoneEnter(): void {
  if (props.pinned) return
  clearTimeout(hideTimer)
  if (!revealed.value) {
    showTimer = setTimeout(() => {
      revealed.value = true
    }, REVEAL_DELAY_MS)
  }
}

function onZoneLeave(): void {
  clearTimeout(showTimer)
  if (revealed.value) scheduleHide()
}

function scheduleHide(): void {
  if (props.pinned) return
  clearTimeout(showTimer)
  hideTimer = setTimeout(() => {
    revealed.value = false
  }, HIDE_DELAY_MS)
}

function cancelHide(): void {
  clearTimeout(hideTimer)
}

function onFocusOut(event: FocusEvent): void {
  const capsule = event.currentTarget as HTMLElement | null
  const next = event.relatedTarget as Node | null
  if (capsule && next && capsule.contains(next)) return
  scheduleHide()
}

// Navigating away is the natural end of a nav interaction — tuck the dock.
watch(
  () => route.path,
  () => {
    if (!props.pinned) {
      clearTimers()
      revealed.value = false
    }
  },
)

watch(
  () => props.pinned,
  () => {
    clearTimers()
    revealed.value = false
  },
)

onBeforeUnmount(clearTimers)
</script>

<style scoped>
.dock-capsule {
  position: absolute;
  left: 18px;
  top: 50%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 72px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  border-radius: 26px;
  border: 1px solid rgb(var(--neo-border) / 0.1);
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    -7px -7px 14px rgb(var(--neo-shadow-light) / 0.8),
    7px 7px 14px rgb(var(--neo-shadow-dark) / 0.33);
  transition:
    width 220ms ease,
    transform 250ms ease,
    opacity 200ms ease,
    box-shadow 220ms ease;
}

.dock-capsule:hover,
.dock-capsule:focus-within {
  width: 220px;
  box-shadow:
    -9px -9px 18px rgb(var(--neo-shadow-light) / 0.8),
    9px 9px 18px rgb(var(--neo-shadow-dark) / 0.4);
}

.dock-capsule--visible {
  transform: translateY(-50%);
  opacity: 1;
}

/* Hidden = fully off-screen but NOT display:none / visibility:hidden — the
   links must stay focusable so keyboard focus can reveal the dock. */
.dock-capsule--hidden {
  transform: translate(-130px, -50%);
  opacity: 0;
}

.dock-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 4px 8px;
  white-space: nowrap;
}

.dock-glyph {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background: linear-gradient(
    135deg,
    rgb(var(--neo-accent-start) / 0.85),
    rgb(var(--neo-accent-end) / 0.85)
  );
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
  color: rgb(var(--neo-accent-text));
}

.dock-title-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--neo-text));
}

.dock-sep {
  flex: none;
  height: 1px;
  margin: 6px 10px;
  background: rgb(var(--neo-border) / 0.35);
}

.dock-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  height: 44px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  color: rgb(var(--neo-muted));
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  text-align: left;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.dock-item:hover {
  color: rgb(var(--neo-text));
  background: rgb(var(--neo-surface-top) / 0.85);
}

.dock-item--active {
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--neo-surface-base));
  border-color: rgb(var(--neo-border) / 0.4);
  box-shadow:
    inset -3px -3px 6px rgb(var(--neo-inset-light) / 0.8),
    inset 3px 3px 6px rgb(var(--neo-inset-dark) / 0.33);
}

.dock-item-icon {
  flex: none;
  width: 24px;
  text-align: center;
  font-size: 22px;
}

.dock-label {
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity 180ms ease 40ms,
    transform 180ms ease 40ms;
}

.dock-capsule:hover .dock-label,
.dock-capsule:focus-within .dock-label {
  opacity: 1;
  transform: none;
}

.dock-handle {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 26px;
  height: 66px;
  border-radius: 0 16px 16px 0;
  border: 1px solid rgb(var(--neo-border) / 0.1);
  border-left: none;
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow: 4px 4px 10px rgb(var(--neo-shadow-dark) / 0.25);
  display: grid;
  place-items: center;
  color: rgb(var(--color-primary-strong));
  transition: opacity 200ms ease;
}

.dock-handle--hidden {
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .dock-capsule,
  .dock-item,
  .dock-label,
  .dock-handle {
    transition: none !important;
  }
}
</style>
