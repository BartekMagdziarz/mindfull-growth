<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-container">
    <div class="w-full max-w-md">
      <AppCard>
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-on-surface mb-2">Welcome Back</h1>
          <p class="text-on-surface-variant">Sign in to continue to Mindfull Growth</p>
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
              :disabled="isLoading || isLockedOut"
              class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
              placeholder="Enter your username"
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
              autocomplete="current-password"
              required
              :disabled="isLoading || isLockedOut"
              class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors disabled:opacity-50"
              placeholder="Enter your password"
            />
          </div>

          <!-- Error message -->
          <div v-if="error" class="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
            {{ error }}
          </div>

          <!-- Submit button -->
          <AppButton
            type="submit"
            variant="filled"
            :disabled="!canSubmit"
            class="w-full"
          >
            <span v-if="isLoading">Signing in...</span>
            <span v-else-if="isLockedOut">Try again in {{ lockoutSeconds }}s</span>
            <span v-else>Sign In</span>
          </AppButton>
        </form>

        <!-- Sign up link -->
        <div class="mt-6 text-center">
          <p class="text-on-surface-variant">
            Don't have an account?
            <router-link to="/signup" class="text-primary font-medium hover:underline">
              Sign up
            </router-link>
          </p>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')

const isLoading = computed(() => authStore.isLoading)
const isLockedOut = computed(() => authStore.isLockedOut)
const lockoutSeconds = computed(() => authStore.lockoutRemainingSeconds)
const error = computed(() => authStore.error)

const canSubmit = computed(() => {
  return (
    username.value.trim().length > 0 &&
    password.value.length > 0 &&
    !isLoading.value &&
    !isLockedOut.value
  )
})

async function handleSubmit() {
  if (!canSubmit.value) return

  const success = await authStore.login(username.value, password.value)

  if (success) {
    // Redirect to intended destination or home
    const redirect = route.query.redirect as string | undefined
    router.push(redirect || '/today')
  }
}
</script>
