<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.directAccess.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.directAccess.subtitle') }}</p>
      </div>
    </div>

    <DirectAccessWizard @saved="handleSaved" />

    <!-- Past Sessions -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastSessions') }}</h2>

      <template v-if="sortedSessions.length">
        <AppCard
          v-for="session in sortedSessions"
          :key="session.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(session.createdAt) }}</span>
            <span class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold">
              {{ t('exercises.views.messagesCount', { n: session.messages.length }) }}
            </span>
          </div>

          <!-- Linked part -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.part') }}</span>
            <span class="text-xs font-medium text-on-surface">{{ getPartName(session.partId) }}</span>
            <PartRoleBadge v-if="getPartRole(session.partId)" :role="getPartRole(session.partId)!" />
          </div>

          <!-- Insights -->
          <div v-if="session.insights.length" class="flex flex-wrap gap-1">
            <span
              v-for="insight in session.insights.slice(0, 3)"
              :key="insight.id"
              class="neo-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
            >
              {{ insight.tag }}
            </span>
            <span v-if="session.insights.length > 3" class="text-xs text-on-surface-variant">
              +{{ session.insights.length - 3 }} more
            </span>
          </div>

          <!-- Discoveries -->
          <div v-if="session.partJobDiscovered || session.partFearDiscovered || session.partNeedDiscovered" class="space-y-0.5">
            <p v-if="session.partJobDiscovered" class="text-xs text-on-surface-variant">
              <span class="font-medium">{{ t('exercises.views.job') }}</span> {{ session.partJobDiscovered }}
            </p>
            <p v-if="session.partFearDiscovered" class="text-xs text-on-surface-variant">
              <span class="font-medium">{{ t('exercises.views.fear') }}</span> {{ session.partFearDiscovered }}
            </p>
            <p v-if="session.partNeedDiscovered" class="text-xs text-on-surface-variant">
              <span class="font-medium">{{ t('exercises.views.need') }}</span> {{ session.partNeedDiscovered }}
            </p>
          </div>

          <p v-if="session.summary" class="text-xs text-on-surface-variant line-clamp-2">
            {{ session.summary }}
          </p>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noDirectAccessYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import DirectAccessWizard from '@/components/exercises/DirectAccessWizard.vue'
import { useIFSDirectAccessStore } from '@/stores/ifsDirectAccess.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const directAccessStore = useIFSDirectAccessStore()
const partStore = useIFSPartStore()

onMounted(() => {
  directAccessStore.loadSessions()
  partStore.loadParts()
})

const sortedSessions = computed(() => directAccessStore.sortedSessions)

function handleSaved() {
  directAccessStore.loadSessions()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function getPartRole(id: string) {
  return partStore.getPartById(id)?.role ?? null
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
