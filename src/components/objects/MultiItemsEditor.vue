<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import { useT } from '@/composables/useT'
import type { MultiCompletionItem } from '@/domain/planning'
import { MULTI_COMPLETION_MAX_ACTIVE_ITEMS, createMultiCompletionItem } from '@/domain/planning'

/**
 * Checklist items of a multi-completion subject as small tiles, three to a
 * row: icon board · name · weight when it is not 1. Tiles carry no actions;
 * clicking one opens ONE edit strip under the grid (icon, name, weight,
 * order, archive), so no item reserves room for a tray. A faded ghost tile
 * adds the next item. The day threshold is a clause of the measurement
 * sentence, not of this editor.
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
const rootRef = ref<HTMLElement | null>(null)
const editingId = ref<string | null>(null)

const activeItems = computed(() => props.items.filter(item => !item.archived))
const archivedItems = computed(() => props.items.filter(item => item.archived))
const canAdd = computed(() => activeItems.value.length < MULTI_COMPLETION_MAX_ACTIVE_ITEMS)
const editing = computed(() => props.items.find(item => item.id === editingId.value) ?? null)
const editingIndex = computed(() => {
  const current = editing.value
  return current ? activeItems.value.findIndex(item => item.id === current.id) : -1
})

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

// --- the strip --------------------------------------------------------------

function focusName(select: boolean): void {
  void nextTick(() => {
    const field = rootRef.value?.querySelector<HTMLInputElement>('[data-strip-name]')
    field?.focus()
    if (select) field?.select()
  })
}

function toggleEdit(id: string): void {
  if (props.disabled) return
  if (editingId.value === id) {
    editingId.value = null
    return
  }
  editingId.value = id
  focusName(false)
}

function closeStrip(): void {
  editingId.value = null
}

// Outside click closes the strip; the teleported icon picker counts as inside.
function handleOutsideClick(event: MouseEvent): void {
  if (!editingId.value) return
  const target = event.target as Node
  if (rootRef.value?.contains(target)) return
  if ((target as Element).closest?.('.icon-picker-menu')) return
  editingId.value = null
}

onMounted(() => document.addEventListener('pointerdown', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsideClick))

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
  if (!canAdd.value) return
  const item = createMultiCompletionItem(
    `${t('planning.objects.form.multiItems.defaultItemLabel').replace(/\s*\d+$/, '')} ${activeItems.value.length + 1}`.trim()
  )
  locallyAddedIds.value.add(item.id)
  commit([...props.items, item], props.threshold)
  // The new tile opens its strip with the name selected, so typing replaces it.
  editingId.value = item.id
  focusName(true)
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
  editingId.value = null
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
  editingId.value = null
}

function removeItem(id: string): void {
  if (activeItems.value.length <= 1) return
  locallyAddedIds.value.delete(id)
  commit(
    props.items.filter(item => item.id !== id),
    props.threshold
  )
  editingId.value = null
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
    :class="disabled ? 'pointer-events-none opacity-60' : ''"
    @keydown.escape.stop="closeStrip"
  >
    <ul class="mi__grid">
      <li v-for="(item, index) in activeItems" :key="item.id" class="mi__cell">
        <button
          type="button"
          class="mi__tile"
          :class="{ 'mi__tile--selected': editingId === item.id, 'mi__tile--alt': index % 2 === 1 }"
          :aria-pressed="editingId === item.id"
          :aria-label="item.label"
          data-testid="multi-item"
          @click="toggleEdit(item.id)"
        >
          <span class="mi__board" aria-hidden="true">
            <EntityIcon v-if="item.icon" :icon="item.icon" size="sm" :circle="false" />
            <span v-else class="mi__initial">{{ initialOf(item.label) }}</span>
          </span>
          <span class="mi__name">{{ item.label }}</span>
          <span v-if="item.weight !== 1" class="mi__weight">×{{ item.weight }}</span>
        </button>
      </li>
      <!-- The next tile, faded: a cloud of what will appear there. -->
      <li v-if="canAdd" class="mi__cell">
        <button type="button" class="mg-v2-ghost mi__tile mi__tile--add" @click="addItem">
          <AppIcon name="add" class="text-sm" />
          {{ t('planning.objects.form.multiItems.addItem') }}
        </button>
      </li>
    </ul>
    <p v-if="!canAdd" class="mg-v2-meta mi__hint">
      <span>{{
        t('planning.objects.form.multiItems.maxItemsHint', {
          max: MULTI_COMPLETION_MAX_ACTIVE_ITEMS,
        })
      }}</span>
    </p>

    <!-- ONE edit strip for the whole list, under the grid. -->
    <div v-if="editing" class="mi__strip" data-testid="multi-item-editor">
      <template v-if="!editing.archived">
        <IconPicker
          compact
          minimal
          :allow-clear="true"
          :model-value="editing.icon"
          :aria-label="t('planning.objects.form.multiItems.labelPlaceholder')"
          @update:model-value="commitIcon(editing, $event)"
        />
        <input
          :value="editing.label"
          type="text"
          class="mg-v2-inline-field mi__strip-name"
          data-strip-name
          :placeholder="t('planning.objects.form.multiItems.labelPlaceholder')"
          @change="commitLabel(editing, $event)"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <label class="mi__strip-weight">
          <span>{{ t('planning.objects.form.multiItems.weightLabel') }}</span>
          <input
            :value="editing.weight"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            class="mg-v2-field mg-v2-sentence__num"
            :aria-label="t('planning.objects.form.multiItems.weightAria', { label: editing.label })"
            @change="commitWeight(editing, $event)"
            @keydown.enter.prevent="commitWeight(editing, $event)"
          />
        </label>
        <div class="mi__strip-actions">
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="editingIndex <= 0"
            :aria-label="`${editing.label} ↑`"
            @click="moveItem(editing.id, -1)"
          >
            <AppIcon name="keyboard_arrow_up" class="text-sm" />
          </button>
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="editingIndex === activeItems.length - 1"
            :aria-label="`${editing.label} ↓`"
            @click="moveItem(editing.id, 1)"
          >
            <AppIcon name="keyboard_arrow_down" class="text-sm" />
          </button>
          <button
            v-if="locallyAddedIds.has(editing.id)"
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
            :disabled="activeItems.length <= 1"
            :aria-label="t('planning.objects.form.multiItems.remove')"
            :title="t('planning.objects.form.multiItems.remove')"
            @click="removeItem(editing.id)"
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
            @click="archiveItem(editing.id)"
          >
            <AppIcon name="inventory_2" class="text-sm" />
          </button>
        </div>
      </template>
      <template v-else>
        <span class="mi__strip-name mi__strip-name--static">{{ editing.label }}</span>
        <button
          type="button"
          class="mg-v2-button mg-v2-button--quiet mi__restore"
          :disabled="!canAdd"
          @click="restoreItem(editing.id)"
        >
          {{ t('planning.objects.form.multiItems.restore') }}
        </button>
      </template>
    </div>

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
        <li v-for="item in archivedItems" :key="item.id" class="mi__cell">
          <button
            type="button"
            class="mi__tile mi__tile--archived"
            :class="{ 'mi__tile--selected': editingId === item.id }"
            :aria-pressed="editingId === item.id"
            :aria-label="item.label"
            @click="toggleEdit(item.id)"
          >
            <span class="mi__board" aria-hidden="true">
              <EntityIcon v-if="item.icon" :icon="item.icon" size="sm" :circle="false" />
              <span v-else class="mi__initial">{{ initialOf(item.label) }}</span>
            </span>
            <span class="mi__name">{{ item.label }}</span>
          </button>
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

.mi__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--mg-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.mi__cell {
  display: flex;
  min-width: 0;
}

/* A tile is a small cloud: fill + lift, no edge. Every other tile leans a
   hair the other way, like the catalog tiles. */
.mi__tile {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  width: 100%;
  min-height: 2.75rem;
  padding: var(--mg-space-1) var(--mg-space-2) var(--mg-space-1) var(--mg-space-1);
  border: 1px solid transparent;
  border-radius: var(--mg-radius-md);
  color: var(--mg-color-ink);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow var(--mg-duration-fast) ease,
    background var(--mg-duration-fast) ease;
}

.mi__tile--alt {
  transform: rotate(-0.4deg);
}

.mi__tile:hover {
  box-shadow: var(--mg-shadow-raised);
}

/* Open in the strip: pressed into the sky field. */
.mi__tile--selected,
.mi__tile--selected:hover {
  background: var(--mg-color-sky-field);
  box-shadow: var(--mg-shadow-inset-sm);
}

.mi__tile--archived {
  opacity: 0.6;
}

/* The add tile stays a ghost even inside a group (which would paper it). */
.mi__tile--add {
  justify-content: center;
  gap: var(--mg-space-1);
  color: var(--mg-color-primary-strong);
  background: color-mix(in srgb, var(--mg-color-paper) 55%, transparent);
  box-shadow: none;
  font-size: var(--mg-font-size-xs);
}

.mi__tile--add:hover {
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
}

.mi__board {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
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

.mi__name {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  line-height: 1.2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mi__weight {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-variant-numeric: tabular-nums;
}

.mi__hint {
  padding: 0 var(--mg-space-1);
}

/* The strip: one paper row under the grid with everything an item can change. */
.mi__strip {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  padding: var(--mg-space-1) var(--mg-space-2);
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-paper);
}

.mi__strip-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
}

.mi__strip-name--static {
  padding: var(--mg-space-1) var(--mg-space-2);
  color: var(--mg-color-muted);
}

.mi__strip-weight {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--mg-space-1);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-label);
}

.mi__strip-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.mi__archived {
  display: grid;
  gap: var(--mg-space-2);
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
