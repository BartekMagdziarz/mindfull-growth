<template>
  <div
    class="grid items-center gap-x-2 gap-y-1.5"
    :style="{ gridTemplateColumns }"
    data-testid="assignment-matrix"
  >
    <!-- Header row -->
    <div />
    <div
      v-for="column in columns"
      :key="`head:${column.key}`"
      class="flex flex-col items-center gap-0.5 pb-1"
    >
      <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
        {{ column.label }}
        <span
          v-if="column.marker"
          class="h-1.5 w-1.5 rounded-full bg-outline/60"
          :title="column.marker"
        />
      </span>
      <span v-if="column.sublabel" class="text-[11px] font-semibold text-on-surface">
        {{ column.sublabel }}
      </span>
    </div>
    <div class="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
      {{ targetLabel }}
    </div>
    <div />

    <!-- Sections -->
    <template v-for="section in sections" :key="section.key">
      <component
        :is="section.collapsible ? 'button' : 'div'"
        v-if="section.rows.length > 0"
        class="col-span-full mt-2 flex items-center gap-1.5 rounded-lg px-1 py-1 text-left first:mt-0"
        :class="section.collapsible ? 'transition-colors hover:bg-primary/5' : ''"
        :type="section.collapsible ? 'button' : undefined"
        :data-testid="`matrix-section-${section.key}`"
        @click="section.collapsible && toggleSection(section)"
      >
        <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
          {{ section.label }}
        </span>
        <AppIcon
          v-if="section.collapsible"
          name="expand_more"
          class="text-sm text-on-surface-variant transition-transform duration-200"
          :class="isSectionOpen(section) ? 'rotate-180' : ''"
        />
      </component>

      <template v-if="isSectionOpen(section)">
        <div
          v-for="row in section.rows"
          :key="row.key"
          class="group grid grid-cols-subgrid col-span-full items-center"
          :data-testid="`matrix-row-${row.key}`"
        >
          <!-- Leading: icon + title + soft pill -->
          <div class="flex min-w-0 items-center gap-2 py-0.5 pl-1">
            <EntityIcon :icon="row.icon ?? TYPE_ICONS[row.subjectType]" size="xs" />
            <span class="min-w-0 truncate text-sm font-medium text-on-surface" :title="row.title">
              {{ row.title }}
            </span>
            <span
              v-if="row.softLabel"
              class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-strong"
            >
              {{ row.softLabel }}
            </span>
          </div>

          <!-- Cells -->
          <template v-for="column in columns" :key="`${row.key}:${column.key}`">
            <button
              v-if="row.cells[column.key]"
              type="button"
              class="neo-focus relative flex h-8 items-center justify-center rounded-xl transition-all duration-150"
              :class="cellClass(row.cells[column.key]!)"
              :disabled="row.cells[column.key]!.disabled"
              :aria-pressed="row.cells[column.key]!.state !== 'empty'"
              :title="row.cells[column.key]!.title"
              :data-testid="`matrix-cell-${row.key}-${column.key}`"
              @click="$emit('cellToggle', row.key, column.key)"
            >
              <AppIcon
                v-if="row.cells[column.key]!.state !== 'empty'"
                name="check"
                class="text-sm"
                :class="row.cells[column.key]!.state === 'soft' ? 'opacity-40' : ''"
              />
              <span
                v-if="row.cells[column.key]!.badge"
                class="absolute -right-1 -top-1 rounded-full bg-neu-base px-1 py-px text-[9px] font-bold leading-none text-on-surface-variant shadow-neu-raised-sm"
              >
                {{ row.cells[column.key]!.badge }}
              </span>
            </button>
            <div v-else class="flex h-8 items-center justify-center text-on-surface-variant/40">
              —
            </div>
          </template>

          <!-- Trailing: target slot -->
          <div class="flex items-center justify-center">
            <slot name="target" :row="row" />
          </div>

          <!-- Row actions -->
          <div class="flex items-center gap-1 pr-1">
            <button
              type="button"
              class="neo-icon-button h-7 w-7 rounded-lg"
              :class="
                row.isWholePeriod
                  ? 'text-primary-strong shadow-neu-pressed-sm'
                  : 'text-on-surface-variant opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-primary'
              "
              :aria-pressed="Boolean(row.isWholePeriod)"
              :aria-label="wholePeriodLabel"
              :title="wholePeriodLabel"
              :data-testid="`matrix-whole-${row.key}`"
              @click="$emit('wholePeriod', row.key)"
            >
              <AppIcon name="event_repeat" class="text-sm" />
            </button>
            <button
              type="button"
              class="neo-icon-button h-7 w-7 rounded-lg text-on-surface-variant opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-on-surface disabled:pointer-events-none disabled:opacity-20"
              :disabled="!row.hasPlacement"
              :aria-label="clearLabel"
              :title="clearLabel"
              :data-testid="`matrix-clear-${row.key}`"
              @click="$emit('clearRow', row.key)"
            >
              <AppIcon name="backspace" class="text-sm" />
            </button>
            <button
              v-if="row.expandable"
              type="button"
              class="neo-icon-button h-7 w-7 rounded-lg"
              :class="
                isRowExpanded(row.key)
                  ? 'text-primary-strong shadow-neu-pressed-sm'
                  : 'text-on-surface-variant opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-primary'
              "
              :aria-expanded="isRowExpanded(row.key)"
              :aria-label="expandLabel"
              :title="expandLabel"
              :data-testid="`matrix-expand-${row.key}`"
              @click="toggleRowExpanded(row.key)"
            >
              <AppIcon
                name="expand_more"
                class="text-sm transition-transform duration-200"
                :class="isRowExpanded(row.key) ? 'rotate-180' : ''"
              />
            </button>
            <span v-else-if="hasExpandableRows" class="h-7 w-7" />
          </div>

          <!-- Expanded detail strip (e.g. month sub-target editor) -->
          <div
            v-if="row.expandable && isRowExpanded(row.key)"
            class="col-span-full mb-1 rounded-xl border border-primary/15 bg-primary/4 px-3 py-2"
            :data-testid="`matrix-detail-${row.key}`"
          >
            <slot name="row-detail" :row="row" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import type {
  AssignmentMatrixCell,
  AssignmentMatrixColumn,
  AssignmentMatrixSection,
} from './assignmentMatrixTypes'

const props = defineProps<{
  columns: AssignmentMatrixColumn[]
  sections: AssignmentMatrixSection[]
  targetLabel: string
  wholePeriodLabel: string
  clearLabel: string
  expandLabel?: string
}>()

defineEmits<{
  cellToggle: [rowKey: string, columnKey: string]
  wholePeriod: [rowKey: string]
  clearRow: [rowKey: string]
}>()

// Same type-icon fallback as WeekObjectTile/MonthObjectTile panels.
const TYPE_ICONS: Record<string, string> = {
  keyResult: 'flag',
  habit: 'loop',
  tracker: 'monitoring',
}

const gridTemplateColumns = computed(
  () =>
    `minmax(9rem, 15rem) repeat(${props.columns.length}, minmax(2.5rem, 1fr)) max-content max-content`
)

const hasExpandableRows = computed(() =>
  props.sections.some(section => section.rows.some(row => row.expandable))
)

// Collapsed/expanded UI state keyed by section/row — survives data reloads
// (rows are re-created on every save), intentionally not persisted.
const openSections = ref<Record<string, boolean>>({})
const expandedRows = ref<Record<string, boolean>>({})

function isSectionOpen(section: AssignmentMatrixSection): boolean {
  if (!section.collapsible) return true
  return openSections.value[section.key] ?? section.defaultOpen ?? false
}

function toggleSection(section: AssignmentMatrixSection): void {
  openSections.value[section.key] = !isSectionOpen(section)
}

function isRowExpanded(rowKey: string): boolean {
  return expandedRows.value[rowKey] ?? false
}

function toggleRowExpanded(rowKey: string): void {
  expandedRows.value[rowKey] = !isRowExpanded(rowKey)
}

function cellClass(cell: AssignmentMatrixCell): string {
  if (cell.state === 'checked') {
    return 'bg-primary/15 text-primary shadow-neu-pressed-sm'
  }
  if (cell.state === 'soft') {
    return 'bg-primary/8 text-primary'
  }
  if (cell.disabled) {
    return 'neo-inset opacity-40'
  }
  return 'neo-inset text-on-surface-variant hover:bg-primary/8'
}
</script>
