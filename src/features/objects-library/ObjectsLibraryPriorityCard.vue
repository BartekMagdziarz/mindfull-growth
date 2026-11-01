<template>
  <article class="group/card mg-v2-surface mg-v2-surface--raised-sm p-4">
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="relative inline-flex shrink-0">
          <IconPicker
            icon-size="lg"
            :model-value="item.icon"
            compact
            minimal
            ghost-when-empty
            :allow-clear="true"
            aria-label="Priority icon"
            @update:model-value="emitFieldChange('icon', $event)"
          />
          <!-- Rank rides on the icon disc instead of taking a meta row -->
          <span v-if="item.order" class="priority-rank">{{ item.order }}</span>
        </span>
        <input
          ref="titleRef"
          v-model="title"
          type="text"
          class="mg-v2-inline-field min-w-0 flex-1 text-sm font-bold"
          :placeholder="t('planning.objects.form.priorityTitlePlaceholder')"
          @blur="flushTitle"
        />
        <div class="mg-v2-card-tray group-hover/card:opacity-100">
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="mg-v2-popover absolute right-0 top-full z-20 mt-1 min-w-[150px] overflow-hidden"
              @click.stop
            >
              <ObjectsCardStatusMenu
                :model-value="item.status"
                :options="statusOptions"
                @update:model-value="handleStatusChange"
              />
              <div class="mg-v2-menu-section">
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="openLinks"
                >
                  {{ t('planning.objects.timeline.links') }}…
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="openYears"
                >
                  {{ t('planning.objects.timeline.years') }}…
                </button>
              </div>
              <div class="mg-v2-menu-section">
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleArchive"
                >
                  {{
                    item.status === 'active'
                      ? t('planning.objects.actions.pause')
                      : t('planning.objects.actions.activate')
                  }}
                </button>
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
                  @click="handleDelete"
                >
                  {{ t('common.buttons.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quiet facts: status, only when not active -->
      <p v-if="statusLabel" class="mg-v2-meta mg-v2-card-indent">
        <span class="mg-v2-meta__status">{{ statusLabel }}</span>
      </p>

      <!-- Life areas by name; click edits -->
      <div ref="linksRef" class="mg-v2-card-indent relative">
        <ObjectCardMetaLine
          :life-area-ids="item.lifeAreaIds ?? []"
          :life-area-options="lifeAreaOptions"
          :empty-links-label="t('planning.objects.timeline.addLink')"
          @open-links="openLinks"
        />
        <div
          v-if="linksOpen"
          class="mg-v2-popover absolute left-0 z-20 mt-1 max-h-56 min-w-[190px] overflow-y-auto p-1"
          @click.stop
        >
          <button
            v-for="option in lifeAreaOptions"
            :key="option.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium text-on-surface hover:bg-primary-soft/30"
            @click="emitFieldChange('toggleLifeArea', option.id)"
          >
            <AppIcon
              v-if="item.lifeAreaIds?.includes(option.id)"
              name="check"
              class="text-xs text-primary"
            />
            <span v-else class="h-3 w-3" />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
          </button>
          <div
            v-if="lifeAreaOptions.length === 0"
            class="px-3 py-2 text-xs text-on-surface-variant"
          >
            {{ t('planning.objects.filters.noOptions') }}
          </div>
        </div>
      </div>

      <!-- Years as stepper dots on a pencil line; click edits linked years -->
      <div class="mg-v2-card-indent relative">
        <ObjectCardTimeline
          variant="years"
          :years="yearsWindow"
          interactive
          :label="t('planning.objects.timeline.years')"
          @click="openYears"
        />
        <PriorityYearsDropdown
          ref="yearsRef"
          triggerless
          :linked-years="linkedYears"
          @link-year="$emit('link-year', item.id, $event)"
          @unlink-year="$emit('unlink-year', item.id, $event)"
        />
      </div>

      <!-- Reflection as prose: filled answers are paragraphs (click = edit);
           empty ones fold into one "Dopisz:" line whose words open a block. -->
      <section class="prose-list">
        <template v-for="key in PROSE_KEYS" :key="key">
          <ReflectionProse
            v-if="isProseShown(key)"
            :ref="el => setProseEl(key, el)"
            v-model="prose[key].value"
            :label="t(`planning.objects.form.${key}`)"
            :autofocus="openedProse.has(key)"
            @blur="onProseBlur(key)"
          />
        </template>
        <p v-if="emptyProseKeys.length > 0" class="mg-v2-meta prose-add">
          <span class="prose-add__row">
            <span>{{ t('planning.objects.form.addProse') }}</span>
            <template v-for="(key, index) in emptyProseKeys" :key="key">
              <span v-if="index > 0" class="prose-add__sep" aria-hidden="true">·</span>
              <button type="button" class="prose-add__word" @click="openProse(key)">
                {{ t(`planning.objects.form.proseGhost.${key}`) }}
              </button>
            </template>
          </span>
        </p>
      </section>

      <!-- Closed priority: the closing reflection in the same prose grammar -->
      <section v-if="item.status === 'closed'" class="mg-v2-group">
        <p class="mg-v2-group__label">{{ t('planning.objects.form.closingHeading') }}</p>
        <template v-for="key in CLOSING_KEYS" :key="key">
          <ReflectionProse
            v-if="isProseShown(key)"
            :ref="el => setProseEl(key, el)"
            v-model="prose[key].value"
            :label="t(`planning.objects.form.${key}`)"
            :autofocus="openedProse.has(key)"
            @blur="onProseBlur(key)"
          />
        </template>
        <p v-if="emptyClosingKeys.length > 0" class="mg-v2-meta prose-add">
          <span class="prose-add__row">
            <span>{{ t('planning.objects.form.addProse') }}</span>
            <template v-for="(key, index) in emptyClosingKeys" :key="key">
              <span v-if="index > 0" class="prose-add__sep" aria-hidden="true">·</span>
              <button type="button" class="prose-add__word" @click="openProse(key)">
                {{ t(`planning.objects.form.proseGhost.${key}`) }}
              </button>
            </template>
          </span>
        </p>
      </section>

      <!-- What hangs on this priority: one quiet line, no number tiles -->
      <p v-if="linkedCountsLine.length > 0" class="mg-v2-meta mg-v2-card-indent">
        <span v-for="part in linkedCountsLine" :key="part">{{ part }}</span>
      </p>

      <PriorityDraftChecklist
        :priority-id="item.id"
        @changed="$emit('drafts-changed', item.id)"
        @notify="$emit('drafts-notify', $event)"
        @error="$emit('drafts-error', $event)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import ObjectsCardStatusMenu from '@/components/objects/ObjectsCardStatusMenu.vue'
import PriorityDraftChecklist from '@/components/objects/priority-creator/PriorityDraftChecklist.vue'
import PriorityYearsDropdown from '@/components/objects/PriorityYearsDropdown.vue'
import ObjectCardMetaLine from '@/components/objects/ObjectCardMetaLine.vue'
import ObjectCardTimeline from '@/components/objects/ObjectCardTimeline.vue'
import ReflectionProse from '@/components/objects/ReflectionProse.vue'
import { computeYearsWindow } from '@/utils/objectWindow'
import type { YearRef } from '@/domain/period'
import type { LinkedYear } from '@/components/objects/PriorityYearsDropdown.vue'
import { useEditableField } from '@/composables/useEditableField'
import { useT } from '@/composables/useT'
import type {
  ObjectsLibraryFilterOption,
  ObjectsLibraryListItem,
} from '@/services/objectsLibraryQueries'

const props = defineProps<{
  item: ObjectsLibraryListItem
  statusOptions: Array<{ value: string; label: string }>
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  isNew?: boolean
}>()

const emit = defineEmits<{
  'field-change': [id: string, field: string, value: unknown]
  'link-year': [id: string, yearRef: string]
  'unlink-year': [id: string, yearRef: string]
  archive: [id: string, isCurrentlyActive: boolean]
  delete: [id: string, title: string]
  'drafts-changed': [id: string]
  'drafts-notify': [message: string]
  'drafts-error': [message: string]
}>()

const { t, tp } = useT()

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

function signalsToText(signals: string[] | undefined): string {
  return (signals ?? []).join('\n')
}

const TITLE_DELAY_MS = 400
const TEXT_DELAY_MS = 500

const {
  value: title,
  inputRef: titleRef,
  flush: flushTitle,
} = useEditableField({
  source: () => props.item.title,
  commit: value => emitFieldChange('title', value),
  delay: TITLE_DELAY_MS,
})

// Each reflection answer is a ReflectionProse with its own debounced
// autosave; the prose block reports whether it is being edited, so an
// external update never overwrites text the user is typing.
type ReflectionProseInstance = InstanceType<typeof ReflectionProse>

function proseField<TStored = string>(options: {
  source: () => TStored | undefined
  commit: (value: string) => void
  format?: (stored: TStored | undefined) => string
  delay?: number
}) {
  const el = ref<ReflectionProseInstance | null>(null)
  const field = useEditableField<TStored, string>({
    ...options,
    isFocused: () => el.value?.isEditing() ?? false,
  })
  return { value: field.value, flush: field.flush, el }
}

const PROSE_KEYS = [
  'whyNow',
  'desiredDirection',
  'tradeoffs',
  'progressSignals',
  'riskSignals',
] as const
const CLOSING_KEYS = [
  'closedAt',
  'closingSummary',
  'workedWell',
  'wasDifficult',
  'learned',
] as const
type ProseKey = (typeof PROSE_KEYS)[number] | (typeof CLOSING_KEYS)[number]

const prose = reactive({
  whyNow: proseField({
    source: () => props.item.whyNow,
    commit: value => emitFieldChange('whyNow', value),
    delay: TEXT_DELAY_MS,
  }),
  desiredDirection: proseField({
    source: () => props.item.desiredDirection,
    commit: value => emitFieldChange('desiredDirection', value),
    delay: TEXT_DELAY_MS,
  }),
  tradeoffs: proseField({
    source: () => props.item.tradeoffs,
    commit: value => emitFieldChange('tradeoffs', value),
    delay: TEXT_DELAY_MS,
  }),
  progressSignals: proseField<string[]>({
    source: () => props.item.progressSignals,
    format: signalsToText,
    commit: value => emitFieldChange('progressSignals', value),
  }),
  riskSignals: proseField<string[]>({
    source: () => props.item.riskSignals,
    format: signalsToText,
    commit: value => emitFieldChange('riskSignals', value),
  }),
  closedAt: proseField({
    source: () => props.item.closingReflection?.closedAt,
    commit: value => emitFieldChange('closingReflection.closedAt', value),
  }),
  closingSummary: proseField({
    source: () => props.item.closingReflection?.summary,
    commit: value => emitFieldChange('closingReflection.summary', value),
    delay: TEXT_DELAY_MS,
  }),
  workedWell: proseField({
    source: () => props.item.closingReflection?.workedWell,
    commit: value => emitFieldChange('closingReflection.workedWell', value),
    delay: TEXT_DELAY_MS,
  }),
  wasDifficult: proseField({
    source: () => props.item.closingReflection?.wasDifficult,
    commit: value => emitFieldChange('closingReflection.wasDifficult', value),
    delay: TEXT_DELAY_MS,
  }),
  learned: proseField({
    source: () => props.item.closingReflection?.learned,
    commit: value => emitFieldChange('closingReflection.learned', value),
    delay: TEXT_DELAY_MS,
  }),
})

// Empty answers are folded into the "Dopisz:" line until a word opens them.
const openedProse = ref(new Set<ProseKey>())

function isProseShown(key: ProseKey): boolean {
  return prose[key].value.trim().length > 0 || openedProse.value.has(key)
}

const emptyProseKeys = computed(() => PROSE_KEYS.filter(key => !isProseShown(key)))
const emptyClosingKeys = computed(() => CLOSING_KEYS.filter(key => !isProseShown(key)))

function openProse(key: ProseKey): void {
  openedProse.value = new Set([...openedProse.value, key])
}

function onProseBlur(key: ProseKey): void {
  prose[key].flush()
  if (prose[key].value.trim().length === 0) {
    const next = new Set(openedProse.value)
    next.delete(key)
    openedProse.value = next
  }
}

function setProseEl(key: ProseKey, el: unknown): void {
  prose[key].el = el as ReflectionProseInstance | null
}

const menuRef = ref<HTMLElement | null>(null)
const linksRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const linksOpen = ref(false)

const linkedYears = computed<LinkedYear[]>(() =>
  (props.item.years ?? []).map(year => ({ yearRef: year, displayLabel: year }))
)

const yearsWindow = computed(() =>
  computeYearsWindow((props.item.years ?? []) as YearRef[], new Date())
)

const yearsRef = ref<InstanceType<typeof PriorityYearsDropdown> | null>(null)

function openLinks(): void {
  menuOpen.value = false
  linksOpen.value = true
}

function openYears(): void {
  menuOpen.value = false
  yearsRef.value?.openList()
}

// Status is quiet: shown as text only when it is not the default "active".
const statusLabel = computed(() => {
  if (props.item.status === 'active') return null
  const opt = props.statusOptions.find(o => o.value === props.item.status)
  return opt?.label ?? props.item.status
})

function handleStatusChange(value: string): void {
  menuOpen.value = false
  emitFieldChange('status', value)
}

const linkedCountsLine = computed(() => {
  const counts = props.item.linkedCounts
  if (!counts) return []
  const families = [
    ['goals', counts.goals],
    ['habits', counts.habits],
    ['trackers', counts.trackers],
    ['intentions', counts.intentions],
  ] as const
  return families
    .filter(([, count]) => count > 0)
    .map(([family, count]) =>
      tp(
        count,
        `planning.objects.linkedCounts.${family}.one`,
        `planning.objects.linkedCounts.${family}.few`,
        `planning.objects.linkedCounts.${family}.many`
      )
    )
})

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.status === 'active')
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  const target = event.target as Node
  if (menuRef.value && !menuRef.value.contains(target)) {
    menuOpen.value = false
  }
  if (linksRef.value && !linksRef.value.contains(target)) {
    linksOpen.value = false
  }
}

watch(
  () => props.isNew,
  isNew => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>

<style scoped>
.prose-list {
  display: grid;
  gap: var(--mg-space-1);
}

/* "Dopisz: kompromisy · sygnały ryzyka" — quiet words, each opens its block. */
.prose-add {
  padding: 0 var(--mg-space-3);
}

.prose-add__row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--mg-space-1) var(--mg-space-2);
  align-items: center;
}

.prose-add__sep {
  opacity: 0.55;
}

.prose-add__word {
  margin: 0 calc(-1 * var(--mg-space-1));
  padding: 0 var(--mg-space-1);
  border: 0;
  border-radius: var(--mg-radius-sm);
  color: var(--mg-color-primary-strong);
  background: transparent;
  font: inherit;
  cursor: pointer;
  opacity: 0.8;
}

.prose-add__word:hover,
.prose-add__word:focus-visible {
  background: var(--mg-color-paper);
  opacity: 1;
}

.prose-add__word:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

.priority-rank {
  position: absolute;
  right: calc(-1 * var(--mg-space-1));
  bottom: calc(-1 * var(--mg-space-1));
  display: inline-flex;
  min-width: var(--mg-space-5);
  height: var(--mg-space-5);
  align-items: center;
  justify-content: center;
  padding: 0 var(--mg-space-1);
  border: 1px solid var(--mg-color-field-border);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-variant-numeric: tabular-nums;
  font-weight: var(--mg-weight-label);
  line-height: 1;
  pointer-events: none;
}
</style>
