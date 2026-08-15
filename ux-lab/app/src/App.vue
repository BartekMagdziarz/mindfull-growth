<template>
  <RouterView v-if="route.meta.standalone" />
  <div v-else class="lab-shell" :class="{ 'lab-shell--notes': notesVisible, 'lab-shell--nav-open': mobileNavOpen }">
    <a class="skip-link" href="#lab-content">Przejdź do treści</a>
    <button class="lab-nav-backdrop" type="button" aria-label="Zamknij nawigację" @click="mobileNavOpen = false" />

    <aside class="lab-sidebar" aria-label="Scenariusze UX Lab">
      <RouterLink class="lab-brand" to="/research" @click="mobileNavOpen = false">
        <span class="lab-brand__mark"><AppIcon name="spa" /></span>
        <span><strong>UX Lab</strong><small>Mindful Growth</small></span>
      </RouterLink>

      <nav class="lab-nav">
        <section v-for="group in navGroups" :key="group.id" class="lab-nav__group">
          <p>{{ group.label }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.id"
            :to="item.path"
            class="lab-nav__link"
            :class="{ 'lab-nav__link--active': activeItem.id === item.id }"
            @click="mobileNavOpen = false"
          >
            <AppIcon :name="item.icon" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>

      <footer class="lab-sidebar__footer">
        <span class="lab-status-dot" />
        <span><strong>Izolowany workbench</strong><small>{{ labStore.fixtureLabel }}</small></span>
      </footer>
    </aside>

    <div class="lab-main">
      <header class="lab-topbar">
        <div class="lab-topbar__title">
          <button class="lab-menu-button" type="button" aria-label="Otwórz nawigację" @click="mobileNavOpen = true">
            <AppIcon name="menu" />
          </button>
          <span><small>{{ activeItem.kicker }}</small><strong>{{ activeItem.label }}</strong></span>
        </div>
        <label class="notes-switch">
          <input type="checkbox" :checked="notesVisible" @change="toggleNotes" />
          <span class="notes-switch__track"><span /></span>
          <span>Pokaż notatki UX</span>
        </label>
      </header>

      <main id="lab-content" class="lab-content">
        <RouterView />
      </main>
    </div>

    <UXNotes :scenario-id="scenarioId" :visible="notesVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import UXNotes from '~lab/components/UXNotes.vue'
import { findNavItem, navGroups } from '~lab/lab/registry'
import { useLabStore } from '~lab/stores/lab.store'

const route = useRoute()
const router = useRouter()
const labStore = useLabStore()
const mobileNavOpen = ref(false)
const activeItem = computed(() => findNavItem(route.path))
const notesVisible = computed(() => route.query.notes !== '0')
const scenarioId = computed(() => {
  if (route.path.startsWith('/views/')) return String(route.params.viewId ?? 'today')
  return String(route.meta.scenarioId ?? activeItem.value.id)
})

function toggleNotes(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  void router.replace({ query: { ...route.query, notes: checked ? undefined : '0' } })
}
</script>
