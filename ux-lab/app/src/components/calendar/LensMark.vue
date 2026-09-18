<template>
  <span
    class="lens-mark"
    :class="[`lens-mark--${reading.lens}`, `lens-mark--${size}`, { 'lens-mark--empty': reading.empty, 'lens-mark--plan': isPlan }]"
    :title="reading.title"
    :aria-label="reading.title"
    role="img"
  >
    <!-- brak danych: cicha kreska -->
    <i v-if="reading.empty" class="lens-mark__dash" />

    <!-- Rytm: trzy figury typów (koło · pięciokąt · kwadrat) wypełnione udziałem -->
    <template v-else-if="reading.lens === 'rytm'">
      <template v-if="isPlan">
        <span class="lens-mark__plan">{{ reading.text }}</span>
      </template>
      <template v-else-if="reading.parts.length === 1">
        <i class="lens-mark__disc" :style="{ '--f': reading.parts[0] }" />
      </template>
      <template v-else>
        <i class="lens-mark__shape lens-mark__shape--circle" :style="{ '--f': reading.parts[0] }" />
        <i class="lens-mark__shape lens-mark__shape--pentagon" :style="{ '--f': reading.parts[1] }" />
        <i class="lens-mark__shape lens-mark__shape--square" :style="{ '--f': reading.parts[2] }" />
      </template>
    </template>

    <!-- Stan: dwa słupki — wysiłek (róż) i stan (błękit) -->
    <template v-else-if="reading.lens === 'stan'">
      <i class="lens-mark__bar lens-mark__bar--effort" :style="{ '--f': reading.parts[0] }" />
      <i class="lens-mark__bar lens-mark__bar--state" :style="{ '--f': reading.parts[1] }" />
    </template>

    <!-- Emocje: pasek udziałów czterech ćwiartek -->
    <template v-else-if="reading.lens === 'emocje'">
      <span class="lens-mark__stack">
        <i v-for="(part, index) in reading.parts" :key="index" :style="{ flex: `${Math.max(part, 0.001)} 1 0`, background: `var(${QUADRANTS[index].cssVar})` }" />
      </span>
    </template>

    <!-- Wpisy: trzy kropki obecności -->
    <template v-else-if="reading.lens === 'wpisy'">
      <i v-for="(part, index) in reading.parts" :key="index" class="lens-mark__dot" :class="{ on: part > 0 }" :style="{ '--f': part }" />
    </template>

    <!-- Kierunki: słupki wysiłku (miesiąc) albo jeden dysk fokusu (tydzień) -->
    <template v-else-if="reading.lens === 'kierunki'">
      <template v-if="reading.parts.length === 1">
        <i class="lens-mark__disc" :style="{ '--f': reading.parts[0] }" />
      </template>
      <template v-else>
        <i v-for="(part, index) in reading.parts" :key="index" class="lens-mark__bar lens-mark__bar--state" :style="{ '--f': part }" />
      </template>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QUADRANTS, type LensReading } from '~lab/lab/calendarConceptData'

const props = withDefaults(defineProps<{ reading: LensReading; size?: 'xs' | 'sm' | 'md' }>(), { size: 'sm' })
const isPlan = computed(() => !props.reading.empty && props.reading.lens === 'rytm' && props.reading.parts.length === 0)
</script>

<style scoped>
.lens-mark {
  --h: 14px;
  --w: 6px;
  --gap: 3px;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--gap);
  height: var(--h);
  line-height: 1;
  vertical-align: middle;
}
.lens-mark--xs { --h: 9px; --w: 4px; --gap: 2px; }
.lens-mark--md { --h: 22px; --w: 9px; --gap: 4px; }

.lens-mark__dash { display: block; width: calc(var(--w) * 2.2); height: 1.5px; margin-bottom: calc(var(--h) / 2 - 1px); border-radius: 1px; background: rgb(var(--neo-border) / .5); }

/* wypełnienie od dołu w ramach jednej figury */
.lens-mark__shape,
.lens-mark__bar,
.lens-mark__disc {
  display: block;
  width: var(--w);
  height: var(--h);
  background:
    linear-gradient(to top, rgb(var(--sky-600)) calc(var(--f) * 100%), rgb(var(--sky-200) / .75) calc(var(--f) * 100%));
}
.lens-mark__shape--circle { border-radius: 999px; }
.lens-mark__shape--pentagon { clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%); }
.lens-mark__shape--square { border-radius: 2px; }
.lens-mark__shape { width: calc(var(--w) * 1.5); }

.lens-mark__bar { width: var(--w); border-radius: 2px 2px 1px 1px; }
.lens-mark__bar--effort { background: linear-gradient(to top, rgb(var(--rose-500)) calc(var(--f) * 100%), rgb(var(--rose-100) / .8) calc(var(--f) * 100%)); }
.lens-mark__bar--state { background: linear-gradient(to top, rgb(var(--sky-600)) calc(var(--f) * 100%), rgb(var(--sky-200) / .75) calc(var(--f) * 100%)); }

.lens-mark__disc {
  width: var(--h);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  background: rgb(var(--sky-200) / .75);
  position: relative;
}
.lens-mark__disc::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: calc(var(--f) * 74%);
  height: calc(var(--f) * 74%);
  border-radius: inherit;
  background: rgb(var(--sky-700));
}

.lens-mark__stack { display: flex; width: calc(var(--h) * 2.2); height: calc(var(--h) / 2.2); margin-bottom: calc(var(--h) / 2 - var(--h) / 4.4); border-radius: 999px; overflow: hidden; background: rgb(var(--neo-border) / .3); }
.lens-mark__stack i { display: block; height: 100%; }

.lens-mark__dot { display: block; width: calc(var(--h) / 2.2); height: calc(var(--h) / 2.2); margin-bottom: calc(var(--h) / 2 - var(--h) / 4.4); border-radius: 999px; background: rgb(var(--sky-200) / .5); }
.lens-mark__dot.on { background: rgb(var(--sky-600) / calc(.45 + var(--f) * .55)); }

.lens-mark__plan { font-size: 8.5px; font-weight: 800; letter-spacing: .02em; color: rgb(var(--neo-muted)); line-height: var(--h); }
.lens-mark--xs .lens-mark__plan { font-size: 7px; }
.lens-mark--md .lens-mark__plan { font-size: 11px; }
</style>
