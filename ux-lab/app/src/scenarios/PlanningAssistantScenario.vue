<template>
  <section
    class="pa mg-design-v2"
    :class="{
      'pa--standalone': route.meta.standalone,
      'pa--has-plan': objects.length,
      'pa--plan-visible': mobileTab === 'plan',
    }"
  >
    <header class="pa-labbar">
      <span>Prototyp · odpowiedzi przykładowe · bez zapisu</span>
      <div class="pa-labbar__actions">
        <select
          aria-label="Przykładowy scenariusz"
          :value="sample"
          @change="chooseSample(($event.target as HTMLSelectElement).value as PlannerSample)"
        >
          <option v-for="(example, key) in plannerSamples" :key="key" :value="key">
            {{ example.label }}
          </option>
        </select>
        <button
          type="button"
          title="Pokaż gotowy szkic"
          aria-label="Pokaż gotowy szkic"
          @click="showExample"
        >
          <AppIcon name="arrow_forward" />
        </button>
        <button type="button" title="Zacznij od nowa" aria-label="Zacznij od nowa" @click="reset">
          <AppIcon name="restart_alt" />
        </button>
        <details class="pa-lab-options">
          <summary>Stany</summary>
          <div>
            <button type="button" @click="simulateError = !simulateError">
              {{ simulateError ? 'Błąd zapisu włączony' : 'Sprawdź błąd zapisu' }}
            </button>
          </div>
        </details>
      </div>
    </header>
    <header class="pa-heading">
      <span class="pa-presence" aria-hidden="true"><AppIcon name="mg-growth" /></span>
      <h1>Ułóżmy plan</h1>
    </header>
    <div
      v-if="objects.length"
      class="pa-mobile-tabs mg-v2-segmented"
      role="group"
      aria-label="Widok pomocnika"
    >
      <button
        type="button"
        :aria-pressed="mobileTab === 'conversation'"
        @click="mobileTab = 'conversation'"
      >
        Rozmowa</button
      ><button type="button" :aria-pressed="mobileTab === 'plan'" @click="mobileTab = 'plan'">
        Szkic
      </button>
    </div>
    <div class="pa-workspace">
      <section
        class="pa-conversation mg-v2-surface mg-v2-surface--raised-sm"
        aria-label="Rozmowa o planie"
      >
        <div
          ref="thread"
          class="pa-thread"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
        >
          <template v-if="!messages.length">
            <h2>Co chcesz zmienić?</h2>
            <div class="pa-starters">
              <button
                v-for="(example, key) in plannerSamples"
                :key="key"
                type="button"
                @click="startExample(key)"
              >
                <AppIcon :name="example.icon" /><span>{{ example.label }}</span
                ><AppIcon name="arrow_forward" />
              </button>
            </div>
          </template>
          <article
            v-for="message in messages"
            :key="message.id"
            class="pa-message"
            :class="`pa-message--${message.role}`"
          >
            <span class="sr-only">{{ message.role === 'user' ? 'Ty' : 'AI' }}:</span>
            <p>{{ message.text }}</p>
          </article>
          <div v-if="busy" class="pa-thinking" role="status">
            <span class="sr-only">Przygotowuję szkic.</span
            ><i v-for="dot in 3" :key="dot" :style="{ '--pa-dot': dot }" /><button
              class="pa-link"
              type="button"
              @click="cancelRequest"
            >
              Przerwij
            </button>
          </div>
          <div v-if="stage === 'question' && !busy" class="pa-answers">
            <button
              v-for="(answer, index) in example.answers"
              :key="answer"
              type="button"
              class="mg-v2-button"
              @click="answerQuestion(index)"
            >
              {{ answer }}
            </button>
          </div>
        </div>
        <form
          v-if="stage !== 'saved'"
          class="pa-compose mg-v2-surface mg-v2-surface--flat"
          @submit.prevent="send"
        >
          <textarea
            ref="composer"
            v-model="message"
            rows="2"
            aria-label="Wiadomość do pomocnika"
            :placeholder="objects.length ? 'Co chcesz dopracować?' : 'Na czym Ci zależy?'"
            @keydown="onKeydown"
          />
          <button
            type="submit"
            class="mg-v2-button mg-v2-button--icon"
            aria-label="Wyślij wiadomość"
            :disabled="busy || !message.trim()"
          >
            <AppIcon name="arrow_upward" />
          </button>
        </form>
        <p v-if="requestCancelled" class="pa-status" role="status">
          Przerwano. Wiadomość jest w polu.
        </p>
      </section>
      <section
        class="pa-paper mg-v2-surface mg-v2-surface--raised-sm"
        :class="{ 'pa-paper--empty': !objects.length, 'pa-paper--saved': stage === 'saved' }"
        aria-labelledby="pa-paper-title"
      >
        <template v-if="!objects.length"
          ><div class="pa-paper__placeholder" aria-hidden="true">
            <AppIcon name="description" /><span /><span />
          </div>
          <p>Tu pojawi się Twój szkic</p></template
        >
        <template v-else>
          <header class="pa-paper__head">
            <h2 id="pa-paper-title">
              {{ stage === 'saved' ? 'Gotowe' : 'Szkic' }}
            </h2>
            <span v-if="stage === 'saved'">W przykładzie</span>
            <button
              v-else
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet pa-discard"
              aria-label="Odrzuć szkic"
              title="Odrzuć szkic"
              @click="confirmDiscard = true"
            >
              <AppIcon name="close" />
            </button>
          </header>
          <div class="pa-objects">
            <PlannerDraftCard
              v-for="item in shownObjects"
              :key="item.id"
              :item="item"
              :expanded="expandedId === item.id"
              :readonly="stage === 'saved'"
              :error="
                item.selected && attemptedSave ? plannerObjectError(item, objects) : undefined
              "
              @expand="expandedId = expandedId === item.id ? null : item.id"
              @select="select(item.id, $event)"
              @edit="onEdit(item.id)"
            />
          </div>
          <p v-if="stage === 'saved'" class="pa-saved-note">
            <AppIcon name="check" />Plan gotowy. W aplikacji pojawi się w Twoim kalendarzu.
          </p>
          <p v-if="notice" class="pa-status" role="status">{{ notice }}</p>
          <p v-if="saveError" class="pa-error" role="alert">
            Nie udało się zapisać. Szkic jest tutaj.
          </p>
          <p v-if="attemptedSave && errors.length" class="pa-error" role="alert">
            {{ errors[0] }}
          </p>
          <footer class="pa-paper__footer">
            <button v-if="stage === 'saved'" type="button" class="mg-v2-button" @click="reset">
              Nowy plan<AppIcon name="add" />
            </button>
            <button
              v-else
              type="button"
              class="mg-v2-button mg-v2-button--primary"
              :disabled="!selected.length || busy"
              @click="save"
            >
              {{ saveError ? 'Spróbuj ponownie' : 'Dodaj wybrane' }}<AppIcon name="check" />
            </button>
          </footer>
        </template>
      </section>
    </div>
    <dialog
      ref="discardDialog"
      class="pa-dialog mg-v2-surface mg-v2-surface--raised"
      aria-labelledby="pa-discard-title"
      @cancel.prevent="confirmDiscard = false"
    >
      <h2 id="pa-discard-title">Odrzucić szkic?</h2>
      <div>
        <button
          ref="discardCancel"
          type="button"
          class="mg-v2-button"
          @click="confirmDiscard = false"
        >
          Wróć</button
        ><button type="button" class="mg-v2-button mg-v2-button--danger" @click="reset">
          Odrzuć
        </button>
      </div>
    </dialog>
    <span class="sr-only" role="status">{{ announcement }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import PlannerDraftCard from '~lab/components/PlannerDraftCard.vue'
import {
  createPlannerExample,
  plannerSamples,
  plannerObjectError,
  plannerSelectionErrors,
  selectPlannerObject,
  type PlannerObject,
  type PlannerSample,
} from '~lab/lab/planningAssistant'
import '~lab/styles/planning-assistant.css'

const route = useRoute(),
  router = useRouter()
const sample = ref<PlannerSample>(
  Object.hasOwn(plannerSamples, String(route.query.sample))
    ? (route.query.sample as PlannerSample)
    : 'reading'
)
const example = computed(() => plannerSamples[sample.value])
const stage = ref<'start' | 'question' | 'draft' | 'saved'>('start')
const objects = ref<PlannerObject[]>([])
const messages = ref<Array<{ id: number; role: 'user' | 'assistant'; text: string }>>([])
const message = ref(''),
  busy = ref(false),
  expandedId = ref<string | null>(null)
const notice = ref(''),
  announcement = ref(''),
  requestCancelled = ref(false),
  attemptedSave = ref(false)
const simulateError = ref(false),
  saveError = ref(false),
  confirmDiscard = ref(false)
const mobileTab = ref<'conversation' | 'plan'>('conversation')
const composer = ref<HTMLTextAreaElement | null>(null),
  thread = ref<HTMLDivElement | null>(null),
  discardCancel = ref<HTMLButtonElement | null>(null)
const discardDialog = ref<HTMLDialogElement | null>(null)
const selected = computed(() => objects.value.filter(item => item.selected))
const shownObjects = computed(() => (stage.value === 'saved' ? selected.value : objects.value))
const errors = computed(() => plannerSelectionErrors(objects.value))
const editedIds = new Set<string>()
let timer: ReturnType<typeof setTimeout> | undefined,
  sequence = 0,
  revision = 0,
  pendingText = ''
function add(role: 'user' | 'assistant', text: string) {
  messages.value.push({ id: ++sequence, role, text })
}
function stop() {
  if (timer) clearTimeout(timer)
  timer = undefined
  busy.value = false
  revision++
}
function reset() {
  stop()
  stage.value = 'start'
  objects.value = []
  messages.value = []
  message.value = ''
  expandedId.value = null
  notice.value = ''
  announcement.value = ''
  requestCancelled.value = false
  attemptedSave.value = false
  saveError.value = false
  confirmDiscard.value = false
  mobileTab.value = 'conversation'
  editedIds.clear()
}
function chooseSample(value: PlannerSample) {
  reset()
  sample.value = value
  void router.replace({ query: { ...route.query, sample: value, stage: undefined } })
}
function startExample(value: PlannerSample) {
  chooseSample(value)
  message.value = plannerSamples[value].prompt
  send()
}
function run(action: () => void) {
  stop()
  requestCancelled.value = false
  busy.value = true
  const token = revision
  timer = setTimeout(() => {
    if (token !== revision) return
    timer = undefined
    busy.value = false
    action()
  }, 900)
}
function send() {
  if (busy.value || !message.value.trim()) return
  pendingText = message.value.trim()
  add('user', pendingText)
  message.value = ''
  if (stage.value === 'start')
    run(() => {
      add('assistant', example.value.question)
      stage.value = 'question'
    })
  else if (stage.value === 'question') run(() => createProposal(0))
  else
    run(() => {
      const candidate = objects.value.find(
        item => item.kind === 'habit' || item.kind === 'weeklyIntention'
      )
      const number = pendingText.match(/(?:^|\s)([1-7])(?:\s|$)/)?.[1]
      if (candidate && number && !editedIds.has(candidate.id)) {
        candidate.target = Number(number)
        add(
          'assistant',
          `Ustawione: ${number} ${candidate.entryMode === 'counter' ? 'wykonania' : 'dni'} w tygodniu.`
        )
      } else
        add(
          'assistant',
          editedIds.size
            ? 'Twoje poprawki zostają. Co jeszcze dopracujemy?'
            : 'Możesz dopracować propozycję bezpośrednio na karcie.'
        )
      stage.value = 'draft'
      saveError.value = false
      notice.value = ''
    })
}
function createProposal(answerIndex: number) {
  objects.value = createPlannerExample(sample.value, answerIndex)
  stage.value = 'draft'
  add('assistant', example.value.reply)
  mobileTab.value = 'plan'
  announcement.value = 'Szkic jest gotowy.'
}
function answerQuestion(index: number) {
  pendingText = example.value.answers[index]
  add('user', pendingText)
  run(() => createProposal(index))
}
function showExample() {
  reset()
  add('user', example.value.prompt)
  add('assistant', example.value.question)
  add('user', example.value.answers[0])
  createProposal(0)
}
function cancelRequest() {
  stop()
  if (pendingText) {
    message.value = pendingText
    if (messages.value.at(-1)?.role === 'user') messages.value.pop()
  }
  requestCancelled.value = true
  nextTick(() => composer.value?.focus())
}
function select(id: string, value: boolean) {
  notice.value = selectPlannerObject(objects.value, id, value) ?? ''
  announcement.value = notice.value
  saveError.value = false
}
function onEdit(id: string) {
  editedIds.add(id)
  notice.value = ''
  saveError.value = false
}
function save() {
  if (busy.value || stage.value === 'saved') return
  attemptedSave.value = true
  if (errors.value.length) {
    expandedId.value =
      selected.value.find(item => plannerObjectError(item, objects.value))?.id ?? null
    return
  }
  if (simulateError.value) {
    saveError.value = true
    simulateError.value = false
    return
  }
  saveError.value = false
  notice.value = ''
  expandedId.value = null
  stage.value = 'saved'
  announcement.value = 'Zatwierdzono przykład. Dane nie zostały zapisane.'
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}
watch(
  () => messages.value.length,
  () =>
    nextTick(() => {
      if (thread.value) thread.value.scrollTop = thread.value.scrollHeight
    })
)
watch(confirmDiscard, value => {
  if (value)
    nextTick(() => {
      discardDialog.value?.showModal()
      discardCancel.value?.focus()
    })
  else discardDialog.value?.close()
})
if (route.query.stage === 'draft') showExample()
onBeforeUnmount(stop)
</script>
