<template>
  <PageContainer>
    <section
      v-if="draft"
      class="pa mg-design-v2"
      :class="{
        'pa--has-plan': objects.length,
        'pa--plan-visible': mobileTab === 'plan',
      }"
    >
      <header class="pa-heading">
        <RouterLink
          to="/objects/habits"
          class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet"
          aria-label="Wróć do obiektów"
          ><AppIcon name="arrow_back"
        /></RouterLink>
        <span class="pa-presence" aria-hidden="true"><AppIcon name="mg-growth" /></span>
        <h1>Ułóżmy plan</h1>
        <span
          v-if="draft.messages.length || draft.input"
          class="pa-draft-state"
          role="status"
          :aria-label="draftState"
          :title="draftState"
          ><AppIcon :name="pendingWrites ? 'more_horiz' : persistenceError ? 'warning' : 'check'"
        /></span>
        <details class="pa-settings">
          <summary aria-label="Ustawienia pomocnika"><AppIcon name="settings" /></summary>
          <div class="mg-v2-surface mg-v2-surface--raised-sm">
            <label class="pa-option"
              ><input
                v-model="draft.includePlanning"
                type="checkbox"
                class="mg-v2-checkbox"
                :disabled="!!draft.messages.length || busy || saving"
                @change="changed"
              />Uwzględnij mój plan</label
            >
            <p class="pa-status">
              AI otrzyma tytuły aktywnych obiektów i priorytetów. Wybierz przed rozpoczęciem
              rozmowy.
            </p>
            <RouterLink to="/profile" class="pa-link">Konfiguracja AI</RouterLink>
            <button
              v-if="draft.messages.length"
              class="pa-link"
              type="button"
              :disabled="busy || saving"
              @click="confirmDiscard = true"
            >
              Nowa rozmowa
            </button>
          </div>
        </details>
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
                  v-for="example in starters"
                  :key="example.label"
                  type="button"
                  @click="send(example.prompt)"
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
                @click="cancel"
              >
                Przerwij
              </button>
            </div>
            <div v-if="!busy && !saved" class="pa-answers">
              <button
                v-for="answer in draft.suggestions"
                :key="answer"
                type="button"
                class="mg-v2-button"
                @click="send(answer)"
              >
                {{ answer }}
              </button>
            </div>
          </div>
          <form
            v-if="!saved"
            class="pa-compose mg-v2-surface mg-v2-surface--flat"
            @submit.prevent="send()"
          >
            <textarea
              ref="composer"
              v-model="draft.input"
              maxlength="12000"
              :disabled="saving || conflict"
              @input="changed"
              rows="2"
              aria-label="Wiadomość do pomocnika"
              :placeholder="objects.length ? 'Co chcesz dopracować?' : 'Na czym Ci zależy?'"
              @keydown="onKeydown"
            />
            <button
              type="submit"
              class="mg-v2-button mg-v2-button--icon"
              aria-label="Wyślij wiadomość"
              :disabled="busy || saving || conflict || !draft.input.trim()"
            >
              <AppIcon name="arrow_upward" />
            </button>
          </form>
          <p v-if="error" class="pa-error" role="alert">{{ error }}</p>
          <p v-if="persistenceError" class="pa-error" role="alert">{{ persistenceError }}</p>
          <button v-if="conflict" class="pa-link" type="button" @click="load">
            Wczytaj aktualny szkic
          </button>
          <button v-else-if="persistenceError" class="pa-link" type="button" @click="persist">
            Zachowaj szkic ponownie
          </button>
        </section>
        <section
          class="pa-paper mg-v2-surface mg-v2-surface--raised-sm"
          :class="{ 'pa-paper--empty': !objects.length, 'pa-paper--saved': saved }"
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
                {{ saved ? 'Gotowe' : 'Szkic' }}
              </h2>

              <button
                v-if="!saved"
                type="button"
                class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet pa-discard"
                aria-label="Odrzuć szkic"
                title="Odrzuć szkic"
                :disabled="busy || saving || conflict"
                @click="confirmDiscard = true"
              >
                <AppIcon name="close" />
              </button>
            </header>
            <fieldset class="pa-objects" :disabled="saving || conflict">
              <PlanningDraftCard
                v-for="(item, index) in shownObjects"
                :key="item.id"
                v-model:item="shownObjects[index]"
                :expanded="expandedId === item.id"
                :readonly="saved"
                :priorities="priorities"
                :life-areas="lifeAreas"
                :error="
                  item.selected && attemptedSave ? plannerObjectError(item, objects) : undefined
                "
                @expand="expandedId = expandedId === item.id ? null : item.id"
                @select="select(item.id, $event)"
                @edit="edited(item.id)"
              />
            </fieldset>
            <p v-if="saved" class="pa-saved-note">
              <AppIcon name="check" />Plan dodany do obiektów i kalendarza.
            </p>
            <p
              v-if="notice && !saved && notice !== 'Szkic został zaktualizowany.'"
              class="pa-status"
              role="status"
            >
              {{ notice }}
            </p>
            <p v-if="attemptedSave && errors.length" class="pa-error" role="alert">
              {{ errors[0] }}
            </p>
            <div v-if="saved" class="pa-saved-links">
              <RouterLink to="/calendar">Kalendarz<AppIcon name="arrow_forward" /></RouterLink
              ><RouterLink to="/objects/habits">Obiekty<AppIcon name="arrow_forward" /></RouterLink>
            </div>
            <footer class="pa-paper__footer">
              <button
                v-if="saved"
                type="button"
                class="mg-v2-button"
                :disabled="saving || conflict"
                @click="reset"
              >
                Nowy plan<AppIcon name="add" />
              </button>
              <button
                v-else
                type="button"
                class="mg-v2-button mg-v2-button--primary"
                :disabled="!selected.length || busy || saving || conflict"
                @click="save"
              >
                {{ saving ? 'Dodaję…' : 'Dodaj wybrane' }}<AppIcon name="check" />
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
      <span class="sr-only" role="status">{{ notice }}</span>
    </section>
    <div v-else role="status">
      {{ loading ? 'Wczytuję szkic…' : error }}
      <button v-if="!loading" type="button" class="mg-v2-button" @click="load">
        Spróbuj ponownie
      </button>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PlanningDraftCard from './PlanningDraftCard.vue'
import { usePlanningAssistant } from './usePlanningAssistant'
import { plannerObjectError } from '@/domain/planningAssistant'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { captureUserSession } from '@/services/userSessionScope'
import './planning-assistant.css'
const {
  draft,
  loading,
  busy,
  saving,
  conflict,
  error,
  persistenceError,
  pendingWrites,
  notice,
  attemptedSave,
  selected,
  errors,
  load,
  persist,
  changed,
  edited,
  select,
  send,
  cancel,
  save,
  reset: resetDraft,
} = usePlanningAssistant()
const saved = computed(() => !!draft.value?.receipt)
const draftState = computed(() =>
  pendingWrites.value
    ? 'Zachowuję szkic'
    : persistenceError.value
      ? 'Szkic niezachowany'
      : 'Szkic zachowany'
)
const objects = computed(() => draft.value?.objects ?? [])
const messages = computed(() => draft.value?.messages ?? [])
const shownObjects = computed(() => (saved.value ? selected.value : objects.value))
const expandedId = ref<string | null>(null),
  confirmDiscard = ref(false)
const mobileTab = ref<'conversation' | 'plan'>('conversation')
const composer = ref<HTMLTextAreaElement | null>(null),
  thread = ref<HTMLDivElement | null>(null)
const discardDialog = ref<HTMLDialogElement | null>(null),
  discardCancel = ref<HTMLButtonElement | null>(null)
const priorities = ref<Array<{ id: string; label: string }>>([]),
  lifeAreas = ref<Array<{ id: string; label: string }>>([])
const session = captureUserSession()
const unsubscribe = session.onInvalidate(() => {
  priorities.value = []
  lifeAreas.value = []
  discardDialog.value?.close()
})
void session
  .wait(Promise.all([priorityDexieRepository.listAll(), lifeAreaDexieRepository.getActive()]))
  .then(([p, a]) => {
    priorities.value = p.filter(v => v.status === 'active').map(v => ({ id: v.id, label: v.title }))
    lifeAreas.value = a.map(v => ({ id: v.id, label: v.name }))
  })
  .catch(() => {})
const starters = [
  {
    label: 'Czytanie',
    icon: 'book',
    prompt: 'Chcę wrócić do czytania. 20 minut, trzy razy w tygodniu.',
  },
  {
    label: 'Mój cel',
    icon: 'mg-goal',
    prompt: 'Pomóż mi doprecyzować cel i zaplanować małe kroki.',
  },
  {
    label: 'Mała próba',
    icon: 'spa',
    prompt: 'Chcę zrobić w tym tygodniu trochę miejsca dla siebie.',
  },
]
async function reset() {
  if (await resetDraft()) {
    confirmDiscard.value = false
    expandedId.value = null
    mobileTab.value = 'conversation'
    await nextTick()
    composer.value?.focus()
  }
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}
watch(
  () => messages.value.length,
  () =>
    nextTick(() => {
      if (thread.value) thread.value.scrollTop = thread.value.scrollHeight
    })
)
watch(
  () => objects.value.length,
  (count, previous) => {
    if (count && !previous) mobileTab.value = 'plan'
  }
)
watch(confirmDiscard, value => {
  if (value)
    void nextTick(() => {
      discardDialog.value?.showModal()
      discardCancel.value?.focus()
    })
  else discardDialog.value?.close()
})
onBeforeUnmount(unsubscribe)
onBeforeRouteLeave(async () => {
  if (!draft.value || saved.value || conflict.value) return true
  cancel()
  return await persist()
})
</script>
