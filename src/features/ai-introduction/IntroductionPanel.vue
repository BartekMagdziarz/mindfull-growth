<template>
  <section class="introduction-panel" aria-label="Rozmowa zapoznawcza">
    <h3>Poznajmy się</h3>
    <p v-if="!record">
      Porozmawiajmy o tym, co jest dla Ciebie ważne. Możesz pomijać pytania i wrócić później.
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Wczytuję rozmowę…</p>
    <details v-if="sessions.length" class="introduction-sessions">
      <summary>Wcześniejsze rozmowy</summary>
      <div class="profile-actions">
        <button
          v-for="session in sessions"
          :key="session.id"
          type="button"
          :disabled="busy"
          :aria-pressed="record?.id === session.id"
          @click="open(session)"
        >
          {{ date(session.createdAt) }} · {{ statusLabel[session.status] }}
        </button>
      </div>
      <button v-if="record" type="button" :disabled="busy" @click="prepareNew">
        Nowa rozmowa zapoznawcza
      </button>
    </details>
    <template v-if="!record && !loading">
      <details class="profile-card">
        <summary>Opcjonalnie: przygotuj się z ćwiczeniem</summary>
        <p>
          Możesz najpierw przyjrzeć się wartościom lub obszarom życia. Kwestionariusz też może być
          punktem wyjścia — nie zastępuje opowiedzenia o sobie i nie definiuje Cię wynikiem.
        </p>
        <div class="profile-actions">
          <RouterLink to="/exercises/values">Odkrywanie wartości</RouterLink
          ><RouterLink to="/exercises/wheel-of-life">Koło życia</RouterLink
          ><RouterLink to="/exercises">Biblioteka ćwiczeń i kwestionariuszy</RouterLink>
        </div>
        <button type="button" @click="loadExercises">Odśwież zapisane wyniki</button>
        <p>Dołącz wybrane wyniki (maksymalnie trzy). Żaden nie jest dołączany automatycznie.</p>
        <p v-if="!exercises.length">
          Nie znaleziono dostępnych wyników. Możesz spokojnie zacząć bez nich.
        </p>
        <label v-for="exercise in exercises" :key="sourceKey(exercise.ref)"
          ><input
            type="checkbox"
            :checked="selected.some(c => sourceKey(c.ref) === sourceKey(exercise.ref))"
            :disabled="
              selected.length >= 3 &&
              !selected.some(c => sourceKey(c.ref) === sourceKey(exercise.ref))
            "
            @change="toggleExercise(exercise)"
          />{{ exercise.title }} · {{ date(exercise.occurredAt) }}</label
        >
      </details>
      <p class="profile-muted">
        Po wysłaniu odpowiedzi OpenAI otrzyma tę rozmowę, zatwierdzony profil i wybrane wyniki.
        Wnioski zatwierdzisz osobno.
      </p>
      <button type="button" :disabled="busy" @click="start">Zacznij rozmowę</button>
    </template>
    <template v-if="record">
      <nav class="introduction-steps" aria-label="Obszary rozmowy">
        <button
          v-for="area in INTRO_AREAS"
          :key="area"
          :title="INTRO_LABELS[area]"
          :aria-current="record.area === area ? 'step' : undefined"
          type="button"
          :aria-pressed="record.area === area"
          :disabled="busy || record.status !== 'active'"
          @click="choose(area)"
        >
          <i aria-hidden="true" :data-status="record.coverage[area]" />
          <span class="sr-only"
            >{{ INTRO_LABELS[area]
            }}{{
              record.coverage[area] === 'answered'
                ? ' · omówione'
                : record.coverage[area] === 'skipped'
                  ? ' · pominięte'
                  : ''
            }}</span
          >
        </button>
      </nav>
      <p class="introduction-area">
        {{ INTRO_LABELS[record.area] }} ·
        {{ Object.values(record.coverage).filter(v => v === 'answered').length }}/{{
          INTRO_AREAS.length
        }}
        omówionych
      </p>
      <p v-if="record.exercises.length" class="profile-muted">
        Wybrane wyniki: {{ record.exercises.length }}. Zmiana lub wykluczenie źródła zatrzymuje
        ponowne wysyłanie rozmowy; wtedy możesz zacząć nową z aktualnym kontekstem.
      </p>
      <div
        ref="conversationLog"
        class="profile-discussion"
        role="log"
        aria-label="Przebieg poznawania osoby"
      >
        <p v-for="message in record.messages" :key="message.id">
          <strong>{{
            message.role === 'user' ? 'Ty' : message.role === 'assistant' ? 'AI' : 'Informacja'
          }}</strong
          ><br />{{ message.text }}
        </p>
        <p v-if="pendingText"><strong>Ty</strong><br />{{ pendingText }}</p>
        <AiActivity v-if="busy" @cancel="controller?.abort()" />
      </div>
      <p v-if="record.status === 'paused'">
        Rozmowa została zachowana. Możesz wrócić do niej, gdy zechcesz.
      </p>
      <button v-if="record.status === 'paused'" type="button" :disabled="busy" @click="resume">
        Wznów rozmowę
      </button>
      <form v-if="record.status === 'active'" @submit.prevent="send">
        <label
          >Twoja odpowiedź<textarea
            v-model="draft"
            @keydown="onDraftKeydown"
            rows="2"
            maxlength="2000"
            :disabled="busy"
          />
        </label>

        <div class="profile-actions">
          <button type="submit" :disabled="busy || !draft.trim()">Wyślij odpowiedź</button
          ><button class="profile-text-action" type="button" :disabled="busy" @click="skip">
            Pomiń pytanie</button
          ><button class="profile-text-action" type="button" :disabled="busy" @click="pause">
            Zachowaj i wróć później
          </button>
        </div>
        <button
          class="profile-text-action"
          type="button"
          :disabled="busy || !!draft.trim()"
          @click="finish"
        >
          Zakończ i przygotuj propozycje
        </button>
        <p v-if="draft.trim()" class="profile-muted">
          Przed zakończeniem wyślij odpowiedź lub wyczyść jej szkic. Samo pominięcie pytań nie
          tworzy informacji o Tobie.
        </p>
      </form>
      <div v-if="record.status === 'complete'" class="profile-card">
        <h3>Rozmowa zachowana</h3>
        <p v-if="completedProposalCount !== null">
          Propozycje do przejrzenia: {{ completedProposalCount }}
        </p>
        <p>
          Nic nie zostało przyjęte automatycznie. Możesz przejrzeć propozycje teraz lub później;
          przy krótkiej rozmowie może ich nie być.
        </p>
        <div class="profile-actions">
          <button type="button" @click="emit('review')">Przejrzyj propozycje</button
          ><RouterLink :to="reflectionUrl">Przejdź do refleksji tygodniowej</RouterLink>
        </div>
      </div>
    </template>
  </section>
</template>
<script setup lang="ts">
import AiActivity from '@/components/shared/AiActivity.vue'
import { onMounted, onBeforeUnmount, ref, shallowRef, watch, nextTick } from 'vue'
import {
  INTRO_AREAS,
  INTRO_LABELS,
  type CompanionIntroduction,
  type IntroArea,
} from '@/domain/companionIntroduction'
import { getUserDatabase } from '@/services/userDatabaseService'
import { introductionService } from '@/services/ai/introduction/service'
import { createHistoryTools } from '@/services/ai/history/tools'
import { sourceKey } from '@/services/ai/history/contracts'
import type { Citation } from '@/services/ai/companion/runtime'
import { CompanionError } from '@/services/ai/companion/openai'
import { getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'
const emit = defineEmits<{ changed: []; review: [] }>()
const service = introductionService(),
  record = shallowRef<CompanionIntroduction>(),
  sessions = shallowRef<CompanionIntroduction[]>([])
const loading = ref(true),
  busy = ref(false),
  error = ref(''),
  draft = ref(''),
  selected = shallowRef<Citation[]>([])
type Exercise = Awaited<
  ReturnType<ReturnType<typeof createHistoryTools>['searchHistory']>
>['items'][number]
const exercises = shallowRef<Exercise[]>([])
const statusLabel = { active: 'w toku', paused: 'zachowana', complete: 'zakończona' }
const date = (value: string) => new Date(value).toLocaleDateString('pl')
const reflectionUrl = `/calendar/week/${getPreviousPeriod(getPeriodRefsForDate(new Date()).week)}?action=reflect`
let disposed = false,
  controller: AbortController | undefined,
  timer: ReturnType<typeof setTimeout> | undefined
async function perform(work: () => Promise<CompanionIntroduction>) {
  if (busy.value) return
  clearTimeout(timer)
  busy.value = true
  error.value = ''
  controller = new AbortController()
  try {
    const next = await work()
    if (!disposed) {
      record.value = next
      draft.value = next.draft
      sessions.value = await service.list()
    }
  } catch (reason) {
    if (!disposed) {
      const code = reason instanceof CompanionError ? reason.code : ''
      error.value =
        code === 'missing-api-key'
          ? 'Podłącz OpenAI w ustawieniach AI lub lokalnym pliku .env.'
          : code === 'cost-limit'
            ? 'Wykorzystano dzisiejszy limit analiz. Rozmowa pozostaje zachowana.'
            : code === 'cancelled'
              ? 'Przerwano. Twoja odpowiedź została zachowana w polu tekstowym.'
              : ['source-unavailable', 'introduction-context-changed'].includes(code)
                ? 'Profil, dostęp lub wybrane źródła zmieniły się. Zachowujemy rozmowę lokalnie, ale nie wysyłamy starego kontekstu. Zacznij nową rozmowę z aktualnymi danymi.'
                : code === 'introduction-limit'
                  ? 'Osiągnięto limit długości tej rozmowy. Możesz ją zakończyć i przygotować propozycje.'
                  : code.includes('conflict')
                    ? 'Rozmowa zmieniła się w innej karcie. Wczytano jej obecną wersję.'
                    : 'Nie udało się uzyskać odpowiedzi. Możesz spróbować ponownie lub zachować rozmowę na później.'
      if (record.value) {
        try {
          record.value = await service.load(record.value.id)
          draft.value = record.value.draft
        } catch {
          /* Keep the local draft when the account is unavailable. */
        }
      }
    }
  } finally {
    if (!disposed) busy.value = false
  }
}
async function loadExercises() {
  try {
    const result = await createHistoryTools().searchHistory({
      collections: ['valuesDiscoveries', 'lifeAreaAssessments', 'assessmentAttempts'],
      limit: 12,
    })
    if (!disposed) exercises.value = result.items
  } catch {
    if (!disposed) error.value = 'Nie udało się wczytać wyników. Możesz zacząć rozmowę bez nich.'
  }
}
function toggleExercise(exercise: Exercise) {
  selected.value = selected.value.some(c => sourceKey(c.ref) === sourceKey(exercise.ref))
    ? selected.value.filter(c => sourceKey(c.ref) !== sourceKey(exercise.ref))
    : [...selected.value, { ref: exercise.ref, version: exercise.version }]
}
async function open(session: CompanionIntroduction) {
  clearTimeout(timer)
  try {
    if (record.value) await service.saveDraft(record.value.id, draft.value)
    const current = await service.load(session.id)
    if (!disposed) {
      record.value = current
      draft.value = current.draft
      error.value = ''
    }
  } catch {
    if (!disposed) error.value = 'Nie udało się przełączyć rozmowy. Twój szkic pozostaje w polu.'
  }
}
async function prepareNew() {
  clearTimeout(timer)
  try {
    if (record.value?.status === 'active') await service.pause(record.value, draft.value)
    if (disposed) return
    sessions.value = await service.list()
    record.value = undefined
    draft.value = ''
    selected.value = []
    await loadExercises()
  } catch {
    if (!disposed) error.value = 'Nie udało się zachować rozmowy. Spróbuj ponownie.'
  }
}
const start = () => perform(() => service.start(selected.value))
const resume = () => perform(() => service.resume(record.value!))
const pause = () => perform(() => service.pause(record.value!, draft.value))
const choose = (area: IntroArea) =>
  perform(async () => {
    await service.saveDraft(record.value!.id, draft.value)
    return service.choose(record.value!, area)
  })
const skip = () =>
  perform(async () => {
    await service.saveDraft(record.value!.id, draft.value)
    return service.skip(record.value!)
  })
const pendingText = ref('')
function onDraftKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    if (!busy.value && draft.value.trim()) void send()
  }
}
async function send() {
  if (busy.value || !draft.value.trim()) return
  const sent = draft.value
  pendingText.value = sent
  draft.value = ''
  await perform(() => service.send(record.value!, sent, { signal: controller?.signal }))
  if (!disposed) {
    if (error.value) draft.value = sent
    pendingText.value = ''
  }
}
const finish = () =>
  perform(async () => {
    await service.saveDraft(record.value!.id, draft.value)
    const next = await service.finish(record.value!, { signal: controller?.signal })
    if (!disposed) emit('changed')
    return next
  })
const conversationLog = ref<HTMLElement | null>(null)
const completedProposalCount = ref<number | null>(null)
watch(conversationLog, (element, _previous, onCleanup) => {
  if (!element) return
  const observer = new ResizeObserver(() => {
    element.scrollTop = element.scrollHeight
  })
  observer.observe(element)
  onCleanup(() => observer.disconnect())
})
watch(
  () => [record.value?.messages.length, pendingText.value, busy.value],
  async () => {
    await nextTick()
    if (conversationLog.value) conversationLog.value.scrollTop = conversationLog.value.scrollHeight
  }
)
watch(
  () => [record.value?.id, record.value?.status],
  async () => {
    completedProposalCount.value = null
    const id = record.value?.id
    if (!id || record.value?.status !== 'complete') return
    try {
      const rows = await getUserDatabase()
        .profileProposals.where('status')
        .equals('pending')
        .toArray()
      if (!disposed && record.value?.id === id)
        completedProposalCount.value = rows.filter(p => p.origin.introductionId === id).length
    } catch {
      /* The conversation remains available when the count cannot be read. */
    }
  }
)
watch(draft, text => {
  clearTimeout(timer)
  if (busy.value || !record.value || record.value.status === 'complete') return
  const id = record.value.id
  timer = setTimeout(() => {
    void service.saveDraft(id, text).catch(() => {
      if (!disposed) error.value = 'Nie udało się zachować szkicu.'
    })
  }, 400)
})
onMounted(async () => {
  try {
    sessions.value = await service.list()
    if (!disposed && sessions.value[0]) await open(sessions.value[0])
    await loadExercises()
  } catch {
    if (!disposed) error.value = 'Nie udało się wczytać rozmowy.'
  } finally {
    if (!disposed) loading.value = false
  }
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  if (record.value && !busy.value)
    void service.saveDraft(record.value.id, draft.value).catch(() => {})
  disposed = true
  controller?.abort()
})
</script>
<style scoped>
.introduction-panel {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.introduction-panel input[type='checkbox'] {
  width: auto;
}
.introduction-panel details label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}
.introduction-panel textarea {
  min-height: 7rem;
}
</style>

<style scoped>
.introduction-panel {
  display: grid;
  gap: 0.8rem;
}
.introduction-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
.introduction-steps button {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  padding: 0.5rem;
  border: none;
  background: transparent;
  border-radius: 50%;
}
.introduction-steps button[aria-pressed='true'] {
  background: transparent;
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-inset-sm);
}
.introduction-steps i {
  width: 0.55rem;
  height: 0.55rem;
  border: 1px solid var(--mg-color-muted);
  border-radius: 50%;
}
.introduction-steps i[data-status='answered'] {
  background: var(--mg-color-primary-strong);
  border-color: var(--mg-color-primary-strong);
}
.introduction-area {
  text-align: center;
  font-size: 0.8rem;
  color: var(--mg-color-muted);
}
.introduction-panel .profile-discussion {
  max-height: 45dvh;
  overflow: auto;
}
.introduction-sessions summary {
  cursor: pointer;
  color: var(--mg-color-muted);
  font-size: 0.8rem;
}
</style>

<style scoped>
.introduction-panel > *,
.introduction-panel form > *,
.introduction-panel label {
  min-width: 0;
}
.introduction-panel textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 4rem;
}
.introduction-steps button {
  flex: 1 1 0;
  min-width: 0;
  max-width: 2.4rem;
  width: auto;
  padding: 0.25rem;
}
</style>
