<template>
  <section v-if="allCards.length" class="mg-v2-surface mg-v2-surface--raised-sm pp-card" :aria-label="t('programs.ui.knowledgeTitle')">
    <header class="pp-card__head">
      <span>{{ t('programs.ui.knowledgeTitle') }}</span>
      <button v-if="allCards.length > 2" type="button" class="pp-link" :aria-expanded="showAll" @click="showAll = !showAll">
        {{ showAll ? t('programs.ui.less') : t('programs.ui.all') }}
      </button>
    </header>
    <ul class="kn">
      <li v-for="card in visible" :key="card.key">
        <button type="button" @click="openKey = card.key">
          <AppIcon :name="readCards.includes(card.key) ? 'check' : 'menu_book'" />
          <strong>{{ t(`programKnowledge.${card.i18nKey}.title`) }}</strong>
          <AppIcon name="chevron_right" />
        </button>
      </li>
    </ul>

    <dialog
      ref="dialogRef"
      class="drawer mg-design-v2"
      :aria-label="t('programs.ui.knowledgeTitle')"
      @cancel.prevent="openKey = null"
      @click="$event.target === dialogRef && (openKey = null)"
    >
      <template v-if="openCard">
        <header class="drawer__head">
          <span class="pp-card__head drawer__eyebrow">{{ t('programs.ui.knowledgeTitle') }}</span>
          <button type="button" class="pp-chip pp-chip--ghost" :aria-label="t('common.buttons.close')" @click="openKey = null">
            <AppIcon name="close" />
          </button>
        </header>
        <h2>{{ t(`programKnowledge.${openCard.i18nKey}.title`) }}</h2>
        <p class="drawer__lead">{{ tg(`programKnowledge.${openCard.i18nKey}.lead`) }}</p>
        <p v-for="(paragraph, i) in body(openCard)" :key="i">{{ paragraph }}</p>
        <details v-if="sources(openCard).length" class="drawer__sources">
          <summary>{{ t('programs.ui.sources') }}</summary>
          <p v-for="(source, i) in sources(openCard)" :key="i">{{ source }}</p>
        </details>
        <button type="button" class="mg-v2-button mg-v2-button--primary" @click="markRead">
          {{ readCards.includes(openCard.key) ? t('common.buttons.close') : t('programs.ui.markRead') }}
        </button>
      </template>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { orderedKnowledgeCards, type KnowledgeCard } from '@/data/programKnowledge'

/**
 * "Warto wiedzieć": the path's knowledge cards as titles — the pinned ones
 * and the current phase's first, two on the surface, the rest behind
 * "Wszystkie". A card opens in a side drawer; "Przeczytane" is a marker
 * the enrollment keeps (never a gate).
 */
const props = defineProps<{
  programSlug: string
  phaseKey?: string
  readCards: readonly string[]
}>()
const emit = defineEmits<{ read: [key: string] }>()

const { t, tg, tList } = useT()
const showAll = ref(false)
const openKey = ref<string | null>(null)
const dialogRef = ref<HTMLDialogElement>()

const allCards = computed(() => orderedKnowledgeCards(props.programSlug, props.phaseKey))
const visible = computed(() =>
  showAll.value
    ? allCards.value
    : allCards.value.filter((card) => card.pinned || (props.phaseKey && card.phaseKeys.includes(props.phaseKey))).slice(0, 2),
)
const openCard = computed(() => allCards.value.find((card) => card.key === openKey.value))

const body = (card: KnowledgeCard) => tList(`programKnowledge.${card.i18nKey}.body`)
const sources = (card: KnowledgeCard) => tList(`programKnowledge.${card.i18nKey}.sources`)

watch(openKey, async (key) => {
  await nextTick()
  if (key) dialogRef.value?.showModal()
  else dialogRef.value?.close()
})

function markRead() {
  if (openKey.value && !props.readCards.includes(openKey.value)) emit('read', openKey.value)
  openKey.value = null
}
</script>

<style scoped>
.kn {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.kn button {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 18px;
  gap: var(--mg-space-2);
  align-items: center;
  width: 100%;
  min-height: 2.2rem;
  padding: var(--mg-space-1) var(--mg-space-2);
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.kn button:hover {
  background: var(--mg-color-mist);
}
.kn .material-symbols-outlined {
  color: var(--mg-color-primary-strong);
  font-size: 18px;
}
.kn strong {
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}

.drawer {
  position: fixed;
  inset: 0 0 0 auto;
  width: min(540px, 90vw);
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  padding: 28px 32px 32px;
  border: 0;
  border-left: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-lg) 0 0 var(--mg-radius-lg);
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font-family: var(--mg-font-sans);
}
.drawer::backdrop {
  background: var(--mg-color-scrim);
}
.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.drawer__eyebrow {
  margin: 0;
}
.drawer h2 {
  margin: 18px 0 10px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
}
.drawer p {
  margin: 12px 0;
  font-size: var(--mg-font-size-md);
  line-height: 1.7;
}
.drawer__lead {
  color: var(--mg-color-primary-strong);
  font-weight: 700;
}
.drawer__sources {
  margin: 20px 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
.drawer__sources summary {
  font-weight: 800;
  cursor: pointer;
}
.drawer__sources p {
  font-size: var(--mg-font-size-xs);
  line-height: 1.5;
}
</style>
