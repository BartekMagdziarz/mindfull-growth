<template>
  <div class="mcs-container">
    <div
      v-for="slot in data.slots"
      :key="slot.dayRef"
      class="mcs-col"
      :class="{ 'mcs-col--future': slot.isFuture && !slot.hasEntry }"
    >
      <component
        :is="isCellInteractive(slot) ? 'button' : 'div'"
        v-for="row in data.rows"
        :key="row.id"
        :type="isCellInteractive(slot) ? 'button' : undefined"
        :disabled="isCellInteractive(slot) && isPending ? true : undefined"
        class="mcs-cell"
        :class="cellClasses(slot, row)"
        :title="cellTitle(slot, row)"
        :aria-label="isCellInteractive(slot) ? cellTitle(slot, row) : undefined"
        @click="isCellInteractive(slot) && $emit('toggle-item', row.id)"
      >
        <span
          v-if="row.icon"
          class="material-symbols-outlined mcs-cell__icon"
          aria-hidden="true"
        >{{ row.icon }}</span>
        <span v-else class="mcs-cell__dot" aria-hidden="true" />
      </component>

      <div class="mcs-daymark" :class="daymarkClass(slot)" />
      <span class="mcs-label">{{ slot.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  MultiCompletionStackData,
  MultiCompletionStackRow,
  MultiCompletionStackSlot,
} from '@/services/weeklySliceChartData'

const props = withDefaults(
  defineProps<{
    data: MultiCompletionStackData
    /** Make today's column clickable (per-item toggles). Read-only elsewhere. */
    interactive?: boolean
    isPending?: boolean
  }>(),
  { interactive: false, isPending: false },
)

defineEmits<{
  'toggle-item': [itemId: string]
}>()

function isCellInteractive(slot: MultiCompletionStackSlot): boolean {
  return props.interactive && slot.isToday
}

function isChecked(slot: MultiCompletionStackSlot, row: MultiCompletionStackRow): boolean {
  return slot.checkedIds.includes(row.id)
}

function cellClasses(slot: MultiCompletionStackSlot, row: MultiCompletionStackRow): string[] {
  const classes: string[] = []
  if (isChecked(slot, row)) classes.push('mcs-cell--on')
  if (isCellInteractive(slot)) classes.push('mcs-cell--btn', 'neo-focus')
  return classes
}

function cellTitle(slot: MultiCompletionStackSlot, row: MultiCompletionStackRow): string {
  return `${row.label} · ${slot.label}`
}

/**
 * Day underline: green = met (threshold reached), amber = partial (entry
 * below threshold), red = scheduled past day without an entry, ring-ish
 * outline for today-pending, faint for everything else.
 */
function daymarkClass(slot: MultiCompletionStackSlot): string {
  if (slot.met) return 'mcs-daymark--met'
  if (slot.hasEntry) return 'mcs-daymark--partial'
  if (slot.state === 'missed') return 'mcs-daymark--missed'
  if (slot.state === 'today-pending') return 'mcs-daymark--pending'
  return 'mcs-daymark--empty'
}
</script>

<style scoped>
.mcs-container {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
}

.mcs-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.mcs-col--future {
  opacity: 0.55;
}

.mcs-cell {
  box-sizing: border-box;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid rgb(var(--color-outline) / 0.22);
  background: rgb(var(--color-outline) / 0.08);
  color: rgb(var(--neo-muted) / 0.55);
  padding: 0;
}

.mcs-cell--on {
  border-color: transparent;
  background: linear-gradient(
    to bottom,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
  color: white;
}

.mcs-cell--btn {
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.mcs-cell--btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.15);
}

.mcs-cell__icon {
  font-size: 13px;
  line-height: 1;
}

.mcs-cell__dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}

.mcs-daymark {
  width: 20px;
  height: 3px;
  border-radius: 2px;
  margin-top: 2px;
}

.mcs-daymark--met {
  background: linear-gradient(
    to right,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
}

.mcs-daymark--partial {
  background: rgb(var(--color-warning) / 0.75);
}

.mcs-daymark--missed {
  background: rgb(var(--color-error) / 0.35);
}

.mcs-daymark--pending {
  background: transparent;
  border: 1px solid rgb(var(--neo-chart-primary-end) / 0.55);
}

.mcs-daymark--empty {
  background: rgb(var(--color-outline) / 0.14);
}

.mcs-label {
  font-size: 10px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: rgb(var(--neo-muted) / 0.7);
}
</style>
