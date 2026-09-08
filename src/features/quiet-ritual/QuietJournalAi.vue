<template>
  <div class="qr-context qr-ai">
    <p v-if="error === 'missingProvider'">
      Asystent AI nie jest podłączony. Skonfigurujesz go w Profilu → Asystent AI.
    </p>
    <p v-else-if="error">Nie udało się połączyć z asystentem. Spróbuj ponownie.</p>

    <div class="qr-inserts">
      <button type="button" class="qr-quiet" :disabled="loading || !summaryContext" @click="runSummary">
        <AppIcon name="auto_awesome" />{{ aiSummary ? 'Odśwież podsumowanie' : 'Napisz podsumowanie' }}
      </button>
      <button type="button" class="qr-quiet" :disabled="loading || !summaryContext" @click="runQuestions">
        <AppIcon name="help" />Pogłębiające pytania
      </button>
      <button v-if="aiSummary" type="button" class="qr-quiet" @click="emit('update:aiSummary', '')">
        <AppIcon name="close" />Usuń podsumowanie
      </button>
    </div>

    <p v-if="loading">Piszę…</p>
    <p v-else-if="aiSummary">{{ aiSummary }}</p>
    <button v-if="aiSummary && !loading" type="button" class="qr-quiet" @click="emit('insert', aiSummary)">
      <AppIcon name="add" />Dodaj podsumowanie do wpisu
    </button>

    <div v-if="questions.length" class="qr-inserts">
      <button v-for="question in questions" :key="question" type="button" class="qr-quiet" @click="emit('insert', question)">
        {{ question }}<AppIcon name="add" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { hasAIProviderConfigured } from '@/services/llmService'
import {
  generateReflectionQuestions,
  generateReflectionSummary,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'

/**
 * The quiet journal step's AI drawer: the same real assistant the classic
 * reflection sidebar uses, reduced to two explicit actions. Nothing runs
 * without a click, and a generated summary never overwrites the user's text —
 * it is inserted only on request.
 */
const props = defineProps<{ summaryContext: ReflectionSummaryContext | null; aiSummary: string }>()
const emit = defineEmits<{ 'update:aiSummary': [value: string]; insert: [text: string] }>()

const { locale, gender } = useT()
const loading = ref(false)
const error = ref<'missingProvider' | 'generic' | null>(null)
const questions = ref<string[]>([])

async function guard(): Promise<boolean> {
  error.value = null
  if (loading.value || !props.summaryContext) return false
  if (!(await hasAIProviderConfigured())) {
    error.value = 'missingProvider'
    return false
  }
  return true
}

async function runSummary() {
  if (!(await guard())) return
  loading.value = true
  try {
    const text = await generateReflectionSummary(props.summaryContext!, {
      locale: locale.value,
      gender: gender.value,
      onToken: full => emit('update:aiSummary', full),
    })
    emit('update:aiSummary', text)
  } catch (reason) {
    console.error('Quiet ritual summary generation failed:', reason)
    error.value = 'generic'
    emit('update:aiSummary', '')
  } finally {
    loading.value = false
  }
}

async function runQuestions() {
  if (!(await guard())) return
  loading.value = true
  try {
    questions.value = await generateReflectionQuestions(props.summaryContext!, {
      locale: locale.value,
      gender: gender.value,
    })
  } catch (reason) {
    console.error('Quiet ritual questions generation failed:', reason)
    error.value = 'generic'
  } finally {
    loading.value = false
  }
}
</script>
