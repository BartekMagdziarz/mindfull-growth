<template>
  <div class="space-y-6">
    <!-- Title row: Icon + Name + Color -->
    <div>
      <label for="area-name" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.nameLabel') }}
      </label>
      <div class="neo-input flex items-center gap-2 px-2 py-1.5">
        <IconPicker
          v-model="form.icon"
          icon-size="lg"
          compact
          minimal
          :allow-clear="true"
          :preview-color="form.color"
          :aria-label="t('lifeAreas.form.iconAriaLabel')"
        />
        <input
          id="area-name"
          v-model="form.name"
          type="text"
          :placeholder="t('lifeAreas.form.namePlaceholder')"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-base text-on-surface outline-none placeholder:text-on-surface-variant/50"
        />
        <ColorSwatchPicker
          v-model="form.color"
          :presets="colorPresets"
          :title="t('lifeAreas.form.colorLabel')"
          :aria-label="t('lifeAreas.form.colorAriaLabel')"
          :clear-label="t('lifeAreas.form.clearColor')"
        />
      </div>
    </div>

    <!-- Meaning -->
    <div>
      <label for="area-meaning" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.meaningLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-1">
        {{ t('lifeAreas.form.meaningHelper') }}
      </p>
      <textarea
        id="area-meaning"
        ref="meaningRef"
        v-model="form.meaning"
        rows="3"
        :placeholder="t('lifeAreas.form.meaningPlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none overflow-hidden min-h-[5.5rem]"
        @input="resizeMeaning"
      />
    </div>

    <!-- Desired State -->
    <div>
      <label for="area-desired-state" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.desiredStateLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-1">
        {{ t('lifeAreas.form.desiredStateHelper') }}
      </p>
      <textarea
        id="area-desired-state"
        ref="desiredStateRef"
        v-model="form.desiredState"
        rows="3"
        :placeholder="t('lifeAreas.form.desiredStatePlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none overflow-hidden min-h-[5.5rem]"
        @input="resizeDesiredState"
      />
    </div>

    <!-- Typical Risks -->
    <div>
      <label for="area-typical-risks" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.typicalRisksLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-1">
        {{ t('lifeAreas.form.typicalRisksHelper') }}
      </p>
      <textarea
        id="area-typical-risks"
        ref="typicalRisksRef"
        v-model="form.typicalRisks"
        rows="3"
        :placeholder="t('lifeAreas.form.typicalRisksPlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none overflow-hidden min-h-[5.5rem]"
        @input="resizeTypicalRisks"
      />
    </div>

    <!-- Reflection Signals -->
    <div>
      <label class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.reflectionSignalsLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-2">
        {{ t('lifeAreas.form.reflectionSignalsHelper') }}
      </p>
      <div class="space-y-2">
        <div
          v-for="(_, index) in form.reflectionSignals"
          :key="index"
          class="flex items-center gap-2"
        >
          <input
            v-model="form.reflectionSignals[index]"
            type="text"
            :placeholder="t('lifeAreas.form.reflectionSignalPlaceholder')"
            class="neo-input flex-1 px-3 py-2 text-sm"
          />
          <button
            @click="removeReflectionSignal(index)"
            class="p-2 text-on-surface-variant hover:text-error transition-colors"
            :aria-label="t('lifeAreas.form.removeReflectionSignal')"
          >
            <AppIcon name="close" class="text-base" />
          </button>
        </div>
      </div>
      <button
        @click="addReflectionSignal"
        class="mt-2 text-sm text-primary hover:underline"
      >
        {{ t('lifeAreas.form.addReflectionSignal') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import ColorSwatchPicker from '@/components/shared/ColorSwatchPicker.vue'
import { useT } from '@/composables/useT'
import { useAutoResizeTextarea } from '@/composables/useAutoResizeTextarea'
import { LIFE_AREA_COLOR_PRESETS } from '@/constants/lifeAreaColorPresets'

const { t } = useT()

const colorPresets = computed(() =>
  LIFE_AREA_COLOR_PRESETS.map((preset) => ({
    hex: preset.hex,
    label: t(`lifeAreas.colorPresets.${preset.key}`),
  }))
)

interface FormData {
  name: string
  icon?: string
  color?: string
  meaning?: string
  desiredState?: string
  typicalRisks?: string
  reflectionSignals: string[]
}

const form = defineModel<FormData>('form', { required: true })

const meaningRef = ref<HTMLTextAreaElement | null>(null)
const desiredStateRef = ref<HTMLTextAreaElement | null>(null)
const typicalRisksRef = ref<HTMLTextAreaElement | null>(null)

const { autoResize: resizeMeaning } = useAutoResizeTextarea(
  meaningRef,
  () => form.value.meaning
)
const { autoResize: resizeDesiredState } = useAutoResizeTextarea(
  desiredStateRef,
  () => form.value.desiredState
)
const { autoResize: resizeTypicalRisks } = useAutoResizeTextarea(
  typicalRisksRef,
  () => form.value.typicalRisks
)

function addReflectionSignal() {
  form.value.reflectionSignals.push('')
}

function removeReflectionSignal(index: number) {
  form.value.reflectionSignals.splice(index, 1)
}
</script>
