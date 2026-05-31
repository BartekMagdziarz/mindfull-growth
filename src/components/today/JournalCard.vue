<template>
  <article class="dz-card neo-raised flex flex-col gap-[10px] p-3">
    <header class="dz-card__head">
      <button
        type="button"
        class="dz-card__label"
        @click="router.push('/journal')"
      >
        {{ t('planning.today.wellness.journal') }}
      </button>
      <button
        v-if="state === 'done'"
        type="button"
        class="dz-card__addbtn neo-focus"
        :aria-label="t('planning.calendar.wellness.newEntry')"
        @click.stop="router.push('/journal/edit')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </header>

    <div class="dz-cta">
      <button
        type="button"
        class="dz-slot neo-focus"
        :class="state === 'done' ? 'dz-slot--filled' : 'dz-slot--empty'"
        :aria-label="state === 'done'
          ? t('planning.today.wellness.ariaJournalDone')
          : t('planning.today.wellness.ariaJournalEmpty')"
        @click="router.push('/journal/edit')"
      >
        <svg
          v-if="state === 'done'"
          width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="white" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5 9-11" />
        </svg>
        <svg
          v-else
          width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="rgb(var(--color-primary-strong))" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 21l3.5-1 11-11-2.5-2.5-11 11L3 21z" />
          <path d="M14 6.5L17.5 10" />
        </svg>
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'

defineProps<{
  state: 'empty' | 'done'
}>()

const router = useRouter()
const { t } = useT()
</script>

<style scoped>
.dz-card {
  border-radius: 1.4rem;
}

.dz-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
}

.dz-card__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgb(var(--neo-muted));
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 200ms ease;
}
.dz-card__label:hover {
  color: rgb(var(--color-primary));
}

.dz-card__addbtn {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.8),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.33);
  display: grid;
  place-items: center;
  color: rgb(var(--neo-muted) / 0.8);
  opacity: 0.85;
  transition: opacity 200ms ease, color 200ms ease;
  border: none;
  cursor: pointer;
}
.dz-card__addbtn:hover {
  opacity: 1;
  color: rgb(var(--color-primary-strong));
}

.dz-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 2px;
}

.dz-slot {
  width: 88px;
  height: 88px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, background 200ms ease;
}

.dz-slot--empty {
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  border: 1px dashed rgb(var(--color-primary) / 0.55);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.85),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.30);
  color: rgb(var(--color-primary-strong));
}
.dz-slot--empty:hover {
  border-color: rgb(var(--color-primary));
  transform: translateY(-1px);
  box-shadow:
    -6px -6px 12px rgb(var(--neo-shadow-light) / 0.9),
    6px 6px 12px rgb(var(--neo-shadow-dark) / 0.34);
}

.dz-slot--filled {
  background: linear-gradient(145deg, rgb(var(--color-primary)), rgb(var(--color-primary-strong)));
  border: 1px solid rgb(var(--color-primary-strong) / 0.45);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.7),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.35),
    inset 0 1px 0 rgb(255 255 255 / 0.25);
  color: white;
}
.dz-slot--filled:hover {
  transform: translateY(-1px);
  box-shadow:
    -6px -6px 12px rgb(var(--neo-shadow-light) / 0.75),
    6px 6px 12px rgb(var(--neo-shadow-dark) / 0.38),
    inset 0 1px 0 rgb(255 255 255 / 0.3);
}
.dz-slot:active {
  transform: translateY(0);
}
</style>
