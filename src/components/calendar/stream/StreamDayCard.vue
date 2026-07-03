<script setup lang="ts">
import { computed } from 'vue'
import StreamCard from './StreamCard.vue'
import StreamRing from './StreamRing.vue'
import type { StreamDayVM } from './streamModel'

const props = defineProps<{
  day: StreamDayVM
  weekdayLabel: string
  journalLabel: string
  emotionsLabel: string
  ringLabels: Record<'goals' | 'habits' | 'trackers', string>
  index: number
}>()

const numberStyle = computed(() => {
  if (props.day.isToday) {
    return {
      color: '#fff',
      background: 'linear-gradient(135deg, rgb(var(--stream-accent-soft, 142 188 240)), rgb(var(--stream-accent, 112 168 232)))',
      width: '28px',
      height: '28px',
      borderRadius: '9999px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }
  return { color: 'rgb(var(--stream-ink, 15 39 69))' }
})

const journalBoxStyle = computed(() => {
  if (props.day.journalWritten) {
    return {
      background: 'rgb(var(--stream-bar, 86 142 210))',
      boxShadow:
        '-4px -4px 8px rgb(var(--neo-shadow-light, 255 255 255) / 0.8), 4px 4px 8px rgb(var(--neo-shadow-dark, 145 170 205) / 0.33)',
    }
  }
  return {
    background: 'rgb(var(--color-surface-container, 245 250 255))',
    boxShadow:
      'inset -2px -2px 5px rgb(var(--neo-inset-light, 255 255 255) / 0.8), inset 2px 2px 5px rgb(var(--neo-inset-dark, 143 168 203) / 0.33)',
  }
})

const journalIconStyle = computed(() => ({
  fontSize: '21px',
  color: props.day.journalWritten ? '#fff' : 'rgb(var(--stream-bar, 86 142 210) / 0.42)',
}))

const emoRingStyle = computed(() => {
  if (props.day.emotionCount === 0 || props.day.emotionSegments.length === 0) {
    return { background: 'rgb(var(--stream-faint, 169 191 220) / 0.32)' }
  }
  const total = props.day.emotionSegments.reduce((sum, seg) => sum + seg.weight, 0) || 1
  let acc = 0
  const stops = props.day.emotionSegments.map((seg) => {
    const start = (acc / total) * 360
    acc += seg.weight
    const end = (acc / total) * 360
    return `${seg.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`
  })
  return {
    background: `conic-gradient(${stops.join(',')})`,
    boxShadow: '0 1px 5px rgb(var(--neo-shadow-dark, 145 170 205) / 0.3)',
  }
})

const emoCountStyle = computed(() => ({
  color:
    props.day.emotionCount === 0
      ? 'rgb(var(--stream-faint, 169 191 220))'
      : 'rgb(var(--stream-ink, 15 39 69))',
}))

const emoCountText = computed(() => (props.day.emotionCount === 0 ? '—' : String(props.day.emotionCount)))
</script>

<template>
  <StreamCard tag="div" :current="day.isToday" :future="day.isFuture" :delay-ms="index * 36">
    <div class="stream-day__head">
      <span class="stream-day__weekday">{{ weekdayLabel }}</span>
      <span class="stream-day__num" :style="numberStyle">{{ day.dayNumber }}</span>
    </div>

    <div class="stream-day__indicators">
      <div class="stream-day__indicator">
        <span class="stream-day__journal" :style="journalBoxStyle">
          <span class="material-symbols-outlined" :style="journalIconStyle" aria-hidden="true"
            >edit_note</span
          >
        </span>
        <span class="stream-day__indicator-name">{{ journalLabel }}</span>
      </div>
      <div class="stream-day__indicator">
        <div class="stream-day__emo" :style="emoRingStyle">
          <div class="stream-day__emo-hole">
            <span class="stream-day__emo-count" :style="emoCountStyle">{{ emoCountText }}</span>
          </div>
        </div>
        <span class="stream-day__indicator-name">{{ emotionsLabel }}</span>
      </div>
    </div>

    <div class="stream-divider" />

    <div class="stream-day__rings">
      <StreamRing
        v-for="ring in day.rings"
        :key="ring.key"
        :pct="ring.pct"
        :plan-only="ring.planOnly"
        :num="ring.num"
        :den="ring.den"
        :size="46"
        :label="ringLabels[ring.key]"
      />
    </div>
  </StreamCard>
</template>

<style scoped>
.stream-day__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  width: 100%;
}

.stream-day__weekday {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgb(var(--stream-faint, 169 191 220));
  text-transform: uppercase;
}

.stream-day__num {
  font-size: 16px;
  font-weight: 700;
}

.stream-day__indicators {
  display: flex;
  gap: 10px;
  width: 100%;
}

.stream-day__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.stream-day__journal {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-day__emo {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 9999px;
}

.stream-day__emo-hole {
  position: absolute;
  inset: 6px;
  border-radius: 9999px;
  background: var(--stream-hole, #f4f8fe);
  box-shadow:
    inset -2px -2px 5px rgb(var(--neo-inset-light, 255 255 255) / 0.8),
    inset 2px 2px 5px rgb(var(--neo-inset-dark, 143 168 203) / 0.33);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-day__emo-count {
  font-size: 13px;
  font-weight: 700;
}

.stream-day__indicator-name {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--stream-muted, 95 122 152));
}

.stream-divider {
  height: 1px;
  width: 100%;
  background: rgb(var(--stream-track, 185 205 228) / 0.4);
  margin: 18px 0 16px;
}

.stream-day__rings {
  display: flex;
  justify-content: space-around;
  gap: 8px;
  width: 100%;
}
</style>
