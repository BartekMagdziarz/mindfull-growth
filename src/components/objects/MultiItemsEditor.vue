<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import { useT } from '@/composables/useT'
import type { MultiCompletionItem } from '@/domain/planning'
import { MULTI_COMPLETION_MAX_ACTIVE_ITEMS, createMultiCompletionItem } from '@/domain/planning'

/**
 * Checklist items of a multi-completion subject as small tiles, three to a
 * row, each a cloud edited in place: icon board · name (text that a click
 * turns into a field, so the tile can be grabbed by its name) · the weight
 * as "×n" right after the name (faded at 1; a click turns it into a field).
 * Hovering a tile shows one small archive/delete button over its right
 * edge. Tiles are reordered by dragging them with the mouse. A quiet "+" sits in the top-right corner of the field and
 * shows on hover. The day threshold is a clause of the measurement
 * sentence, not of this editor.
 */
const props = withDefaults(
  defineProps<{
    items: MultiCompletionItem[]
    threshold?: number
    /** Group label drawn in the head row, next to the "+" (hosts pass "Elementy"). */
    heading?: string
    disabled?: boolean
  }>(),
  { threshold: undefined, heading: undefined, disabled: false }
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
// The tile being named: it exists only here until it has a name, because the
// domain refuses an item with an empty label (and so would the autosave).
const pendingItem = ref<MultiCompletionItem | null>(null)
const archivedOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const focusedId = ref<string | null>(null)
// The tile whose name is currently a field (at rest the name is text, so a
// mouse-down on it starts a drag instead of a text selection).
const editingNameId = ref<string | null>(null)
const editingWeightId = ref<string | null>(null)

const activeItems = computed(() => props.items.filter(item => !item.archived))
const archivedItems = computed(() => props.items.filter(item => item.archived))
const canAdd = computed(
  () => !pendingItem.value && activeItems.value.length < MULTI_COMPLETION_MAX_ACTIVE_ITEMS
)

function initialOf(label: string): string {
  return label.trim().charAt(0).toLocaleUpperCase() || '·'
}

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

// --- fields in the tile -----------------------------------------------------

function startEditName(id: string): void {
  if (props.disabled) return
  editingNameId.value = id
  void nextTick(() => {
    const field = rootRef.value?.querySelector<HTMLInputElement>(`[data-item-name="${id}"]`)
    field?.focus()
    field?.select()
  })
}

function commitLabel(item: MultiCompletionItem, event: Event): void {
  const input = event.target as HTMLInputElement
  const label = input.value.trim()
  if (editingNameId.value === item.id) editingNameId.value = null
  if (pendingItem.value?.id === item.id) {
    // Named: it joins the list; left blank: it never existed.
    pendingItem.value = null
    if (label) {
      locallyAddedIds.value.add(item.id)
      commit([...props.items, { ...item, label }], props.threshold)
    }
    return
  }
  if (label && label !== item.label) patchItem(item.id, { label })
}

function cancelLabel(event: Event): void {
  const input = event.target as HTMLInputElement
  input.value = input.defaultValue
  input.blur()
}

function startEditWeight(id: string): void {
  if (props.disabled) return
  editingWeightId.value = id
  void nextTick(() => {
    const field = rootRef.value?.querySelector<HTMLInputElement>(`[data-item-weight="${id}"]`)
    field?.focus()
    field?.select()
  })
}

function commitWeight(item: MultiCompletionItem, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  if (editingWeightId.value === item.id) editingWeightId.value = null
  if (Number.isFinite(parsed) && parsed >= 1 && parsed !== item.weight) {
    patchItem(item.id, { weight: parsed })
  }
}

function commitIcon(item: MultiCompletionItem, icon: string | undefined): void {
  patchItem(item.id, { icon: icon || undefined })
}

function addItem(): void {
  if (!canAdd.value || props.disabled) return
  // No default name: the tile opens with an empty field and its placeholder.
  const item = createMultiCompletionItem('')
  pendingItem.value = item
  editingNameId.value = item.id
  void nextTick(() => {
    const field = rootRef.value?.querySelector<HTMLInputElement>(`[data-item-name="${item.id}"]`)
    field?.focus()
  })
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

// --- dragging ---------------------------------------------------------------
// Native drag and drop: a tile is draggable unless one of its fields has the
// focus (so selecting text in the name still works). While a drag is on, the
// live order lives here and the grid re-flows under the pointer; the drop
// (or the end of the drag) commits it once.

// Only a field holding the focus blocks dragging; the focused name text or a
// tray button must still let a mouse-down start the drag.
function onFocusIn(event: FocusEvent, id: string): void {
  const target = event.target as HTMLElement | null
  focusedId.value = target?.tagName === 'INPUT' ? id : null
}

const draggingId = ref<string | null>(null)
const liveOrder = ref<string[] | null>(null)

const shownItems = computed(() => {
  const order = liveOrder.value
  const pending = pendingItem.value ? [pendingItem.value] : []
  if (!order) return [...activeItems.value, ...pending]
  const byId = new Map(activeItems.value.map(item => [item.id, item]))
  return [
    ...order.map(id => byId.get(id)).filter((item): item is MultiCompletionItem => !!item),
    ...pending,
  ]
})

function onDragStart(event: DragEvent, id: string): void {
  if (props.disabled) return
  draggingId.value = id
  liveOrder.value = activeItems.value.map(item => item.id)
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnter(id: string): void {
  const dragging = draggingId.value
  const order = liveOrder.value
  if (!dragging || !order || dragging === id) return
  const from = order.indexOf(dragging)
  const to = order.indexOf(id)
  if (from === -1 || to === -1) return
  const next = [...order]
  next.splice(from, 1)
  next.splice(to, 0, dragging)
  liveOrder.value = next
}

function onDragEnd(): void {
  const order = liveOrder.value
  draggingId.value = null
  liveOrder.value = null
  if (!order) return
  const before = activeItems.value.map(item => item.id)
  if (order.every((id, index) => id === before[index])) return
  const byId = new Map(activeItems.value.map(item => [item.id, item]))
  const active = order.map(id => byId.get(id)).filter((item): item is MultiCompletionItem => !!item)
  commit([...active, ...archivedItems.value], props.threshold)
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
  <div
    ref="rootRef"
    class="mi"
    :class="[
      disabled ? 'pointer-events-none opacity-60' : '',
      activeItems.length === 0 ? 'mi--empty' : '',
    ]"
  >
    <!-- Head: the group label and, in the corner, the quiet "+" (on hover). -->
    <div class="mi__head">
      <p v-if="heading" class="mg-v2-group__label">{{ heading }}</p>
      <button
        v-if="canAdd"
        type="button"
        class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet mi__add"
        :aria-label="t('planning.objects.form.multiItems.addItem')"
        :title="t('planning.objects.form.multiItems.addItem')"
        @click="addItem"
      >
        <AppIcon name="add" class="text-base" />
      </button>
    </div>

    <ul class="mi__grid" @dragover.prevent @drop.prevent="onDragEnd">
      <li
        v-for="(item, index) in shownItems"
        :key="item.id"
        class="mi__tile"
        :class="{
          'mi__tile--alt': index % 2 === 1,
          'mi__tile--dragging': draggingId === item.id,
        }"
        :draggable="!disabled && focusedId !== item.id && pendingItem?.id !== item.id"
        data-testid="multi-item"
        @dragstart="onDragStart($event, item.id)"
        @dragenter.prevent="onDragEnter(item.id)"
        @dragend="onDragEnd"
        @focusin="onFocusIn($event, item.id)"
        @focusout="focusedId = null"
      >
        <IconPicker
          compact
          minimal
          icon-size="sm"
          :allow-clear="true"
          :model-value="item.icon"
          :aria-label="t('planning.objects.form.multiItems.iconAria', { label: item.label })"
          @update:model-value="commitIcon(item, $event)"
        >
          <template #empty>
            <span class="mi__board" aria-hidden="true">
              <span class="mi__initial">{{ initialOf(item.label) }}</span>
            </span>
          </template>
        </IconPicker>
        <span class="mi__body">
          <input
            v-if="editingNameId === item.id"
            :value="item.label"
            type="text"
            class="mg-v2-inline-field mi__name"
            :data-item-name="item.id"
            :placeholder="t('planning.objects.form.multiItems.labelPlaceholder')"
            :aria-label="t('planning.objects.form.multiItems.nameAria', { label: item.label })"
            @blur="commitLabel(item, $event)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @keydown.escape.stop="cancelLabel($event)"
          />
          <span
            v-else
            class="mi__name mi__name--text"
            role="button"
            tabindex="0"
            :data-item-name-text="item.id"
            :title="t('planning.objects.form.multiItems.labelPlaceholder')"
            @click="startEditName(item.id)"
            @keydown.enter.prevent="startEditName(item.id)"
            ><template v-if="item.label">{{ item.label }}</template
            ><span v-else class="mi__name-placeholder">{{
              t('planning.objects.form.multiItems.labelPlaceholder')
            }}</span></span
          >
          <!-- Weight: "×2" stays in the text; "×1" lives in the hover badge, so a
               plain checklist shows no numbers. Click edits. -->
          <span v-if="item.weight !== 1" class="mi__weight-slot">
            <input
              v-if="editingWeightId === item.id"
              :value="item.weight"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="mg-v2-inline-field mi__weight-input"
              :data-item-weight="item.id"
              :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
              @blur="commitWeight(item, $event)"
              @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
              @keydown.escape.stop="($event.target as HTMLInputElement).blur()"
            />
            <span
              v-else
              class="mi__weight"
              role="button"
              tabindex="0"
              :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
              :title="t('planning.objects.form.multiItems.weightLabel')"
              @click="startEditWeight(item.id)"
              @keydown.enter.prevent="startEditWeight(item.id)"
              >×{{ item.weight }}</span
            >
          </span>
        </span>
        <!-- Hover badge over the top-right corner: "×1" (click edits) and
             archive/delete. It hangs past the edge, so it covers little. -->
        <span v-if="pendingItem?.id !== item.id" class="mi__corner">
          <span v-if="item.weight === 1" class="mi__weight-slot">
            <input
              v-if="editingWeightId === item.id"
              :value="item.weight"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="mg-v2-inline-field mi__weight-input"
              :data-item-weight="item.id"
              :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
              @blur="commitWeight(item, $event)"
              @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
              @keydown.escape.stop="($event.target as HTMLInputElement).blur()"
            />
            <span
              v-else
              class="mi__weight"
              role="button"
              tabindex="0"
              :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
              :title="t('planning.objects.form.multiItems.weightLabel')"
              @click="startEditWeight(item.id)"
              @keydown.enter.prevent="startEditWeight(item.id)"
              >×{{ item.weight }}</span
            >
          </span>
          <button
            v-if="locallyAddedIds.has(item.id)"
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet mi__corner-button"
            :disabled="activeItems.length <= 1"
            :aria-label="`${t('planning.objects.form.multiItems.remove')}: ${item.label}`"
            :title="t('planning.objects.form.multiItems.remove')"
            @click="removeItem(item.id)"
          >
            <AppIcon name="delete" class="text-sm" />
          </button>
          <button
            v-else
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet mi__corner-button"
            :disabled="activeItems.length <= 1"
            :aria-label="`${t('planning.objects.form.multiItems.archive')}: ${item.label}`"
            :title="t('planning.objects.form.multiItems.archive')"
            @click="archiveItem(item.id)"
          >
            <AppIcon name="archive" class="text-sm" />
          </button>
        </span>
      </li>
    </ul>
    <p v-if="activeItems.length >= MULTI_COMPLETION_MAX_ACTIVE_ITEMS" class="mg-v2-meta mi__hint">
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
      <ul v-if="archivedOpen" class="mi__grid">
        <li v-for="item in archivedItems" :key="item.id" class="mi__tile mi__tile--archived">
          <span class="mi__board" aria-hidden="true">
            <span class="mi__initial">{{ initialOf(item.label) }}</span>
          </span>
          <span class="mi__name mi__name--static">{{ item.label }}</span>
          <span class="mi__corner">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet mi__corner-button"
              :disabled="!canAdd"
              :aria-label="`${t('planning.objects.form.multiItems.restore')}: ${item.label}`"
              :title="t('planning.objects.form.multiItems.restore')"
              @click="restoreItem(item.id)"
            >
              <AppIcon name="undo" class="text-sm" />
            </button>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.mi {
  display: grid;
  gap: var(--mg-space-2);
}

/* The head row keeps the label's height; the "+" hangs in the corner and
   shows when the field is hovered or holds the focus (always when empty). */
.mi__head {
  display: flex;
  align-items: center;
  min-height: 1.25rem;
}

.mi__add {
  margin: -0.25rem -0.25rem -0.25rem auto;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) ease;
}

.mg-v2-group:hover .mi__add,
.mi:hover .mi__add,
.mi:focus-within .mi__add,
.mi--empty .mi__add,
.mi__add:focus-visible {
  opacity: 1;
}

.mi__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--mg-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A tile is a small cloud: fill + lift, no edge. Every other tile leans a
   hair the other way, like the catalog tiles. */
.mi__tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--mg-space-1);
  min-width: 0;
  min-height: 2.75rem;
  padding: var(--mg-space-1) var(--mg-space-2) var(--mg-space-1) var(--mg-space-1);
  border-radius: var(--mg-radius-md);
  color: var(--mg-color-ink);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
  cursor: grab;
  transition:
    box-shadow var(--mg-duration-fast) ease,
    opacity var(--mg-duration-fast) ease;
}

.mi__tile--alt {
  transform: rotate(-0.4deg);
}

.mi__tile:hover {
  box-shadow: var(--mg-shadow-raised);
}

.mi__tile--dragging {
  opacity: 0.4;
}

.mi__tile--archived {
  cursor: default;
  opacity: 0.6;
}

.mi__board {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--mg-radius-icon-field-a);
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-sky-field);
}

.mi__tile--alt .mi__board {
  border-radius: var(--mg-radius-icon-field-b);
}

.mi__initial {
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-title);
  line-height: 1;
}

/* The name reads as text (up to two lines) and becomes a one-line field
   when clicked; both share the same horizontal geometry. */
.mi__name {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 var(--mg-space-1);
  border: 1px solid transparent;
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
  line-height: 1.2;
}

.mi__name--text {
  display: -webkit-box;
  overflow: hidden;
  border-radius: var(--mg-radius-sm);
  cursor: text;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mi__name--text:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

.mi__name-placeholder {
  color: var(--mg-color-muted);
  font-weight: var(--mg-weight-body);
}

.mi__name--static {
  overflow: hidden;
  color: var(--mg-color-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mi__body {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--mg-space-1);
  min-width: 0;
}

.mi__weight-slot {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
}

.mi__weight {
  padding: 0 var(--mg-space-1);
  border-radius: var(--mg-radius-sm);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.5rem;
  font-variant-numeric: tabular-nums;
  cursor: text;
}

.mi__weight:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

.mi__weight-input {
  width: 2.5rem;
  padding: 0 var(--mg-space-1);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  line-height: 1.25rem;
  -moz-appearance: textfield;
  appearance: textfield;
}

.mi__weight-input::-webkit-outer-spin-button,
.mi__weight-input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

/* The hover badge: one small cloud hanging past the tile's top-right corner
   with "×1" and archive/delete. It overlaps only the corner, so a name
   stays readable and clickable; alt tiles lean, the badge does not. */
.mi__tile:hover,
.mi__tile:focus-within {
  z-index: 1;
}

.mi__corner {
  position: absolute;
  top: calc(-1 * var(--mg-space-2));
  right: calc(-1 * var(--mg-space-2));
  display: inline-flex;
  align-items: center;
  padding: 0 var(--mg-space-1);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
  opacity: 0;
  transition: opacity var(--mg-duration-fast) ease;
  pointer-events: none;
}

.mi__tile:hover .mi__corner,
.mi__tile:focus-within .mi__corner {
  opacity: 1;
  pointer-events: auto;
}

.mi__corner-button.mg-v2-button--icon-sm {
  width: 1.5rem;
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.mi__hint {
  padding: 0 var(--mg-space-1);
}

.mi__archived {
  display: grid;
  gap: var(--mg-space-2);
}

.mi__archived-toggle {
  width: auto;
}
</style>
