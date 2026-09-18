<template>
  <nav :aria-label="t('common.nav.mainNavigation')" class="dock">
    <div class="dock-capsule neo-scroll">
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
/* The dock lives outside the .mg-design-v2 root, so it reads the product
   palette directly and mirrors the V2 ladder: capsule = card (sky-100, the
   only shadow), hover = field (white 45%), active = inner (white 80%). */
.dock {
  --dock-card: rgb(var(--sky-100));
  --dock-field: color-mix(in srgb, white 45%, rgb(var(--sky-100)));
  --dock-inner: color-mix(in srgb, white 80%, rgb(var(--sky-100)));
  --dock-line: rgb(var(--neo-border) / 0.14);
  --dock-shadow:
    -5px -5px 11px rgb(var(--neo-shadow-light) / 0.7),
    5px 5px 11px rgb(var(--neo-shadow-dark) / 0.16);
  --dock-shadow-sm:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.6),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.13);
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  pointer-events: none;
  font-family: 'Nunito', 'Avenir Next', sans-serif;
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
  padding: 12px;
  pointer-events: auto;
  border: 1px solid var(--dock-line);
  /* Hand-drawn capsule: uneven corners like the V2 cards. */
  border-radius: 34px 27px 32px 25px;
  background: var(--dock-card);
  box-shadow: var(--dock-shadow);
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
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  background: rgb(var(--color-primary-strong));
  color: rgb(var(--neo-accent-text));
  transform: rotate(-4deg);
}

.dock-title-label {
  font-size: 0.9rem;
  font-weight: 800;
  color: rgb(var(--color-on-surface));
}

/* Pencil separator: a faint dashed line instead of a hairline. */
.dock-sep {
  flex: none;
  height: 0;
  margin: 6px 10px;
  border-top: 1px dashed rgb(var(--neo-border) / 0.55);
}

.dock-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  height: 44px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 17px 14px 18px 15px;
  color: rgb(var(--neo-muted));
  font-size: 0.875rem;
  font-weight: 700;
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
  color: rgb(var(--color-on-surface));
  background: var(--dock-field);
}

/* Current section = inner step, slightly lifted and tilted like the current
   unit in the rhythm calendar axis. */
.dock-item--active {
  color: rgb(var(--color-primary-strong));
  background: var(--dock-inner);
  border-color: var(--dock-line);
  box-shadow: var(--dock-shadow-sm);
  transform: rotate(-0.8deg);
}

.dock-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(var(--sky-400) / 0.42);
}

/* Icons inside controls follow the app accent — never ink/grey. */
.dock-item-icon {
  flex: none;
  width: 24px;
  text-align: center;
  font-size: 22px;
  color: rgb(var(--color-primary));
}

.dock-item--active .dock-item-icon {
  color: rgb(var(--color-primary-strong));
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
</style>
