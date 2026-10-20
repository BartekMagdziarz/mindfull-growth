<template>
  <section class="scenario-page concept-page tt mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · Dzisiaj · „Najbliżej” i „Ścieżki” · runda 2</span>
        <h1>Mniej na wierzchu: ćwiczenia dnia idą do planu dnia, ścieżki pokazują postęp</h1>
        <p>
          Runda 1 zamieniła wiersze na kafle, ale wciąż za dużo się działo. Runda 2 odejmuje: kafle „Najbliżej” to sam tytuł
          i stan, bez dat pod spodem; powtórki i kroki ścieżek przypadające na dziś stają się zwykłymi wierszami planu dnia po
          lewej (pole „Powtórki” znika); pole „Ścieżki” pokazuje postęp każdej ścieżki i otwiera jej widok, a opis pojawia się
          dopiero po najechaniu i po rozwinięciu. Stan sceny żyje w pamięci strony.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 2</span>
    </header>

    <!-- 01 · Stan obecny -->
    <section class="tt__block">
      <header class="tt__block-head">
        <span class="lab-eyebrow">01 · Stan obecny</span>
        <h2>Wiersze na całą szerokość, dopiski i rezerwy miejsca</h2>
      </header>
      <div class="tt__evidence">
        <nav class="tt__findings" aria-label="Znaleziska">
          <button v-for="finding in findings" :key="finding.id" type="button" :class="{ active: activeFinding.id === finding.id }" @click="findingId = finding.id">
            <span class="tt__finding-index">{{ finding.id }}</span>
            <span><strong>{{ finding.title }}</strong><small>{{ finding.where }}</small></span>
          </button>
        </nav>
        <figure class="tt__shot">
          <div class="tt__shot-frame">
            <img src="/research/current/today/right-column-2026-10-11.png" alt="Prawa kolumna widoku Dzisiaj na instancji verify, 11 października 2026: Kompas, Najbliżej, Powtórki, Ścieżki" />
          </div>
          <figcaption>
            <strong>{{ activeFinding.title }}</strong>
            <p>{{ activeFinding.body }}</p>
            <p class="tt__fix"><AppIcon name="arrow_forward" /> {{ activeFinding.fix }}</p>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 02 · Scena -->
    <section class="tt__block">
      <header class="tt__block-head">
        <span class="lab-eyebrow">02 · Propozycja · plan dnia i prawa kolumna</span>
        <h2>Ćwiczenia dnia w planie dnia, postęp ścieżek po prawej, w „Najbliżej” tylko tytuł i stan</h2>
      </header>

      <div class="tt__toolbar neo-card" aria-label="Scenariusz sceny">
        <label>Dzień
          <select v-model="sampleId">
            <option value="typical">Zwykła niedziela · refleksja dziś, jedna ścieżka</option>
            <option value="heavy">Dzień z zaległościami · dwa cele po terminie, dwie ścieżki</option>
            <option value="calm">Spokojny dzień · nic pilnego, krok we wtorek, list od Ciebie</option>
          </select>
        </label>
        <label>Ćwiczenia dnia
          <select v-model="placement">
            <option value="list">W planie dnia · grupa „Praktyki” (runda 2)</option>
            <option value="column">W prawej kolumnie · kafle Powtórek i kroków (runda 1, opis na hover)</option>
          </select>
        </label>
        <label>Ton kafli
          <select v-model="tone">
            <option value="mist">Mist na karcie · jak Praktyki w widoku ścieżki</option>
            <option value="paper">Papier z obrysem · jak kafle Kompasu</option>
          </select>
        </label>
        <label>Motyw
          <select :value="theme" @change="setTheme(($event.target as HTMLSelectElement).value)">
            <option v-for="item in themes" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label class="tt__check"><input v-model="icons" type="checkbox" /> Ikony w kaflach „Najbliżej”</label>
        <label class="tt__check"><input v-model="showKompas" type="checkbox" /> Pokaż Kompas (sąsiad)</label>
        <button class="tt__reset" type="button" @click="resetAll">Przywróć przykład</button>
      </div>

      <div class="tt__stage">
        <!-- Left: the day plan, abbreviated to the groups that matter here. -->
        <section class="mg-v2-surface mg-v2-surface--raised-sm tt-list" aria-label="Plan dnia (replika skrócona)">
          <header class="tt-list__heading"><span>Plan dnia</span><small>niedziela, 11 października</small></header>
          <section v-for="group in dayGroups" :key="group.id" class="tt-list__group" :class="{ 'tt-list__group--new': group.isNew }">
            <header><span>{{ group.label }}</span><small v-if="group.isNew">nowa grupa</small></header>
            <div v-for="row in group.rows" :key="row.id" class="tt-row" :class="{ 'is-done': done.has(row.id), 'is-overdue': row.overdue }">
              <span class="tt-row__lead" aria-hidden="true"><AppIcon :name="row.icon" /></span>
              <div class="tt-row__title">
                <button type="button" class="tt-row__label" @click="note(`Rozwiń wiersz: ${row.title}`)">
                  <strong>{{ row.title }}</strong>
                  <small v-if="row.overdue && !done.has(row.id)" class="tt-row__late">zaległe</small>
                </button>
                <span v-if="row.exercise" class="tt-row__tray" role="group" :aria-label="`Przełóż: ${row.title}`" @click.stop>
                  <button type="button" title="Przenieś na jutro" @click="dismiss(row.id, 'Na jutro')"><AppIcon name="redo" /></button>
                  <button type="button" title="Wybierz datę…" @click="note(`Wybierz datę: ${row.title}`)"><AppIcon name="edit_calendar" /></button>
                  <button type="button" title="Pomiń" @click="dismiss(row.id, 'Pominięte')"><AppIcon name="close" /></button>
                </span>
              </div>
              <!-- Exercise rows: the well launches the exercise; the finished exercise fills it. -->
              <button
                v-if="row.exercise"
                type="button"
                class="mg-well tt-row__well tt-row__well--launch"
                :class="{ 'mg-well--done': done.has(row.id) }"
                :title="done.has(row.id) ? 'Zrobione · kliknij, by cofnąć' : 'Rozpocznij'"
                @click="toggleDone(row.id, row.title)"
              >
                <AppIcon v-if="!done.has(row.id)" name="play_arrow" />
              </button>
              <button v-else type="button" class="mg-well tt-row__well" :class="{ 'mg-well--done': done.has(row.id) }" :title="done.has(row.id) ? 'Zrobione' : 'Oznacz'" @click="toggleDone(row.id, row.title)">
                <b v-if="row.reading && !done.has(row.id)">{{ row.reading }}</b>
              </button>
            </div>
          </section>
        </section>

        <!-- Right: the context column. -->
        <div class="tt-column" :class="[`tt-column--${tone}`, `tt-column--${placement}`, { 'tt-column--icons': icons }]">
          <section v-if="showKompas" class="mg-v2-surface mg-v2-surface--raised-sm tt-card tt-kompas" aria-label="Kompas (bez zmian)">
            <header class="tt-card__head"><span>Kompas</span><small>bez zmian</small></header>
            <div class="tt-kompas__tiles">
              <button v-for="tile in KOMPAS" :key="tile.title" type="button" class="tt-kompas__tile" :class="tile.tone ? `tone-${tile.tone}` : ''" @click="note(`Kompas: ${tile.title}`)">
                <span class="tt-kompas__icon"><AppIcon :name="tile.icon" /></span>
                <small>{{ tile.title }}</small>
              </button>
            </div>
          </section>

          <!-- Najbliżej: title + state, nothing else on the surface. -->
          <section class="mg-v2-surface mg-v2-surface--raised-sm tt-card" aria-label="Najbliżej">
            <header class="tt-card__head">
              <span>Najbliżej</span>
              <span class="tt-card__links">
                <button v-if="hiddenCount > 0 || moreOpen" type="button" class="tt-link" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
                  {{ moreOpen ? 'Zwiń' : `Jeszcze ${hiddenCount}` }}
                </button>
                <button v-if="sample.past.length" type="button" class="tt-link" :class="{ 'is-active': pastOpen }" :aria-expanded="pastOpen" @click="pastOpen = !pastOpen">
                  Minione ({{ sample.past.length }})
                </button>
              </span>
            </header>
            <div v-if="visibleUpcoming.length" class="tt-grid">
              <article
                v-for="entry in visibleUpcoming"
                :key="entry.id"
                class="tt-tile tt-tile--compact"
                :class="{ 'tt-tile--today': entry.bucket === 'today', 'tt-tile--overdue': entry.bucket === 'overdue' }"
                :title="entry.context"
              >
                <header class="tt-tile__head">
                  <button type="button" class="tt-tile__open" @click="note(`Otwórz: ${entry.title}`)"><span v-if="icons" class="tt-tile__icon"><AppIcon :name="entry.icon" /></span><strong class="tt-tile__title">{{ entry.title }}</strong></button>
                  <span class="tt-tile__mark" :class="{ 'is-rose': entry.bucket === 'overdue' }">{{ entry.when }}</span>
                </header>
                <footer v-if="entry.closable" class="tt-tile__foot">
                  <button type="button" class="tt-chip" @click="note(`Podsumuj cel: ${entry.title}`)">Podsumuj</button>
                  <button type="button" class="tt-chip" @click="note(`Przesuń termin: ${entry.title}`)">Przesuń termin</button>
                </footer>
              </article>
            </div>
            <p v-else class="tt-empty">Nic pilnego</p>
            <div v-if="pastOpen && sample.past.length" class="tt-grid tt-grid--past">
              <article v-for="entry in sample.past" :key="entry.id" class="tt-tile tt-tile--compact tt-tile--done" :title="entry.context">
                <header class="tt-tile__head">
                  <button type="button" class="tt-tile__open" @click="note(`Otwórz: ${entry.title}`)"><span v-if="icons" class="tt-tile__icon"><AppIcon :name="entry.icon" /></span><strong class="tt-tile__title">{{ entry.title }}</strong></button>
                  <i class="mg-well tt-well mg-well--done" :title="entry.when" />
                </header>
              </article>
            </div>
          </section>

          <!-- Round 1 for comparison: repeats as tiles, with the sentence on hover only. -->
          <section v-if="placement === 'column' && repeats.length" class="mg-v2-surface mg-v2-surface--raised-sm tt-card" aria-label="Powtórki">
            <header class="tt-card__head"><span>Powtórki</span></header>
            <div class="tt-grid">
              <article v-for="tile in repeats" :key="tile.id" class="tt-tile tt-tile--hover" :class="{ 'tt-tile--today': tile.today, 'tt-tile--overdue': tile.overdue }">
                <header class="tt-tile__head">
                  <span class="tt-tile__lead"><span class="tt-tile__icon"><AppIcon :name="tile.icon" /></span><strong class="tt-tile__title">{{ tile.title }}</strong></span>
                  <span class="tt-tile__mark" :class="{ 'is-rose': tile.overdue }">{{ tile.when }}</span>
                </header>
                <p class="tt-tile__what tt-tile__what--hover">{{ tile.what }}</p>
                <footer class="tt-tile__foot">
                  <button type="button" class="tt-chip" @click="note(`Otwórz: ${tile.title}`)">Otwórz</button>
                  <span class="tt-tile__tray" role="group" :aria-label="`Przełóż: ${tile.title}`">
                    <button type="button" title="Przenieś na jutro" @click="dismiss(tile.id, 'Na jutro')"><AppIcon name="redo" /></button>
                    <button type="button" title="Wybierz datę…" @click="note(`Wybierz datę: ${tile.title}`)"><AppIcon name="edit_calendar" /></button>
                    <button type="button" title="Pomiń" @click="dismiss(tile.id, 'Pominięte')"><AppIcon name="close" /></button>
                  </span>
                </footer>
              </article>
            </div>
          </section>

          <!-- Ścieżki: progress per path, the tile opens the path view; a sentence on hover, more after expanding. -->
          <section v-if="sample.paths.length" class="mg-v2-surface mg-v2-surface--raised-sm tt-card" aria-label="Ścieżki">
            <header class="tt-card__head"><span>Ścieżki</span></header>
            <div class="tt-grid tt-grid--paths">
              <article
                v-for="path in sample.paths"
                :key="path.id"
                class="tt-tile tt-path"
                :class="{ 'tt-path--open': openPath === path.id, 'tt-tile--today': placement === 'column' && path.step.today && !doneSteps.has(path.id) }"
              >
                <header class="tt-tile__head">
                  <button type="button" class="tt-tile__open tt-path__toggle" :aria-expanded="openPath === path.id" @click="togglePath(path)"><span class="tt-tile__lead"><span class="tt-tile__icon"><AppIcon :name="path.icon" /></span><strong class="tt-tile__title">{{ path.title }}</strong></span>
                  </button>
                  <span class="tt-tile__mark">{{ path.unit }} {{ path.current }} z {{ path.total }}</span>
                </header>
                <!-- Progress: one mark per week (filled = done, ring = now); step-only paths get a meter disc instead. -->
                <div class="tt-path__progress" role="img" :aria-label="`${path.unit} ${path.current} z ${path.total}`">
                  <span v-if="path.unit === 'tydzień'" class="tt-marks">
                    <i v-for="n in path.total" :key="n" class="tt-mark" :class="{ 'tt-mark--done': n < path.current, 'tt-mark--current': n === path.current }" />
                  </span>
                  <i v-else class="mg-well tt-disc" :style="{ '--fill': `${Math.round((path.current / path.total) * 100)}%` }" />
                  <span class="tt-path__now tt-path__now--hover">{{ path.now }}</span>
                </div>

                <!-- Round 1 placement: the day's step and practices as tiles inside the path (sentence on hover). -->
                <div v-if="placement === 'column'" class="tt-path__items">
                  <article class="tt-tile tt-tile--hover tt-tile--inner" :class="{ 'tt-tile--today': path.step.today && !doneSteps.has(path.id), 'tt-tile--done': doneSteps.has(path.id) }">
                    <header class="tt-tile__head">
                      <span class="tt-tile__lead"><span class="tt-tile__icon"><AppIcon :name="path.step.icon" /></span><strong class="tt-tile__title">{{ path.step.title }}</strong></span>
                      <i v-if="doneSteps.has(path.id)" class="mg-well tt-well mg-well--done" title="zrobione dziś" />
                      <span v-else class="tt-tile__mark" :class="{ 'is-rose': path.step.overdue }">{{ path.step.when }}</span>
                    </header>
                    <p class="tt-tile__what tt-tile__what--hover">{{ path.step.what }}</p>
                    <footer class="tt-tile__foot">
                      <button v-if="!doneSteps.has(path.id)" type="button" class="tt-chip" :class="{ 'tt-chip--primary': path.step.today }" @click="startStep(path)">Rozpocznij</button>
                      <button v-else type="button" class="tt-link" @click="undoStep(path)">Cofnij</button>
                    </footer>
                  </article>
                  <article v-for="tile in livePractices(path)" :key="tile.id" class="tt-tile tt-tile--hover tt-tile--inner" :class="{ 'tt-tile--today': tile.today, 'tt-tile--overdue': tile.overdue }">
                    <header class="tt-tile__head">
                      <span class="tt-tile__lead"><span class="tt-tile__icon"><AppIcon :name="tile.icon" /></span><strong class="tt-tile__title">{{ tile.title }}</strong></span>
                      <span class="tt-tile__mark" :class="{ 'is-rose': tile.overdue }">{{ tile.when }}</span>
                    </header>
                    <p class="tt-tile__what tt-tile__what--hover">{{ tile.what }}</p>
                    <footer class="tt-tile__foot">
                      <button type="button" class="tt-chip" @click="note(`Otwórz praktykę: ${tile.title}`)">Otwórz</button>
                    </footer>
                  </article>
                </div>

                <!-- Expanded: the current step's "co", this week's practices, the standing actions and the way in. -->
                <div v-if="openPath === path.id" class="tt-path__more">
                  <p class="tt-path__step"><b>{{ doneSteps.has(path.id) ? 'Zrobione dziś' : 'Najbliższy krok' }} · {{ path.step.title }}</b> {{ path.step.what }}</p>
                  <p v-if="path.weekNote" class="tt-path__week">{{ path.weekNote }}</p>
                  <p v-if="path.letter" class="tt-path__week">List od Ciebie czeka {{ path.letter.until }} — {{ path.letter.what }}</p>
                  <div class="tt-quick">
                    <button v-for="quick in path.quick" :key="quick.id" type="button" class="tt-chip tt-chip--ghost" @click="note(`${quick.label}: ${path.title}`)">
                      <AppIcon :name="quick.icon" /><span>{{ quick.label }}</span>
                    </button>
                    <button type="button" class="tt-chip" @click="note(`Otwórz widok ścieżki: ${path.title}`)"><AppIcon name="route" /><span>Otwórz ścieżkę</span></button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      <aside class="tt__legend">
        <strong>Jak czytać scenę</strong>
        <ol>
          <li>Po lewej skrócony plan dnia (te same wiersze co w produkcie: ikona, tytuł, dysk po prawej, tacka na hover). Nowa grupa „Praktyki” zbiera powtórki oraz kroki i praktyki ścieżek przypadające na dziś lub zaległe. Dysk z trójkątem uruchamia ćwiczenie; po jego ukończeniu dysk wypełnia się jak przy nawyku (w Labie: klik).</li>
          <li>Po prawej „Najbliżej” to sam tytuł i stan („dziś”, „jutro”, „za 9 dni”, „po terminie”). Daty okresów zniknęły z powierzchni; dla celu planowany koniec jest w dymku tytułu. Cel po terminie zachowuje Podsumuj · Przesuń termin.</li>
          <li>„Ścieżki” = postęp: ikona, tytuł, osiem znaczników tygodni (zrobione wypełnione, bieżący z pierścieniem) i „tydzień 4 z 8”. Najedź: jedno zdanie, gdzie jesteś. Kliknij tytuł: rozwinięcie z najbliższym krokiem, notatką tygodnia, Zapisz moment · Mój plan i „Otwórz ścieżkę”. Ścieżka bez tygodni (lęk) ma dysk wypełnienia zamiast znaczników.</li>
          <li>Przełącz „Ćwiczenia dnia” na prawą kolumnę, by porównać z rundą 1 — tam kafle mają już opis tylko na hover.</li>
        </ol>
        <p v-if="lastNote" class="tt__note"><AppIcon name="touch_app" /> {{ lastNote }}</p>
      </aside>
    </section>

    <!-- 03 · Anatomia -->
    <section class="tt__block">
      <header class="tt__block-head">
        <span class="lab-eyebrow">03 · Anatomia</span>
        <h2>Co jest na wierzchu, co na hover, co po rozwinięciu</h2>
      </header>
      <table class="tt__table">
        <thead>
          <tr><th>Element</th><th>Na wierzchu</th><th>Stan (prawa krawędź)</th><th>Na hover</th><th>Po rozwinięciu / kliknięciu</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in anatomy" :key="row.field">
            <th>{{ row.field }}</th>
            <td>{{ row.surface }}</td>
            <td>{{ row.state }}</td>
            <td>{{ row.hover }}</td>
            <td>{{ row.more }}</td>
          </tr>
        </tbody>
      </table>
      <p class="tt__table-note">Znika z powierzchni: daty okresów i „Planowany koniec” pod tytułami, zdania opisu na kaflach, dopiski „krok 10” i „praktyka”, kreski, trójkąt szczegółów, osobna karta Powtórek. Etykiety „ten / następny / poprzedni tydzień” liczy już produkt względem tygodnia dzisiejszego dnia (dayViewModels.markerTitle) — na zrzucie z 11.10 (niedziela, ostatni dzień tygodnia) daje poprawnie „Podsumuj ten tydzień” i „Zaplanuj następny tydzień”.</p>
    </section>

    <!-- 04 · Decyzje -->
    <section class="tt__block">
      <header class="tt__block-head">
        <span class="lab-eyebrow">04 · Decyzje do podjęcia</span>
        <h2>Co ustalić przed wdrożeniem</h2>
      </header>
      <ul class="tt__decisions">
        <li v-for="decision in decisions" :key="decision.id">
          <span class="tt__decision-id">{{ decision.id }}</span>
          <div><strong>{{ decision.title }}</strong><p>{{ decision.body }}</p></div>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'

/**
 * Today's right column (2026-10-11). Round 1 turned the rows of "Najbliżej",
 * "Powtórki" and "Ścieżki" into tiles in the path view's grammar. The user:
 * better, but still too much — the dates under "Najbliżej" tiles add nothing,
 * tiles should carry title + icon with the description on hover (and more
 * after expanding), and things planned for the day belong in the day plan
 * with the other tasks, so "Powtórki" can go and "Ścieżki" becomes a
 * progress field with an easy way into the path view. Round 2 does that.
 */
type Bucket = 'overdue' | 'today' | 'tomorrow' | 'soon'
interface UpcomingSample { id: string; icon: string; title: string; context: string; when: string; bucket: Bucket; closable?: boolean; hidden?: boolean }
interface PastSample { id: string; icon: string; title: string; context: string; when: string }
interface PracticeSample { id: string; icon: string; title: string; what: string; when: string; today?: boolean; overdue?: boolean }
interface StepSample { icon: string; title: string; what: string; when: string; today?: boolean; overdue?: boolean }
interface PathSample {
  id: string
  icon: string
  title: string
  unit: 'tydzień' | 'krok'
  current: number
  total: number
  /** One sentence for the hover: where you are. */
  now: string
  /** One line for the expansion: what this week asks for besides the steps. */
  weekNote?: string
  step: StepSample
  practices: PracticeSample[]
  letter?: { until: string; what: string }
  quick: { id: string; icon: string; label: string }[]
}
interface DayRow { id: string; icon: string; title: string; exercise?: boolean; overdue?: boolean; reading?: string }
interface DaySample { id: SampleId; upcoming: UpcomingSample[]; past: PastSample[]; repeats: PracticeSample[]; paths: PathSample[] }
type SampleId = 'typical' | 'heavy' | 'calm'

const KOMPAS = [
  { icon: 'directions_run', title: 'Regularny ruch i kondycja', tone: 'blue' },
  { icon: 'stairs', title: 'Dowieźć projekt Strumień', tone: 'lavender' },
  { icon: 'volunteer_activism', title: 'Obecność dla bliskich', tone: 'rose' },
  { icon: 'target', title: 'Zarezerwować weekendowy wypad', tone: '' },
]

/** The day plan's other groups, abbreviated (the product shows more). */
const BASE_GROUPS: { id: string; label: string; rows: DayRow[] }[] = [
  { id: 'intentions', label: 'Intencje tygodnia', rows: [
    { id: 'i1', icon: 'mg-target', title: 'Umówić przegląd auta' },
    { id: 'i2', icon: 'mg-target', title: 'Użyj swojej odpowiedzi na wstyd, gdy się pojawi' },
  ] },
  { id: 'habits', label: 'Nawyki', rows: [
    { id: 'h1', icon: 'mg-habit', title: 'Wspólna kolacja' },
    { id: 'h2', icon: 'mg-habit', title: 'Poranna rutyna', reading: '0/5' },
    { id: 'h3', icon: 'mg-habit', title: 'Głębokie porządki', reading: '0/2' },
  ] },
]

const REFLECT_WEEK: UpcomingSample = { id: 'reflect-week', icon: 'rate_review', title: 'Podsumuj ten tydzień', context: '5–11 paź 2026', when: 'dziś', bucket: 'today' }
const PLAN_WEEK: UpcomingSample = { id: 'plan-week', icon: 'edit_calendar', title: 'Zaplanuj następny tydzień', context: '12–18 paź 2026', when: 'jutro', bucket: 'tomorrow' }
const MVP: UpcomingSample = { id: 'mvp', icon: 'outlined_flag', title: 'Wydać MVP aplikacji', context: 'Planowany koniec · 20 paź', when: 'za 9 dni', bucket: 'soon', hidden: true }
const REFLECT_MONTH: UpcomingSample = { id: 'reflect-month', icon: 'rate_review', title: 'Podsumuj październik', context: 'październik 2026', when: 'za 20 dni', bucket: 'soon', hidden: true }
const PLAN_MONTH: UpcomingSample = { id: 'plan-month', icon: 'date_range', title: 'Zaplanuj listopad', context: 'listopad 2026', when: 'za 21 dni', bucket: 'soon', hidden: true }
const PAST: PastSample[] = [
  { id: 'past-plan', icon: 'check', title: 'Zaplanuj ten tydzień', context: '5–11 paź 2026', when: 'zaplanowane' },
  { id: 'past-reflect', icon: 'check', title: 'Podsumuj poprzedni tydzień', context: '28 wrz – 4 paź 2026', when: 'podsumowane' },
]

const SHAME: PathSample = {
  id: 'shame',
  icon: 'mg-exercise-compassionate-image',
  title: 'Ze wstydu do współczucia',
  unit: 'tydzień',
  current: 4,
  total: 8,
  now: 'Tydzień 4 · plan na trudną chwilę. Dziś krok: Zapis myśli.',
  weekNote: 'W tym tygodniu: Przerwa na współczucie co dzień, Moment co drugi dzień, zadanie „Powiedz jednej osobie, czego się wstydzisz” 1× (0/1).',
  step: {
    icon: 'mg-exercise-thought-record',
    title: 'Zapis myśli',
    what: 'Wybierz moment i rozłóż gorącą myśl „jestem…”. Szukaj dowodów oczami bliskiej osoby, nie prokuratora.',
    when: 'dziś',
    today: true,
  },
  practices: [
    { id: 'shame-pause', icon: 'mg-exercise-self-compassion-break', title: 'Przerwa na współczucie', what: 'Trzy minuty ciepła dla siebie w środku dnia: ręka na sercu, jedno zdanie.', when: 'dziś', today: true },
  ],
  quick: [
    { id: 'moment', icon: 'add', label: 'Zapisz moment' },
    { id: 'plan', icon: 'mg-exercise-shame-response', label: 'Mój plan' },
  ],
}
const ANXIETY: PathSample = {
  id: 'anxiety',
  icon: 'mg-exercise-anxiety-map',
  title: 'Lęk: podejść zamiast unikać',
  unit: 'krok',
  current: 7,
  total: 15,
  now: 'Krok 7 z 15 · pierwsze próby zamiast unikania. Dziś: Eksperyment behawioralny.',
  weekNote: 'Obok kroków: Pora na zmartwienia co dzień (zaległa od 10 paź).',
  step: {
    icon: 'mg-exercise-behavioral-experiment',
    title: 'Eksperyment behawioralny',
    what: 'Wybierz jedną sytuację, której unikasz, zapisz przewidywanie i sprawdź je w małej, bezpiecznej próbie.',
    when: 'dziś',
    today: true,
  },
  practices: [
    { id: 'worry-time', icon: 'mg-exercise-worry-time', title: 'Pora na zmartwienia', what: 'Odłóż zmartwienia na jedną stałą porę dnia, zamiast nosić je cały dzień.', when: 'zaległe od 10 paź', overdue: true },
  ],
  quick: [{ id: 'moment', icon: 'add', label: 'Zapisz moment' }],
}

const SAMPLES: Record<SampleId, DaySample> = {
  typical: {
    id: 'typical',
    upcoming: [REFLECT_WEEK, PLAN_WEEK, MVP, REFLECT_MONTH, PLAN_MONTH],
    past: PAST,
    repeats: [
      { id: 'box-breath', icon: 'mg-exercise-box-breathing', title: 'Oddech pudełkowy', what: 'Cztery takty po cztery sekundy: wdech, pauza, wydech, pauza.', when: 'dziś', today: true },
    ],
    paths: [SHAME],
  },
  heavy: {
    id: 'heavy',
    upcoming: [
      { id: 'finance', icon: 'outlined_flag', title: 'Porządek w finansach', context: 'Planowany koniec · 22 wrz', when: 'po terminie', bucket: 'overdue', closable: true },
      { id: 'training', icon: 'fitness_center', title: 'Blok treningowy', context: 'Planowany koniec · 7 paź', when: 'po terminie', bucket: 'overdue', closable: true },
      REFLECT_WEEK,
      PLAN_WEEK,
      MVP,
      REFLECT_MONTH,
      PLAN_MONTH,
    ],
    past: PAST,
    repeats: [
      { id: 'gratitude', icon: 'mg-exercise-gratitude-list', title: 'Lista wdzięczności', what: 'Trzy rzeczy, za które jesteś dziś wdzięczny, choćby małe.', when: 'zaległe od 8 paź', overdue: true },
      { id: 'box-breath', icon: 'mg-exercise-box-breathing', title: 'Oddech pudełkowy', what: 'Cztery takty po cztery sekundy: wdech, pauza, wydech, pauza.', when: 'dziś', today: true },
    ],
    paths: [ANXIETY, SHAME],
  },
  calm: {
    id: 'calm',
    upcoming: [PLAN_WEEK, MVP, REFLECT_MONTH, PLAN_MONTH],
    past: PAST,
    repeats: [],
    paths: [
      {
        ...SHAME,
        current: 7,
        now: 'Tydzień 7 · własny głos. Najbliższy krok we wtorek: Współczujący list.',
        weekNote: 'W tym tygodniu: Moment co drugi dzień, zadanie „Zostań w rozmowie o minutę dłużej” 2× (1/2).',
        step: {
          icon: 'mg-exercise-compassionate-letter',
          title: 'Współczujący list',
          what: 'Napisz do siebie list z perspektywy postaci, która rozumie, co się wydarzyło, i nie odwraca wzroku.',
          when: 'wt 14 paź',
        },
        practices: [],
        letter: { until: 'do 18 paź', what: 'napisany w kroku 23 do siebie za osiem tygodni.' },
      },
    ],
  },
}

const route = useRoute()
const router = useRouter()
const themes = [
  { id: 'sky-mist', label: 'Sky Mist' },
  { id: 'current', label: 'Current (domyślny produktu)' },
  { id: 'sunrise-cloud', label: 'Sunrise Cloud' },
]
/** The product paints its canvas from `:root[data-theme]`; without it the Lab shows the saturated default. */
const theme = computed(() => (themes.some(item => item.id === route.query.theme) ? String(route.query.theme) : 'sky-mist'))
watch(theme, value => document.documentElement.setAttribute('data-theme', value), { immediate: true })
onUnmounted(() => document.documentElement.removeAttribute('data-theme'))
function setTheme(value: string) {
  void router.replace({ query: { ...route.query, theme: value === 'sky-mist' ? undefined : value } })
}

const sampleId = ref<SampleId>('typical')
const placement = ref<'list' | 'column'>('list')
const tone = ref<'mist' | 'paper'>('mist')
const icons = ref(false)
const showKompas = ref(true)
const moreOpen = ref(false)
const pastOpen = ref(false)
const openPath = ref<string | null>(null)
const doneSteps = ref(new Set<string>())
const done = ref(new Set<string>())
const dismissed = ref(new Set<string>())
const lastNote = ref('')

const sample = computed(() => SAMPLES[sampleId.value])
const hiddenCount = computed(() => sample.value.upcoming.filter(entry => entry.hidden).length)
const visibleUpcoming = computed(() => (moreOpen.value ? sample.value.upcoming : sample.value.upcoming.filter(entry => !entry.hidden)))
const repeats = computed(() => sample.value.repeats.filter(tile => !dismissed.value.has(tile.id)))
function livePractices(path: PathSample) {
  return path.practices.filter(tile => (tile.today || tile.overdue) && !dismissed.value.has(tile.id))
}

/** Day plan groups; with the round-2 placement the day's exercises form a "Praktyki" group (overdue first, steps before practices). */
const dayGroups = computed(() => {
  if (placement.value !== 'list') return BASE_GROUPS.map(group => ({ ...group, isNew: false }))
  const rows: DayRow[] = []
  for (const path of sample.value.paths) {
    if ((path.step.today || path.step.overdue) && !dismissed.value.has(`step:${path.id}`)) {
      rows.push({ id: `step:${path.id}`, icon: path.step.icon, title: path.step.title, exercise: true, overdue: path.step.overdue })
    }
    for (const tile of livePractices(path)) rows.push({ id: tile.id, icon: tile.icon, title: tile.title, exercise: true, overdue: tile.overdue })
  }
  for (const tile of repeats.value) rows.push({ id: tile.id, icon: tile.icon, title: tile.title, exercise: true, overdue: tile.overdue })
  rows.sort((a, b) => Number(Boolean(b.overdue)) - Number(Boolean(a.overdue)))
  return [
    ...BASE_GROUPS.map(group => ({ ...group, isNew: false })),
    ...(rows.length ? [{ id: 'practice', label: 'Praktyki', rows, isNew: true }] : []),
  ]
})

function note(text: string) {
  lastNote.value = text
}
function dismiss(id: string, text: string) {
  dismissed.value = new Set([...dismissed.value, id])
  note(text)
}
function toggleDone(id: string, title: string) {
  const next = new Set(done.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  done.value = next
  note(next.has(id) ? `Rozpocznij: ${title} (w Labie oznacza jako zrobione)` : `Cofnij: ${title}`)
}
function togglePath(path: PathSample) {
  openPath.value = openPath.value === path.id ? null : path.id
  note(openPath.value ? `Rozwiń ścieżkę: ${path.title}` : `Zwiń ścieżkę: ${path.title}`)
}
function startStep(path: PathSample) {
  doneSteps.value = new Set([...doneSteps.value, path.id])
  note(`Rozpocznij krok: ${path.step.title} (w Labie oznacza krok jako zrobiony)`)
}
function undoStep(path: PathSample) {
  const next = new Set(doneSteps.value)
  next.delete(path.id)
  doneSteps.value = next
  note(`Cofnij: ${path.step.title}`)
}
function resetAll() {
  sampleId.value = 'typical'
  placement.value = 'list'
  tone.value = 'mist'
  icons.value = false
  showKompas.value = true
  moreOpen.value = false
  pastOpen.value = false
  openPath.value = null
  doneSteps.value = new Set()
  done.value = new Set()
  dismissed.value = new Set()
  lastNote.value = ''
}
watch(sampleId, () => {
  moreOpen.value = false
  pastOpen.value = false
  openPath.value = null
  doneSteps.value = new Set()
  done.value = new Set()
  dismissed.value = new Set()
})

const findings = [
  { id: 1, title: 'Wiersz na całą szerokość, data przy krawędzi', where: 'Najbliżej · Powtórki · Ścieżki', body: 'Każda pozycja to „ikona | tytuł i dopisek | data przy prawej krawędzi” z kreską pod spodem. Przy 470 px zostaje pusty środek; w widoku ścieżki ten sam wzorzec został odrzucony 11.10.', fix: 'Kafle: tytuł, obok stan. Podziały robią ton i odstępy.' },
  { id: 2, title: 'Rezerwa pustego miejsca pod celem po terminie', where: 'Najbliżej', body: 'Tacka „Podsumuj · Przesuń termin” pojawia się dopiero na hover, ale miejsce jest zarezerwowane zawsze — pod każdym celem po terminie zieje pusty pas wysokości wiersza.', fix: 'Akcje zamknięcia celu widoczne na stałe w stopce kafla. To stan, który ma zapraszać do działania, nie sekret.' },
  { id: 3, title: 'Trzy poziomy wierszy w jednej karcie', where: 'Ścieżki', body: 'Wiersz ścieżki, wcięte wiersze kroku i praktyk, pod nimi rząd czipów — każda ścieżka to cztery do pięciu wierszy, kreski między nimi i dopiski „krok 10”, „praktyka”, które powtarzają to, co mówi tytuł.', fix: 'Krok i praktyki na dziś idą do planu dnia. Ścieżka zostaje jednym kaflem postępu, który otwiera jej widok.' },
  { id: 4, title: '„Pokaż więcej” i „Zrobione wcześniej” jako wiersze', where: 'Najbliżej', body: 'Dwa dodatkowe wiersze na dole karty: przycisk tekstowy i surowy trójkąt <details>. Razem z kreskami karta czyta się jak formularz.', fix: 'Oba jako ciche linki w nagłówku karty („Jeszcze 3” · „Minione (2)”).' },
  { id: 5, title: 'Daty pod tytułami nic nie dodają', where: 'Najbliżej', body: '„Podsumuj ten tydzień · 5–11 paź 2026”, „Zaplanuj następny tydzień · 12–18 paź 2026”: tytuł już mówi, który to tydzień, a stan „dziś/jutro” — kiedy. „Planowany koniec · 7 paź” przy celu po terminie też powtarza stan.', fix: 'Tylko tytuł i stan na wierzchu. Konkretna data celu w dymku tytułu.' },
  { id: 6, title: 'Ćwiczenia dnia poza planem dnia', where: 'Powtórki · Ścieżki', body: 'Oddech pudełkowy „na dziś” i krok ścieżki „na dziś” to zadania dnia, ale żyją w prawej kolumnie, obok sygnałów — osobna lista obok listy.', fix: 'Grupa „Praktyki” w planie dnia: te same wiersze co nawyki, dysk uruchamia ćwiczenie, tacka przekłada.' },
]
const findingId = ref(1)
const activeFinding = computed(() => findings.find(finding => finding.id === findingId.value) ?? findings[0])

const anatomy = [
  { field: 'Plan dnia · wiersz praktyki', surface: 'ikona ćwiczenia, tytuł (zaległe: słowo „zaległe” na różowo)', state: 'dysk z trójkątem = Rozpocznij; po ukończeniu kropka', hover: 'tacka jutro · data · pomiń tuż za tytułem (jak przy nawyku)', more: 'rozwinięcie wiersza jak dziś (akcje, historia)' },
  { field: 'Najbliżej · rytuał', surface: 'tytuł („Podsumuj ten tydzień”)', state: 'dziś · jutro · za n dni; zrobione = studnia', hover: 'ton papieru (klikalny)', more: 'otwiera kreator rytuału' },
  { field: 'Najbliżej · cel', surface: 'tytuł celu', state: 'za n dni · po terminie (róż); podsumowany = studnia', hover: 'dymek: Planowany koniec · 20 paź', more: 'otwiera kartę celu; po terminie stopka Podsumuj · Przesuń termin' },
  { field: 'Ścieżki · kafel ścieżki', surface: 'ikona, tytuł, znaczniki tygodni (lub dysk wypełnienia)', state: 'tydzień 4 z 8 · krok 7 z 15', hover: 'jedno zdanie: gdzie jesteś i co dziś', more: 'najbliższy krok z „co”, notatka tygodnia, list od Ciebie, Zapisz moment · Mój plan, Otwórz ścieżkę' },
]

const decisions = [
  { id: 'D1', title: 'Najbliżej: tylko tytuł i stan', body: 'Kafel = tytuł + stan po prawej („dziś”, „jutro”, „za 9 dni”, „po terminie” na różowo, studnia dla zrobionych). Daty okresów i „Planowany koniec” schodzą z powierzchni; data celu zostaje w dymku. Etykiety ten/następny/poprzedni tydzień liczy produkt względem tygodnia dnia — do pilnowania w testach przy zmianie dnia/tygodnia.' },
  { id: 'D2', title: 'Ćwiczenia dnia = wiersze planu dnia, grupa „Praktyki”', body: 'Powtórki, kroki ścieżek i praktyki ścieżek przypadające na dziś lub zaległe trafiają do planu dnia jako zwykłe wiersze (ikona, tytuł, dysk). Zaległe na górze grupy, kroki przed praktykami. Pole „Powtórki” znika. Nazwa grupy do ustalenia: „Praktyki” / „Ćwiczenia” / „Ścieżki i powtórki”.' },
  { id: 'D3', title: 'Dysk z trójkątem uruchamia, ukończenie wypełnia', body: 'Wiersz ćwiczenia nie ma własnego przycisku Rozpocznij: dysk po prawej (jak przy nawyku) pokazuje trójkąt i uruchamia ćwiczenie; po jego ukończeniu zamienia się w kropkę (dziś plan item i tak auto-kompletuje się po zakończeniu ćwiczenia). Tacka jutro · data · pomiń na hover, tuż za tytułem.' },
  { id: 'D4', title: 'Ścieżki = postęp i wejście, nie lista zadań', body: 'Jeden kafel na ścieżkę: ikona, tytuł, znaczniki tygodni (zrobione wypełnione, bieżący z pierścieniem; ścieżka bez tygodni — dysk wypełnienia), „tydzień 4 z 8”. Kafel nie powtarza zadań dnia, bo te są już w planie dnia.' },
  { id: 'D5', title: 'Opis warstwami: hover → zdanie, klik → rozwinięcie', body: 'Odwrotnie niż w widoku ścieżki: na wierzchu tytuł i ikona; po najechaniu jedno zdanie „gdzie jesteś i co dziś”; po kliknięciu w tytuł małe rozwinięcie: najbliższy krok z „co”, notatka tygodnia (praktyki, zadanie w świecie z ułamkiem), list od Ciebie, Zapisz moment · Mój plan i „Otwórz ścieżkę”. Rozwinięty kafel rozciąga się na szerokość karty, sąsiedni zostaje w swojej kolumnie.' },
  { id: 'D6', title: 'Ton i siatka bez zmian wobec rundy 1', body: 'Karta → kafle mist → kafel dnia papier z pierścieniem; auto-fill ≥ 11 rem (dwie kolumny przy 470 px), równe kafle w rzędzie, pojedynczy kafel w jednej kolumnie. Bez kresek, chevronów i ikon akcji przy krawędzi.' },
  { id: 'D7', title: 'Pytania otwarte', body: 'Czy wiersze praktyk mają być osobną grupą, czy wmieszane w istniejące grupy (np. krok ścieżki przy intencjach tygodnia)? Czy ikony w „Najbliżej” pomagają (przełącznik)? Czy znaczniki tygodni są czytelne jako postęp, czy wolisz sam dysk? Czy rozwinięcie kafla ścieżki w ogóle potrzebne, skoro jest „Otwórz ścieżkę” — może wystarczy hover?' },
]
</script>

<style scoped>
.tt { --tt-muted: var(--mg-color-muted); --tt-ink: var(--mg-color-ink); }

/* Blocks (shared Lab concept chrome) */
.tt__block { margin-top: 34px; }
.tt__block-head { margin-bottom: 14px; }
.tt__block-head h2 { margin: 4px 0 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }

/* 01 · evidence */
.tt__evidence { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; align-items: start; }
.tt__findings { display: grid; gap: 6px; }
.tt__findings button { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; align-items: start; padding: 10px 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); color: var(--tt-ink); text-align: left; cursor: pointer; font: inherit; }
.tt__findings button.active { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.tt__findings strong { display: block; font-size: 12px; font-weight: 800; line-height: 1.3; }
.tt__findings small { display: block; margin-top: 2px; color: var(--tt-muted); font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.tt__finding-index { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 11px; font-weight: 900; }
.tt__shot { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0; margin: 0; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-paper); overflow: hidden; }
.tt__shot-frame { max-height: 640px; overflow: auto; background: var(--mg-color-canvas); scrollbar-width: thin; }
.tt__shot-frame img { display: block; width: 100%; height: auto; }
.tt__shot figcaption { padding: 16px 18px; border-left: 1px solid var(--mg-color-border); font-size: 12px; line-height: 1.5; }
.tt__shot figcaption strong { display: block; margin-bottom: 6px; font-size: 13px; }
.tt__shot figcaption p { margin: 0 0 8px; color: var(--tt-muted); }
.tt__fix { display: flex; gap: 6px; align-items: flex-start; color: var(--mg-color-primary-strong) !important; font-weight: 700; }
.tt__fix .material-symbols-outlined { font-size: 16px; flex: 0 0 auto; }

/* 02 · toolbar + stage */
.tt__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border-radius: 18px; }
.tt__toolbar label { display: grid; gap: 5px; color: var(--tt-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.tt__toolbar select { min-height: 34px; min-width: 150px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--tt-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; text-transform: none; letter-spacing: 0; }
.tt__toolbar .tt__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.tt__check input { accent-color: var(--mg-color-primary); }
.tt__reset { min-height: 34px; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }

/* Stage = the product's two-column day: list 1.6fr, context ≥ 17 rem (here fixed at 470 px). */
.tt__stage { display: grid; grid-template-columns: minmax(0, 1fr) minmax(20rem, 470px); gap: var(--mg-space-4); align-items: start; padding: 28px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.tt__legend { margin-top: 18px; padding: 14px 16px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); font-size: 12px; line-height: 1.5; }
.tt__legend strong { display: block; margin-bottom: 6px; font-size: 12px; }
.tt__legend ol { margin: 0; padding-left: 18px; color: var(--tt-muted); }
.tt__legend li + li { margin-top: 6px; }
.tt__note { display: flex; gap: 6px; align-items: center; margin: 12px 0 0; padding: 8px 10px; border-radius: var(--mg-radius-md); background: var(--mg-color-paper); color: var(--mg-color-primary-strong); font-weight: 700; }
.tt__note .material-symbols-outlined { font-size: 16px; }

/* ─── Left: the day plan replica (NextDayRail / NextDayItemRow language) ─── */
.tt-list { display: grid; gap: var(--mg-space-3); padding: var(--mg-space-3) var(--mg-space-3) var(--mg-space-4); border-radius: var(--mg-radius-lg); }
.tt-list__heading { display: flex; align-items: baseline; justify-content: space-between; gap: var(--mg-space-2); padding: 0 var(--mg-space-1); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.tt-list__heading small { color: var(--tt-muted); font-weight: 700; letter-spacing: 0.02em; text-transform: none; }
.tt-list__group { display: grid; gap: 2px; padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-2); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.tt-list__group > header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--mg-space-2); padding: 2px var(--mg-space-1) var(--mg-space-1); color: var(--mg-color-primary-strong); font-size: 0.66rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
.tt-list__group > header small { color: var(--mg-color-lavender); font-size: 0.6rem; font-weight: 800; letter-spacing: 0.04em; text-transform: none; }
.tt-list__group--new { box-shadow: 0 0 0 2px var(--mg-color-lavender-soft); }
.tt-row { display: grid; grid-template-columns: 2.1rem minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; min-height: 3rem; padding: 4px var(--mg-space-1); border-radius: var(--mg-radius-sm); }
.tt-row:hover { background: var(--mg-color-paper); }
.tt-row__lead { display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); }
.tt-row__lead .material-symbols-outlined { font-size: var(--mg-font-size-md); }
.tt-row__title { display: flex; align-items: center; gap: var(--mg-space-2); min-width: 0; }
.tt-row__label, .mg-design-v2 .tt-row__label { display: inline-flex; align-items: baseline; gap: var(--mg-space-2); min-width: 0; padding: 0; border: 0; background: none; color: var(--tt-ink); font: inherit; text-align: left; cursor: pointer; }
.tt-row__label strong { font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
.tt-row.is-done .tt-row__label strong { color: var(--tt-muted); }
.tt-row__late { color: var(--mg-color-rose); font-size: var(--mg-font-size-xs); font-weight: 700; }
.tt-row__tray { display: inline-flex; gap: 2px; opacity: 0; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tt-row:hover .tt-row__tray, .tt-row:focus-within .tt-row__tray { opacity: 1; }
.tt-row__tray button, .mg-design-v2 .tt-row__tray button { display: grid; place-items: center; width: 1.6rem; height: 1.6rem; padding: 0; border: 0; border-radius: var(--mg-radius-sm); background: transparent; color: var(--tt-muted); cursor: pointer; }
.tt-row__tray button:hover { background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.tt-row__tray .material-symbols-outlined { font-size: var(--mg-font-size-sm); }
.tt-row__well { cursor: pointer; color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 800; }
.tt-row__well b { font-size: 0.72rem; }
.tt-row__well--launch .material-symbols-outlined { font-size: var(--mg-font-size-md); color: var(--mg-color-primary-strong); opacity: 0.75; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tt-row:hover .tt-row__well--launch .material-symbols-outlined { opacity: 1; }

/* ─── Right: the context column ─── */
.tt-column { display: grid; align-content: start; gap: var(--mg-space-4); min-width: 0; }

.tt-card { display: grid; gap: var(--mg-space-2); padding: var(--mg-space-3); border-radius: var(--mg-radius-lg); }
.tt-card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--mg-space-2); min-height: 1.5rem; color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.tt-card__head small { color: var(--tt-muted); font-size: var(--mg-font-size-xs); font-weight: 700; letter-spacing: 0.02em; text-transform: none; }
.tt-card__links { display: inline-flex; gap: var(--mg-space-3); }
.tt-link, .mg-design-v2 .tt-link { padding: 2px 0; border: 0; background: none; color: var(--mg-color-primary-strong); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; letter-spacing: 0.02em; text-transform: none; cursor: pointer; }
.tt-link:hover, .tt-link.is-active { text-decoration: underline; }
.tt-empty { margin: var(--mg-space-1) 0; color: var(--tt-muted); font-size: var(--mg-font-size-sm); }

/* Kompas replica (unchanged product CSS, abbreviated) */
.tt-kompas__tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--mg-space-2); }
.tt-kompas__tile { display: grid; gap: var(--mg-space-1); justify-items: center; padding: var(--mg-space-2) var(--mg-space-1); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); color: var(--tt-ink); background: var(--mg-color-paper); text-align: center; cursor: pointer; font: inherit; }
.tt-kompas__tile:hover { background: var(--mg-color-mist); box-shadow: var(--mg-shadow-raised-sm); }
.tt-kompas__tile small { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 100%; font-size: 0.66rem; font-weight: 800; line-height: 1.25; }
.tt-kompas__icon { display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); }
.tt-kompas__icon .material-symbols-outlined { font-size: var(--mg-font-size-md); }
.tt-kompas__tile.tone-lavender .tt-kompas__icon { color: var(--mg-color-lavender); background: var(--mg-color-lavender-soft); }
.tt-kompas__tile.tone-rose .tt-kompas__icon { color: var(--mg-color-rose); background: var(--mg-color-rose-soft); }

/* Tile grid: as many ≥ 11 rem tiles as fit (auto-fill: a lone tile keeps one column), equal height per row. */
.tt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr)); gap: var(--mg-space-2); align-items: stretch; }
.tt-grid--past { margin-top: var(--mg-space-1); }

/* The tile */
.tt-tile { position: relative; display: flex; flex-direction: column; gap: var(--mg-space-1); min-width: 0; padding: var(--mg-space-3); border: 1px solid transparent; border-radius: var(--mg-radius-md); background: var(--mg-color-mist); transition: background var(--mg-duration-fast) var(--mg-ease-standard), box-shadow var(--mg-duration-fast) var(--mg-ease-standard); }
.tt-column--paper .tt-tile { border-color: var(--mg-color-border); background: var(--mg-color-paper); }
.tt-tile:has(> .tt-tile__head > .tt-tile__open:hover) { background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.tt-column--paper .tt-tile:has(> .tt-tile__head > .tt-tile__open:hover) { background: var(--mg-color-mist); }
.tt-tile--compact { padding: 10px var(--mg-space-3); }
.tt-tile--compact .tt-tile__head { align-items: center; }

.tt-tile__head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 2px var(--mg-space-2); }
.tt-tile__icon { display: grid; place-items: center; flex: 0 0 auto; width: 1.4rem; height: 1.4rem; margin-top: -1px; color: var(--mg-color-primary-strong); }
.tt-tile__icon .material-symbols-outlined { font-size: var(--mg-font-size-md); }
.tt-tile__title { flex: 1 1 auto; min-width: 0; font-size: var(--mg-font-size-sm); font-weight: 700; line-height: 1.3; overflow-wrap: normal; }
.tt-tile__lead { display: flex; flex: 1 1 auto; gap: var(--mg-space-2); align-items: flex-start; min-width: 0; }
.tt-tile__open, .mg-design-v2 .tt-tile__open { display: flex; flex: 1 1 auto; gap: var(--mg-space-2); align-items: flex-start; min-width: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.tt-tile__open::after { position: absolute; inset: 0; border-radius: inherit; content: ''; }
.tt-tile__open:focus-visible { outline: none; }
.tt-tile:has(> .tt-tile__head > .tt-tile__open:focus-visible) { outline: 2px solid var(--mg-color-focus); outline-offset: 2px; }
.tt-tile__mark { flex: 0 0 auto; margin-top: 1px; margin-left: auto; color: var(--tt-muted); font-size: var(--mg-font-size-xs); font-weight: 700; white-space: nowrap; }
.tt-tile__mark.is-rose { color: var(--mg-color-rose); }
.tt-well { --mg-well-size: 1.3rem; flex: 0 0 auto; }
.tt-tile__what { display: -webkit-box; margin: 0; overflow: hidden; color: var(--tt-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
/* Round-1 tiles with the description on hover: the line is reserved, the ink fades in. */
.tt-tile__what--hover { -webkit-line-clamp: 2; min-height: calc(2 * 1.5 * var(--mg-font-size-xs)); opacity: 0; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tt-tile--hover:hover .tt-tile__what--hover, .tt-tile--hover:focus-within .tt-tile__what--hover { opacity: 1; }
.tt-tile__foot { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; margin-top: auto; padding-top: var(--mg-space-1); }

.tt-tile--today { border-color: var(--mg-color-primary-soft); background: var(--mg-color-paper); box-shadow: 0 0 0 3px var(--mg-color-primary-soft); }
.tt-tile--today .tt-tile__title { font-weight: 800; }
.tt-tile--done .tt-tile__title { color: color-mix(in srgb, var(--tt-ink) 60%, var(--tt-muted)); }
.tt-tile--done .tt-tile__what { color: color-mix(in srgb, var(--tt-muted) 72%, var(--mg-color-paper)); -webkit-line-clamp: 2; }

/* Chips */
.tt-chip, .mg-design-v2 .tt-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 1.75rem; padding: 3px var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-paper); color: var(--tt-muted); font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; white-space: nowrap; cursor: pointer; }
.tt-chip .material-symbols-outlined { font-size: var(--mg-font-size-sm); }
.tt-chip:hover { background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.tt-chip--primary, .mg-design-v2 .tt-chip--primary { border-color: transparent; background: var(--mg-color-primary-fill); color: var(--mg-color-on-primary); }
.tt-chip--primary:hover { background: var(--mg-color-primary-fill-hover); color: var(--mg-color-on-primary); }
.tt-chip--ghost, .mg-design-v2 .tt-chip--ghost { border-color: transparent; background: transparent; }
.tt-chip--ghost:hover { background: var(--mg-color-mist); }
.tt-tile__tray { display: inline-flex; gap: 2px; opacity: 0; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tt-tile:hover .tt-tile__tray, .tt-tile:focus-within .tt-tile__tray { opacity: 1; }
.tt-tile__tray button, .mg-design-v2 .tt-tile__tray button { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 0; border-radius: var(--mg-radius-sm); background: transparent; color: var(--tt-muted); cursor: pointer; }
.tt-tile__tray button:hover { background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); }
.tt-tile__tray .material-symbols-outlined { font-size: var(--mg-font-size-sm); }

/* ─── Path tile: progress + a way in ─── */
.tt-path__toggle::after { content: none; }
.tt-path__toggle:hover .tt-tile__title { color: var(--mg-color-primary-strong); }
.tt-column--column .tt-path, .tt-path--open { grid-column: 1 / -1; }
.tt-path--open { background: var(--mg-color-paper); }
.tt-column--paper .tt-path--open { background: var(--mg-color-mist); }
.tt-path__progress { display: grid; gap: 4px; padding-top: 2px; }
.tt-marks { display: inline-flex; gap: 5px; align-items: center; }
.tt-mark { display: inline-block; width: 0.62rem; height: 0.62rem; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-b); background: var(--mg-color-canvas); }
.tt-mark:nth-child(even) { border-radius: var(--mg-radius-organic-c); }
.tt-mark--done { border-color: transparent; background: var(--mg-color-state); }
.tt-mark--current { border-color: var(--mg-color-primary); background: var(--mg-color-paper); box-shadow: 0 0 0 2px var(--mg-color-primary-soft); }
.tt-disc { --mg-well-size: 1.3rem; overflow: hidden; background: linear-gradient(to right, var(--mg-color-sky-field) var(--fill, 0%), var(--mg-color-canvas) var(--fill, 0%)); }
/* The hover sentence: one reserved line that fades in. */
.tt-path__now { display: -webkit-box; overflow: hidden; min-height: calc(1.5 * var(--mg-font-size-xs)); color: var(--tt-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.tt-path__now--hover { opacity: 0; transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tt-path:hover .tt-path__now--hover, .tt-path:focus-within .tt-path__now--hover, .tt-path--open .tt-path__now--hover { opacity: 1; }
.tt-path__items { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(10rem, 100%), 1fr)); gap: var(--mg-space-2); margin-top: var(--mg-space-1); }
.tt-tile--inner { background: var(--mg-color-paper); }
.tt-path__more { display: grid; gap: var(--mg-space-2); margin-top: var(--mg-space-1); padding-top: var(--mg-space-2); }
.tt-path__step, .tt-path__week { margin: 0; color: var(--tt-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }
.tt-path__step b { color: var(--tt-ink); font-weight: 800; }
.tt-quick { display: flex; flex-wrap: wrap; gap: 4px; }

/* 03 · anatomy table */
.tt__table { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.45; }
.tt__table th, .tt__table td { padding: 8px 10px; border-bottom: 1px solid var(--mg-color-border); text-align: left; vertical-align: top; }
.tt__table thead th { color: var(--tt-muted); font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.tt__table tbody th { white-space: nowrap; color: var(--mg-color-primary-strong); font-weight: 800; }
.tt__table td { color: var(--tt-ink); }
.tt__table-note { margin: 12px 0 0; max-width: 820px; color: var(--tt-muted); font-size: 12px; line-height: 1.5; }

/* 04 · decisions */
.tt__decisions { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.tt__decisions li { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: start; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.tt__decision-id { display: grid; place-items: center; height: 26px; border-radius: 999px; background: var(--mg-color-sky-well); color: var(--mg-color-primary-strong); font-size: 11px; font-weight: 900; }
.tt__decisions strong { display: block; font-size: 13px; font-weight: 800; }
.tt__decisions p { margin: 4px 0 0; color: var(--tt-muted); font-size: 12px; line-height: 1.5; }

@media (max-width: 1200px) {
  .tt__evidence, .tt__stage { grid-template-columns: minmax(0, 1fr); }
  .tt__shot { grid-template-columns: minmax(0, 1fr); }
  .tt__shot figcaption { border-left: 0; border-top: 1px solid var(--mg-color-border); }
}
</style>
