<template>
  <article
    class="pa-object mg-v2-surface mg-v2-surface--flat"
    :class="{ 'pa-object--excluded': !item.selected, 'pa-object--child': !!item.parentId }"
  >
    <div class="pa-object__head">
      <span class="pa-object__glyph" :title="plannerKindLabels[item.kind]"
        ><AppIcon :name="plannerIcons[item.kind]"
      /></span>
      <button
        v-if="!readonly"
        class="pa-object__summary"
        type="button"
        :aria-expanded="expanded"
        @click="$emit('expand')"
      >
        <strong>{{ item.title || 'Bez nazwy' }}</strong>
        <span>{{ fact }}</span>
      </button>
      <div v-else class="pa-object__summary">
        <strong>{{ item.title }}</strong
        ><span>{{ plannerMeasurementSentence(item) }}</span>
      </div>
      <button
        v-if="!readonly"
        type="button"
        class="pa-object__edit mg-v2-button mg-v2-button--quiet mg-v2-button--icon"
        :aria-label="`Edytuj: ${item.title}`"
        :aria-expanded="expanded"
        @click="$emit('expand')"
      >
        <AppIcon :name="expanded ? 'expand_less' : 'edit'" />
      </button>
      <input
        v-if="!readonly"
        class="pa-choice mg-v2-checkbox"
        type="checkbox"
        :checked="item.selected"
        :aria-label="`Wybierz: ${item.title}`"
        @change="$emit('select', ($event.target as HTMLInputElement).checked)"
      />
    </div>
    <div v-if="expanded && !readonly" class="pa-object__fields">
      <label class="pa-field"
        >Nazwa<input v-model="item.title" class="mg-v2-field" @input="$emit('edit')"
      /></label>
      <label v-if="item.kind === 'goal'" class="pa-field"
        >Po czym poznasz sukces?<textarea
          v-model="item.successDefinition"
          rows="2"
          class="mg-v2-field"
          @input="$emit('edit')"
        />
      </label>
      <div v-else class="pa-sentence mg-v2-surface mg-v2-surface--flat">
        <label class="sr-only" :for="`${item.id}-mode`">Sposób pomiaru</label>
        <select
          :id="`${item.id}-mode`"
          v-model="item.entryMode"
          class="mg-v2-field"
          @change="changeMode"
        >
          <option value="completion">Odhaczaj dni</option>
          <option value="counter">Zliczaj wykonania</option>
          <option value="value">Wpisuj wartość</option>
          <option value="rating">Oceniaj</option>
          <option value="multi-completion">Checklista</option>
        </select>
        <template v-if="item.entryMode === 'rating'">
          <span>od</span
          ><input
            v-model.number="item.ratingMin"
            aria-label="Początek skali"
            class="mg-v2-field pa-number"
            type="number"
            min="1"
            @input="$emit('edit')"
          />
          <span>do</span
          ><input
            v-model.number="item.ratingMax"
            aria-label="Koniec skali"
            class="mg-v2-field pa-number"
            type="number"
            min="2"
            @input="$emit('edit')"
          />
        </template>
        <template v-if="item.kind !== 'tracker'">
          <select
            v-if="item.entryMode === 'value'"
            v-model="item.aggregation"
            aria-label="Sposób agregacji"
            class="mg-v2-field"
            @change="$emit('edit')"
          >
            <option value="sum">suma</option>
            <option value="average">średnia</option>
            <option value="last">ostatni wynik</option>
          </select>
          <span v-if="item.entryMode === 'rating'">średnio</span>
          <select
            v-model="item.operator"
            class="mg-v2-field"
            aria-label="Warunek targetu"
            @change="$emit('edit')"
          >
            <option value="min">co najmniej</option>
            <option value="max">co najwyżej</option>
          </select>
          <input
            v-model.number="item.target"
            class="mg-v2-field pa-number"
            type="number"
            :min="
              item.entryMode === 'value'
                ? undefined
                : item.entryMode === 'rating'
                  ? item.ratingMin
                  : 0
            "
            :step="
              ['completion', 'counter', 'multi-completion'].includes(item.entryMode) ? 1 : 'any'
            "
            aria-label="Wartość targetu"
            @input="$emit('edit')"
          />
        </template>
        <select
          v-if="item.kind !== 'weeklyIntention'"
          v-model="item.cadence"
          class="mg-v2-field"
          aria-label="Rytm"
          @change="$emit('edit')"
        >
          <option value="weekly">w tygodniu</option>
          <option value="monthly">w miesiącu</option>
        </select>
        <span v-else>w tym tygodniu</span>
      </div>
      <MultiItemsEditor
        v-if="item.entryMode === 'multi-completion' && item.kind !== 'goal'"
        :items="item.multiItems"
        :threshold="item.dailyThreshold ?? undefined"
        @update:config="updateMulti"
      />
      <label class="pa-field"
        >{{ item.kind === 'tracker' ? 'Opis' : 'Zasady zaliczenia'
        }}<textarea
          v-model="item.description"
          rows="2"
          class="mg-v2-field"
          @input="$emit('edit')"
        />
      </label>
      <div class="pa-dates">
        <label class="pa-field"
          >Od<input
            v-model="item.startDate"
            type="date"
            class="mg-v2-field"
            @change="$emit('edit')" /></label
        ><label class="pa-field"
          >{{ item.kind === 'goal' ? 'Termin' : 'Do'
          }}<input v-model="item.endDate" type="date" class="mg-v2-field" @change="$emit('edit')"
        /></label>
      </div>
      <div
        v-if="item.kind !== 'goal'"
        class="pa-day-options"
        role="group"
        aria-label="Dni realizacji"
      >
        <button type="button" class="pa-day" :aria-pressed="!item.days.length" @click="clearDays">
          Elastycznie
        </button>
        <button
          v-for="(day, index) in weekdays"
          :key="day"
          type="button"
          class="pa-day"
          :aria-pressed="item.days.includes(index)"
          @click="toggleDay(index)"
        >
          {{ day }}
        </button>
      </div>
      <details class="pa-extra">
        <summary>Więcej ustawień</summary>
        <template v-if="item.kind === 'goal'">
          <label v-for="field in goalFields" :key="field.key" class="pa-field"
            >{{ field.label }}
            <textarea
              v-model="item[field.key]"
              rows="2"
              class="mg-v2-field"
              @input="$emit('edit')"
            />
          </label>
          <label class="pa-field"
            >Wiara w realizację (1–10)
            <input
              :value="item.confidenceRating ?? ''"
              type="number"
              min="1"
              max="10"
              class="mg-v2-field"
              @input="updateConfidence"
            />
          </label>
        </template>
        <label v-if="item.kind === 'habit'" class="pa-option">
          <input
            v-model="item.isPermanent"
            type="checkbox"
            class="mg-v2-checkbox"
            @change="$emit('edit')"
          />
          Dostępny bezterminowo
        </label>
        <template
          v-if="item.kind !== 'goal' && item.kind !== 'tracker' && item.entryMode !== 'completion'"
        >
          <label class="pa-option"
            ><input
              type="checkbox"
              :checked="!!item.entryDays"
              class="mg-v2-checkbox"
              @change="toggleEntryDays"
            />Warunek dni z wpisem</label
          >
          <div v-if="item.entryDays" class="pa-sentence">
            <select
              v-model="item.entryDays.operator"
              aria-label="Warunek dni z wpisem"
              class="mg-v2-field"
              @change="$emit('edit')"
            >
              <option value="min">co najmniej</option>
              <option value="max">co najwyżej</option>
            </select>
            <input
              v-model.number="item.entryDays.value"
              type="number"
              min="1"
              :max="item.cadence === 'weekly' ? 7 : 31"
              aria-label="Liczba dni z wpisem"
              class="mg-v2-field pa-number"
              @input="$emit('edit')"
            /><span>dni z wpisem</span>
          </div>
        </template>
        <template v-if="item.kind !== 'keyResult'">
          <ObjectsLibraryPillSelect
            :model-value="item.priorityIds"
            :options="priorities"
            label="Priorytety"
            empty-label="Brak aktywnych priorytetów"
            clear-label="Usuń powiązania"
            add-label="Powiąż priorytet"
            @update:model-value="updateLinks('priorityIds', $event)"
          />
          <ObjectsLibraryPillSelect
            v-if="item.kind !== 'weeklyIntention'"
            :model-value="item.lifeAreaIds"
            :options="lifeAreas"
            label="Obszary życia"
            empty-label="Brak obszarów życia"
            clear-label="Usuń powiązania"
            add-label="Powiąż obszar życia"
            @update:model-value="updateLinks('lifeAreaIds', $event)"
          />
        </template>
      </details>
      <p v-if="error" class="pa-error" role="alert">{{ error }}</p>
      <button class="pa-edit-done mg-v2-button" type="button" @click="$emit('expand')">
        Gotowe<AppIcon name="check" />
      </button>
    </div>
    <p v-if="readonly" class="pa-object__schedule">{{ plannerScheduleSentence(item) }}</p>
    <p v-if="error && !expanded" class="pa-error pa-object__schedule" role="alert">{{ error }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlannerObject } from '@/domain/planningAssistant'
import type { MultiCompletionItem } from '@/domain/planning'
import ObjectsLibraryPillSelect from '@/components/objects/ObjectsLibraryPillSelect.vue'
import MultiItemsEditor from '@/components/objects/MultiItemsEditor.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import {
  plannerIcons,
  plannerKindLabels,
  plannerMeasurementSentence,
  plannerScheduleSentence,
} from './presentation'
const item = defineModel<PlannerObject>('item', { required: true })
defineProps<{
  expanded: boolean
  readonly?: boolean
  error?: string
  priorities: Array<{ id: string; label: string }>
  lifeAreas: Array<{ id: string; label: string }>
}>()
const emit = defineEmits<{ select: [value: boolean]; expand: []; edit: [] }>()
const goalFields = [
  { key: 'whyMatters', label: 'Dlaczego to ważne?' },
  { key: 'achievabilityRationale', label: 'Co sprawia, że to realne?' },
  { key: 'obstacles', label: 'Przeszkody' },
  { key: 'resources', label: 'Co pomoże?' },
] as const
const weekdays = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']
const fact = computed(() =>
  item.value.kind === 'goal'
    ? plannerScheduleSentence(item.value)
    : plannerMeasurementSentence(item.value)
)
function updateConfidence(event: Event) {
  const value = (event.target as HTMLInputElement).value
  item.value.confidenceRating = value === '' ? null : Number(value)
  emit('edit')
}
function toggleEntryDays(event: Event) {
  item.value.entryDays = (event.target as HTMLInputElement).checked
    ? { operator: 'min', value: 1 }
    : null
  emit('edit')
}
function updateLinks(key: 'priorityIds' | 'lifeAreaIds', ids: string[]) {
  item.value[key] = ids
  emit('edit')
}
function toggleDay(day: number) {
  item.value.days = item.value.days.includes(day)
    ? item.value.days.filter(value => value !== day)
    : [...item.value.days, day].sort()
  emit('edit')
}
function updateMulti(config: { items: MultiCompletionItem[]; threshold: number | undefined }) {
  item.value.multiItems = config.items
  item.value.dailyThreshold = config.threshold ?? null
  emit('edit')
}
function clearDays() {
  item.value.days = []
  emit('edit')
}
function changeMode() {
  if (item.value.entryMode === 'completion') item.value.entryDays = null
  if (item.value.entryMode === 'rating') item.value.target = 3
  if (
    ['completion', 'multi-completion'].includes(item.value.entryMode) &&
    item.value.cadence === 'weekly'
  )
    item.value.target = Math.min(item.value.target, 7)
  emit('edit')
}
</script>
