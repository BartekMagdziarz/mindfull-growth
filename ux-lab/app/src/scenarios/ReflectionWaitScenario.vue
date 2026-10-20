<template>
  <section class="scenario-page rw mg-design-v2" :class="{ 'rw--still': lessMotion, 'rw--paused': paused }">
    <header class="rw-heading">
      <span class="lab-eyebrow">Propozycja · refleksja z AI</span>
      <h1>Chwila na uważną odpowiedź</h1>
      <p>Przykładowa rozmowa i symulowane etapy pracy · bez połączenia z AI.</p>
    </header>

    <div class="rw-tools" aria-label="Sterowanie prototypem">
      <div class="rw-samples" role="group" aria-label="Długość oczekiwania">
        <button v-for="(item, key) in waitSamples" :key="key" type="button" :aria-pressed="sample === key" @click="chooseSample(key)">
          {{ item.label }} <span>{{ item.seconds }} s</span>
        </button>
      </div>
      <div class="rw-playback">
        <button class="rw-control" type="button" @click="replay"><AppIcon name="play_arrow" />Odtwórz</button>
        <button class="rw-control" type="button" aria-label="Przywróć przykład" @click="reset"><AppIcon name="restart_alt" /></button>
        <details class="rw-options">
          <summary>Opcje</summary>
          <div class="rw-options__body">
            <label class="rw-intro-option">Początek odpowiedzi
              <select v-model="intro" aria-label="Początek odpowiedzi">
                <option value="typing">Trzy kropki · 1,5 s</option>
                <option value="instant">Od razu · porównanie</option>
              </select>
            </label>
            <label><input v-model="lessMotion" type="checkbox" /> Mniej ruchu</label>
            <button type="button" :disabled="!busy" @click="togglePause">{{ paused ? 'Wznów animację' : 'Zatrzymaj kadr' }}</button>
            <button type="button" :disabled="!busy" @click="complete">Pokaż odpowiedź teraz</button>
            <button type="button" :disabled="!busy" @click="finishWith('error')">Sprawdź błąd połączenia</button>
          </div>
        </details>
      </div>
    </div>

    <div class="rw-workspace">
      <section class="rw-journal" aria-labelledby="rw-journal-title">
        <header class="rw-journal__header">
          <AppIcon name="book" />
          <span>Mój wpis</span>
          <span class="rw-date">5–11 października</span>
        </header>
        <h2 id="rw-journal-title">Trochę więcej miejsca dla siebie</h2>
        <textarea v-model="journal" aria-label="Treść mojego wpisu" spellcheck="false" />
        <footer><AppIcon name="edit" /><span>Szkic w Labie</span></footer>
      </section>

      <section class="rw-conversation" aria-labelledby="rw-conversation-title">
        <header class="rw-conversation__header">
          <h2 id="rw-conversation-title">Refleksja z AI</h2>
          <AppIcon name="chat" />
        </header>
        <div class="rw-thread">
          <article class="rw-previous">
            <span class="rw-author">AI</span>
            <p>O czym chcesz dziś porozmawiać?</p>
          </article>
          <Transition name="rw-message">
            <article v-if="sentMessage" class="rw-user">
              <span class="rw-author">Ty</span>
              <p>{{ sentMessage }}</p>
            </article>
          </Transition>

          <Transition name="rw-arrive">
            <article v-if="state !== 'idle'" class="rw-assistant" :class="{ 'rw-assistant--busy': busy }">
              <div class="rw-presence" :class="{ 'rw-presence--active': busy && !typing, 'rw-presence--done': state === 'done' }" aria-hidden="true">
                <span class="rw-presence__echo" />
                <span class="rw-presence__well"><span class="rw-presence__seed" /></span>
              </div>
              <div class="rw-assistant__body">
                <span class="rw-author">AI</span>
                <div ref="answerSlot" class="rw-answer-slot">
                  <Transition name="rw-answer" mode="out-in" @before-leave="rememberHeight" @enter="growAnswer">
                    <div v-if="busy" key="waiting" class="rw-waiting">
                      <div class="rw-note" aria-live="polite" aria-atomic="true">
                        <Transition name="rw-copy" mode="out-in">
                          <div v-if="typing" key="typing" class="rw-typing" role="status">
                            <span class="sr-only">AI przygotowuje odpowiedź.</span>
                            <span v-for="dot in 3" :key="dot" class="rw-typing__dot" :style="{ '--dot': dot - 1 }" aria-hidden="true" />
                          </div>
                          <p v-else :key="stage.note">{{ stage.note }}</p>
                        </Transition>
                      </div>
                      <div class="rw-status" :class="{ 'rw-status--pending': typing }" :aria-hidden="typing" role="status" aria-atomic="true">
                        <span class="rw-status__dot" aria-hidden="true" />
                        <Transition name="rw-status-copy" mode="out-in">
                          <span :key="stage.label">{{ stage.label }}</span>
                        </Transition>
                      </div>
                      <button class="rw-stop" type="button" @click="finishWith('cancelled')"><span aria-hidden="true" />Przerwij</button>
                    </div>
                    <div v-else-if="state === 'done'" key="answer" class="rw-answer-content" aria-live="polite">
                      <p class="rw-reveal" style="--order: 0">Piszesz o tygodniu, w którym było dużo pracy, ale pojawiło się też trochę przestrzeni: spacer, spokojniejszy wieczór i rozmowa z kimś bliskim.</p>
                      <p class="rw-reveal" style="--order: 1">To, że nie wszystko udało się zrobić, nie odbiera znaczenia tym chwilom. Możemy przyjrzeć się temu, co pomogło Ci zwolnić, bez dokładania kolejnego zadania.</p>
                      <p class="rw-reveal rw-question" style="--order: 2">Co było inne w tych momentach, kiedy udało Ci się zrobić trochę miejsca dla siebie?</p>
                      <button class="rw-insert rw-reveal" style="--order: 3" type="button" @click="insertQuestion"><AppIcon name="add" />{{ inserted ? 'Dodano do wpisu' : 'Dodaj pytanie do wpisu' }}</button>
                    </div>
                    <div v-else :key="state" class="rw-interrupted" role="status">
                      <p>{{ state === 'error' ? 'Nie udało się połączyć. Twoja wiadomość jest tutaj.' : 'Odpowiedź została przerwana.' }}</p>
                      <button class="rw-inline-action" type="button" @click="start">Spróbuj ponownie<AppIcon name="arrow_forward" /></button>
                    </div>
                  </Transition>
                </div>
              </div>
            </article>
          </Transition>
        </div>

        <form class="rw-compose" @submit.prevent="send">
          <label class="sr-only" for="rw-message">Wiadomość do AI</label>
          <textarea id="rw-message" v-model="message" rows="2" :disabled="busy" placeholder="Napisz, co jest teraz ważne…" @keydown="onMessageKeydown" />
          <button type="submit" class="rw-send" :disabled="busy || !message.trim()" aria-label="Wyślij wiadomość"><AppIcon name="arrow_upward" /></button>
        </form>
      </section>
    </div>
    <p class="sr-only" role="status">{{ insertionNotice }}</p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { useReflectionWait, waitSamples, type WaitSample } from '~lab/lab/reflectionWait'

const route = useRoute()
const router = useRouter()
const { sample, state, paused, intro, typing, stage, busy, start, complete, togglePause, finishWith } = useReflectionWait()
const initialJournal = 'Ten tydzień był pełny. W pracy trudno było mi odpuścić, nawet kiedy czułem już zmęczenie.\n\nW środę wyszedłem na krótki spacer bez telefonu. Wieczorem udało mi się też spokojnie porozmawiać z bliską osobą. To były małe rzeczy, ale poczułem różnicę.\n\nChciałbym znaleźć więcej takiego miejsca dla siebie, bez zamieniania odpoczynku w kolejny obowiązek.'
const initialMessage = 'Mam wrażenie, że ciągle robię za mało. Jak spojrzeć na ten tydzień trochę łagodniej?'
const journal = ref(initialJournal)
const message = ref(initialMessage)
const sentMessage = ref('')
const inserted = ref(false)
const insertionNotice = ref('')
const lessMotion = ref(false)
const answerSlot = ref<HTMLElement | null>(null)
let oldHeight = 0
let heightAnimation: Animation | undefined

function syncRoute() {
  const next = String(route.query.sample ?? 'thoughtful')
  if (Object.hasOwn(waitSamples, next) && sample.value !== next) {
    finishWith('idle'); sentMessage.value = ''; message.value = initialMessage
    sample.value = next as WaitSample
  }
  lessMotion.value = route.query.motion === 'reduced'
  intro.value = route.query.intro === 'instant' ? 'instant' : 'typing'
}
syncRoute()
watch(() => [route.query.sample, route.query.motion, route.query.intro], syncRoute)
watch(intro, value => {
  if ((route.query.intro === 'instant') !== (value === 'instant'))
    void router.replace({ query: { ...route.query, intro: value === 'instant' ? 'instant' : undefined } })
})
watch(lessMotion, value => {
  if ((route.query.motion === 'reduced') !== value)
    void router.replace({ query: { ...route.query, motion: value ? 'reduced' : undefined } })
})
function chooseSample(key: WaitSample) {
  finishWith('idle'); sentMessage.value = ''; message.value = initialMessage
  sample.value = key
  void router.replace({ query: { ...route.query, sample: key } })
}
function reset() {
  finishWith('idle'); heightAnimation?.cancel()
  sentMessage.value = ''; message.value = initialMessage
  journal.value = initialJournal; inserted.value = false; insertionNotice.value = ''
}
function send() {
  if (busy.value || !message.value.trim()) return
  sentMessage.value = message.value.trim(); message.value = ''; start()
}
function replay() {
  sentMessage.value = sentMessage.value || message.value.trim() || initialMessage
  message.value = ''; start()
}
function onMessageKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault(); send()
  }
}
function insertQuestion() {
  if (inserted.value) return
  journal.value += '\n\nCo było inne w tych momentach, kiedy udało mi się zrobić trochę miejsca dla siebie?'
  inserted.value = true; insertionNotice.value = 'Pytanie dodano do wpisu.'
}
function rememberHeight() { oldHeight = answerSlot.value?.getBoundingClientRect().height ?? 0 }
function growAnswer(element: Element) {
  const slot = answerSlot.value
  heightAnimation?.cancel()
  if (!slot || lessMotion.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !slot.animate) return
  heightAnimation = slot.animate([
    { height: `${oldHeight}px` }, { height: `${element.getBoundingClientRect().height}px` },
  ], { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' })
}
onBeforeUnmount(() => heightAnimation?.cancel())
</script>

<style scoped>
.scenario-page.rw { --rw-ease: cubic-bezier(.22, 1, .36, 1); min-width: 0; width: 100%; max-width: 1140px; color: var(--mg-color-ink); font-family: var(--mg-font-sans); }
.rw-heading { margin: 8px 0 26px; }
.rw-heading h1 { margin: 9px 0; font-size: clamp(26px, 3vw, 36px); font-weight: 700; letter-spacing: -.035em; line-height: 1.2; }
.rw-heading p { margin: 0; color: var(--mg-color-muted); font-size: 13px; }
.rw-tools { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.rw button, .rw summary { -webkit-tap-highlight-color: transparent; }
.rw button { font: inherit; cursor: pointer; }
.rw button:disabled { opacity: .45; cursor: default; }
.rw button:focus-visible, .rw summary:focus-visible, .rw textarea:focus-visible, .rw input:focus-visible, .rw select:focus-visible { outline: 2px solid var(--mg-color-focus); outline-offset: 4px; }
.rw-samples { display: flex; padding: 5px; gap: 4px; background: var(--mg-color-mist); border-radius: var(--mg-radius-md); }
.rw-samples button { border: 0; padding: 10px 13px; border-radius: var(--mg-radius-sm); color: var(--mg-color-muted); font-size: 12px; background: transparent; transition: background .3s, color .3s, box-shadow .3s; }
.rw-samples button span { margin-left: 5px; font-size: 11px; opacity: .7; }
.rw-samples button[aria-pressed="true"] { background: var(--mg-color-paper); color: var(--mg-color-primary-strong); box-shadow: var(--mg-shadow-raised-sm); }
.rw-playback { display: flex; align-items: center; gap: 7px; }
.rw-control { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 8px 11px; border: 0; border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); font-size: 12px !important; transition: background .2s, transform .3s var(--rw-ease); }
.rw-control:hover { background: var(--mg-color-paper); transform: translateY(-1px); }
.rw-control :deep(svg) { width: 18px; height: 18px; }
.rw-options { position: relative; font-size: 12px; color: var(--mg-color-muted); }
.rw-options summary { padding: 10px; cursor: pointer; }
.rw-options__body { position: absolute; z-index: 30; right: 0; top: 45px; display: grid; gap: 8px; min-width: 230px; padding: 15px; background: var(--mg-color-paper); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); box-shadow: var(--mg-shadow-raised); }
.rw-options__body label { display: flex; align-items: center; gap: 9px; padding: 5px; }
.rw-options__body .rw-intro-option { display: grid; gap: 7px; }
.rw-intro-option select { padding: 8px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); font: inherit; color: var(--mg-color-ink); }
.rw-options__body button { border: 0; border-radius: var(--mg-radius-sm); padding: 9px; text-align: left; background: var(--mg-color-mist); color: var(--mg-color-ink); }
.rw-workspace { display: grid; grid-template-columns: .95fr 1.05fr; gap: 24px; align-items: start; }
.rw-journal, .rw-conversation { background: var(--mg-color-surface); border-radius: var(--mg-radius-xl); box-shadow: var(--mg-shadow-raised); }
.rw-journal { display: flex; flex-direction: column; min-height: 615px; padding: 28px 30px 22px; }
.rw-journal__header { display: flex; gap: 9px; align-items: center; color: var(--mg-color-muted); font-size: 12px; }
.rw-journal__header :deep(svg) { width: 19px; height: 19px; color: var(--mg-color-primary); }
.rw-date { margin-left: auto; font-size: 11px; }
.rw-journal h2 { margin: 35px 0 21px; max-width: 320px; font-size: 26px; line-height: 1.3; font-weight: 650; letter-spacing: -.025em; }
.rw-journal textarea { flex: 1; min-height: 355px; width: 100%; padding: 0; border: 0; resize: vertical; background: transparent; color: var(--mg-color-ink); font: 15px/1.95 var(--mg-font-sans); }
.rw-journal footer { display: flex; align-items: center; gap: 7px; margin-top: 20px; color: var(--mg-color-muted); font-size: 11px; }
.rw-journal footer :deep(svg) { width: 14px; height: 14px; }
.rw-conversation { padding: 25px 26px 20px; min-width: 0; min-height: 615px; display: flex; flex-direction: column; }
.rw-conversation__header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 22px; }
.rw-conversation__header h2 { margin: 0; font-size: 18px; font-weight: 750; }
.rw-conversation__header :deep(svg) { width: 22px; height: 22px; color: var(--mg-color-primary); }
.rw-thread { flex: 1; min-height: 390px; }
.rw-author { display: block; font-size: 11px; font-weight: 750; color: var(--mg-color-muted); }
.rw-previous { padding: 10px 0 16px; }
.rw-previous p { margin: 8px 0 0; font-size: 15px; }
.rw-user { margin: 12px 0 30px 35px; padding: 16px 19px; border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.rw-user p { margin: 6px 0 0; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.rw-assistant { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 13px; padding: 0 0 26px; }
.rw-presence { position: relative; width: 30px; height: 30px; margin-top: 2px; display: grid; place-items: center; }
.rw-presence__well { position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: var(--mg-radius-organic-a); background: var(--mg-color-primary-soft); transition: background .7s; }
.rw-presence__seed { width: 12px; height: 12px; border-radius: var(--mg-radius-organic-b); background: var(--mg-color-primary); }
.rw-presence__echo { position: absolute; inset: -5px; border: 1px solid var(--mg-color-primary); border-radius: var(--mg-radius-organic-c); opacity: 0; }
.rw-presence--active .rw-presence__well { animation: rw-breathe 3.8s ease-in-out infinite; }
.rw-presence--active .rw-presence__seed { animation: rw-seed 3.8s ease-in-out infinite; }
.rw-presence--active .rw-presence__echo { animation: rw-echo 3.8s ease-in-out infinite; }
.rw-presence--done .rw-presence__seed { animation: rw-settle .8s var(--rw-ease) both; }
.rw-assistant__body { min-width: 0; padding-top: 7px; }
.rw-answer-slot { margin-top: 10px; }
.rw-note { min-height: 51px; }
.rw-note p { margin: 0; font-size: 16px; line-height: 1.6; }
.rw-status { display: flex; align-items: center; gap: 8px; min-height: 41px; font-size: 12px; color: var(--mg-color-muted); opacity: 1; transition: opacity .5s .25s ease; }
.rw-status--pending { opacity: 0; visibility: hidden; transition-delay: 0s; }
.rw-typing { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 15px; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.rw-typing__dot { width: 6px; height: 6px; border-radius: var(--mg-radius-organic-a); background: var(--mg-color-primary); animation: rw-typing-wave 1.25s ease-in-out infinite; animation-delay: calc(var(--dot) * 150ms); }
.rw-status__dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: var(--mg-color-primary); animation: rw-status-pulse 2.4s ease-in-out infinite; }
.rw-stop { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 7px 0; border: 0; background: transparent; color: var(--mg-color-muted); font-size: 11px !important; }
.rw-stop > span { width: 6px; height: 6px; border-radius: 2px; background: currentColor; }
.rw-stop:hover { color: var(--mg-color-primary-strong); }
.rw-answer-content p, .rw-interrupted p { margin: 0 0 17px; font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
.rw-answer-content .rw-question { font-weight: 700; }
.rw-insert, .rw-inline-action { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; border: 0; border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); color: var(--mg-color-primary-strong); font-size: 11px !important; }
.rw-insert :deep(svg), .rw-inline-action :deep(svg) { width: 16px; height: 16px; }
.rw-compose { position: relative; display: flex; align-items: flex-end; gap: 10px; margin-top: 20px; padding: 14px; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.rw-compose textarea { width: 100%; min-width: 0; min-height: 75px; padding: 0; border: 0; resize: vertical; background: transparent; color: var(--mg-color-ink); font: 13px/1.65 var(--mg-font-sans); }
.rw-compose textarea:disabled { opacity: .55; }
.rw-compose textarea::placeholder { color: var(--mg-color-muted); }
.rw-send { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border: 0; border-radius: var(--mg-radius-sm); background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); transition: transform .3s var(--rw-ease), opacity .3s; }
.rw-send:hover:not(:disabled) { transform: translateY(-2px); }
.rw-send :deep(svg) { width: 20px; height: 20px; }
.rw-message-enter-active { transition: opacity .55s ease, transform .7s var(--rw-ease); }
.rw-message-leave-active { transition: opacity .2s; }
.rw-message-enter-from { opacity: 0; transform: translateY(12px); }
.rw-message-leave-to { opacity: 0; }
.rw-arrive-enter-active { transition: opacity .7s .12s ease, transform .8s .12s var(--rw-ease); }
.rw-arrive-leave-active { transition: opacity .2s; }
.rw-arrive-enter-from { opacity: 0; transform: translateY(9px); }
.rw-arrive-leave-to { opacity: 0; }
.rw-copy-enter-active { transition: opacity .55s ease, transform .65s var(--rw-ease), filter .55s; }
.rw-copy-leave-active { transition: opacity .22s ease, transform .3s ease, filter .25s; }
.rw-copy-enter-from { opacity: 0; transform: translateY(5px); filter: blur(3px); }
.rw-copy-leave-to { opacity: 0; transform: translateY(-3px); filter: blur(2px); }
.rw-status-copy-enter-active { transition: opacity .45s ease, transform .55s var(--rw-ease); }
.rw-status-copy-leave-active { transition: opacity .2s ease; }
.rw-status-copy-enter-from { opacity: 0; transform: translateY(4px); }
.rw-status-copy-leave-to { opacity: 0; }
.rw-answer-leave-active { transition: opacity .25s ease, transform .3s ease; }
.rw-answer-leave-to { opacity: 0; transform: translateY(-4px); }
.rw-answer-enter-active { transition: opacity .4s ease; }
.rw-answer-enter-from { opacity: 0; }
.rw-reveal { animation: rw-reveal .8s var(--rw-ease) both; animation-delay: calc(var(--order) * 110ms); }
.rw--paused *, .rw--paused *::before, .rw--paused *::after { animation-play-state: paused !important; }
.rw--still *, .rw--still *::before, .rw--still *::after { animation: none !important; transition-duration: .01ms !important; transition-delay: 0ms !important; filter: none !important; }
@keyframes rw-breathe { 0%, 100% { transform: scale(.95) rotate(-5deg); } 50% { transform: scale(1.09) rotate(5deg); } }
@keyframes rw-seed { 0%, 100% { transform: scale(.87); opacity: .7; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes rw-echo { 0% { transform: scale(.85); opacity: 0; } 30% { opacity: .18; } 85%, 100% { transform: scale(1.3); opacity: 0; } }
@keyframes rw-status-pulse { 0%, 100% { opacity: .35; } 50% { opacity: .9; } }
@keyframes rw-typing-wave { 0%, 65%, 100% { transform: translateY(0) scale(.9); opacity: .4; } 30% { transform: translateY(-3px) scale(1); opacity: 1; } }
@keyframes rw-settle { 0% { transform: scale(.8); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
@keyframes rw-reveal { from { opacity: 0; transform: translateY(8px); filter: blur(2px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
@media (max-width: 1100px) { .rw-workspace { gap: 18px; } .rw-journal { padding: 24px; } .rw-conversation { padding: 24px 20px 20px; } }
@media (max-width: 800px) { .rw-workspace { grid-template-columns: 1fr; } .rw-journal { min-height: 0; order: 2; } .rw-journal h2 { margin-top: 22px; } .rw-journal textarea { min-height: 260px; } .rw-samples { flex-wrap: wrap; } .rw-conversation { min-height: 550px; order: 1; } .rw-thread { min-height: 330px; } }
@media (max-width: 420px) { .rw-samples { width: 100%; } .rw-samples button { flex: 1 1 100%; text-align: left; } .rw-journal, .rw-conversation { padding: 22px 18px; } .rw-user { margin-left: 15px; } .rw-assistant { gap: 9px; grid-template-columns: 27px minmax(0, 1fr); } .rw-date { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .rw *, .rw *::before, .rw *::after { animation: none !important; transition-duration: .01ms !important; transition-delay: 0ms !important; filter: none !important; } }
</style>
