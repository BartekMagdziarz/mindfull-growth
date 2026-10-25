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
          <option value="multi-completion">Odhaczaj listę</option>
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
            min="0"
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
      <div
        v-if="item.entryMode === 'multi-completion' && item.kind !== 'goal'"
        class="pa-list-fields"
      >
        <label v-for="(_, index) in item.items" :key="index" class="pa-field"
          >Element {{ index + 1
          }}<input v-model="item.items[index]" class="mg-v2-field" @input="$emit('edit')"
        /></label>
        <button v-if="item.items.length < 8" class="pa-link" type="button" @click="addItem">
          Dodaj element
        </button>
        <label class="pa-field"
          >Zalicz dzień przy<input
            v-model.number="item.dailyThreshold"
            type="number"
            min="1"
            :max="item.items.length"
            class="mg-v2-field pa-number"
            @input="$emit('edit')"
        /></label>
      </div>
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
import AppIcon from '@product/components/shared/AppIcon.vue'
import {
  plannerIcons,
  plannerKindLabels,
  plannerMeasurementSentence,
  plannerScheduleSentence,
  type PlannerObject,
} from '~lab/lab/planningAssistant'
const props = defineProps<{
  item: PlannerObject
  expanded: boolean
  readonly?: boolean
  error?: string
}>()
const emit = defineEmits<{ select: [value: boolean]; expand: []; edit: [] }>()
const weekdays = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']
const fact = computed(() =>
  props.item.kind === 'goal'
    ? plannerScheduleSentence(props.item)
    : plannerMeasurementSentence(props.item)
)
function toggleDay(day: number) {
  props.item.days = props.item.days.includes(day)
    ? props.item.days.filter(value => value !== day)
    : [...props.item.days, day].sort()
  emit('edit')
}
function addItem() {
  props.item.items.push('')
  emit('edit')
}
function clearDays() {
  props.item.days = []
  emit('edit')
}
function changeMode() {
  if (props.item.entryMode === 'rating') props.item.target = 3
  if (
    ['completion', 'multi-completion'].includes(props.item.entryMode) &&
    props.item.cadence === 'weekly'
  )
    props.item.target = Math.min(props.item.target, 7)
  emit('edit')
}
</script>
