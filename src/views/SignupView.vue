<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-container">
    <div class="w-full max-w-md">
      <AppCard>
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-on-surface mb-2">Create Account</h1>
          <p class="text-on-surface-variant">Start your mindfulness journey</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-on-surface mb-2">
              Username
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              required
              :disabled="isLoading"
              class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
              placeholder="Choose a username"
            />
            <p class="mt-1 text-xs text-on-surface-variant">At least 3 characters</p>
          </div>

          <!-- Display Name (Optional) -->
          <div>
            <label for="displayName" class="block text-sm font-medium text-on-surface mb-2">
              Display Name
              <span class="text-on-surface-variant font-normal">(optional)</span>
            </label>
            <input
              id="displayName"
              v-model="displayName"
              type="text"
              autocomplete="name"
              :disabled="isLoading"
              class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
              placeholder="How should we call you?"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-on-surface mb-2">
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              :disabled="isLoading"
              class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
              placeholder="Create a password"
            />
            <p class="mt-1 text-xs text-on-surface-variant">At least 6 characters</p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-on-surface mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              :disabled="isLoading"
              :class="[
                'w-full px-4 py-3 rounded-xl border-2 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 transition-colors disabled:opacity-50',
                passwordMismatch
                  ? 'border-error focus:ring-error'
                  : 'border-outline/30 focus:ring-focus'
              ]"
              placeholder="Confirm your password"
            />
            <p v-if="passwordMismatch" class="mt-1 text-xs text-error">
              Passwords do not match
            </p>
          </div>

          <!-- Error message -->
          <div v-if="error" class="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
            {{ error }}
          </div>

          <!-- Warning about password recovery -->
          <div class="p-3 rounded-lg bg-tertiary-container text-on-tertiary-container text-sm">
            <strong>Note:</strong> This app works entirely offline. There is no password recovery.
            If you forget your password, your data cannot be recovered.
          </div>

          <!-- Submit button -->
          <AppButton
            type="submit"
            variant="filled"
            :disabled="!canSubmit"
            class="w-full"
          >
            <span v-if="isLoading">Creating account...</span>
            <span v-else>Create Account</span>
          </AppButton>
        </form>

        <!-- Login link -->
        <div class="mt-6 text-center">
          <p class="text-on-surface-variant">
            Already have an account?
            <router-link to="/login" class="text-primary font-medium hover:underline">
              Sign in
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
