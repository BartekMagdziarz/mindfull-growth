<template>
  <section class="neo-raised flex flex-col gap-[18px]" style="padding: 24px">
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
          <span class="text-[28px] font-bold" style="color: var(--mg-color-primary-strong)">{{
            streak
          }}</span>
          <span class="text-[13px]" style="color: var(--mg-color-muted)">
            {{ t('profile.account.activity.summary', { streak, entries: journalEntryCount }) }}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="neo-pill px-3 py-2 text-[12px] font-semibold gap-[6px]"
        @click="onComingSoon"
      >
        <AppIcon class="material-symbols-outlined text-[16px]" name="target" />
        {{ t('profile.account.activity.cta') }}
      </button>
    </div>

    <div class="zb-divider" />

    <!-- Section: Security & data -->
    <div>
      <span class="zb-label">{{ t('profile.account.security.title') }}</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mt-[10px]">
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px"
          @click="onComingSoon"
        >
          <AppIcon class="material-symbols-outlined text-[18px]" name="key" />
          {{ t('profile.account.security.changePassword') }}
        </button>
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px"
          :disabled="backupBusy"
          @click="exportData"
        >
          <AppIcon class="material-symbols-outlined text-[18px]" name="download" />
          {{ t('profile.account.security.exportData') }}
        </button>
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px"
          :disabled="backupBusy"
          @click="backupInput?.click()"
        >
          <AppIcon class="material-symbols-outlined text-[18px]" name="upload" />
          {{ t('profile.account.security.importData') }}
        </button>
        <input
          ref="backupInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          :aria-label="t('profile.account.security.importData')"
          @change="selectBackup"
        />
        <button
          type="button"
          class="neo-control text-[13px]"
          style="min-height: 40px; color: rgb(var(--status-warn))"
          @click="onComingSoon"
        >
          <AppIcon class="material-symbols-outlined text-[18px]" name="delete" />
          {{ t('profile.account.security.deleteAccount') }}
        </button>
      </div>
    </div>
    <p class="text-[12px] mt-2">{{ t('profile.account.security.backupHint') }}</p>
    <AppDialog
      v-model="confirmRestore"
      :title="t('profile.account.security.importTitle')"
      :message="t('profile.account.security.importMessage', { count: backupCount })"
      :confirm-text="t('profile.account.security.importConfirm')"
      @confirm="restoreData"
      @cancel="pendingBackup = null"
    />
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import AppDialog from '@/components/AppDialog.vue'
import {
  createUserBackup,
  parseUserBackup,
  restoreUserBackup,
  MAX_BACKUP_BYTES,
  type UserBackup,
} from '@/services/userBackupService'
import { captureUserSession } from '@/services/userSessionScope'

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

const backupBusy = ref(false)
const backupInput = ref<HTMLInputElement | null>(null)
const confirmRestore = ref(false)
const pendingBackup = ref<UserBackup | null>(null)
let backupScope: ReturnType<typeof captureUserSession> | null = null
const backupCount = computed(() =>
  Object.values(pendingBackup.value?.tables ?? {}).reduce((n, rows) => n + rows.length, 0)
)

async function exportData() {
  if (backupBusy.value) return
  backupBusy.value = true
  try {
    const session = captureUserSession()
    const backup = await session.wait(createUserBackup())
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `mindfull-growth-${backup.exportedAt.slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    props.showSnackbar(t('profile.account.security.exportSuccess'))
  } catch {
    props.showSnackbar(t('profile.account.security.backupError'))
  } finally {
    backupBusy.value = false
  }
}
async function selectBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || backupBusy.value) return
  backupBusy.value = true
  pendingBackup.value = null
  backupScope = captureUserSession()
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup too large')
    pendingBackup.value = parseUserBackup(await backupScope.wait(file.text()))
    confirmRestore.value = true
  } catch {
    props.showSnackbar(t('profile.account.security.backupError'))
  } finally {
    backupBusy.value = false
  }
}
async function restoreData() {
  if (!pendingBackup.value || backupBusy.value) return
  backupBusy.value = true
  try {
    backupScope?.assertCurrent()
    await restoreUserBackup(pendingBackup.value)
    window.location.reload()
  } catch {
    props.showSnackbar(t('profile.account.security.backupError'))
  } finally {
    backupBusy.value = false
    pendingBackup.value = null
  }
}

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
  color: var(--mg-color-muted);
}

.zb-field-value {
  font-size: 16px;
  font-weight: 700;
  margin-top: 4px;
  color: var(--mg-color-ink);
  overflow-wrap: anywhere;
}

.zb-field-value--sm {
  font-size: 14px;
  font-weight: 600;
}

.zb-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(var(--neo-border) / 0.45), transparent);
  margin: 0 1px;
}
</style>
