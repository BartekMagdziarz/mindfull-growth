<template>
  <details class="profile-card">
    <summary>Poszukaj obserwacji w historii</summary>
    <p>
      Wybierz temat i okres. AI porówna ograniczoną próbkę wpisów Dziennika, logów emocji, ćwiczeń,
      kwestionariuszy, refleksji oraz celów, priorytetów, nawyków, planów i zapisów ich realizacji.
      Sprawdzi też możliwe wyjątki. Może nie zaproponować niczego.
    </p>
    <form @submit.prevent="generate">
      <label
        >Temat obserwacji<textarea
          v-model="focus"
          maxlength="300"
          rows="2"
          placeholder="Np. co pomaga mi odpoczywać w okresach większego obciążenia"
          :disabled="busy"
          required
        />
      </label>
      <div class="profile-actions">
        <label>Od<input v-model="from" type="date" :disabled="busy" required /></label
        ><label>Do<input v-model="to" type="date" :max="today" :disabled="busy" required /></label>
      </div>
      <p>
        Analiza obejmuje maksymalnie rok i do dwóch zapytań do modelu. Dane z wybranego zakresu
        zostaną przesłane do OpenAI. Wynik trafi wyłącznie do propozycji.
      </p>
      <button type="submit" :disabled="busy || !focus.trim()">Sprawdź możliwe obserwacje</button>
      <AiActivity
        v-if="busy"
        label="Porównuję zapisy i szukam wyjątków…"
        cancel-label="Przerwij analizę obserwacji"
        @cancel="controller?.abort()"
      />
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
    </form>
  </details>
</template>
<script setup lang="ts">
import AiActivity from '@/components/shared/AiActivity.vue'
import { onBeforeUnmount, ref } from 'vue'
import { proposeHistoryObservations } from '@/services/ai/profile/observations'
const emit = defineEmits<{ created: [] }>()
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const date = (value: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
const today = date(new Date()),
  from = ref(date(new Date(Date.now() - 90 * 86400000))),
  to = ref(today),
  focus = ref('')
const busy = ref(false),
  error = ref(''),
  notice = ref('')
let controller: AbortController | undefined,
  disposed = false
async function generate() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  controller = new AbortController()
  try {
    const result = await proposeHistoryObservations(
      { focus: focus.value, from: from.value, to: to.value, timeZone },
      { signal: controller.signal }
    )
    if (disposed) return
    notice.value = result.reused
      ? 'Ta analiza ma już propozycje w kolejce lub historii decyzji.'
      : result.created
        ? `Nowe hipotezy do przejrzenia: ${result.created}. Nic nie zostało zatwierdzone.`
        : 'Nie dodano nowych hipotez. Próbka może być zbyt mała, niejednoznaczna albo dotyczyć już omówionych obserwacji.'
    emit('created')
  } catch (e) {
    if (disposed) return
    const code = e instanceof Error ? e.message : ''
    error.value =
      code === 'cancelled'
        ? 'Analiza przerwana. Nie zmieniono profilu.'
        : code === 'invalid-input'
          ? 'Wybierz temat i poprawny okres, najwyżej rok, bez przyszłych dat.'
          : code === 'missing-api-key'
            ? 'Włącz AI w demo lub skonfiguruj OpenAI, aby rozpocząć analizę.'
            : code === 'cost-limit'
              ? 'Wykorzystano limit analiz profilu. Zapisane propozycje pozostają dostępne.'
              : 'Nie udało się przygotować zweryfikowanych obserwacji. Dane mogły się zmienić lub odpowiedź nie spełniła wymagań. Profil pozostał bez zmian.'
  } finally {
    if (!disposed) busy.value = false
  }
}
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
})
</script>
