<template>
  <section
    class="mg-v2-surface mg-v2-surface--raised-sm pp-card"
    :aria-label="t('programs.dose.title')"
    data-testid="path-dose"
  >
    <header class="pp-card__head">
      <span>{{ t('programs.dose.title') }}</span>
    </header>
    <p class="dose__lead">
      {{ tg(proposal.kind === 'none' ? 'programs.dose.leadNone' : 'programs.dose.leadTooMuch') }}
    </p>
    <ul class="dose__list">
      <li v-for="item in rows" :key="item.slug">
        <AppIcon :name="item.icon" />
        <strong>{{ item.title }}</strong>
        <small>{{ item.change }}</small>
      </li>
    </ul>
    <p v-if="proposal.kind === 'none'" class="pp-muted">
      {{ t('programs.dose.cardHint', { card: t('programKnowledge.notIndulgence.title') }) }}
    </p>
    <div class="pp-chips">
      <button
        type="button"
        class="pp-chip pp-chip--primary"
        :disabled="busy"
        @click="emit('apply')"
      >
        {{ t(proposal.kind === 'none' ? 'programs.dose.applyNone' : 'programs.dose.applyTooMuch') }}
      </button>
      <button type="button" class="pp-chip" :disabled="busy" @click="emit('keep')">
        {{ t('programs.dose.keep') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import type { DoseProposal } from '@/domain/programFollowUp'

/**
 * After "Czy nie za dużo?" said too much (or nothing): the path view offers
 * a calmer rhythm — one click writes the overrides, "Zostaw jak jest"
 * records the current rhythm as the decision. Never "do more".
 */
const props = defineProps<{ proposal: DoseProposal; busy?: boolean }>()
const emit = defineEmits<{ apply: []; keep: [] }>()
const { t, tg, tp } = useT()

const every = (days: number) =>
  days === 1
    ? t('programs.ui.everyDay')
    : tp(
        days,
        'programs.ui.everyNDays.one',
        'programs.ui.everyNDays.few',
        'programs.ui.everyNDays.many'
      )

const rows = computed(() =>
  props.proposal.items.map(item => {
    const entry = getCatalogEntry(item.slug)
    return {
      slug: item.slug,
      icon: entry?.icon ?? 'repeat',
      title: entry ? t(`exercises.cards.${entry.i18nKey}.title`) : item.slug,
      change: `${every(item.from)} → ${every(item.to)}`,
    }
  })
)
</script>

<style scoped>
.dose__lead {
  margin: 0 0 var(--mg-space-3);
  font-size: var(--mg-font-size-sm);
  line-height: 1.5;
}
.dose__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dose__list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--mg-space-2);
  align-items: center;
}
.dose__list .material-symbols-outlined {
  color: var(--mg-color-primary-strong);
  font-size: 18px;
}
.dose__list strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}
.dose__list small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
.dose__list + .pp-muted {
  margin-top: var(--mg-space-3);
}
</style>
