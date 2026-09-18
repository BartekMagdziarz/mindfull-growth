<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    :aria-label="interactive ? label : undefined"
    :title="interactive ? label : undefined"
    class="mg-v2-timeline"
    :class="[
      interactive ? 'mg-v2-inline-trigger' : '',
      isOverdue ? 'mg-v2-timeline--overdue' : '',
      isOpen ? 'mg-v2-timeline--open' : '',
    ]"
    @click="interactive ? $emit('click') : undefined"
  >
    <!-- Linear: start → end, ink up to today -->
    <template v-if="variant === 'linear' && window && window.state !== 'empty'">
      <div class="mg-v2-timeline__track" aria-hidden="true">
        <span class="mg-v2-timeline__pencil" />
        <span
          v-if="inkWidth > 0"
          class="mg-v2-timeline__ink"
          :style="{ width: `${inkWidth}%` }"
        />
        <span
          v-if="window.state !== 'upcoming'"
          class="mg-v2-timeline__dot mg-v2-timeline__dot--today"
          :style="{ left: `${todayLeft}%` }"
        />
        <span
          v-if="window.end"
          class="mg-v2-timeline__dot"
          :class="isOverdue ? 'mg-v2-timeline__dot--hit' : ''"
          style="left: 100%"
        />
      </div>
      <div class="mg-v2-timeline__labels">
        <span>{{ start ?? '' }}</span>
        <span v-if="end" :class="end.tone === 'bad' ? 'mg-v2-timeline__labels--bad' : ''">
          <b>{{ end.label }}</b><template v-if="end.hint"> · {{ end.hint }}</template>
        </span>
        <span v-else>{{ openLabel }}</span>
      </div>
    </template>

    <!-- Years: one stepper dot per year -->
    <template v-else-if="variant === 'years' && years">
      <div class="mg-v2-timeline__track" aria-hidden="true">
        <span class="mg-v2-timeline__pencil" />
        <span
          v-if="years.progress !== null"
          class="mg-v2-timeline__ink"
          :style="{ width: `${years.progress * 100}%` }"
        />
        <span
          v-for="(dot, index) in years.years"
          :key="dot.ref"
          class="mg-v2-timeline__dot"
          :class="{
            'mg-v2-timeline__dot--done': dot.state === 'done',
            'mg-v2-timeline__dot--today': dot.state === 'current',
          }"
          :style="{ left: `${yearLeft(index)}%` }"
        />
      </div>
      <div class="mg-v2-timeline__labels">
        <span
          v-for="dot in years.years"
          :key="dot.ref"
          :class="dot.state === 'current' ? 'mg-v2-timeline__labels--current' : ''"
        >
          {{ dot.ref }}
        </span>
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ObjectWindow, YearsWindow } from '@/utils/objectWindow'

export interface TimelineEndLabel {
  label: string
  hint?: string
  tone?: 'bad'
}

const props = withDefaults(
  defineProps<{
    variant: 'linear' | 'years'
    window?: ObjectWindow | null
    years?: YearsWindow | null
    start?: string | null
    end?: TimelineEndLabel | null
    openLabel?: string
    interactive?: boolean
    label?: string
  }>(),
  {
    window: null,
    years: null,
    start: null,
    end: null,
    openLabel: '',
    interactive: false,
    label: undefined,
  },
)

defineEmits<{ click: [] }>()

const isOverdue = computed(() => props.variant === 'linear' && props.window?.state === 'overdue')
const isOpen = computed(() => props.variant === 'linear' && props.window?.state === 'open')

const inkWidth = computed(() => {
  const progress = props.window?.progress
  return progress === null || progress === undefined ? 0 : progress * 100
})

const todayLeft = computed(() => inkWidth.value)

function yearLeft(index: number): number {
  const count = props.years?.years.length ?? 1
  return count <= 1 ? 0 : (index / (count - 1)) * 100
}
</script>
