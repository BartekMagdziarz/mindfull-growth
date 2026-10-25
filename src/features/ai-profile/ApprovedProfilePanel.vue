<template>
  <section class="approved-profile" aria-label="Profil dla AI">
    <header>
      <h2>Twój profil dla AI</h2>
      <button
        type="button"
        class="profile-icon-button"
        aria-label="Opcje profilu"
        :aria-expanded="showOptions"
        @click="showOptions = !showOptions"
      >
        <AppIcon name="settings" />
      </button>
      <p class="profile-lead">Ty decydujesz, co AI o Tobie wie.</p>
    </header>
    <p v-if="loading" role="status">Wczytuję profil…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <button
      v-if="(!items.length || hasIntroduction) && tab === 'items'"
      type="button"
      @click="tab = 'introduction'"
    >
      {{
        hasIntroduction
          ? `Poznajmy się · ${introductionProgress}/7 obszarów`
          : 'Poznajmy się — zacznij od rozmowy'
      }}
    </button>
    <div class="profile-toolbar">
      <button
        v-if="tab === 'items'"
        type="button"
        class="profile-icon-button profile-add"
        aria-label="Dodaj informację"
        title="Dodaj informację"
        @click="editItem()"
      >
        <AppIcon name="add" />
      </button>
      <nav class="profile-tabs" aria-label="Części profilu">
        <button type="button" :aria-pressed="tab === 'items'" @click="tab = 'items'">
          Informacje
        </button>
        <button type="button" :aria-pressed="tab === 'proposals'" @click="tab = 'proposals'">
          Do przejrzenia
          <span v-if="pending.length" class="profile-badge">{{ pending.length }}</span>
        </button>
      </nav>
    </div>
    <div v-if="showOptions" class="profile-card profile-options" aria-label="Opcje profilu">
      <button type="button" @click="openSection('introduction')">Poznajmy się</button>
      <button type="button" @click="openSection('history')">Historia zmian</button>
      <button type="button" @click="openSection('legacy')">Wcześniejsze profile</button>
      <RouterLink to="/profile#ai-settings">Dostęp do danych i ustawienia AI</RouterLink>
    </div>
    <IntroductionPanel
      v-if="tab === 'introduction'"
      @changed="refresh"
      @review="reviewIntroduction"
    />
    <template v-if="tab === 'items'">
      <details class="profile-card">
        <summary>Przegląd przyjętych informacji</summary>
        <p v-if="!active.length">
          Profil jest pusty. Możesz zacząć od kilku słów o sobie lub o tym, jak chcesz korzystać z
          AI.
        </p>
        <p v-for="category in PROFILE_CATEGORIES" :key="category">
          <template v-if="active.some(i => i.category === category)"
            ><strong>{{ CATEGORY_LABELS[category] }}.</strong>
            {{
              active
                .filter(i => i.category === category)
                .map(i => (i.origin.kind === 'observation' ? `Hipoteza: ${i.text}` : i.text))
                .join(' ')
            }}</template
          >
        </p>
        <p class="profile-muted">
          Ten przegląd łączy wyłącznie przyjęte treści; nie dodaje interpretacji AI.
        </p>
      </details>

      <form v-if="editing" class="profile-card" @submit.prevent="saveItem">
        <h3>{{ editing.id ? 'Edytuj informację' : 'Nowa informacja' }}</h3>
        <ProfileContentEditor v-model="draft" :objects="objects" />
        <div class="profile-actions">
          <button type="submit" :disabled="busy">Zapisz informację</button
          ><button type="button" @click="editing = null">Anuluj</button>
        </div>
      </form>
      <article v-for="item in items" :key="item.id" class="profile-card" :aria-label="item.text">
        <header>
          <span class="profile-eyebrow">{{ CATEGORY_LABELS[item.category] }}</span>
          <span>{{ SCOPE_LABELS[item.scope] }} · {{ date(item.confirmedAt) }}</span>
        </header>
        <p v-if="item.origin.kind === 'observation'">
          <strong>Przyjęta hipoteza — do dalszej refleksji</strong>
        </p>
        <h3 class="profile-prose">{{ item.text }}</h3>
        <p v-if="item.status !== 'active'">
          {{ item.status === 'ended' ? 'Zakończone' : 'Oznaczone jako nieaktualne' }} — nie jest
          przekazywane do AI.
        </p>
        <p v-else-if="periodEnded(item)">
          Minął okres istotności. Treść zachowana; nie jest przekazywana do AI.
        </p>
        <p v-else-if="needsReview(item)">
          Warto sprawdzić aktualność. AI może o nią zapytać; nie uznajemy automatycznie, że treść
          przestała być prawdziwa.
        </p>
        <p v-if="item.status === 'active' && !availableIds.has(item.id)" class="profile-muted">
          Obecnie poza kontekstem AI: ograniczony dostęp, zmienione źródło, zakończony okres albo
          brak powiązanego obiektu.
        </p>
        <details class="profile-item-details">
          <summary>Szczegóły</summary>
          <ObservationDetails :origin="item.origin" />
          <p class="profile-muted">
            {{ item.origin.label }} · Potwierdzono {{ date(item.confirmedAt) }} · Wersja
            {{ item.version }}
          </p>
          <div class="profile-actions">
            <button type="button" :disabled="busy" @click="editItem(item)">Edytuj</button
            ><button
              v-if="item.status === 'active'"
              type="button"
              :disabled="busy"
              @click="endItem(item, 'ended')"
            >
              Zakończ</button
            ><button
              v-if="item.status === 'active'"
              type="button"
              :disabled="busy"
              @click="endItem(item, 'outdated')"
            >
              Oznacz jako nieaktualne</button
            ><button
              v-if="item.status !== 'active'"
              type="button"
              :disabled="busy"
              @click="endItem(item, 'active')"
            >
              Przywróć do aktywnych
            </button>
            <button type="button" @click="showOrigin(item.origin, $event)">Pochodzenie</button>
          </div>
        </details>
      </article>
    </template>
    <template v-if="tab === 'proposals'">
      <ObservationRequest @created="refresh" />
      <p>
        Nie musisz przeglądać propozycji podczas refleksji. Możesz wrócić tutaj później,
        porozmawiać, poprawić treść lub ją odrzucić.
      </p>
      <p v-if="!pending.length">Nie masz propozycji do przejrzenia.</p>
      <article v-for="proposal in pending" :key="proposal.id" class="profile-card">
        <h3>
          {{ operationLabel[proposal.operation] }} ·
          {{ CATEGORY_LABELS[proposal.content.category] }}
        </h3>
        <p v-if="proposal.origin.kind === 'observation'">
          <strong>Obserwacja AI do sprawdzenia — nie fakt o Tobie</strong>
        </p>
        <p class="profile-prose">{{ proposal.content.text }}</p>
        <ObservationDetails :origin="proposal.origin" />
        <p>{{ proposal.reason }}</p>
        <p class="profile-muted">{{ proposal.origin.label }} · {{ date(proposal.createdAt) }}</p>
        <blockquote v-if="proposal.origin.quote">
          Twoje słowa: „{{ proposal.origin.quote }}”
        </blockquote>
        <p v-if="conflicted(proposal)" role="alert">
          Informacja docelowa została zmieniona. Przeczytaj obie wersje i świadomie zaktualizuj
          propozycję przed przyjęciem.
        </p>
        <p v-if="proposal.targetId">
          <strong>Obecnie w profilu:</strong>
          {{ items.find(i => i.id === proposal.targetId)?.text ?? 'Informacja nie istnieje' }}
        </p>
        <div class="profile-actions">
          <button
            type="button"
            :disabled="busy || conflicted(proposal)"
            @click="approveProposal(proposal)"
          >
            Zatwierdź do profilu
          </button>
          <button type="button" :disabled="busy" @click="openProposal(proposal, 'edit')">
            Popraw
          </button>
          <button type="button" :disabled="busy" @click="openProposal(proposal, 'discuss')">
            Omów
          </button>
          <button type="button" @click="showOrigin(proposal.origin, $event)">Pochodzenie</button>
          <button type="button" :disabled="busy" @click="reject(proposal)">Odrzuć</button>
        </div>
        <section v-if="selected?.id === proposal.id">
          <form v-if="proposalMode === 'edit'" @submit.prevent="revise">
            <ProfileContentEditor v-model="proposalDraft" :objects="objects" />
            <button type="submit" :disabled="busy">
              {{
                conflicted(proposal)
                  ? 'Zapisz po porównaniu z obecną wersją'
                  : 'Zapisz poprawki propozycji'
              }}
            </button>
          </form>
          <div v-if="proposalMode === 'discuss'">
            <div class="profile-discussion" role="log" aria-label="Rozmowa o propozycji">
              <p v-for="(message, index) in proposal.discussion" :key="index">
                <strong>{{ message.role === 'user' ? 'Ty' : 'AI' }}</strong
                ><br />{{ message.text }}
              </p>
              <p v-if="pendingQuestion"><strong>Ty</strong><br />{{ pendingQuestion }}</p>
              <AiActivity v-if="pendingQuestion" @cancel="controller?.abort()" />
            </div>
            <label
              >Co chcesz omówić?<textarea
                v-model="question"
                :disabled="busy"
                @keydown="onQuestionKeydown"
                rows="3"
                maxlength="4000"
                placeholder="Na ile to do mnie pasuje? Jak możemy to lepiej ująć?"
              />
            </label>
            <div class="profile-actions">
              <button type="button" :disabled="busy || !question.trim()" @click="discuss">
                Porozmawiaj z AI
              </button>
            </div>
            <p class="profile-muted">
              Rozmowa przesyła do OpenAI treść tej propozycji, jej pochodzenie, przyjęty profil i
              wiadomości. Nie zatwierdza ani nie poprawia informacji automatycznie.
            </p>
          </div>
          <button type="button" @click="selected = null">Zamknij</button>
        </section>
      </article>
    </template>
    <template v-if="tab === 'history'">
      <p v-if="!changes.length">Nie ma jeszcze zmian przyjętych informacji.</p>
      <article v-for="change in changes" :key="change.id" class="profile-card">
        <h3>{{ date(change.at) }} · Wersja {{ change.after.version }}</h3>
        <p v-if="change.before">
          <strong>Przed:</strong> {{ change.before.text }} ({{ statusLabel[change.before.status] }})
        </p>
        <p><strong>Po:</strong> {{ change.after.text }} ({{ statusLabel[change.after.status] }})</p>
      </article>
      <details>
        <summary>Rozstrzygnięte propozycje</summary>
        <p v-for="proposal in resolved" :key="proposal.id">
          {{ proposal.status === 'accepted' ? 'Przyjęta' : 'Odrzucona' }}:
          {{ proposal.content.text }}
        </p>
      </details>
    </template>
    <template v-if="tab === 'legacy'">
      <p>
        Wcześniejsze opisy pozostają dostępne. Nie traktujemy ich automatycznie jako zatwierdzonego
        profilu.
      </p>
      <p v-if="!legacy.length">Nie masz wcześniejszych opisów.</p>
      <article v-for="profile in legacy" :key="profile.id" class="profile-card">
        <h3>Opis z {{ date(profile.createdAt) }}</h3>
        <details>
          <summary>Przeczytaj wcześniejszy opis</summary>
          <p v-for="(text, key) in profile.sections" :key="key" class="profile-prose">
            <strong>{{ key }}</strong
            ><br />{{ text }}
          </p>
        </details>
        <button type="button" :disabled="busy" @click="importLegacy(profile.id)">
          Przenieś fragmenty do propozycji
        </button>
      </article>
      <RouterLink :to="{ name: 'profile-psychological' }"
        >Otwórz wcześniejszy widok profilu</RouterLink
      >
    </template>
    <Teleport v-if="origin && originTarget" :to="originTarget"
      ><section class="profile-card" aria-label="Pochodzenie informacji">
        <header>
          <h3>{{ origin.label }}</h3>
          <button type="button" @click="origin = null">Zamknij pochodzenie</button>
        </header>
        <p v-if="origin.quote">{{ origin.quote }}</p>
        <p v-if="origin.kind === 'legacy'">
          Pochodzi ze starej narracji AI; nie jest bezpośrednim cytatem użytkownika. Oryginał
          znajdziesz we wcześniejszych profilach.
        </p>
        <p v-if="!origin.citations.length && !origin.quote">
          {{
            origin.label.includes('fikcyj')
              ? 'To element przygotowanego profilu fikcyjnej osoby, nie wniosek AI z wpisu. Nie ma przypisanego dokumentu źródłowego.'
              : origin.kind === 'user'
                ? 'Informacja wpisana bezpośrednio do profilu. Nie pochodzi z wpisu Dziennika i nie ma osobnego dokumentu źródłowego.'
                : 'Dla tej informacji nie zapisano odsyłacza do dokumentu źródłowego.'
          }}
        </p>
        <p v-if="sourceLoading" role="status">Wczytuję źródła…</p>
        <article v-for="(source, index) in sources" :key="index">
          <h4>
            {{
              source.status === 'ok'
                ? readableSourceTitle(source)
                : 'Źródło niedostępne lub zmienione'
            }}
          </h4>
          <template v-if="source.status === 'ok'"
            ><small>{{ source.occurredAt.slice(0, 10) }}</small
            ><HistorySourceContent :source="source" />
            <p v-if="source.nextOffset !== null" class="profile-muted">
              Podgląd skrócony.
            </p></template
          >
        </article>
      </section></Teleport
    >
  </section>
</template>
<script setup lang="ts">
import AiActivity from '@/components/shared/AiActivity.vue'
import { readableSourceTitle } from '@/features/ai-companion/sourcePresentation'
import HistorySourceContent from '@/features/ai-companion/HistorySourceContent.vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import {
  CATEGORY_LABELS,
  PROFILE_CATEGORIES,
  SCOPE_LABELS,
  blankProfileContent,
  needsReview,
  periodEnded,
  type ApprovedProfileItem,
  type ProfileChange,
  type ProfileOrigin,
  type ProfileProposal,
} from '@/domain/approvedProfile'
import type { UserProfile } from '@/domain/userProfile'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { approvedProfileContext, originAvailable } from '@/services/ai/profile/context'
import { proposeLegacyProfile } from '@/services/ai/profile/legacy'
import { discussProfileProposal } from '@/services/ai/profile/assistant'
import { createHistoryTools } from '@/services/ai/history/tools'
import type { SourceRef } from '@/services/ai/history/contracts'
import { CompanionError } from '@/services/ai/companion/openai'
import AppIcon from '@/components/shared/AppIcon.vue'
import IntroductionPanel from '@/features/ai-introduction/IntroductionPanel.vue'
import ObservationRequest from './ObservationRequest.vue'
import ObservationDetails from './ObservationDetails.vue'
import ProfileContentEditor from './ProfileContentEditor.vue'
import './profile.css'
const repo = approvedProfileRepository(),
  route = useRoute()
const items = shallowRef<ApprovedProfileItem[]>([]),
  proposals = shallowRef<ProfileProposal[]>([]),
  changes = shallowRef<ProfileChange[]>([]),
  legacy = shallowRef<UserProfile[]>([])
const availableIds = shallowRef(new Set<string>())
const objects = shallowRef<Array<{ ref: SourceRef; label: string }>>([])
function openSection(section: string) {
  tab.value = section
  showOptions.value = false
}
const showOptions = ref(false)
const hasIntroduction = ref(false)
const introductionProgress = ref(0)
const tab = ref(
    route.query.review === '1'
      ? 'proposals'
      : route.query.introduction === '1'
        ? 'introduction'
        : 'items'
  ),
  loading = ref(true),
  busy = ref(false),
  error = ref(''),
  notice = ref('')
const editing = shallowRef<{
    id?: string
    version?: number
    status?: ApprovedProfileItem['status']
  } | null>(null),
  draft = ref(blankProfileContent())
const selected = shallowRef<ProfileProposal | null>(null),
  proposalDraft = ref(blankProfileContent()),
  question = ref('')
const origin = shallowRef<ProfileOrigin | null>(null),
  sourceLoading = ref(false)
const sources = shallowRef<
  Awaited<ReturnType<ReturnType<typeof createHistoryTools>['readSources']>>['items']
>([])
let disposed = false,
  controller: AbortController | undefined,
  sourceRequest = 0
const pending = computed(() => proposals.value.filter(p => p.status === 'pending'))
const resolved = computed(() => proposals.value.filter(p => p.status !== 'pending'))
const active = computed(() => items.value.filter(i => i.status === 'active' && !periodEnded(i)))
const statusLabel = { active: 'aktywne', ended: 'zakończone', outdated: 'nieaktualne' }
const operationLabel = { add: 'Dodanie', update: 'Zmiana', end: 'Zakończenie' }
const date = (value: string) => new Date(value).toLocaleDateString('pl')
const conflicted = (p: ProfileProposal) =>
  p.operation !== 'add' && items.value.find(i => i.id === p.targetId)?.version !== p.targetVersion
function content(item: ApprovedProfileItem | ProfileProposal['content']) {
  return JSON.parse(
    JSON.stringify({
      category: item.category,
      text: item.text,
      scope: item.scope,
      reviewAfter: item.reviewAfter,
      validUntil: item.validUntil,
      linkedObject: item.linkedObject,
    })
  )
}
async function reload() {
  const snapshot = await repo.snapshot()
  const old = await repo.db.userProfiles.toArray()
  const ongoing = (await repo.db.companionIntroductions.toArray())
    .filter(s => s.status !== 'complete')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  hasIntroduction.value = !!ongoing
  introductionProgress.value = ongoing
    ? Object.values(ongoing.coverage).filter(v => v === 'answered').length
    : 0
  const contexts = await Promise.all(
    (['general', 'weekly-reflection', 'monthly-reflection', 'journal'] as const).map(scope =>
      approvedProfileContext(scope).catch(reason => {
        if (!(reason instanceof CompanionError) || reason.code !== 'profile-context-limit')
          throw reason
        if (!disposed)
          notice.value =
            'Profil jest zbyt długi do przekazania w całości. Skróć lub zakończ część aktywnych informacji; nadal możesz je tutaj edytować.'
        return { items: [] }
      })
    )
  )
  repo.guard()
  if (disposed) return
  items.value = snapshot.items.sort(
    (a, b) => a.category.localeCompare(b.category) || b.updatedAt.localeCompare(a.updatedAt)
  )
  proposals.value = snapshot.proposals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  changes.value = snapshot.changes.sort((a, b) => b.at.localeCompare(a.at))
  legacy.value = old.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  availableIds.value = new Set(contexts.flatMap(c => c.items.map(i => i.id)))
  if (selected.value)
    selected.value = proposals.value.find(p => p.id === selected.value!.id) ?? null
}
async function perform(work: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await work()
    if (!disposed) await reload()
  } catch (reason) {
    if (!disposed) {
      const code = reason instanceof CompanionError ? reason.code : ''
      error.value = code.includes('conflict')
        ? 'Dane zmieniły się w innej karcie. Wczytano obecną wersję; porównaj ją i ponów decyzję.'
        : code === 'cancelled'
          ? 'Przerwano rozmowę. Propozycja nie została zatwierdzona.'
          : code === 'source-unavailable'
            ? 'Źródło zostało zmienione lub wykluczone. Ta propozycja nie może być wysłana do AI ani przyjęta bez ponownego ustalenia treści.'
            : code === 'missing-api-key'
              ? 'Podłącz OpenAI lub Claude w ustawieniach AI albo w lokalnym pliku .env.'
              : code === 'cost-limit'
                ? 'Wykorzystano dzisiejszy limit analiz profilu. Nadal możesz edytować i zatwierdzać ręcznie.'
                : 'Nie udało się wykonać działania. Sprawdź dane i spróbuj ponownie.'
      if (code.includes('conflict')) await reload()
    }
  } finally {
    if (!disposed) busy.value = false
  }
}
const refresh = () => perform(async () => {})
function reviewIntroduction() {
  tab.value = 'proposals'
  void refresh()
}
function editItem(item?: ApprovedProfileItem) {
  editing.value = item ? { id: item.id, version: item.version, status: item.status } : {}
  draft.value = item ? content(item) : blankProfileContent()
}
const saveItem = () =>
  perform(async () => {
    await repo.save(
      content(draft.value),
      editing.value?.id,
      editing.value?.version,
      editing.value?.status
    )
    editing.value = null
  })
const endItem = (item: ApprovedProfileItem, status: ApprovedProfileItem['status']) =>
  perform(() => repo.save(content(item), item.id, item.version, status))
const proposalMode = ref<'edit' | 'discuss'>('edit')
function openProposal(p: ProfileProposal, mode: 'edit' | 'discuss') {
  if (selected.value?.id !== p.id) {
    proposalDraft.value = content(p.content)
    question.value = ''
  }
  selected.value = p
  proposalMode.value = mode
}
async function approveProposal(p: ProfileProposal) {
  if (selected.value?.id !== p.id) {
    selected.value = p
    proposalDraft.value = content(p.content)
  }
  await accept()
}
const reject = (p: ProfileProposal) => perform(() => repo.decide(p.id, p.version, false))
const accept = () =>
  perform(async () => {
    const p = selected.value!
    if (!(await originAvailable(p.origin))) throw new CompanionError('source-unavailable')
    await repo.decide(p.id, p.version, true, content(proposalDraft.value))
    selected.value = null
  })
const revise = () =>
  perform(async () => {
    const p = selected.value!
    const target = items.value.find(i => i.id === p.targetId)
    await repo.revise(
      p.id,
      p.version,
      content(proposalDraft.value),
      conflicted(p) ? target?.version : undefined
    )
  })
const pendingQuestion = ref('')
function onQuestionKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    if (!busy.value && question.value.trim()) void discuss()
  }
}
async function discuss() {
  if (busy.value || !question.value.trim()) return
  const sent = question.value
  pendingQuestion.value = sent
  question.value = ''
  await perform(async () => {
    controller = new AbortController()
    await discussProfileProposal(selected.value!, sent, { signal: controller.signal })
  })
  if (!disposed) {
    if (error.value) question.value = sent
    pendingQuestion.value = ''
  }
}
const importLegacy = (id: string) =>
  perform(async () => {
    const result = await proposeLegacyProfile(id)
    notice.value = `Fragmenty gotowe do przeglądu: ${result.created}.${result.tooLong ? ` Pominięto ${result.tooLong} sekcji przekraczających limit długości — możesz przepisać ich istotny fragment ręcznie.` : ''}`
    tab.value = 'proposals'
  })
const originTarget = shallowRef<HTMLElement | null>(null)
async function showOrigin(value: ProfileOrigin, event: Event) {
  originTarget.value = (event.currentTarget as HTMLElement).closest('article')
  const request = ++sourceRequest
  origin.value = value
  sources.value = []
  sourceLoading.value = true
  try {
    for (let offset = 0; offset < value.citations.length; offset += 8) {
      const result = await createHistoryTools().readSources({
        requests: value.citations
          .slice(offset, offset + 8)
          .map(c => ({ ref: c.ref, expectedVersion: c.version })),
      })
      if (disposed || request !== sourceRequest) return
      sources.value = [...sources.value, ...result.items]
    }
  } catch {
    if (!disposed) error.value = 'Nie można odczytać źródła.'
  } finally {
    if (!disposed && request === sourceRequest) sourceLoading.value = false
  }
}
onMounted(async () => {
  await perform(async () => {
    const choices: typeof objects.value = []
    for (const collection of ['goals', 'priorities', 'habits'] as const) {
      for (const row of await repo.db.table(collection).toArray())
        choices.push({ ref: { collection, id: row.id }, label: row.title ?? row.name ?? row.id })
    }
    if (!disposed) objects.value = choices
  })
  if (!disposed) loading.value = false
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  sourceRequest++
})
</script>
