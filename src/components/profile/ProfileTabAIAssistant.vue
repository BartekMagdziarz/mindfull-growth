<template>
  <section id="ai-settings" class="neo-raised flex flex-col gap-[18px]" style="padding: 24px">
    <!-- Header row -->
    <div class="flex items-start justify-between gap-[14px] flex-wrap">
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold m-0" style="color: var(--mg-color-ink)">
          {{ t('profile.aiSettings.title') }}
        </h3>
        <p class="text-[12px] m-0 mt-[2px] max-w-[500px]" style="color: var(--mg-color-muted)">
          {{ t('profile.aiSettings.description') }}
        </p>
      </div>
      <span
        class="neo-pill px-3 py-[6px] text-[11px] font-bold gap-[6px]"
        :style="{ color: isConnected ? 'rgb(var(--status-good))' : 'rgb(var(--status-warn))' }"
        aria-live="polite"
      >
        <span aria-hidden="true">●</span>
        <span>{{
          isConnected
            ? t('profile.aiSettings.statusConnected')
            : t('profile.aiSettings.statusNotConfigured')
        }}</span>
      </span>
    </div>

    <!-- Fields grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
      <!-- Provider -->
      <div>
        <label for="aiProvider" class="field-label block mb-[6px]">{{
          t('profile.aiSettings.providerLabel')
        }}</label>
        <select
          id="aiProvider"
          v-model="aiProvider"
          class="neo-input w-full px-4 py-3"
          @change="handleProviderChange"
        >
          <option value="openai">{{ t('profile.aiSettings.providers.openai') }}</option>
          <option value="anthropic">{{ t('profile.aiSettings.providers.anthropic') }}</option>
          <option value="ollama">{{ t('profile.aiSettings.providers.ollama') }}</option>
          <option value="mlx">{{ t('profile.aiSettings.providers.mlx') }}</option>
          <option value="custom">{{ t('profile.aiSettings.providers.custom') }}</option>
        </select>
      </div>

      <!-- Model -->
      <div>
        <label for="aiModel" class="field-label block mb-[6px]">{{
          t('profile.aiSettings.modelLabel')
        }}</label>
        <select
          v-if="aiProvider === 'anthropic'"
          id="aiModel"
          v-model="aiModel"
          class="mg-v2-field field-select"
          @change="validateAISettings"
        >
          <option v-for="option in modelOptions(aiModel)" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
        <input
          v-else
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

      <!-- Long-form model (Claude): profile build and profile observations -->
      <div
        v-if="aiProvider === 'anthropic'"
        class="md:col-span-2 grid grid-cols-1 gap-[14px] md:grid-cols-2 md:items-end"
      >
        <div>
          <label for="aiHeavyModel" class="field-label block mb-[6px]">{{
            t('profile.aiSettings.heavyModelLabel')
          }}</label>
          <select id="aiHeavyModel" v-model="heavyModel" class="mg-v2-field field-select">
            <option v-for="option in modelOptions(heavyModel)" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </div>
        <p class="field-hint m-0">{{ t('profile.aiSettings.heavyModelHint') }}</p>
      </div>

      <!-- Reasoning effort (Ollama native think; OpenAI reasoning models; Claude effort) -->
      <div
        v-if="hasReasoningEffort(aiProvider)"
        class="md:col-span-2 grid grid-cols-1 gap-[14px] md:grid-cols-2 md:items-center"
      >
        <div>
          <label for="reasoningEffort" class="field-label block mb-[6px]">{{
            t('profile.aiSettings.reasoningEffortLabel')
          }}</label>
          <select id="reasoningEffort" v-model="reasoningEffort" class="neo-input w-full px-4 py-3">
            <option value="none">{{ t('profile.aiSettings.reasoningEfforts.none') }}</option>
            <option value="low">{{ t('profile.aiSettings.reasoningEfforts.low') }}</option>
            <option value="medium">{{ t('profile.aiSettings.reasoningEfforts.medium') }}</option>
            <option value="high">{{ t('profile.aiSettings.reasoningEfforts.high') }}</option>
          </select>
        </div>
        <p class="text-[12px] m-0" style="color: var(--mg-color-muted)">
          {{
            aiProvider === 'openai'
              ? t('profile.aiSettings.reasoningEffortHintOpenai')
              : aiProvider === 'anthropic'
                ? t('profile.aiSettings.reasoningEffortHintAnthropic')
                : t('profile.aiSettings.reasoningEffortHint')
          }}
        </p>
      </div>

      <!-- Base URL (Claude always uses api.anthropic.com through the SDK) -->
      <div v-if="aiProvider !== 'anthropic'">
        <label for="baseUrl" class="field-label block mb-[6px]">{{
          t('profile.aiSettings.baseUrlLabel')
        }}</label>
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

      <!-- API key -->
      <div>
        <label for="apiKey" class="field-label block mb-[6px]">{{
          t('profile.aiSettings.apiKeyLabel')
        }}</label>
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
        <p v-else class="mt-2 text-[12px]" style="color: var(--mg-color-muted)">
          {{
            aiProvider === 'anthropic'
              ? t('profile.aiSettings.apiKeyHintAnthropic')
              : t('profile.aiSettings.apiKeyHint')
          }}
          <a
            :href="
              aiProvider === 'anthropic'
                ? 'https://platform.claude.com/settings/keys'
                : 'https://platform.openai.com/api-keys'
            "
            target="_blank"
            rel="noopener noreferrer"
            class="hover:underline"
            style="color: var(--mg-color-primary-strong)"
          >
            {{
              aiProvider === 'anthropic'
                ? t('profile.aiSettings.apiKeyHintLinkAnthropic')
                : t('profile.aiSettings.apiKeyHintLink')
            }} </a
          >.
        </p>
      </div>
    </div>

    <!-- Save row -->
    <div class="flex justify-end">
      <AppButton variant="filled" :disabled="!canSave" @click="handleSave">
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
import { ANTHROPIC_HEAVY_MODEL, ANTHROPIC_MODELS } from '@/services/ai/anthropic/client'
import {
  AI_PROVIDER_PRESETS,
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  providerRequiresApiKey,
  type AIProviderId,
  type AIProviderSettings,
  type ReasoningEffort,
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
const heavyModel = ref<string>(ANTHROPIC_HEAVY_MODEL)
const reasoningEffort = ref<ReasoningEffort>('low')
const baseUrlError = ref('')
const modelError = ref('')
const apiKeyError = ref('')
const isSaving = ref(false)

const canSave = computed(() => {
  return (
    aiProvider.value &&
    baseUrl.value.trim().length > 0 &&
    aiModel.value.trim().length > 0 &&
    (!providerRequiresApiKey(aiProvider.value) || apiKey.value.trim().length > 0) &&
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
    value === 'anthropic' ||
    value === 'ollama' ||
    value === 'mlx' ||
    value === 'custom'
  )
}

function hasReasoningEffort(provider: AIProviderId): boolean {
  return provider === 'ollama' || provider === 'openai' || provider === 'anthropic'
}

/** Claude catalog, plus a stored custom id so it is never silently replaced. */
function modelOptions(current: string): ReadonlyArray<{ id: string; label: string }> {
  return ANTHROPIC_MODELS.some(m => m.id === current) || !current
    ? ANTHROPIC_MODELS
    : [...ANTHROPIC_MODELS, { id: current, label: current }]
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
      ...(typeof parsed.heavyModel === 'string' ? { heavyModel: parsed.heavyModel } : {}),
      ...(isReasoningEffort(parsed.reasoningEffort)
        ? { reasoningEffort: parsed.reasoningEffort }
        : {}),
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
  heavyModel.value = settings.heavyModel ?? ANTHROPIC_HEAVY_MODEL
  reasoningEffort.value = settings.reasoningEffort ?? 'low'
  validateAISettings()
}

function validateAISettings() {
  baseUrlError.value = baseUrl.value.trim().length === 0 ? t('profile.aiSettings.baseUrlError') : ''
  modelError.value = aiModel.value.trim().length === 0 ? t('profile.aiSettings.modelError') : ''
  apiKeyError.value =
    !providerRequiresApiKey(aiProvider.value) || apiKey.value.trim().length > 0
      ? ''
      : aiProvider.value === 'anthropic'
        ? t('profile.aiSettings.apiKeyRequiredErrorAnthropic')
        : t('profile.aiSettings.apiKeyRequiredError')
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return value === 'none' || value === 'low' || value === 'medium' || value === 'high'
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
  if (preset.heavyModel) heavyModel.value = preset.heavyModel
  reasoningEffort.value = preset.reasoningEffort ?? 'low'
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
      ...(aiProvider.value === 'anthropic' ? { heavyModel: heavyModel.value } : {}),
      ...(hasReasoningEffort(aiProvider.value) ? { reasoningEffort: reasoningEffort.value } : {}),
    }
    await userSettingsDexieRepository.set(AI_PROVIDER_SETTINGS_KEY, JSON.stringify(settings))
    if (settings.provider === 'openai' && settings.apiKey) {
      await userSettingsDexieRepository.set(LEGACY_OPENAI_API_KEY, settings.apiKey)
    }
    props.showSnackbar(t('profile.aiSettings.saved'))
  } catch (error) {
    const message = error instanceof Error ? error.message : t('profile.aiSettings.saveFailed')
    props.showSnackbar(message)
    console.error('Error saving AI provider settings:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    const existingSettings = await userSettingsDexieRepository.get(AI_PROVIDER_SETTINGS_KEY)
    const parsedSettings = existingSettings ? parseStoredAISettings(existingSettings) : null
    if (parsedSettings) {
      applyAISettings(parsedSettings)
    } else {
      const existingKey = await userSettingsDexieRepository.get(LEGACY_OPENAI_API_KEY)
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
  color: var(--mg-color-muted);
}

/* Same footprint as the neighbouring legacy inputs (px-4 py-3). */
.mg-v2-field.field-select {
  padding: var(--mg-space-3) var(--mg-space-4);
}

.field-hint {
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}

.field-input--error {
  border-color: rgb(var(--color-error) / 0.6);
}
</style>
