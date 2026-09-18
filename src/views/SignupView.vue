<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <AppCard variant="raised-strong" padding="lg" class="mg-v2-surface--sheet">
        <div class="text-center mb-8">
          <span class="mg-v2-page-head__eyebrow">{{ t('common.appName') }}</span>
          <h1 class="auth-title">{{ t('auth.signup.title') }}</h1>
          <p class="auth-lead">{{ t('auth.signup.subtitle') }}</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Username -->
          <div>
            <label for="username" class="mg-v2-field-wrap__label block mb-2">
              {{ t('auth.signup.username') }}
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              required
              :disabled="isLoading"
              class="mg-v2-field disabled:opacity-50"
              :placeholder="t('auth.signup.usernamePlaceholder')"
            />
            <p class="mt-1 text-xs text-on-surface-variant">{{ t('auth.signup.usernameHint') }}</p>
          </div>

          <!-- Display Name (Optional) -->
          <div>
            <label for="displayName" class="mg-v2-field-wrap__label block mb-2">
              {{ t('auth.signup.displayName') }}
              <span class="text-on-surface-variant font-normal">{{ t('auth.signup.displayNameOptional') }}</span>
            </label>
            <input
              id="displayName"
              v-model="displayName"
              type="text"
              autocomplete="name"
              :disabled="isLoading"
              class="mg-v2-field disabled:opacity-50"
              :placeholder="t('auth.signup.displayNamePlaceholder')"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="mg-v2-field-wrap__label block mb-2">
              {{ t('auth.signup.password') }}
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              :disabled="isLoading"
              class="mg-v2-field disabled:opacity-50"
              :placeholder="t('auth.signup.passwordPlaceholder')"
            />
            <p class="mt-1 text-xs text-on-surface-variant">{{ t('auth.signup.passwordHint') }}</p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="mg-v2-field-wrap__label block mb-2">
              {{ t('auth.signup.confirmPassword') }}
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              :disabled="isLoading"
              :class="[
                'mg-v2-field disabled:opacity-50',
                passwordMismatch
                  ? 'border-error focus:ring-error'
                  : ''
              ]"
              :placeholder="t('auth.signup.confirmPasswordPlaceholder')"
            />
            <p v-if="passwordMismatch" class="mt-1 text-xs text-error">
              {{ t('auth.signup.passwordMismatch') }}
            </p>
          </div>

          <!-- Error message -->
          <div v-if="error" class="mg-v2-pill mg-v2-pill--danger auth-error">
            {{ error }}
          </div>

          <!-- Warning about password recovery -->
          <div class="p-3 rounded-lg bg-tertiary-container text-on-tertiary-container text-sm">
            <strong>{{ t('auth.signup.offlineWarningNote') }}</strong> {{ t('auth.signup.offlineWarning') }}
          </div>

          <!-- Submit button -->
          <AppButton
            type="submit"
            variant="filled"
            :disabled="!canSubmit"
            class="w-full"
          >
            <span v-if="isLoading">{{ t('auth.signup.creatingAccount') }}</span>
            <span v-else>{{ t('auth.signup.createAccount') }}</span>
          </AppButton>
        </form>

        <!-- Login link -->
        <div class="mt-6 text-center">
          <p class="text-on-surface-variant">
            {{ t('auth.signup.hasAccount') }}
            <router-link to="/login" class="text-primary font-medium hover:underline">
              {{ t('auth.signup.signInLink') }}
            </router-link>
          </p>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'

const { t } = useT()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')

const isLoading = computed(() => authStore.isLoading)
const error = computed(() => authStore.error)

const passwordMismatch = computed(() => {
  return confirmPassword.value.length > 0 && password.value !== confirmPassword.value
})

const canSubmit = computed(() => {
  return (
    username.value.trim().length >= 3 &&
    password.value.length >= 6 &&
    password.value === confirmPassword.value &&
    !isLoading.value
  )
})

async function handleSubmit() {
  if (!canSubmit.value) return

  const success = await authStore.signup(
    username.value,
    password.value,
    displayName.value || undefined
  )

  if (success) {
    router.push('/today')
  }
}
</script>

<style scoped>
.auth-title {
  margin: var(--mg-space-1) 0 var(--mg-space-2);
  font-size: var(--mg-font-size-2xl);
  font-weight: 900;
  letter-spacing: -0.01em;
}

.auth-lead {
  margin: 0;
  color: var(--mg-color-muted);
}

.auth-error {
  display: flex;
  min-height: 2.5rem;
  padding: var(--mg-space-2) var(--mg-space-3);
  border-radius: var(--mg-radius-sm);
  white-space: normal;
}
</style>
