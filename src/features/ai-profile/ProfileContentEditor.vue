<template>
  <div class="profile-fields">
    <label
      >Kategoria<select
        aria-label="Kategoria"
        :value="modelValue.category"
        @change="update('category', value($event))"
      >
        <option v-for="category in PROFILE_CATEGORIES" :key="category" :value="category">
          {{ CATEGORY_LABELS[category] }}
        </option>
      </select></label
    >
    <label
      >Treść informacji<textarea
        :value="modelValue.text"
        rows="4"
        maxlength="4000"
        @input="update('text', value($event))"
      />
    </label>
    <details class="profile-advanced">
      <summary>Więcej ustawień</summary>
      <label
        >Gdzie AI ma z tego korzystać<select
          :value="modelValue.scope"
          @change="update('scope', value($event))"
        >
          <option v-for="scope in PROFILE_SCOPES" :key="scope" :value="scope">
            {{ SCOPE_LABELS[scope] }}
          </option>
        </select></label
      >
      <div class="profile-dates">
        <label
          >Wróć do przeglądu po<input
            type="date"
            :value="modelValue.reviewAfter"
            @input="update('reviewAfter', value($event) || null)"
        /></label>
        <label
          >Istotne do (opcjonalnie)<input
            type="date"
            :value="modelValue.validUntil"
            @input="update('validUntil', value($event) || null)"
        /></label>
      </div>
      <p class="profile-muted">
        Termin przeglądu oznacza pytanie o aktualność. Po dacie „istotne do” informacja pozostaje w
        profilu, ale przestaje trafiać do AI.
      </p>
      <label
        >Powiązany cel, priorytet lub nawyk<select :value="linkedKey" @change="link(value($event))">
          <option value="">Bez powiązania</option>
          <option
            v-for="option in objects"
            :key="sourceKey(option.ref)"
            :value="sourceKey(option.ref)"
          >
            {{ option.label }}
          </option>
        </select></label
      >
    </details>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import {
  PROFILE_CATEGORIES,
  PROFILE_SCOPES,
  CATEGORY_LABELS,
  SCOPE_LABELS,
  type ProfileContent,
} from '@/domain/approvedProfile'
import { sourceKey, type SourceRef } from '@/services/ai/history/contracts'
const props = defineProps<{
  modelValue: ProfileContent
  objects: Array<{ ref: SourceRef; label: string }>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ProfileContent] }>()
const value = (event: Event) => (event.target as HTMLInputElement).value
const linkedKey = computed(() =>
  props.modelValue.linkedObject ? sourceKey(props.modelValue.linkedObject) : ''
)
function update(key: string, next: string | null) {
  emit('update:modelValue', { ...props.modelValue, [key]: next })
}
function link(key: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    linkedObject: props.objects.find(o => sourceKey(o.ref) === key)?.ref ?? null,
  })
}
</script>
