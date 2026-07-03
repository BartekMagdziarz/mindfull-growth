<script setup lang="ts">
import { computed } from 'vue'
import StreamCard from './StreamCard.vue'
import StreamRing from './StreamRing.vue'
import { useT } from '@/composables/useT'
import type { StreamBarVM, StreamMonthVM } from './streamModel'

const props = defineProps<{
  month: StreamMonthVM
  monthLabel: string
  index: number
}>()

defineEmits<{ select: [] }>()

const { t } = useT()

const labelStyle = computed(() => ({
  color: props.month.isCurrent
    ? 'rgb(var(--stream-accent, 112 168 232))'
    : 'rgb(var(--stream-ink, 15 39 69))',
}))

const areaName = (key: string) => t(`planning.calendar.stream.dimShort.${key}`)
const ringLabel = (key: string) => t(`planning.calendar.stream.rings.${key}`)

function barStyle(area: StreamBarVM) {
  if (area.value === null) {
    return {
      height: '7px',
      background: 'rgb(var(--stream-track, 185 205 228) / 0.34)',
      boxShadow: 'none',
    }
  }
  return {
    height: `${Math.max(6, Math.round(area.value * 50))}px`,
    background: 'rgb(var(--stream-bar, 86 142 210))',
    boxShadow: '0 1px 4px rgb(var(--stream-bar, 86 142 210) / 0.4)',
  }
}

function prioRingStyle(rating: number | null) {
  const deg = ((rating ?? 0) / 5) * 360
  return {
    background: `conic-gradient(rgb(var(--stream-bar, 86 142 210)) ${deg}deg, rgb(var(--stream-bar, 86 142 210) / 0.16) 0)`,
  }
}

function prioIconStyle(rating: number | null) {
  return {
    fontSize: '14px',
    color:
      rating !== null
        ? 'rgb(var(--stream-bar, 86 142 210))'
        : 'rgb(var(--stream-faint, 169 191 220))',
  }
}
</script>

<template>
  <StreamCard
    :current="month.isCurrent"
    :future="month.timeState === 'future'"
    :delay-ms="index * 22"
    @select="$emit('select')"
  >
    <div class="stream-month__head">
      <span class="stream-month__label" :style="labelStyle">{{ monthLabel }}</span>
    </div>

    <div class="stream-month__body">
      <!-- LEFT (2/3): dimension bars + execution rings -->
      <div class="stream-month__main">
        <div class="stream-month__areas">
          <div v-for="area in month.areas" :key="area.key" class="stream-month__area">
            <div class="stream-month__bar-track">
              <span class="stream-month__bar" :style="barStyle(area)" />
            </div>
            <span
              class="stream-month__area-name"
              :class="{ 'is-dim': area.value === null }"
              :title="areaName(area.key)"
              >{{ areaName(area.key) }}</span
            >
          </div>
        </div>

        <div class="stream-divider" />

        <div class="stream-month__rings">
          <StreamRing
            v-for="ring in month.rings"
            :key="ring.key"
            :pct="ring.pct"
            :plan-only="ring.planOnly"
            :mean="ring.mean"
            :size="52"
            :label="ringLabel(ring.key)"
          />
        </div>
      </div>

      <!-- RIGHT (1/3): month priorities (placeholder) -->
      <div class="stream-month__prios">
        <span class="stream-month__prios-title">{{
          t('planning.calendar.stream.prioritiesTitle')
        }}</span>
        <div class="stream-month__prio-list">
          <div v-for="prio in month.priorities" :key="prio.key" class="stream-month__prio">
            <div v-if="prio.empty" class="stream-month__prio-empty" aria-hidden="true">—</div>
            <template v-else>
              <div class="stream-month__prio-ring" :style="prioRingStyle(prio.rating)">
                <div class="stream-month__prio-hole">
                  <span
                    class="material-symbols-outlined"
                    :style="prioIconStyle(prio.rating)"
                    aria-hidden="true"
                    >{{ prio.icon }}</span
                  >
                </div>
              </div>
              <span
                class="stream-month__prio-name"
                :class="{ 'is-dim': prio.rating === null }"
                :title="prio.name"
                >{{ prio.name }}</span
              >
            </template>
          </div>
        </div>
      </div>
    </div>
  </StreamCard>
</template>

<style scoped>
.stream-month__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  width: 100%;
}

.stream-month__label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: capitalize;
}

.stream-month__body {
  display: flex;
  align-items: stretch;
  gap: 14px;
  width: 100%;
}

.stream-month__main {
  flex: 2;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.stream-month__areas {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
}

.stream-month__area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.stream-month__bar-track {
  display: flex;
  align-items: flex-end;
  height: 54px;
}

.stream-month__bar {
  width: 16px;
  border-radius: 6px 6px 0 0;
  animation: streamGrowUp 0.5s both;
}

.stream-month__area-name {
  width: 100%;
  /* Reserve two lines so every column is the same height and the bars align;
     the wider card usually keeps labels on one line, long ones wrap instead of clipping. */
  min-height: 2.3em;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: rgb(var(--stream-muted, 95 122 152));
  text-align: center;
  line-height: 1.15;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stream-month__area-name.is-dim {
  color: rgb(var(--stream-faint, 169 191 220));
}

.stream-divider {
  height: 1px;
  width: 100%;
  background: rgb(var(--stream-track, 185 205 228) / 0.4);
  margin: 16px 0 14px;
}

.stream-month__rings {
  display: flex;
  align-items: flex-start;
  justify-content: space-evenly;
  gap: 6px;
  margin-top: auto;
  width: 100%;
}

.stream-month__prios {
  flex: 1;
  min-width: 0;
  padding-left: 14px;
  border-left: 1px solid rgb(var(--stream-track, 185 205 228) / 0.4);
  display: flex;
  flex-direction: column;
}

.stream-month__prios-title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--stream-faint, 169 191 220));
}

.stream-month__prio-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-top: 13px;
}

.stream-month__prio {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stream-month__prio-ring {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  flex: none;
}

.stream-month__prio-hole {
  position: absolute;
  inset: 4px;
  border-radius: 9999px;
  background: var(--stream-hole, #f4f8fe);
  box-shadow:
    inset -2px -2px 5px rgb(var(--neo-inset-light, 255 255 255) / 0.8),
    inset 2px 2px 5px rgb(var(--neo-inset-dark, 143 168 203) / 0.33);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-month__prio-name {
  min-width: 0;
  flex: 1 1 auto;
  font-size: 8.5px;
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: rgb(var(--stream-muted, 95 122 152));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-month__prio-name.is-dim {
  color: rgb(var(--stream-faint, 169 191 220));
}

.stream-month__prio-empty {
  width: 32px;
  height: 32px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--stream-faint, 169 191 220));
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
  .stream-month__bar {
    animation: none;
  }
}
</style>
