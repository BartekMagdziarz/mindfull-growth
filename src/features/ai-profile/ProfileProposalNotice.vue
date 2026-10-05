<template>
  <RouterLink
    v-if="count"
    class="profile-proposal-notice"
    to="/profile?review=1#psychological"
    title="Przejrzyj propozycje do profilu"
  >
    <AppIcon name="psychology" />{{ label }}
  </RouterLink>
</template>
<script setup lang="ts">
import { liveQuery } from 'dexie'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { getUserDatabase } from '@/services/userDatabase.service'
const props = defineProps<{ conversationId?: string }>()
const count = ref(0)
/** Polish plural: 1 propozycja · 2–4 propozycje · 5+ propozycji (12–14 → propozycji). */
const label = computed(() => {
  const n = count.value
  const tens = n % 100
  const ones = n % 10
  const word = n === 1 ? 'propozycja' : ones >= 2 && ones <= 4 && (tens < 12 || tens > 14) ? 'propozycje' : 'propozycji'
  return `${n} ${word} do profilu`
})
let subscription: { unsubscribe(): void } | undefined
let stopWatching: (() => void) | undefined
onMounted(() => {
  stopWatching = watch(
    () => props.conversationId,
    () => {
      subscription?.unsubscribe()
      count.value = 0
      const db = getUserDatabase()
      subscription = liveQuery(async () => {
        const rows = await db.profileProposals.where('status').equals('pending').toArray()
        return rows.filter(
          row => !props.conversationId || row.origin.conversationId === props.conversationId
        ).length
      }).subscribe({
        next: value => {
          count.value = getUserDatabase() === db ? value : 0
        },
        error: () => {
          count.value = 0
        },
      })
    },
    { immediate: true }
  )
})
onBeforeUnmount(() => {
  stopWatching?.()
  subscription?.unsubscribe()
})
</script>
<style scoped>
/* A quiet pill, not an alert: muted ink, mist background, paper on hover. */
.profile-proposal-notice {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px 4px 8px;
  border-radius: 11px 9px 12px 10px;
  background: var(--mg-color-mist);
  color: var(--mg-color-muted);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.18s, color 0.18s;
}
.profile-proposal-notice:hover,
.profile-proposal-notice:focus-visible {
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
}
.profile-proposal-notice .material-symbols-outlined {
  font-size: 15px;
}
</style>
