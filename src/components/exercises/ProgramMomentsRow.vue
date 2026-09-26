<template>
  <section class="moments-row" :aria-label="t('programs.ui.momentsTitle')">
    <div class="mg-v2-section-head">
      <h2>{{ t('programs.ui.momentsTitle') }}</h2>
    </div>
    <p class="moments-row__lead">{{ t('programs.ui.momentsLead') }}</p>
    <div class="mg-v2-surface mg-v2-surface--raised-sm moments-row__card">
      <span class="moments-row__count">
        {{ recent.length ? tp(recent.length, 'programs.ui.momentsRecent.one', 'programs.ui.momentsRecent.few', 'programs.ui.momentsRecent.many') : t('programs.ui.momentsNone') }}
      </span>
      <RouterLink :to="`/exercises/micro/moment-${kind}`" class="mg-v2-button mg-v2-button--primary">
        <AppIcon name="add" />{{ t('programs.ui.logMoment') }}
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MomentKind } from '@/domain/moments'
import { hadMoment, recentMoments } from '@/domain/moments'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'

/**
 * "Momenty" — the path's moment log, one click away from the path view
 * until the Today path panel takes it over (plan v2 §6). The count reads
 * the shared entry store; the button opens the path's variant.
 */
const props = defineProps<{ kind: MomentKind }>()

const { t, tp } = useT()
const entryStore = useMicroExerciseEntryStore()

onMounted(() => {
  void entryStore.loadEntries()
})

// Calm-day notes are entries too, but the count is about moments.
const recent = computed(() => recentMoments(entryStore.entries, props.kind, 7).filter(hadMoment))
</script>

<style scoped>
.moments-row {
  display: grid;
  gap: var(--mg-space-3);
  margin-bottom: var(--mg-space-6);
}

.moments-row__lead {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}

.moments-row__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mg-space-4);
  padding: var(--mg-space-3) var(--mg-space-4);
}

.moments-row__count {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
}
</style>
