<template>
  <AppDialog
    :model-value="modelValue"
    :title="t('programs.momentPicker.title')"
    size="lg"
    panel-class="mg-v2-surface mg-v2-surface--raised moment-picker__panel"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="moment-picker__lead">{{ tg('programs.momentPicker.lead') }}</p>
    <ul class="moment-picker__list" data-testid="moment-picker">
      <li v-for="moment in moments" :key="moment.id">
        <button type="button" class="moment-picker__card" @click="pick(moment.id)">
          <span class="moment-picker__date">{{ formatDate(moment.createdAt) }}</span>
          <strong v-if="seedOf(moment).situation" class="moment-picker__text">{{ seedOf(moment).situation }}</strong>
          <span v-if="moment.responses.kind === 'shame'" class="moment-picker__meta">
            <template v-if="seedOf(moment).reaction">{{ partLabel(seedOf(moment).reaction!) }}</template>
            <template v-else>{{ t('programs.glance.nonePart') }}</template>
            <template v-if="seedOf(moment).about && seedOf(moment).about !== 'unsure'"> · {{ tg(`exerciseWizards.micro.moments.about.options.${seedOf(moment).about}`) }}</template>
          </span>
          <em v-if="seedOf(moment).criticThought" class="moment-picker__critic">„{{ seedOf(moment).criticThought }}”</em>
        </button>
      </li>
    </ul>
    <div class="moment-picker__actions">
      <button type="button" class="mg-v2-button mg-v2-button--quiet" @click="emit('update:modelValue', false)">
        {{ t('common.buttons.cancel') }}
      </button>
      <button type="button" class="mg-v2-button" @click="pick(null)">{{ t('programs.momentPicker.without') }}</button>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import AppDialog from '@/components/AppDialog.vue'
import { useT } from '@/composables/useT'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { ShameReaction } from '@/services/shamePartsService'
import { momentSeedFrom } from './momentSeed'

/**
 * "Z którego momentu zacząć?" — the shared picker a path step with
 * `startFrom: 'moment'` opens before the wizard: the path's recent moments
 * as cards (date, what happened, the part, the critic's line) and "Bez
 * momentu". Picking emits the entry id (null = start blank).
 */
defineProps<{
  modelValue: boolean
  moments: MicroExerciseEntry[]
}>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; pick: [entryId: string | null] }>()

const { t, tg, locale } = useT()
const seedOf = momentSeedFrom
const partLabel = (reaction: ShameReaction) => tg(`exerciseWizards.micro.moments.compass.options.${reaction}`)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })

function pick(entryId: string | null) {
  emit('pick', entryId)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.moment-picker__lead {
  margin: 0 0 var(--mg-space-3);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}
.moment-picker__list {
  display: grid;
  gap: var(--mg-space-2);
  max-height: 55vh;
  margin: 0;
  padding: 0 2px;
  overflow: auto;
  list-style: none;
}
.moment-picker__card {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: var(--mg-space-2) var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
  color: var(--mg-color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.moment-picker__card:hover {
  background: var(--mg-color-paper);
}
.moment-picker__date {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.moment-picker__text {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
  line-height: 1.4;
}
.moment-picker__meta {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.moment-picker__critic {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-style: italic;
}
.moment-picker__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--mg-space-2);
  margin-top: var(--mg-space-4);
}
</style>
