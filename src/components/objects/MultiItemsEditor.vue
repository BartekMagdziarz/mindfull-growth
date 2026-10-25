<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import { useT } from '@/composables/useT'
import type { MultiCompletionItem } from '@/domain/planning'
import { MULTI_COMPLETION_MAX_ACTIVE_ITEMS, createMultiCompletionItem } from '@/domain/planning'

/**
 * Checklist items of a multi-completion subject: one quiet row per item
 * (icon · label · weight · hover tray), a dashed ghost row to add the next
 * one, and a folded line for archived items. The day threshold is not here —
 * it is a clause of the measurement sentence.
 */
const props = withDefaults(
  defineProps<{
    items: MultiCompletionItem[]
    threshold?: number
    disabled?: boolean
  }>(),
  { threshold: undefined, disabled: false }
)

// One atomic event carrying the whole multi config: the domain normalizer
// treats a payload that touches items as authoritative for the threshold too,
// so emitting them separately would race the autosave.
const emit = defineEmits<{
  'update:config': [value: { items: MultiCompletionItem[]; threshold: number | undefined }]
}>()

const { t, tp } = useT()

// Items added in this editor instance were never referenced by an entry, so
// they may be hard-deleted; everything else can only be archived.
const locallyAddedIds = ref(new Set<string>())
const archivedOpen = ref(false)
const listRef = ref<HTMLElement | null>(null)
// Weight chips read "×2" and open a small field only when touched.
const editingWeightId = ref<string | null>(null)

const activeItems = computed(() => props.items.filter(item => !item.archived))
const archivedItems = computed(() => props.items.filter(item => item.archived))
const canAdd = computed(() => activeItems.value.length < MULTI_COMPLETION_MAX_ACTIVE_ITEMS)
// Once any weight differs from 1, every chip shows so the rows read evenly.
const weightsMatter = computed(() => activeItems.value.some(item => item.weight !== 1))

function commit(items: MultiCompletionItem[], threshold: number | undefined): void {
  const sum = Math.max(
    items.filter(item => !item.archived).reduce((total, item) => total + item.weight, 0),
    1
  )
  const clamped = threshold === undefined ? undefined : Math.min(Math.max(threshold, 1), sum)
  emit('update:config', { items, threshold: clamped })
}

function patchItem(id: string, patch: Partial<MultiCompletionItem>): void {
  commit(
    props.items.map(item => (item.id === id ? { ...item, ...patch } : item)),
    props.threshold
  )
}

function commitLabel(item: MultiCompletionItem, event: Event): void {
  const input = event.target as HTMLInputElement
  const label = input.value.trim()
  if (!label) {
    input.value = item.label
    return
  }
  if (label !== item.label) patchItem(item.id, { label })
}

function commitWeight(item: MultiCompletionItem, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  editingWeightId.value = null
  if (!Number.isFinite(parsed) || parsed < 1) {
    input.value = String(item.weight)
    return
  }
  if (parsed !== item.weight) patchItem(item.id, { weight: parsed })
}

function editWeight(item: MultiCompletionItem): void {
  if (props.disabled) return
  editingWeightId.value = item.id
  void nextTick(() => {
    const field = listRef.value?.querySelector<HTMLInputElement>(`[data-weight-for="${item.id}"]`)
    field?.focus()
    field?.select()
  })
}

function commitIcon(item: MultiCompletionItem, icon: string | undefined): void {
  patchItem(item.id, { icon: icon || undefined })
}

function addItem(): void {
  if (!canAdd.value) return
  const item = createMultiCompletionItem(
    `${t('planning.objects.form.multiItems.defaultItemLabel').replace(/\s*\d+$/, '')} ${activeItems.value.length + 1}`.trim()
  )
  locallyAddedIds.value.add(item.id)
  commit([...props.items, item], props.threshold)
  // The new row's label is selected so typing replaces the placeholder name.
  void nextTick(() => {
    const field = listRef.value?.querySelector<HTMLInputElement>(`[data-label-for="${item.id}"]`)
    field?.focus()
    field?.select()
  })
}

function moveItem(id: string, direction: -1 | 1): void {
  const index = props.items.findIndex(item => item.id === id)
  const target = index + direction
  if (index === -1 || target < 0 || target >= props.items.length) return
  const next = [...props.items]
  ;[next[index], next[target]] = [next[target], next[index]]
  commit(next, props.threshold)
}

function archiveItem(id: string): void {
  if (activeItems.value.length <= 1) return
  commit(
    props.items.map(item => (item.id === id ? { ...item, archived: true } : item)),
    props.threshold
  )
}

function restoreItem(id: string): void {
  if (!canAdd.value) return
  commit(
    props.items.map(item => {
      if (item.id !== id) return item
      const { archived: _dropped, ...rest } = item
      return rest
    }),
    props.threshold
  )
}

function removeItem(id: string): void {
  if (activeItems.value.length <= 1) return
  locallyAddedIds.value.delete(id)
  commit(
    props.items.filter(item => item.id !== id),
    props.threshold
  )
}

const archivedLabel = computed(() =>
  tp(
    archivedItems.value.length,
    'planning.objects.form.multiItems.archivedCount.one',
    'planning.objects.form.multiItems.archivedCount.few',
    'planning.objects.form.multiItems.archivedCount.many'
  )
)
</script>

<template>
  <div ref="listRef" class="mi" :class="disabled ? 'pointer-events-none opacity-60' : ''">
    <ul class="mi__list">
      <li v-for="(item, index) in activeItems" :key="item.id" class="group/row mi__row">
        <IconPicker
          compact
          minimal
          :allow-clear="true"
          :model-value="item.icon"
          :aria-label="t('planning.objects.form.multiItems.labelPlaceholder')"
          @update:model-value="commitIcon(item, $event)"
        />
        <input
          :value="item.label"
          type="text"
          class="mg-v2-inline-field min-w-0 flex-1 text-sm font-semibold"
          :data-label-for="item.id"
          :placeholder="t('planning.objects.form.multiItems.labelPlaceholder')"
          @change="commitLabel(item, $event)"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />

        <!-- weight: a quiet chip, a ghost until it matters, a field when touched -->
        <input
          v-if="editingWeightId === item.id"
          :value="item.weight"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          class="mg-v2-field mg-v2-sentence__num mi__weight-field"
          :data-weight-for="item.id"
          :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
          @change="commitWeight(item, $event)"
          @blur="editingWeightId = null"
          @keydown.enter.prevent="commitWeight(item, $event)"
          @keydown.escape.prevent="editingWeightId = null"
        />
        <button
          v-else
          type="button"
          class="mi__weight"
          :class="{ 'mi__weight--ghost': !weightsMatter && item.weight === 1 }"
          :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
          :title="t('planning.objects.form.multiItems.weightLabel')"
          @click="editWeight(item)"
        >
          ×{{ item.weight }}
        </button>

        <div class="mg-v2-card-tray group-hover/row:opacity-100">
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="index === 0"
            :aria-label="`${item.label} ↑`"
            @click="moveItem(item.id, -1)"
          >
            <AppIcon name="keyboard_arrow_up" class="text-sm" />
          </button>
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="index === activeItems.length - 1"
            :aria-label="`${item.label} ↓`"
            @click="moveItem(item.id, 1)"
          >
            <AppIcon name="keyboard_arrow_down" class="text-sm" />
          </button>
          <button
            v-if="locallyAddedIds.has(item.id)"
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="activeItems.length <= 1"
            :aria-label="t('planning.objects.form.multiItems.remove')"
            :title="t('planning.objects.form.multiItems.remove')"
            @click="removeItem(item.id)"
          >
            <AppIcon name="delete" class="text-sm" />
          </button>
          <button
            v-else
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="activeItems.length <= 1"
            :aria-label="t('planning.objects.form.multiItems.archive')"
            :title="t('planning.objects.form.multiItems.archive')"
            @click="archiveItem(item.id)"
          >
            <AppIcon name="inventory_2" class="text-sm" />
          </button>
        </div>
      </li>
    </ul>

    <!-- The next item, drawn in pencil: the same row, not yet there. -->
    <button
      v-if="canAdd"
      type="button"
      class="mg-v2-ghost mg-v2-ghost--row mi__ghost"
      @click="addItem"
    >
      <span class="mi__ghost-disc" aria-hidden="true"><AppIcon name="add" class="text-sm" /></span>
      {{ t('planning.objects.form.multiItems.addItem') }}
    </button>
    <p v-else class="mg-v2-meta mi__hint">
      <span>{{
        t('planning.objects.form.multiItems.maxItemsHint', {
          max: MULTI_COMPLETION_MAX_ACTIVE_ITEMS,
        })
      }}</span>
    </p>

    <div v-if="archivedItems.length > 0" class="mi__archived">
      <button
        type="button"
        class="mg-v2-inline-trigger mg-v2-meta mi__archived-toggle"
        :aria-expanded="archivedOpen"
        @click="archivedOpen = !archivedOpen"
      >
        <span>
          <AppIcon :name="archivedOpen ? 'expand_less' : 'expand_more'" class="text-xs" />
          {{ archivedLabel }}
        </span>
      </button>
      <ul v-if="archivedOpen" class="mi__list">
        <li
          v-for="item in archivedItems"
          :key="item.id"
          class="group/row mi__row mi__row--archived"
        >
          <span class="min-w-0 flex-1 truncate px-2 text-sm text-on-surface-variant">{{
            item.label
          }}</span>
          <button
            type="button"
            class="mg-v2-button mg-v2-button--quiet mi__restore"
            :disabled="!canAdd"
            @click="restoreItem(item.id)"
          >
            {{ t('planning.objects.form.multiItems.restore') }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.mi {
  display: grid;
  gap: var(--mg-space-1);
}

.mi__list {
  display: grid;
  gap: var(--mg-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A row reads as text until hovered: then it lays on paper and shows its tray. */
.mi__row {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  min-height: 2.25rem;
  padding: var(--mg-space-1) var(--mg-space-1) var(--mg-space-1) var(--mg-space-2);
  border-radius: var(--mg-radius-sm);
  transition: background var(--mg-duration-fast) ease;
}

.mi__row:hover,
.mi__row:focus-within {
  background: var(--mg-color-paper);
}

.mi__row--archived {
  opacity: 0.7;
}

.mi__weight {
  flex: 0 0 auto;
  min-width: 2rem;
  padding: 0 var(--mg-space-2);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-pill);
  color: var(--mg-color-muted);
  background: transparent;
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.5rem;
  cursor: pointer;
}

.mi__weight:hover {
  color: var(--mg-color-ink);
  background: var(--mg-color-mist);
}

/* Weight 1 is the default: a ghost that only shows when the row is touched. */
.mi__weight--ghost {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--mg-color-primary-strong) 40%, transparent);
  color: var(--mg-color-primary-strong);
  opacity: 0;
}

.mi__row:hover .mi__weight--ghost,
.mi__row:focus-within .mi__weight--ghost {
  opacity: 0.8;
}

.mi__weight-field {
  flex: 0 0 auto;
  width: 3rem;
}

.mi__ghost {
  gap: var(--mg-space-2);
  min-height: 2.25rem;
  padding-left: var(--mg-space-2);
}

/* The ghost's disc mirrors the row's icon disc (IconPicker minimal, 2rem). */
.mi__ghost-disc {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px dashed color-mix(in srgb, var(--mg-color-primary-strong) 50%, transparent);
  border-radius: var(--mg-radius-icon-field-a);
}

.mi__hint {
  padding: var(--mg-space-1) var(--mg-space-2);
}

.mi__archived {
  display: grid;
  gap: var(--mg-space-1);
}

.mi__archived-toggle {
  width: auto;
}

.mi__restore {
  min-height: 1.75rem;
  padding: 0 var(--mg-space-3);
  font-size: var(--mg-font-size-xs);
}
</style>
