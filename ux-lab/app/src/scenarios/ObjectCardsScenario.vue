<template>
  <section class="scenario-page concept-page object-lab mg-design-v2">
    <header class="concept-heading">
      <div>
        <span class="lab-eyebrow">Eksperyment · biblioteka obiektów · karta w edycji</span>
        <h1>Karta obiektu, którą czyta się jednym spojrzeniem</h1>
        <p>
          Rozwinięta karta nawyku, trackera, rezultatu i intencji dla każdego trybu wpisu. Po lewej wierna replika
          produktu, po prawej propozycja w tej samej szerokości i na tych samych tokenach. Zmiany zostają w pamięci strony.
        </p>
      </div>
      <span class="status-badge status-badge--experiment">Propozycja do oceny</span>
    </header>

    <!-- 1 · Stan obecny -->
    <section class="object-lab__block">
      <header class="object-lab__block-head">
        <span class="lab-eyebrow">01 · Stan obecny</span>
        <h2>Co widać na zrzutach z verify (1440 px, trzy kolumny kart)</h2>
      </header>
      <div class="object-lab__evidence">
        <nav class="object-lab__findings" aria-label="Znaleziska">
          <button
            v-for="finding in findings"
            :key="finding.id"
            type="button"
            :class="{ active: activeFinding.id === finding.id }"
            @click="findingId = finding.id"
          >
            <span class="object-lab__finding-index">{{ finding.id }}</span>
            <span><strong>{{ finding.title }}</strong><small>{{ finding.where }}</small></span>
          </button>
        </nav>
        <figure class="object-lab__shot">
          <div class="object-lab__shot-frame"><img :src="activeFinding.image" :alt="activeFinding.title" /></div>
          <figcaption>
            <strong>{{ activeFinding.title }}</strong>
            <p>{{ activeFinding.body }}</p>
            <p class="object-lab__fix"><AppIcon name="arrow_forward" /> {{ activeFinding.fix }}</p>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 2 · Scena -->
    <section class="object-lab__block">
      <header class="object-lab__block-head">
        <span class="lab-eyebrow">02 · Obecnie i propozycja na tej samej próbce</span>
        <h2>Przełączaj rodzinę, tryb i opcje — obie karty czytają ten sam stan</h2>
      </header>

      <div class="object-lab__toolbar neo-card" aria-label="Scenariusz karty">
        <label>Rodzina
          <select v-model="kind" @change="resetForKind">
            <option v-for="item in kindOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label>Tryb wpisu
          <select v-model="mode" @change="resetForMode">
            <option v-for="item in modeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label v-if="kind !== 'intention'">Rytm
          <select v-model="cadence">
            <option value="weekly">Tygodniowy</option>
            <option value="monthly">Miesięczny</option>
          </select>
        </label>
        <label v-if="kind !== 'intention'">Okresy
          <select v-model="periodSample">
            <option value="none">Brak</option>
            <option value="one">Jeden</option>
            <option value="five">Pięć · jak na zrzucie</option>
            <option value="long">Siedemnaście · jak w verify</option>
            <option value="gaps">Z przerwami</option>
          </select>
        </label>
        <label v-if="hasTarget && mode !== 'completion'" class="object-lab__check">
          <input v-model="entryDaysOn" type="checkbox" /> Warunek dni z wpisem
        </label>
        <label class="object-lab__check"><input v-model="rulesFilled" type="checkbox" /> Zasady wypełnione</label>
        <label class="object-lab__check"><input v-model="longTitle" type="checkbox" /> Długi tytuł</label>
        <button class="object-lab__reset" type="button" @click="resetAll">Przywróć przykład</button>
      </div>

      <div class="object-lab__stages">
        <section class="object-lab__stage-col">
          <header>
            <span class="lab-eyebrow">Obecnie</span>
            <h3>Replika produkcyjnej karty</h3>
            <p>Ten sam HTML i klasy co w <code>ObjectsLibraryMeasurementCard</code> / <code>ObjectsLibraryKrCard</code>.</p>
          </header>
          <div class="object-lab__stage">
            <component :is="kind === 'kr' ? 'div' : 'div'" :class="kind === 'kr' ? 'object-lab__goal-frame mg-v2-surface mg-v2-surface--raised-sm' : 'object-lab__card-slot'">
              <div v-if="kind === 'kr'" class="object-lab__goal-head">
                <span class="object-lab__icon-circle" />
                <span class="text-sm font-semibold text-on-surface">Zbudować spokojniejszy poranek</span>
              </div>
              <article
                class="group/card"
                :class="kind === 'kr' ? 'mg-v2-surface mg-v2-surface--flat p-2.5' : 'mg-v2-surface mg-v2-surface--raised-sm p-3'"
              >
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span v-if="kind !== 'kr'" class="object-lab__icon-circle object-lab__icon-circle--lg" />
                    <input
                      v-model="title"
                      type="text"
                      class="min-w-0 flex-1 bg-transparent px-1 py-1.5 font-semibold text-on-surface outline-none"
                      :class="kind === 'kr' ? 'text-xs font-medium' : 'text-sm'"
                    />
                    <div class="mg-v2-card-tray object-lab__tray-visible">
                      <button type="button" class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0" aria-label="Ukryj szczegóły"><AppIcon name="expand_less" class="text-base" /></button>
                      <button type="button" class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0" aria-label="More actions"><AppIcon name="more_horiz" class="text-base" /></button>
                    </div>
                  </div>

                  <div v-if="kind !== 'kr'" class="mg-v2-glyph-row px-1" role="group" aria-label="Powiązania">
                    <button type="button" class="mg-v2-glyph mg-v2-glyph--pencil" aria-label="Regularny ruch i kondycja"><AppIcon name="flag" class="text-xs" /></button>
                    <span class="mg-v2-glyph-row__sep" aria-hidden="true" />
                    <button type="button" class="mg-v2-glyph" aria-label="Zdrowie"><AppIcon name="fitness_center" class="text-xs" /></button>
                  </div>

                  <div class="space-y-3 pt-1">
                    <div v-if="mode === 'rating' && kind !== 'kr'" class="space-y-1">
                      <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Skala</div>
                      <div class="flex items-center gap-1.5">
                        <label class="text-[9px] text-on-surface-variant/70">Od</label>
                        <input v-model.number="ratingMin" type="number" step="1" min="0" class="mg-v2-field !w-12 !px-1.5 text-center text-xs" />
                        <label class="text-[9px] text-on-surface-variant/70">Do</label>
                        <input v-model.number="ratingMax" type="number" step="1" min="1" class="mg-v2-field !w-12 !px-1.5 text-center text-xs" />
                      </div>
                    </div>

                    <div v-if="mode === 'multi-completion' && kind !== 'kr'" class="space-y-2">
                      <div class="flex items-center justify-between">
                        <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                          Elementy <span class="ml-1 normal-case tracking-normal text-on-surface-variant/60">{{ items.length }}/8</span>
                        </div>
                        <button type="button" class="neo-badge flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-on-surface" @click="addItem"><AppIcon name="add" class="text-xs" /> Dodaj element</button>
                      </div>
                      <ul class="space-y-1">
                        <li v-for="(item, index) in items" :key="item.id" class="flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/30 px-1.5 py-1">
                          <span class="object-lab__icon-circle object-lab__icon-circle--sm"><AppIcon :name="item.icon" class="text-xs" /></span>
                          <input v-model="item.label" type="text" class="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-xs font-medium text-on-surface outline-none" />
                          <label class="flex shrink-0 items-center gap-1 text-[9px] text-on-surface-variant/70">waga
                            <input v-model.number="item.weight" type="number" min="1" step="1" class="neo-input w-10 px-1 py-0.5 text-center text-xs" />
                          </label>
                          <div class="flex shrink-0 items-center">
                            <button type="button" class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 disabled:opacity-30" :disabled="index === 0" aria-label="W górę" @click="moveItem(index, -1)"><AppIcon name="keyboard_arrow_up" class="text-sm" /></button>
                            <button type="button" class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 disabled:opacity-30" :disabled="index === items.length - 1" aria-label="W dół" @click="moveItem(index, 1)"><AppIcon name="keyboard_arrow_down" class="text-sm" /></button>
                            <button type="button" class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 disabled:opacity-30" :disabled="items.length <= 1" aria-label="Archiwizuj" @click="removeItem(index)"><AppIcon name="inventory_2" class="text-sm" /></button>
                          </div>
                        </li>
                      </ul>
                      <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-on-surface">
                        <span class="text-on-surface-variant">Zalicz dzień przy</span>
                        <LabPill v-model="thresholdMode" legacy :options="thresholdOptions" />
                        <template v-if="thresholdMode === 'custom'">
                          <input v-model.number="threshold" type="number" min="1" :max="weightSum" class="neo-badge w-14 px-2 py-1 text-center text-sm font-semibold text-on-surface focus:outline-none" aria-label="Próg" />
                          <span class="text-on-surface-variant">{{ thresholdSuffix }}</span>
                        </template>
                      </div>
                    </div>

                    <div class="grid gap-3" :class="hasTarget ? 'grid-cols-2' : 'grid-cols-1'">
                      <div v-if="kind !== 'intention'" class="space-y-1">
                        <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Okresy</div>
                        <div class="mg-v2-surface mg-v2-surface--flat relative min-h-[60px] p-1.5">
                          <button type="button" class="mg-v2-button mg-v2-button--quiet"><AppIcon name="calendar_month" /><span>Wybierz okresy</span><span v-if="periods.length">({{ periods.length }})</span></button>
                          <p v-if="!periods.length" class="text-xs text-on-surface-variant">Brak okresów</p>
                          <div v-else-if="periods.length <= 3" class="flex flex-wrap gap-1"><span v-for="p in periods" :key="p.key" class="mg-v2-badge">{{ p.label }}</span></div>
                          <details v-else class="text-xs text-on-surface-variant">
                            <summary class="cursor-pointer py-1">{{ legacyPeriodSummary }}</summary>
                            <div class="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto"><span v-for="p in periods" :key="p.key" class="mg-v2-badge">{{ p.label }}</span></div>
                          </details>
                        </div>
                      </div>
                      <div v-if="hasTarget" class="space-y-1">
                        <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Cel</div>
                        <div class="neo-surface flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-xl px-3 py-2 text-sm text-on-surface">
                          <LabPill v-model="mode" legacy :options="modeOptions" @update:model-value="resetForMode" />
                          <span v-if="mode === 'rating'" class="text-on-surface-variant">średnia</span>
                          <LabPill v-if="mode === 'value'" v-model="aggregation" legacy :options="aggregationOptions" />
                          <LabPill v-model="operator" legacy :options="operatorOptions" />
                          <input v-model.number="targetValue" type="number" class="neo-badge w-16 px-2 py-1 text-center text-sm font-semibold text-on-surface focus:outline-none" aria-label="Wartość celu" />
                          <span v-if="mode === 'rating'" class="text-on-surface-variant">na {{ ratingMax }}</span>
                          <span v-else-if="mode === 'completion'" class="text-on-surface-variant">razy</span>
                          <span v-else-if="mode === 'multi-completion'" class="text-on-surface-variant">dni z zaliczeniem</span>
                          <template v-if="entryDaysOn && mode !== 'completion'">
                            <span class="text-on-surface-variant">i loguj</span>
                            <LabPill v-model="entryDaysOperator" legacy :options="operatorOptions" />
                            <input v-model.number="entryDaysValue" type="number" min="1" class="neo-badge w-16 px-2 py-1 text-center text-sm font-semibold text-on-surface focus:outline-none" aria-label="Liczba dni z wpisem" />
                            <span class="text-on-surface-variant">dni</span>
                          </template>
                          <LabPill v-if="kind !== 'intention'" v-model="cadence" legacy :options="cadenceOptions" />
                          <span v-else-if="mode !== 'rating'" class="text-on-surface-variant">w tygodniu</span>
                          <button v-if="mode !== 'completion' && !entryDaysOn" type="button" class="rounded-full px-2 py-0.5 text-xs font-medium text-on-surface-variant underline decoration-dotted underline-offset-2" @click="entryDaysOn = true">+ warunek dni</button>
                        </div>
                      </div>
                    </div>

                    <div v-if="mode === 'multi-completion' && kind === 'kr'" class="text-xs text-on-surface-variant">(w rezultacie lista elementów renderuje się pod celem — jak w produkcie)</div>

                    <div v-if="kind !== 'intention'" class="space-y-1">
                      <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Zasady zaliczenia</div>
                      <textarea v-model="rules" class="mg-v2-field w-full resize-y text-xs" rows="2" placeholder="Opisz, kiedy ten obiekt uznajesz za zaliczony" />
                    </div>
                  </div>

                  <LabSparkline :mode="mode" />
                </div>
              </article>
            </component>
          </div>
        </section>

        <section class="object-lab__stage-col">
          <header>
            <span class="lab-eyebrow">Propozycja</span>
            <h3>Jedna kolumna, zdania zamiast siatki</h3>
            <p>Te same tokeny (mist → paper), te same pickery pod spodem; zmienia się tylko układ i to, co jest widoczne bez interakcji.</p>
          </header>
          <div class="object-lab__stage">
            <div :class="kind === 'kr' ? 'object-lab__goal-frame mg-v2-surface mg-v2-surface--raised-sm' : 'object-lab__card-slot'">
              <div v-if="kind === 'kr'" class="object-lab__goal-head">
                <span class="object-lab__icon-circle" />
                <span class="text-sm font-semibold text-on-surface">Zbudować spokojniejszy poranek</span>
              </div>
              <article class="oc" :class="kind === 'kr' ? 'oc--nested mg-v2-surface mg-v2-surface--flat' : 'mg-v2-surface mg-v2-surface--raised-sm'">
                <div class="oc__head">
                  <span v-if="kind !== 'kr'" class="object-lab__icon-circle object-lab__icon-circle--lg" />
                  <input v-model="title" type="text" class="oc__title" :class="{ 'oc__title--sm': kind === 'kr' }" />
                  <div class="oc__tray">
                    <button type="button" class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet" :aria-label="expanded ? 'Ukryj szczegóły' : 'Pokaż szczegóły'" @click="expanded = !expanded"><AppIcon :name="expanded ? 'expand_less' : 'expand_more'" class="text-base" /></button>
                    <button type="button" class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet" aria-label="Więcej"><AppIcon name="more_horiz" class="text-base" /></button>
                  </div>
                </div>
                <div v-if="kind !== 'kr'" class="mg-v2-glyph-row oc__glyphs" role="group" aria-label="Powiązania">
                  <button type="button" class="mg-v2-glyph mg-v2-glyph--pencil" aria-label="Regularny ruch i kondycja"><AppIcon name="flag" class="text-xs" /></button>
                  <span class="mg-v2-glyph-row__sep" aria-hidden="true" />
                  <button type="button" class="mg-v2-glyph" aria-label="Zdrowie"><AppIcon name="fitness_center" class="text-xs" /></button>
                </div>

                <p v-if="!expanded" class="mg-v2-meta oc__meta">
                  <span>{{ kind === 'intention' ? 'Ten tydzień' : cadence === 'weekly' ? 'Tygodniowy' : 'Miesięczny' }}</span>
                  <span>{{ modeNoun }}</span>
                  <span v-if="hasTarget">{{ targetSummary }}</span>
                  <span v-if="kind !== 'intention' && periods.length">{{ periodFacts.short }}</span>
                </p>

                <div v-else class="oc__body">
                  <!-- Zdanie: wpis + cel -->
                  <section class="oc__section">
                    <p class="oc__sentence neo-surface">
                      <LabPill v-model="mode" legacy :options="modeOptions" @update:model-value="resetForMode" />
                      <template v-if="mode === 'rating'">
                        <span class="oc__word">od</span>
                        <input v-model.number="ratingMin" type="number" min="0" :max="ratingMax - 1" class="neo-badge oc__num oc__num--sm" aria-label="Dolna granica skali" />
                        <span class="oc__word">do</span>
                        <input v-model.number="ratingMax" type="number" :min="ratingMin + 1" max="100" class="neo-badge oc__num oc__num--sm" aria-label="Górna granica skali" />
                        <span class="oc__glue">
                          <LabPill v-if="kind !== 'intention'" v-model="cadence" legacy :options="cadenceOptions" />
                          <span v-else class="oc__word">w tym tygodniu</span>
                          <span v-if="hasTarget" class="oc__word oc__word--glue">, średnio</span>
                        </span>
                        <template v-if="hasTarget">
                          <LabPill v-model="operator" legacy :options="operatorOptions" />
                          <input v-model.number="targetValue" type="number" :min="ratingMin" :max="ratingMax" class="neo-badge oc__num" aria-label="Wartość celu" />
                        </template>
                      </template>
                      <template v-else>
                        <template v-if="hasTarget">
                          <LabPill v-if="mode === 'value'" v-model="aggregation" legacy :options="aggregationOptions" />
                          <LabPill v-model="operator" legacy :options="operatorOptions" />
                          <input v-model.number="targetValue" type="number" class="neo-badge oc__num" aria-label="Wartość celu" />
                          <span v-if="unitWord" class="oc__word">{{ unitWord }}</span>
                        </template>
                        <LabPill v-if="kind !== 'intention'" v-model="cadence" legacy :options="cadenceOptions" />
                        <span v-else class="oc__word">w tym tygodniu</span>
                      </template>
                      <template v-if="hasTarget && mode !== 'completion'">
                        <template v-if="entryDaysOn">
                          <span class="oc__word">i loguj</span>
                          <LabPill v-model="entryDaysOperator" legacy :options="operatorOptions" />
                          <input v-model.number="entryDaysValue" type="number" min="1" :max="cadence === 'weekly' ? 7 : 31" class="neo-badge oc__num" aria-label="Liczba dni z wpisem" />
                          <span class="oc__glue">
                            <span class="oc__word">{{ pluralDays(entryDaysValue) }}</span>
                            <button type="button" class="oc__tool oc__tool--inline" aria-label="Usuń warunek dni" @click="entryDaysOn = false"><AppIcon name="close" class="text-xs" /></button>
                          </span>
                        </template>
                        <button v-else type="button" class="oc__link oc__link--quiet" @click="entryDaysOn = true">+ dni z wpisem</button>
                      </template>
                    </p>
                  </section>

                  <!-- Elementy -->
                  <section v-if="mode === 'multi-completion'" class="oc__section">
                    <div class="oc__section-head">
                      <h4 class="oc__label">Elementy <span class="oc__count">{{ items.length }}/8</span></h4>
                      <div class="oc__section-actions">
                        <button type="button" class="oc__link" :aria-pressed="weightsOn" @click="weightsOn = !weightsOn">Wagi</button>
                        <button type="button" class="oc__link" :disabled="items.length >= 8" aria-label="Dodaj element" @click="addItem"><AppIcon name="add" class="text-sm" /></button>
                      </div>
                    </div>
                    <ul class="oc__items">
                      <li v-for="(item, index) in items" :key="item.id" class="oc__item">
                        <span class="oc__item-icon"><AppIcon :name="item.icon" class="text-xs" /></span>
                        <input v-model="item.label" type="text" class="oc__item-label" :aria-label="`Nazwa elementu ${index + 1}`" />
                        <input v-if="weightsOn" v-model.number="item.weight" type="number" min="1" class="neo-badge oc__num oc__num--weight" :aria-label="`Waga: ${item.label}`" />
                        <span v-else-if="item.weight !== 1" class="oc__weight">×{{ item.weight }}</span>
                        <span class="oc__item-tools">
                          <button type="button" class="oc__tool" :disabled="index === 0" aria-label="W górę" @click="moveItem(index, -1)"><AppIcon name="keyboard_arrow_up" class="text-sm" /></button>
                          <button type="button" class="oc__tool" :disabled="index === items.length - 1" aria-label="W dół" @click="moveItem(index, 1)"><AppIcon name="keyboard_arrow_down" class="text-sm" /></button>
                          <button type="button" class="oc__tool" :disabled="items.length <= 1" aria-label="Archiwizuj" @click="removeItem(index)"><AppIcon name="inventory_2" class="text-sm" /></button>
                        </span>
                      </li>
                    </ul>
                    <p class="oc__sentence neo-surface">
                      <span class="oc__word">Zalicz dzień przy</span>
                      <LabPill v-model="thresholdMode" legacy :options="thresholdOptions" />
                      <template v-if="thresholdMode === 'custom'">
                        <input v-model.number="threshold" type="number" min="1" :max="weightSum" class="neo-badge oc__num" aria-label="Próg dnia" />
                        <span class="oc__word">{{ thresholdSuffix }}</span>
                      </template>
                    </p>
                  </section>

                  <!-- Okresy -->
                  <section v-if="kind !== 'intention'" class="oc__section">
                    <h4 class="oc__label">Okresy</h4>
                    <button type="button" class="mg-v2-inline-trigger oc__periods" :aria-label="`Okresy: ${periodFacts.long}. Zmień`" title="Zmień okresy">
                      <span v-if="monthRows.length" class="oc__rows" aria-hidden="true">
                        <span v-for="row in monthRows" :key="row.key" class="oc__row">
                          <span class="oc__row-label">{{ row.label }}</span>
                          <span class="oc__row-cells">
                            <span
                              v-for="cell in row.cells"
                              :key="cell.key"
                              class="oc__cell"
                              :class="{ 'oc__cell--on': cell.on, 'oc__cell--today': cell.today, 'oc__cell--past': cell.past }"
                              :title="cell.title"
                            />
                          </span>
                        </span>
                      </span>
                      <span v-else class="oc__strip--empty" aria-hidden="true"><span class="mg-v2-hairline oc__hairline" /></span>
                      <span class="oc__periods-line">
                        <span>{{ periodFacts.long }}</span>
                        <AppIcon name="calendar_month" class="oc__periods-icon text-sm" />
                      </span>
                    </button>
                  </section>
                  <section v-else class="oc__section">
                    <h4 class="oc__label">Tydzień</h4>
                    <p class="oc__quiet">21 – 27 wrz 2026</p>
                  </section>

                  <!-- Zasady -->
                  <section v-if="kind !== 'intention'" class="oc__section">
                    <h4 class="oc__label">Zasady zaliczenia</h4>
                    <textarea v-if="rulesEditing || !rules" ref="rulesRef" v-model="rules" class="oc__rules-edit" :rows="rulesRows" placeholder="Kiedy dzień jest zaliczony?" @blur="rulesEditing = false" />
                    <button v-else type="button" class="mg-v2-inline-trigger oc__rules" aria-label="Edytuj zasady zaliczenia" @click="startRulesEdit">
                      <span class="oc__rules-text">{{ rules }}</span>
                    </button>
                  </section>
                </div>

                <LabSparkline :mode="mode" />
              </article>
            </div>
          </div>
        </section>
      </div>
    </section>

    <!-- 3 · Decyzje -->
    <section class="object-lab__block">
      <header class="object-lab__block-head">
        <span class="lab-eyebrow">03 · Propozycje zmian</span>
        <h2>Osiem decyzji do oceny</h2>
      </header>
      <ol class="object-lab__decisions">
        <li v-for="decision in decisions" :key="decision.id" class="neo-card">
          <span class="object-lab__decision-id">{{ decision.id }}</span>
          <div>
            <h3>{{ decision.title }}</h3>
            <p>{{ decision.body }}</p>
            <p v-if="decision.scope" class="object-lab__scope"><AppIcon name="code" /> {{ decision.scope }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- 4 · Zakres -->
    <section class="object-lab__coverage neo-card">
      <span class="lab-eyebrow">Zakres przeglądu</span>
      <h2>Co sprawdziliśmy w verify i w prototypie</h2>
      <div class="object-lab__coverage-grid">
        <p><strong>Rodziny</strong>Nawyk · tracker · rezultat w celu · intencja tygodnia. Cel i priorytet nie mają trybu wpisu — ich karty (oś, lata, pola opisowe) zostają bez zmian.</p>
        <p><strong>Tryby</strong>Wykonuj · Odhaczaj (elementy, wagi, próg) · Zliczaj · Mierz (suma/średnia/ostatnia) · Oceniaj (skala od–do).</p>
        <p><strong>Opcje</strong>Tydzień/miesiąc · co najmniej/co najwyżej · warunek dni z wpisem · 0/1/5/17 okresów · okresy z przerwami · puste i wypełnione zasady · długi tytuł.</p>
        <p><strong>Granice</strong>Tracker bez celu; intencja bez okresów (stały tydzień); rezultat zagnieżdżony w karcie celu (najwęższa szerokość); wagi tylko na żądanie.</p>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, reactive, ref, watch, type PropType } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@product/components/shared/AppIcon.vue'

type Kind = 'habit' | 'tracker' | 'kr' | 'intention'
type Mode = 'completion' | 'multi-completion' | 'counter' | 'value' | 'rating'
type PeriodSample = 'none' | 'one' | 'five' | 'long' | 'gaps'
interface Option { value: string; label: string }
interface Item { id: number; label: string; icon: string; weight: number }

// ---------------------------------------------------------------------------
// Lab-local pill select: a real <select> drawn as the product's flat badge pill
// (legacy = the current neo-badge look; default = the proposed oc-pill look).
const LabPill = defineComponent({
  name: 'LabPill',
  props: {
    modelValue: { type: String, required: true },
    options: { type: Array as PropType<Option[]>, required: true },
    legacy: { type: Boolean, default: false },
    ariaLabel: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => {
      const label = props.options.find(o => o.value === props.modelValue)?.label ?? props.modelValue
      return h('span', { class: ['lab-pill', 'neo-badge', { 'lab-pill--legacy': props.legacy }] }, [
        h('span', { class: 'lab-pill__label' }, label),
        h(AppIcon, { name: 'expand_more', class: 'lab-pill__chevron' }),
        h('select', {
          class: 'lab-pill__select',
          value: props.modelValue,
          'aria-label': props.ariaLabel ?? label,
          onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value),
        }, props.options.map(o => h('option', { value: o.value, selected: o.value === props.modelValue }, o.label))),
      ])
    }
  },
})

// Deterministic 12-column sparkline in the product's sky/rose language.
const LabSparkline = defineComponent({
  name: 'LabSparkline',
  props: { mode: { type: String as PropType<Mode>, required: true } },
  setup(props) {
    const heights = [70, 22, 70, 70, 26, 70, 70, 20, 70, 70, 24, 46]
    return () =>
      h('div', { class: 'lab-spark', 'aria-hidden': 'true' }, [
        h('span', { class: 'lab-spark__target' }),
        ...heights.map((height, i) =>
          h('span', {
            class: ['lab-spark__bar', { 'lab-spark__bar--miss': height < 40, 'lab-spark__bar--rating': props.mode === 'rating' }],
            style: { height: `${props.mode === 'rating' ? 34 : height}%` },
            key: i,
          }),
        ),
      ])
  },
})

// ---------------------------------------------------------------------------
const kindOptions: { id: Kind; label: string }[] = [
  { id: 'habit', label: 'Nawyk' },
  { id: 'tracker', label: 'Tracker' },
  { id: 'kr', label: 'Rezultat w celu' },
  { id: 'intention', label: 'Intencja tygodnia' },
]
const modeOptions: Option[] = [
  { value: 'completion', label: 'Wykonuj' },
  { value: 'multi-completion', label: 'Odhaczaj' },
  { value: 'counter', label: 'Zliczaj' },
  { value: 'value', label: 'Mierz' },
  { value: 'rating', label: 'Oceniaj' },
]
const modeNouns: Record<Mode, string> = { completion: 'Wykonanie', 'multi-completion': 'Checklista', counter: 'Licznik', value: 'Wartość', rating: 'Ocena' }
const cadenceOptions: Option[] = [{ value: 'weekly', label: 'w tygodniu' }, { value: 'monthly', label: 'w miesiącu' }]
const aggregationOptions: Option[] = [{ value: 'sum', label: 'Suma' }, { value: 'average', label: 'Średnia' }, { value: 'last', label: 'Ostatnia wartość' }]
const operatorOptions: Option[] = [{ value: 'min', label: 'Co najmniej' }, { value: 'max', label: 'Co najwyżej' }]
const thresholdOptions: Option[] = [{ value: 'all', label: 'komplecie elementów' }, { value: 'custom', label: 'progu punktowym' }]

const route = useRoute()
const router = useRouter()
const isKind = (v: unknown): v is Kind => kindOptions.some(k => k.id === v)
const isMode = (v: unknown): v is Mode => modeOptions.some(m => m.value === v)
const isSample = (v: unknown): v is PeriodSample => ['none', 'one', 'five', 'long', 'gaps'].includes(String(v))

const kind = ref<Kind>(isKind(route.query.kind) ? route.query.kind : 'habit')
const mode = ref<Mode>(isMode(route.query.mode) ? route.query.mode : 'multi-completion')
const cadence = ref<'weekly' | 'monthly'>(route.query.cadence === 'monthly' ? 'monthly' : 'weekly')
const periodSample = ref<PeriodSample>(isSample(route.query.periods) ? route.query.periods : 'five')
const entryDaysOn = ref(route.query.days !== '0')
const rulesFilled = ref(route.query.rules !== '0')
const longTitle = ref(route.query.long === '1')
const expanded = ref(true)
const weightsOn = ref(false)
const rulesEditing = ref(false)
const rulesRef = ref<HTMLTextAreaElement | null>(null)

const ratingMin = ref(1)
const ratingMax = ref(5)
const operator = ref('min')
const aggregation = ref('sum')
const targetValue = ref(4)
const entryDaysOperator = ref('min')
const entryDaysValue = ref(5)

const defaultItems = (): Item[] => [
  { id: 1, label: 'Pobudka 6–7', icon: 'schedule', weight: 1 },
  { id: 2, label: 'Ruch', icon: 'directions_run', weight: 1 },
  { id: 3, label: 'Bez telefonu', icon: 'phonelink_erase', weight: 1 },
  { id: 4, label: "Bez YouTube'a", icon: 'smart_display', weight: 1 },
  { id: 5, label: '5 min plan', icon: 'edit', weight: 1 },
  { id: 6, label: 'Deep work session', icon: 'auto_awesome', weight: 2 },
]
const items = reactive<Item[]>(defaultItems())
const thresholdMode = ref<'all' | 'custom'>('all')
const threshold = ref(5)
const weightSum = computed(() => items.reduce((sum, item) => sum + item.weight, 0))
const allWeightsOne = computed(() => items.every(item => item.weight === 1))
const thresholdSuffix = computed(() => (allWeightsOne.value ? `z ${weightSum.value} elementów` : `z ${weightSum.value} pkt`))

const defaultRules = `- Ruch = minimum 5 min mobility, albo spacer i każdy trening
- Bez telefonu = do końca deep work session w ogóle bez
- Bez YouTube'a = zero YT do 13
- 5 min plan = dosłownie 5 min zanim zacznę faktyczną pracę: potwierdzam kalendarz, tworzę bloki na zadania i przerwy, krótki journal
- Deep work session = jak najwcześniej w dniu się da, minimum ~30 min deep work`
const rules = ref(defaultRules)
watch(rulesFilled, filled => { rules.value = filled ? defaultRules : '' })
const rulesRows = computed(() => Math.min(8, Math.max(2, rules.value.split('\n').length + 1)))
async function startRulesEdit() { rulesEditing.value = true; await nextTick(); rulesRef.value?.focus() }

const baseTitles: Record<Kind, string> = { habit: 'Poranna rutyna', tracker: 'Czas skupionej pracy', kr: 'Regularny start dnia', intention: 'Wrócić do wieczornego planu' }
const title = ref(baseTitles.habit)
watch([kind, longTitle], () => { title.value = longTitle.value ? 'Poranna rutyna bez telefonu, z ruchem i spokojnym planowaniem dnia' : baseTitles[kind.value] })

const hasTarget = computed(() => kind.value !== 'tracker')
const modeNoun = computed(() => modeNouns[mode.value])
const unitWord = computed(() => {
  if (mode.value === 'completion') return pluralTimes(targetValue.value)
  if (mode.value === 'multi-completion') return pluralDaysMet(targetValue.value)
  return ''
})
function pluralDays(n: number) { return n === 1 ? 'dzień' : 'dni' }
function pluralTimes(n: number) { return n === 1 ? 'raz' : 'razy' }
function pluralDaysMet(n: number) { return n === 1 ? 'dzień z zaliczeniem' : 'dni z zaliczeniem' }
const targetSummary = computed(() => {
  const op = operator.value === 'min' ? 'Co najmniej' : 'Co najwyżej'
  const base = mode.value === 'value' ? `${aggregationOptions.find(o => o.value === aggregation.value)?.label} ${op.toLowerCase()} ${targetValue.value}` : mode.value === 'rating' ? `Średnia ${op.toLowerCase()} ${targetValue.value}` : `${op} ${targetValue.value}`
  return entryDaysOn.value && mode.value !== 'completion' ? `${base} · ${entryDaysOperator.value === 'min' ? '≥' : '≤'} ${entryDaysValue.value} dni` : base
})

// ---------------------------------------------------------------------------
// Periods: a span of weeks/months around the verify anchor (today = 23 wrz 2026).
const TODAY = Date.UTC(2026, 8, 23)
interface Period { key: string; label: string; start: number; end: number; on: boolean }
const weekLabel = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
const monthLabel = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' })
function buildPeriods(sample: PeriodSample, weekly: boolean): Period[] {
  const count = sample === 'none' ? 0 : sample === 'one' ? 1 : sample === 'five' ? 5 : weekly ? 17 : 12
  const gaps = sample === 'gaps' ? new Set(weekly ? [5, 6, 10, 11] : [2, 3, 7]) : new Set<number>()
  const startWeek = sample === 'five' ? Date.UTC(2026, 8, 7) : sample === 'one' ? Date.UTC(2026, 8, 21) : Date.UTC(2026, 5, 1)
  const startMonth = sample === 'five' ? 5 : sample === 'one' ? 8 : 0
  return Array.from({ length: count }, (_, i) => {
    if (weekly) {
      const start = startWeek + i * 7 * 86_400_000
      const end = start + 6 * 86_400_000
      return { key: `w${i}`, label: `${weekLabel.format(start)} – ${weekLabel.format(end)}`, start, end, on: !gaps.has(i) }
    }
    const start = Date.UTC(2026, startMonth + i, 1)
    const end = Date.UTC(2026, startMonth + i + 1, 0)
    return { key: `m${i}`, label: monthLabel.format(start), start, end, on: !gaps.has(i) }
  })
}
const allPeriods = computed(() => buildPeriods(periodSample.value, cadence.value === 'weekly'))
const periods = computed(() => allPeriods.value.filter(p => p.on))
const rangeFormatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
const monthRangeFormatter = new Intl.DateTimeFormat('pl-PL', { month: 'short', year: 'numeric' })
function pluralWeeks(n: number) { return n === 1 ? 'tydzień' : n >= 2 && n <= 4 ? 'tygodnie' : 'tygodni' }
function pluralMonths(n: number) { return n === 1 ? 'miesiąc' : n >= 2 && n <= 4 ? 'miesiące' : 'miesięcy' }
const periodFacts = computed(() => {
  const list = periods.value
  if (!list.length) return { long: 'Bez okresów', short: 'bez okresów', count: 'Bez okresów', gaps: '' }
  const weekly = cadence.value === 'weekly'
  const first = list[0]; const last = list[list.length - 1]
  const range = weekly
    ? rangeFormatter.formatRange(new Date(first.start), new Date(last.end))
    : monthRangeFormatter.formatRange(new Date(first.start), new Date(last.start))
  const count = weekly ? `${list.length} ${pluralWeeks(list.length)}` : `${list.length} ${pluralMonths(list.length)}`
  const gaps = list.length !== allPeriods.value.length ? ' · z przerwami' : ''
  return { long: `${range} · ${count}${gaps}`, short: count, count, gaps }
})
const legacyPeriodSummary = computed(() => {
  const list = periods.value
  const first = list[0]; const last = list[list.length - 1]
  const dates = rangeFormatter.formatRange(new Date(first.start), new Date(last.end))
  const gaps = list.length !== allPeriods.value.length ? ' · z przerwami' : ''
  return `${dates} · Wybrano: ${list.length}${gaps}`
})

// Periods drawn as a month calendar: row = month (or year for monthly cadence), cell = period
const monthShort = new Intl.DateTimeFormat('pl-PL', { month: 'short' })
const monthOf = (ts: number) => { const d = new Date(ts); return `${d.getUTCFullYear()}-${d.getUTCMonth()}` }
const cellOf = (p: Period) => ({ key: p.key, on: p.on, today: TODAY >= p.start && TODAY <= p.end, past: p.end < TODAY, title: p.label })
const monthRows = computed(() => {
  const list = allPeriods.value
  if (!list.length) return []
  if (cadence.value === 'monthly') {
    const year = new Date(list[0].start).getUTCFullYear()
    return [{ key: String(year), label: String(year), cells: list.map(cellOf) }]
  }
  const rows = new Map<string, { key: string; label: string; cells: ReturnType<typeof cellOf>[] }>()
  for (const p of list) {
    const key = monthOf(p.start)
    if (!rows.has(key)) rows.set(key, { key, label: monthShort.format(new Date(p.start)).replace('.', ''), cells: [] })
    rows.get(key)!.cells.push(cellOf(p))
  }
  return [...rows.values()]
})

// ---------------------------------------------------------------------------
let nextId = 100
function addItem() { if (items.length >= 8) return; items.push({ id: nextId++, label: `Element ${items.length + 1}`, icon: 'check_circle', weight: 1 }) }
function removeItem(index: number) { if (items.length <= 1) return; items.splice(index, 1) }
function moveItem(index: number, dir: -1 | 1) { const target = index + dir; if (target < 0 || target >= items.length) return; const [moved] = items.splice(index, 1); items.splice(target, 0, moved) }

function resetForMode() {
  targetValue.value = mode.value === 'rating' ? 3 : mode.value === 'completion' ? 5 : mode.value === 'value' ? 15 : mode.value === 'counter' ? 10 : 4
  operator.value = mode.value === 'counter' ? 'max' : 'min'
  aggregation.value = 'sum'
  entryDaysOn.value = mode.value === 'rating' || mode.value === 'multi-completion'
  entryDaysValue.value = 5
}
function resetForKind() {
  if (kind.value === 'intention') { cadence.value = 'weekly'; mode.value = 'completion' }
  else if (kind.value === 'tracker') mode.value = 'value'
  else if (kind.value === 'kr') mode.value = 'value'
  else mode.value = 'multi-completion'
  resetForMode()
}
function resetAll() {
  kind.value = 'habit'; mode.value = 'multi-completion'; cadence.value = 'weekly'; periodSample.value = 'five'
  rulesFilled.value = true; longTitle.value = false; expanded.value = true; weightsOn.value = false
  items.splice(0, items.length, ...defaultItems()); thresholdMode.value = 'all'; threshold.value = 5
  ratingMin.value = 1; ratingMax.value = 5; title.value = baseTitles.habit; rules.value = defaultRules
  resetForMode()
}
watch([kind, mode, cadence, periodSample, entryDaysOn, rulesFilled, longTitle], () => {
  void router.replace({ query: { ...route.query, kind: kind.value, mode: mode.value, cadence: cadence.value, periods: periodSample.value, days: entryDaysOn.value ? undefined : '0', rules: rulesFilled.value ? undefined : '0', long: longTitle.value ? '1' : undefined } })
})

// ---------------------------------------------------------------------------
const findings = [
  { id: 1, title: 'Okresy i Cel dzielą kartę na pół', where: 'nawyk · Odhaczaj · 5 okresów', image: '/research/current/objects/habits--poranna-checklista.png', body: 'W trzech kolumnach karta ma ok. 380 px. Siatka 50/50 daje każdemu polu ~170 px: „Wybierz okresy (17)” łamie się na trzy linie, a zdanie celu rozpada się na sześć wierszy — po jednej pigułce na wiersz. Pod Okresami zostaje pusta studnia.', fix: 'Jedna kolumna. Zdanie celu ma całą szerokość i zawija się po słowach, nie po kontrolkach.' },
  { id: 2, title: 'Okresy mówią to samo dwa razy', where: 'każda rodzina z okresami', image: '/research/current/objects/trackers--wieczorne-wyciszenie.png', body: 'Przycisk „Wybierz okresy (17)” i rozwijane „▶ 1 cze–27 wrz 2026 · Wybrano: 17” powtarzają liczbę. Trójkąt to surowy znacznik <details>, a duży, cichy przycisk konkuruje z 9-pikselową etykietą sekcji.', fix: 'Fakt zamiast formularza: pasek okresów (ołówek/atrament) i jedna linia „1 cze – 27 wrz 2026 · 17 tygodni”; całość jest przyciskiem otwierającym istniejący picker — jak oś miesięcy na karcie celu.' },
  { id: 3, title: 'Ocena: skala osobno, zdanie w siedmiu wierszach', where: 'nawyk · Oceniaj · warunek dni', image: '/research/current/objects/habits--poranna-rutyna.png', body: '„Skala Od / Do” stoi jako osobny blok nad siatką, a zdanie „Oceniaj średnia co najmniej 3 na 5 i loguj co najmniej 5 dni w tygodniu” zajmuje całą wysokość kolumny. Rytm (w tygodniu) jest na końcu zdania, daleko od trybu.', fix: 'Skala staje się pigułką w zdaniu „Oceniaj w skali 1–5 · w tygodniu”. Cel i warunek dni to dwa krótkie wiersze pod spodem.' },
  { id: 4, title: 'Licznik: prosty przypadek, ta sama studnia', where: 'nawyk · Zliczaj', image: '/research/current/objects/habits--maksymalnie-10-kaw-w-tygodniu.png', body: 'Nawet trzy pigułki („Zliczaj · Co najwyżej · 10 · w tygodniu”) stoją jedna pod drugą, a po lewej zostaje pusta przestrzeń wysokości czterech wierszy. Link „+ warunek dni” wisi pod zdaniem bez związku z resztą.', fix: 'Wiersz „Wpis” (tryb · rytm) i wiersz „Cel” (co najwyżej 10). Dodanie warunku dni to cicha akcja w sekcji Cel.' },
  { id: 5, title: 'Rezultat w celu: jeszcze węziej', where: 'cel · rezultat · Mierz', image: '/research/current/objects/goals--przebiec-10-km-bez-zatrzymania--kr2.png', body: 'Karta rezultatu jest zagnieżdżona w karcie celu, więc na siatkę 50/50 zostaje ok. 300 px. Pięć pigułek w pionie, obok nich „Wybierz okresy (17)” w trzech liniach. Wykres liniowy pod formularzem przesuwa się w dół przy każdym rozwinięciu.', fix: 'Ta sama jedna kolumna; sekcje na papierze (krok bielszy) zamiast kolejnego obramowanego pudełka.' },
  { id: 6, title: 'Elementy: waga przy każdym wierszu, trzy przyciski na wiersz', where: 'nawyk / tracker · Odhaczaj', image: '/research/current/objects/habits--poranna-checklista.png', body: 'Każdy element pokazuje pole „waga 1”, strzałki góra/dół i archiwizację — sześć kontrolek na wiersz, także gdy wszystkie wagi są równe 1. Etykieta „ELEMENTY 3/8” ma 9 px, a przycisk „+ Dodaj element” jest większy od wiersza elementu.', fix: 'Wagi tylko na żądanie („Wagi”), niestandardowa waga jako cichy znacznik ×2; narzędzia wiersza pojawiają się na hover/fokusie; „+ Dodaj” w skali etykiety.' },
  { id: 7, title: 'Etykiety 9 px kontra kontrolki 14 px', where: 'wszystkie rozwinięte karty', image: '/research/current/objects/habits--maksymalnie-10-kaw-w-tygodniu.png', body: 'Nagłówki sekcji (OKRESY, CEL, ZASADY ZALICZENIA) mają 9 px z rozstrzeleniem 0,14 em; pigułki i pola mają 12–14 px. Hierarchia się odwraca: to, co porządkuje kartę, jest najmniej widoczne. Placeholder zasad jest większy od etykiety.', fix: 'Etykiety 11 px jak na karcie priorytetu (uppercase, rozstrzelenie 0,08 em), pola i pigułki 12 px. Wypełnione zasady czyta się jako tekst na papierze; edycja po kliknięciu.' },
]
const findingId = ref(1)
const activeFinding = computed(() => findings.find(f => f.id === findingId.value) ?? findings[0])

const decisions = [
  { id: 'D1', title: 'Jedna kolumna zamiast siatki 50/50', body: 'Sekcje układają się pionowo w naturalnej szerokości karty (~340 px treści). Nic nie jest ściskane do 170 px, znika pusta studnia pod Okresami. Dotyczy nawyku, trackera i rezultatu; intencja już jest jednokolumnowa.', scope: 'ObjectsLibraryMeasurementCard, ObjectsLibraryKrCard — usunąć grid-cols-2' },
  { id: 'D2', title: 'Wpis i cel to jedno zdanie w jednym polu', body: 'Bez etykiety: „Odhaczaj · co najmniej · 4 · dni z zaliczeniem · w tygodniu · i loguj · co najmniej · 4 · dni ×”. Elementy checklisty stoją niżej, we własnej sekcji. Zdanie zawija się po słowach, bo ma całą szerokość karty.', scope: 'MeasurementTargetSentence — obecna kolejność slotów, bez podziału na dwa pola' },
  { id: 'D3', title: 'Okresy = kalendarz miesięcy, edycja w miejscu', body: 'Rząd = miesiąc (etykieta „cze”), komórka = tydzień; przy rytmie miesięcznym jeden rząd z rokiem. Atrament = przypisany okres, ołówek (kreskowany) = przerwa w zakresie, kropka steppera = bieżący okres, minione wygaszone. Pod spodem jedna linia „1 cze – 27 wrz 2026 · 17 tygodni · z przerwami”. Cały blok to `.mg-v2-inline-trigger`; klik otwiera dotychczasowy PeriodCalendarPicker (`triggerless`), który ma ten sam układ miesiąc→tygodnie. Znika przycisk „Wybierz okresy (N)” i <details>. Wybrane 2026-09-23 spośród A kalendarz / B oś / C słowa.', scope: 'nowy ObjectCardPeriods (grupowanie tygodni po miesiącu w utils), PeriodSelectionSummary zostaje dla kreatora celu' },
  { id: 'D4', title: 'Skala oceny w zdaniu: „Oceniaj od 1 do 5”', body: 'Dwa pola liczbowe w zdaniu: „Oceniaj · od · 1 · do · 5 · w tygodniu, średnia · co najmniej · 3”. Blok „Skala” znika, a jednostka celu („na 5”) jest zbędna, bo skala stoi obok.', scope: 'MeasurementTargetSentence + ratingScaleMin/ratingScale w tym samym evencie' },
  { id: 'D5', title: 'Elementy ciszej: wagi na żądanie, narzędzia na hover', body: 'Wiersz elementu = ikona · nazwa · (×2 gdy waga ≠ 1). Przełącznik „Wagi” pokazuje pola wag we wszystkich wierszach. Strzałki i archiwizacja wjeżdżają na hover/fokus wiersza (desktop only — zgodnie z decyzją o hoverze). „+ Dodaj” ma skalę etykiety, licznik „6 z 8” stoi przy nagłówku.', scope: 'MultiItemsEditor — prop `quiet` lub nowy wariant' },
  { id: 'D6', title: 'Zasady zaliczenia czyta się jak tekst', body: 'Wypełnione zasady to akapit na papierze (inline-trigger), klik przełącza w textarea, która rośnie z treścią (2–8 wierszy). Puste = textarea z krótszym placeholderem „Kiedy uznajesz dzień za zaliczony?”.', scope: 'karty + useEditableField bez zmian' },
  { id: 'D7', title: 'Jedna skala typograficzna i drabinka tonów', body: 'Etykiety sekcji 11 px uppercase z rozstrzeleniem 0,08 em, treść 12 px, pigułki 11 px/700. Tony: karta → pole (mist) → pigułka/wpis (paper) → hover/fokus (jeszcze jaśniej). Kontrolka jest zawsze jaśniejsza od pola, na którym stoi.', scope: 'wspólna klasa .mg-v2-section-label; neo-badge w studni = paper' },
  { id: 'D8', title: 'Zwinięta karta zyskuje fakt o okresach', body: 'Linia cichych faktów pod tytułem dostaje „17 tygodni” obok rytmu, trybu i celu — dzięki temu większość pytań („czy to jest jeszcze w planie?”) nie wymaga rozwijania. Wykres zostaje na dole karty w obu stanach.', scope: 'ObjectsLibraryMeasurementCard — mg-v2-meta' },
]
</script>

<style scoped>
.object-lab { --oc-ink: var(--mg-color-ink); --oc-muted: var(--mg-color-muted); --oc-white: color-mix(in srgb, white 92%, rgb(var(--sky-100))); color: var(--oc-ink); }
.object-lab__block { margin-top: 30px; }
.object-lab__block-head { margin-bottom: 14px; }
.object-lab__block-head h2 { margin: 6px 0 0; font-size: 20px; line-height: 1.2; }

/* 01 · evidence */
.object-lab__evidence { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; }
.object-lab__findings { display: grid; align-content: start; gap: 6px; }
.object-lab__findings button { display: grid; grid-template-columns: 24px 1fr; gap: 9px; align-items: start; width: 100%; padding: 10px 11px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); text-align: left; cursor: pointer; font: inherit; color: inherit; }
.object-lab__findings button.active { background: var(--mg-color-paper); border-color: color-mix(in srgb, var(--mg-color-primary) 45%, transparent); }
.object-lab__findings button:hover { background: var(--mg-color-paper); }
.object-lab__findings strong { display: block; font-size: 12px; line-height: 1.35; }
.object-lab__findings small { display: block; margin-top: 2px; color: var(--oc-muted); font-size: 10px; }
.object-lab__finding-index { display: grid; place-items: center; width: 22px; height: 22px; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-on-primary, #fff); background: var(--mg-color-primary-fill); font-size: 10px; font-weight: 800; }
.object-lab__shot { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0; margin: 0; overflow: hidden; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-lg); background: var(--mg-color-mist); }
.object-lab__shot-frame { display: grid; place-items: start center; max-height: 640px; padding: 16px; overflow: auto; background: color-mix(in srgb, var(--mg-color-surface) 60%, rgb(19 40 66 / .08)); }
.object-lab__shot-frame img { width: min(100%, 440px); height: auto; border-radius: 18px; box-shadow: 0 12px 30px rgb(19 40 66 / .16); }
.object-lab__shot figcaption { display: grid; align-content: start; gap: 10px; padding: 18px; border-left: 1px solid var(--mg-color-border); }
.object-lab__shot figcaption strong { font-size: 14px; line-height: 1.3; }
.object-lab__shot figcaption p { margin: 0; color: var(--oc-muted); font-size: 12px; line-height: 1.55; }
.object-lab__fix { display: flex; gap: 6px; padding: 10px 12px; border-radius: var(--mg-radius-sm); color: var(--mg-color-primary-strong) !important; background: var(--mg-color-paper); font-weight: 700; }
.object-lab__fix :deep(.material-symbols-outlined) { flex: 0 0 auto; font-size: 16px; }

/* 02 · toolbar + stages */
.object-lab__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border-radius: 18px; }
.object-lab__toolbar label { display: grid; gap: 5px; color: var(--oc-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.object-lab__toolbar select { min-height: 34px; min-width: 150px; padding: 6px 28px 6px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--oc-ink); background: var(--mg-color-mist); font: inherit; font-size: 12px; text-transform: none; letter-spacing: 0; }
.object-lab__toolbar .object-lab__check { display: flex; align-items: center; gap: 6px; min-height: 34px; text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 700; }
.object-lab__check input { accent-color: var(--mg-color-primary); }
.object-lab__reset { min-height: 34px; padding: 0 12px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-mist); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
.object-lab__stages { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.object-lab__stage-col > header { padding: 0 3px; margin-bottom: 12px; }
.object-lab__stage-col h3 { margin: 4px 0 3px; font-size: 17px; }
.object-lab__stage-col header p { max-width: 560px; margin: 0; color: var(--oc-muted); font-size: 12px; line-height: 1.5; }
.object-lab__stage-col code { padding: 0 4px; border-radius: 6px; background: var(--mg-color-paper); font-size: 11px; }
.object-lab__stage { display: flex; justify-content: center; align-items: flex-start; padding: 24px; border: 1px solid var(--mg-color-border); border-radius: var(--mg-radius-xl); background: var(--mg-color-canvas); }
.object-lab__card-slot { width: min(100%, 384px); }
.object-lab__goal-frame { width: min(100%, 384px); padding: 14px; }
.object-lab__goal-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.object-lab__icon-circle { display: grid; flex: 0 0 auto; place-items: center; width: 34px; height: 34px; border: 1px solid var(--mg-color-border); border-radius: 50%; color: var(--mg-color-primary-strong); background: var(--mg-color-mist); }
.object-lab__icon-circle--lg { width: 44px; height: 44px; }
.object-lab__icon-circle--sm { width: 28px; height: 28px; }
.object-lab__tray-visible { opacity: 1; }

/* Pill select drawn as the product's flat neo-badge (KrPillDropdown flat) */
.lab-pill { position: relative; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 11px; cursor: pointer; transition: background .15s ease; }
.oc__sentence :deep(.neo-badge), .oc__sentence .neo-badge { background: var(--mg-color-paper); }
.lab-pill:hover { background: var(--oc-white); }
.lab-pill :deep(.lab-pill__chevron) { font-size: 12px; }
.lab-pill :deep(.lab-pill__select) { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
.lab-pill:has(.lab-pill__select:focus-visible) { outline: 2px solid var(--mg-color-primary); outline-offset: 2px; }

/* Proposal card */
.oc { padding: 12px; font-size: 12px; }
.oc--nested { padding: 10px; }
.oc__head { display: flex; align-items: center; gap: 8px; }
.oc__title { min-width: 0; flex: 1; padding: 6px 4px; border: 0; background: transparent; color: var(--oc-ink); font: inherit; font-size: 14px; font-weight: 700; outline: none; }
.oc__title--sm { font-size: 12px; font-weight: 600; }
.oc__tray { display: flex; flex-shrink: 0; align-items: center; gap: 4px; }
.oc__glyphs { padding: 0 4px; margin-top: 6px; }
.oc__meta { padding: 0 4px; margin-top: 8px; }
.oc__body { display: grid; gap: 12px; margin-top: 12px; padding: 0 4px; }
.oc__section { display: grid; gap: 6px; min-width: 0; }
.oc__section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.oc__section-actions { display: flex; gap: 8px; }
.oc__label { margin: 0; color: var(--oc-muted); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.oc__count { margin-left: 6px; font-weight: 600; letter-spacing: 0; text-transform: none; opacity: .8; }
.oc__sentence { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin: 0; color: var(--oc-ink); line-height: 1.6; }
.oc__sentence--quiet { color: var(--oc-muted); }
.oc__word { color: var(--oc-muted); font-weight: 600; }
.oc__glue { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.oc__word--glue { margin-left: -4px; }
.oc__quiet { margin: 0; color: var(--oc-muted); font-weight: 600; }
.oc__sentence.neo-surface { padding: 8px 12px; border-radius: 1rem; }
.oc__sentence--stack { flex-direction: column; align-items: flex-start; gap: 6px; }
.oc__line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; }
.oc__num { width: 3.4rem; padding: 4px 8px; text-align: center; font-size: 13px; font-weight: 700; color: var(--oc-ink); -moz-appearance: textfield; }
.oc__num::-webkit-inner-spin-button, .oc__num::-webkit-outer-spin-button { -webkit-appearance: none; }
.oc__num:hover, .oc__num:focus-visible { background: var(--oc-white); }
.oc__num:focus-visible { outline: none; border-color: color-mix(in srgb, var(--mg-color-primary) 50%, transparent); }
.oc__num--sm { width: 2.6rem; }
.oc__num--weight { width: 2.6rem; padding: 2px 6px; font-size: 12px; }
.oc__link { display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; border: 0; border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: transparent; cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
.oc__link:hover, .oc__link[aria-pressed='true'] { background: var(--mg-color-paper); }
.oc__link:disabled { opacity: .45; cursor: not-allowed; }
.oc__link--quiet { padding: 0 2px; color: var(--oc-muted); font-weight: 700; text-decoration: underline dotted; text-underline-offset: 3px; }
.oc__link--quiet:hover { background: transparent; color: var(--oc-ink); }
.oc__items { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.oc__item { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 3px 6px 3px 4px; border-radius: var(--mg-radius-sm); background: var(--mg-color-mist); }
.oc__item-icon { display: grid; flex: 0 0 auto; place-items: center; width: 24px; height: 24px; border-radius: var(--mg-radius-icon-field-a); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); }
.oc__item-label { min-width: 0; flex: 1; padding: 4px 8px; border: 1px solid transparent; border-radius: var(--mg-radius-pill); background: var(--mg-color-paper); color: var(--oc-ink); font: inherit; font-size: 12px; font-weight: 600; outline: none; }
.oc__item-label:hover, .oc__item-label:focus-visible { background: var(--oc-white); }
.oc__item-label:focus-visible { border-color: color-mix(in srgb, var(--mg-color-primary) 50%, transparent); }
.oc__weight { flex: 0 0 auto; padding: 0 6px; border-radius: var(--mg-radius-pill); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); font-size: 10px; font-weight: 800; }
.oc__item-tools { display: inline-flex; flex: 0 0 auto; gap: 0; opacity: 0; transition: opacity var(--mg-duration-fast, .12s) ease; }
.oc__item:hover .oc__item-tools, .oc__item:focus-within .oc__item-tools { opacity: 1; }
.oc__tool { display: grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: var(--mg-radius-organic-a); color: var(--mg-color-primary); background: transparent; cursor: pointer; }
.oc__tool:hover:not(:disabled) { background: var(--mg-color-mist); }
.oc__tool:disabled { opacity: .3; cursor: default; }
.oc__tool--inline { width: 20px; height: 20px; color: var(--oc-muted); }
.oc__periods { display: grid; gap: 8px; padding: 8px 10px 7px; }
.oc__rows { display: grid; gap: 5px; }
.oc__row { display: grid; grid-template-columns: 28px 1fr; align-items: center; gap: 8px; }
.oc__row-label { color: var(--oc-muted); font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.oc__row-cells { display: flex; gap: 5px; }
.oc__strip--empty { display: block; }
.oc__hairline { display: block; margin: 5px 0 0; }
.oc__cell { position: relative; flex: 1 1 0; min-width: 0; max-width: 44px; height: 9px; border: 1.5px dashed color-mix(in srgb, var(--oc-muted) 50%, transparent); border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%; background: transparent; }
.oc__cell:nth-child(even) { border-radius: 45% 55% 50% 50% / 55% 45% 55% 45%; }
.oc__cell--on { border: 0; background: linear-gradient(92deg, color-mix(in srgb, var(--mg-color-primary-strong) 78%, var(--mg-color-paper)) 0%, var(--mg-color-primary-strong) 35%, var(--mg-color-primary-strong) 70%, color-mix(in srgb, var(--mg-color-primary-strong) 84%, var(--mg-color-paper)) 100%); box-shadow: inset 0 -1.5px 0 rgb(255 255 255 / .22), inset 0 1px 0 rgb(255 255 255 / .12); }
.oc__cell--on.oc__cell--past { background: linear-gradient(92deg, color-mix(in srgb, var(--mg-color-primary-strong) 52%, var(--mg-color-surface)), color-mix(in srgb, var(--mg-color-primary-strong) 62%, var(--mg-color-surface)) 60%, color-mix(in srgb, var(--mg-color-primary-strong) 50%, var(--mg-color-surface))); }
.oc__cell--today::after { position: absolute; top: -7px; left: 50%; width: 8px; height: 8px; border: 1.5px solid var(--mg-color-primary-strong); border-radius: var(--mg-radius-organic-b); background: var(--mg-color-paper); transform: translateX(-50%); content: ''; }
.oc__periods-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--oc-ink); font-weight: 700; }
.oc__periods-icon { color: var(--mg-color-primary); opacity: 0; transition: opacity var(--mg-duration-fast, .12s) ease; }
.oc__periods:hover .oc__periods-icon, .oc__periods:focus-visible .oc__periods-icon { opacity: 1; }
.oc__rules { padding: 8px 10px; background: var(--mg-color-paper); }
.oc__rules:hover, .oc__rules:focus-visible { background: color-mix(in srgb, white 90%, rgb(var(--sky-100))); }
.oc__rules-text { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 5; color: var(--oc-ink); font-size: 12px; line-height: 1.55; white-space: pre-line; }
.oc__rules-edit { width: 100%; padding: 8px 10px; border: 1px solid var(--mg-color-field-border); border-radius: var(--mg-radius-sm); color: var(--oc-ink); background: var(--mg-color-paper); font: inherit; font-size: 12px; line-height: 1.55; resize: vertical; }
.oc__rules-edit:focus-visible { outline: none; border-color: var(--mg-color-primary); }

/* Sparkline replica */
.lab-spark { position: relative; display: flex; align-items: flex-end; gap: 6px; height: 68px; margin-top: 12px; padding: 0 6px; }
.lab-spark :deep(.lab-spark__target) { position: absolute; inset: 22% 6px auto 6px; border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-primary) 45%, transparent); }
.lab-spark :deep(.lab-spark__bar) { flex: 1 1 0; border-radius: 4px 4px 3px 3px; background: rgb(var(--sky-200) / .75); }
.lab-spark :deep(.lab-spark__bar--miss) { background: rgb(var(--rose-100) / .9); }
.lab-spark :deep(.lab-spark__bar--rating) { border-top: 2px dashed rgb(var(--sky-400) / .6); }

/* 03 · decisions, coverage */
.object-lab__decisions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.object-lab__decisions li { display: grid; grid-template-columns: 38px 1fr; gap: 12px; padding: 16px 18px; border-radius: 19px; }
.object-lab__decision-id { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--mg-radius-organic-c); color: var(--mg-color-primary-strong); background: var(--mg-color-sky-field); font-size: 11px; font-weight: 900; }
.object-lab__decisions h3 { margin: 4px 0 5px; font-size: 14px; line-height: 1.3; }
.object-lab__decisions p { margin: 0; color: var(--oc-muted); font-size: 12px; line-height: 1.55; }
.object-lab__scope { display: flex; align-items: center; gap: 5px; margin-top: 8px !important; font-size: 11px !important; }
.object-lab__scope :deep(.material-symbols-outlined) { font-size: 14px; }
.object-lab__coverage { margin-top: 26px; padding: 20px; border-radius: 20px; }
.object-lab__coverage h2 { margin: 6px 0 15px; font-size: 18px; }
.object-lab__coverage-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.object-lab__coverage-grid p { margin: 0; padding: 12px; border-radius: 12px; background: var(--mg-color-mist); font-size: 12px; line-height: 1.5; }
.object-lab__coverage-grid strong { display: block; margin-bottom: 2px; color: var(--mg-color-primary-strong); }
.object-lab :where(button, select, input, textarea):focus-visible { outline: 2px solid var(--mg-color-primary); outline-offset: 2px; }

@media (max-width: 1100px) {
  .object-lab__stages, .object-lab__decisions, .object-lab__coverage-grid { grid-template-columns: 1fr; }
  .object-lab__evidence { grid-template-columns: 1fr; }
  .object-lab__shot { grid-template-columns: 1fr; }
  .object-lab__shot figcaption { border-left: 0; border-top: 1px solid var(--mg-color-border); }
}
</style>
