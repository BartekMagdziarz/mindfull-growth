<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import { useT } from '@/composables/useT'
import type { MultiCompletionItem } from '@/domain/planning'
import { MULTI_COMPLETION_MAX_ACTIVE_ITEMS, createMultiCompletionItem } from '@/domain/planning'

/**
 * Checklist items of a multi-completion subject as small tiles, each a cloud
 * that is edited in place: icon board · name on the first row (text that a
 * click turns into a field, so the tile can be grabbed by its name), the
 * weight and a hover tray (archive / delete) on the second. Tiles are
 * reordered by dragging them with the mouse. A quiet "+" sits in the
 * top-right corner of the field and shows on hover. The day threshold is a
 * clause of the measurement sentence, not of this editor.
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
const archivedOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const focusedId = ref<string | null>(null)
// The tile whose name is currently a field (at rest the name is text, so a
// mouse-down on it starts a drag instead of a text selection).
const editingNameId = ref<string | null>(null)

const activeItems = computed(() => props.items.filter(item => !item.archived))
const archivedItems = computed(() => props.items.filter(item => item.archived))
const canAdd = computed(() => activeItems.value.length < MULTI_COMPLETION_MAX_ACTIVE_ITEMS)

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
  if (label && label !== item.label) patchItem(item.id, { label })
}

function cancelLabel(event: Event): void {
  const input = event.target as HTMLInputElement
  input.value = input.defaultValue
  input.blur()
}

function commitWeight(item: MultiCompletionItem, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  if (!Number.isFinite(parsed) || parsed < 1) {
    input.value = String(item.weight)
    return
  }
  if (parsed !== item.weight) patchItem(item.id, { weight: parsed })
}

function commitIcon(item: MultiCompletionItem, icon: string | undefined): void {
  patchItem(item.id, { icon: icon || undefined })
}

function addItem(): void {
  if (!canAdd.value || props.disabled) return
  const item = createMultiCompletionItem(
    `${t('planning.objects.form.multiItems.defaultItemLabel').replace(/\s*\d+$/, '')} ${activeItems.value.length + 1}`.trim()
  )
  locallyAddedIds.value.add(item.id)
  commit([...props.items, item], props.threshold)
  requestAnimationFrame(() => focusNewTile(item.id))
}

// The host saves and feeds the new list back through props (and may even
// remount this editor on the way), so the new tile shows up a few frames
// later: wait for it in the document, then select its name so typing
// replaces the placeholder label.
function focusNewTile(id: string, framesLeft = 90): void {
  const name = document.querySelector<HTMLElement>(`[data-item-name-text="${id}"]`)
  if (name) {
    name.click()
    return
  }
  if (framesLeft > 0) requestAnimationFrame(() => focusNewTile(id, framesLeft - 1))
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
  if (!order) return activeItems.value
  const byId = new Map(activeItems.value.map(item => [item.id, item]))
  return order.map(id => byId.get(id)).filter((item): item is MultiCompletionItem => !!item)
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
        :draggable="!disabled && focusedId !== item.id"
        data-testid="multi-item"
        @dragstart="onDragStart($event, item.id)"
        @dragenter.prevent="onDragEnter(item.id)"
        @dragend="onDragEnd"
        @focusin="onFocusIn($event, item.id)"
        @focusout="focusedId = null"
      >
        <div class="mi__row">
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
            >{{ item.label }}</span
          >
        </div>
        <div class="mi__row mi__row--quiet">
          <!-- Weight: "×1" fades until hovered, so a plain checklist shows no numbers. -->
          <label class="mi__weight" :class="{ 'mi__weight--one': item.weight === 1 }">
            <span aria-hidden="true">×</span>
            <input
              :value="item.weight"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="mg-v2-inline-field mi__weight-input"
              :aria-label="t('planning.objects.form.multiItems.weightAria', { label: item.label })"
              @change="commitWeight(item, $event)"
              @keydown.enter.prevent="commitWeight(item, $event)"
            />
          </label>
          <span class="mi__tray">
            <button
              v-if="locallyAddedIds.has(item.id)"
              type="button"
              class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
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
              class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
              :disabled="activeItems.length <= 1"
              :aria-label="`${t('planning.objects.form.multiItems.archive')}: ${item.label}`"
              :title="t('planning.objects.form.multiItems.archive')"
              @click="archiveItem(item.id)"
            >
              <AppIcon name="archive" class="text-sm" />
            </button>
          </span>
        </div>
      </li>
    </ul>
    <p v-if="!canAdd" class="mg-v2-meta mi__hint">
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
          <div class="mi__row">
            <span class="mi__board" aria-hidden="true">
              <span class="mi__initial">{{ initialOf(item.label) }}</span>
            </span>
            <span class="mi__name mi__name--static">{{ item.label }}</span>
            <span class="mi__tray">
              <button
                type="button"
                class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
                :disabled="!canAdd"
                :aria-label="`${t('planning.objects.form.multiItems.restore')}: ${item.label}`"
                :title="t('planning.objects.form.multiItems.restore')"
                @click="restoreItem(item.id)"
              >
                <AppIcon name="undo" class="text-sm" />
              </button>
            </span>
          </div>
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
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: var(--mg-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A tile is a small cloud: fill + lift, no edge. Every other tile leans a
   hair the other way, like the catalog tiles. */
.mi__tile {
  display: grid;
  min-width: 0;
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

.mi__row {
  display: flex;
  align-items: center;
  gap: var(--mg-space-1);
  min-width: 0;
}

.mi__row--quiet {
  min-height: 1.5rem;
  padding-left: var(--mg-space-1);
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

/* The name reads as text on the tile and becomes a field when clicked;
   both share one geometry so nothing shifts. */
.mi__name {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 var(--mg-space-1);
  border: 1px solid transparent;
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
  line-height: 1.5rem;
}

.mi__name--text {
  overflow: hidden;
  border-radius: var(--mg-radius-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.mi__name--text:hover {
  background: var(--mg-color-mist);
}

.mi__name--text:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}

.mi__name--static {
  overflow: hidden;
  color: var(--mg-color-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mi__weight {
  display: inline-flex;
  align-items: center;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-variant-numeric: tabular-nums;
  transition: opacity var(--mg-duration-fast) ease;
}

.mi__weight--one {
  opacity: 0.35;
}

.mi__tile:hover .mi__weight--one,
.mi__tile:focus-within .mi__weight--one {
  opacity: 1;
}

.mi__weight-input {
  width: 2.25rem;
  padding: 0 var(--mg-space-1);
  color: inherit;
  font-size: inherit;
  line-height: 1.25rem;
  -moz-appearance: textfield;
  appearance: textfield;
}

.mi__weight-input::-webkit-outer-spin-button,
.mi__weight-input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

/* The tray shows on hover of its tile, like the card tray. */
.mi__tray {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  margin-left: auto;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) ease;
}

.mi__tile:hover .mi__tray,
.mi__tile:focus-within .mi__tray {
  opacity: 1;
}

/* Tray buttons sit in a 1.5rem line so the quiet row stays a meta line. */
.mi__tray .mg-v2-button--icon-sm {
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
