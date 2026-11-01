<template>
  <!--
    One reflection answer as prose: a quiet sentence-case label and the text
    as a paragraph. Hover lays it on paper, a click turns the same block into
    an editor canvas with a textarea of the same metrics, so nothing shifts.
    The host owns the value (v-model) and its autosave; `blur` tells it to
    flush.
  -->
  <div class="rp" :class="{ 'mg-v2-editor-canvas rp--editing': editing }">
    <p class="rp__label">{{ label }}</p>
    <textarea
      v-if="editing"
      ref="fieldRef"
      class="rp__field"
      :value="modelValue"
      :rows="rows"
      :aria-label="label"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="stop"
      @keydown.escape.stop="($event.target as HTMLTextAreaElement).blur()"
    />
    <button v-else type="button" class="rp__text" :aria-label="label" @click="start">
      {{ modelValue }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    /** Start in the editor (a block opened from the "Dopisz:" line). */
    autofocus?: boolean
  }>(),
  { autofocus: false }
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()

const editing = ref(false)
const fieldRef = ref<HTMLTextAreaElement | null>(null)

// The textarea grows with the text (field-sizing), these rows are its floor.
const rows = computed(() => Math.max(2, props.modelValue.split('\n').length))

function start(): void {
  editing.value = true
  void nextTick(() => {
    const field = fieldRef.value
    if (!field) return
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  })
}

function stop(): void {
  editing.value = false
  emit('blur')
}

function isEditing(): boolean {
  return editing.value
}

defineExpose({ isEditing, start })

onMounted(() => {
  if (props.autofocus) start()
})
</script>

<style scoped>
.rp {
  display: grid;
  gap: var(--mg-space-1);
  padding: var(--mg-space-2) var(--mg-space-3);
  border: 1px solid transparent;
  border-radius: var(--mg-radius-lg);
  transition: background var(--mg-duration-fast) ease;
}

.rp:not(.rp--editing):hover {
  background: var(--mg-color-paper);
}

.rp__label {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
  line-height: 1.4;
}

/* Text and field share metrics so the switch does not move a line. */
.rp__text,
.rp__field {
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--mg-color-ink);
  background: transparent;
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-body);
  line-height: 1.6;
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.rp__text {
  cursor: text;
}

.rp__text:focus-visible {
  outline: none;
  border-radius: var(--mg-radius-sm);
  box-shadow: var(--mg-focus-ring);
}

.rp__field {
  resize: none;
  field-sizing: content;
  outline: none;
}
</style>
