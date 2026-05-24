<template>
  <section
    id="ai-settings"
    class="neo-raised flex flex-col gap-[18px]"
    style="padding: 24px"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between gap-[14px] flex-wrap">
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold m-0" style="color: rgb(var(--neo-text))">
          {{ t('profile.aiSettings.title') }}
        </h3>
        <p
          class="text-[12px] m-0 mt-[2px] max-w-[500px]"
          style="color: rgb(var(--neo-muted))"
        >
          {{ t('profile.aiSettings.description') }}
        </p>
      </div>
      <span
        class="neo-pill px-3 py-[6px] text-[11px] font-bold gap-[6px]"
        :style="{ color: isConnected
          ? 'rgb(var(--status-good))'
          : 'rgb(var(--status-warn))' }"
        aria-live="polite"
      >
        <span aria-hidden="true">●</span>
        <span>{{ isConnected
          ? t('profile.aiSettings.statusConnected')
          : t('profile.aiSettings.statusNotConfigured') }}</span>
      </span>
    </div>

    <!-- Fields grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
      <!-- Provider -->
      <div>
        <label
          for="aiProvider"
          class="field-label block mb-[6px]"
        >{{ t('profile.aiSettings.providerLabel') }}</label>
        <select
          id="aiProvider"
          v-model="aiProvider"
          class="neo-input w-full px-4 py-3"
          @change="handleProviderChange"
        >
          <option value="openai">{{ t('profile.aiSettings.providers.openai') }}</option>
          <option value="ollama">{{ t('profile.aiSettings.providers.ollama') }}</option>
          <option value="mlx">{{ t('profile.aiSettings.providers.mlx') }}</option>
          <option value="custom">{{ t('profile.aiSettings.providers.custom') }}</option>
        </select>
      </div>

      <!-- Model -->
      <div>
        <label
          for="aiModel"
          class="field-label block mb-[6px]"
        >{{ t('profile.aiSettings.modelLabel') }}</label>
        <input
          id="aiModel"
          v-model="aiModel"
          type="text"
          :placeholder="t('profile.aiSettings.modelPlaceholder')"
          class="neo-input w-full px-4 py-3"
          :class="{ 'field-input--error': modelError }"
          @input="validateAISettings"
        />
        <p v-if="modelError" class="mt-2 text-[12px]" style="color: rgb(var(--color-error))">
          {{ modelError }}
        </p>
      </div>

      <!-- Base URL (full width) -->
      <div class="md:col-span-2">
        <label
          for="baseUrl"
          class="field-label block mb-[6px]"
        >{{ t('profile.aiSettings.baseUrlLabel') }}</label>
        <input
          id="baseUrl"
          v-model="baseUrl"
          type="url"
          :placeholder="t('profile.aiSettings.baseUrlPlaceholder')"
          class="neo-input w-full px-4 py-3"
          :class="{ 'field-input--error': baseUrlError }"
          @input="validateAISettings"
        />
        <p v-if="baseUrlError" class="mt-2 text-[12px]" style="color: rgb(var(--color-error))">
          {{ baseUrlError }}
        </p>
      </div>

      <!-- API key (full width) -->
      <div class="md:col-span-2">
        <label
          for="apiKey"
          class="field-label block mb-[6px]"
        >{{ t('profile.aiSettings.apiKeyLabel') }}</label>
        <div class="flex gap-2">
          <input
            id="apiKey"
            v-model="apiKey"
            type="password"
            :placeholder="t('profile.aiSettings.apiKeyPlaceholder')"
            class="neo-input flex-1 px-4 py-3"
            :class="{ 'field-input--error': apiKeyError }"
            @input="validateAISettings"
          />
        </div>
        <p v-if="apiKeyError" class="mt-2 text-[12px]" style="color: rgb(var(--color-error))">
          {{ apiKeyError }}
        </p>
        <p v-else class="mt-2 text-[12px]" style="color: rgb(var(--neo-muted))">
          {{ t('profile.aiSettings.apiKeyHint') }}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline"
            style="color: rgb(var(--neo-focus))"
          >
            {{ t('profile.aiSettings.apiKeyHintLink') }}
          </a>.
        </p>
      </div>
    </div>

    <!-- Save row -->
    <div class="flex justify-end">
      <AppButton
        variant="filled"
        :disabled="!canSave"
        @click="handleSave"
      >
        <span v-if="isSaving">{{ t('common.saving') }}</span>
        <span v-else>{{ t('common.buttons.save') }}</span>
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import {
  AI_PROVIDER_PRESETS,
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  type AIProviderId,
  type AIProviderSettings,
} from '@/services/llmService'
import { useT } from '@/composables/useT'

const props = defineProps<{
  showSnackbar: (message: string) => void
}>()

const { t } = useT()

const aiProvider = ref<AIProviderId>('openai')
const baseUrl = ref(AI_PROVIDER_PRESETS.openai.baseUrl)
const aiModel = ref(AI_PROVIDER_PRESETS.openai.model)
const apiKey = ref('')
const baseUrlError = ref('')
const modelError = ref('')
const apiKeyError = ref('')
const isSaving = ref(false)

const canSave = computed(() => {
  return (
    aiProvider.value &&
    baseUrl.value.trim().length > 0 &&
    aiModel.value.trim().length > 0 &&
    (aiProvider.value !== 'openai' || apiKey.value.trim().length > 0) &&
    !baseUrlError.value &&
    !modelError.value &&
    !apiKeyError.value &&
    !isSaving.value
  )
})

const isConnected = computed(() => canSave.value)

function isAIProviderId(value: unknown): value is AIProviderId {
  return (
    value === 'openai' ||
    value === 'ollama' ||
    value === 'mlx' ||
    value === 'custom'
  )
}

function parseStoredAISettings(raw: string): AIProviderSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AIProviderSettings>
    if (
      !isAIProviderId(parsed.provider) ||
      typeof parsed.baseUrl !== 'string' ||
      typeof parsed.model !== 'string'
    ) {
      return null
    }
    return {
      provider: parsed.provider,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      ...(typeof parsed.apiKey === 'string' ? { apiKey: parsed.apiKey } : {}),
    }
  } catch {
    return null
  }
}

function applyAISettings(settings: AIProviderSettings) {
  aiProvider.value = settings.provider
  baseUrl.value = settings.baseUrl
  aiModel.value = settings.model
  apiKey.value = settings.apiKey ?? ''
  validateAISettings()
}

function validateAISettings() {
  baseUrlError.value =
    baseUrl.value.trim().length === 0
      ? t('profile.aiSettings.baseUrlError')
      : ''
  modelError.value =
    aiModel.value.trim().length === 0
      ? t('profile.aiSettings.modelError')
      : ''
  apiKeyError.value =
    aiProvider.value === 'openai' && apiKey.value.trim().length === 0
      ? t('profile.aiSettings.apiKeyRequiredError')
      : ''
}

function handleProviderChange() {
  if (aiProvider.value === 'custom') {
    if (!baseUrl.value.trim()) baseUrl.value = AI_PROVIDER_PRESETS.mlx.baseUrl
    validateAISettings()
    return
  }

  const preset = AI_PROVIDER_PRESETS[aiProvider.value]
  baseUrl.value = preset.baseUrl
  aiModel.value = preset.model
  validateAISettings()
}

async function handleSave() {
  if (!canSave.value) return

  isSaving.value = true
  try {
    const settings: AIProviderSettings = {
      provider: aiProvider.value,
      baseUrl: baseUrl.value.trim(),
      model: aiModel.value.trim(),
      ...(apiKey.value.trim() ? { apiKey: apiKey.value.trim() } : {}),
    }
    await userSettingsDexieRepository.set(
      AI_PROVIDER_SETTINGS_KEY,
      JSON.stringify(settings),
    )
    if (settings.provider === 'openai' && settings.apiKey) {
      await userSettingsDexieRepository.set(
        LEGACY_OPENAI_API_KEY,
        settings.apiKey,
      )
    }
    props.showSnackbar(t('profile.aiSettings.saved'))
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : t('profile.aiSettings.saveFailed')
    props.showSnackbar(message)
    console.error('Error saving AI provider settings:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    const existingSettings = await userSettingsDexieRepository.get(
      AI_PROVIDER_SETTINGS_KEY,
    )
    const parsedSettings = existingSettings
      ? parseStoredAISettings(existingSettings)
      : null
    if (parsedSettings) {
      applyAISettings(parsedSettings)
    } else {
      const existingKey = await userSettingsDexieRepository.get(
        LEGACY_OPENAI_API_KEY,
      )
      applyAISettings({
        ...AI_PROVIDER_PRESETS.openai,
        ...(existingKey ? { apiKey: existingKey } : {}),
      })
    }
  } catch (error) {
    console.error('Error loading AI settings:', error)
  }
})
</script>

<style scoped>
.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
}

.field-input--error {
  border-color: rgb(var(--color-error) / 0.6);
}
</style>
