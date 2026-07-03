<script setup lang="ts">
import { computed } from 'vue'
import StreamCard from './StreamCard.vue'
import StreamRing from './StreamRing.vue'
import type { StreamBarVM, StreamWeekVM } from './streamModel'
import { useT } from '@/composables/useT'

const props = defineProps<{
  week: StreamWeekVM
  weekLabel: string
  rangeLabel: string
  clusterLabels: Record<'W' | 'D' | 'S', string>
  ringLabels: Record<'goals' | 'habits' | 'trackers', string>
  index: number
}>()

defineEmits<{ select: [] }>()

const { t } = useT()

/** Each cluster bar is a weekly-reflection dimension; its key resolves to a label. */
function dimensionLabel(key: string): string {
  return t(`planning.reflection.weekly.dimensions.${key}`)
}

const labelStyle = computed(() => ({
  color: props.week.isCurrent
    ? 'rgb(var(--stream-accent, 112 168 232))'
    : 'rgb(var(--stream-ink, 15 39 69))',
}))

function barStyle(bar: StreamBarVM) {
  if (bar.value === null) {
    return {
      height: '6px',
      background: 'rgb(var(--stream-track, 185 205 228) / 0.34)',
      boxShadow: 'none',
    }
  }
  return {
    height: `${Math.max(5, Math.round(bar.value * 50))}px`,
    background: 'rgb(var(--stream-bar, 86 142 210))',
    boxShadow: '0 1px 4px rgb(var(--stream-bar, 86 142 210) / 0.4)',
  }
}

function iconStyle(bar: StreamBarVM) {
  return {
    fontSize: '13px',
    color:
      bar.value === null
        ? 'rgb(var(--stream-faint, 169 191 220))'
        : 'rgb(var(--stream-bar, 86 142 210) / 0.85)',
  }
}

function clusterLabelColor(hasData: boolean) {
  return hasData
    ? 'rgb(var(--stream-bar, 86 142 210) / 0.95)'
    : 'rgb(var(--stream-faint, 169 191 220))'
}
</script>

<template>
  <StreamCard
    :current="week.isCurrent"
    :future="week.timeState === 'future'"
    :delay-ms="index * 30"
    @select="$emit('select')"
  >
    <div class="stream-week__head">
      <span class="stream-week__label" :style="labelStyle">{{ weekLabel }}</span>
      <span class="stream-week__range">{{ rangeLabel }}</span>
    </div>

    <div class="stream-week__clusters">
      <div v-for="cluster in week.clusters" :key="cluster.key" class="stream-week__cluster">
        <div class="stream-week__bars">
          <div v-for="bar in cluster.bars" :key="bar.key" class="stream-week__bar-col">
            <span class="stream-week__bar" :style="barStyle(bar)" :title="dimensionLabel(bar.key)" />
            <span class="material-symbols-outlined" :style="iconStyle(bar)" aria-hidden="true">{{
              bar.icon
            }}</span>
          </div>
        </div>
        <span class="stream-week__cluster-name" :style="{ color: clusterLabelColor(cluster.hasData) }">
          {{ clusterLabels[cluster.key] }}
        </span>
      </div>
    </div>

    <div class="stream-divider" />

    <div class="stream-rings">
      <StreamRing
        v-for="ring in week.rings"
        :key="ring.key"
        :pct="ring.pct"
        :plan-only="ring.planOnly"
        :num="ring.num"
        :den="ring.den"
        :size="52"
        :label="ringLabels[ring.key]"
      />
    </div>
  </StreamCard>
</template>

<style scoped>
.stream-week__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  width: 100%;
}

.stream-week__label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.stream-week__range {
  font-size: 11px;
  color: rgb(var(--stream-faint, 169 191 220));
  font-weight: 500;
}

.stream-week__clusters {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.stream-week__cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stream-week__bars {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 58px;
}

.stream-week__bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.stream-week__bar {
  width: 9px;
  border-radius: 4px 4px 0 0;
  animation: streamGrowUp 0.5s both;
}

.stream-week__cluster-name {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.stream-divider {
  height: 1px;
  width: 100%;
  background: rgb(var(--stream-track, 185 205 228) / 0.4);
  margin: 18px 0 16px;
}

.stream-rings {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

@keyframes streamGrowUp {
  from {
    opacity: 0;
    transform: scaleY(0.4);
    transform-origin: bottom;
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stream-week__bar {
    animation: none;
  }
}
</style>
