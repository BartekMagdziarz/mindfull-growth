<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import KrPillDropdown from '@/components/objects/KrPillDropdown.vue'
import { useT } from '@/composables/useT'
import type { MultiCompletionItem } from '@/domain/planning'
import { MULTI_COMPLETION_MAX_ACTIVE_ITEMS, createMultiCompletionItem } from '@/domain/planning'

const props = withDefaults(
  defineProps<{
    items: MultiCompletionItem[]
    threshold?: number
    disabled?: boolean
  }>(),
  { threshold: undefined, disabled: false },
)

// One atomic event carrying the whole multi config: the domain normalizer
// treats a payload that touches items as authoritative for the threshold too,
// so emitting them separately would race the autosave.
const emit = defineEmits<{
  'update:config': [value: { items: MultiCompletionItem[]; threshold: number | undefined }]
}>()

const { t } = useT()

// Items added in this editor instance were never referenced by an entry, so
// they may be hard-deleted; everything else can only be archived.
const locallyAddedIds = ref(new Set<string>())
const archivedOpen = ref(false)

const activeItems = computed(() => props.items.filter((item) => !item.archived))
const archivedItems = computed(() => props.items.filter((item) => item.archived))
const activeWeightSum = computed(() =>
  activeItems.value.reduce((sum, item) => sum + item.weight, 0),
)
const allWeightsAreOne = computed(() => activeItems.value.every((item) => item.weight === 1))
const canAdd = computed(() => activeItems.value.length < MULTI_COMPLETION_MAX_ACTIVE_ITEMS)

function commit(items: MultiCompletionItem[], threshold: number | undefined): void {
  const sum = Math.max(
    items.filter((item) => !item.archived).reduce((total, item) => total + item.weight, 0),
    1,
  )
  const clamped = threshold === undefined ? undefined : Math.min(Math.max(threshold, 1), sum)
  emit('update:config', { items, threshold: clamped })
}

function patchItem(id: string, patch: Partial<MultiCompletionItem>): void {
  commit(
    props.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    props.threshold,
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
    `${t('planning.objects.form.multiItems.defaultItemLabel').replace(/\s*\d+$/, '')} ${activeItems.value.length + 1}`.trim(),
  )
  locallyAddedIds.value.add(item.id)
  commit([...props.items, item], props.threshold)
}

function moveItem(id: string, direction: -1 | 1): void {
  const index = props.items.findIndex((item) => item.id === id)
  const target = index + direction
  if (index === -1 || target < 0 || target >= props.items.length) return
  const next = [...props.items]
  ;[next[index], next[target]] = [next[target], next[index]]
  commit(next, props.threshold)
}

function archiveItem(id: string): void {
  if (activeItems.value.length <= 1) return
  commit(
    props.items.map((item) => (item.id === id ? { ...item, archived: true } : item)),
    props.threshold,
  )
}

function restoreItem(id: string): void {
  if (!canAdd.value) return
  commit(
    props.items.map((item) => {
      if (item.id !== id) return item
      const { archived: _dropped, ...rest } = item
      return rest
    }),
    props.threshold,
  )
}

function removeItem(id: string): void {
  if (activeItems.value.length <= 1) return
  locallyAddedIds.value.delete(id)
  commit(props.items.filter((item) => item.id !== id), props.threshold)
}

// --- threshold ("Zalicz dzień przy: komplecie elementów / progu punktowym") --
const thresholdMode = computed(() => (props.threshold === undefined ? 'all' : 'custom'))
const thresholdOptions = computed(() => [
  { value: 'all', label: t('planning.objects.form.multiItems.thresholdAll') },
  { value: 'custom', label: t('planning.objects.form.multiItems.thresholdCustom') },
])

function onThresholdMode(value: string): void {
  if (value === thresholdMode.value) return
  commit(
    [...props.items],
    value === 'all' ? undefined : Math.max(activeWeightSum.value - 1, 1),
  )
}

function commitThresholdValue(event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  if (!Number.isFinite(parsed) || parsed < 1) {
    input.value = String(props.threshold ?? activeWeightSum.value)
    return
  }
  commit([...props.items], parsed)
}

const thresholdSuffix = computed(() =>
  allWeightsAreOne.value
    ? t('planning.objects.form.multiItems.thresholdOfItems', { max: activeWeightSum.value })
    : t('planning.objects.form.multiItems.thresholdOfPoints', { max: activeWeightSum.value }),
)
</script>

<template>
  <div class="space-y-2" :class="disabled ? 'pointer-events-none opacity-60' : ''">
    <div class="flex items-center justify-between">
      <div class="text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        {{ t('planning.objects.form.multiItems.heading') }}
        <span class="ml-1 normal-case tracking-normal text-on-surface-variant/60">
          {{ activeItems.length }}/{{ MULTI_COMPLETION_MAX_ACTIVE_ITEMS }}
        </span>
      </div>
      <button
        type="button"
        class="neo-badge flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-on-surface transition-colors hover:text-primary disabled:opacity-40"
        :disabled="!canAdd"
        :title="canAdd ? undefined : t('planning.objects.form.multiItems.maxItemsHint', { max: MULTI_COMPLETION_MAX_ACTIVE_ITEMS })"
        @click="addItem"
      >
        <AppIcon name="add" class="text-xs" />
        {{ t('planning.objects.form.multiItems.addItem') }}
      </button>
    </div>

    <ul class="space-y-1">
      <li
        v-for="(item, index) in activeItems"
        :key="item.id"
        class="flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/30 px-1.5 py-1"
      >
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
          class="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-xs font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.multiItems.labelPlaceholder')"
          @change="commitLabel(item, $event)"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <label class="flex shrink-0 items-center gap-1 text-[9px] text-on-surface-variant/70">
          {{ t('planning.objects.form.multiItems.weightLabel') }}
          <input
            :value="item.weight"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            class="neo-input w-10 px-1 py-0.5 text-center text-xs"
            @change="commitWeight(item, $event)"
          />
        </label>
        <div class="flex shrink-0 items-center">
          <button
            type="button"
            class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 disabled:opacity-30"
            :disabled="index === 0"
            :aria-label="`${item.label} ↑`"
            @click="moveItem(item.id, -1)"
          >
            <AppIcon name="keyboard_arrow_up" class="text-sm" />
          </button>
          <button
            type="button"
            class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 disabled:opacity-30"
            :disabled="index === activeItems.length - 1"
            :aria-label="`${item.label} ↓`"
            @click="moveItem(item.id, 1)"
          >
            <AppIcon name="keyboard_arrow_down" class="text-sm" />
          </button>
          <button
            v-if="locallyAddedIds.has(item.id)"
            type="button"
            class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 text-danger disabled:opacity-30"
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
            class="neo-icon-button neo-icon-button--flat neo-focus !h-6 !w-6 disabled:opacity-30"
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

    <div v-if="archivedItems.length > 0" class="space-y-1">
      <button
        type="button"
        class="flex items-center gap-1 text-[10px] font-medium text-on-surface-variant underline decoration-dotted underline-offset-2 hover:text-on-surface"
        @click="archivedOpen = !archivedOpen"
      >
        <AppIcon :name="archivedOpen ? 'expand_less' : 'expand_more'" class="text-xs" />
        {{ t('planning.objects.form.multiItems.archivedHeading', { count: archivedItems.length }) }}
      </button>
      <ul v-if="archivedOpen" class="space-y-1">
        <li
          v-for="item in archivedItems"
          :key="item.id"
          class="flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-1.5 py-1 opacity-70"
        >
          <span class="min-w-0 flex-1 truncate px-1 text-xs text-on-surface-variant">{{ item.label }}</span>
          <button
            type="button"
            class="neo-badge px-2 py-0.5 text-[10px] font-medium text-on-surface transition-colors hover:text-primary disabled:opacity-40"
            :disabled="!canAdd"
            @click="restoreItem(item.id)"
          >
            {{ t('planning.objects.form.multiItems.restore') }}
          </button>
        </li>
      </ul>
    </div>

    <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-on-surface">
      <span class="text-on-surface-variant">{{ t('planning.objects.form.multiItems.thresholdLabel') }}</span>
      <KrPillDropdown
        flat
        :model-value="thresholdMode"
        :options="thresholdOptions"
        :disabled="disabled"
        @update:model-value="onThresholdMode"
      />
      <template v-if="thresholdMode === 'custom'">
        <input
          :value="threshold"
          type="number"
          min="1"
          :max="activeWeightSum"
          step="1"
          inputmode="numeric"
          class="neo-badge w-14 px-2 py-1 text-center text-sm font-semibold text-on-surface transition-colors focus:border-primary/50 focus:bg-white/70 focus:outline-none"
          :aria-label="t('planning.objects.form.multiItems.thresholdLabel')"
          @change="commitThresholdValue"
          @keydown.enter.prevent="commitThresholdValue"
        />
        <span class="text-on-surface-variant">{{ thresholdSuffix }}</span>
      </template>
    </div>
  </div>
</template>
