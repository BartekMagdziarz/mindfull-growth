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

    <!-- Purpose -->
    <div>
      <label for="area-purpose" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.purposeLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-1">
        {{ t('lifeAreas.form.purposeHelper') }}
      </p>
      <textarea
        id="area-purpose"
        v-model="form.purpose"
        rows="2"
        :placeholder="t('lifeAreas.form.purposePlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none"
      />
    </div>

    <!-- Maintenance Standard -->
    <div>
      <label for="area-standard" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.maintenanceLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-1">
        {{ t('lifeAreas.form.maintenanceHelper') }}
      </p>
      <textarea
        id="area-standard"
        v-model="form.maintenanceStandard"
        rows="2"
        :placeholder="t('lifeAreas.form.maintenancePlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none"
      />
    </div>

    <!-- Success Picture -->
    <div>
      <label for="area-success" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.successLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-1">
        {{ t('lifeAreas.form.successHelper') }}
      </p>
      <textarea
        id="area-success"
        v-model="form.successPicture"
        rows="2"
        :placeholder="t('lifeAreas.form.successPlaceholder')"
        class="neo-input w-full px-4 py-3 resize-none"
      />
    </div>

    <!-- Measures -->
    <div>
      <label class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.measuresLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-2">
        {{ t('lifeAreas.form.measuresHelper') }}
      </p>
      <div class="space-y-2">
        <div
          v-for="(measure, index) in form.measures"
          :key="index"
          class="flex items-center gap-2"
        >
          <select
            v-model="measure.type"
            class="neo-input px-3 py-2 text-sm"
          >
            <option value="leading">{{ t('lifeAreas.form.measureTypeOptions.leading') }}</option>
            <option value="lagging">{{ t('lifeAreas.form.measureTypeOptions.lagging') }}</option>
          </select>
          <input
            v-model="measure.name"
            type="text"
            :placeholder="t('lifeAreas.form.measurePlaceholder')"
            class="neo-input flex-1 px-3 py-2 text-sm"
          />
          <button
            @click="removeMeasure(index)"
            class="p-2 text-on-surface-variant hover:text-error transition-colors"
            :aria-label="t('lifeAreas.form.removeMeasure')"
          >
            <AppIcon name="close" class="text-base" />
          </button>
        </div>
      </div>
      <button
        @click="addMeasure"
        class="mt-2 text-sm text-primary hover:underline"
      >
        {{ t('lifeAreas.form.addMeasure') }}
      </button>
    </div>

    <!-- Constraints -->
    <div>
      <label class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.constraintsLabel') }}
      </label>
      <p class="text-xs text-on-surface-variant mb-2">
        {{ t('lifeAreas.form.constraintsHelper') }}
      </p>
      <div class="space-y-2">
        <div
          v-for="(_, index) in form.constraints"
          :key="index"
          class="flex items-center gap-2"
        >
          <input
            v-model="form.constraints![index]"
            type="text"
            :placeholder="t('lifeAreas.form.constraintPlaceholder')"
            class="neo-input flex-1 px-3 py-2 text-sm"
          />
          <button
            @click="removeConstraint(index)"
            class="p-2 text-on-surface-variant hover:text-error transition-colors"
            :aria-label="t('lifeAreas.form.removeConstraint')"
          >
            <AppIcon name="close" class="text-base" />
          </button>
        </div>
      </div>
      <button
        @click="addConstraint"
        class="mt-2 text-sm text-primary hover:underline"
      >
        {{ t('lifeAreas.form.addConstraint') }}
      </button>
    </div>

    <!-- Review Cadence -->
    <div>
      <label for="area-cadence" class="block text-sm font-medium text-on-surface mb-2">
        {{ t('lifeAreas.form.reviewCadenceLabel') }}
      </label>
      <select
        id="area-cadence"
        v-model="form.reviewCadence"
        class="neo-input w-full px-4 py-3"
      >
        <option value="weekly">{{ t('lifeAreas.form.reviewCadenceOptions.weekly') }}</option>
        <option value="monthly">{{ t('lifeAreas.form.reviewCadenceOptions.monthly') }}</option>
        <option value="quarterly">{{ t('lifeAreas.form.reviewCadenceOptions.quarterly') }}</option>
        <option value="yearly">{{ t('lifeAreas.form.reviewCadenceOptions.yearly') }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LifeAreaMeasure, ReviewCadence } from '@/domain/lifeArea'
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
  purpose?: string
  maintenanceStandard?: string
  successPicture?: string
  measures: LifeAreaMeasure[]
  constraints?: string[]
  reviewCadence: ReviewCadence
}

const form = defineModel<FormData>('form', { required: true })

function addMeasure() {
  form.value.measures.push({ name: '', type: 'leading' })
}

function removeMeasure(index: number) {
  form.value.measures.splice(index, 1)
}

function addConstraint() {
  if (!form.value.constraints) {
    form.value.constraints = []
  }
  form.value.constraints.push('')
}

function removeConstraint(index: number) {
  form.value.constraints?.splice(index, 1)
}
</script>
