<template>
  <div
    class="quiet-ritual qm"
    :class="{ 'qm--wide': current === 3 || (!reflecting && current === 2) }"
  >
    <header class="qr-top">
      <RouterLink :to="returnTo" class="qr-icon" aria-label="Wróć do poprzedniego widoku"
        ><AppIcon name="close"
      /></RouterLink>
      <span>{{ reflecting ? 'Refleksja miesiąca' : 'Plan miesiąca' }} <b>·</b> {{ title }}</span>
      <span class="qr-save" role="status"
        ><AppIcon name="check" />{{
          draft.completed ? 'Zakończono w Labie' : 'Szkic w Labie'
        }}</span
      >
    </header>
    <main class="qr-card">
      <header class="qr-heading">
        <h1 ref="heading" tabindex="-1">{{ steps[current].question }}</h1>
        <span v-if="!reflecting && current === 0" class="qr-count"
          >{{ draft.directions.length }} wybrane</span
        >
      </header>

      <section v-if="!reflecting && current === 0" class="qr-focus">
        <div class="qr-choices">
          <article
            v-for="priority in priorities"
            :key="priority.key"
            class="qr-choice"
            :class="{ selected: draft.directions.includes(priority.key) }"
          >
            <button
              class="qr-choice-pick"
              role="checkbox"
              :aria-checked="draft.directions.includes(priority.key)"
              @click="toggle(draft.directions, priority.key)"
            >
              <AppIcon class="qr-object-icon" name="explore" /><span
                ><strong>{{ priority.title }}</strong></span
              ><span class="qr-check"
                ><AppIcon v-if="draft.directions.includes(priority.key)" name="check"
              /></span>
            </button>
            <details class="qm-choice-detail">
              <summary :aria-label="`Kierunek: ${priority.title}`">Kierunek</summary>
              <p>{{ priority.desiredDirection }}</p>
            </details>
          </article>
        </div>
        <p v-if="!priorities.length">Możesz zacząć od praktyk i działań w kolejnym kroku.</p>
        <details class="qm-help">
          <summary>Wybór kierunków</summary>
          <p>Trzy to sugestia. Możesz wybrać więcej albo zaplanować działania bez priorytetu.</p>
        </details>
        <details v-if="previousPlan || previousReflection" class="qm-previous">
          <summary>Poprzedni miesiąc · {{ monthLabel(previousMonth) }}</summary>
          <p
            v-for="p in priorities.filter(
              p =>
                previousPlan?.directions.includes(p.key) ||
                previousReflection?.assessments[p.key]?.verdict
            )"
            :key="p.key"
          >
            {{ p.title }} ·
            {{ verdictLabels[previousReflection?.assessments[p.key]?.verdict ?? ''] }}
          </p>
          <button v-if="previousPlan" class="qr-quiet" @click="adoptDirections">
            Przyjmij poprzedni wybór kierunków
          </button>
        </details>
      </section>

      <section v-else-if="!reflecting && current === 1" class="qr-focus">
        <div class="qr-choices">
          <article
            v-for="item in primaryCandidates"
            :key="item.key"
            class="qr-choice"
            :class="{ selected: draft.support.includes(item.key) }"
          >
            <button
              class="qr-choice-pick"
              role="checkbox"
              :aria-checked="draft.support.includes(item.key)"
              @click="toggleSupport(item.key)"
            >
              <AppIcon class="qr-object-icon" :name="icon(item)" /><span
                ><strong>{{ item.title }}</strong
                ><small>{{ relation(item) }}</small></span
              ><span class="qr-check"
                ><AppIcon v-if="draft.support.includes(item.key)" name="check"
              /></span>
            </button>
          </article>
        </div>
        <details v-if="extraCandidates.length" class="qm-extra">
          <summary>Pozostałe działania i obserwacje ({{ extraCandidates.length }})</summary>
          <div class="qr-choices">
            <article
              v-for="item in extraCandidates"
              :key="item.key"
              class="qr-choice"
              :class="{ selected: draft.support.includes(item.key) }"
            >
              <button
                class="qr-choice-pick"
                role="checkbox"
                :aria-checked="draft.support.includes(item.key)"
                @click="toggleSupport(item.key)"
              >
                <AppIcon class="qr-object-icon" :name="icon(item)" /><span
                  ><strong>{{ item.title }}</strong
                  ><small>{{ relation(item) }}</small></span
                ><span class="qr-check"
                  ><AppIcon v-if="draft.support.includes(item.key)" name="check"
                /></span>
              </button>
            </article>
          </div>
        </details>
      </section>

      <section v-else-if="!reflecting && current === 2" class="qm-planner">
        <p v-if="!support.length">
          Nie wybrano działań. <button class="qr-quiet" @click="go(1)">Dobierz wsparcie</button>
        </p>
        <div v-else class="qm-table-scroll">
          <div class="qm-table" :style="{ '--qm-weeks': weeks.length }">
            <div class="qm-row qm-table-head">
              <span>Wsparcie</span
              ><span v-for="week in weeks" :key="week.weekRef"
                >{{ week.label }}<small>{{ week.range }}</small></span
              ><span>Cel</span>
            </div>
            <article
              v-for="item in support"
              :key="item.key"
              class="qm-plan-item"
              :class="{ 'qm-editing': expanded === item.key }"
            >
              <div class="qm-row">
                <span class="qm-object"
                  ><AppIcon :name="icon(item)" /><strong>{{ item.title }}</strong></span
                >
                <div v-for="week in weeks" :key="week.weekRef" class="qm-cell">
                  <button
                    class="qm-dot"
                    :class="{
                      active: placed(item.key, week.weekRef),
                      whole: placement(item.key).wholeMonth,
                    }"
                    :aria-label="`${item.title}, ${week.label}, ${week.range}`"
                    :aria-pressed="placed(item.key, week.weekRef)"
                    @click="toggleWeek(item.key, week.weekRef)"
                  >
                    <i />
                  </button>
                  <template
                    v-if="expanded === item.key && summable(item) && placed(item.key, week.weekRef)"
                  >
                    <input
                      v-if="draft.targets[item.key].distribution === 'manual'"
                      type="number"
                      min="0"
                      :aria-label="`Cel ${week.label}: ${item.title}`"
                      :value="weeklyValue(item.key, week.weekRef)"
                      @input="setWeekTarget(item.key, week.weekRef, $event)"
                    />
                    <small v-else>{{ weeklyValue(item.key, week.weekRef) }}</small>
                  </template>
                </div>
                <button
                  v-if="draft.targets[item.key]"
                  class="qm-target"
                  :disabled="!hasPlacement(placement(item.key))"
                  :title="item.targetLabel"
                  :aria-label="`Edytuj cel: ${item.title}, ${item.targetLabel}`"
                  :aria-expanded="expanded === item.key"
                  @click="expanded = expanded === item.key ? '' : item.key"
                >
                  {{ draft.targets[item.key].value }}</button
                ><span v-else class="qm-no-target">—</span>
              </div>
              <div class="qm-underbar">
                <button
                  class="qr-quiet"
                  :aria-pressed="placement(item.key).wholeMonth"
                  @click="toggleWhole(item.key)"
                >
                  Cały miesiąc</button
                ><button
                  class="qr-icon"
                  :aria-label="`Wyczyść przypisania: ${item.title}`"
                  @click="clear(item.key)"
                >
                  <AppIcon name="ink_eraser" />
                </button>
                <template v-if="expanded === item.key && draft.targets[item.key]">
                  <label class="qm-target-input"
                    >{{ item.cadence === 'monthly' ? 'Cel miesiąca' : 'Cel tygodniowy'
                    }}<input
                      type="number"
                      min="0"
                      :value="draft.targets[item.key].value"
                      :aria-label="`Wartość celu: ${item.title}`"
                      :disabled="item.cadence === 'weekly'"
                      @input="setTarget(item.key, $event)"
                  /></label>
                  <template v-if="summable(item)"
                    ><button
                      class="qr-quiet"
                      :aria-pressed="draft.targets[item.key].distribution === 'auto'"
                      @click="draft.targets[item.key].distribution = 'auto'"
                    >
                      Auto</button
                    ><button
                      class="qr-quiet"
                      :aria-pressed="draft.targets[item.key].distribution === 'manual'"
                      @click="manual(item.key)"
                    >
                      Ręcznie</button
                    ><span class="qm-balance">{{ balance(item.key) }}</span></template
                  >
                  <details>
                    <summary :aria-label="`Ustawienia celu: ${item.title}`">
                      <AppIcon name="tune" />
                    </summary>
                    <p>{{ item.targetLabel }}</p>
                    <p v-if="item.cadence === 'weekly'">
                      Wyjątek celu ustawisz w planowaniu konkretnego tygodnia.
                    </p>
                    <template v-else
                      ><label
                        >Warunek
                        <select v-model="draft.targets[item.key].operator">
                          <option value="min">Co najmniej</option>
                          <option value="max">Co najwyżej</option>
                        </select></label
                      ><label v-if="item.entryMode !== 'completion'"
                        >Dni z wpisem
                        <input
                          type="number"
                          min="1"
                          max="31"
                          :value="draft.targets[item.key].entryDays"
                          @input="setDays(item.key, $event)" /></label
                    ></template>
                  </details>
                </template>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section v-else-if="!reflecting" class="qm-review">
        <div v-if="gaps.length" class="qm-gaps">
          <button v-for="gap in gaps" :key="gap.label" class="qr-quiet" @click="go(gap.step)">
            {{ gap.label }}<AppIcon name="arrow_forward" />
          </button>
        </div>
        <div v-if="draft.directions.length" class="qm-direction-filter">
          <button class="qr-quiet" :aria-pressed="!filter" @click="filter = ''">Wszystkie</button
          ><button
            v-for="p in priorities.filter(p => draft.directions.includes(p.key))"
            :key="p.key"
            class="qr-quiet"
            :aria-pressed="filter === p.key"
            @click="filter = filter === p.key ? '' : p.key"
          >
            {{ p.title }}
          </button>
        </div>
        <div class="qm-week-cards" :style="{ '--qm-weeks': weeks.length }">
          <article v-for="week in weeks" :key="week.weekRef" class="qm-week-card">
            <header>
              <strong>{{ week.label }}</strong
              ><small>{{ week.range }}</small>
            </header>
            <RitualPlanGroups
              :items="weekItems(week.weekRef, false)"
              :context="week.range"
              @edit="edit"
            />
            <div v-if="weekItems(week.weekRef, true).length" class="qm-whole-items">
              <small>cały miesiąc</small
              ><RitualPlanGroups
                :items="weekItems(week.weekRef, true)"
                :context="'cały miesiąc'"
                @edit="edit"
              />
            </div>
            <span
              v-if="!weekItems(week.weekRef, false).length && !weekItems(week.weekRef, true).length"
              class="qm-muted"
              >—</span
            ><button v-if="draft.completed" class="qr-quiet" @click="openWeek(week.weekRef)">
              Zaplanuj tydzień<AppIcon name="arrow_forward" />
            </button>
          </article>
        </div>
      </section>

      <section v-else-if="current === 0" class="qm-priorities">
        <article v-for="p in priorities" :key="p.key" class="qm-priority">
          <button
            class="qm-priority-head"
            :aria-expanded="openPriority === p.key"
            @click="openPriority = openPriority === p.key ? '' : p.key"
          >
            <AppIcon name="explore" /><strong>{{ p.title }}</strong
            ><AppIcon v-if="plan.directions.includes(p.key)" name="star" /><span
              v-if="assessment(p.key).effort != null"
              >{{ assessment(p.key).effort }}/5</span
            ><small v-if="assessment(p.key).verdict">{{
              verdictLabels[assessment(p.key).verdict]
            }}</small
            ><AppIcon name="expand_more" />
          </button>
          <div v-if="openPriority === p.key" class="qm-priority-body">
            <QuietRatingBar
              :model-value="assessment(p.key).effort"
              label="Wysiłek"
              effort
              hint="Ile świadomej uwagi i energii poświęciłeś temu kierunkowi? To nie ocena rezultatu."
              @update:model-value="assessment(p.key).effort = $event"
            />
            <div class="qm-decisions">
              <div class="qm-verdicts" role="group" :aria-label="`Decyzja: ${p.title}`">
                <button
                  v-for="v in verdictOptions"
                  :key="v"
                  class="qr-quiet"
                  :aria-pressed="assessment(p.key).verdict === v"
                  @click="assessment(p.key).verdict = assessment(p.key).verdict === v ? '' : v"
                >
                  {{ verdictLabels[v] }}
                </button>
              </div>
              <details>
                <summary>Uzasadnienie</summary>
                <textarea
                  v-model="assessment(p.key).note"
                  rows="3"
                  :aria-label="`Uzasadnienie: ${p.title}`"
                />
              </details>
              <details>
                <summary>Kontekst kierunku</summary>
                <p>{{ p.desiredDirection }}</p>
                <ul class="qm-evidence">
                  <li
                    v-for="item in candidates.filter(o => o.priorityKeys.includes(p.key))"
                    :key="item.key"
                  >
                    <strong>{{ item.title }}</strong
                    ><span>{{ evidence(item) }}</span>
                  </li>
                </ul>
                <p v-if="!candidates.some(o => o.priorityKeys.includes(p.key))">
                  Brak powiązanych obiektów.
                </p>
                <details v-for="kind in signalKinds" :key="kind.key">
                  <summary>{{ kind.label }}</summary>
                  <div class="qm-signals">
                    <button
                      v-for="signal in p[kind.field]"
                      :key="signal"
                      class="qr-quiet"
                      :aria-pressed="assessment(p.key)[kind.key].includes(signal)"
                      @click="toggle(assessment(p.key)[kind.key], signal)"
                    >
                      {{ signal }}</button
                    ><span v-if="!p[kind.field].length">Brak zdefiniowanych sygnałów.</span>
                  </div>
                </details>
              </details>
            </div>
          </div>
        </article>
        <p v-if="!priorities.length">Brak kierunków. Możesz przejść do kompasu miesiąca.</p>
      </section>

      <section v-else-if="current === 1" class="qm-compass">
        <QuietRatingBar
          v-for="axis in compass"
          :key="axis.key"
          :label="axis.label"
          :hint="axis.hint"
          :model-value="draft.ratings[axis.key] ?? null"
          :previous="previousReflection?.ratings[axis.key]"
          :touched="draft.touched[axis.key]"
          @update:model-value="rate(axis.key, $event)"
        />
      </section>

      <section v-else-if="current === 2" class="qm-anchors">
        <article v-for="(anchor, index) in monthlyAnchors" :key="anchor">
          <button
            class="qm-anchor-head"
            :aria-expanded="openAnchor === index"
            @click="openAnchor = openAnchor === index ? null : index"
          >
            <AppIcon :name="['workspace_premium', 'mountain_flag', 'lightbulb'][index]" /><strong>{{
              anchor
            }}</strong
            ><AppIcon name="expand_more" /></button
          ><textarea
            v-if="openAnchor === index"
            v-model="draft.anchors[index]"
            :aria-label="anchor"
            rows="4"
            placeholder="Zapisz własnymi słowami…"
          />
          <p v-else-if="draft.anchors[index]">{{ draft.anchors[index] }}</p>
        </article>
      </section>

      <section v-else class="qm-journal" :class="{ 'qm-journal--open': contextOpen }">
        <div>
          <textarea
            v-model="draft.journal"
            aria-label="Refleksja miesiąca"
            rows="13"
            placeholder="Co chcesz zapamiętać z tego miesiąca?"
          />
          <div class="qm-journal-tools">
            <small>{{ wordCount }} słów</small
            ><button
              class="qr-quiet"
              :aria-expanded="contextOpen"
              @click="contextOpen = !contextOpen"
            >
              <AppIcon name="view_sidebar" />Kontekst</button
            ><button class="qr-quiet" :aria-expanded="aiOpen" @click="aiOpen = !aiOpen">
              <AppIcon name="auto_awesome" />AI
            </button>
          </div>
          <div v-if="aiOpen" class="qm-ai">
            <small>Przykład w Labie · bez wywołania AI</small
            ><button
              class="qr-quiet"
              @click="
                aiPreview =
                  'Które wsparcie chcesz zachować, a gdzie potrzebujesz więcej przestrzeni?'
              "
            >
              Pokaż przykładowe pytanie
            </button>
            <blockquote v-if="aiPreview">{{ aiPreview }}</blockquote>
            <button
              v-if="aiPreview"
              class="qr-quiet"
              @click="draft.journal += `${draft.journal ? '\n\n' : ''}${aiPreview}\n`"
            >
              Dodaj do wpisu
            </button>
          </div>
        </div>
        <aside v-if="contextOpen" class="qm-context">
          <section v-if="assessedPriorities.length">
            <h3>Kierunki</h3>
            <article v-for="p in assessedPriorities" :key="p.key">
              <strong>{{ p.title }}</strong>
              <p>
                Wysiłek {{ assessment(p.key).effort ?? '—' }} ·
                {{ verdictLabels[assessment(p.key).verdict] }}
              </p>
              <blockquote v-if="assessment(p.key).note">{{ assessment(p.key).note }}</blockquote>
              <p v-if="assessment(p.key).progress.length">
                {{ assessment(p.key).progress.join(' · ') }}
              </p>
              <p v-if="assessment(p.key).risk.length">{{ assessment(p.key).risk.join(' · ') }}</p>
            </article>
          </section>
          <section v-if="compass.some(a => draft.ratings[a.key] != null)">
            <h3>Kompas</h3>
            <div class="qm-mini-compass">
              <span v-for="a in compass" :key="a.key"
                ><i :style="{ height: `${(draft.ratings[a.key] ?? 0) * 12}px` }" /><b>{{
                  draft.ratings[a.key] ?? '—'
                }}</b
                ><small>{{ a.label }}</small></span
              >
            </div>
          </section>
          <section v-if="draft.anchors.some(Boolean)">
            <h3>Kotwice</h3>
            <button
              v-for="(text, i) in draft.anchors"
              v-show="text"
              :key="i"
              class="qr-quiet qm-anchor-link"
              @click="editAnchor(i)"
            >
              <strong>{{ monthlyAnchors[i] }}</strong
              >{{ text }}
            </button>
          </section>
          <section v-if="recordedWeeks.length">
            <h3>Z tygodni</h3>
            <details v-for="week in recordedWeeks" :key="week.weekRef">
              <summary>{{ week.rangeLabel }}</summary>
              <p>{{ week.note }}</p>
              <button class="qr-quiet" @click="openWeek(week.weekRef, true)">
                Otwórz tydzień<AppIcon name="arrow_forward" />
              </button>
            </details>
          </section>
          <section v-if="contextRecords.length">
            <h3>Emocje i wpisy</h3>
            <div class="qm-emotion-weeks">
              <span v-for="w in contextWeeks" :key="w.weekRef"
                ><EmotionDayStack
                  :emotions="w.records.flatMap(r => r.emotions)"
                  :day-label="w.range"
                /><small>{{ w.label }}</small></span
              >
            </div>
            <details v-for="w in contextWeeks.filter(w => w.records.length)" :key="w.weekRef">
              <summary>{{ w.range }}</summary>
              <article v-for="r in w.records" :key="r.day">
                <strong>{{ r.day }} · {{ r.journal }}</strong>
                <p>{{ r.emotions.map(e => e.name).join(' · ') }}</p>
                <small v-if="r.exercise">{{ r.exercise }}</small>
              </article>
            </details>
          </section>
          <section v-if="evidenceItems.length">
            <h3>Obiekty</h3>
            <details v-for="item in evidenceItems" :key="item.key"><summary>{{ item.title }}</summary><p>{{ evidence(item) }}</p></details>
          </section>
        </aside>
      </section>

      <footer class="qr-footer">
        <button
          class="qr-icon qr-arrow"
          aria-label="Poprzedni krok"
          :disabled="current === 0"
          @click="go(current - 1)"
        >
          <AppIcon name="arrow_back" />
        </button>
        <nav aria-label="Etapy rytuału">
          <div class="qr-progress">
            <button
              v-for="(step, index) in steps"
              :key="step.label"
              :class="{ active: current === index }"
              :aria-current="current === index ? 'step' : undefined"
              :aria-label="`${index + 1}. ${step.label}`"
              :title="step.label"
              @click="go(index)"
            >
              <i />
            </button>
          </div>
          <span>{{ current + 1 }}/4 · {{ steps[current].label }}</span>
        </nav>
        <button
          v-if="current < 3"
          class="qr-icon qr-arrow qr-arrow--next"
          aria-label="Następny krok"
          @click="go(current + 1)"
        >
          <AppIcon name="arrow_forward" />
        </button>
        <div v-else class="qr-finish">
          <button v-if="reflecting" class="qr-quiet" @click="finishAndPlan">
            Zapisz i zaplanuj kolejny miesiąc</button
          ><button class="qr-primary" @click="draft.completed = true">
            <AppIcon name="check" />{{
              draft.completed ? 'Zapisano w Labie' : reflecting ? 'Zapisz refleksję' : 'Zapisz plan'
            }}
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { getPeriodBounds } from '@product/utils/periods'
import type { WeekRef } from '@product/domain/period'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import EmotionDayStack from '~lab/components/EmotionDayStack.vue'
import QuietRatingBar from '~lab/components/QuietRatingBar.vue'
import RitualPlanGroups from '~lab/components/RitualPlanGroups.vue'
import { useLabStore } from '~lab/stores/lab.store'
import {
  canPlan,
  compass,
  gentleObjects,
  gentlePriority,
  hasPlacement,
  monthlyContextSample,
  monthWeeks,
  monthlyAnchors,
  shiftMonth,
  summable,
  toggleMonthWeek,
  useQuietMonthlyRitualStore,
  validMonth,
  verdictLabels,
  weekValue,
  type Verdict,
} from '~lab/lab/quietMonthlyRitual'
const props = defineProps<{ presetId: string }>()
const lab = useLabStore(),
  store = useQuietMonthlyRitualStore(),
  route = useRoute(),
  router = useRouter()
const reflecting = computed(() => props.presetId === 'reflect')
const sample = computed(() => String(route.query.sample ?? ''))
const preset = computed(
  () => lab.fixture.presets['ritual-month'].find(p => p.id === props.presetId)!
)
const month = computed(() =>
  validMonth(route.query.month) ? route.query.month : preset.value.periodRef
)
const weeks = computed(() => monthWeeks(month.value))
const priorities = computed(() =>
  sample.value === 'no-priorities'
    ? []
    : sample.value === 'gentle'
      ? [gentlePriority, ...lab.fixture.priorities]
      : lab.fixture.priorities
)
const candidates = computed(() =>
  [...(sample.value === 'gentle' ? gentleObjects : []), ...lab.fixture.objects].filter(canPlan)
)
const key = (period: string, mode: string) =>
  `${lab.experimentRevision}:${sample.value}:${period}:${mode}`
const plan = computed(() =>
  store.getDraft(
    key(month.value, 'plan'),
    priorities.value,
    candidates.value,
    weeks.value.map(w => w.weekRef),
    sample.value
  )
)
const draft = computed(() =>
  reflecting.value
    ? store.getDraft(
        key(month.value, 'reflect'),
        priorities.value,
        candidates.value,
        weeks.value.map(w => w.weekRef),
        sample.value
      )
    : plan.value
)
const previousMonth = computed(() => shiftMonth(month.value, -1))
const previousPlan = computed(() => store.drafts[key(previousMonth.value, 'plan')])
const previousReflection = computed(() => store.drafts[key(previousMonth.value, 'reflect')])
const monthLabel = (m: string) =>
  new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(
    new Date(`${m}-15T12:00:00`)
  )
const title = computed(() => monthLabel(month.value))
const returnTo = computed(() =>
  typeof route.query.returnTo === 'string' && route.query.returnTo.startsWith('/preview/')
    ? route.query.returnTo
    : `/views/ritual-month?mode=experiment&variant=quiet-v2&preset=${props.presetId}`
)
const steps = computed(() =>
  reflecting.value
    ? [
        { label: 'Priorytety', question: 'Jaką uwagę poświęciłeś swoim kierunkom?' },
        { label: 'Kompas', question: 'Jakiego miesiąca doświadczyłeś?' },
        { label: 'Kotwice', question: 'Co warto zapamiętać?' },
        { label: 'Dziennik', question: 'Zamknij miesiąc własnymi słowami' },
      ]
    : [
        { label: 'Kierunki', question: 'Na czym chcesz skupić ten miesiąc?' },
        { label: 'Wsparcie', question: 'Co wesprze te kierunki?' },
        { label: 'Tygodnie', question: 'Kiedy znajdziesz na to miejsce?' },
        { label: 'Przegląd', question: 'Czy ten plan jest dla Ciebie?' },
      ]
)
const current = computed(() => Math.max(0, Math.min(3, Math.floor(Number(route.query.step) || 0))))
const heading = ref<HTMLElement>(),
  expanded = ref(''),
  filter = ref(''),
  openPriority = ref(priorities.value[0]?.key ?? ''),
  openAnchor = ref<number | null>(0),
  contextOpen = ref(false),
  aiOpen = ref(false),
  aiPreview = ref('')
const support = computed(() => candidates.value.filter(o => plan.value.support.includes(o.key)))
const matches = (o: LabFixtureObject) => o.priorityKeys.some(k => plan.value.directions.includes(k))
const primaryCandidates = computed(() =>
  candidates.value.filter(
    o => o.family !== 'tracker' && (matches(o) || plan.value.support.includes(o.key))
  )
)
const extraCandidates = computed(() =>
  candidates.value.filter(o => !primaryCandidates.value.includes(o))
)
const icon = (o: LabFixtureObject) =>
  ({
    goal: 'flag',
    keyResult: 'flag',
    habit: 'routine',
    tracker: 'monitoring',
    intention: 'gps_fixed',
  })[o.family]
const relation = (o: LabFixtureObject) =>
  o.family === 'tracker'
    ? 'Obserwacja'
    : priorities.value
        .filter(p => o.priorityKeys.includes(p.key))
        .map(p => p.title)
        .join(' · ') || 'Dodatkowe wsparcie'
function toggle(list: string[], key: string) {
  const i = list.indexOf(key)
  if (i < 0) list.push(key)
  else list.splice(i, 1)
}
function toggleSupport(k: string) {
  toggle(plan.value.support, k)
  if (!plan.value.support.includes(k)) clear(k)
}
const placement = (k: string) => plan.value.placements[k]
const placed = (k: string, w: string) => placement(k).wholeMonth || placement(k).weeks.includes(w)
function toggleWeek(k: string, w: string) {
  plan.value.placements[k] = toggleMonthWeek(
    placement(k),
    w,
    weeks.value.map(w => w.weekRef)
  )
  if (!hasPlacement(placement(k))) { clear(k); return }
  const t = plan.value.targets[k]
  if (t) for (const ref of Object.keys(t.weeks)) if (!placed(k, ref)) delete t.weeks[ref]
}
function toggleWhole(k: string) {
  placement(k).wholeMonth = !placement(k).wholeMonth
}
function clear(k: string) {
  plan.value.placements[k] = { wholeMonth: false, weeks: [] }
  const item = candidates.value.find(o => o.key === k)
  if (plan.value.targets[k] && item?.targetLabel) plan.value.targets[k] = {
    value: Number(item.targetLabel.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? 1),
    operator: item.targetLabel.includes('≤') ? 'max' : 'min', distribution: 'auto', weeks: {}, entryDays: null,
  }
}
const weeklyValue = (k: string, w: string) =>
  weekValue(
    plan.value.targets[k],
    placement(k),
    w,
    weeks.value.map(w => w.weekRef)
  )
const numeric = (e: Event) => Math.max(0, Number((e.target as HTMLInputElement).value) || 0)
function setWeekTarget(k: string, w: string, e: Event) {
  plan.value.targets[k].weeks[w] = numeric(e)
}
function setTarget(k: string, e: Event) {
  plan.value.targets[k].value = numeric(e)
}
function setDays(k: string, e: Event) {
  plan.value.targets[k].entryDays = Math.min(31, Math.floor(numeric(e))) || null
}
function manual(k: string) {
  const t = plan.value.targets[k]
  if (t.distribution === 'manual') return
  t.weeks = Object.fromEntries(weeks.value.map(w => [w.weekRef, weeklyValue(k, w.weekRef)]))
  t.distribution = 'manual'
}
function balance(k: string) {
  const t = plan.value.targets[k]
  const sum = weeks.value.reduce((s, w) => s + weeklyValue(k, w.weekRef), 0)
  return sum === t.value
    ? `Rozpisane ${sum} z ${t.value}`
    : `${sum} z ${t.value} · ${Math.abs(t.value - sum)} ${sum < t.value ? 'poza tygodniami' : 'ponad cel'}`
}
const gaps = computed(() => [
  ...priorities.value
    .filter(
      p =>
        plan.value.directions.includes(p.key) &&
        !support.value.some(o => o.family !== 'tracker' && o.priorityKeys.includes(p.key))
    )
    .map(p => ({ label: `${p.title} · dobierz wsparcie`, step: 1 })),
  ...support.value
    .filter(o => !hasPlacement(placement(o.key)))
    .map(o => ({ label: `${o.title} · nieprzypisane`, step: 2 })),
  ...support.value
    .filter(
      o =>
        summable(o) &&
        hasPlacement(placement(o.key)) &&
        weeks.value.reduce((s, w) => s + weeklyValue(o.key, w.weekRef), 0) !==
          plan.value.targets[o.key].value
    )
    .map(o => ({ label: `${o.title} · sprawdź rozpisanie celu`, step: 2 })),
])
const weekItems = (w: string, whole: boolean) =>
  support.value.filter(
    o =>
      (!filter.value || o.priorityKeys.includes(filter.value)) &&
      (whole ? placement(o.key).wholeMonth : !placement(o.key).wholeMonth && placed(o.key, w))
  )
const assessment = (k: string) => draft.value.assessments[k]
const verdictOptions: Exclude<Verdict, ''>[] = ['continue', 'adjust', 'pause', 'drop']
const signalKinds = [
  { key: 'progress' as const, field: 'progressSignals' as const, label: 'Sygnały postępu' },
  { key: 'risk' as const, field: 'riskSignals' as const, label: 'Sygnały ryzyka' },
]
const assessedPriorities = computed(() =>
  priorities.value.filter(p => {
    const a = assessment(p.key)
    return a.effort != null || a.verdict || a.note || a.progress.length || a.risk.length
  })
)
function rate(k: string, n: number | null) {
  draft.value.ratings[k] = n
  draft.value.touched[k] = true
}
const recordedWeeks = computed(() =>
  sample.value === 'empty'
    ? []
    : lab.fixture.weeks
        .filter(w => weeks.value.some(slot => slot.weekRef === w.weekRef) && w.note)
        .filter((_, i) => sample.value !== 'sparse' || i === 0)
)
function evidence(item: LabFixtureObject) {
  const points = item.chart.filter(
    p => p.periodRef === month.value || weeks.value.some(w => w.weekRef === p.periodRef)
  )
  return points.length && sample.value !== 'empty'
    ? points
        .map(
          p => `${p.label}: ${p.value ?? 'brak wpisu'}${p.target != null ? ` / ${p.target}` : ''}`
        )
        .join(' · ')
    : 'Brak zapisów dla tego miesiąca'
}
const evidenceItems = computed(() =>
  candidates.value.filter(o => evidence(o) !== 'Brak zapisów dla tego miesiąca')
)
const contextRecords = computed(() =>
  sample.value === 'empty'
    ? []
    : sample.value === 'sparse'
      ? monthlyContextSample.slice(0, 1)
      : monthlyContextSample
)
const contextWeeks = computed(() =>
  weeks.value.map(w => {
    const { start, end } = getPeriodBounds(w.weekRef as WeekRef)
    return {
      ...w,
      records: contextRecords.value.filter(
        r => `${month.value}-${r.day}` >= start && `${month.value}-${r.day}` <= end
      ),
    }
  })
)
const wordCount = computed(() => draft.value.journal.trim().split(/\s+/).filter(Boolean).length)
async function go(n: number) {
  await router.replace({ query: { ...route.query, step: n || undefined } })
  await nextTick()
  heading.value?.focus()
}
function editAnchor(index: number) { openAnchor.value = index; void go(2) }
async function edit(k: string) {
  expanded.value = k
  await go(2)
}
function adoptDirections() {
  if (previousPlan.value)
    plan.value.directions = previousPlan.value.directions.filter(
      k =>
        priorities.value.some(p => p.key === k) &&
        !['pause', 'drop'].includes(previousReflection.value?.assessments[k]?.verdict ?? '')
    )
}
async function finishAndPlan() {
  draft.value.completed = true
  const nextMonth = shiftMonth(month.value, 1)
  store.getDraft(key(nextMonth, 'plan'), priorities.value, candidates.value, monthWeeks(nextMonth).map(w => w.weekRef), 'empty')
  await router.push({
    path: '/preview/ritual-month/quiet-v2/plan',
    query: {
      month: nextMonth,
      sample: sample.value || undefined,
      returnTo: returnTo.value,
    },
  })
}
function openWeek(week: string, reflect = false) {
  void router.push({
    path: `/preview/ritual-week/quiet-v2/${reflect ? 'reflect' : 'plan'}`,
    query: {
      ref: week,
      month: month.value,
      monthlySample: sample.value || undefined,
      returnTo: route.fullPath,
    },
  })
}
watch(
  () =>
    JSON.stringify([
      key(month.value, reflecting.value ? 'reflect' : 'plan'),
      draft.value.directions,
      draft.value.support,
      draft.value.placements,
      draft.value.targets,
      draft.value.assessments,
      draft.value.ratings,
      draft.value.anchors,
      draft.value.journal,
    ]),
  (value, old) => {
    if (old && JSON.parse(value)[0] === JSON.parse(old)[0]) draft.value.completed = false
  }
)
</script>
<style scoped src="./quietWeeklyRitual.css"></style>
<style scoped src="./quietMonthlyRitual.css"></style>
