<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 0..100, or null for a plan-only ring ("—"). */
    pct: number | null
    planOnly?: boolean
    /** Dial diameter in px. */
    size?: number
    label: string
    icon?: string
    showIcon?: boolean
    /** Concrete ratio behind the pct → center reads "n/d" instead of a percentage. */
    num?: number
    den?: number
    /** pct is a mean of ratios (no concrete count) → center reads "ø72%". */
    mean?: boolean
  }>(),
  {
    planOnly: false,
    size: 54,
    icon: undefined,
    showIcon: false,
    num: undefined,
    den: undefined,
    mean: false,
  },
)

const dialStyle = computed(() => {
  const deg = `${(props.pct ?? 0) * 3.6}deg`
  const fill = props.planOnly ? 'rgb(var(--stream-track, 185 205 228) / 0.30)' : 'rgb(var(--stream-bar, 86 142 210))'
  const track = props.planOnly
    ? 'rgb(var(--stream-bar, 86 142 210) / 0.06)'
    : 'rgb(var(--stream-bar, 86 142 210) / 0.16)'
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    background: `conic-gradient(${fill} ${deg}, ${track} 0)`,
  }
})

const pctStyle = computed(() => ({
  fontSize: props.size >= 50 ? '12px' : '11px',
  color: props.planOnly ? 'rgb(var(--stream-faint, 169 191 220))' : 'rgb(var(--stream-ink, 15 39 69))',
}))

const iconStyle = computed(() => ({
  fontSize: '13px',
  color: props.planOnly ? 'rgb(var(--stream-faint, 169 191 220))' : 'rgb(var(--stream-bar, 86 142 210))',
}))

// Prefer a concrete tally ("2/3") when a real integer ratio exists; fall back to
// a percentage otherwise (year-ribbon mean → "ø72%", any no-data → "—").
const pctText = computed(() => {
  if (props.den != null && props.den > 0 && props.num != null) return `${props.num}/${props.den}`
  if (props.pct === null) return '—'
  return `${props.mean ? 'ø' : ''}${props.pct}%`
})
</script>

<template>
  <div class="stream-ring">
    <div class="stream-ring__dial" :style="dialStyle">
      <div class="stream-ring__hole">
        <span class="stream-ring__pct" :style="pctStyle">{{ pctText }}</span>
      </div>
    </div>
    <div class="stream-ring__label">
      <span
        v-if="showIcon && icon"
        class="material-symbols-outlined stream-ring__icon"
        :style="iconStyle"
        aria-hidden="true"
        >{{ icon }}</span
      >
      <span class="stream-ring__name">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.stream-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.stream-ring__dial {
  position: relative;
  border-radius: 9999px;
  flex: none;
}

.stream-ring__hole {
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

.stream-ring__pct {
  font-weight: 700;
  line-height: 1;
}

.stream-ring__label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stream-ring__name {
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--stream-muted, 95 122 152));
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
</style>
