<template>
  <section class="mg-v2-surface mg-v2-surface--raised-sm flex flex-col gap-5" style="padding: 24px">
    <!-- Theme picker -->
    <div>
      <h3 class="text-base font-bold m-0" style="color: var(--mg-color-ink)">
        {{ t('profile.appearance.colorTheme') }}
      </h3>
      <p class="text-mg-xs m-0 mt-[2px]" style="color: var(--mg-color-muted)">
        {{ t('profile.appearance.description') }} {{ t('profile.appearance.themeHint') }}
      </p>

      <div class="flex flex-wrap gap-[10px] mt-[12px]">
        <button
          v-for="opt in themeOptions"
          :key="opt.id"
          type="button"
          class="theme-card mg-v2-surface mg-v2-surface--raised-sm"
          :class="{ 'theme-card--active': themePreference === opt.id }"
          :aria-pressed="themePreference === opt.id"
          :aria-label="opt.label"
          @click="onThemeChange(opt.id)"
        >
          <span class="theme-card__swatch" :style="{ background: opt.gradient }" />
          <span class="theme-card__label">{{ opt.label }}</span>
          <AppIcon
            v-if="themePreference === opt.id"
            class="material-symbols-outlined theme-card__check"
            aria-hidden="true"
            name="check"
          />
        </button>
      </div>
    </div>

    <div class="zb-divider" />

    <!-- Language + Grammatical gender, 2-column -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Language -->
      <div>
        <h3 class="text-mg-sm font-bold m-0 mb-1" style="color: var(--mg-color-ink)">
          {{ t('profile.language.label') }}
        </h3>
        <p class="text-mg-xs m-0 mb-[10px]" style="color: var(--mg-color-muted)">
          {{ t('profile.language.description') }}
        </p>
        <div
          class="mg-v2-segmented w-full"
          role="radiogroup"
          :aria-label="t('profile.language.label')"
        >
          <button
            v-for="opt in languageOptions"
            :key="opt.id"
            type="button"
            role="radio"
            :aria-checked="languagePreference === opt.id"
            @click="onLanguageChange(opt.id)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Grammatical gender -->
      <div>
        <h3 class="text-mg-sm font-bold m-0 mb-1" style="color: var(--mg-color-ink)">
          {{ t('profile.gender.label') }}
        </h3>
        <p class="text-mg-xs m-0 mb-[10px]" style="color: var(--mg-color-muted)">
          {{ t('profile.gender.description') }}
        </p>
        <div
          class="mg-v2-segmented w-full"
          role="radiogroup"
          :aria-label="t('profile.gender.label')"
        >
          <button
            v-for="opt in genderOptions"
            :key="opt.id"
            type="button"
            role="radio"
            :aria-checked="genderPreference === opt.id"
            @click="onGenderChange(opt.id)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

import { computed, onMounted, ref } from 'vue'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { applyTheme, type ThemeId } from '@/services/themeService'
import type { LocaleId, GrammaticalGender } from '@/services/localeService'
import { useT } from '@/composables/useT'

const props = defineProps<{
  showSnackbar: (message: string) => void
}>()

const { t } = useT()
const userPreferencesStore = useUserPreferencesStore()

const themePreference = ref<ThemeId>(userPreferencesStore.themePreference)
const languagePreference = ref<LocaleId>(userPreferencesStore.locale)
const genderPreference = ref<GrammaticalGender>(userPreferencesStore.grammaticalGender)

const themeOptions = computed(() => [
  {
    id: 'current' as ThemeId,
    label: t('profile.appearance.themes.current'),
    gradient: 'var(--mg-theme-swatch-current)',
  },
  {
    id: 'sky-mist' as ThemeId,
    label: t('profile.appearance.themes.skyMist'),
    gradient: 'var(--mg-theme-swatch-sky-mist)',
  },
  {
    id: 'sunrise-cloud' as ThemeId,
    label: t('profile.appearance.themes.sunriseCloud'),
    gradient: 'var(--mg-theme-swatch-sunrise-cloud)',
  },
])

const languageOptions = computed(() => [
  { id: 'pl' as LocaleId, label: t('profile.language.locales.pl') },
  { id: 'en' as LocaleId, label: t('profile.language.locales.en') },
])

const genderOptions = computed(() => [
  { id: 'masculine' as GrammaticalGender, label: t('profile.gender.options.masculine') },
  { id: 'feminine' as GrammaticalGender, label: t('profile.gender.options.feminine') },
])

async function onThemeChange(next: ThemeId) {
  if (themePreference.value === next) return
  const previous = themePreference.value
  themePreference.value = next
  applyTheme(next)
  try {
    await userPreferencesStore.setThemePreference(next)
    props.showSnackbar(t('profile.feedback.themeUpdated'))
  } catch (error) {
    console.error('Error saving theme preference:', error)
    themePreference.value = previous
    applyTheme(previous)
    props.showSnackbar(t('profile.feedback.failedToSave'))
  }
}

async function onLanguageChange(next: LocaleId) {
  if (languagePreference.value === next) return
  const previous = languagePreference.value
  languagePreference.value = next
  try {
    await userPreferencesStore.setLocale(next)
    props.showSnackbar(t('profile.feedback.languageUpdated'))
  } catch (error) {
    console.error('Error saving language preference:', error)
    languagePreference.value = previous
    props.showSnackbar(t('profile.feedback.failedToSave'))
  }
}

async function onGenderChange(next: GrammaticalGender) {
  if (genderPreference.value === next) return
  const previous = genderPreference.value
  genderPreference.value = next
  try {
    await userPreferencesStore.setGrammaticalGender(next)
    props.showSnackbar(t('profile.feedback.genderUpdated'))
  } catch (error) {
    console.error('Error saving gender preference:', error)
    genderPreference.value = previous
    props.showSnackbar(t('profile.feedback.failedToSave'))
  }
}

onMounted(async () => {
  // Preferences may not be loaded yet when this tab mounts (shell loads them
  // asynchronously). Trigger load once, then resync local refs.
  await userPreferencesStore.loadPreferences()
  themePreference.value = userPreferencesStore.themePreference
  languagePreference.value = userPreferencesStore.locale
  genderPreference.value = userPreferencesStore.grammaticalGender
})
</script>

<style scoped>
.zb-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(var(--neo-border) / 0.45), transparent);
  margin: 0 1px;
}

.theme-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
  padding: 10px 14px;
  border-radius: var(--mg-radius-md);
  cursor: pointer;
  font-family: inherit;
  color: var(--mg-color-ink);
  transition:
    box-shadow 220ms ease,
    background-color 220ms ease,
    border-color 220ms ease;
}

/* Tile grammar: hover = mist, the picked theme sits pressed with the accent edge. */
.theme-card:hover:not(.theme-card--active) {
  background: var(--mg-color-mist);
}

.theme-card--active {
  border-color: var(--mg-color-primary);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-inset-sm);
}

.theme-card__swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--mg-radius-pill);
  flex-shrink: 0;
  box-shadow: var(--mg-shadow-raised-sm);
}

.theme-card__label {
  font-size: var(--mg-font-size-sm);
  font-weight: 600;
  flex: 1;
  text-align: left;
}

.theme-card__check {
  font-size: var(--mg-font-size-icon-md);
  color: var(--mg-color-primary-strong);
  margin-left: auto;
}
</style>
