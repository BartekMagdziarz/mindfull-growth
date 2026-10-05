<template>
  <section class="scenario-page concept-page tpp mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · Dzisiaj · pole „Ścieżki” i widok ścieżki</span>
        <h1>W Dzisiaj tylko to, co prowadzi dalej. Reszta w widoku ścieżki</h1>
        <p>
          Pole „Ścieżki” w prawej kolumnie Dzisiaj jest zawsze, gdy ścieżka jest aktywna, ale zostaje małe: wiersz ścieżki
          (faza, krok n z m) prowadzący do jej widoku, najbliższy krok z datą, praktyki na dziś z tacką i najwyżej dwie
          stałe akcje. Bez rozwijania. Kroki, praktyki z rytmem, zadanie tygodnia z ułamkiem, momenty z rozkładami,
          karta odpowiedzi na wstyd i ćwiczenia ścieżki przechodzą do widoku ścieżki, który z jednej długiej kolumny
          staje się dashboardem: oś kroków po lewej, karty stanu po prawej.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny · runda 2</span>
    </header>

    <!-- 01 · Stan obecny -->
    <section class="tpp__block">
      <header class="tpp__block-head">
        <span class="lab-eyebrow">01 · Stan obecny</span>
        <h2>Pole znika w dni bez kroku, a widok ścieżki to jedna długa kolumna</h2>
      </header>
      <div class="tpp__evidence">
        <nav class="tpp__findings" aria-label="Znaleziska">
          <button v-for="finding in findings" :key="finding.id" type="button" :class="{ active: activeFinding.id === finding.id }" @click="findingId = finding.id">
            <span class="tpp__finding-index">{{ finding.id }}</span>
            <span><strong>{{ finding.title }}</strong><small>{{ finding.where }}</small></span>
          </button>
        </nav>
        <figure class="tpp__shot">
          <div class="tpp__shot-frame" :class="{ 'is-tall': activeFinding.shot === 'detail' }">
            <img v-if="activeFinding.shot === 'field'" src="/research/current/today/paths-block-current-only.png" alt="Blok Ścieżki w widoku Dzisiaj na instancji verify, 26 września 2026" />
            <img v-else src="/research/current/today/path-detail-current.png" alt="Widok ścieżki lęku na instancji verify, 26 września 2026: pomiar, praktyki, W świecie i oś kroków w jednej kolumnie" />
          </div>
          <figcaption>
            <strong>{{ activeFinding.title }}</strong>
            <p>{{ activeFinding.body }}</p>
            <p class="tpp__fix"><AppIcon name="arrow_forward" /> {{ activeFinding.fix }}</p>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 02 · Pole w Dzisiaj -->
    <section class="tpp__block">
      <header class="tpp__block-head">
        <span class="lab-eyebrow">02 · Dzisiaj · pole „Ścieżki”</span>
        <h2>Szybka nawigacja i jedno sprawdzenie, bez rozwijania</h2>
      </header>

      <div class="tpp__toolbar neo-card" aria-label="Scenariusz pola">
        <label>Ścieżki
          <select v-model="pathsMode">
            <option value="one">Jedna · wstyd</option>
            <option value="two">Dwie · wstyd + lęk</option>
          </select>
        </label>
        <label>Stałe akcje w polu
          <select v-model="fieldActions">
            <option value="two">Dwie · Zapisz moment · Moja odpowiedź</option>
            <option value="one">Jedna · Zapisz moment</option>
            <option value="none">Żadnej · akcje tylko w widoku ścieżki</option>
          </select>
        </label>
        <label class="tpp__check"><input v-model="fieldWeek" type="checkbox" /> Ułamek tygodnia w polu</label>
        <label class="tpp__check"><input v-model="stepToday" type="checkbox" /> Krok przypada na dziś</label>
        <button class="tpp__reset" type="button" @click="resetAll">Przywróć przykład</button>
      </div>

      <div class="tpp__stage-wrap">
        <div class="tpp__stage">
          <div class="tpp-column">
            <section class="tpp-card tpp-card--context" aria-label="Najbliżej">
              <header><span>Najbliżej</span></header>
              <div class="tpp-list">
                <div class="tpp-row tpp-row--static">
                  <span class="tpp-row__icon"><AppIcon name="event_repeat" /></span>
                  <span class="tpp-row__copy"><strong>Zaplanuj następny tydzień</strong><span>28 wrz–4 paź 2026</span></span>
                  <em>za 2 dni</em>
                </div>
                <div class="tpp-row tpp-row--static">
                  <span class="tpp-row__icon"><AppIcon name="flag" /></span>
                  <span class="tpp-row__copy"><strong>Wydać MVP aplikacji</strong><span>Planowany koniec · 30 wrz</span></span>
                  <em>za 4 dni</em>
                </div>
              </div>
            </section>

            <section class="tpp-card tpp-paths" aria-label="Ścieżki">
              <header><span>Ścieżki</span></header>
              <div v-for="path in paths" :key="path.id" class="tpp-path">
                <button type="button" class="tpp-row tpp-row--path" :aria-label="`Otwórz widok ścieżki: ${path.title}`" @click="note(`Otwórz widok ścieżki: ${path.title}`)">
                  <span class="tpp-row__icon"><AppIcon :name="path.icon" /></span>
                  <span class="tpp-row__copy">
                    <strong>{{ path.title }}</strong>
                    <span>{{ phaseTitle(path) }} · krok {{ path.currentStepIndex + 1 }} z {{ path.steps.length }}</span>
                  </span>
                  <em v-if="fieldWeek && path.weekTask" class="tpp-fraction" :title="path.weekTask.title"><b>{{ path.weekTask.done }}</b>/{{ path.weekTask.times }}</em>
                  <em v-else class="tpp-row__chevron" aria-hidden="true">›</em>
                </button>
                <button type="button" class="tpp-row tpp-row--child" :class="{ 'is-due': nextStep(path).due }" @click="note(`Otwórz krok: ${nextStep(path).title}`)">
                  <span class="tpp-row__icon"><AppIcon :name="nextStep(path).icon" /></span>
                  <span class="tpp-row__copy"><strong>{{ nextStep(path).title }}</strong><span>krok {{ path.currentStepIndex + 1 }}</span></span>
                  <em>{{ nextStep(path).dateLabel }}</em>
                </button>
                <div v-for="practice in duePractices(path)" :key="practice.slug" class="tpp-row tpp-row--child tpp-row--tray" :class="{ 'is-overdue': practice.due === 'overdue' }">
                  <button type="button" class="tpp-row__main" @click="note(`Otwórz praktykę: ${practice.title}`)">
                    <span class="tpp-row__icon"><AppIcon :name="practice.icon" /></span>
                    <span class="tpp-row__copy"><strong>{{ practice.title }}</strong><span>praktyka · {{ practice.rhythm }}</span></span>
                    <em :class="{ 'is-overdue': practice.due === 'overdue' }">{{ practice.dueLabel }}</em>
                  </button>
                  <span class="tpp-tray" aria-label="Akcje praktyki">
                    <button type="button" title="Przenieś na jutro" @click="note('Na jutro')"><AppIcon name="redo" /></button>
                    <button type="button" title="Wybierz datę…" @click="note('Wybierz datę')"><AppIcon name="edit_calendar" /></button>
                    <button type="button" title="Pomiń" @click="note('Pomiń')"><AppIcon name="close" /></button>
                  </span>
                </div>
                <div v-if="fieldActions !== 'none' && fieldTools(path).length" class="tpp-actions" :aria-label="`Akcje ścieżki: ${path.title}`">
                  <button v-for="tool in fieldTools(path)" :key="tool.id" type="button" :title="tool.title" @click="note(tool.title)">
                    <AppIcon :name="tool.icon" /><span>{{ tool.label }}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside class="tpp__legend">
          <strong>Jak czytać scenę</strong>
          <ol>
            <li>Kolumna ma 440 px, jak prawa kolumna Dzisiaj przy 1440 px. „Najbliżej” jest tu tylko sąsiadem.</li>
            <li>Wiersz ścieżki prowadzi do jej widoku (scena 03). Nic się nie rozwija.</li>
            <li>Najbliższy krok jest zawsze, także z datą przyszłą; praktyki tylko wtedy, gdy przypadają na dziś lub są zaległe, z tacką na hover.</li>
            <li>Stałe akcje to najwyżej dwie: narzędzie do zapisu w chwili (Zapisz moment) i karta osobista (Moja odpowiedź). Ścieżka lęku ma dziś tylko „Odłóż zmartwienie”.</li>
            <li>Ułamek tygodnia w polu to pytanie Q2: włącz i oceń, czy to jeszcze „sprawdzenie”, czy już analiza.</li>
          </ol>
          <p v-if="lastNote" class="tpp__note"><AppIcon name="touch_app" /> {{ lastNote }}</p>
        </aside>
      </div>
    </section>

    <!-- 03 · Widok ścieżki -->
    <section class="tpp__block">
      <header class="tpp__block-head">
        <span class="lab-eyebrow">03 · Widok ścieżki · dashboard</span>
        <h2>Oś kroków po lewej, stan ścieżki w kartach po prawej</h2>
      </header>

      <div class="tpp__toolbar neo-card" aria-label="Scenariusz widoku ścieżki">
        <label>Ścieżka
          <select v-model="dashPath">
            <option value="shame">Ze wstydu do współczucia</option>
            <option value="anxiety">Lęk: podejść zamiast unikać</option>
          </select>
        </label>
        <label>Oś kroków
          <select v-model="timelineMode">
            <option value="folded">Zrobione zwinięte do jednej linii na fazę</option>
            <option value="full">Pełna lista, jak dziś</option>
          </select>
        </label>
        <label>Momenty z 14 dni
          <select v-model.number="momentsCount">
            <option :value="0">0 · brak</option>
            <option :value="2">2 · sama lista</option>
            <option :value="6">6 · lista i rozkłady</option>
          </select>
        </label>
        <label class="tpp__check"><input v-model="hasResponse" type="checkbox" /> Odpowiedź na wstyd zapisana</label>
      </div>

      <div class="tpp__stage tpp__stage--wide">
        <article class="tpp-dash" :aria-label="`Widok ścieżki: ${dash.title}`">
          <header class="tpp-dash__head">
            <span class="tpp-dash__eyebrow">Ścieżki</span>
            <div class="tpp-dash__title">
              <span class="tpp-dash__icon"><AppIcon :name="dash.icon" /></span>
              <div>
                <h3>{{ dash.title }}</h3>
                <small>{{ dash.steps.length }} kroków · ~8 tygodni · {{ phaseTitle(dash) }} · krok {{ dash.currentStepIndex + 1 }} z {{ dash.steps.length }}</small>
              </div>
              <div class="tpp-dash__status">
                <span class="tpp-dash__pill">krok {{ dash.currentStepIndex + 1 }} z {{ dash.steps.length }}</span>
                <button type="button" @click="note('Wstrzymaj ścieżkę')">Wstrzymaj</button>
                <button type="button" class="is-quiet" @click="note('Porzuć ścieżkę')">Porzuć</button>
              </div>
            </div>
            <p class="tpp-dash__lead">{{ dash.description }}</p>
          </header>

          <div class="tpp-dash__grid">
            <!-- Left: now + timeline -->
            <div class="tpp-dash__main">
              <section class="tpp-dash__now" aria-label="Teraz">
                <header><span>Teraz</span><small>{{ phaseTitle(dash) }}</small></header>
                <div class="tpp-dash__now-body">
                  <span class="tpp-dash__now-icon"><AppIcon :name="nextStep(dash).icon" /></span>
                  <div>
                    <small>Krok {{ dash.currentStepIndex + 1 }}</small>
                    <strong>{{ nextStep(dash).title }}</strong>
                    <p>{{ dash.currentIntro }}</p>
                  </div>
                  <div class="tpp-dash__now-cta">
                    <em>{{ nextStep(dash).due ? 'zaplanowano na dziś' : `zaplanowano na ${nextStep(dash).dateLabel.replace('od ', '')}` }}</em>
                    <button type="button" @click="note(`Rozpocznij: ${nextStep(dash).title}`)">Rozpocznij</button>
                  </div>
                </div>
              </section>

              <section class="tpp-dash__timeline" aria-label="Kroki">
                <header><span>Kroki</span><small>{{ doneCount(dash) }} z {{ dash.steps.length }} za tobą</small></header>
                <div v-for="phase in phaseGroups(dash)" :key="phase.key" class="tpp-dash__phase" :class="{ 'is-current': phase.current, 'is-done': phase.done }">
                  <div class="tpp-dash__phase-head">
                    <span class="tpp-phase__dots" aria-hidden="true"><i v-for="dot in phase.dots" :key="dot.index" :class="`is-${dot.state}`" /></span>
                    <strong>{{ phase.title }}</strong>
                    <small>faza {{ phase.ordinal }} z {{ dash.phases.length }}<template v-if="phase.done"> · {{ phase.doneLabel }}</template></small>
                    <button v-if="phase.done && timelineMode === 'folded'" type="button" class="tpp-more" @click="toggleFold(phase.key)">{{ unfolded.has(phase.key) ? 'Zwiń' : `Pokaż kroki (${phase.dots.length})` }}</button>
                  </div>
                  <div v-if="!(phase.done && timelineMode === 'folded' && !unfolded.has(phase.key))" class="tpp-list">
                    <button v-for="step in phase.steps" :key="step.index" type="button" class="tpp-row tpp-row--child tpp-row--step" :class="{ 'is-done': step.state === 'done', 'is-locked': step.state === 'locked', 'is-current': step.state === 'current' }" @click="note(`Otwórz krok: ${step.title}`)">
                      <span class="tpp-row__icon"><AppIcon :name="step.icon" /></span>
                      <span class="tpp-row__copy"><strong>{{ step.title }}</strong><span>krok {{ step.index + 1 }}{{ step.optional ? ' · opcjonalny' : '' }}</span></span>
                      <em>{{ step.dateLabel }}</em>
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <!-- Right: state cards -->
            <div class="tpp-dash__side">
              <section class="tpp-card tpp-card--dash" aria-label="Praktyki">
                <header><span>Praktyki</span><small>obok kroków</small></header>
                <div class="tpp-list">
                  <div v-for="practice in dash.practices" :key="practice.slug" class="tpp-row tpp-row--child tpp-row--tray" :class="{ 'is-overdue': practice.due === 'overdue' }">
                    <button type="button" class="tpp-row__main" @click="note(`Otwórz praktykę: ${practice.title}`)">
                      <span class="tpp-row__icon"><AppIcon :name="practice.icon" /></span>
                      <span class="tpp-row__copy"><strong>{{ practice.title }}</strong><span>{{ practice.rhythm }}</span></span>
                      <em :class="{ 'is-overdue': practice.due === 'overdue' }">{{ practice.dueLabel }}</em>
                    </button>
                    <span v-if="practice.due === 'today' || practice.due === 'overdue'" class="tpp-tray" aria-label="Akcje praktyki">
                      <button type="button" title="Zrób teraz" @click="note('Zrób teraz')"><AppIcon name="play_arrow" /></button>
                      <button type="button" title="Przenieś na jutro" @click="note('Na jutro')"><AppIcon name="redo" /></button>
                      <button type="button" title="Pomiń" @click="note('Pomiń')"><AppIcon name="close" /></button>
                    </span>
                  </div>
                </div>
                <div class="tpp-actions tpp-actions--card" aria-label="Narzędzia ścieżki">
                  <button v-for="tool in dash.tools" :key="tool.id" type="button" :title="tool.title" @click="note(tool.title)">
                    <AppIcon :name="tool.icon" /><span>{{ tool.label }}</span>
                  </button>
                </div>
              </section>

              <section v-if="dash.weekTask" class="tpp-card tpp-card--dash" aria-label="W świecie">
                <header><span>W świecie</span><small>ten tydzień</small></header>
                <div class="tpp-list">
                  <button type="button" class="tpp-row tpp-row--child tpp-row--task" @click="note('Otwórz intencję w Planie Dnia')">
                    <span class="tpp-row__icon"><AppIcon name="mg-exercise-maintenance-plan" /></span>
                    <span class="tpp-row__copy"><strong>{{ dash.weekTask.title }}</strong><span>{{ timesLabel(dash.weekTask.times) }} · liczy się dzień z zapisem</span></span>
                    <em class="tpp-fraction" :class="{ 'is-met': dash.weekTask.done >= dash.weekTask.times }"><b>{{ dash.weekTask.done }}</b>/{{ dash.weekTask.times }}</em>
                  </button>
                </div>
                <div class="tpp-trend" role="img" :aria-label="`Nasilenie w kolejnych tygodniach: ${dash.severity.join(', ')}`">
                  <small>{{ dash.severityQuestion }}</small>
                  <span class="tpp-trend__bars"><i v-for="(value, i) in dash.severity" :key="i" :style="{ height: `${(value / 5) * 100}%` }" :title="`T${dash.severityFrom + i}: ${value}`" /></span>
                </div>
                <button type="button" class="tpp-more" @click="note('Historia zadań tygodnia')">Wcześniejsze tygodnie ({{ dash.weekHistory }})</button>
              </section>

              <section v-if="dash.moments" class="tpp-card tpp-card--dash" aria-label="Momenty">
                <header><span>Momenty</span><small>{{ momentsHeadline(dash) }}</small></header>
                <div v-if="dash.moments.length === 0" class="tpp-empty"><p>Nie ma jeszcze momentów wstydu. Pierwszy zapiszesz jednym klikiem.</p></div>
                <template v-else>
                  <div v-if="dash.moments.length >= 3" class="tpp-dist">
                    <div v-for="dist in distributions(dash)" :key="dist.key" class="tpp-dist__row" role="img" :aria-label="`${dist.label}: ${dist.aria}`">
                      <small>{{ dist.label }}</small>
                      <span class="tpp-dist__bar"><i v-for="seg in dist.segments" :key="seg.key" :class="`tone-${seg.tone}`" :style="{ flexGrow: seg.count }" :title="`${seg.label} · ${seg.count}`" /></span>
                      <span class="tpp-dist__legend"><span v-for="seg in dist.segments" :key="seg.key"><i :class="`tone-${seg.tone}`" />{{ seg.label }} <b>{{ seg.count }}</b></span></span>
                    </div>
                  </div>
                  <div class="tpp-list">
                    <button v-for="moment in recentMoments(dash, 5)" :key="moment.id" type="button" class="tpp-row tpp-row--child tpp-row--moment" @click="note(`Otwórz moment z ${moment.date}`)">
                      <span class="tpp-row__icon tpp-row__icon--date"><b>{{ moment.day }}</b><small>{{ moment.month }}</small></span>
                      <span class="tpp-row__copy"><strong>{{ moment.situation }}</strong><span>{{ aboutLabel(moment.about) }}<template v-if="moment.response.length"> · {{ responseLabels(moment.response) }}</template></span></span>
                    </button>
                  </div>
                </template>
                <div class="tpp-actions tpp-actions--card">
                  <button type="button" @click="note('Zapisz moment')"><AppIcon name="mg-exercise-shame-log" /><span>Zapisz moment</span></button>
                  <button v-if="(dash.moments?.length ?? 0) > 5" type="button" @click="note('Wszystkie momenty')"><AppIcon name="history" /><span>Wszystkie ({{ dash.moments?.length }})</span></button>
                </div>
              </section>

              <section v-if="dash.responseCard !== undefined" class="tpp-card tpp-card--dash" aria-label="Twoja odpowiedź na wstyd">
                <header><span>Twoja odpowiedź na wstyd</span><small>{{ dash.responseCard ? `zapisana ${dash.responseCard.savedAt}` : 'krok 4 ścieżki' }}</small></header>
                <div v-if="dash.responseCard" class="tpp-well">
                  <dl>
                    <div><dt>Po czym poznam</dt><dd>{{ dash.responseCard.signals }}</dd></div>
                    <div><dt>Nazwę to</dt><dd>„{{ dash.responseCard.name }}”</dd></div>
                    <div><dt>Usłyszę</dt><dd>„{{ dash.responseCard.sentence }}”</dd></div>
                    <div><dt>Mój ruch</dt><dd>{{ dash.responseCard.moves.join(' · ') }}</dd></div>
                  </dl>
                  <div class="tpp-well__actions">
                    <button type="button" @click="note('Pokaż pełną odpowiedź')"><AppIcon name="open_in_new" /><span>Otwórz</span></button>
                    <button type="button" @click="note('Zmień odpowiedź')"><AppIcon name="edit" /><span>Zmień</span></button>
                  </div>
                </div>
                <div v-else class="tpp-empty"><p>Odpowiedź powstaje w kroku 4 „Odpowiedź na wstyd”. Do tego czasu w chwili wstydu masz oddech 4/6 i jedno pytanie: o czym jest ten wstyd?</p></div>
              </section>

              <section class="tpp-card tpp-card--dash" aria-label="Pomiar">
                <header><span>Pomiar na początku i na końcu</span><small>{{ dash.outcome.label }}</small></header>
                <div class="tpp-outcome">
                  <div><small>Na początku</small><strong>{{ dash.outcome.before }}</strong><span>{{ dash.outcome.beforeNote }}</span></div>
                  <div class="is-pending"><small>Na końcu</small><strong>–</strong><span>krok {{ dash.steps.length - 1 }}</span></div>
                </div>
              </section>

              <section class="tpp-card tpp-card--dash" aria-label="Ćwiczenia ścieżki">
                <header><span>Ćwiczenia ścieżki</span><small>{{ dash.exercises.length }} · także poza krokiem</small></header>
                <div class="tpp-chips">
                  <button v-for="exercise in dash.exercises" :key="exercise.slug" type="button" :title="exercise.title" @click="note(`Uruchom: ${exercise.title}`)">
                    <AppIcon :name="exercise.icon" /><span>{{ exercise.title }}</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </article>
      </div>
      <p v-if="lastNote" class="tpp__note tpp__note--below"><AppIcon name="touch_app" /> {{ lastNote }}</p>
    </section>

    <!-- 04 · Decyzje -->
    <section class="tpp__block">
      <header class="tpp__block-head">
        <span class="lab-eyebrow">04 · Decyzje do podjęcia</span>
        <h2>Co ustalić przed wdrożeniem</h2>
      </header>
      <ul class="tpp__decisions">
        <li v-for="decision in decisions" :key="decision.id">
          <span class="tpp__decision-id">{{ decision.id }}</span>
          <div><strong>{{ decision.title }}</strong><p>{{ decision.body }}</p></div>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'

// ---------------------------------------------------------------------------
// Sample: today = Saturday 26 wrz 2026. The shame path uses the v2 step list
// (shipped 2026-09-26 in programCatalog); the anxiety path matches the product.

type PathsMode = 'one' | 'two'
type About = 'act' | 'event' | 'demand' | 'unsure'
type Compass = 'withdraw' | 'avoid' | 'attackSelf' | 'attackOthers'
type StepState = 'done' | 'skipped' | 'current' | 'locked'

interface StepSample { slug: string; icon: string; title: string; optional?: boolean; gap: number; doneAt?: string }
interface PhaseSample { key: string; title: string; fromStepIndex: number }
interface PracticeSample { slug: string; icon: string; title: string; rhythm: string; due: 'today' | 'tomorrow' | 'overdue' | 'later'; dueLabel: string }
interface ToolSample { id: string; icon: string; label: string; title: string; kind: 'log' | 'card' | 'practice' }
interface MomentSample { id: string; date: string; day: string; month: string; situation: string; about: About; compass: Compass; response: string[] }
interface ResponseCard { savedAt: string; signals: string; name: string; sentence: string; moves: string[] }
interface PathSample {
  id: 'shame' | 'anxiety'
  icon: string
  title: string
  description: string
  currentIntro: string
  steps: StepSample[]
  phases: PhaseSample[]
  currentStepIndex: number
  completed: number[]
  skipped: number[]
  nextStepFrom: string
  practices: PracticeSample[]
  tools: ToolSample[]
  weekTask?: { title: string; times: number; done: number }
  weekHistory: number
  severity: number[]
  severityFrom: number
  severityQuestion: string
  outcome: { label: string; before: string; beforeNote: string }
  moments?: MomentSample[]
  responseCard?: ResponseCard | null
  exercises: { slug: string; icon: string; title: string }[]
}

const SHAME_STEPS: StepSample[] = [
  { slug: 'scs-sf', icon: 'mg-exercise-scs-sf', title: 'Współczucie dla siebie (SCS-SF)', gap: 0, doneAt: '10 wrz' },
  { slug: 'shame-map', icon: 'mg-exercise-shame-map', title: 'Mapa wstydu', gap: 1, doneAt: '12 wrz' },
  { slug: 'compassionate-image', icon: 'mg-exercise-compassionate-image', title: 'Obraz współczujący', gap: 3, doneAt: '16 wrz' },
  { slug: 'shame-response', icon: 'mg-exercise-maintenance-plan', title: 'Odpowiedź na wstyd', gap: 2, doneAt: '18 wrz' },
  { slug: 'shame-or-guilt', icon: 'mg-exercise-shame-or-guilt', title: 'O czym jest ten wstyd?', gap: 3 },
  { slug: 'thought-record', icon: 'mg-exercise-thought-record', title: 'Rejestr myśli', gap: 3 },
  { slug: 'trailhead', icon: 'mg-exercise-trailhead', title: 'Punkt wejścia', gap: 4 },
  { slug: 'protector-appreciation', icon: 'mg-exercise-protector-appreciation', title: 'Docenienie protektora', gap: 3 },
  { slug: 'compassionate-letter', icon: 'mg-exercise-compassionate-letter', title: 'List współczucia', gap: 3 },
  { slug: 'core-beliefs', icon: 'mg-exercise-core-beliefs', title: 'Przekonania kluczowe', gap: 4 },
  { slug: 'behavioral-experiment', icon: 'mg-exercise-behavioral-experiment', title: 'Eksperyment behawioralny', gap: 5 },
  { slug: 'shadow-beliefs', icon: 'mg-exercise-shadow-beliefs', title: 'Ukryte przekonania', optional: true, gap: 4 },
  { slug: 'exile-witnessing', icon: 'mg-exercise-exile-witnessing', title: 'Świadkowanie', optional: true, gap: 4 },
  { slug: 'scs-sf-2', icon: 'mg-exercise-scs-sf', title: 'Współczucie dla siebie (SCS-SF)', gap: 4 },
  { slug: 'maintenance-plan', icon: 'mg-exercise-maintenance-plan', title: 'Plan podtrzymania', gap: 0 },
]
const SHAME_PHASES: PhaseSample[] = [
  { key: 'recognition', title: 'Rozpoznawanie', fromStepIndex: 0 },
  { key: 'compassion', title: 'Współczująca strona', fromStepIndex: 2 },
  { key: 'about', title: 'O czym jest ten wstyd', fromStepIndex: 4 },
  { key: 'critic', title: 'Krytyk', fromStepIndex: 6 },
  { key: 'beliefs', title: 'Przekonania', fromStepIndex: 9 },
  { key: 'outOfHiding', title: 'Wyjście z ukrycia', fromStepIndex: 10 },
  { key: 'deeper', title: 'Głębiej', fromStepIndex: 11 },
  { key: 'consolidation', title: 'Utrwalenie', fromStepIndex: 13 },
]
const SHAME_MOMENTS: MomentSample[] = [
  { id: 'm1', date: '25 wrz', day: '25', month: 'wrz', situation: 'Nie wiedziałem, o co chodzi w skrócie, który wszyscy na spotkaniu znali', about: 'demand', compass: 'withdraw', response: ['question', 'breath'] },
  { id: 'm2', date: '23 wrz', day: '23', month: 'wrz', situation: 'Obiecałem M. pomoc przy przeprowadzce i nie odezwałem się', about: 'act', compass: 'avoid', response: ['repair'] },
  { id: 'm3', date: '21 wrz', day: '21', month: 'wrz', situation: 'Zapłakałem przy rodzicach, gdy mówili o babci', about: 'demand', compass: 'attackSelf', response: ['named', 'sentence'] },
  { id: 'm4', date: '19 wrz', day: '19', month: 'wrz', situation: 'Nie dostałem projektu, o który prosiłem od pół roku', about: 'event', compass: 'withdraw', response: ['nothing'] },
  { id: 'm5', date: '16 wrz', day: '16', month: 'wrz', situation: 'Poprosiłem o przesunięcie terminu, bo nie dawałem rady', about: 'demand', compass: 'attackSelf', response: ['question', 'contact'] },
  { id: 'm6', date: '14 wrz', day: '14', month: 'wrz', situation: 'Skrytykowałem A. przy zespole za drobiazg', about: 'act', compass: 'attackOthers', response: ['repair', 'breath'] },
]
const SHAME_RESPONSE: ResponseCard = {
  savedAt: '18 wrz',
  signals: 'gorąco na twarzy, spuszczam wzrok, chcę wyjść',
  name: 'To jest wstyd. To mój krytyk, nie fakt.',
  sentence: 'Jesteś człowiekiem i to boli. Jestem z tobą.',
  moves: ['podnieś wzrok', 'zostań minutę dłużej', 'dłoń na sercu'],
}

const ANXIETY_STEPS: StepSample[] = [
  { slug: 'gad-7', icon: 'mg-exercise-gad-7', title: 'Niepokój (GAD-7)', gap: 0, doneAt: '10 wrz' },
  { slug: 'ius-12', icon: 'mg-exercise-gad-7', title: 'Nietolerancja niepewności (IUS-12)', optional: true, gap: 0, doneAt: '10 wrz' },
  { slug: 'anxiety-map', icon: 'mg-exercise-shame-map', title: 'Mapa lęku', gap: 1, doneAt: '11 wrz' },
  { slug: 'worry-tree', icon: 'mg-exercise-worry-tree', title: 'Drzewo zmartwień', gap: 2, doneAt: '13 wrz' },
  { slug: 'cognitive-distortions', icon: 'mg-exercise-thought-record', title: 'Zniekształcenia poznawcze', gap: 3, doneAt: '16 wrz' },
  { slug: 'thought-record', icon: 'mg-exercise-thought-record', title: 'Rejestr myśli', gap: 3, doneAt: '22 wrz' },
  { slug: 'behavioral-experiment', icon: 'mg-exercise-behavioral-experiment', title: 'Eksperyment behawioralny', gap: 4 },
  { slug: 'structured-problem-solving', icon: 'mg-exercise-core-beliefs', title: 'Ustrukturyzowane rozwiązywanie problemów', gap: 3 },
  { slug: 'graded-exposure', icon: 'mg-exercise-graded-exposure', title: 'Ekspozycja stopniowana', gap: 4 },
  { slug: 'graded-exposure-2', icon: 'mg-exercise-graded-exposure', title: 'Ekspozycja stopniowana · ciąg dalszy', gap: 7 },
  { slug: 'paradoxical-intention', icon: 'mg-exercise-shadow-beliefs', title: 'Intencja paradoksalna', optional: true, gap: 4 },
  { slug: 'dereflection', icon: 'mg-exercise-shadow-beliefs', title: 'Derefleksja', optional: true, gap: 3 },
  { slug: 'behavioral-activation', icon: 'mg-exercise-positive-data-log', title: 'Aktywizacja behawioralna', optional: true, gap: 3 },
  { slug: 'gad-7-2', icon: 'mg-exercise-gad-7', title: 'Niepokój (GAD-7)', gap: 4 },
  { slug: 'maintenance-plan', icon: 'mg-exercise-maintenance-plan', title: 'Plan podtrzymania', gap: 0 },
]
const ANXIETY_PHASES: PhaseSample[] = [
  { key: 'map', title: 'Mapa lęku', fromStepIndex: 0 },
  { key: 'thoughts', title: 'Myśli', fromStepIndex: 4 },
  { key: 'uncertainty', title: 'Niepewność', fromStepIndex: 6 },
  { key: 'problems', title: 'Problemy realne', fromStepIndex: 7 },
  { key: 'approach', title: 'Podejście', fromStepIndex: 8 },
  { key: 'stance', title: 'Postawa', fromStepIndex: 10 },
  { key: 'consolidation', title: 'Utrwalenie', fromStepIndex: 13 },
]

function uniqueExercises(steps: StepSample[]) {
  const seen = new Set<string>()
  return steps
    .filter(step => (seen.has(step.title) ? false : (seen.add(step.title), true)))
    .map(step => ({ slug: step.slug, icon: step.icon, title: step.title }))
}

// ---------------------------------------------------------------------------
// Toolbar state
const pathsMode = ref<PathsMode>('one')
const fieldActions = ref<'two' | 'one' | 'none'>('two')
const fieldWeek = ref(false)
const stepToday = ref(false)
const dashPath = ref<'shame' | 'anxiety'>('shame')
const timelineMode = ref<'folded' | 'full'>('folded')
const momentsCount = ref<0 | 2 | 6>(6)
const hasResponse = ref(true)
const unfolded = ref<Set<string>>(new Set())
const lastNote = ref('')
function note(text: string) { lastNote.value = text }
function toggleFold(key: string) {
  const next = new Set(unfolded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  unfolded.value = next
}
function resetAll() {
  pathsMode.value = 'one'; fieldActions.value = 'two'; fieldWeek.value = false; stepToday.value = false
  dashPath.value = 'shame'; timelineMode.value = 'folded'; momentsCount.value = 6; hasResponse.value = true
  unfolded.value = new Set(); lastNote.value = ''
}

const allPaths = computed<PathSample[]>(() => [
  {
    id: 'shame',
    icon: 'mg-exercise-compassionate-image',
    title: 'Ze wstydu do współczucia',
    description: 'Osiem tygodni pracy ze wstydem: najpierw rozpoznawanie i współczująca strona, potem pytanie „o czym jest ten wstyd”, krytyk, przekonania i wyjście z ukrycia. Obok kroków Momenty co dwa dni i przerwa na współczucie.',
    currentIntro: 'Wybierz moment z Momentów albo opisz nową sytuację. Sprawdzisz, czy ten wstyd jest o tym, co zrobiłeś, o tym, co cię spotkało, czy o tym, jaki powinieneś być. Od odpowiedzi zależy, co dalej: naprawa, opieka albo sprawdzenie.',
    steps: SHAME_STEPS,
    phases: SHAME_PHASES,
    currentStepIndex: 4,
    completed: [0, 1, 2, 3],
    skipped: [],
    nextStepFrom: 'od 28 wrz',
    practices: [
      { slug: 'moment-shame', icon: 'mg-exercise-shame-log', title: 'Momenty (wstyd)', rhythm: 'co 2 dni · do kroku 10', due: 'today', dueLabel: 'na dziś' },
      { slug: 'self-compassion-break', icon: 'mg-exercise-self-compassion-break', title: 'Przerwa na współczucie', rhythm: 'co 2 dni · do końca ścieżki', due: 'tomorrow', dueLabel: 'jutro' },
    ],
    tools: [
      { id: 'moment', icon: 'mg-exercise-shame-log', label: 'Zapisz moment', title: 'Momenty · wariant wstyd, bez kroku wyboru kategorii', kind: 'log' },
      { id: 'response', icon: 'mg-exercise-maintenance-plan', label: 'Moja odpowiedź', title: 'Twoja odpowiedź na wstyd', kind: 'card' },
      { id: 'break', icon: 'mg-exercise-self-compassion-break', label: 'Przerwa', title: 'Przerwa na współczucie · poza rytmem', kind: 'practice' },
    ],
    weekTask: { title: 'Przy jednym momencie wstydu zadaj pytanie: czy bliska osoba na moim miejscu powinna się tego wstydzić?', times: 3, done: 2 },
    weekHistory: 2,
    severity: [4, 3],
    severityFrom: 37,
    severityQuestion: 'Jak bardzo wstyd rządził tym tygodniem?',
    outcome: { label: 'Współczucie dla siebie', before: '2,4 z 5', beforeNote: 'niskie · 10 wrz' },
    moments: SHAME_MOMENTS.slice(0, momentsCount.value),
    responseCard: hasResponse.value ? SHAME_RESPONSE : null,
    exercises: uniqueExercises(SHAME_STEPS),
  },
  {
    id: 'anxiety',
    icon: 'mg-exercise-worry-tree',
    title: 'Lęk: podejść zamiast unikać',
    description: 'Osiem tygodni pracy z niepokojem i zamartwianiem się. Poznajesz swój lęk, uczysz się odkładać zmartwienia i sprawdzać przewidywania, a potem krok po kroku podchodzisz do tego, czego unikasz.',
    currentIntro: 'Wybierz jedno zabezpieczenie z mapy i zrezygnuj z niego na próbę, na przykład nie sprawdzaj trzy razy maila. Zapisz, co przewidujesz.',
    steps: ANXIETY_STEPS,
    phases: ANXIETY_PHASES,
    currentStepIndex: 6,
    completed: [0, 1, 2, 3, 4, 5],
    skipped: [],
    nextStepFrom: 'na dziś',
    practices: [
      { slug: 'worry-postponement', icon: 'mg-exercise-worry-postponement', title: 'Pora na zmartwienia', rhythm: 'codziennie · do kroku 9', due: 'overdue', dueLabel: 'zaległa od 25 wrz' },
      { slug: 'paced-breathing', icon: 'mg-exercise-paced-breathing', title: 'Oddech kojący', rhythm: 'co 2 dni · do końca ścieżki', due: 'later', dueLabel: '28 wrz' },
    ],
    tools: [
      { id: 'worry', icon: 'mg-exercise-worry-postponement', label: 'Odłóż zmartwienie', title: 'Pora na zmartwienia', kind: 'log' },
      { id: 'breath', icon: 'mg-exercise-paced-breathing', label: 'Oddech', title: 'Oddech kojący', kind: 'practice' },
    ],
    weekTask: { title: 'Podejmij małą decyzję bez upewniania się', times: 3, done: 1 },
    weekHistory: 2,
    severity: [4, 4, 3],
    severityFrom: 36,
    severityQuestion: 'Jak bardzo lęk i zamartwianie się ograniczały ten tydzień?',
    outcome: { label: 'Nasilenie niepokoju', before: '13 z 21', beforeNote: 'umiarkowane · 10 wrz' },
    exercises: uniqueExercises(ANXIETY_STEPS),
  },
])
const paths = computed(() => (pathsMode.value === 'two' ? allPaths.value : allPaths.value.filter(path => path.id === 'shame')))
const dash = computed(() => allPaths.value.find(path => path.id === dashPath.value) ?? allPaths.value[0])

// ---------------------------------------------------------------------------
// Derivations (mirrors of programWeekService.currentPhase / deriveStepStates)
function phaseOf(path: PathSample, index: number): PhaseSample {
  return [...path.phases].reverse().find(phase => phase.fromStepIndex <= index) ?? path.phases[0]
}
function phaseTitle(path: PathSample) { return phaseOf(path, path.currentStepIndex).title }
function stepState(path: PathSample, index: number): StepState {
  if (path.completed.includes(index)) return 'done'
  if (path.skipped.includes(index)) return 'skipped'
  if (index === path.currentStepIndex) return 'current'
  return 'locked'
}
function doneCount(path: PathSample) { return path.completed.length + path.skipped.length }
function nextStep(path: PathSample) {
  const step = path.steps[path.currentStepIndex]
  const due = path.id === 'shame' ? stepToday.value : true
  return { ...step, due, dateLabel: due ? 'na dziś' : path.nextStepFrom }
}
function duePractices(path: PathSample) { return path.practices.filter(practice => practice.due === 'today' || practice.due === 'overdue') }
function fieldTools(path: PathSample) {
  const primary = path.tools.filter(tool => tool.kind !== 'practice')
  return fieldActions.value === 'one' ? primary.slice(0, 1) : primary.slice(0, 2)
}

function phaseGroups(path: PathSample) {
  return path.phases.map((phase, i) => {
    const to = path.phases[i + 1]?.fromStepIndex ?? path.steps.length
    const steps = path.steps.slice(phase.fromStepIndex, to).map((step, k) => {
      const index = phase.fromStepIndex + k
      const state = stepState(path, index)
      const dateLabel = state === 'done'
        ? `ukończono ${step.doneAt ?? ''}`
        : state === 'skipped'
          ? 'pominięto'
          : index === path.currentStepIndex
            ? (nextStep(path).due ? 'zaplanowano na dziś' : `zaplanowano ${nextStep(path).dateLabel.replace('od ', 'na ')}`)
            : 'odblokuje się po poprzednim kroku'
      return { ...step, index, state, dateLabel }
    })
    const dots = steps.map(step => ({ index: step.index, state: step.state }))
    const current = steps.some(step => step.state === 'current')
    const done = steps.every(step => step.state === 'done' || step.state === 'skipped')
    const last = [...steps].reverse().find(step => step.doneAt)
    return { key: phase.key, title: phase.title, ordinal: i + 1, steps, dots, current, done, doneLabel: last ? `ukończona ${last.doneAt}` : '' }
  })
}

function timesLabel(times: number) { return times === 1 ? 'raz w tygodniu' : `${times} razy w tygodniu` }

const ABOUT: Record<About, { label: string; tone: 'a' | 'b' | 'c' | 'd' }> = {
  act: { label: 'czyn', tone: 'a' },
  event: { label: 'zdarzenie', tone: 'b' },
  demand: { label: 'wymaganie', tone: 'c' },
  unsure: { label: 'jeszcze nie wiem', tone: 'd' },
}
const COMPASS: Record<Compass, string> = { withdraw: 'wycofanie', avoid: 'unikanie', attackSelf: 'atak na siebie', attackOthers: 'atak na innych' }
const RESPONSE: Record<string, string> = { breath: 'oddech', named: 'nazwałem', question: 'pytanie', sentence: 'zdanie', contact: 'kontakt', repair: 'naprawa', test: 'test bliskiej osoby', nothing: 'nic, tym razem' }
function aboutLabel(about: About) { return ABOUT[about].label }
function responseLabels(keys: string[]) { return keys.map(key => RESPONSE[key] ?? key).join(', ') }
function recentMoments(path: PathSample, limit: number) { return (path.moments ?? []).slice(0, limit) }
function momentsHeadline(path: PathSample) {
  const n = path.moments?.length ?? 0
  return n ? `${n} z 14 dni` : 'ostatnie 14 dni'
}
function distributions(path: PathSample) {
  const moments = path.moments ?? []
  const count = <K extends string>(keys: K[], pick: (m: MomentSample) => K[]) =>
    keys.map(key => ({ key, count: moments.filter(m => pick(m).includes(key)).length })).filter(seg => seg.count > 0)
  const tones = ['a', 'b', 'c', 'd'] as const
  const about = count(['act', 'event', 'demand', 'unsure'] as About[], m => [m.about]).map(seg => ({ ...seg, label: ABOUT[seg.key].label, tone: ABOUT[seg.key].tone }))
  const compass = count(['withdraw', 'avoid', 'attackSelf', 'attackOthers'] as Compass[], m => [m.compass]).map((seg, i) => ({ ...seg, label: COMPASS[seg.key], tone: tones[i % 4] }))
  const responded = moments.filter(m => m.response.some(key => key !== 'nothing')).length
  const response = [
    { key: 'yes', label: 'z odpowiedzią', count: responded, tone: 'a' as const },
    { key: 'no', label: 'nic, tym razem', count: moments.length - responded, tone: 'd' as const },
  ].filter(seg => seg.count > 0)
  return [
    { key: 'about', label: 'O czym', segments: about, aria: about.map(seg => `${seg.label} ${seg.count}`).join(', ') },
    { key: 'compass', label: 'Pierwsza reakcja', segments: compass, aria: compass.map(seg => `${seg.label} ${seg.count}`).join(', ') },
    { key: 'response', label: 'Odpowiedź', segments: response, aria: response.map(seg => `${seg.label} ${seg.count}`).join(', ') },
  ]
}

// ---------------------------------------------------------------------------
// 01 · findings
const findings = [
  { id: 1, shot: 'field', title: 'Pole znika w dni bez kroku', where: 'NextDayPrograms.vue · v-if="programGroups.length" po filtrze dayRef <= today', body: 'Grupa ścieżki renderuje się tylko, gdy krok albo praktyka przypada na dziś lub jest zaległa. Ścieżka wstydu z krokiem „od 28 wrz” i praktyką co 2 dni jest w Dzisiaj co drugi dzień, a między krokami znika na kilka dni. Wiersz mówi „krok 7 z 15” i nic więcej.', fix: 'Pole istnieje zawsze, gdy zapis jest aktywny. Wiersz ścieżki z fazą prowadzi do widoku ścieżki; najbliższy krok jest zawsze, także z datą przyszłą.' },
  { id: 2, shot: 'field', title: 'Narzędzia ścieżki są o klik dalej', where: 'ProgramDetailView · plan wstydu v2 D6, D7', body: 'Momenty i odpowiedź na wstyd wymagają wejścia w widok ścieżki albo katalog. D7 przenosi uruchamianie ćwiczeń ścieżki do pola w Dzisiaj, ale pole ma zostać małe.', fix: 'Najwyżej dwie stałe akcje pod wierszami: zapis w chwili (Zapisz moment) i karta osobista (Moja odpowiedź). Cała reszta w widoku ścieżki.' },
  { id: 3, shot: 'detail', title: 'Widok ścieżki to jedna długa kolumna', where: 'ProgramDetailView.vue · ExercisePage (szerokość „reading”)', body: 'Pomiar, praktyki, „W świecie” z wyborem zadania i wykresem nasilenia, a pod nimi 15 kafli kroków w siedmiu fazach: ok. 3100 px przy 1440 px. Bieżący krok jest w połowie strony, ukończone kroki zajmują tyle samo miejsca co bieżący.', fix: 'Dashboard: „Teraz” z bieżącym krokiem na górze lewej kolumny, oś kroków z ukończonymi fazami zwiniętymi do jednej linii, po prawej karty: praktyki i narzędzia, W świecie, Momenty, odpowiedź na wstyd, pomiar, ćwiczenia ścieżki.' },
  { id: 4, shot: 'detail', title: 'Momenty i karta odpowiedzi nie mają jeszcze miejsca', where: 'plan wstydu v2 §6 · P4 (summarizeMoments) w toku', body: 'Momenty i odpowiedź na wstyd są już w repo (3174a7e, 4134d57), ale poza runnerem nigdzie nie wracają: brak listy, rozkładów i karty odpowiedzi. Plan wstydu kierował je do pola w Dzisiaj.', fix: 'Dwie karty w prawej kolumnie widoku ścieżki: Momenty (rozkłady od trzech wpisów + ostatnie 5 + Zapisz moment) i Twoja odpowiedź na wstyd.' },
]
const findingId = ref(1)
const activeFinding = computed(() => findings.find(finding => finding.id === findingId.value) ?? findings[0])

// 04 · decisions
const decisions = [
  { id: 'D1', title: 'Pole w Dzisiaj = nawigacja i jedno sprawdzenie', body: 'Zawsze przy aktywnym zapisie. Wiersz ścieżki (tytuł, faza · krok n z m) prowadzi do widoku ścieżki. Pod nim najbliższy krok z datą (zawsze) i praktyki na dziś lub zaległe z tacką. Bez rozwijania, bez sekcji. Ścieżka bez pozycji na dziś to 2 wiersze; z praktyką 3.' },
  { id: 'D2', title: 'Stałe akcje: najwyżej dwie, tylko „w chwili”', body: 'Zapis w chwili (Momenty w wariancie ścieżki) i karta osobista (odpowiedź na wstyd, plan pauzy w złości). Praktyki poza rytmem i ćwiczenia ścieżki zostają w widoku ścieżki. Źródło: nowe pole definicji ścieżki tools[] (kind: log | card); do czasu jego dodania mapa per slug w komponencie. Alternatywa w toolbarze: jedna akcja albo żadna.' },
  { id: 'D3', title: 'Ułamek tygodnia w polu: nie', body: 'Propozycja: ułamek zadania tygodnia zostaje w Planie Dnia (wiersz intencji) i w widoku ścieżki. W polu byłby drugim licznikiem tej samej intencji na jednym ekranie. Toolbar ma przełącznik do oceny (Q2).' },
  { id: 'D4', title: 'Widok ścieżki staje się dashboardem, nie nowym widokiem', body: 'Ta sama trasa /exercises/programs/:slug i ProgramDetailView, ale szerokość „wide” PageContainer i dwie kolumny: lewa „Teraz” + oś kroków, prawa karty stanu. Bez nowej trasy, bez drugiego miejsca dla tych samych danych; kafle kroków i istniejące ProgramOutcomeSummary / ProgramPracticeRail / ProgramWeekPanel przechodzą do kart.' },
  { id: 'D5', title: 'Oś kroków: ukończone fazy zwinięte', body: 'Faza w całości ukończona zwija się do jednej linii z kropkami i datą ukończenia („Pokaż kroki (n)” rozwija). Bieżąca i przyszłe fazy pokazują kafle. Alternatywa „pełna lista, jak dziś” w toolbarze.' },
  { id: 'D6', title: 'Momenty i odpowiedź jako karty widoku ścieżki', body: 'Karta Momenty: rozkłady od trzech wpisów z 14 dni (o czym · pierwsza reakcja · odpowiedź), ostatnie 5, akcje Zapisz moment i Wszystkie. Karta odpowiedzi: cztery wiersze (po czym poznam · nazwę to · usłyszę · mój ruch), Otwórz i Zmień, pusty stan przed krokiem 4. Zależność: summarizeMoments (P4 planu wstydu) i wpisy shame-response (już w repo).' },
  { id: 'D7', title: 'Komponenty', body: 'NextDayPaths.vue (pole, własny spec) zamiast grupy ścieżek w NextDayPrograms.vue, który zostaje od Powtórek. Widok ścieżki: ProgramDetailView.vue przebudowany na siatkę, nowe ProgramNowCard.vue, ProgramMomentsCard.vue, ProgramResponseCard.vue, ProgramExercisesCard.vue; oś kroków wydzielona do ProgramTimeline.vue z fazami zwijanymi.' },
  { id: 'D8', title: 'Kolejność wdrożenia', body: '1) Pole w Dzisiaj na dzisiejszym modelu (mały zakres, od razu domyka lukę D7 planu wstydu). 2) Dashboard ścieżki: siatka + Teraz + oś z fazami zwijanymi + przeniesienie istniejących paneli do kart. 3) Karty Momenty i odpowiedź po P4 planu wstydu. Każdy krok osobny commit, HEAD sprawdzony (druga sesja pracuje w tym checkoucie).' },
]
</script>

<style scoped>
.tpp { --tpp-ink: var(--mg-color-ink); --tpp-muted: var(--mg-color-muted); color: var(--tpp-ink); }
.tpp__block { margin-top: 30px; }
.tpp__block-head { margin-bottom: 14px; }
.tpp__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }

/* 01 · evidence */
.tpp__evidence { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; }
.tpp__findings { display: grid; align-content: start; gap: 6px; }
.tpp__findings button { display: grid; grid-template-columns: 24px 1fr; gap: 9px; align-items: start; width: 100%; padding: 10px 11px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); text-align: left; cursor: pointer; font: inherit; color: inherit; }
.tpp__findings button.active { background: var(--mg-color-paper); border-color: color-mix(in srgb, var(--mg-color-primary) 45%, transparent); }
.tpp__findings button:hover { background: var(--mg-color-paper); }
.tpp__findings strong { display: block; font-size: 12px; line-height: 1.35; }
.tpp__findings small { display: block; margin-top: 2px; color: var(--tpp-muted); font-size: 10px; }
.tpp__finding-index { display: grid; place-items: center; width: 22px; height: 22px; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-on-primary, #fff); background: var(--mg-color-primary-fill); font-size: 10px; font-weight: 800; }
.tpp__shot { display: grid; grid-template-columns: minmax(0, 1fr) 300px; margin: 0; overflow: hidden; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.tpp__shot-frame { display: grid; place-items: start center; max-height: 640px; padding: 16px; overflow: auto; background: color-mix(in srgb, var(--mg-color-surface) 60%, rgb(19 40 66 / .08)); }
.tpp__shot-frame img { width: min(100%, 480px); height: auto; border-radius: 12px; box-shadow: 0 12px 30px rgb(19 40 66 / .16); }
.tpp__shot-frame.is-tall img { width: 100%; }
.tpp__shot figcaption { display: grid; align-content: start; gap: 10px; padding: 18px; border-left: 1px solid var(--mg-color-border); }
.tpp__shot figcaption strong { font-size: 14px; line-height: 1.3; }
.tpp__shot figcaption p { margin: 0; color: var(--tpp-muted); font-size: 12px; line-height: 1.55; }
.tpp__fix { display: flex; gap: 6px; padding: 10px 12px; border-radius: var(--mg-radius-sm); color: var(--mg-color-primary-strong) !important; background: var(--mg-color-paper); font-weight: 700; }
.tpp__fix :deep(.material-symbols-outlined) { flex: 0 0 auto; font-size: 16px; }

/* toolbar + stage */
.tpp__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border-radius: 18px; }
.tpp__toolbar label { display: grid; gap: 5px; color: var(--tpp-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.tpp__toolbar select { min-height: 34px; min-width: 150px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--tpp-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; text-transform: none; letter-spacing: 0; }
.tpp__toolbar .tpp__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.tpp__check input { accent-color: var(--mg-color-primary); }
.tpp__reset { min-height: 34px; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
.tpp__stage-wrap { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 22px; align-items: start; }
.tpp__stage { display: grid; justify-content: center; padding: 24px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.tpp__stage--wide { justify-content: stretch; }
.tpp__legend { padding: 14px 16px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); font-size: 12px; line-height: 1.5; }
.tpp__legend strong { display: block; margin-bottom: 6px; font-size: 12px; }
.tpp__legend ol { margin: 0; padding-left: 18px; color: var(--tpp-muted); }
.tpp__legend li + li { margin-top: 6px; }
.tpp__note { display: flex; gap: 6px; align-items: center; margin: 12px 0 0; padding: 8px 10px; border-radius: var(--mg-radius-sm); color: var(--mg-color-primary-strong); background: var(--mg-color-paper); font-weight: 700; font-size: 12px; }
.tpp__note--below { width: fit-content; }
.tpp__note :deep(.material-symbols-outlined) { font-size: 16px; }

/* decisions */
.tpp__decisions { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.tpp__decisions li { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 12px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-mist); }
.tpp__decision-id { color: var(--mg-color-primary-strong); font-size: 12px; font-weight: 900; }
.tpp__decisions strong { display: block; font-size: 13px; }
.tpp__decisions p { margin: 4px 0 0; color: var(--tpp-muted); font-size: 12px; line-height: 1.5; }

/* ---------------------------------------------------------------------------
   Right-column replica (next-day-context grammar). */
.tpp-column { display: grid; align-content: start; gap: var(--mg-space-4); width: 440px; }
.tpp-card { display: grid; gap: var(--mg-space-2); padding: var(--mg-space-3); border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); container-type: inline-size; }
.tpp-card > header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--mg-space-2); color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.tpp-card > header small { font-size: var(--mg-font-size-xs); font-weight: 600; letter-spacing: 0; text-transform: none; }
.tpp-card--context { opacity: .82; }
.tpp-list { display: grid; }

.tpp-row { position: relative; display: grid; grid-template-columns: 1.75rem minmax(0, 1fr) auto; column-gap: var(--mg-space-3); align-items: center; width: 100%; min-width: 0; min-height: 3.5rem; padding: var(--mg-space-2) var(--mg-space-1); border: 0; border-bottom: 1px solid var(--mg-color-border); border-radius: 0; color: var(--tpp-ink); background: transparent; text-align: left; cursor: pointer; font: inherit; }
.tpp-row--static { cursor: default; }
.tpp-row--child { min-height: 3rem; padding-left: var(--mg-space-6); }
.tpp-row:hover:not(.tpp-row--static) { background: var(--mg-color-mist); }
.tpp-row:focus-visible, .tpp-row__main:focus-visible, .tpp-tray button:focus-visible, .tpp-actions button:focus-visible, .tpp-chips button:focus-visible, .tpp-more:focus-visible { outline: 2px solid var(--mg-color-focus); outline-offset: 2px; border-radius: var(--mg-radius-sm); }
.tpp-row__icon { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; color: var(--mg-color-primary-strong); }
.tpp-row__icon :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-lg); }
.tpp-row__copy { display: grid; gap: 2px; min-width: 0; }
.tpp-row__copy strong { font-size: var(--mg-font-size-sm); font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }
.tpp-row__copy span, .tpp-row em { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-style: normal; font-weight: 500; line-height: 1.5; }
.tpp-row em { text-align: right; white-space: nowrap; }
.tpp-row em.is-overdue { color: var(--mg-color-rose); }
.tpp-row.is-done strong, .tpp-row.is-done .tpp-row__icon { color: var(--tpp-muted); }
.tpp-row.is-locked strong { color: var(--tpp-muted); font-weight: 600; }
.tpp-row--child.is-due strong { color: var(--mg-color-primary-strong); }
.tpp-row__chevron { color: var(--tpp-muted); font-size: var(--mg-font-size-md); }

.tpp-path { display: grid; }
.tpp-path + .tpp-path { margin-top: var(--mg-space-1); padding-top: var(--mg-space-1); }
.tpp-row--path { min-height: 3.5rem; }
.tpp-row--path:hover .tpp-row__chevron { color: var(--mg-color-primary-strong); }
.tpp-path:last-child > .tpp-row:last-child { border-bottom-color: transparent; }

/* Rows with a hover tray. */
.tpp-row--tray { display: flex; align-items: center; padding: 0; }
.tpp-row--tray > .tpp-row__main { display: grid; flex: 1; grid-template-columns: 1.75rem minmax(0, 1fr) auto; column-gap: var(--mg-space-3); align-items: center; width: 100%; min-width: 0; min-height: 3rem; padding: var(--mg-space-2) var(--mg-space-1) var(--mg-space-2) var(--mg-space-6); border: 0; border-radius: 0; color: var(--tpp-ink); background: transparent; text-align: left; cursor: pointer; font: inherit; }
.tpp-row--tray > .tpp-row__main em { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-style: normal; font-weight: 500; text-align: right; white-space: nowrap; }
.tpp-row--tray > .tpp-row__main em.is-overdue { color: var(--mg-color-rose); }
.tpp-row--tray > .tpp-row__main span:not(.tpp-row__icon) > span { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-weight: 500; }
.tpp-row--tray:hover { background: var(--mg-color-mist); }
.tpp-tray { position: absolute; top: 50%; right: var(--mg-space-1); display: inline-flex; gap: 2px; padding-left: var(--mg-space-3); background: linear-gradient(to right, transparent, var(--mg-color-mist) var(--mg-space-3)); opacity: 0; pointer-events: none; transform: translateY(-50%); transition: opacity var(--mg-duration-fast) var(--mg-ease-standard); }
.tpp-row--tray:hover .tpp-tray, .tpp-tray:focus-within { opacity: 1; pointer-events: auto; }
.tpp-tray > button { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 1px solid transparent; border-radius: var(--mg-radius-organic-a); color: var(--tpp-muted); background: transparent; cursor: pointer; }
.tpp-tray > button:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tpp-tray :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); }

/* Constant actions: a quiet row of paper buttons. */
.tpp-actions { display: flex; flex-wrap: wrap; gap: var(--mg-space-1); padding: var(--mg-space-2) var(--mg-space-1) var(--mg-space-1) calc(var(--mg-space-6) + 0.1rem); }
.tpp-actions--card { padding: var(--mg-space-1) var(--mg-space-1) 0; }
.tpp-actions > button { display: inline-flex; gap: var(--mg-space-1); align-items: center; padding: 4px var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-b); color: var(--tpp-muted); background: var(--mg-color-paper); cursor: pointer; font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; }
.tpp-actions > button:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-sky-well); }
.tpp-actions :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); }

.tpp-more { min-height: 2.25rem; padding: var(--mg-space-1); border: 0; color: var(--tpp-muted); background: transparent; font: inherit; font-size: var(--mg-font-size-xs); font-weight: 600; text-align: left; cursor: pointer; }
.tpp-more:hover { color: var(--mg-color-primary-strong); }
.tpp-empty p { margin: 0; padding: var(--mg-space-1) var(--mg-space-1); color: var(--tpp-muted); font-size: var(--mg-font-size-xs); line-height: 1.5; }

/* Fraction, phase dots, trend, distributions, well, chips, outcome */
.tpp-fraction { color: var(--tpp-muted); font-size: var(--mg-font-size-sm) !important; font-weight: 600 !important; }
.tpp-fraction b { color: var(--mg-color-primary-strong); font-weight: 800; }
.tpp-fraction.is-met { color: var(--mg-color-primary-strong); }
.tpp-phase__dots { display: inline-flex; gap: 3px; align-items: center; height: .9rem; }
.tpp-phase__dots i { display: block; width: .5rem; height: .5rem; border: 1.5px solid var(--mg-color-primary-strong); border-radius: var(--mg-radius-organic-a); background: transparent; opacity: .55; }
.tpp-phase__dots i:nth-child(even) { border-radius: var(--mg-radius-organic-b); }
.tpp-phase__dots i.is-done { background: var(--mg-color-primary-strong); opacity: .9; }
.tpp-phase__dots i.is-skipped { background: var(--mg-color-sky-field); opacity: .9; }
.tpp-phase__dots i.is-current { width: .85rem; height: .85rem; background: var(--mg-color-sky-field); box-shadow: var(--mg-shadow-inset-sm); opacity: 1; }
.tpp-trend { display: grid; gap: 4px; padding: var(--mg-space-2) var(--mg-space-1) 0; }
.tpp-trend small { color: var(--tpp-muted); font-size: .66rem; font-weight: 700; }
.tpp-trend__bars { display: flex; gap: 4px; align-items: end; height: 2.2rem; }
.tpp-trend__bars i { display: block; width: .8rem; border-radius: 3px 3px 1px 1px; background: var(--mg-color-primary-strong); opacity: .8; }
.tpp-row__icon--date { display: grid; place-items: center; gap: 0; color: var(--mg-color-primary-strong); line-height: 1; }
.tpp-row__icon--date b { font-size: var(--mg-font-size-sm); font-weight: 800; }
.tpp-row__icon--date small { color: var(--tpp-muted); font-size: .55rem; font-weight: 700; text-transform: lowercase; }
.tpp-row--moment strong { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; font-weight: 600 !important; }
.tpp-dist { display: grid; gap: var(--mg-space-2); padding: var(--mg-space-1) var(--mg-space-1) var(--mg-space-2); }
.tpp-dist__row { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr); gap: 2px var(--mg-space-2); align-items: center; }
.tpp-dist__row small { color: var(--tpp-muted); font-size: .66rem; font-weight: 700; letter-spacing: .02em; }
.tpp-dist__bar { display: flex; gap: 2px; height: .5rem; overflow: hidden; border-radius: var(--mg-radius-pill); }
.tpp-dist__bar i { display: block; min-width: 4px; flex-basis: 0; }
.tpp-dist__legend { grid-column: 2; display: flex; flex-wrap: wrap; gap: 2px var(--mg-space-2); color: var(--tpp-muted); font-size: .62rem; font-weight: 600; }
.tpp-dist__legend span { display: inline-flex; gap: 4px; align-items: center; }
.tpp-dist__legend i { display: inline-block; width: .45rem; height: .45rem; border-radius: 2px; }
.tpp-dist__legend b { color: var(--tpp-ink); font-weight: 800; }
.tpp-dist .tone-a { background: var(--mg-color-primary-strong); }
.tpp-dist .tone-b { background: color-mix(in srgb, var(--mg-color-primary-strong) 55%, var(--mg-color-sky-field)); }
.tpp-dist .tone-c { background: var(--mg-color-sky-field); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mg-color-primary-strong) 30%, transparent); }
.tpp-dist .tone-d { background: var(--mg-color-border); }
.tpp-well { display: grid; gap: var(--mg-space-2); margin: 0 var(--mg-space-1); padding: var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); }
.tpp-well dl { display: grid; gap: var(--mg-space-1); margin: 0; }
.tpp-well dl > div { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr); gap: var(--mg-space-2); align-items: baseline; }
.tpp-well dt { color: var(--tpp-muted); font-size: .66rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.tpp-well dd { margin: 0; font-size: var(--mg-font-size-xs); line-height: 1.5; }
.tpp-well__actions { display: flex; gap: var(--mg-space-1); }
.tpp-well__actions button { display: inline-flex; gap: var(--mg-space-1); align-items: center; padding: 3px var(--mg-space-2); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-organic-b); color: var(--tpp-muted); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; }
.tpp-well__actions button:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-paper); }
.tpp-well__actions :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); }
.tpp-chips { display: flex; flex-wrap: wrap; gap: var(--mg-space-1); padding: var(--mg-space-1) var(--mg-space-1) 0; }
.tpp-chips button { display: inline-flex; gap: 4px; align-items: center; max-width: 100%; padding: 3px var(--mg-space-2) 3px 6px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--tpp-ink); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: .7rem; font-weight: 650; }
.tpp-chips button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpp-chips button:hover { color: var(--mg-color-primary-strong); background: var(--mg-color-paper); }
.tpp-chips :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-sm); color: var(--mg-color-primary-strong); }
.tpp-outcome { display: grid; grid-template-columns: 1fr 1fr; gap: var(--mg-space-2); padding: 0 var(--mg-space-1); }
.tpp-outcome > div { display: grid; gap: 2px; padding: var(--mg-space-2) var(--mg-space-3); border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-md); background: var(--mg-color-paper); }
.tpp-outcome small { color: var(--tpp-muted); font-size: .66rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.tpp-outcome strong { font-size: var(--mg-font-size-lg); font-weight: 800; }
.tpp-outcome span { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); }
.tpp-outcome .is-pending { background: var(--mg-color-mist); }
.tpp-outcome .is-pending strong { color: var(--tpp-muted); }

/* ---------------------------------------------------------------------------
   Path view dashboard: ExercisePage head at "wide" width, two-column grid. */
.tpp-dash { display: grid; gap: var(--mg-space-4); width: 100%; max-width: 1180px; margin: 0 auto; }
.tpp-dash__head { display: grid; gap: var(--mg-space-2); }
.tpp-dash__eyebrow { color: var(--mg-color-primary-strong); font-size: .66rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.tpp-dash__title { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: center; }
.tpp-dash__title h3 { margin: 0; font-size: var(--mg-font-size-xl); line-height: 1.2; }
.tpp-dash__title small { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-weight: 600; }
.tpp-dash__icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: var(--mg-radius-icon-field-a); color: var(--mg-color-primary-strong); background: var(--mg-color-paper); box-shadow: var(--mg-shadow-raised-sm); }
.tpp-dash__icon :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-xl); }
.tpp-dash__status { display: flex; gap: var(--mg-space-2); align-items: center; }
.tpp-dash__pill { padding: 4px 10px; border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); font-size: var(--mg-font-size-xs); font-weight: 800; }
.tpp-dash__status button { padding: 6px 14px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-paper); cursor: pointer; font: inherit; font-size: var(--mg-font-size-xs); font-weight: 800; }
.tpp-dash__status button.is-quiet { border-color: transparent; background: transparent; color: var(--tpp-muted); }
.tpp-dash__lead { max-width: 72ch; margin: 0; color: var(--tpp-muted); font-size: var(--mg-font-size-sm); line-height: 1.55; }
.tpp-dash__grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, 1fr); gap: var(--mg-space-4); align-items: start; }
.tpp-dash__main, .tpp-dash__side { display: grid; gap: var(--mg-space-4); min-width: 0; }
.tpp-card--dash .tpp-row--child { padding-left: var(--mg-space-1); }
.tpp-card--dash .tpp-row--tray > .tpp-row__main { padding-left: var(--mg-space-1); }
.tpp-card--dash .tpp-list > .tpp-row:last-child, .tpp-card--dash .tpp-list > .tpp-row--tray:last-child { border-bottom-color: transparent; }
.tpp-card--dash .tpp-actions--card { padding-left: 0; }

.tpp-dash__now { display: grid; gap: var(--mg-space-2); padding: var(--mg-space-3) var(--mg-space-4); border: 1px solid color-mix(in srgb, var(--mg-color-primary-strong) 35%, transparent); border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tpp-dash__now > header, .tpp-dash__timeline > header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--mg-space-2); color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.tpp-dash__now > header small, .tpp-dash__timeline > header small { color: var(--tpp-muted); font-weight: 600; letter-spacing: 0; text-transform: none; }
.tpp-dash__now-body { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--mg-space-3); align-items: start; }
.tpp-dash__now-icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: var(--mg-radius-icon-field-a); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); }
.tpp-dash__now-icon :deep(.material-symbols-outlined) { font-size: var(--mg-font-size-xl); }
.tpp-dash__now-body small { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-weight: 700; }
.tpp-dash__now-body strong { display: block; font-size: var(--mg-font-size-lg); font-weight: 750; line-height: 1.25; }
.tpp-dash__now-body p { margin: var(--mg-space-1) 0 0; max-width: 60ch; color: var(--tpp-muted); font-size: var(--mg-font-size-sm); line-height: 1.5; }
.tpp-dash__now-cta { display: grid; gap: var(--mg-space-2); justify-items: end; }
.tpp-dash__now-cta em { color: var(--mg-color-primary-strong); font-size: var(--mg-font-size-xs); font-style: normal; font-weight: 700; white-space: nowrap; }
.tpp-dash__now-cta button { padding: 8px 18px; border: 0; border-radius: var(--mg-radius-pill); color: var(--mg-color-on-primary, #fff); background: var(--mg-color-primary-fill); cursor: pointer; font: inherit; font-size: var(--mg-font-size-sm); font-weight: 800; }
.tpp-dash__now-cta button:hover { background: var(--mg-color-primary-fill-hover); }

.tpp-dash__timeline { display: grid; gap: var(--mg-space-2); padding: var(--mg-space-3); border-radius: var(--mg-radius-lg); background: var(--mg-color-surface); box-shadow: var(--mg-shadow-raised-sm); }
.tpp-dash__phase { display: grid; gap: var(--mg-space-1); padding: var(--mg-space-2) var(--mg-space-2) var(--mg-space-1); border-radius: var(--mg-radius-md); }
.tpp-dash__phase.is-current { background: var(--mg-color-paper); }
.tpp-dash__phase-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; gap: var(--mg-space-2); align-items: center; min-height: 2rem; }
.tpp-dash__phase-head strong { font-size: var(--mg-font-size-sm); font-weight: 750; }
.tpp-dash__phase.is-done .tpp-dash__phase-head strong { color: var(--tpp-muted); font-weight: 650; }
.tpp-dash__phase-head small { color: var(--tpp-muted); font-size: var(--mg-font-size-xs); font-weight: 600; white-space: nowrap; }
.tpp-row--step { min-height: 3rem; padding-left: var(--mg-space-2); }
.tpp-row--step.is-current { border-bottom-color: transparent; border-radius: var(--mg-radius-sm); background: var(--mg-color-sky-well); }
.tpp-row--step.is-current strong { color: var(--mg-color-primary-strong); }
.tpp-dash__phase .tpp-list > .tpp-row:last-child { border-bottom-color: transparent; }

@media (max-width: 1100px) {
  .tpp__evidence, .tpp__stage-wrap, .tpp-dash__grid { grid-template-columns: minmax(0, 1fr); }
  .tpp__shot { grid-template-columns: minmax(0, 1fr); }
  .tpp__shot figcaption { border-left: 0; border-top: 1px solid var(--mg-color-border); }
}
</style>
