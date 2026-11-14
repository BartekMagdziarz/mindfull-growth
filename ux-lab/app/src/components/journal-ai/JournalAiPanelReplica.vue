<template>
  <aside
    class="cp mg-v2-surface mg-v2-surface--raised-sm"
    :class="[`cp--${variant}`, { 'cp--conversation': hasConversation, 'cp--fixed': fixed }]"
    aria-label="Rozmowa AI przy wpisie"
  >
    <header class="cp__head">
      <h2>Dziennik z AI</h2>
      <div class="cp__head-actions">
        <button
          v-if="separate === 'expand'"
          type="button"
          class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm"
          aria-label="Otwórz rozmowę w całym oknie"
          title="Otwórz rozmowę w całym oknie"
          @click="say('W produkcie: ta sama rozmowa na szerokiej scenie obok wpisu (zastępuje dzisiejszy osobny czat).')"
        >
          <AppIcon name="open_in_full" />
        </button>
        <button
          type="button"
          class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm cp__gear"
          aria-label="Opcje rozmowy"
          title="Opcje rozmowy"
          :aria-expanded="showOptions"
          @click="showOptions = !showOptions"
        >
          <AppIcon name="settings" />
        </button>
      </div>
    </header>

    <!-- Obecnie: drugie wejście do AI nad rozmową. -->
    <div v-if="separate === 'top'" class="cp__chat-entry">
      <button type="button" class="mg-v2-button" :aria-expanded="intentsOpen" @click="intentsOpen = !intentsOpen">
        <AppIcon name="forum" />
        Porozmawiaj w osobnym czacie
      </button>
      <div v-if="intentsOpen" class="cp__intents" role="group" aria-label="Z jaką intencją">
        <button v-for="intent in INTENTS" :key="intent" type="button" class="mg-v2-pill" @click="leave(intent)">{{ intent }}</button>
      </div>
    </div>

    <div ref="scrollArea" class="cp__scroll">
      <!-- Arkusz opcji (replika kształtu). -->
      <section v-if="showOptions" class="cp__options" aria-label="Opcje rozmowy">
        <h3>Opcje rozmowy</h3>
        <h4 class="cp__eyebrow">Dane</h4>
        <details class="cp__details"><summary>Dostęp do historii</summary><p class="cp__muted">Dziennik · Emocje · Refleksje · Rozmowy przy wpisach · Cele i plany · Zapisy wykonania</p></details>
        <h4 class="cp__eyebrow">Rozmowa</h4>
        <div class="cp__actions">
          <button type="button" class="qr-quiet" @click="proposeTopics">Zaproponuj tematy</button>
          <button type="button" class="qr-quiet" @click="resetContext">Rozpocznij od aktualnych danych</button>
          <button type="button" class="qr-quiet" @click="say('Podgląd w Labie: AI wyłączone dla tego wpisu.')">Wyłącz AI</button>
          <button v-if="hasConversation" type="button" class="qr-quiet" @click="clearAll">Wyczyść rozmowę</button>
        </div>
        <template v-if="topicsPlace === 'gear'">
          <h4 class="cp__eyebrow">Propozycje tematów</h4>
          <ul v-if="unusedTopics.length" class="cp__topics" aria-label="Propozycje tematów">
            <li v-for="topic in unusedTopics" :key="topic.id">
              <details class="cp__topic" name="cp-topic-gear">
                <summary><AppIcon name="chat" class="cp__topic-icon" /><span class="cp__topic-title">{{ topic.title }}</span><AppIcon name="expand_more" class="cp__topic-chevron" /></summary>
                <p>{{ topic.invitation }}</p>
                <button type="button" class="qr-primary" @click="startTopic(topic.id)">Porozmawiaj o tym</button>
              </details>
            </li>
          </ul>
          <p v-else class="cp__muted">Wszystkie tematy zostały już poruszone. Możesz napisać własny.</p>
        </template>
        <template v-if="archivePlace === 'gear' && archived.length">
          <h4 class="cp__eyebrow">Wcześniejsza rozmowa</h4>
          <details class="cp__details">
            <summary>{{ messageCountLabel(archived.length) }}</summary>
            <p class="cp__muted">Te wiadomości pozostają do wglądu. AI nie uwzględnia ich w obecnej rozmowie.</p>
            <div class="cp__messages cp__messages--dim"><article v-for="m in archived" :key="m.id" class="cp__msg" :class="`cp__msg--${m.role}`"><span class="cp__author">{{ m.role === 'user' ? 'Ty' : 'AI' }}</span><p>{{ m.text }}</p></article></div>
          </details>
        </template>
        <template v-if="separate === 'gear'">
          <h4 class="cp__eyebrow">Osobny czat</h4>
          <div class="cp__intents" role="group" aria-label="Z jaką intencją">
            <button v-for="intent in INTENTS" :key="intent" type="button" class="mg-v2-pill" @click="leave(intent)">{{ intent }}</button>
          </div>
        </template>
        <h4 class="cp__eyebrow">Profil</h4>
        <div class="cp__profile"><a href="#" @click.prevent="say('Podgląd w Labie: propozycje do profilu.')">Przejrzyj propozycje do profilu</a></div>
      </section>

      <template v-else>
        <!-- A/B/C: wcześniejsza rozmowa na górze logu, chronologicznie. -->
        <div v-if="archivePlace === 'top' && archived.length" class="cp__archive-top">
          <button type="button" class="cp__fold" :aria-expanded="archiveOpen" @click="archiveOpen = !archiveOpen">
            <AppIcon name="expand_more" class="cp__fold-chevron" :class="{ 'is-open': archiveOpen }" />
            <span>Wcześniejsza rozmowa · {{ messageCountLabel(archived.length) }}</span>
          </button>
          <div v-if="archiveOpen" class="cp__messages cp__messages--dim" role="log" aria-label="Wcześniejsza rozmowa">
            <article v-for="m in archived" :key="m.id" class="cp__msg" :class="`cp__msg--${m.role}`">
              <span class="cp__author">{{ m.role === 'user' ? 'Ty' : 'AI' }}</span>
              <h3 v-if="m.topicTitle">{{ m.topicTitle }}</h3>
              <p>{{ m.text }}</p>
            </article>
          </div>
          <div class="cp__context-line" role="separator" aria-label="Nowy kontekst"><span>Nowy kontekst · AI nie widzi wcześniejszych wiadomości</span></div>
        </div>

        <!-- Przed rozmową: lista tematów z zaproszeniami (bez zmian we wszystkich wariantach). -->
        <section v-if="!hasConversation" class="cp__picker" aria-label="Wybierz temat">
          <p class="cp__intro">Mam kilka tematów z Twojej historii. Wybierz jeden albo napisz własny.</p>
          <ul class="cp__topics" aria-label="Propozycje tematów">
            <li v-for="topic in unusedTopics" :key="topic.id">
              <details class="cp__topic" name="cp-topic">
                <summary><AppIcon name="chat" class="cp__topic-icon" /><span class="cp__topic-title">{{ topic.title }}</span><AppIcon name="expand_more" class="cp__topic-chevron" /></summary>
                <p>{{ topic.invitation }}</p>
                <div class="cp__sources"><button v-for="n in topic.sources" :key="n" type="button" class="qr-quiet">Źródło {{ n }}</button></div>
                <button type="button" class="qr-primary" @click="startTopic(topic.id)">Porozmawiaj o tym</button>
              </details>
            </li>
          </ul>
        </section>

        <div v-else class="cp__messages" role="log" aria-label="Wiadomości rozmowy">
          <template v-for="item in log" :key="item.id">
            <!-- C: propozycje tematów jako wiadomość w logu. -->
            <article v-if="item.kind === 'topics'" class="cp__msg cp__msg--topics">
              <span class="cp__author">Rozmowa</span>
              <p>{{ item.lead }}</p>
              <div v-if="chipsFor(item).length" class="cp__chips">
                <button v-for="topic in chipsFor(item)" :key="topic.id" type="button" class="mg-v2-pill cp__chip" :title="topic.invitation" @click="startTopic(topic.id)">{{ topic.title }}</button>
              </div>
              <p v-else class="cp__muted">Wszystkie tematy zostały już poruszone.</p>
            </article>
            <article v-else class="cp__msg" :class="`cp__msg--${item.role}`">
              <span class="cp__author">{{ item.role === 'user' ? 'Ty' : 'AI' }}</span>
              <h3 v-if="item.topicTitle">{{ item.topicTitle }}</h3>
              <p>{{ item.text }}</p>
              <div v-if="item.role === 'assistant'" class="cp__toolbar">
                <details v-if="item.sources" class="cp__sources-fold"><summary>Źródła · {{ item.sources }}</summary><div class="cp__sources"><button v-for="n in item.sources" :key="n" type="button" class="qr-quiet">Źródło {{ n }}</button></div></details>
                <button type="button" class="cp__text-action" @click="say('Podgląd w Labie: fragment do dodania do wpisu.')">Dodaj do wpisu</button>
              </div>
            </article>
          </template>
          <div v-if="busy" class="cp__activity" role="status"><span class="cp__pulse" />Analizuję kontekst…<button type="button" class="qr-quiet" @click="busy = false">Przerwij</button></div>
        </div>

        <!-- Obecnie: cichy przełącznik między wiadomościami a archiwum. -->
        <template v-if="topicsPlace === 'toggle' && hasConversation">
          <hr v-if="showTopics" class="mg-v2-hairline cp__hairline" />
          <button type="button" class="qr-quiet cp__toggle" :aria-expanded="showTopics" @click="showTopics = !showTopics">{{ showTopics ? 'Ukryj propozycje tematów' : 'Propozycje tematów' }}</button>
          <section v-if="showTopics" class="cp__picker" aria-label="Wybierz temat">
            <ul class="cp__topics" aria-label="Propozycje tematów">
              <li v-for="topic in unusedTopics" :key="topic.id">
                <details class="cp__topic" name="cp-topic-toggle">
                  <summary><AppIcon name="chat" class="cp__topic-icon" /><span class="cp__topic-title">{{ topic.title }}</span><AppIcon name="expand_more" class="cp__topic-chevron" /></summary>
                  <p>{{ topic.invitation }}</p>
                  <button type="button" class="qr-primary" @click="startTopic(topic.id)">Porozmawiaj o tym</button>
                </details>
              </li>
            </ul>
          </section>
        </template>
        <details v-if="archivePlace === 'bottom' && archived.length" class="cp__archive">
          <summary>Wcześniejsza rozmowa · {{ archived.length }} wiadomości</summary>
          <p class="cp__muted">Te wiadomości pozostają do wglądu. AI nie uwzględnia ich w obecnej rozmowie.</p>
          <article v-for="m in archived" :key="m.id" class="cp__msg"><span class="cp__author">{{ m.role === 'user' ? 'Ty' : 'AI' }}</span><p>{{ m.text }}</p></article>
        </details>
      </template>
    </div>

    <form class="cp__form" @submit.prevent="send">
      <!-- A i B: startery nad polem, po kliknięciu dysku z żarówką. -->
      <div v-if="startersVisible" class="cp__starters" aria-label="Propozycje na następny ruch">
        <button
          v-for="s in starters"
          :key="`${s.kind}:${s.id}`"
          type="button"
          class="mg-v2-pill cp__chip"
          :class="{ 'cp__chip--lens': s.kind === 'lens' }"
          :title="s.hint"
          @click="pick(s)"
        >
          <AppIcon v-if="s.kind === 'lens'" name="auto_awesome" />{{ s.label }}
        </button>
      </div>
      <div class="cp__field" :class="{ 'cp__field--disc': discVisible }">
        <button
          v-if="discVisible"
          type="button"
          class="mg-v2-button mg-v2-button--quiet mg-v2-button--icon mg-v2-button--icon-sm cp__disc"
          :class="{ 'is-open': showTopics }"
          aria-label="Propozycje tematów"
          title="Propozycje tematów"
          :aria-expanded="showTopics"
          @click="showTopics = !showTopics"
        >
          <AppIcon name="lightbulb" />
        </button>
        <label class="sr-only" :for="fieldId">Twój temat lub wiadomość</label>
        <textarea :id="fieldId" v-model="draft" rows="2" :disabled="busy" :placeholder="hasConversation ? 'Twoja odpowiedź…' : 'Napisz własny temat…'" @keydown.enter.exact.prevent="send" />
        <button type="submit" class="mg-v2-button mg-v2-button--primary mg-v2-button--icon cp__send" aria-label="Wyślij" title="Wyślij" :disabled="busy || !draft.trim()"><AppIcon name="arrow_upward" /></button>
      </div>
      <!-- A: osobny czat jako cichy wiersz pod polem. -->
      <div v-if="separate === 'footer'" class="cp__footer-chat">
        <button type="button" class="cp__text-link" :aria-expanded="intentsOpen" @click="intentsOpen = !intentsOpen"><AppIcon name="forum" />Osobny czat z intencją</button>
        <div v-if="intentsOpen" class="cp__intents" role="group" aria-label="Z jaką intencją">
          <button v-for="intent in INTENTS" :key="intent" type="button" class="mg-v2-pill" @click="leave(intent)">{{ intent }}</button>
        </div>
      </div>
    </form>
    <!-- B2: propozycje w osobnym małym polu pod kompozytorem; log styka się z polem odpowiedzi. -->
    <section v-if="linesVisible" class="cp__tray cp__tray--lines" aria-label="Propozycje na następny ruch">
      <p v-if="topicStarters.length" class="cp__line">
        <span class="cp__line-label">Tematy</span>
        <span v-for="(s, i) in topicStarters" :key="s.id" class="cp__line-item">
          <span v-if="i" class="cp__line-dot" aria-hidden="true">·</span>
          <button type="button" class="cp__line-link" :title="s.hint" @click="pick(s)">{{ s.label }}</button>
        </span>
      </p>
      <p class="cp__line">
        <span class="cp__line-label">Soczewki</span>
        <span v-for="(s, i) in lensStarters" :key="s.id" class="cp__line-item">
          <span v-if="i" class="cp__line-dot" aria-hidden="true">·</span>
          <button type="button" class="cp__line-link cp__line-link--lens" :title="s.hint" @click="pick(s)">{{ s.label }}</button>
        </span>
      </p>
    </section>
    <section v-if="trayVisible" class="cp__tray" aria-label="Propozycje na następny ruch">
      <button type="button" class="cp__tray-head" :aria-expanded="trayOpen" @click="trayOpen = !trayOpen">
        <AppIcon name="lightbulb" class="cp__tray-icon" />
        <span class="cp__tray-title">Propozycje</span>
        <span class="cp__tray-count">{{ starters.length }}</span>
        <AppIcon name="expand_more" class="cp__tray-chevron" :class="{ 'is-open': trayOpen }" />
      </button>
      <div v-if="trayOpen && starters.length" class="cp__starters">
        <button
          v-for="s in starters"
          :key="`${s.kind}:${s.id}`"
          type="button"
          class="mg-v2-pill cp__chip cp__chip--xs"
          :class="{ 'cp__chip--lens': s.kind === 'lens' }"
          :title="s.hint"
          @click="pick(s)"
        >
          <AppIcon v-if="s.kind === 'lens'" name="auto_awesome" />{{ s.label }}
        </button>
      </div>
      <p v-else-if="trayOpen" class="cp__muted">Wszystkie tematy zostały już poruszone. Napisz własny.</p>
    </section>
    <p v-if="notice" class="cp__notice" role="status">{{ notice }}</p>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import {
  archivePlaceFor,
  cannedReply,
  lenses,
  messageCountLabel,
  sampleFor,
  separateChatFor,
  startersFor,
  topics,
  topicsPlaceFor,
  type Message,
  type PanelState,
  type PanelVariant,
  type SeparateChatChoice,
  type Starter,
  type Topic,
} from '~lab/lab/journalAiPanel'

const props = withDefaults(
  defineProps<{
    variant: PanelVariant
    state: PanelState
    archivedCount?: number
    separate?: SeparateChatChoice
    /** Conversation height as in the product (min(55dvh, 42rem) → 540 px at 982 px). */
    fixed?: boolean
    /** Delay of the canned reply in ms (the Lab shows the „Analizuję…” state for a moment). */
    replyDelay?: number
  }>(),
  { archivedCount: 1, separate: 'auto', fixed: true, replyDelay: 900 },
)

const INTENTS = ['Refleksja', 'Inna perspektywa', 'Bądź proaktywny', 'Pułapki myślenia', 'Własne']
let seq = 0
const uid = () => `m${++seq}`
const fieldId = `cp-field-${Math.random().toString(36).slice(2, 7)}`

type LogItem = (Message & { kind: 'message' }) | { kind: 'topics'; id: string; lead: string; ids: string[] }

const archived = ref<Message[]>([])
const log = ref<LogItem[]>([])
const usedTopicIds = ref<string[]>([])
const showOptions = ref(false)
const showTopics = ref(false)
const trayOpen = ref(true)
const archiveOpen = ref(false)
const intentsOpen = ref(false)
const busy = ref(false)
const draft = ref('')
const notice = ref('')
const scrollArea = ref<HTMLElement | null>(null)
let replyTimer: ReturnType<typeof setTimeout> | undefined

const separate = computed(() => separateChatFor(props.variant, props.separate))
const archivePlace = computed(() => archivePlaceFor(props.variant))
const topicsPlace = computed(() => topicsPlaceFor(props.variant))
const hasConversation = computed(() => log.value.some(i => i.kind === 'message'))
const unusedTopics = computed(() => topics.filter(t => !usedTopicIds.value.includes(t.id)))
const starters = computed(() => startersFor(props.variant, usedTopicIds.value))
const discVisible = computed(() => topicsPlace.value === 'composer-disc' && hasConversation.value)
const startersVisible = computed(() => discVisible.value && showTopics.value && starters.value.length > 0)
const trayVisible = computed(() => topicsPlace.value === 'below-field' && hasConversation.value)
const linesVisible = computed(() => topicsPlace.value === 'below-lines' && hasConversation.value)
const topicStarters = computed(() => starters.value.filter(s => s.kind === 'topic'))
const lensStarters = computed(() => starters.value.filter(s => s.kind === 'lens'))

/** A topics card lists the topics unused at the moment you look at it. */
function chipsFor(item: Extract<LogItem, { kind: 'topics' }>): Topic[] {
  return item.ids.map(id => topics.find(t => t.id === id)!).filter(t => !usedTopicIds.value.includes(t.id))
}

function reset() {
  clearTimeout(replyTimer)
  const sample = sampleFor(props.state, props.archivedCount)
  archived.value = sample.archived
  usedTopicIds.value = [...sample.usedTopicIds]
  log.value = sample.current.map(m => ({ ...m, kind: 'message' as const }))
  if (topicsPlace.value === 'log-card' && sample.current.length)
    log.value.unshift({ kind: 'topics', id: 'topics-0', lead: 'Tematy z Twojej historii:', ids: topics.map(t => t.id) })
  showOptions.value = false
  showTopics.value = false
  trayOpen.value = true
  archiveOpen.value = false
  intentsOpen.value = false
  busy.value = false
  draft.value = ''
  notice.value = ''
  if (hasConversation.value) void scrollToEnd()
}
watch(() => [props.variant, props.state, props.archivedCount], reset, { immediate: true })
/* The starters row grows the composer, so keep the latest message in view when it opens. */
watch(showTopics, open => {
  if (open && discVisible.value) void scrollToEnd()
})

async function scrollToEnd() {
  await nextTick()
  const el = scrollArea.value
  if (el) el.scrollTop = el.scrollHeight
}

function say(text: string) {
  notice.value = text
}

function push(message: Omit<Message, 'id'>) {
  log.value.push({ ...message, kind: 'message', id: uid() })
  void scrollToEnd()
}

function reply(text: string) {
  busy.value = true
  void scrollToEnd()
  replyTimer = setTimeout(() => {
    if (!busy.value) return
    busy.value = false
    push({ role: 'assistant', text: cannedReply(text) })
  }, props.replyDelay)
}

function startTopic(id: string) {
  const topic = topics.find(t => t.id === id)
  if (!topic) return
  usedTopicIds.value = [...usedTopicIds.value, id]
  showTopics.value = false
  showOptions.value = false
  push({ role: 'assistant', text: topic.invitation, topicId: id, topicTitle: topic.title, sources: topic.sources })
}

function pick(starter: Starter) {
  if (starter.kind === 'topic') {
    startTopic(starter.id)
    return
  }
  const lens = lenses.find(l => l.id === starter.id)
  if (!lens) return
  showTopics.value = false
  push({ role: 'user', text: lens.prompt })
  reply(lens.prompt)
}

function send() {
  const text = draft.value.trim()
  if (!text || busy.value) return
  draft.value = ''
  showTopics.value = false
  push({ role: 'user', text })
  reply(text)
}

/** Options → „Rozpocznij od aktualnych danych”: today's messages become the earlier conversation. */
function resetContext() {
  const current = log.value.filter((i): i is Extract<LogItem, { kind: 'message' }> => i.kind === 'message')
  archived.value = [...archived.value, ...current.map(({ kind: _kind, ...m }) => m)]
  log.value = []
  usedTopicIds.value = []
  showOptions.value = false
  archiveOpen.value = false
  say('Nowy kontekst: AI zaproponowało tematy od aktualnych danych.')
}

/** Options → „Zaproponuj tematy”: C appends a topics card to the log; others open their topic surface. */
function proposeTopics() {
  showOptions.value = false
  if (!hasConversation.value) return
  if (topicsPlace.value === 'log-card') {
    log.value.push({ kind: 'topics', id: uid(), lead: 'Nowe tematy od aktualnych danych:', ids: unusedTopics.value.map(t => t.id) })
    void scrollToEnd()
    return
  }
  if (topicsPlace.value === 'gear') {
    showOptions.value = true
    return
  }
  if (topicsPlace.value === 'below-field' || topicsPlace.value === 'below-lines') {
    trayOpen.value = true
    return
  }
  showTopics.value = true
}

function clearAll() {
  archived.value = []
  log.value = []
  usedTopicIds.value = []
  showOptions.value = false
}

function leave(intent: string) {
  intentsOpen.value = false
  say(`Podgląd w Labie: osobny czat „${intent}” otwiera się na całej stronie (/journal/:id/chat).`)
}
</script>

<style scoped>
/* Shell: the product panel (ReflectionCompanionPanel) — surface card, 460 px in the editor aside. */
.cp {
  --cp-shell: var(--mg-color-surface);
  --cp-field: var(--mg-color-mist);
  --cp-inner: var(--mg-color-paper);
  --cp-line: var(--mg-color-field-border);
  --cp-height: 540px;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 460px;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  padding: var(--mg-space-5) var(--mg-space-5) var(--mg-space-4);
  border-radius: var(--mg-radius-lg);
  background: var(--cp-shell);
  color: var(--mg-color-ink);
  overflow: hidden;
}
.cp--conversation.cp--fixed {
  height: var(--cp-height);
}
.cp--conversation .cp__scroll {
  overflow-y: auto;
}
.cp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.cp__head h2 {
  margin: 0;
  font-size: var(--mg-font-size-lg);
  font-weight: var(--mg-weight-strong);
}
.cp__head-actions {
  display: flex;
  align-items: center;
  gap: var(--mg-space-1);
}
.cp__gear[aria-expanded='true'] {
  background: var(--cp-field);
  box-shadow: none;
}

/* Obecnie: wejście nad rozmową. */
.cp__chat-entry {
  display: flex;
  flex-direction: column;
  gap: var(--mg-space-2);
  padding-bottom: var(--mg-space-2);
  border-bottom: 1px solid var(--mg-color-border-subtle);
}
.cp__chat-entry > .mg-v2-button {
  align-self: flex-start;
}
.cp__intents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}
.cp__intents .mg-v2-pill {
  cursor: pointer;
}

/* Scroll area */
.cp__scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
  padding: 0.15rem 0.35rem 0.5rem 0;
  overflow-x: hidden;
  overflow-y: visible;
}
.cp p {
  margin: 0;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.cp__muted {
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}
.cp__intro {
  font-size: var(--mg-font-size-sm);
}
.cp__eyebrow {
  margin: 0.35rem 0 0;
  font-size: var(--mg-font-size-xs);
  letter-spacing: 0.08em;
  color: var(--mg-color-primary-strong);
  text-transform: uppercase;
}
.cp summary {
  cursor: pointer;
  padding: 0.45rem 0.15rem;
}
.cp__details,
.cp__archive,
.cp__sources-fold {
  font-size: var(--mg-font-size-sm);
}

/* Options sheet */
.cp__options {
  display: grid;
  flex: none;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  font-size: var(--mg-font-size-sm);
}
.cp__options h3 {
  margin: 0;
  font-size: var(--mg-font-size-md);
}
.cp__actions,
.cp__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.cp__profile a {
  color: var(--mg-color-primary-strong);
}

/* Messages: AI = field tone flush left, user = one step whiter, indented. */
.cp__messages {
  display: grid;
  gap: 0.85rem;
}
.cp__msg {
  padding: 0.7rem 0.9rem;
  border-radius: var(--mg-radius-lg);
  background: var(--cp-field);
  font-size: var(--mg-font-size-sm);
}
.cp__msg h3 {
  margin: 0.3rem 0;
  font-size: var(--mg-font-size-md);
}
.cp__author {
  display: block;
  margin-bottom: 0.25rem;
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-strong);
  color: var(--mg-color-muted);
}
.cp__msg--assistant {
  margin-right: 1.75rem;
}
.cp__msg--user {
  margin-left: 1.75rem;
  border: 1px solid var(--cp-line);
  background: var(--cp-inner);
}
.cp__messages--dim .cp__msg {
  opacity: 0.62;
}
/* Options sheet scrolls inside the fixed panel; the composer never leaves the card. */
.cp--conversation .cp__options {
  flex: none;
}
/* C: topics as a quiet message from „Rozmowa”. */
.cp__msg--topics {
  margin-right: 1.75rem;
  background: transparent;
  border: 1px solid var(--cp-line);
}
.cp__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
  margin-top: 0.55rem;
}
.cp__chip {
  cursor: pointer;
  color: var(--mg-color-ink);
}
.cp__chip:hover {
  background: var(--cp-inner);
  color: var(--mg-color-primary-strong);
}
.cp__chip--lens {
  color: var(--mg-color-primary-strong);
}
.cp__chip--lens :deep(.material-symbols-outlined) {
  font-size: 0.95rem;
}
.cp__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.85rem;
  margin-top: 0.2rem;
}
.cp__text-action {
  padding: 0.45rem 0;
  border: 0;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  cursor: pointer;
}
.cp__text-action:hover {
  color: var(--mg-color-ink);
}
.cp__activity {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.2rem;
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
}
.cp__pulse {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--mg-color-primary);
  animation: cp-pulse 1.1s ease-in-out infinite;
}
@keyframes cp-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Obecnie: toggle and archive at the bottom. */
.cp__hairline {
  margin: 0.2rem 0 0;
}
.cp__toggle {
  align-self: flex-start;
}
.cp__archive summary {
  font-size: var(--mg-font-size-sm);
}
.cp__archive .cp__msg {
  margin-top: 0.6rem;
}

/* A/B/C: earlier conversation folded on top, chronological. */
.cp__archive-top {
  display: grid;
  gap: 0.6rem;
}
.cp__fold {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-self: center;
  padding: 0.3rem 0.7rem 0.3rem 0.45rem;
  border: 0;
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
  cursor: pointer;
}
.cp__fold:hover {
  background: var(--cp-field);
  color: var(--mg-color-ink);
}
.cp__fold-chevron {
  font-size: 1rem;
  transition: transform 180ms ease;
}
.cp__fold-chevron.is-open {
  transform: rotate(180deg);
}
.cp__context-line {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.cp__context-line::before,
.cp__context-line::after {
  content: '';
  flex: 1;
  height: 1px;
  background: color-mix(in srgb, var(--mg-color-muted) 30%, transparent);
}

/* Topic picker (before the conversation, and in the current toggle / gear). */
.cp__picker {
  flex: none;
  min-width: 0;
}
.cp__topics {
  display: grid;
  gap: 0.55rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0;
  list-style: none;
}
.cp__topic {
  display: block;
  border: 1px solid transparent;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  text-align: left;
  transition: background 180ms ease;
}
.cp__topic[open] {
  padding-bottom: 0.8rem;
  background: var(--cp-inner);
}
.cp__topic > summary {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 3rem;
  padding: 0.65rem 0.8rem;
  border-radius: inherit;
  list-style: none;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-label);
  line-height: 1.35;
}
.cp__topic > summary::-webkit-details-marker {
  display: none;
}
.cp__topic > summary:hover {
  color: var(--mg-color-primary);
}
.cp__topic-title {
  flex: 1;
  min-width: 0;
}
.cp__topic-icon,
.cp__topic-chevron {
  flex: none;
  width: 1.15rem;
  height: 1.15rem;
  color: var(--mg-color-primary);
}
.cp__topic-chevron {
  transition: transform 180ms ease;
}
.cp__topic[open] > summary .cp__topic-chevron {
  transform: rotate(180deg);
}
.cp__topic > p,
.cp__topic > div,
.cp__topic > button {
  margin: 0.6rem 0.8rem 0;
}
.cp__topic > p {
  font-size: var(--mg-font-size-sm);
}

/* Composer: starters, field with discs, quiet footer. */
.cp__form {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 0.55rem;
  padding-top: 0.2rem;
  font-size: var(--mg-font-size-sm);
}
.cp__starters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}
.cp__field {
  position: relative;
}
.cp textarea {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 3.5rem;
  max-height: 8rem;
  padding: 0.7rem 3.5rem 0.7rem 0.9rem;
  border: 1px solid var(--cp-line);
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  color: var(--mg-color-ink);
  font: inherit;
  resize: vertical;
}
.cp__field--disc textarea {
  padding-left: 3rem;
}
.cp textarea::placeholder {
  color: var(--mg-color-muted);
}
.cp textarea:focus-visible {
  outline: none;
  border-color: var(--mg-color-primary);
}
.cp__send {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  min-height: 2.25rem;
}
.cp__disc {
  position: absolute;
  left: 0.5rem;
  bottom: 0.6rem;
  color: var(--mg-color-muted);
}
.cp__disc.is-open,
.cp__disc:hover {
  color: var(--mg-color-primary);
  background: var(--cp-inner);
}
.cp__footer-chat {
  display: grid;
  gap: var(--mg-space-2);
}

/* B2: a small separate field under the composer. Mist container, paper chips inside. */
.cp__tray {
  display: grid;
  flex: none;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem 0.6rem;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
}
.cp__tray-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.2rem 0.1rem;
  border: 0;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
  cursor: pointer;
  text-align: left;
}
.cp__tray-head:hover {
  color: var(--mg-color-ink);
}
.cp__tray-icon {
  font-size: 1.1rem;
  color: var(--mg-color-primary);
}
.cp__tray-title {
  flex: 1;
}
.cp__tray-count {
  color: var(--mg-color-muted);
  font-weight: var(--mg-weight-body);
}
.cp__tray-chevron {
  font-size: 1rem;
  transition: transform 180ms ease;
}
.cp__tray-chevron.is-open {
  transform: rotate(180deg);
}
.cp__tray .cp__chip {
  background: var(--cp-inner);
}
.cp__tray .cp__chip:hover {
  color: var(--mg-color-primary-strong);
}
.cp__tray .cp__muted {
  padding: 0 0.1rem 0.2rem;
}
.cp__chip--xs {
  padding: 0.3rem 0.65rem;
  font-size: var(--mg-font-size-xs);
}
.cp__chip--xs :deep(.material-symbols-outlined) {
  font-size: 0.85rem;
}

/* B3: the same small field as two text lines, no chips, no header. */
.cp__tray--lines {
  gap: 0.2rem;
  padding: 0.55rem 0.75rem;
}
.cp__line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.4rem;
  row-gap: 0.1rem;
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
}
.cp__line-label {
  margin-right: 0.15rem;
  color: var(--mg-color-muted);
  font-weight: var(--mg-weight-label);
}
.cp__line-item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  white-space: nowrap;
}
.cp__line-dot {
  color: var(--mg-color-muted);
}
.cp__line-link {
  padding: 0.1rem 0;
  border: 0;
  background: transparent;
  color: var(--mg-color-ink);
  font: inherit;
  cursor: pointer;
}
.cp__line-link:hover {
  color: var(--mg-color-primary-strong);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.cp__line-link--lens {
  color: var(--mg-color-primary-strong);
}
.cp__text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-self: start;
  padding: 0.25rem 0.15rem;
  border: 0;
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  cursor: pointer;
}
.cp__text-link:hover {
  color: var(--mg-color-primary-strong);
}
.cp__text-link :deep(.material-symbols-outlined) {
  font-size: 1rem;
}
.cp__notice {
  padding: 0.5rem 0.75rem;
  border-radius: var(--mg-radius-md);
  background: var(--cp-field);
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}

/* Product button classes kept for the eye (qr-quiet/qr-primary). */
.cp .qr-primary,
.cp .qr-quiet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 0;
  font-size: var(--mg-font-size-sm);
  cursor: pointer;
}
.cp .qr-primary {
  padding: 0.6rem 0.95rem;
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
}
.cp .qr-primary:hover {
  background: var(--mg-color-primary-fill-hover);
}
.cp .qr-quiet {
  padding: 0.45rem 0.7rem;
  border-radius: var(--mg-radius-sm);
  background: transparent;
  color: var(--mg-color-muted);
}
.cp .qr-quiet:hover {
  background: var(--cp-field);
  color: var(--mg-color-ink);
}
.cp button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cp :is(button, textarea, summary, a):focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .cp__pulse,
  .cp__fold-chevron,
  .cp__tray-chevron,
  .cp__topic-chevron {
    animation: none;
    transition: none;
  }
}
</style>
