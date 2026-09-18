<template>
  <div class="quiet-ritual" :class="{ 'quiet-ritual--week-review': wideCanvas }">
    <header class="qr-top">
      <RouterLink
        :to="typeof route.query.returnTo === 'string' && route.query.returnTo.startsWith('/preview/') ? route.query.returnTo : `/views/ritual-week?mode=experiment&variant=quiet-v2&preset=${presetId}`"
        class="qr-icon"
        aria-label="Wróć do UX Labu"
        ><AppIcon name="close"
      /></RouterLink>
      <span
        >{{ reflecting ? 'Refleksja tygodnia' : 'Plan tygodnia' }} <b>·</b> {{ periodTitle }}</span
      >
      <span class="qr-save" role="status"
        ><AppIcon name="check" />{{ draft.completed ? 'Zakończono' : 'Szkic w Labie' }}</span
      >
    </header>

    <main class="qr-card">
      <header class="qr-heading">
        <h1 tabindex="-1" ref="heading">{{ steps[current].question }}</h1>
        <span v-if="!reflecting && current === 0" class="qr-count"
          >{{ draft.selected.length }} wybrane</span
        >
      </header>

      <div v-if="!reflecting && current === 0" class="qr-focus">
        <details v-if="monthlySupport.length" class="qr-month-context"><summary>Wsparcie z planu miesiąca</summary><button v-for="item in monthlySupport" :key="item.key" class="qr-quiet" :aria-pressed="draft.selected.includes(item.key)" @click="toggleMonthlyFocus(item.key)">{{ item.title }}</button></details>
        <div class="qr-choices">
          <article
            v-for="item in visibleCandidates"
            :key="item.key"
            class="qr-choice"
            :class="{ selected: draft.selected.includes(item.key) }"
          >
            <button
              type="button"
              class="qr-choice-pick"
              :aria-pressed="draft.selected.includes(item.key)"
              @click="toggleFocus(item.key)"
            >
              <span class="qr-object-icon"><AppIcon :name="familyIcon[item.family]" /></span
              ><span
                ><strong>{{ item.title }}</strong
                ><small>{{ targetLabel(item) }}</small></span
              ><span class="qr-check"
                ><AppIcon v-if="draft.selected.includes(item.key)" name="check"
              /></span>
            </button>
            <button
              v-if="item.family === 'intention'"
              type="button"
              class="qr-icon qr-edit"
              :aria-label="`Edytuj intencję: ${item.title}`"
              @click="editIntention(item)"
            >
              <AppIcon name="edit" />
            </button>
          </article>
        </div>
        <button
          v-if="candidates.length > initialKeys.length"
          class="qr-quiet"
          type="button"
          :aria-expanded="showAll"
          @click="showAll = !showAll"
        >
          {{
            showAll
              ? 'Zwiń listę'
              : `Pozostałe działania (${candidates.length - visibleCandidates.length})`
          }}<AppIcon :name="showAll ? 'expand_less' : 'expand_more'" />
        </button>
        <button v-if="!composerOpen" type="button" class="qr-add" @click="openComposer">
          <AppIcon name="add" />Dodaj intencję
        </button>
        <form v-else class="qr-composer" @submit.prevent="saveIntention">
          <div class="qr-composer-row">
            <label class="qr-name"
              ><span>Nazwa intencji</span
              ><input ref="nameInput" v-model="intentionTitle" required maxlength="180" /></label
            ><label class="qr-times"
              ><span>Razy w tygodniu</span
              ><input
                v-model.number="intentionTarget"
                type="number"
                min="1"
                max="999"
                required /></label
            ><button type="submit" class="qr-primary" :disabled="!intentionTitle.trim()">
              {{ editingKey ? 'Zapisz' : 'Dodaj' }}</button
            ><button
              type="button"
              class="qr-icon"
              aria-label="Anuluj edycję intencji"
              @click="composerOpen = false"
            >
              <AppIcon name="close" />
            </button>
          </div>
          <details>
            <summary>Więcej opcji</summary>
            <fieldset>
              <legend>Powiąż z kierunkami</legend>
              <label v-for="priority in lab.fixture.priorities" :key="priority.key"
                ><input v-model="intentionPriorities" type="checkbox" :value="priority.key" />{{
                  priority.title
                }}</label
              >
            </fieldset>
            <button
              v-if="editingKey"
              type="button"
              class="qr-quiet"
              @click="removeIntention(editingKey)"
            >
              <AppIcon name="delete" />Usuń intencję
            </button>
          </details>
        </form>
      </div>

      <section v-else-if="!reflecting && current === 1" class="qr-planner">
        <div class="qr-table-scroll">
          <div class="qr-table">
            <div class="qr-table-head">
              <span>Fokus tygodnia</span
              ><span v-for="day in days" :key="day.dayRef"
                >{{ day.shortLabel }}<small>{{ day.dayNumber }}</small></span
              ><span>Cel</span><span aria-hidden="true"></span>
            </div>
            <article v-for="item in plannerItems" :key="item.key" class="qr-plan-row">
              <div class="qr-table-row">
                <span class="qr-row-name"
                  ><AppIcon :name="familyIcon[item.family]" /><strong>{{
                    item.title
                  }}</strong></span
                >
                <button
                  v-if="placement(item.key).wholeWeek"
                  type="button"
                  class="qr-whole"
                  :aria-label="`Wybierz konkretne dni: ${item.title}`"
                  title="Wybierz konkretne dni"
                  @click="toggleWholeWeek(item.key)"
                >
                  W tym tygodniu · bez terminu<AppIcon name="edit_calendar" />
                </button>
                <template v-else
                  ><button
                    v-for="day in days"
                    :key="day.dayRef"
                    type="button"
                    class="qr-day-button"
                    :aria-label="`${item.title}, ${day.shortLabel} ${day.dayNumber}`"
                    :aria-pressed="placement(item.key).days.includes(day.dayRef)"
                    @click="draft.placements[item.key] = toggleDay(placement(item.key), day.dayRef)"
                  >
                    <span><i /></span></button
                ></template>
                <button
                  type="button"
                  class="qr-target"
                  :aria-label="`Cel tygodnia: ${item.title}`"
                  :title="targetLabel(item)"
                  :aria-expanded="targetOpen === item.key"
                  @click="targetOpen = targetOpen === item.key ? null : item.key"
                >
                  {{ item.targetLabel ? draft.targets[item.key].value : '—' }}
                </button>
                <div class="qr-row-tools">
                  <button
                    type="button"
                    class="qr-quiet qr-flexible"
                    :aria-label="`Bez terminu: ${item.title}`"
                    :aria-pressed="placement(item.key).wholeWeek"
                    title="Na ten tydzień, bez konkretnych dni"
                    @click="toggleWholeWeek(item.key)"
                  >
                    Bez terminu
                  </button>
                  <button
                    type="button"
                    class="qr-quiet qr-clear"
                    :disabled="!isPlaced(placement(item.key))"
                    :aria-label="`Wyczyść dni: ${item.title}`"
                    title="Wyczyść przypisanie"
                    @click="draft.placements[item.key] = { days: [], wholeWeek: false }"
                  >
                    <AppIcon name="ink_eraser" />
                  </button>
                </div>
              </div>
              <div v-if="targetOpen === item.key" class="qr-target-edit">
                <label
                  >Cel na tydzień<input
                    v-model.number="draft.targets[item.key].value"
                    type="number"
                    min="0"
                    max="9999"
                    @change="normalizeTarget(item.key)"
                /></label>
                <details>
                  <summary>Więcej opcji</summary>
                  <label
                    >Warunek<select v-model="draft.targets[item.key].operator">
                      <option value="min">Co najmniej</option>
                      <option value="max">Co najwyżej</option>
                    </select></label
                  ><label
                    >Dni z wpisem<input
                      v-model.number="draft.targets[item.key].entryDays"
                      type="number"
                      min="1"
                      max="7"
                      placeholder="—"
                      @change="normalizeTarget(item.key)"
                  /></label>
                </details>
              </div>
            </article>
          </div>
        </div>
        <p v-if="!draft.selected.length" class="qr-empty">
          Nie wybrano fokusu. <button class="qr-quiet" @click="go(0)">Wybierz działania</button>
        </p>
        <button
          class="qr-quiet"
          type="button"
          :aria-expanded="showRest"
          @click="showRest = !showRest"
        >
          {{ showRest ? 'Zwiń pozostałe działania' : 'Pozostałe działania'
          }}<AppIcon name="expand_more" />
        </button>
      </section>

      <section v-else-if="!reflecting" class="qr-review-plan">
        <div class="qr-week-cards" aria-label="Plan na poszczególne dni">
          <article v-for="day in plannedDays" :key="day.dayRef" class="qr-day-card">
            <header>
              <h2>
                {{ day.fullLabel }}<span>{{ day.dayNumber }}</span>
              </h2>
              <button
                type="button"
                class="qr-icon"
                :aria-label="`Zmień plan: ${day.fullLabel}`"
                @click="go(1)"
              >
                <AppIcon name="edit_calendar" />
              </button>
            </header>
            <RitualPlanGroups
              v-if="day.items.length || flexibleItems.length"
              :items="day.items"
              :week-items="flexibleItems"
              :context="day.fullLabel"
              @edit="reviewEdit"
            />
            <p v-else class="qr-day-empty">Bez planów</p>
          </article>
        </div>
        <section v-if="unplaced.length" class="qr-unplaced">
          <h2>Jeszcze nieprzypisane</h2>
          <button
            v-for="item in unplaced"
            :key="item.key"
            class="qr-quiet"
            type="button"
            @click="reviewEdit(item.key)"
          >
            {{ item.title }}<AppIcon name="arrow_forward" />
          </button>
        </section>
      </section>

      <section v-else-if="current === 0" class="qr-evidence">
        <div class="qr-table-scroll">
          <div class="qr-table" :class="{ 'qr-table--day-selected': selectedDay !== null }">
            <div class="qr-table-head qr-table-head--review">
              <span aria-hidden="true"></span>
              <button
                v-for="(day, index) in days"
                :key="day.dayRef"
                type="button"
                class="qr-day-head"
                :class="{ selected: selectedDay === index }"
                :aria-pressed="selectedDay === index"
                :aria-label="`${day.fullLabel} ${day.dayNumber}`"
                @click="selectedDay = selectedDay === index ? null : index"
              >
                <span>{{ day.shortLabel }}</span><b>{{ day.dayNumber }}</b>
              </button>
              <span>Wynik</span>
            </div>
            <article v-for="item in evidenceItems" :key="item.key" class="qr-evidence-row">
              <div class="qr-table-row">
                <span class="qr-row-name"
                  ><AppIcon :name="familyIcon[item.family]" /><strong>{{
                    item.title
                  }}</strong></span
                >
                <span
                  v-for="(value, index) in ritualEvidence[item.key].values"
                  :key="index"
                  class="qr-evidence-cell"
                  :class="{ 'qr-col-selected': selectedDay === index }"
                  :title="`${days[index].shortLabel}: ${value === null ? 'Brak zapisu' : value}${ritualEvidence[item.key].planned.includes(index) ? ' · zaplanowane' : ''}`"
                >
                  <span
                    v-if="item.entryMode === 'completion'"
                    class="qr-record-dot"
                    :class="{
                      recorded: value !== null,
                      planned: ritualEvidence[item.key].planned.includes(index),
                    }"
                    ><i v-if="value !== null" /><span class="sr-only">{{
                      value === null ? 'Brak zapisu' : 'Wykonane'
                    }}</span></span
                  >
                  <span
                    v-else-if="value !== null"
                    class="qr-numeric"
                    :class="{ 'qr-numeric--rating': item.entryMode === 'rating' }"
                    ><i :style="{ height: `${(value / 5) * 28}px` }" /><b>{{ value }}</b></span
                  ><span v-else aria-label="Brak zapisu">—</span>
                </span>
                <span class="qr-result">{{ resultLabel(item.key) }}</span>
              </div>
              <button
                type="button"
                class="qr-comment-toggle qr-quiet"
                :aria-label="`${draft.comments[item.key] ? 'Edytuj komentarz' : 'Dodaj komentarz'}: ${item.title}`"
                :title="draft.comments[item.key] ? 'Edytuj komentarz' : 'Dodaj komentarz'"
                :aria-expanded="commentOpen === item.key"
                @click="commentOpen = commentOpen === item.key ? null : item.key"
              >
                <AppIcon :name="draft.comments[item.key] ? 'chat_bubble' : 'add_comment'" /><span
                  class="sr-only"
                  >{{ draft.comments[item.key] ? 'Komentarz' : 'Dodaj komentarz' }}</span
                >
              </button>
              <textarea
                v-if="commentOpen === item.key"
                v-model="draft.comments[item.key]"
                :aria-label="`Komentarz: ${item.title}`"
                rows="2"
              />
            </article>
            <article class="qr-evidence-row qr-evidence-row--meta qr-journal-row">
              <div class="qr-table-row">
                <span class="qr-row-name"
                  ><AppIcon name="menu_book" /><strong>Dziennik</strong></span
                >
                <span
                  v-for="(day, index) in days"
                  :key="day.dayRef"
                  class="qr-evidence-cell qr-meta-cell"
                  :class="{ 'qr-col-selected': selectedDay === index }"
                  :title="`${day.shortLabel}: ${day.journalCount ? day.journal.join(' · ') : 'Bez wpisu'}`"
                >
                  <template v-if="day.journalCount"
                    ><AppIcon
                      v-for="n in day.journalCount"
                      :key="n"
                      class="qr-journal-mark"
                      name="menu_book" /><span class="sr-only">{{ day.journal.join(', ') }}</span></template
                  ><span v-else aria-label="Bez wpisu">—</span>
                </span>
                <span class="qr-result">{{ journalCount }} {{ plural(journalCount, 'wpis', 'wpisy', 'wpisów') }}</span>
              </div>
            </article>
            <article class="qr-evidence-row qr-evidence-row--meta qr-emotion-row">
              <div class="qr-table-row">
                <span class="qr-row-name"><AppIcon name="mood" /><strong>Emocje</strong></span>
                <span
                  v-for="(day, index) in days"
                  :key="day.dayRef"
                  class="qr-evidence-cell qr-meta-cell"
                  :class="{ 'qr-col-selected': selectedDay === index }"
                >
                  <EmotionDayStack
                    :emotions="day.emotions"
                    :day-label="day.shortLabel"
                    :max-height="32"
                  />
                </span>
                <span class="qr-result">{{ emotionCount }} {{ plural(emotionCount, 'zapis', 'zapisy', 'zapisów') }}</span>
              </div>
            </article>
          </div>
        </div>
        <div v-if="selectedDay !== null" class="qr-day-detail" role="status">
          <strong>{{ days[selectedDay].fullLabel }} {{ days[selectedDay].dayNumber }}</strong>
          <span v-if="!days[selectedDay].journal.length && !days[selectedDay].emotions.length"
            >Bez wpisów dziennika i emocji</span
          >
          <span v-if="days[selectedDay].journal.length"
            ><AppIcon name="menu_book" />{{ days[selectedDay].journal.join(' · ') }}</span
          >
          <span v-if="days[selectedDay].emotions.length"
            ><AppIcon name="mood" />{{ days[selectedDay].emotions.map(e => e.name).join(', ') }}</span
          >
        </div>
        <details class="qr-help">
          <summary aria-label="Jak czytać wyniki?">?</summary>
          <p>
            Obrys oznacza plan, wypełnienie — zapis. Kreska lub puste miejsce to brak zapisu, nie
            potwierdzone niewykonanie. Jakość snu: skala 1–5, wynik to średnia. Kropki emocji mają
            kolor ćwiartki koła emocji.
          </p>
        </details>
      </section>

      <section v-else-if="current >= 1 && current <= 4" class="qr-ratings">
        <div class="qr-bars">
          <article v-for="axis in axes" :key="axis.key" :class="`qr-axis qr-axis--${axis.key}`">
            <header>
              <h2>{{ axis.label }}</h2>
              <details class="qr-help">
                <summary :aria-label="`Co oznacza ${axis.label}?`">?</summary>
                <p>{{ axis.hint }}</p>
              </details>
            </header>
            <div class="qr-bar-body">
              <div class="qr-bar-ends" aria-hidden="true">
                <span>{{ axis.key === 'effort' ? 'Duży' : 'Bardzo dobry' }}</span>
                <span>{{ axis.key === 'effort' ? 'Niewielki' : 'Bardzo słaby' }}</span>
              </div>
              <div class="qr-bar-stack">
                <button
                  type="button"
                  class="qr-icon qr-bar-step"
                  :aria-label="`Zwiększ: ${axis.label}`"
                  :disabled="rating(axis.key) === 5"
                  @click="stepRating(axis.key, 1)"
                >
                  <AppIcon name="add" />
                </button>
                <div
                  class="qr-scale qr-scale--vertical"
                  role="group"
                  :aria-label="`${areas[areaIndex].label}: ${axis.label}`"
                  tabindex="0"
                  @keydown.up.prevent="stepRating(axis.key, 1)"
                  @keydown.right.prevent="stepRating(axis.key, 1)"
                  @keydown.down.prevent="stepRating(axis.key, -1)"
                  @keydown.left.prevent="stepRating(axis.key, -1)"
                >
                  <button
                    v-for="n in 5"
                    :key="n"
                    type="button"
                    :class="{
                      filled: (rating(axis.key) ?? 0) >= n,
                      ghost: ghostLevel(axis.key) >= n,
                    }"
                    :aria-label="`${areas[areaIndex].label}, ${axis.label}: ${n} z 5`"
                    :aria-pressed="rating(axis.key) === n"
                    :title="
                      ghostLevel(axis.key) >= n
                        ? `Poprzedni tydzień: ${ghostLevel(axis.key)}`
                        : undefined
                    "
                    @click="setRating(axis.key, rating(axis.key) === n ? null : n)"
                  />
                </div>
                <button
                  type="button"
                  class="qr-icon qr-bar-step"
                  :aria-label="`Zmniejsz: ${axis.label}`"
                  :disabled="!rating(axis.key)"
                  @click="stepRating(axis.key, -1)"
                >
                  <AppIcon name="remove" />
                </button>
              </div>
              <output :aria-label="`${axis.label}: ${rating(axis.key) ?? 'bez oceny'}`">{{
                rating(axis.key) ?? '—'
              }}</output>
            </div>
          </article>
        </div>
        <div class="qr-tags">
          <h2>
            <AppIcon name="sell" />Tagi<span v-if="areaTags.length"> · {{ areaTags.length }}</span>
          </h2>
          <ul
            v-if="areaTags.length"
            class="qr-tag-list"
            :aria-label="`Tagi: ${areas[areaIndex].label}`"
          >
            <li v-for="tag in areaTags" :key="tag">
              <span>{{ tag }}</span
              ><button
                type="button"
                :aria-label="`Usuń tag: ${tag}`"
                @click="removeTag(tag)"
              >
                <AppIcon name="close" />
              </button>
            </li>
          </ul>
          <form class="qr-tag-form" @submit.prevent="addTag(tagInput[areaIndex] ?? '')">
            <input
              v-model="tagInput[areaIndex]"
              type="text"
              maxlength="32"
              :aria-label="`Nowy tag: ${areas[areaIndex].label}`"
              placeholder="Dodaj tag…"
            /><button type="submit" class="qr-quiet" :disabled="!(tagInput[areaIndex] ?? '').trim()">
              Dodaj
            </button>
          </form>
          <div v-if="tagSuggestions.length" class="qr-tag-suggestions" aria-label="Ostatnio użyte">
            <button
              v-for="tag in tagSuggestions"
              :key="tag"
              type="button"
              class="qr-quiet"
              @click="addTag(tag)"
            >
              <AppIcon name="add" />{{ tag }}
            </button>
          </div>
        </div>
      </section>

      <section v-else-if="current === 5" class="qr-anchors">
        <article v-for="(anchor, index) in anchorLabels" :key="anchor">
          <button
            type="button"
            :aria-expanded="anchorOpen === index"
            @click="anchorOpen = anchorOpen === index ? null : index"
          >
            <AppIcon :name="anchorIcons[index]" /><span>{{ anchor }}</span
            ><AppIcon
              :name="
                anchorOpen === index ? 'expand_less' : draft.anchors[index] ? 'edit_note' : 'add'
              "
            /></button
          ><textarea
            v-if="anchorOpen === index"
            v-model="draft.anchors[index]"
            :aria-label="anchor"
            rows="4"
          />
          <p v-else-if="draft.anchors[index]">{{ draft.anchors[index] }}</p>
        </article>
      </section>

      <section v-else class="qr-journal" :class="{ 'qr-journal--with-context': contextOpen }">
        <div class="qr-journal-main">
          <textarea
            v-model="draft.journal"
            aria-label="Dziennik tygodnia"
            rows="9"
            placeholder="Ten tydzień…"
          />
          <div class="qr-journal-tools">
            <span>{{ wordCount }} słów</span
            ><button
              type="button"
              class="qr-quiet"
              :aria-expanded="contextOpen"
              @click="contextOpen = !contextOpen"
            >
              <AppIcon name="notes" />Kontekst</button
            ><button type="button" class="qr-quiet" :aria-expanded="aiOpen" @click="aiOpen = !aiOpen">
              <AppIcon name="auto_awesome" />AI
            </button>
          </div>
          <div v-if="aiOpen" class="qr-context">
            <p>Podgląd AI w Labie · bez wysyłania danych.</p>
            <button
              class="qr-quiet"
              @click="
                aiResult =
                  draft.anchors.filter(Boolean).join(' ') ||
                  'Dodaj kotwicę, aby zobaczyć przykład podsumowania.'
              "
            >
              Pokaż przykład podsumowania</button
            ><button class="qr-quiet" @click="aiQuestion = 'Co chcesz zachować z tego tygodnia?'">
              Pokaż przykładowe pytanie
            </button>
            <p v-if="aiResult">{{ aiResult }}</p>
            <button v-if="aiQuestion" class="qr-quiet" @click="draft.journal += `\n${aiQuestion}\n`">
              {{ aiQuestion }}<AppIcon name="add" />
            </button>
          </div>
        </div>
        <aside v-if="contextOpen" class="qr-context-col" aria-label="Kontekst tygodnia">
          <section class="qr-ctx">
            <h3>Oceny</h3>
            <ul class="qr-ctx-ratings">
              <li v-for="(area, index) in areas" :key="area.label">
                <span class="qr-ctx-pair" aria-hidden="true"
                  ><i
                    class="qr-ctx-bar qr-ctx-bar--effort"
                    :style="{ height: `${((draft.ratings[`${index}:effort`] ?? 0) / 5) * 100}%` }" /><i
                    class="qr-ctx-bar qr-ctx-bar--state"
                    :style="{ height: `${((draft.ratings[`${index}:state`] ?? 0) / 5) * 100}%` }"
                /></span>
                <button type="button" class="qr-ctx-area" @click="go(index + 1)">
                  <span>{{ area.label }}</span
                  ><small
                    >{{ draft.ratings[`${index}:effort`] ?? '—' }} ·
                    {{ draft.ratings[`${index}:state`] ?? '—' }}</small
                  >
                </button>
                <span v-if="areaTagsFor(index).length" class="qr-ctx-tags">{{
                  areaTagsFor(index).join(', ')
                }}</span>
              </li>
            </ul>
          </section>
          <section v-if="emotionCount" class="qr-ctx">
            <h3>Emocje <small>{{ emotionCount }}</small></h3>
            <div class="qr-ctx-quadrants" role="img" :aria-label="quadrantSummaryLabel">
              <i
                v-for="quadrant in ritualQuadrants"
                :key="quadrant"
                :style="{
                  flexGrow: quadrantCounts[quadrant],
                  background: `var(--color-quadrant-${quadrant})`,
                }"
                :title="`${quadrantLabel[quadrant]}: ${quadrantCounts[quadrant]}`"
              />
            </div>
            <ul class="qr-ctx-chips">
              <li
                v-for="emotion in topEmotions"
                :key="emotion.name"
                :style="{
                  background: `var(--color-quadrant-${emotion.quadrant}-tint)`,
                  color: `var(--color-quadrant-${emotion.quadrant}-text)`,
                }"
              >
                {{ emotion.name }} <b>×{{ emotion.count }}</b>
              </li>
            </ul>
            <ul class="qr-ctx-days" aria-label="Emocje w kolejnych dniach">
              <li v-for="day in days" :key="day.dayRef">
                <EmotionDayStack :emotions="day.emotions" :day-label="day.shortLabel" /><span>{{
                  day.shortLabel
                }}</span>
              </li>
            </ul>
          </section>
          <section v-if="journalEntries.length" class="qr-ctx">
            <h3>Dziennik <small>{{ journalEntries.length }}</small></h3>
            <ul class="qr-ctx-list">
              <li v-for="entry in journalEntries" :key="entry.key">
                <small>{{ entry.day }}</small><span>{{ entry.title }}</span>
              </li>
            </ul>
          </section>
          <section class="qr-ctx">
            <h3>Działania</h3>
            <ul class="qr-ctx-chips qr-ctx-actions">
              <li
                v-for="item in evidenceItems"
                :key="item.key"
                :class="`qr-ctx-action qr-ctx-action--${evidenceTone(item.key)}`"
                :title="item.title"
              >
                <AppIcon :name="familyIcon[item.family]" /><span>{{ item.title }}</span
                ><b>{{ resultLabel(item.key) }}</b>
              </li>
            </ul>
            <ul v-if="commentedItems.length" class="qr-ctx-quotes">
              <li v-for="item in commentedItems" :key="item.key">
                <small>{{ item.title }}</small>
                <q>{{ draft.comments[item.key] }}</q>
              </li>
            </ul>
          </section>
          <section v-if="filledAnchors.length" class="qr-ctx">
            <h3>Kotwice</h3>
            <ul class="qr-ctx-quotes">
              <li v-for="anchor in filledAnchors" :key="anchor.label">
                <button type="button" @click="go(5)">
                  <AppIcon :name="anchor.icon" /><small>{{ anchor.label }}</small>
                </button>
                <q>{{ anchor.text }}</q>
              </li>
            </ul>
          </section>
          <section v-if="ritualExerciseSample.length" class="qr-ctx">
            <h3>Ćwiczenia <small>{{ ritualExerciseSample.length }}</small></h3>
            <p class="qr-ctx-line">{{ ritualExerciseSample.join(' · ') }}</p>
          </section>
        </aside>
      </section>

      <footer class="qr-footer">
        <button
          type="button"
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
              :key="step.id"
              type="button"
              :class="{ active: current === index }"
              :aria-current="current === index ? 'step' : undefined"
              :aria-label="`${index + 1}. ${step.label}`"
              :title="step.label"
              @click="go(index)"
            >
              <i />
            </button>
          </div>
          <span>{{ current + 1 }}/{{ steps.length }} · {{ steps[current].label }}</span>
        </nav>
        <button
          v-if="current < steps.length - 1"
          type="button"
          class="qr-icon qr-arrow qr-arrow--next"
          aria-label="Następny krok"
          @click="go(current + 1)"
        >
          <AppIcon name="arrow_forward" />
        </button>
        <div v-else class="qr-finish">
          <button v-if="reflecting" type="button" class="qr-quiet" @click="finishAndPlan">
            Zapisz i zaplanuj kolejny tydzień</button
          ><button type="button" class="qr-primary" @click="draft.completed = true">
            <AppIcon :name="draft.completed ? 'check' : 'done_all'" />{{
              draft.completed
                ? 'Zakończono'
                : reflecting
                  ? 'Zapisz refleksję'
                  : 'Zakończ planowanie'
            }}
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useQuietMonthlyRitualStore, validMonth, gentleObjects, summable, monthWeeks, weekValue } from '~lab/lab/quietMonthlyRitual'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import RitualPlanGroups from '~lab/components/RitualPlanGroups.vue'
import EmotionDayStack from '~lab/components/EmotionDayStack.vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import type { WeekRef } from '@product/domain/period'
import { getChildPeriods, getNextPeriod, getPeriodBounds } from '@product/utils/periods'
import { useLabStore } from '~lab/stores/lab.store'
import { familyIcon } from '~lab/lab/actionConceptData'
import {
  useQuietRitualStore,
  toggleDay,
  isPlaced,
  ritualEvidence,
  evidenceResult,
  ritualQuadrants,
  quadrantLabel,
  dayEmotionSample,
  busyEmotionDays,
  dayJournalSample,
  ritualExerciseSample,
  previousWeekRatings,
  type RitualQuadrant,
} from '~lab/lab/quietRitual'
const props = defineProps<{ presetId: string }>()
const route = useRoute(),
  router = useRouter(),
  lab = useLabStore(),
  store = useQuietRitualStore()
const reflecting = computed(() => props.presetId === 'reflect')
const preset = computed(
  () =>
    lab.fixture.presets['ritual-week'].find(p => p.id === props.presetId) ??
    lab.fixture.presets['ritual-week'][0]
)
const weekRef = computed(() =>
  /^\d{4}-W\d{2}$/.test(String(route.query.ref ?? ''))
    ? (String(route.query.ref) as WeekRef)
    : (preset.value.periodRef as WeekRef)
)
const week = computed(() => lab.fixture.weeks.find(w => w.weekRef === weekRef.value))
const days = computed(() =>
  getChildPeriods(weekRef.value).map((ref, index) => {
    const journalCount = week.value?.days[index]?.journalCount ?? 0
    const emotions =
      reflecting.value && route.query.sample === 'busy'
        ? busyEmotionDays[index]
        : dayEmotionSample(index, week.value?.days[index]?.emotionCount ?? 0)
    const emotionCount = emotions.length
    return {
      dayRef: ref,
      shortLabel: ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'niedz'][index],
      fullLabel: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'][
        index
      ],
      dayNumber: String(Number(ref.slice(-2))),
      journalCount,
      emotionCount,
      journal: dayJournalSample(index, journalCount),
      emotions,
    }
  })
)
const periodTitle = computed(() => {
  const bounds = getPeriodBounds(weekRef.value)
  const format = new Intl.DateTimeFormat('pl', { day: 'numeric', month: 'short' })
  return `${format.format(new Date(`${bounds.start}T12:00:00`))} – ${format.format(new Date(`${bounds.end}T12:00:00`))}`
})
const monthlyStore = useQuietMonthlyRitualStore()
const monthlyPlan = computed(() => validMonth(route.query.month) ? monthlyStore.drafts[`${lab.experimentRevision}:${String(route.query.monthlySample ?? '')}:${route.query.month}:plan`] : undefined)
const monthlySupport = computed(() => [...(route.query.monthlySample === 'gentle' ? gentleObjects : []), ...lab.fixture.objects].filter(item => { const p = monthlyPlan.value?.placements[item.key]; return monthlyPlan.value?.support.includes(item.key) && (p?.wholeMonth || p?.weeks.includes(weekRef.value)) }))
function toggleMonthlyFocus(key: string) { const i = draft.value.selected.indexOf(key); if (i < 0) draft.value.selected.push(key); else draft.value.selected.splice(i, 1) }
const baseItems = computed(() =>
  [...(route.query.monthlySample === 'gentle' ? gentleObjects : []), ...lab.fixture.objects].filter(
    i => (i.cadence === 'weekly' || monthlySupport.value.some(o => o.key === i.key)) && i.status !== 'retired' && i.status !== 'orphan'
  )
)
const draft = computed(() =>
  store.getDraft(
    `${lab.experimentRevision}:${weekRef.value}:${reflecting.value}:${route.query.sample === 'busy'}`,
    days.value.map(d => d.dayRef),
    baseItems.value.filter(item => item.cadence === 'weekly'),
    route.query.sample === 'busy'
  )
)
watch(monthlySupport, items => {
  for (const item of items) {
    if (draft.value.targets[item.key]) continue
    const t = monthlyPlan.value?.targets[item.key], p = monthlyPlan.value?.placements[item.key]
    const value = t && p && summable(item) ? weekValue(t, p, weekRef.value, monthWeeks(String(route.query.month)).map(w => w.weekRef)) : t?.value ?? 1
    draft.value.targets[item.key] = { value, operator: t?.operator ?? 'min', entryDays: null }
  }
}, { immediate: true })
const candidates = computed(() => [
  ...baseItems.value.filter(
    i =>
      !draft.value.removedKeys.includes(i.key) && !draft.value.intentions.some(n => n.key === i.key)
  ),
  ...draft.value.intentions,
])
const initialKeys = [
  'kr-runs',
  'kr-deep-work',
  'habit-stretch',
  'habit-dinner',
  'habit-reading',
  'intention-budget',
]
const visibleCandidates = computed(() =>
  showAll.value
    ? candidates.value
    : candidates.value.filter(
        i =>
          initialKeys.includes(i.key) ||
          draft.value.selected.includes(i.key) ||
          draft.value.intentions.some(n => n.key === i.key)
      )
)
const selectedItems = computed(() =>
  candidates.value.filter(i => draft.value.selected.includes(i.key))
)
const plannerItems = computed(() =>
  showRest.value
    ? [
        ...selectedItems.value,
        ...candidates.value.filter(i => !draft.value.selected.includes(i.key)),
      ]
    : selectedItems.value
)
const evidenceItems = computed(() =>
  Object.keys(ritualEvidence)
    .map(key => baseItems.value.find(i => i.key === key))
    .filter((i): i is LabFixtureObject => Boolean(i))
)
const areas = [
  { label: 'Ciało', question: 'Jak ciało przeżyło ten tydzień?' },
  { label: 'Emocje', question: 'Jak było Ci z emocjami?' },
  { label: 'Działanie', question: 'Jak Ci się działało?' },
  { label: 'Relacje', question: 'Jak było Ci w relacjach?' },
]
const axes = [
  { key: 'effort', label: 'Wysiłek', hint: 'Ile świadomej uwagi i energii włożyłeś w ten obszar?' },
  { key: 'state', label: 'Stan', hint: 'Jak czułeś się w tym obszarze pod koniec tygodnia?' },
]
const anchorLabels = ['Co poszło dobrze', 'Co było trudne', 'Lekcje i spostrzeżenia']
const anchorIcons = ['thumb_up', 'mountain_flag', 'lightbulb']
const steps = computed(() =>
  reflecting.value
    ? [
        { id: 'review', label: 'Przegląd', question: 'Co wydarzyło się naprawdę?' },
        ...areas.map((area, i) => ({ id: `area-${i}`, ...area })),
        { id: 'anchors', label: 'Kotwice', question: 'Co warto zapamiętać?' },
        { id: 'journal', label: 'Dziennik', question: 'Zamknij tydzień własnymi słowami' },
      ]
    : [
        { id: 'focus', label: 'Fokus', question: 'Na czym chcesz się skupić?' },
        { id: 'rhythm', label: 'Rytm', question: 'Kiedy znajdziesz na to miejsce?' },
        { id: 'review', label: 'Przegląd', question: 'Czy ten plan jest dla Ciebie?' },
      ]
)
const current = computed(() =>
  Math.max(0, Math.min(steps.value.length - 1, Math.floor(Number(route.query.step) || 0)))
)
// Reflection: step 0 = review, 1–4 = life areas, 5 = anchors, 6 = journal.
const areaIndex = computed(() => Math.max(0, Math.min(areas.length - 1, current.value - 1)))
const wideCanvas = computed(() =>
  reflecting.value ? current.value === steps.value.length - 1 : current.value === 2
)
const heading = ref<HTMLElement | null>(null),
  nameInput = ref<HTMLInputElement | null>(null)
const showAll = ref(false),
  showRest = ref(false),
  composerOpen = ref(false),
  contextOpen = ref(false),
  aiOpen = ref(false)
// Tags belong to the life area, not to a single axis; the draft input is kept per area.
const tagInput = reactive<Record<number, string>>({})
const intentionTitle = ref(''),
  intentionTarget = ref(1),
  intentionPriorities = ref<string[]>([]),
  editingKey = ref<string | null>(null)
const targetOpen = ref<string | null>(null),
  commentOpen = ref<string | null>(null),
  anchorOpen = ref<number | null>(null),
  selectedDay = ref<number | null>(null)
const aiResult = ref(''),
  aiQuestion = ref('')
const placement = (key: string) => draft.value.placements[key] ?? { days: [], wholeWeek: false }
const targetLabel = (item: LabFixtureObject) => {
  const target = draft.value.targets[item.key]
  if (!item.targetLabel && item.family === 'tracker') return 'Bez celu'
  const value = target?.value ?? 1
  const unit =
    item.entryMode === 'completion'
      ? '× / tydzień'
      : item.targetLabel?.includes('km')
        ? ' km'
        : item.targetLabel?.includes('kg')
          ? ' kg'
          : item.targetLabel?.includes(' h')
            ? ' h'
            : ''
  return `${item.targetLabel?.includes('Śr.') ? 'Śr. ' : ''}${target?.operator === 'max' ? '≤' : '≥'} ${value}${unit}${target?.entryDays ? ` · ${target.entryDays} dni` : ''}`
}
const unplaced = computed(() => selectedItems.value.filter(i => !isPlaced(placement(i.key))))
const flexibleItems = computed(() => candidates.value.filter(item => placement(item.key).wholeWeek))
const plannedDays = computed(() =>
  days.value.map(day => ({
    ...day,
    items: candidates.value.filter(
      item => !placement(item.key).wholeWeek && placement(item.key).days.includes(day.dayRef)
    ),
  }))
)
async function reviewEdit(key: string) {
  showRest.value = !draft.value.selected.includes(key)
  await go(1)
}
const journalCount = computed(() => days.value.reduce((a, d) => a + d.journalCount, 0)),
  emotionCount = computed(() => days.value.reduce((a, d) => a + d.emotionCount, 0))
const wordCount = computed(() =>
  draft.value.journal.trim() ? draft.value.journal.trim().split(/\s+/).length : 0
)
function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10,
    mod100 = n % 100
  if (n === 1) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
// Ratings are keyed by life-area index, not step index, so step order can change freely.
const ratingKey = (axis: string) => `${areaIndex.value}:${axis}`
const rating = (axis: string) => draft.value.ratings[ratingKey(axis)] ?? null
function setRating(axis: string, value: number | null) {
  draft.value.ratings[ratingKey(axis)] = value
  draft.value.touched[ratingKey(axis)] = true
}
// Previous-week level as a faint outline, only until the bar is used for the first time.
const ghostLevel = (axis: string) =>
  rating(axis) === null && !draft.value.touched[ratingKey(axis)]
    ? (previousWeekRatings[ratingKey(axis)] ?? 0)
    : 0
function stepRating(axis: string, delta: number) {
  const next = Math.max(0, Math.min(5, (rating(axis) ?? 0) + delta))
  setRating(axis, next || null)
}
const tagKey = (area: number) => `${area}:tags`
const areaTagsFor = (area: number) => draft.value.tags[tagKey(area)] ?? []
const areaTags = computed(() => areaTagsFor(areaIndex.value))
const tagSuggestions = computed(() =>
  store.recentTags.filter(tag => !areaTags.value.includes(tag)).slice(0, 8)
)
function addTag(raw: string) {
  const tag = raw.trim().replace(/\s+/g, ' ')
  if (!tag) return
  const key = tagKey(areaIndex.value)
  const existing = draft.value.tags[key] ?? []
  if (!existing.some(t => t.toLocaleLowerCase('pl') === tag.toLocaleLowerCase('pl')))
    draft.value.tags[key] = [...existing, tag]
  store.rememberTag(tag)
  tagInput[areaIndex.value] = ''
}
function removeTag(tag: string) {
  const key = tagKey(areaIndex.value)
  draft.value.tags[key] = (draft.value.tags[key] ?? []).filter(t => t !== tag)
}
// Journal context: derived from the same samples as the review step.
const quadrantCounts = computed(() => {
  const counts = Object.fromEntries(ritualQuadrants.map(q => [q, 0])) as Record<
    RitualQuadrant,
    number
  >
  for (const day of days.value) for (const emotion of day.emotions) counts[emotion.quadrant]++
  return counts
})
const quadrantSummaryLabel = computed(() =>
  ritualQuadrants.map(q => `${quadrantLabel[q]}: ${quadrantCounts.value[q]}`).join(', ')
)
const topEmotions = computed(() => {
  const counts = new Map<string, { name: string; quadrant: RitualQuadrant; count: number }>()
  for (const day of days.value)
    for (const emotion of day.emotions) {
      const entry = counts.get(emotion.name) ?? { ...emotion, count: 0 }
      entry.count++
      counts.set(emotion.name, entry)
    }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 4)
})
const journalEntries = computed(() =>
  days.value.flatMap(day =>
    day.journal.map((title, n) => ({ key: `${day.dayRef}:${n}`, day: `${day.shortLabel} ${day.dayNumber}`, title }))
  )
)
function evidenceTone(key: string): 'met' | 'missed' | 'none' {
  const value = evidenceResult(key)
  const evidence = ritualEvidence[key]
  if (value === null) return 'none'
  if (!evidence.target) return 'met'
  return value >= evidence.target ? 'met' : 'missed'
}
const commentedItems = computed(() =>
  evidenceItems.value.filter(item => draft.value.comments[item.key]?.trim())
)
const filledAnchors = computed(() =>
  anchorLabels
    .map((label, index) => ({ label, icon: anchorIcons[index], text: draft.value.anchors[index]?.trim() }))
    .filter(anchor => anchor.text)
)
function toggleWholeWeek(key: string) {
  const previous = placement(key)
  draft.value.placements[key] = { days: [...previous.days], wholeWeek: !previous.wholeWeek }
}
function normalizeTarget(key: string) {
  const target = draft.value.targets[key]
  target.value = Math.min(9999, Math.max(0, Number(target.value) || 0))
  target.entryDays = Number(target.entryDays)
    ? Math.min(7, Math.max(1, Math.round(Number(target.entryDays))))
    : null
}
function resultLabel(key: string) {
  const value = evidenceResult(key)
  if (value === null) return 'Brak zapisów'
  const evidence = ritualEvidence[key]
  return `${new Intl.NumberFormat('pl', { maximumFractionDigits: 1 }).format(value)}${evidence.target ? ` / ${evidence.target}` : evidence.average ? ' / 5' : evidence.unit ? ` ${evidence.unit}` : ''}`
}
function toggleFocus(key: string) {
  draft.value.selected = draft.value.selected.includes(key)
    ? draft.value.selected.filter(k => k !== key)
    : [...draft.value.selected, key]
}
async function go(index: number) {
  await router.replace({ query: { ...route.query, step: index || undefined } })
  await nextTick()
  heading.value?.focus({ preventScroll: true })
  heading.value?.scrollIntoView?.({ block: 'nearest' })
}
async function openComposer() {
  editingKey.value = null
  intentionTitle.value = ''
  intentionTarget.value = 1
  intentionPriorities.value = []
  composerOpen.value = true
  await nextTick()
  nameInput.value?.focus()
}
async function editIntention(item: LabFixtureObject) {
  editingKey.value = item.key
  intentionTitle.value = item.title
  intentionTarget.value = draft.value.targets[item.key]?.value ?? 1
  intentionPriorities.value = [...item.priorityKeys]
  composerOpen.value = true
  await nextTick()
  nameInput.value?.focus()
}
function saveIntention() {
  if (
    !intentionTitle.value.trim() ||
    !Number.isFinite(intentionTarget.value) ||
    intentionTarget.value < 1
  )
    return
  const key = editingKey.value ?? `intention-${crypto.randomUUID()}`
  const item: LabFixtureObject = {
    key,
    title: intentionTitle.value.trim(),
    family: 'intention',
    cadence: 'weekly',
    entryMode: 'completion',
    targetLabel: `${intentionTarget.value}×`,
    priorityKeys: [...intentionPriorities.value],
    chart: [],
  }
  draft.value.intentions = [...draft.value.intentions.filter(i => i.key !== key), item]
  draft.value.targets[key] = { value: intentionTarget.value, operator: 'min', entryDays: null }
  if (!editingKey.value) draft.value.selected.push(key)
  composerOpen.value = false
}
function removeIntention(key: string) {
  draft.value.intentions = draft.value.intentions.filter(i => i.key !== key)
  draft.value.selected = draft.value.selected.filter(k => k !== key)
  delete draft.value.placements[key]
  draft.value.removedKeys.push(key)
  composerOpen.value = false
}
async function finishAndPlan() {
  draft.value.completed = true
  await router.push({
    path: '/preview/ritual-week/quiet-v2/plan',
    query: { ref: getNextPeriod(weekRef.value) },
  })
}
watch(
  () =>
    [
      draft.value,
      JSON.stringify([
        draft.value.selected,
        draft.value.removedKeys,
        draft.value.intentions,
        draft.value.placements,
        draft.value.targets,
        draft.value.ratings,
        draft.value.tags,
        draft.value.comments,
        draft.value.anchors,
        draft.value.journal,
      ]),
    ] as const,
  ([next], [previous]) => {
    if (next === previous) next.completed = false
  }
)
</script>

<style scoped src="./quietWeeklyRitual.css"></style>
