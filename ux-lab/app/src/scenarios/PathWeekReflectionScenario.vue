<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { MicroExerciseEntry } from '@product/domain/microExercises'
import type { DayRef } from '@product/domain/period'
import type { ShamePartKey } from '@product/domain/momentsProgress'
import WeekPartsChart from '~lab/components/WeekPartsChart.vue'
import { PART_COLOR, PART_LABEL } from '~lab/lab/momentsParts'
import {
  BACKFILL_LIMIT,
  BACKFILL_RESPONSES,
  BUCKETS,
  bucketLabel,
  dayLetter,
  PART_CHOICES,
  RESPONSE_OPTIONS,
  responseLabel,
  samples,
  SCENE_TASKS,
  TASKS,
  taskByKey,
  THIS_WEEK,
  useWeekReflection,
  weekDays,
  type Sample,
} from '~lab/lab/pathWeekReflection'
import stepCurrent from '~lab/assets/path-week-reflection/step-current.png'

/**
 * Weekly reflection · step "Ścieżka" (shame path), round 1, 2026-10-11.
 *
 * The user's screenshot: the task "zrób dla siebie to, co zrobiłbyś dla
 * przyjaciela" reads "0 z 2", one stretched bar for last week, nothing for
 * this week although "3–5" unlogged was chosen, a centred AI button, chips,
 * two full-width textareas and a 1–5 scale pushed to the right edge.
 *
 * This concept: facts on the left (task tile with its disc, the two-week
 * parts chart at a fixed width, "dopisz moment" instead of a bare count),
 * answers on the right (two questions, the scale under its question, the
 * switch); a task counts a day only when the Moment says it happened.
 */
const route = useRoute()
const router = useRouter()
const sample = computed<Sample>(() => (samples.some(s => s.id === route.query.sample) ? (route.query.sample as Sample) : 'logged'))
const taskKey = computed(() => (SCENE_TASKS.some(key => key === route.query.task) ? String(route.query.task) : 'kindAct'))
const showBridge = computed(() => route.query.bridge === '1')
const themes = [
  { id: 'sky-mist', label: 'Sky Mist' },
  { id: 'current', label: 'Current (domyślny produktu)' },
  { id: 'sunrise-cloud', label: 'Sunrise Cloud' },
]
const theme = computed(() => (themes.some(t => t.id === route.query.theme) ? String(route.query.theme) : 'sky-mist'))
watch(theme, value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
const standalone = computed(() => Boolean(route.meta.standalone))
const previewHref = computed(() => {
  const query = new URLSearchParams(Object.entries(route.query).filter((pair): pair is [string, string] => typeof pair[1] === 'string'))
  const search = query.toString()
  return `/preview/path-week-reflection${search ? `?${search}` : ''}`
})
function setQuery(key: string, value: string | null) {
  const query = { ...route.query }
  if (value === null) delete query[key]
  else query[key] = value
  void router.replace({ query })
}

const r = useWeekReflection(sample, taskKey)
const phaseTitle = computed(() => ({ w1: 'Zauważyć', w2: 'Oparcie', w3: 'Plan na trudną chwilę' })[r.task.value.phase] ?? r.task.value.phase)
/** Enrollment week (the user's screenshot: phase "Oparcie" in path week 3, axis T2 · T3). */
const weekNo = computed(() => (r.task.value.phase === 'w3' ? 4 : 3))
const phaseWhy = computed(() =>
  r.task.value.phase === 'w3'
    ? 'Kroki tego tygodnia: plan na to, co robisz, gdy wstyd uderza, i pytanie, o czym on jest.'
    : 'Kroki tego tygodnia: miejsce, postać i spokojniejsza wersja siebie, do których da się wracać.',
)
const phaseQuestion = computed(() =>
  r.task.value.phase === 'w3'
    ? 'Kiedy zdążyłeś ze swoim planem, a kiedy część była pierwsza?'
    : 'Jak zareagowało twoje ciało, gdy zwróciłeś się do siebie z ciepłem? Co mówił opór?',
)
const days = weekDays(THIS_WEEK)
const disc = computed(() => {
  const done = r.taskDays.value.length
  const total = r.task.value.times
  return { done, total, fill: `${Math.round((Math.min(done, total) / Math.max(1, total)) * 100)}%` }
})
const bridgeDisc = computed(() => ({ done: r.bridgeDays.value.length, total: r.task.value.times }))
const dayOf = (entry: MicroExerciseEntry) => entry.createdAt.slice(0, 10) as DayRef
const partOf = (entry: MicroExerciseEntry) => (typeof entry.responses.compass === 'string' ? (entry.responses.compass as ShamePartKey) : 'none')
const responsesOf = (entry: MicroExerciseEntry) => (Array.isArray(entry.responses.response) ? (entry.responses.response as string[]) : [])
const isBackfilled = (entry: MicroExerciseEntry) => entry.responses.backfilled === 'yes'
/** The note under the task title: which days counted and why — one line, nothing else. */
const taskNotes = computed(() => {
  if (r.declined.value) return []
  const counted = r.weekEntries.value.filter(entry => r.taskDays.value.includes(dayOf(entry)))
  return counted.map(entry => `${dayLetter(dayOf(entry))} · ${PART_LABEL[partOf(entry)]} · ${responsesOf(entry).filter(key => key !== 'nothing').map(responseLabel).join(', ').toLowerCase()}${isBackfilled(entry) ? ' · dopisany' : ''}`)
})
const backfilledByWeek = computed(() => ({ [THIS_WEEK]: r.backfilledByPart.value }))
const quietWeek = computed(() => r.weekEntries.value.length === 0)

// ── dopisz moment ──
const backfillOpen = ref(false)
const form = ref<{ day: DayRef | null; part: ShamePartKey | null; response: string[] }>({ day: null, part: null, response: [] })
const bucketOpen = ref(false)
function openBackfill() {
  form.value = { day: null, part: null, response: [] }
  backfillOpen.value = true
  bucketOpen.value = false
}
function toggleResponse(key: string) {
  const current = form.value.response
  if (key === 'nothing') form.value.response = current.includes('nothing') ? [] : ['nothing']
  else form.value.response = current.includes(key) ? current.filter(item => item !== key) : [...current.filter(item => item !== 'nothing'), key]
}
const formReady = computed(() => Boolean(form.value.day && form.value.part))
function saveBackfill() {
  if (!form.value.day || !form.value.part) return
  r.addBackfill(form.value.day, form.value.part, form.value.response)
  backfillOpen.value = false
  notice.value = 'Moment dopisany jako zapis „dopiero teraz”. Na wykresie jest kreskowany, w Momentach ma datę dnia, nie dzisiejszą.'
}
function chooseBucket(id: string) {
  r.setBucket(id)
  bucketOpen.value = false
}

// ── szczegóły, wzorzec, pozostałe ──
const detailsOpen = ref(false)
const pattern = ref('')
const patternLoading = ref(false)
function requestPattern() {
  patternLoading.value = true
  window.setTimeout(() => {
    const week = r.stats.value[1]!
    const dominant = (['attackSelf', 'avoid', 'withdraw', 'attackOthers'] as ShamePartKey[]).filter(part => week.byPart[part]).sort((a, b) => week.byPart[b] - week.byPart[a])[0]
    pattern.value = week.total
      ? `Ster brał najczęściej ${dominant ? PART_LABEL[dominant] : 'nikt'}; przy ${week.responded} z ${week.total} momentów coś zrobiłeś zamiast reakcji${week.unlogged ? `, a około ${week.unlogged} chwil minęło bez zapisu` : ''}.`
      : `Cichy tydzień w zapisie${week.unlogged ? `, ale około ${week.unlogged} chwil minęło bez zapisu` : ''}. Zapis w spokojny dzień też się liczy.`
    patternLoading.value = false
  }, 700)
}
const notice = ref('')
function reset() {
  r.reset()
  backfillOpen.value = false
  bucketOpen.value = false
  detailsOpen.value = false
  pattern.value = ''
  notice.value = ''
}
watch([sample, taskKey], reset)
const severityHint = computed(() => `poprzednio: ${r.previousSeverity}`)
const stepsCount = computed(() => `6 z 7`)

/** Task → Moment answer: the rule table (section 02b). */
const ruleRows = TASKS.map(task => ({
  key: task.key,
  title: task.title,
  rule: !task.rule
    ? 'tylko Plan Dnia (bez Momentu)'
    : task.rule.any
      ? 'każdy ruch poza „Nic, tym razem”'
      : `${(task.rule.options ?? []).map(responseLabel).join(' lub ')}${task.rule.part ? ` · ster: ${PART_LABEL[task.rule.part]}` : ''}`,
  proposed: task.newOption ? responseLabel(task.newOption) : '',
  today: task.rule ? 'każdy Moment' : '—',
}))
const proposedOptions = RESPONSE_OPTIONS.filter(option => option.proposed)

const audit = [
  {
    id: 'A1',
    where: 'Zadanie tygodnia · „0 z 2”',
    now: 'Licznik rośnie przy każdym zapisie Momentu (programTaskBridgeService zalicza dzień, gdy linkSlug = moment-shame), także z odpowiedzią „Nic, tym razem”. Dla tego zadania w Momentach nie ma odpowiedzi, która by mu odpowiadała. Czytane jako „0 razy zadbałem o siebie”, a znaczy „0 zapisów”.',
    next: 'Zadanie liczy dzień tylko wtedy, gdy Moment mówi, że zadanie się wydarzyło (tabela 02b). Dla czterech zadań dochodzi nowa odpowiedź w Momentach (np. „Coś dla siebie, jak dla przyjaciela”). Na kafelku zadania: dysk „1/2” jak w widoku ścieżki i jedna linia, które dni i dlaczego.',
  },
  {
    id: 'A2',
    where: 'Wykres części · jeden słupek na pół karty',
    now: 'PathPartsChart: repeat(2, 1fr) — przy dwóch tygodniach jedna kolumna ma połowę szerokości karty. Cichy tydzień (zero zapisów) zwraca pustą kolumnę i NIE rysuje obrysu „niezapisane”, więc wybór „3–5” nie zostawia śladu (T3 na zrzucie).',
    next: 'Kolumny o stałej szerokości 2,6 rem, wyrównane do lewej, legenda obok. Obrys szacunku rysuje się także w cichym tygodniu. Momenty dopisane w refleksji są kreskowane, nie pełne.',
  },
  {
    id: 'A3',
    where: '„Były momenty, których nie zapisałeś?” · żaden · 1–2 · 3–5 · więcej',
    now: 'Zbiera samą liczbę: bez dnia, bez części, bez tego, co zrobiłeś. Nie da się jej później rozbudować, a wykres „kto przejmował ster” dostaje tylko szarą czapkę.',
    next: '„Dopisz” otwiera mały kafel: dzień (studnie Pn–Nd), która część, co zrobiłeś zamiast (opcjonalnie). Najwyżej dwa — te, które pamiętasz najlepiej. Dopisany Moment dostaje „kiedy zauważyłem: dopiero teraz” i datę tego dnia. Przedział liczbowy zostaje pod „więcej, bez szczegółów” jako wyjście dla reszty.',
  },
  {
    id: 'A4',
    where: 'Przycisk „Zaproponuj wzorzec tygodnia” · wyśrodkowany',
    now: 'Samotna linia na środku bloku, między wykresem a pytaniami; wynik pojawia się pod przyciskiem i rozpycha blok.',
    next: 'Cichy link w nagłówku bloku (jak „Mój plan” w karcie Praktyki). Propozycja wchodzi jako pole papieru na dole kolumny faktów, oznaczone „Propozycja”.',
  },
  {
    id: 'A5',
    where: 'Pytania · textarea na całą szerokość, skala 1–5 przy prawej krawędzi',
    now: 'Dwa pola tekstowe i pasek ocen rozciągnięte na całą szerokość bloku; pytanie o natężenie po lewej, pięć przycisków i „?” po prawej, między nimi pusty środek. Dwa otwarte pytania (zadanie / faza) czytają się jak jedno.',
    next: 'Blok w dwóch kolumnach: fakty po lewej (zadanie, wykres, dopisz), odpowiedzi po prawej. Skala stoi pod swoim pytaniem, wyrównana do lewej, z „wcale · bardzo” i „poprzednio: 4” w jednej linii. Pola tekstowe mają naturalną szerokość kolumny, pytanie fazy dostaje eyebrow z nazwą fazy.',
  },
]

const decisions = [
  { id: 'D1', title: 'Zadanie liczy zadanie, nie zapis', body: 'Dzień zadania = Moment, w którym odpowiedź „Co zrobiłeś — zamiast albo zaraz po?” zawiera ruch zadania (tabela 02b). Dla kindAct, soothingGesture, stayLonger i handOver dochodzą cztery nowe odpowiedzi w Momentach; useResponse i keepResponse liczą każdy ruch poza „Nic”; noticeCritic i handOver wymagają dodatkowo steru Krytyka. Zadania bez kotwicy (receiveKindness, sayNo, readAloud) zostają w Planie Dnia. Most w programTaskBridgeService dostaje regułę per zadanie zamiast samego linkSlug.' },
  { id: 'D2', title: 'Kafel zadania: dysk „1/2” i jedna linia faktów', body: 'Tytuł, po prawej dysk oceny jak w widoku ścieżki (wypełnienie + odczyt). Pod tytułem jedna linia: które dni się liczą i z czego („wt · Krytyk · coś dla siebie”), albo „jeszcze bez dnia”. Bez „po co” na wierzchu (jest w planie tygodnia). Przełącznik „pokaż licznik dzisiejszego mostu” w pasku Labu pokazuje różnicę.' },
  { id: 'D3', title: 'Dopisz moment (≤ 2) zamiast gołej liczby', body: 'Pytanie zostaje, odpowiedzi to: „żaden”, „Dopisz” i „więcej, bez szczegółów” (rozwija 1–2 · 3–5 · więcej). Dopisanie = kafel papieru: dzień (Pn–Nd), część (pięć czipów z kropką koloru), co zrobiłeś zamiast (pięć skrótów, pełna lista w Momentach). Zapis trafia do Momentów z datą dnia, noticed = „dopiero teraz”, znacznik backfilled. Limit dwóch chroni przed przeglądem własnych porażek; dla reszty jest przedział.' },
  { id: 'D4', title: 'Zapis „na zimno” wygląda inaczej niż „na gorąco”', body: 'Dopisane Momenty są kreskowane na wykresie i oznaczone „dopisany” w Szczegółach; w statystyce „kiedy zauważam” lądują w „dopiero teraz”, więc nie poprawiają sztucznie tempa zauważania. Szacunek „bez szczegółów” pozostaje kreskowanym obrysem bez koloru. Cichy tydzień rysuje obrys (naprawa PathPartsChart: kolumna quiet z unlogged > 0).' },
  { id: 'D5', title: 'Runda 2: trzy sekcje zamiast dwóch kolumn', body: 'Runda 1 (fakty po lewej, odpowiedzi po prawej) odrzucona 11.10: nie było widać, które pytanie czego dotyczy, co znaczy „Oparcie” ani czego dotyczy przełącznik. Teraz blok = trzy sekcje jedna pod drugą, każda z eyebrow i jednym zdaniem „o czym to”: ZADANIE TYGODNIA (kafel zadania · pytanie „Jak poszło z tym zadaniem?” · przełącznik „Zostań przy tym zadaniu” z dopiskiem, że zamiast nowego w planie), MOMENTY (wykres · niezapisane/dopisz · Szczegóły · wzorzec AI w nagłówku sekcji), TYDZIEŃ 2 · OPARCIE (zdanie o krokach tej fazy · natężenie wstydu · pytanie fazy). Sekcja jest o ton bielsza niż blok (62 % bieli), elementy w niej o kolejny (80 %). Wewnątrz sekcji dwie kolumny, ale już tylko „fakt | pytanie o ten fakt”.' },
  { id: 'D5a', title: 'Runda 1 (zapis): dwie kolumny fakty · odpowiedzi', body: 'Lewa kolumna (≈ 0,9 fr, min 19 rem): eyebrow ZADANIE TYGODNIA + kafel, eyebrow KTO PRZEJMOWAŁ STER + wykres + pytanie o niezapisane + Szczegóły, na dole Propozycja (AI). Prawa (1,1 fr): „Jak poszło?”, skala natężenia pod pytaniem, pytanie fazy z eyebrow fazy, przełącznik „Zostań przy zadaniu”. Nic nie rozciąga się na całą szerokość bloku; wykres ma stałą szerokość kolumn.' },
  { id: 'D6', title: 'Jedno „Szczegóły” zamiast dwóch rozwinięć', body: 'Dziś blok ma „Szczegóły” (dyski odpowiedzi, kiedy zauważam, tabela) oraz osobne „Momenty z tego tygodnia (n)”. Tu jedno rozwinięcie: lista Momentów tygodnia (dzień · część · sytuacja · ruchy; „dopisany” przy dopisanych), pod nią mała tabela liczb dla T2/T3. Dyski i paski „kiedy zauważam” zostają w widoku ścieżki.' },
  { id: 'D7', title: 'Wzorzec tygodnia jako link w nagłówku', body: '„✦ Zaproponuj wzorzec tygodnia” w nagłówku bloku, po prawej od nazwy ścieżki i fazy; wynik jako pole papieru „Propozycja” na dole kolumny faktów. Prompt PATH_WEEK_PATTERN dostaje też dopisane Momenty i przedział.' },
  { id: 'D8', title: 'Skala pod pytaniem, nie przy krawędzi', body: 'Pięć przycisków 40 px w jednym rzędzie pod pytaniem, wyrównane do lewej; „wcale … bardzo” pod skrajnymi, „poprzednio: 4” jako dopisek w tej samej linii. Znak „?” zostaje jako tytuł na hover pytania, nie osobny przycisk.' },
]
</script>

<template>
  <section class="scenario-page pwr mg-design-v2" :class="{ 'pwr--standalone': standalone }">
    <header v-if="!standalone" class="concept-heading">
      <div>
        <span class="lab-eyebrow">Ścieżki · refleksja tygodnia · krok „Ścieżka” · runda 1 · 11.10.2026</span>
        <h1>Zadanie liczy zadanie, momenty da się dopisać, nic nie rozciąga się na całą szerokość</h1>
        <p>
          Zrzut usera z kroku 6: „0 z 2” rośnie przy każdym Momencie, także z „Nic, tym razem”; jeden słupek zajmuje pół karty, a wybór „3–5
          niezapisanych” nie zostawia śladu w cichym tygodniu; przycisk AI na środku; pola i skala od krawędzi do krawędzi. Ten koncept kładzie
          fakty po lewej, a odpowiedzi po prawej, zamienia liczbę niezapisanych na „dopisz do dwóch” z dniem i częścią, i wiąże licznik zadania z
          odpowiedzią w Momencie.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 1</span>
    </header>

    <div v-if="!standalone" class="pwr__toolbar">
      <label class="pwr__select"
        >Scenariusz
        <select :value="sample" @change="setQuery('sample', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in samples" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select></label
      >
      <label class="pwr__select"
        >Zadanie tygodnia
        <select :value="taskKey" @change="setQuery('task', ($event.target as HTMLSelectElement).value)">
          <option v-for="key in SCENE_TASKS" :key="key" :value="key">{{ taskByKey(key).title }}</option>
        </select></label
      >
      <label class="pwr__select pwr__check"><input type="checkbox" :checked="showBridge" @change="setQuery('bridge', ($event.target as HTMLInputElement).checked ? '1' : null)" />licznik dzisiejszego mostu</label>
      <label class="pwr__select"
        >Motyw
        <select :value="theme" @change="setQuery('theme', ($event.target as HTMLSelectElement).value)">
          <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select></label
      >
      <a class="pwr__reset" :href="previewHref" target="_blank" rel="noopener">Podgląd 1:1 bez pasków Laba ↗</a>
      <button type="button" class="pwr__reset pwr__reset--tight" @click="reset">Przywróć przykład</button>
    </div>

    <!-- 01 · krok w rytuale -->
    <div class="pwr__stage">
      <div class="quiet-ritual">
        <div class="pwr-card">
          <header class="pwr-heading">
            <h1>Jak poszło poza aplikacją?</h1>
            <span class="pwr-count">{{ stepsCount }}</span>
          </header>

          <article class="blk" data-testid="path-week-block">
            <header class="blk__head">
              <span class="blk__icon"><AppIcon name="mg-exercise-compassionate-image" /></span>
              <strong>Ze wstydu do współczucia</strong>
              <span class="blk__phase">· tydzień {{ weekNo }} z 8</span>
            </header>

            <!-- 1 · zadanie tygodnia: co robiłeś w świecie -->
            <section class="sec" aria-labelledby="sec-task">
              <header class="sec__head">
                <small id="sec-task" class="eyebrow" title="Jedna rzecz do wypróbowania poza aplikacją, przyjęta w planie tygodnia.">Zadanie tygodnia</small>
              </header>
              <div class="sec__grid">
                <div v-if="r.declined.value" class="task task--muted"><span>Zadanie ze ścieżki odłożone na ten tydzień</span></div>
                <div v-else class="task" tabindex="0" :aria-label="`${r.task.value.title}: ${disc.done} z ${disc.total} dni`">
                  <div class="task__row">
                    <strong class="task__title">{{ r.task.value.title }}</strong>
                    <span class="well disc disc--meter" :class="{ 'well--done': disc.done >= disc.total }" :style="{ '--fill': disc.fill }" :aria-label="`${disc.done} z ${disc.total} dni`">
                      <b v-if="disc.done < disc.total">{{ disc.done }}<i>/{{ disc.total }}</i></b>
                    </span>
                  </div>
                  <p class="task__note" :class="{ 'task__note--empty': !taskNotes.length }"><template v-if="taskNotes.length"><span v-for="line in taskNotes" :key="line">{{ line }}</span></template><template v-else>jeszcze bez dnia</template></p>
                  <p v-if="showBridge" class="task__bridge">dzisiejszy most policzyłby: <b>{{ bridgeDisc.done }} z {{ bridgeDisc.total }}</b> (każdy Moment tygodnia)</p>
                </div>
                <div v-if="!r.declined.value" class="sec__answers">
                  <label class="field">
                    <span>Jak poszło z tym zadaniem? Co wyszło inaczej, niż się spodziewałeś?</span>
                    <textarea v-model="r.answers.outcome" rows="2" />
                  </label>
                  <div class="stay">
                    <button type="button" class="chip chip--quiet" :aria-pressed="r.stay.value" title="W planie następnego tygodnia to zadanie zostanie zamiast nowej propozycji" @click="r.stay.value = !r.stay.value">
                      <AppIcon :name="r.stay.value ? 'check' : 'replay'" />Zostań przy zadaniu
                    </button>
                  </div>
                </div>
                <p v-else class="sec__quiet">W planie następnego tygodnia dostaniesz nową propozycję.</p>
              </div>
            </section>

            <!-- 2 · momenty: co zapisałeś w aplikacji -->
            <section class="sec" aria-labelledby="sec-moments">
              <header class="sec__head">
                <small id="sec-moments" class="eyebrow" title="Zapisy z praktyki „Momenty”: która część przejęła ster, poprzedni tydzień obok tego.">Momenty</small>
              </header>
              <div class="sec__grid sec__grid--moments">
                <div class="sec__chart">
                  <WeekPartsChart :stats="r.stats.value" :backfilled="backfilledByWeek" :first-week="weekNo - 1" />
                  <div class="links">
                    <button type="button" class="blk__link blk__link--details" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">{{ detailsOpen ? 'Mniej' : 'Szczegóły' }}</button>
                    <button type="button" class="blk__link" :disabled="patternLoading" @click="requestPattern">
                      <AppIcon name="auto_awesome" />{{ patternLoading ? 'Chwila…' : 'Zaproponuj wzorzec tygodnia' }}
                    </button>
                  </div>
                </div>
                <div class="unlogged">
                  <span class="unlogged__q">Były momenty, których nie zapisałeś?</span>
                  <div class="chips" role="group" aria-label="Były momenty, których nie zapisałeś?">
                    <button type="button" class="chip" :aria-pressed="r.bucket.value === 'none'" :disabled="r.backfills.value.length > 0" @click="r.setBucket('none')">żaden</button>
                    <button type="button" class="chip" :class="{ 'is-active': backfillOpen }" :disabled="!r.canBackfill.value" :title="r.canBackfill.value ? '' : `najwyżej ${BACKFILL_LIMIT} — te, które pamiętasz najlepiej`" @click="openBackfill">
                      <AppIcon name="add" />Dopisz
                    </button>
                    <template v-if="bucketOpen || (r.bucket.value && r.bucket.value !== 'none')">
                      <span class="chips__sep">≈</span>
                      <button v-for="id in BUCKETS" :key="id" type="button" class="chip" :aria-pressed="r.bucket.value === id" @click="chooseBucket(id)">{{ bucketLabel[id] }}</button>
                    </template>
                    <button v-else type="button" class="chip chip--ghost" @click="bucketOpen = true">więcej, bez szczegółów</button>
                  </div>

                  <ul v-if="r.backfills.value.length" class="added">
                    <li v-for="item in r.backfills.value" :key="item.id">
                      <i :style="{ '--part': PART_COLOR[item.part] }" />
                      <span><b>{{ dayLetter(item.day) }}</b> · {{ PART_LABEL[item.part] }} · {{ item.response.map(responseLabel).join(', ').toLowerCase() }}</span>
                      <small>dopisany</small>
                      <button type="button" class="chip chip--ghost" aria-label="Usuń dopisany moment" @click="r.removeBackfill(item.id)"><AppIcon name="close" /></button>
                    </li>
                  </ul>

                  <form v-if="backfillOpen" class="bf" @submit.prevent="saveBackfill">
                    <div class="bf__row">
                      <small class="bf__label">Który dzień</small>
                      <div class="wells" role="radiogroup" aria-label="Dzień">
                        <button v-for="day in days" :key="day" type="button" class="well well--sm" :class="{ 'well--current': form.day === day }" role="radio" :aria-checked="form.day === day" @click="form.day = day"><b>{{ dayLetter(day) }}</b></button>
                      </div>
                    </div>
                    <div class="bf__row">
                      <small class="bf__label">Która część przejęła ster</small>
                      <div class="chips" role="radiogroup" aria-label="Część">
                        <button v-for="part in PART_CHOICES" :key="part" type="button" class="chip chip--part" :style="{ '--part': PART_COLOR[part] }" role="radio" :aria-checked="form.part === part" @click="form.part = part"><i />{{ part === 'none' ? 'Żadna, zostałem przy sobie' : PART_LABEL[part] }}</button>
                      </div>
                    </div>
                    <div class="bf__row">
                      <small class="bf__label">Co zrobiłeś zamiast <em>(opcjonalnie)</em></small>
                      <div class="chips" role="group" aria-label="Co zrobiłeś zamiast">
                        <button v-for="key in BACKFILL_RESPONSES" :key="key" type="button" class="chip" :aria-pressed="form.response.includes(key)" @click="toggleResponse(key)">{{ responseLabel(key) }}</button>
                      </div>
                    </div>
                    <div class="bf__foot">
                      <button type="submit" class="chip chip--primary" :disabled="!formReady">Dopisz</button>
                      <button type="button" class="chip chip--ghost" @click="backfillOpen = false">Zostaw</button>
                      <small>zapisze się jako „zauważony dopiero teraz”</small>
                    </div>
                  </form>
                </div>
              </div>
              <div v-if="detailsOpen" class="details">
                <ul v-if="r.weekEntries.value.length" class="moments">
                  <li v-for="entry in r.weekEntries.value" :key="entry.id">
                    <b>{{ dayLetter(dayOf(entry)) }}</b>
                    <i :style="{ '--part': PART_COLOR[partOf(entry)] }" />
                    <span class="moments__copy">
                      <span>{{ PART_LABEL[partOf(entry)] }}<template v-if="entry.responses.situation"> · {{ entry.responses.situation }}</template></span>
                      <small>{{ responsesOf(entry).map(responseLabel).join(' · ') }}<template v-if="isBackfilled(entry)"> · <em>dopisany</em></template></small>
                    </span>
                  </li>
                </ul>
                <p v-else class="details__quiet">Cichy tydzień w zapisie.</p>
                <table class="numbers">
                  <thead>
                    <tr><th></th><th v-for="part in PART_CHOICES" :key="part">{{ part === 'none' ? 'Ja' : PART_LABEL[part] }}</th><th>bez zapisu</th><th>odpowiedź</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(week, i) in r.stats.value" :key="week.weekRef">
                      <th>T{{ weekNo - 1 + i }}</th>
                      <td v-for="part in PART_CHOICES" :key="part">{{ week.byPart[part] || '·' }}</td>
                      <td>{{ week.unlogged ?? '—' }}</td>
                      <td>{{ week.responded }} / {{ week.total }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="pattern" class="proposal"><small>Propozycja</small>{{ pattern }}</p>
            </section>

            <!-- 3 · ten tydzień na ścieżce: faza i jej kroki -->
            <section class="sec" aria-labelledby="sec-week">
              <header class="sec__head">
                <small id="sec-week" class="eyebrow" :title="phaseWhy">Tydzień {{ weekNo }} · {{ phaseTitle }}</small>
              </header>
              <div class="sec__grid">
                <div class="rate">
                  <span class="rate__q" title="Ocena z pamięci całego tygodnia, nie pojedynczego momentu.">Jak bardzo wstyd wpływał na ten tydzień?</span>
                  <div class="rate__scale" role="radiogroup" aria-label="Jak bardzo wstyd wpływał na ten tydzień?">
                    <button v-for="n in 5" :key="n" type="button" role="radio" :aria-checked="r.answers.severity === n" :class="{ filled: r.answers.severity === n, ghost: r.answers.severity === null && n === r.previousSeverity }" @click="r.answers.severity = r.answers.severity === n ? null : n">{{ n }}</button>
                  </div>
                  <div class="rate__ends"><span>wcale</span><span class="rate__hint">{{ severityHint }}</span><span>bardzo</span></div>
                </div>
                <label class="field">
                  <span>{{ phaseQuestion }}</span>
                  <textarea v-model="r.answers.phase" rows="2" />
                </label>
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>

    <!-- 02 · audyt -->
    <section v-if="!standalone" class="pwr__block">
      <header class="pwr__block-head">
        <span class="lab-eyebrow">02 · Co jest teraz i co proponuję zamiast</span>
        <h2>Pięć miejsc z kroku „Ścieżka”</h2>
      </header>
      <figure class="pwr__figure">
        <img :src="stepCurrent" alt="Obecnie: krok Ścieżka w refleksji tygodnia (zrzut usera, 11.10.2026)" />
        <figcaption>Obecnie (zrzut usera): zadanie z „0 z 2”, słupek T2 na pół karty, pusty T3 mimo „3–5”, przycisk AI na środku, pola i skala od krawędzi do krawędzi.</figcaption>
      </figure>
      <ul class="audit">
        <li v-for="item in audit" :key="item.id">
          <span class="audit__id">{{ item.id }}</span>
          <div class="audit__copy">
            <strong>{{ item.where }}</strong>
            <p><b>Obecnie.</b> {{ item.now }}</p>
            <p><b>Propozycja.</b> {{ item.next }}</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- 02b · reguły zaliczania -->
    <section v-if="!standalone" class="pwr__block">
      <header class="pwr__block-head">
        <span class="lab-eyebrow">02b · Zadanie ↔ odpowiedź w Momencie</span>
        <h2>Kiedy Moment liczy dzień zadania</h2>
      </header>
      <p class="pwr__lead">
        Dziś każdy Moment liczy dzień każdego zadania z <code>linkSlug: 'moment-shame'</code>. Propozycja: reguła per zadanie oparta na odpowiedzi
        „Co zrobiłeś — zamiast albo zaraz po?”, a tam, gdzie żadna odpowiedź nie pasuje, cztery nowe pozycje:
        <template v-for="(option, i) in proposedOptions" :key="option.key"><b>{{ option.label }}</b><template v-if="i < proposedOptions.length - 1">, </template></template>.
        Nic się nie zmienia w Planie Dnia: odhaczenie dnia ręcznie dalej działa.
      </p>
      <table class="rules">
        <thead>
          <tr><th>Zadanie</th><th>Liczy dzień, gdy Moment ma</th><th>Nowa odpowiedź</th><th>Dziś</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in ruleRows" :key="row.key" :class="{ 'is-scene': row.key === taskKey }">
            <td>{{ row.title }}</td>
            <td>{{ row.rule }}</td>
            <td>{{ row.proposed || '—' }}</td>
            <td>{{ row.today }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 03 · decyzje -->
    <section v-if="!standalone" class="pwr__block">
      <header class="pwr__block-head">
        <span class="lab-eyebrow">03 · Decyzje projektowe</span>
        <h2>Do oceny</h2>
      </header>
      <ul class="pwr__decisions">
        <li v-for="d in decisions" :key="d.id">
          <span class="pwr__decision-id">{{ d.id }}</span>
          <div><strong>{{ d.title }}</strong><p>{{ d.body }}</p></div>
        </li>
      </ul>
    </section>

    <p v-if="notice" class="pwr__notice" role="status">
      {{ notice }}<button type="button" class="chip chip--ghost" aria-label="Zamknij komunikat" @click="notice = ''"><AppIcon name="close" /></button>
    </p>
  </section>
</template>

<style scoped>
/* ── Lab chrome ── */
.pwr { min-width: 0; padding-bottom: 40px; color: var(--mg-color-ink); }
.pwr__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 18px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.pwr__select { display: inline-flex; align-items: center; gap: 8px; color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.pwr__select select { min-height: 34px; max-width: 26rem; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-ink); font: inherit; font-size: 12px; letter-spacing: 0; text-transform: none; }
.pwr__check { cursor: pointer; }
.pwr__reset { min-height: 34px; margin-left: auto; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.pwr__reset--tight { margin-left: 0; }
.pwr--standalone { width: auto; min-height: 100vh; padding: 28px 32px 48px 104px; background: var(--qr-page); }
.pwr--standalone .pwr__stage { padding: 0; border: 0; border-radius: 0; background: transparent; }
.pwr__stage { padding: 24px 22px 30px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--qr-page); }
.pwr__block { margin-top: 30px; }
.pwr__block-head { margin-bottom: 14px; }
.pwr__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }
.pwr__lead { max-width: 90ch; margin: 0 0 14px; color: var(--mg-color-muted); font-size: 12px; line-height: 1.55; }
.pwr__lead b { color: var(--mg-color-ink); }
.pwr__lead code { font-size: 11px; }
.pwr__figure { max-width: 980px; margin: 0 0 14px; }
.pwr__figure img { display: block; width: 100%; height: auto; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); }
.pwr__figure figcaption { margin-top: 6px; color: var(--mg-color-muted); font-size: 11px; line-height: 1.5; }
.audit { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.audit li { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 14px; align-items: start; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.audit__id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.audit__copy strong { display: block; font-size: 13px; }
.audit__copy p { margin: 6px 0 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.audit__copy b { color: var(--mg-color-ink); }
.rules { width: 100%; border-collapse: collapse; font-size: 12px; }
.rules th, .rules td { padding: 8px 10px; border-bottom: 1px solid var(--mg-color-border); text-align: left; vertical-align: top; line-height: 1.4; }
.rules th { color: var(--mg-color-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.rules tr.is-scene td { background: var(--mg-color-mist); font-weight: 700; }
.pwr__decisions { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pwr__decisions li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.pwr__decision-id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.pwr__decisions strong { display: block; font-size: 13px; }
.pwr__decisions p { margin: 4px 0 0; color: var(--mg-color-muted); font-size: 12px; line-height: 1.5; }
.pwr__notice { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; gap: 10px; width: fit-content; max-width: 60ch; margin: 18px auto 0; padding: 10px 12px 10px 16px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); font-size: 12px; line-height: 1.45; }

/* ── the quiet ritual page (tokens as in the product's quiet-ritual.css) ── */
.quiet-ritual {
  --qr-page: color-mix(in srgb, rgb(var(--sky-200)) 45%, rgb(var(--sky-100)));
  --qr-card: rgb(var(--sky-100));
  --qr-field: color-mix(in srgb, white 45%, rgb(var(--sky-100)));
  --qr-inner: color-mix(in srgb, white 80%, rgb(var(--sky-100)));
  --qr-ink: rgb(var(--sky-800));
  --qr-muted: rgb(var(--sky-700));
  --qr-accent: rgb(var(--color-primary));
  --qr-accent-strong: rgb(var(--color-primary-strong));
  max-width: 1180px;
  margin: 0 auto;
  color: var(--qr-ink);
  font-family: var(--mg-font-sans);
}
.pwr { --qr-page: color-mix(in srgb, rgb(var(--sky-200)) 45%, rgb(var(--sky-100))); }
.pwr--standalone .quiet-ritual { max-width: 1120px; }
/* the product's card (quiet-ritual.css .qr-card: 1120 px, 36/42 px padding) — own class so the global rules do not fight the replica */
.pwr-card { max-width: 1120px; margin: 0 auto; padding: 36px 42px 30px; border: 1px solid var(--mg-color-border); border-radius: 34px 29px 36px 28px; background: var(--qr-card); box-shadow: var(--mg-shadow-raised); }
.pwr-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 30px; }
.pwr-heading h1 { margin: 0; font-size: clamp(24px, 2.3vw, 30px); font-weight: 750; letter-spacing: -0.025em; line-height: 1.3; }
.pwr-count { color: var(--qr-muted); font-size: 13px; white-space: nowrap; }

/* ── the path block: a field on the card; inside it, paper ── */
.blk { display: grid; gap: 12px; width: min(100%, 46rem); margin: 0 auto; padding: 16px 18px 18px; border-radius: 19px 22px 16px 21px; background: var(--qr-field); }
.blk__head { display: flex; align-items: center; gap: 8px; font-size: 15px; }
.blk__icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: var(--mg-radius-icon-field-a); background: var(--mg-color-sky-well); color: var(--qr-accent-strong); }
.blk__icon :deep(.app-icon) { font-size: 18px; }
.blk__phase { color: var(--qr-muted); }
.blk__link { display: inline-flex; align-items: center; gap: 6px; margin-left: 12px; padding: 4px 0; border: 0; background: none; color: var(--qr-accent-strong); font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.blk__link:hover { text-decoration: underline; }
.blk__link:disabled { opacity: 0.6; cursor: default; }
.blk__link :deep(.app-icon) { font-size: 16px; }
.blk__link--details { margin: 2px 0 0; width: fit-content; }
.blk__grid { display: grid; grid-template-columns: minmax(19rem, 0.9fr) minmax(0, 1.1fr); gap: 20px 28px; align-items: start; }
/* three sections, one tone deeper than the block; inside them the inner tone */
.sec { --qr-section: color-mix(in srgb, white 62%, rgb(var(--sky-100))); display: grid; gap: 8px; padding: 12px 14px 14px; border-radius: 14px 17px 13px 16px; background: var(--qr-section); }
.sec__head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; align-items: baseline; }
.sec__head .eyebrow { flex: 0 0 auto; }
.sec__lead { grid-column: 1; max-width: 70ch; color: var(--qr-muted); font-size: 12px; line-height: 1.45; }
.sec__head .blk__link { grid-column: 2; grid-row: 1 / span 2; align-self: start; margin: 0; }
.sec__grid { display: grid; gap: 10px; }
.sec__grid--moments { gap: 8px; }
.sec__chart { display: grid; gap: 6px; }
.links { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 18px; }
.links .blk__link { margin: 0; }
.sec__answers { display: grid; gap: 10px; }
.sec__quiet { margin: 0; color: var(--qr-muted); font-size: 13px; }
.stay small { color: var(--qr-muted); font-size: 12px; }
.eyebrow { display: block; color: var(--qr-accent-strong); font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }

.facts { display: grid; gap: 16px; min-width: 0; }
.facts__sec { display: grid; gap: 10px; }
.task { display: grid; gap: 3px; padding: 10px 12px 11px; border-radius: 12px 15px 11px 14px; background: var(--qr-inner); }
.task--muted { color: var(--qr-muted); font-size: 13px; }
.task__row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start; }
.task__title { font-size: 14px; font-weight: 700; line-height: 1.35; }
.task__note { display: none; gap: 1px; margin: 0; color: var(--qr-muted); font-size: 12px; line-height: 1.45; }
.task:hover .task__note, .task:focus-within .task__note, .task:focus .task__note { display: grid; }
.task { outline: none; }
.task:focus-visible { box-shadow: var(--mg-focus-ring); }
.task__note--empty { font-style: italic; }
.task__bridge { margin: 2px 0 0; padding-top: 6px; border-top: 1px dashed color-mix(in srgb, var(--qr-muted) 35%, transparent); color: var(--qr-muted); font-size: 11px; }
.task__bridge b { color: var(--mg-color-error, rgb(var(--rose-600))); }

/* the well / disc as in the path view (Today's rating disc) */
.well { position: relative; display: grid; place-items: center; flex: 0 0 auto; width: var(--well, 1.85rem); height: var(--well, 1.85rem); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-a); background: var(--mg-color-canvas); box-shadow: var(--mg-shadow-inset-sm); color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); font-weight: 800; font-style: normal; cursor: default; }
.well--sm { --well: 1.5rem; font-size: 10px; cursor: pointer; }
.well--sm b { font-size: 10px; }
.well--done { border-color: transparent; background: var(--mg-color-sky-field); }
.well--done::after { width: 62%; aspect-ratio: 1; border-radius: var(--mg-radius-organic-c); background: var(--mg-color-state); content: ''; transform: rotate(-2deg); }
.well--current { border-color: var(--mg-color-primary); color: var(--mg-color-primary-strong); box-shadow: var(--mg-shadow-inset-sm), 0 0 0 3px var(--mg-color-primary-soft); }
.wells { display: inline-flex; gap: 4px; }
.disc { --well: 2.1rem; }
.disc--meter { background: linear-gradient(to right, color-mix(in srgb, var(--mg-color-primary) 34%, var(--mg-color-paper)) var(--fill, 0%), var(--mg-color-canvas) var(--fill, 0%)); color: var(--mg-color-primary-strong); }
.disc b { font-size: 11px; line-height: 1; }
.disc b i { font-size: 9px; font-style: normal; font-weight: 700; opacity: 0.75; }
.disc.well--done b { display: none; }

/* unlogged + backfill */
.unlogged { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.unlogged__q { color: var(--qr-muted); font-size: 13px; }
.unlogged > .added, .unlogged > .bf { flex: 1 1 100%; }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.chips__sep { color: var(--qr-muted); font-size: 12px; font-weight: 800; }
.chip { display: inline-flex; align-items: center; gap: 5px; min-height: 1.95rem; padding: 3px 12px; border: 1px solid transparent; border-radius: 12px; background: var(--qr-inner); color: var(--qr-ink); font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.chip :deep(.app-icon) { font-size: 15px; }
.chip:hover:not(:disabled), .chip.is-active { background: var(--qr-card); }
.chip[aria-pressed='true'], .chip[aria-checked='true'], .chip[aria-pressed='true']:hover, .chip[aria-checked='true']:hover { background: var(--qr-accent-strong); color: white; }
.chip:disabled { opacity: 0.5; cursor: default; }
.chip--primary { background: var(--qr-accent-strong); color: white; }
.chip--primary:hover:not(:disabled) { background: var(--qr-accent); }
.chip--ghost { background: transparent; color: var(--qr-muted); }
.chip--part i { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: var(--mg-radius-organic-a); background: var(--part); box-shadow: inset 0 0 0 1px color-mix(in srgb, rgb(var(--sky-800)) 38%, transparent); }
.chip--part[aria-checked='true'] i { box-shadow: inset 0 0 0 1px white; }
.added { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.added li { display: inline-flex; gap: 8px; align-items: center; width: fit-content; max-width: 100%; min-height: 1.6rem; padding: 0 4px 0 8px; font-size: 12px; }
.added li i { display: block; width: 0.6rem; height: 0.6rem; border-radius: var(--mg-radius-organic-b); background: var(--part); box-shadow: inset 0 0 0 1px color-mix(in srgb, rgb(var(--sky-800)) 38%, transparent); }
.added li small { color: var(--qr-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.added .chip--ghost { min-height: 1.5rem; padding: 0 4px; }
.bf { display: grid; gap: 10px; padding: 12px 14px; border-radius: 12px 15px 11px 14px; background: var(--qr-inner); }
.bf__row { display: grid; gap: 6px; }
.bf__label { color: var(--qr-muted); font-size: 11px; font-weight: 800; }
.bf__label em { font-style: normal; font-weight: 600; }
.bf .chip { background: var(--qr-field); }
.bf .chip:hover:not(:disabled) { background: var(--qr-card); }
.bf .chip[aria-pressed='true'], .bf .chip[aria-checked='true'], .bf .chip[aria-pressed='true']:hover, .bf .chip[aria-checked='true']:hover, .bf .chip--primary { background: var(--qr-accent-strong); color: white; }
.bf__foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.bf__foot small { color: var(--qr-muted); font-size: 11px; }

/* details */
.details { display: grid; gap: 10px; padding: 10px 12px; border-radius: 12px 15px 11px 14px; background: var(--qr-inner); }
.details__quiet { margin: 0; color: var(--qr-muted); font-size: 12px; }
.moments { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.moments li { display: grid; grid-template-columns: 1.6rem auto minmax(0, 1fr); gap: 8px; align-items: start; font-size: 12px; line-height: 1.4; }
.moments li > b { color: var(--qr-muted); font-size: 11px; }
.moments li i { display: block; width: 0.6rem; height: 0.6rem; margin-top: 0.3rem; border-radius: var(--mg-radius-organic-a); background: var(--part); box-shadow: inset 0 0 0 1px color-mix(in srgb, rgb(var(--sky-800)) 38%, transparent); }
.moments__copy { display: grid; gap: 1px; }
.moments__copy small { color: var(--qr-muted); font-size: 11px; }
.moments__copy em { font-style: normal; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; font-size: 10px; }
.numbers { border-collapse: collapse; font-size: 11px; }
.numbers th, .numbers td { padding: 3px 8px; text-align: right; color: var(--qr-muted); font-variant-numeric: tabular-nums; }
.numbers thead th { font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.numbers tbody th { text-align: left; color: var(--qr-ink); }
.numbers td { color: var(--qr-ink); }
.proposal { display: grid; gap: 2px; margin: 0; padding: 10px 14px; border-radius: 12px 15px 11px 14px; background: var(--qr-inner); font-size: 13px; line-height: 1.5; }
.proposal small { color: var(--qr-muted); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }

/* answers */
.answers { display: grid; gap: 18px; min-width: 0; }
.field { display: grid; gap: 6px; color: var(--qr-muted); font-size: 13px; }
.field textarea { width: 100%; min-height: 3.9rem; padding: 10px 12px; border: 1px solid transparent; border-radius: 12px 15px 11px 14px; background: var(--qr-inner); color: var(--qr-ink); font: inherit; font-size: 13px; line-height: 1.5; resize: vertical; }
.field textarea:focus-visible { outline: none; border-color: rgb(var(--sky-500) / 0.55); }
.rate { display: grid; grid-template-columns: auto auto; justify-content: start; align-items: center; gap: 4px 18px; }
.rate__q { color: var(--qr-ink); font-size: 14px; font-weight: 700; }
.rate__scale { grid-column: 2; }
.rate__ends { grid-column: 2; }
.rate__scale { display: flex; gap: 8px; }
.rate__scale button { width: 40px; height: 36px; border: 0; border-radius: 12px; background: var(--qr-inner); color: var(--qr-ink); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.rate__scale button:hover { background: var(--qr-card); }
.rate__scale button.ghost { border: 1px dashed var(--qr-muted); }
.rate__scale button.filled { background: var(--qr-accent-strong); color: white; }
.rate__ends { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; width: calc(5 * 40px + 4 * 8px); color: var(--qr-muted); font-size: 11px; }
.rate__hint { text-align: center; }
.stay { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.chip--quiet { min-height: 1.7rem; padding: 2px 10px; background: transparent; color: var(--qr-muted); font-size: 12px; }
.chip--quiet:hover:not(:disabled) { background: var(--qr-inner); color: var(--qr-ink); }
.switch { position: relative; width: 38px; height: 22px; padding: 0; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--qr-muted) 35%, var(--qr-inner)); cursor: pointer; transition: background 160ms ease; }
.switch::after { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; content: ''; transition: transform 160ms ease; }
.switch[aria-checked='true'] { background: var(--qr-accent-strong); }
.switch[aria-checked='true']::after { transform: translateX(16px); }

@media (max-width: 900px) {
  .blk__grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
