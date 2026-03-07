<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" aria-hidden="true"></div>

        <!-- Dialog Card -->
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 neo-raised-strong rounded-2xl p-6 max-w-md w-full mx-4"
        >
          <h2 class="text-xl font-semibold text-on-surface mb-4">
            {{ t('planning.components.periodCreationDialog.title', { type: typeLabel }) }}
          </h2>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Start Date -->
            <div>
              <label for="period-start" class="block text-sm font-medium text-on-surface mb-1">
                {{ t('planning.components.periodCreationDialog.startDate') }}
              </label>
              <input
                id="period-start"
                v-model="form.startDate"
                type="date"
                class="neo-input w-full px-3 py-2 text-on-surface"
                :class="{ 'border-error': errors.startDate }"
              />
              <p v-if="errors.startDate" class="mt-1 text-sm text-error">{{ errors.startDate }}</p>
            </div>

            <!-- End Date -->
            <div>
              <label for="period-end" class="block text-sm font-medium text-on-surface mb-1">
                {{ t('planning.components.periodCreationDialog.endDate') }}
              </label>
              <input
                id="period-end"
                v-model="form.endDate"
                type="date"
                class="neo-input w-full px-3 py-2 text-on-surface"
                :class="{ 'border-error': errors.endDate }"
              />
              <p v-if="errors.endDate" class="mt-1 text-sm text-error">{{ errors.endDate }}</p>
            </div>

            <!-- Optional Name -->
            <div>
              <label for="period-name" class="block text-sm font-medium text-on-surface mb-1">
                {{ t('planning.components.periodCreationDialog.customName') }}
                <span class="text-on-surface-variant font-normal">{{ t('planning.components.periodCreationDialog.optional') }}</span>
              </label>
              <input
                id="period-name"
                v-model="form.name"
                type="text"
                :placeholder="t('planning.components.periodCreationDialog.namePlaceholder')"
                class="neo-input w-full px-3 py-2 text-on-surface placeholder:text-on-surface-variant"
              />
              <p class="mt-1 text-xs text-on-surface-variant">
                {{ t('planning.components.periodCreationDialog.defaultNameLabel', { name: defaultName }) }}
              </p>
            </div>

            <!-- Form Error -->
            <p v-if="formError" class="text-sm text-error">{{ formError }}</p>

            <!-- Actions -->
            <div class="flex gap-3 justify-end pt-2">
              <AppButton variant="text" type="button" @click="handleClose">
                Cancel
              </AppButton>
              <AppButton variant="filled" type="submit">
                Create
              </AppButton>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import { getDefaultPeriodName, suggestNextPeriodDates } from '@/utils/periodUtils'

const { t } = useT()

type PeriodType = 'yearly' | 'monthly' | 'weekly'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    type: PeriodType
    existingPeriods?: { startDate: string; endDate: string }[]
    initialStartDate?: string
    initialEndDate?: string
  }>(),
  {
    existingPeriods: () => [],
    initialStartDate: undefined,
    initialEndDate: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [payload: { startDate: string; endDate: string; name?: string }]
}>()

const form = reactive({
  startDate: '',
  endDate: '',
  name: '',
})

const errors = reactive({
  startDate: '',
  endDate: '',
})

const formError = computed(() => {
  const duplicate = props.existingPeriods?.some(
    (period) =>
      period.startDate === form.startDate && period.endDate === form.endDate
  )
  if (duplicate) {
    return t('planning.common.validation.duplicatePeriod')
  }
  return ''
})

const defaultName = computed(() => {
  if (!form.startDate || !form.endDate) return ''
  return getDefaultPeriodName(form.startDate, form.endDate, props.type)
})

const typeLabel = computed(() => {
  return props.type.charAt(0).toUpperCase() + props.type.slice(1)
})

function resetForm() {
  const suggestion = suggestNextPeriodDates(props.type)
  form.startDate = props.initialStartDate || suggestion.startDate
  form.endDate = props.initialEndDate || suggestion.endDate
  form.name = ''
  errors.startDate = ''
  errors.endDate = ''
}

function validate(): boolean {
  errors.startDate = ''
  errors.endDate = ''

  if (!form.startDate) {
    errors.startDate = t('planning.common.validation.startDateRequired')
  }
  if (!form.endDate) {
    errors.endDate = t('planning.common.validation.endDateRequired')
  }
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.endDate = t('planning.common.validation.endDateAfterStart')
  }
  if (formError.value) {
    return false
  }

  return !errors.startDate && !errors.endDate
}

function handleSubmit() {
  if (!validate()) return

  emit('create', {
    startDate: form.startDate,
    endDate: form.endDate,
    name: form.name.trim() ? form.name.trim() : undefined,
  })
}

function handleClose() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  }
)
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .bg-surface,
.dialog-leave-active .bg-surface {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .bg-surface,
.dialog-leave-to .bg-surface {
  transform: scale(0.95);
  opacity: 0;
}
</style>
