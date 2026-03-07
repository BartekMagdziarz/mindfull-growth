<template>
  <div class="w-full">
    <button
      v-if="!isEditing"
      type="button"
      :class="[
        'group inline-flex items-center gap-2 w-full text-left rounded-lg transition focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background',
        (disabled || isSaving) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-section/60',
      ]"
      :disabled="disabled || isSaving"
      :aria-label="ariaLabel"
      @click="startEdit"
    >
      <span :class="['flex-1', textClass, isPlaceholder ? 'text-on-surface-variant italic' : '']">
        {{ displayText }}
      </span>
      <span
        v-if="isSaving"
        class="text-xs text-on-surface-variant"
      >
        Saving...
      </span>
    </button>

    <div v-else class="space-y-1">
      <component
        :is="multiline ? 'textarea' : 'input'"
        ref="inputRef"
        :value="draft"
        :type="multiline ? undefined : 'text'"
        :rows="multiline ? rows : undefined"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        :disabled="disabled || isSaving"
        :class="[
          'neo-input w-full px-2.5 py-1.5',
          multiline ? 'resize-y' : '',
          inputClass,
          validationError ? 'border-error' : '',
        ]"
        @input="handleInput"
        @keydown.enter="handleEnter"
        @keydown.esc.prevent="handleCancel"
        @blur="handleBlur"
      />
      <p v-if="validationError" class="text-xs text-error">
        {{ validationError }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    isSaving?: boolean
    textClass?: string
    inputClass?: string
    ariaLabel?: string
    allowEmpty?: boolean
    multiline?: boolean
    rows?: number
  }>(),
  {
    placeholder: 'Untitled',
    disabled: false,
    isSaving: false,
    textClass: 'text-base text-on-surface',
    inputClass: '',
    ariaLabel: 'Edit text',
    allowEmpty: false,
    multiline: false,
    rows: 3,
  }
)

const emit = defineEmits<{
  save: [value: string]
  cancel: []
}>()

const isEditing = ref(false)
const draft = ref(props.modelValue)
const validationError = ref('')
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

const displayText = computed(() => {
  return props.modelValue?.trim().length ? props.modelValue : props.placeholder
})

const isPlaceholder = computed(() => !props.modelValue?.trim().length)

watch(
  () => props.modelValue,
  (newValue) => {
    if (!isEditing.value) {
      draft.value = newValue
    }
  }
)

function startEdit() {
  if (props.disabled || props.isSaving) return
  isEditing.value = true
  validationError.value = ''
  draft.value = props.modelValue

  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function handleCancel() {
  validationError.value = ''
  draft.value = props.modelValue
  isEditing.value = false
  emit('cancel')
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null
  if (target) {
    draft.value = target.value
  }
}

function handleSave() {
  if (props.disabled || props.isSaving) return

  const trimmed = draft.value.trim()
  if (!trimmed && !props.allowEmpty) {
    validationError.value = 'Name is required'
    nextTick(() => {
      inputRef.value?.focus()
    })
    return
  }

  validationError.value = ''
  if (trimmed === props.modelValue.trim()) {
    isEditing.value = false
    return
  }

  emit('save', trimmed)
  isEditing.value = false
}

function handleEnter(event: KeyboardEvent) {
  if (props.multiline) return
  event.preventDefault()
  handleSave()
}

function handleBlur() {
  if (!isEditing.value) return
  handleSave()
}
</script>
