<template>
  <section
    class="neo-raised flex flex-col gap-[18px]"
    style="padding: 24px"
  >
    <!-- Section: Account details -->
    <div>
      <span class="zb-label">{{ t('profile.account.sectionLabel') }}</span>
      <div class="grid grid-cols-2 gap-3 mt-[10px]">
        <div class="neo-inset" style="padding: 14px">
          <div class="zb-field-label">{{ t('profile.account.fields.name') }}</div>
          <div class="zb-field-value">{{ displayName || username || '—' }}</div>
        </div>
        <div class="neo-inset" style="padding: 14px">
          <div class="zb-field-label">{{ t('profile.account.fields.username') }}</div>
          <div class="zb-field-value">@{{ username || '—' }}</div>
        </div>
        <div class="neo-inset" style="padding: 14px">
          <div class="zb-field-label">{{ t('profile.account.fields.email') }}</div>
          <div class="zb-field-value zb-field-value--sm">
            {{ t('profile.headerStrip.fallbackEmail') }}
          </div>
        </div>
        <div class="neo-inset" style="padding: 14px">
          <div class="zb-field-label">{{ t('profile.account.fields.createdAt') }}</div>
          <div class="zb-field-value zb-field-value--sm">{{ createdAtLabel }}</div>
        </div>
      </div>
    </div>

    <div class="zb-divider" />

    <!-- Section: Activity -->
    <div class="flex items-center justify-between gap-[14px]">
      <div>
        <span class="zb-label">{{ t('profile.account.activity.title') }}</span>
        <div class="flex items-baseline gap-2 mt-[6px]">
          <span
            class="text-[28px] font-bold"
            style="color: rgb(var(--neo-focus))"
          >{{ streak }}</span>
          <span class="text-[13px]" style="color: rgb(var(--neo-muted))">
            {{ t('profile.account.activity.summary', { streak, entries: journalEntryCount }) }}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="neo-pill px-3 py-2 text-[12px] font-semibold gap-[6px]"
        @click="onComingSoon"
      >
        <span class="material-symbols-outlined text-[16px]">target</span>
        {{ t('profile.account.activity.cta') }}
      </button>
    </div>

    <div class="zb-divider" />

    <!-- Section: Security & data -->
    <div>
      <span class="zb-label">{{ t('profile.account.security.title') }}</span>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-[10px] mt-[10px]">
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px"
          @click="onComingSoon"
        >
          <span class="material-symbols-outlined text-[18px]">key</span>
          {{ t('profile.account.security.changePassword') }}
        </button>
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px"
          @click="onComingSoon"
        >
          <span class="material-symbols-outlined text-[18px]">download</span>
          {{ t('profile.account.security.exportData') }}
        </button>
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px; color: rgb(var(--status-warn))"
          @click="onComingSoon"
        >
          <span class="material-symbols-outlined text-[18px]">delete</span>
          {{ t('profile.account.security.deleteAccount') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { useT } from '@/composables/useT'

const props = defineProps<{
  showSnackbar: (message: string) => void
}>()

const { t, locale } = useT()
const authStore = useAuthStore()

const username = computed(() => authStore.user?.username ?? '')
const displayName = computed(() => authStore.user?.displayName ?? '')

const createdAtIso = ref<string | undefined>(undefined)

const createdAtLabel = computed(() => {
  if (!createdAtIso.value) return t('profile.account.fields.unknownCreatedAt')
  try {
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'long',
    }).format(new Date(createdAtIso.value))
  } catch {
    return t('profile.account.fields.unknownCreatedAt')
  }
})

// TODO: wire to real streak / journal entry count once data exists in stores.
// For now these remain at 0 so the layout renders without faking data.
const streak = ref(0)
const journalEntryCount = ref(0)

function onComingSoon() {
  props.showSnackbar(t('profile.account.security.comingSoon'))
}

onMounted(async () => {
  const userId = authStore.user?.id
  if (!userId) return
  try {
    const user = await authDexieRepository.getUserById(userId)
    if (user) createdAtIso.value = user.createdAt
  } catch (error) {
    console.error('Error loading account details:', error)
  }
})
</script>

<style scoped>
.zb-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-on-surface-variant));
}

.zb-field-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
}

.zb-field-value {
  font-size: 16px;
  font-weight: 700;
  margin-top: 4px;
  color: rgb(var(--neo-text));
  overflow-wrap: anywhere;
}

.zb-field-value--sm {
  font-size: 14px;
  font-weight: 600;
}

.zb-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--neo-border) / 0.45),
    transparent
  );
  margin: 0 1px;
}
</style>
