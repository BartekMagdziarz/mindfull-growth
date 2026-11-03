<template>
  <nav
    :aria-label="t('common.nav.mainNavigation')"
    class="dock"
    :class="{ 'dock--responsive': route.meta.responsive }"
  >
    <div class="dock-capsule">
      <div class="dock-title">
        <span class="dock-glyph" aria-hidden="true">
          <AppIcon name="spa" class="text-mg-icon-md" />
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
        :title="item.label"
      >
        <AppIcon :name="item.icon" class="dock-item-icon" />
        <span class="dock-label">{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

/**
 * Global navigation: a permanently visible collapsed capsule at the left
 * edge (icons only) that widens to show labels on hover or keyboard focus.
 * The former "peek" mode (dock hidden behind the edge) and the pin toggle
 * were retired on 2026-09-09 — the dock is always there, always collapsed
 * at rest. AppShell offsets <main> by the collapsed width.
 */

interface NavItem {
  path: string
  label: string
  icon: string
}

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
  if (path === '/objects/goals') return route.path.startsWith('/objects')
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
/* The dock lives outside the .mg-design-v2 root; the --mg-* tokens are on
   :root, so it mirrors the V2 ladder directly: capsule = card (the overlay
   shadow — it floats over every view), hover = field (mist), active = inner
   (paper). */
.dock {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  pointer-events: none;
  font-family: var(--mg-font-sans);
}

.dock-capsule {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 72px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--mg-color-field-border) transparent;
  padding: 12px;
  pointer-events: auto;
  border: 1px solid var(--mg-color-border);
  /* Hand-drawn capsule: uneven corners like the V2 cards. */
  border-radius: var(--mg-radius-xl);
  background: var(--mg-color-surface);
  box-shadow: var(--mg-shadow-raised);
  transition:
    width 220ms ease,
    box-shadow 220ms ease;
}

/* Expand on hover, or on KEYBOARD focus only (:focus-visible) — a mouse
   click also focuses the clicked link, and plain :focus-within would keep the
   capsule stuck open after navigating. */
.dock-capsule:hover,
.dock-capsule:has(:focus-visible) {
  width: 220px;
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
  width: 34px;
  height: 34px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
  transform: rotate(-4deg);
}

.dock-title-label {
  font-size: var(--mg-font-size-md);
  font-weight: var(--mg-weight-title);
  color: var(--mg-color-ink);
}

/* Pencil separator: a faint dashed line instead of a hairline. */
.dock-sep {
  flex: none;
  height: 0;
  margin: 6px 10px;
  border-top: 1px dashed var(--mg-color-field-border);
}

.dock-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  height: 44px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: var(--mg-radius-md);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
  white-space: nowrap;
  text-align: left;
  text-decoration: none;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.dock-item:hover {
  color: var(--mg-color-ink);
  background: var(--mg-color-mist);
}

/* Current section = inner step, slightly lifted and tilted like the current
   unit in the rhythm calendar axis. */
.dock-item--active {
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-paper);
  border-color: var(--mg-color-border);
  box-shadow: var(--mg-shadow-raised-sm);
  transform: rotate(-0.8deg);
}

.dock-item:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

/* Icons inside controls follow the app accent — never ink/grey. */
.dock-item-icon {
  flex: none;
  width: 24px;
  text-align: center;
  font-size: var(--mg-font-size-icon-lg);
  color: var(--mg-color-primary);
}

.dock-item--active .dock-item-icon {
  color: var(--mg-color-primary-strong);
}

.dock-label {
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity 180ms ease 40ms,
    transform 180ms ease 40ms;
}

.dock-capsule:hover .dock-label,
.dock-capsule:has(:focus-visible) .dock-label {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .dock-capsule,
  .dock-item,
  .dock-label {
    transition: none !important;
  }
}
@media (max-width: 760px) {
  .dock--responsive {
    inset: auto 0 0;
    display: flex;
    justify-content: center;
  }
  .dock--responsive .dock-capsule {
    position: static;
    transform: none;
    flex-direction: row;
    gap: var(--mg-space-1);
    width: fit-content;
    max-width: calc(100vw - var(--mg-space-4));
    max-height: none;
    overflow-x: auto;
    margin-bottom: var(--mg-space-2);
    padding: var(--mg-space-2);
    border-radius: var(--mg-radius-pill);
  }
  .dock--responsive .dock-title,
  .dock--responsive .dock-sep,
  .dock--responsive .dock-label {
    display: none;
  }
  .dock--responsive .dock-item {
    flex: none;
    padding: var(--mg-space-2);
  }
}
</style>
