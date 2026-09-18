<template>
  <figure class="ls-bars" :class="`ls-bars--${size}`" role="img" :aria-label="aria">
    <!-- lg: segmentowane słupki jak w cichym rytuale (5 pól, nieregularne promienie, ±0.9°) -->
    <div v-if="size === 'lg'" class="ls-bars__pair">
      <div class="ls-bars__axis ls-bars__axis--load" :title="`Obciążenie ${load ?? '–'}`">
        <i v-for="n in 5" :key="n" :class="{ filled: (load ?? 0) >= n, top: load === n }" />
      </div>
      <div class="ls-bars__axis ls-bars__axis--state" :style="{ '--ls-accent': color }" :title="`Stan ${state ?? '–'}`">
        <i v-for="n in 5" :key="n" :class="{ filled: (state ?? 0) >= n, top: state === n }" />
      </div>
    </div>
    <!-- sm: para cienkich słupków jak ratings-mini w kalendarzu rytmu -->
    <span v-else class="ls-bars__mini">
      <i class="ls-bars__mini-load" :style="{ height: `${pct(load)}%` }" />
      <i class="ls-bars__mini-state" :style="{ height: `${pct(state)}%`, background: color }" />
    </span>
    <figcaption v-if="label" class="ls-bars__label"><span>{{ label }}</span><small v-if="load && state">{{ load }} · {{ state }}</small></figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { classifyPair, pairColor, QUADRANT_LABELS, type ColorOptions, type MaybeRating } from '~lab/lab/weekLoadState'

const props = withDefaults(defineProps<{ load: MaybeRating; state: MaybeRating; label?: string; size?: 'sm' | 'lg'; options?: ColorOptions }>(), { label: '', size: 'lg', options: () => ({}) })
const pct = (v: MaybeRating) => (v == null ? 0 : (v / 5) * 100)
const color = computed(() => pairColor(props.load, props.state, props.options))
const aria = computed(() => `${props.label || 'Obszar'}: obciążenie ${props.load ?? 'brak'}, stan ${props.state ?? 'brak'}, tydzień ${QUADRANT_LABELS[classifyPair(props.load, props.state, props.options.midpoint).quadrant]}.`)
</script>

<style scoped>
.ls-bars { display: inline-grid; justify-items: center; gap: 6px; margin: 0; }
.ls-bars__pair { display: inline-flex; gap: 8px; align-items: flex-end; }
.ls-bars__axis { display: flex; flex-direction: column-reverse; gap: 4px; padding: 2px 0; }
.ls-bars__axis i {
  display: block; width: 26px; height: 15px;
  background: rgb(var(--sky-100) / 0.9);
  border-radius: 14px 18px 12px 16px / 55% 45% 60% 40%;
  transform: rotate(-0.9deg);
  transition: background 0.18s, opacity 0.18s;
}
.ls-bars__axis i:nth-child(2n) { border-radius: 17px 13px 18px 12px / 45% 60% 40% 55%; transform: rotate(0.9deg); }
.ls-bars__axis--load i.filled { background: rgb(var(--sky-800)); }
.ls-bars__axis--state i.filled { background: var(--ls-accent); }
.ls-bars__axis i.filled:nth-child(1) { opacity: 0.5; }
.ls-bars__axis i.filled:nth-child(2) { opacity: 0.62; }
.ls-bars__axis i.filled:nth-child(3) { opacity: 0.74; }
.ls-bars__axis i.filled:nth-child(4) { opacity: 0.87; }
.ls-bars__axis i.filled.top { opacity: 1; }

.ls-bars__mini { display: inline-flex; gap: 2px; align-items: flex-end; height: 36px; }
.ls-bars__mini i { display: inline-block; width: 6px; border-radius: 2px 2px 0 0; min-height: 0; }
.ls-bars__mini-load { background: rgb(var(--sky-800)); }

.ls-bars__label { display: grid; justify-items: center; font-size: 11px; font-weight: 750; color: rgb(var(--color-on-surface)); }
.ls-bars__label small { color: rgb(var(--neo-muted)); font-weight: 600; }
</style>
