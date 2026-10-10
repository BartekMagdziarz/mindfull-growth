<template>
  <aside
    class="companion-panel"
    :class="{
      'companion-panel--conversation': hasConversation && !showTopics && !showOptions,
      'companion-panel--nested': nested,
      'mg-v2-surface mg-v2-surface--raised-sm': !nested,
    }"
    :aria-label="panelLabel"
  >
    <header>
      <h2>{{ surface === 'journal' ? 'Dziennik z AI' : 'Refleksja z AI' }}</h2>
      <button
        type="button"
        ref="settingsButton"
        class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm companion-settings-button"
        aria-label="Opcje rozmowy"
        title="Opcje rozmowy"
        :aria-expanded="showOptions"
        :aria-controls="`companion-options-${periodRef}`"
        @click="toggleOptions"
      >
        <AppIcon name="settings" />
      </button>
    </header>
    <div ref="scrollArea" class="companion-scroll">
      <section
        v-show="showOptions"
        :id="`companion-options-${periodRef}`"
        class="companion-options"
        aria-label="Opcje rozmowy"
        @keydown.esc.stop="closeOptions"
      >
        <h3>Opcje rozmowy</h3>
        <h4 class="companion-eyebrow">Dane</h4>
        <details v-if="policy" class="companion-access">
          <summary>Dostęp do historii</summary>
          <p class="companion-muted">
            Wybierz, z jakich zapisów AI może korzystać. Wyłączenie obejmuje też zależne informacje.
            Tekst bieżącego wpisu jest przekazywany przy rozpoczęciu rozmowy lub ręcznej analizie.
          </p>
          <label v-for="kind in SOURCE_KINDS" :key="kind">
            <input
              type="checkbox"
              :checked="!policy.excludedKinds.includes(kind)"
              :disabled="busy || savingPolicy"
              @change="toggleKind(kind, ($event.target as HTMLInputElement).checked)"
            />
            {{ kindLabels[kind] }}
          </label>
          <p v-if="policy.excludedSources.length" class="companion-muted">
            Wykluczone pojedyncze źródła: {{ policy.excludedSources.length }}.
            <button
              type="button"
              class="qr-quiet"
              :disabled="busy || savingPolicy"
              @click="restoreSources"
            >
              Przywróć dostęp do tych źródeł
            </button>
          </p>
        </details>
        <template v-if="record?.enabled">
          <h4 class="companion-eyebrow">Rozmowa</h4>
          <div class="companion-actions">
            <button type="button" class="qr-quiet" :disabled="busy" @click="run('topics')">
              {{ record.topicsInitialized ? 'Uwzględnij mój tekst' : 'Zaproponuj tematy' }}
            </button>
            <button type="button" class="qr-quiet" :disabled="busy" @click="confirmReset = true">
              Rozpocznij od aktualnych danych
            </button>
            <button type="button" class="qr-quiet" @click="disable">Wyłącz AI</button>
            <button
              v-if="record.messages.length"
              type="button"
              class="qr-quiet"
              :disabled="busy || suggestionBusy"
              @click="confirmClear = true"
            >
              Wyczyść rozmowę
            </button>
          </div>
          <section v-if="confirmReset" class="companion-insert" aria-label="Nowy kontekst">
            <p>Wcześniejsze wiadomości pozostaną do wglądu, ale AI nie będzie ich uwzględniać.</p>
            <div class="companion-actions">
              <button
                type="button"
                class="qr-primary"
                :disabled="busy"
                @click="confirmContextReset"
              >
                Rozpocznij ponownie</button
              ><button type="button" class="qr-quiet" @click="confirmReset = false">Anuluj</button>
            </div>
          </section>
          <h4 class="companion-eyebrow">Profil</h4>
          <div class="companion-profile">
            <RouterLink to="/profile?review=1#psychological"
              >Przejrzyj propozycje do profilu</RouterLink
            >
            <p v-if="suggestionBusy" role="status">
              Przygotowuję propozycje do profilu. Nie musisz czekać ani przerywać refleksji.
            </p>
            <p v-if="suggestionNotice" role="status">{{ suggestionNotice }}</p>
            <button
              v-if="record?.messages.length"
              type="button"
              class="qr-quiet"
              :disabled="suggestionBusy || busy"
              @click="suggestProfile"
            >
              Sprawdź propozycje po rozmowie
            </button>
          </div>
        </template>
        <section
          v-if="confirmClear"
          role="alertdialog"
          aria-label="Wyczyścić rozmowę?"
          aria-describedby="companion-clear-description"
          class="companion-insert"
        >
          <strong>Wyczyścić rozmowę?</strong>
          <p id="companion-clear-description">
            Usuniesz wszystkie wiadomości tej rozmowy, również wcześniejszą historię, oraz
            propozycje tematów. Nie można tego cofnąć. Wpis, refleksja i propozycje do profilu
            pozostaną zachowane.
          </p>
          <div class="companion-actions">
            <button type="button" class="qr-quiet" @click="confirmClear = false">Anuluj</button>
            <button
              type="button"
              class="qr-primary"
              :disabled="busy || suggestionBusy"
              @click="clearConversation"
            >
              Usuń wiadomości
            </button>
          </div>
        </section>
      </section>
      <p v-if="loading" role="status">Wczytuję rozmowę…</p>
      <template v-else-if="!record?.enabled">
        <p>
          Możesz przegadać swój temat albo skorzystać z propozycji opartych na Twojej historii. Twój
          wpis pozostaje do Twojej dyspozycji.
        </p>
        <p class="companion-muted">Wybrane zapisy i tekst wpisu trafią do OpenAI.</p>
        <details class="companion-muted">
          <summary>Szczegóły</summary>
          <p>
            Respektujemy wykluczenia źródeł. Propozycje do profilu wymagają Twojego zatwierdzenia.
          </p>
        </details>
        <button type="button" class="qr-primary" :disabled="busy" @click="enable">
          {{ enableLabel }}
        </button>
      </template>
      <template v-else>
        <p v-if="!busy && record.pending && record.pending.expiresAt > Date.now()" role="status">
          Rozmowa jest otwarta w innej karcie.
          <button type="button" class="qr-quiet" @click="reload">Sprawdź ponownie</button>
        </p>
        <div
          ref="messageList"
          class="companion-messages"
          role="log"
          aria-label="Wiadomości rozmowy"
        >
          <article
            v-for="message in currentMessages"
            :key="message.id"
            :class="`companion-message companion-message--${message.role}`"
          >
            <span class="companion-author">{{
              message.role === 'user' ? 'Ty' : message.role === 'assistant' ? 'AI' : 'Rozmowa'
            }}</span>
            <h3 v-if="message.topicTitle">{{ message.topicTitle }}</h3>
            <p>{{ message.text }}</p>
            <div class="companion-message-toolbar">
              <details v-if="message.citations.length" class="companion-message-sources">
                <summary>Źródła · {{ message.citations.length }}</summary>
                <div class="companion-sources">
                  <button
                    v-for="(citation, index) in message.citations"
                    :key="index"
                    type="button"
                    class="qr-quiet"
                    @click="showSource(citation, 0, $event)"
                  >
                    Źródło {{ index + 1 }}
                  </button>
                </div>
              </details>
              <button
                v-if="message.role === 'assistant'"
                type="button"
                class="companion-text-action"
                @click="prepareInsert(message.text)"
              >
                Dodaj do wpisu
              </button>
            </div>
          </article>
          <AiActivity v-if="busy" :label="progress" @cancel="cancel" />
        </div>
        <AiActivity
          v-if="suggestionBusy"
          label="Sprawdzam propozycje do profilu…"
          @cancel="suggestionController?.abort()"
        />
        <hr v-if="hasConversation && showTopics" class="mg-v2-hairline companion-hairline" />
        <button
          v-if="hasConversation"
          type="button"
          class="qr-quiet"
          :aria-expanded="showTopics"
          @click="toggleTopics"
        >
          {{ showTopics ? 'Ukryj propozycje tematów' : 'Propozycje tematów' }}
        </button>
        <section
          v-if="!hasConversation || showTopics"
          class="companion-topic-picker"
          aria-label="Wybierz temat"
        >
          <p v-if="record.topicNotice" class="companion-introduction">{{ record.topicNotice }}</p>
          <p
            v-if="record.analyzedDraft !== undefined && record.analyzedDraft !== draftSnapshot"
            class="companion-muted"
          >
            Tekst wpisu zmienił się. W opcjach możesz uwzględnić go w propozycjach.
          </p>
          <p v-if="record.topicsInitialized && !record.topics.length" class="companion-muted">
            Na razie nie ma propozycji. Możesz napisać własny temat.
          </p>
          <ul class="companion-topics" aria-label="Propozycje tematów">
            <li v-for="topic in record.topics" :key="topic.id">
              <details
                class="companion-topic"
                :name="`companion-topic-${periodRef}`"
                :data-active="activeTopicId === topic.id"
              >
                <summary>
                  <AppIcon name="chat" class="companion-topic-icon" />
                  <span class="companion-topic-title">{{ topic.title }}</span>
                  <AppIcon name="expand_more" class="companion-topic-chevron" />
                </summary>
                <p>{{ topic.invitation }}</p>
                <div v-if="topic.citations.length" class="companion-sources">
                  <button
                    v-for="(citation, index) in topic.citations"
                    :key="index"
                    type="button"
                    class="qr-quiet"
                    :aria-label="`Źródło ${index + 1}: ${topic.title}`"
                    @click="showSource(citation, 0, $event)"
                  >
                    Źródło {{ index + 1 }}
                  </button>
                </div>
                <button
                  type="button"
                  class="qr-primary"
                  :disabled="busy"
                  @click="run('conversation', topic.id)"
                >
                  Porozmawiaj o tym
                </button>
              </details>
            </li>
          </ul>
        </section>
        <details v-if="archivedMessages.length" class="companion-archive">
          <summary>Wcześniejsza rozmowa · {{ archivedMessages.length }} wiadomości</summary>
          <p class="companion-muted">
            Te wiadomości pozostają do wglądu. AI nie uwzględnia ich w obecnej rozmowie.
          </p>
          <article v-for="entry in archivedMessages" :key="entry.id" class="companion-message">
            <span class="companion-author">{{
              entry.role === 'user' ? 'Ty' : entry.role === 'assistant' ? 'AI' : 'Rozmowa'
            }}</span>
            <p>{{ entry.text }}</p>
          </article>
        </details>
      </template>
      <p v-if="error" role="alert" class="companion-error">
        {{ errorText }}
        <a v-if="error === 'missing-api-key'" href="/profile#ai-settings">Ustawienia AI</a>
      </p>
      <section v-if="insertion !== null" class="companion-insert" aria-label="Fragment do dodania">
        <label :for="`companion-insert-${periodRef}`"
          >Wybierz lub popraw fragment przed dodaniem</label
        >
        <textarea :id="`companion-insert-${periodRef}`" v-model="insertion" rows="5" />
        <div class="companion-actions">
          <button type="button" class="qr-primary" :disabled="!insertion.trim()" @click="insert">
            Dodaj wybrany tekst</button
          ><button type="button" class="qr-quiet" @click="insertion = null">Anuluj</button>
        </div>
      </section>
      <Teleport v-if="sourceOpen && sourceTarget" :to="sourceTarget"
        ><section class="companion-source" aria-label="Podgląd źródła">
          <button type="button" class="qr-quiet" @click="closeSource">Zamknij źródło</button>
          <p v-if="sourceLoading" role="status">Wczytuję źródło…</p>
          <template v-else-if="source?.status === 'ok'">
            <h3>{{ readableSourceTitle(source) }}</h3>
            <button
              type="button"
              class="qr-quiet"
              :disabled="busy || savingPolicy"
              @click="excludeSource(source.ref)"
            >
              Wyklucz to źródło z AI
            </button>
            <small>{{ source.occurredAt.slice(0, 10) }}</small>
            <HistorySourceContent :source="source" />
            <button
              v-if="source.nextOffset !== null"
              type="button"
              class="qr-quiet"
              @click="showSource({ ref: source.ref, version: source.version }, source.nextOffset)"
            >
              Dalsza część źródła
            </button>
          </template>
          <p v-else>
            {{
              source?.status === 'changed'
                ? 'Źródło zmieniło się od czasu odpowiedzi. W opcjach rozpocznij rozmowę od aktualnych danych.'
                : 'To źródło nie jest już dostępne dla AI.'
            }}
          </p>
        </section>
      </Teleport>
    </div>
    <form v-if="record?.enabled" class="companion-form" @submit.prevent="run('conversation')">
      <label class="sr-only" :for="`companion-message-${periodRef}`"
        >Twój temat lub wiadomość</label
      >
      <textarea
        :id="`companion-message-${periodRef}`"
        ref="messageInput"
        v-model="message"
        rows="2"
        maxlength="12000"
        :disabled="busy"
        @keydown="onMessageKeydown"
        :placeholder="hasConversation ? 'Twoja odpowiedź…' : 'Napisz własny temat…'"
      />
      <button
        type="submit"
        class="mg-v2-button mg-v2-button--primary mg-v2-button--icon companion-send"
        aria-label="Wyślij"
        title="Wyślij"
        :disabled="busy || !message.trim()"
      >
        <AppIcon name="arrow_upward" />
      </button>
    </form>
    <p class="sr-only" role="status">{{ insertionNotice }}</p>
  </aside>
</template>

<script setup lang="ts">
import AiActivity from '@/components/shared/AiActivity.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { readableSourceTitle } from './sourcePresentation'
import HistorySourceContent from './HistorySourceContent.vue'
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useT } from '@/composables/useT'
import { companionConversation } from '@/services/ai/companion/weeklyConversation'
import { createHistoryTools } from '@/services/ai/history/tools'
import { CompanionError } from '@/services/ai/companion/openai'
import type { Citation } from '@/services/ai/companion/runtime'
import type { CompanionConversation, CompanionMessage } from '@/domain/companionConversation'
import { proposeConversationProfile } from '@/services/ai/profile/assistant'
import { getUserDatabase } from '@/services/userDatabase.service'
import { loadHistoryAccessPolicy, saveHistoryAccessPolicy } from '@/services/ai/history/access'
import {
  SOURCE_KINDS,
  sourceKey,
  type SourceKind,
  type SourceRef,
  type HistoryAccessPolicy,
} from '@/services/ai/history/contracts'
const props = withDefaults(
  defineProps<{
    periodRef: string
    draft: string
    ritualContext?: string
    surface?: CompanionConversation['surface']
    conversationId?: string
    journalEntryId?: string
    /** Hosted inside another surface card (rituals): field tone, no shadow. */
    nested?: boolean
  }>(),
  { surface: 'weekly-reflection', nested: false }
)
const panelLabel = computed(() =>
  props.surface === 'journal'
    ? 'Rozmowa AI przy wpisie'
    : props.surface === 'monthly-reflection'
      ? 'Rozmowa AI o miesiącu'
      : 'Rozmowa AI o tygodniu'
)
const enableLabel = computed(() =>
  props.surface === 'journal'
    ? 'Włącz AI dla tego wpisu'
    : props.surface === 'monthly-reflection'
      ? 'Włącz AI dla tego miesiąca'
      : 'Włącz AI dla tego tygodnia'
)
const emit = defineEmits<{ insert: [text: string] }>()
const { locale } = useT()
const client = companionConversation(props.periodRef, {
  surface: props.surface,
  conversationId: props.conversationId,
  journalEntryId: props.journalEntryId,
  locale: locale.value === 'pl' ? 'pl' : 'en',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})
const record = shallowRef<CompanionConversation>()
const showTopics = ref(false)
const showOptions = ref(false)
const settingsButton = ref<HTMLButtonElement | null>(null)
function closeOptions() {
  if (showOptions.value) void toggleOptions()
  settingsButton.value?.focus()
}
const scrollArea = ref<HTMLElement | null>(null)
let savedScrollTop = 0
async function toggleOptions() {
  if (!showOptions.value) savedScrollTop = scrollArea.value?.scrollTop ?? 0
  showOptions.value = !showOptions.value
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = showOptions.value ? 0 : savedScrollTop
}
const confirmClear = ref(false)
const confirmReset = ref(false)
function toggleTopics() {
  closeSource()
  showTopics.value = !showTopics.value
}
const conversationStart = computed(() => {
  const row = record.value
  if (!row) return 0
  let index = row.historyStartIndex ?? 0
  row.messages.forEach((message, i) => {
    if (message.role === 'notice') index = Math.max(index, i + 1)
  })
  return index
})
const pendingMessage = ref<CompanionMessage | null>(null)
const currentMessages = computed(() => [
  ...(record.value?.messages.slice(conversationStart.value) ?? []),
  ...(pendingMessage.value ? [pendingMessage.value] : []),
])
const archivedMessages = computed(
  () => record.value?.messages.slice(0, conversationStart.value) ?? []
)
const hasConversation = computed(() => currentMessages.value.some(m => m.role !== 'notice'))
const messageList = ref<HTMLElement | null>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)
const activeTopicId = computed(
  () => [...currentMessages.value].reverse().find(m => m.topicId)?.topicId
)

const policy = shallowRef<HistoryAccessPolicy>()
const savingPolicy = ref(false)
const kindLabels: Record<SourceKind, string> = {
  journal: 'Dziennik',
  emotion: 'Emocje',
  reflection: 'Refleksje',
  conversation: 'Rozmowy przy wpisach',
  planning: 'Cele i plany',
  measurement: 'Zapisy wykonania',
  exercise: 'Ćwiczenia',
  assessment: 'Kwestionariusze',
}
async function changePolicy(next: Pick<HistoryAccessPolicy, 'excludedKinds' | 'excludedSources'>) {
  if (busy.value || savingPolicy.value) return
  savingPolicy.value = true
  try {
    policy.value = await saveHistoryAccessPolicy(next)
    closeSource()
    error.value = record.value?.state ? 'history-changed' : ''
  } catch {
    error.value = 'save-error'
  } finally {
    savingPolicy.value = false
  }
}
async function toggleKind(kind: SourceKind, allowed: boolean) {
  try {
    const current = await loadHistoryAccessPolicy(getUserDatabase())
    await changePolicy({
      excludedKinds: allowed
        ? current.excludedKinds.filter(k => k !== kind)
        : [...new Set([...current.excludedKinds, kind])],
      excludedSources: current.excludedSources,
    })
  } catch {
    error.value = 'save-error'
  }
}
async function excludeSource(sourceRef: SourceRef) {
  try {
    const current = await loadHistoryAccessPolicy(getUserDatabase())
    await changePolicy({
      excludedKinds: current.excludedKinds,
      excludedSources: [
        ...current.excludedSources.filter(r => sourceKey(r) !== sourceKey(sourceRef)),
        sourceRef,
      ],
    })
  } catch {
    error.value = 'save-error'
  }
}
async function restoreSources() {
  try {
    const current = await loadHistoryAccessPolicy(getUserDatabase())
    await changePolicy({ excludedKinds: current.excludedKinds, excludedSources: [] })
  } catch {
    error.value = 'save-error'
  }
}
const loading = ref(true),
  busy = ref(false),
  error = ref(''),
  progress = ref('Analizuję kontekst…')
const message = ref(''),
  insertion = ref<string | null>(null),
  insertionNotice = ref('')
const draftSnapshot = computed(() =>
  JSON.stringify({ reflection: props.draft, otherAnswers: props.ritualContext ?? '' })
)
let disposed = false,
  controller: AbortController | undefined
const errorText = computed(
  () =>
    ({
      'missing-api-key': 'Podłącz OpenAI w ustawieniach AI, a następnie spróbuj ponownie.',
      'profile-changed': 'Profil zmienił się. W opcjach wybierz „Rozpocznij od aktualnych danych”.',
      'profile-context-limit':
        'Profil przekracza limit kontekstu. Skróć aktywne informacje w profilu.',
      'history-changed':
        'Historia lub dostęp do danych zmieniły się. W opcjach wybierz „Rozpocznij od aktualnych danych”.',
      'conversation-busy': 'Trwa już ta rozmowa w innej karcie. Poczekaj i sprawdź ponownie.',
      'conversation-changed': 'Stan rozmowy zmienił się w innej karcie. Otwórz panel ponownie.',
      cancelled: 'Przerwano analizę. Możesz dalej pisać wpis.',
      'cost-limit': 'Osiągnięto limit kosztu tej rozmowy. Refleksję możesz dalej pisać i zapisać.',
      'unverified-citation': 'Nie udało się potwierdzić źródła odpowiedzi. Spróbuj ponownie.',
    })[error.value] ??
    'Nie udało się uzyskać odpowiedzi. Spróbuj ponownie; możesz też zapisać wpis bez AI.'
)
async function reload() {
  try {
    const row = await client.load()
    if (!disposed) record.value = row
  } catch {
    if (!disposed) error.value = 'load-error'
  }
}
async function enable() {
  if (busy.value) return
  try {
    record.value = await client.setEnabled(true)
    await run('topics')
  } catch {
    error.value = 'save-error'
  }
}
async function disable() {
  cancel()
  suggestionController?.abort()
  try {
    const row = await client.setEnabled(false)
    if (!disposed) record.value = row
  } catch {
    error.value = 'save-error'
  }
}
function cancel() {
  controller?.abort()
  suggestionController?.abort()
}
defineExpose({ cancel })
async function clearConversation() {
  if (busy.value || suggestionBusy.value) return
  try {
    record.value = await client.clearConversation()
    closeSource()
    showTopics.value = false
    confirmClear.value = false
    insertion.value = null
    message.value = ''
    suggestionNotice.value = ''
    error.value = ''
  } catch (reason) {
    error.value = reason instanceof CompanionError ? reason.code : 'save-error'
  }
}
function confirmContextReset() {
  confirmReset.value = false
  void resetContext()
}
async function resetContext() {
  if (busy.value) return
  try {
    closeSource()
    showTopics.value = false
    record.value = await client.resetContext()
    error.value = ''
    await run('topics')
  } catch {
    error.value = 'conversation-busy'
  }
}
function onMessageKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    if (!busy.value && message.value.trim()) void run('conversation')
  }
}
async function run(mode: 'topics' | 'conversation', topicId?: string) {
  if (busy.value || disposed || !record.value?.enabled) return
  if (mode === 'conversation' && !topicId && !message.value.trim()) return
  busy.value = true
  error.value = ''
  progress.value = 'Analizuję kontekst…'
  controller = new AbortController()
  const sent = message.value
  if (mode === 'conversation' && !topicId) {
    pendingMessage.value = {
      id: crypto.randomUUID(),
      role: 'user',
      text: sent.trim(),
      citations: [],
      createdAt: new Date().toISOString(),
    }
    message.value = ''
    showTopics.value = false
    showOptions.value = false
    closeSource()
    await nextTick()
    if (!disposed && scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
  }
  try {
    const row = await client.run({
      mode,
      draft: draftSnapshot.value,
      topicId,
      message: topicId ? undefined : sent,
      signal: controller.signal,
      onEvent: event => {
        if (!disposed && event.type === 'tool-call')
          progress.value =
            event.name === 'read_sources'
              ? 'Czytam wybrane zapisy…'
              : 'Szukam istotnych informacji…'
      },
    })
    if (!disposed) {
      record.value = row
      pendingMessage.value = null
      if (mode === 'conversation') {
        showTopics.value = false
        closeSource()
        await nextTick()
        if (!disposed)
          messageList.value?.lastElementChild?.scrollIntoView({
            block: 'nearest',
            behavior: 'auto',
          })
        if (!topicId) void suggestProfile()
      }
    }
  } catch (reason) {
    if (!disposed) {
      error.value = reason instanceof CompanionError ? reason.code : 'runtime-error'
      if (pendingMessage.value) message.value = sent
      pendingMessage.value = null
      await reload()
    }
  } finally {
    if (!disposed) {
      busy.value = false
      if (topicId && !error.value) {
        await nextTick()
        if (!disposed) messageInput.value?.focus({ preventScroll: true })
      }
    }
  }
}
const suggestionBusy = ref(false),
  suggestionNotice = ref('')
let suggestionController: AbortController | undefined
async function suggestProfile() {
  if (disposed || suggestionBusy.value || !record.value?.enabled) return
  suggestionBusy.value = true
  suggestionNotice.value = ''
  suggestionController = new AbortController()
  try {
    await proposeConversationProfile(record.value.id, { signal: suggestionController.signal })
    if (!disposed)
      suggestionNotice.value =
        'Sprawdzono możliwe propozycje. Jeśli powstały, znajdziesz je w profilu; nic nie zostało przyjęte automatycznie.'
  } catch {
    if (!disposed)
      suggestionNotice.value =
        'Nie udało się przygotować propozycji. Rozmowa jest zapisana; możesz spróbować później.'
  } finally {
    if (!disposed) suggestionBusy.value = false
  }
}
function prepareInsert(text: string) {
  insertion.value = text
  insertionNotice.value = ''
}
function insert() {
  if (insertion.value?.trim()) {
    emit('insert', insertion.value.trim())
    insertion.value = null
    insertionNotice.value = 'Dodano fragment do wpisu.'
  }
}
type Source = Awaited<
  ReturnType<ReturnType<typeof createHistoryTools>['readSources']>
>['items'][number]
const source = shallowRef<Source>(),
  sourceLoading = ref(false),
  sourceOpen = ref(false)
let sourceRequest = 0
function closeSource() {
  sourceRequest++
  sourceOpen.value = false
  source.value = undefined
}
const sourceTarget = shallowRef<HTMLElement | null>(null)
async function showSource(citation: Citation, offset = 0, event?: Event) {
  if (event)
    sourceTarget.value = (event.currentTarget as HTMLElement).closest(
      '.companion-topic, .companion-message-sources'
    )
  const request = ++sourceRequest
  sourceOpen.value = true
  sourceLoading.value = true
  try {
    const result = await createHistoryTools().readSources({
      requests: [{ ref: citation.ref, expectedVersion: citation.version, offset }],
    })
    if (!disposed && request === sourceRequest) source.value = result.items[0]
  } catch {
    if (!disposed && request === sourceRequest) source.value = undefined
  } finally {
    if (!disposed && request === sourceRequest) sourceLoading.value = false
  }
}
onMounted(async () => {
  await reload()
  try {
    const value = await loadHistoryAccessPolicy(getUserDatabase())
    if (!disposed) policy.value = value
  } catch {
    if (!disposed) error.value = 'load-error'
  }
  if (disposed) return
  loading.value = false
  if (
    record.value?.enabled &&
    !record.value.topicsInitialized &&
    (!record.value.pending || record.value.pending.expiresAt <= Date.now())
  )
    await run('topics')
})
onBeforeUnmount(() => {
  suggestionController?.abort()
  disposed = true
  cancel()
  sourceRequest++
})
</script>

<style scoped>
/* Tonal ladder (tokens.css): the panel is a sibling of the entry card, so the
   shell is the surface step and everything inside climbs one step per level:
   --cp-shell (card) → --cp-field (fields, bubbles, blocks) → --cp-inner
   (open/hover). The nested variant (rituals, inside .qr-card) starts one
   step higher and drops the shadow — only the surface level carries one. */
.companion-panel {
  --cp-shell: var(--mg-color-surface);
  --cp-field: var(--mg-color-mist);
  --cp-inner: var(--mg-color-paper);
  --cp-line: var(--mg-color-field-border);
  min-width: 0;
  padding: var(--mg-space-5) var(--mg-space-5) var(--mg-space-4);
  border-radius: var(--mg-radius-lg);
  background: var(--cp-shell);
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 0;
  gap: 0.7rem;
  overflow: hidden;
}
.companion-panel--nested {
  --cp-shell: var(--mg-color-mist);
  --cp-field: var(--mg-color-paper);
  --cp-inner: var(--mg-color-paper);
  --cp-line: color-mix(in srgb, var(--mg-color-primary) 26%, transparent);
  padding: 12px 14px;
  border: 0;
  border-radius: 14px 18px 15px 17px;
  box-shadow: none;
}
.companion-panel--conversation {
  height: min(55dvh, 42rem);
  min-height: 22rem;
}
.companion-panel--conversation .companion-scroll {
  overflow-y: auto;
}

/* Header */
.companion-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.companion-panel h2 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}
.companion-panel .companion-settings-button[aria-expanded='true'] {
  background: var(--cp-field);
  box-shadow: none;
}

/* Scroll area */
.companion-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: visible;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.15rem 0.35rem 0.5rem 0;
}

/* Text */
.companion-panel p {
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.companion-muted {
  font-size: 0.78rem;
  color: var(--mg-color-muted);
}
.companion-introduction {
  font-size: 0.87rem;
}
.companion-eyebrow {
  margin: 0.35rem 0 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: var(--mg-color-primary-strong);
}
.companion-options,
.companion-archive,
.companion-message-sources,
.companion-access {
  font-size: 0.8rem;
}
summary {
  cursor: pointer;
  padding: 0.45rem 0.15rem;
}

/* Blocks (options, insert, source, error): field tone, no inset, no shadow. */
.companion-options {
  flex: none;
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
}
.companion-options h3 {
  margin: 0;
  font-size: 0.9rem;
}
.companion-profile {
  display: grid;
  gap: 0.6rem;
}
.companion-access label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.companion-insert,
.companion-source {
  display: grid;
  gap: 0.65rem;
  padding: 0.8rem 0.9rem;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  font-size: 0.85rem;
}
.companion-source {
  max-height: 28rem;
  overflow: auto;
}
.companion-source article {
  font-size: 0.8rem;
}
.companion-status,
.companion-error {
  font-size: 0.85rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
}
.companion-error {
  color: var(--mg-color-rose);
  background: var(--mg-color-rose-soft);
}

/* Messages: AI sits on the card itself, the user gets an indented field bubble. */
.companion-messages {
  display: grid;
  gap: 1rem;
}
.companion-message {
  font-size: 0.87rem;
  padding: 0;
}
.companion-author {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.68rem;
  font-weight: 750;
  color: var(--mg-color-muted);
}
.companion-message h3 {
  font-size: 0.9rem;
  margin: 0.3rem 0;
}
.companion-message--user {
  margin-left: 1.75rem;
  padding: 0.7rem 0.9rem;
  background: var(--cp-field);
  border-radius: var(--mg-radius-lg);
}
.companion-message--notice {
  color: var(--mg-color-muted);
  font-size: 0.78rem;
}
.companion-message-toolbar {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.85rem;
}
.companion-text-action {
  border: 0;
  padding: 0.45rem 0;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: 0.8rem;
  cursor: pointer;
}
.companion-text-action:hover {
  color: var(--mg-color-ink);
}
.companion-hairline {
  margin: 0.2rem 0 0;
}

/* Topics */
.companion-topic-picker {
  flex: none;
  min-width: 0;
}
.companion-topics {
  list-style: none;
  margin: 0.75rem 0 0.5rem;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
.companion-topics li {
  min-width: 0;
}
.companion-topic {
  display: block;
  text-align: left;
  background: var(--cp-field);
  border: 1px solid transparent;
  border-radius: var(--mg-radius-md, 16px);
  transition: background 180ms ease;
}
.companion-topic[open] {
  background: var(--cp-inner);
  padding-bottom: 0.8rem;
}
.companion-topic[data-active='true'] {
  border-color: var(--mg-color-primary, #568ac5);
}
.companion-topic > summary {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 3rem;
  padding: 0.65rem 0.8rem;
  list-style: none;
  color: var(--mg-color-ink, #183153);
  font-size: 0.84rem;
  line-height: 1.35;
  font-weight: 650;
  border-radius: inherit;
}
.companion-topic > summary::-webkit-details-marker {
  display: none;
}
.companion-topic > summary:hover {
  color: var(--mg-color-primary);
}
.companion-topic-title {
  flex: 1;
  min-width: 0;
}
.companion-topic-icon,
.companion-topic-chevron {
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
  color: var(--mg-color-primary);
}
.companion-topic-chevron {
  transition: transform 180ms ease;
}
.companion-topic[open] > summary .companion-topic-chevron {
  transform: rotate(180deg);
}
.companion-topic > p,
.companion-topic > div,
.companion-topic > button,
.companion-topic > .companion-source {
  margin: 0.6rem 0.8rem 0;
}
.companion-topic > p {
  font-size: 0.84rem;
}

/* Composer: a field like the entry canvas, no divider line. */
.companion-form {
  position: relative;
  display: block;
  flex: none;
  padding-top: 0.2rem;
  font-size: 0.85rem;
}
.companion-panel textarea {
  width: 100%;
  min-width: 0;
  resize: vertical;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--cp-line);
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  color: var(--mg-color-ink);
}
.companion-panel textarea::placeholder {
  color: var(--mg-color-muted);
}
.companion-form textarea {
  display: block;
  padding-right: 3.5rem;
  min-height: 3.5rem;
  max-height: 8rem;
}
.companion-form .companion-send {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  min-height: 2.25rem;
}

/* Buttons: quiet = bare text that gains the field tone on hover,
   primary = filled product accent. Class names stay for the e2e specs. */
.companion-actions,
.companion-sources {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.companion-panel .qr-primary,
.companion-panel .qr-quiet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: none;
  font-size: 0.82rem;
  cursor: pointer;
}
.companion-panel .qr-primary {
  padding: 0.6rem 0.95rem;
  border-radius: var(--mg-radius-md, 12px);
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
}
.companion-panel .qr-primary:not(:disabled):hover {
  background: var(--mg-color-primary-fill-hover);
}
.companion-panel .qr-quiet {
  padding: 0.45rem 0.7rem;
  border-radius: var(--mg-radius-sm, 10px);
  background: transparent;
  color: var(--mg-color-muted);
}
.companion-panel .qr-quiet:not(:disabled):hover {
  background: var(--cp-field);
  color: var(--mg-color-ink);
}
/* Direct children of the column must not stretch into centred full-width rows. */
.companion-scroll > .qr-quiet,
.companion-scroll > .qr-primary {
  align-self: flex-start;
}
.companion-profile > .qr-quiet,
.companion-options > .qr-quiet {
  justify-self: start;
}
.companion-panel button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Focus: the product ring, never an outline in a foreign colour. */
.companion-panel :is(button, textarea, summary, a, input):focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}
.companion-panel textarea:focus-visible {
  border-color: var(--mg-color-primary);
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .companion-topic,
  .companion-topic-chevron {
    transition: none;
  }
}
</style>
