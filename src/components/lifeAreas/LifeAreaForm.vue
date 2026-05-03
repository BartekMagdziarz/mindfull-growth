<template>
  <div class="space-y-6">
    <!-- Name -->
    <div>
      <label for="area-name" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.nameLabel') }}
      </label>
      <input
        id="area-name"
        v-model="form.name"
        type="text"
        :placeholder="t('lifeAreas.form.namePlaceholder')"
        class="neo-input w-full px-4 py-3"
      />
    </div>

    <!-- Icon & Color row -->
    <div class="flex gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ t('lifeAreas.form.iconLabel') }}
        </label>
        <IconPicker
          v-model="form.icon"
          class="w-full"
          aria-label="Select life area icon"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-on-surface mb-2">
          {{ t('lifeAreas.form.colorLabel') }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in colorPresets"
            :key="preset.hex"
            type="button"
            @click="form.color = preset.hex"
            class="w-8 h-8 rounded-full border-2 transition-all duration-150 flex items-center justify-center"
            :class="form.color === preset.hex ? 'border-on-surface scale-110' : 'border-neu-border/30 hover:scale-105'"
            :style="{ backgroundColor: preset.hex }"
            :aria-label="preset.label"
            :title="preset.label"
          >
            <svg v-if="form.color === preset.hex" class="w-4 h-4 text-white drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
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
        v-model="form.meaning"
        rows="3"
        :placeholder="t('lifeAreas.form.meaningPlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none"
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
        v-model="form.desiredState"
        rows="3"
        :placeholder="t('lifeAreas.form.desiredStatePlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none"
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
        v-model="form.typicalRisks"
        rows="3"
        :placeholder="t('lifeAreas.form.typicalRisksPlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none"
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
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const colorPresets = computed(() => [
  { hex: '#7E6CA8', label: t('lifeAreas.colorPresets.lavender') },
  { hex: '#B47092', label: t('lifeAreas.colorPresets.rose') },
  { hex: '#C88E6A', label: t('lifeAreas.colorPresets.coral') },
  { hex: '#BF9E42', label: t('lifeAreas.colorPresets.amber') },
  { hex: '#5F9B78', label: t('lifeAreas.colorPresets.sage') },
  { hex: '#488F84', label: t('lifeAreas.colorPresets.teal') },
  { hex: '#5088B4', label: t('lifeAreas.colorPresets.ocean') },
  { hex: '#6A7EB5', label: t('lifeAreas.colorPresets.periwinkle') },
  { hex: '#A56BA2', label: t('lifeAreas.colorPresets.mauve') },
  { hex: '#6882A8', label: t('lifeAreas.colorPresets.steel') },
])

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

function addReflectionSignal() {
  form.value.reflectionSignals.push('')
}

function removeReflectionSignal(index: number) {
  form.value.reflectionSignals.splice(index, 1)
}
</script>
