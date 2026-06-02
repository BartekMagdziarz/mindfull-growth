<template>
  <div :class="wrapperClass">
    <FoundationProgressHeader
      :groups="groupProgress"
      :unlocked="unlocked"
      @build="goBuild"
    />

    <section
      v-for="group in groups"
      :key="group.id"
      class="mt-6 space-y-3"
      :data-test-foundation-group="group.id"
    >
      <h2 class="text-sm font-semibold text-on-surface">
        {{ t(`profile.psychologicalProfile.foundation.groups.${group.id}`) }}
      </h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FoundationTile
          v-for="status in group.statuses"
          :key="status.id"
          :status="status"
          @navigate="navigate"
        />
      </div>
    </section>

    <!--
      Roadmap dimensions we don't have instruments for yet. Shown as locked
      teasers so the structure (and the gaps) are visible; they never count
      toward the unlock.
    -->
    <section
      v-if="comingSoonGroups.length > 0"
      class="mt-8 space-y-3"
      data-test-foundation-coming-soon
    >
      <h2 class="text-sm font-semibold text-on-surface-variant">
        {{ t('profile.psychologicalProfile.foundation.comingSoon.title') }}
      </h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          v-for="group in comingSoonGroups"
          :key="group"
          class="rounded-2xl border border-dashed border-neu-border/40 bg-neu-base/60 p-4 shadow-neu-flat"
          :data-test-foundation-coming-soon-group="group"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              class="neo-icon-circle flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-70"
            >
              <AppIcon :name="comingSoonIcon[group]" class="text-lg text-on-surface-variant" />
            </span>
            <span class="neo-pill px-2.5 py-1 text-xs text-on-surface-variant">
              {{ t('profile.psychologicalProfile.foundation.comingSoon.badge') }}
            </span>
          </div>
          <h3 class="mt-3 text-sm font-semibold text-on-surface">
            {{ t(`profile.psychologicalProfile.foundation.comingSoon.groups.${group}.title`) }}
          </h3>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{ t(`profile.psychologicalProfile.foundation.comingSoon.groups.${group}.description`) }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import FoundationProgressHeader from '@/components/profile/FoundationProgressHeader.vue'
import FoundationTile from '@/components/profile/FoundationTile.vue'
import { useT } from '@/composables/useT'
import {
  computeFoundationGroupProgress,
  computeFoundationStatuses,
  isFoundationBuildUnlocked,
  loadFoundationSourceData,
  FOUNDATION_COMING_SOON_ORDER,
  FOUNDATION_GROUP_ORDER,
  type FoundationComingSoonGroup,
} from '@/services/foundationCompleteness'

const props = withDefaults(defineProps<{
  embedded?: boolean
  loadOnMount?: boolean
}>(), {
  embedded: false,
  loadOnMount: true,
})

const router = useRouter()
const { t } = useT()

const wrapperClass = computed(() =>
  props.embedded
    ? 'w-full'
    : 'mx-auto w-full max-w-3xl px-4 py-6 pb-28',
)

const statuses = computed(() => computeFoundationStatuses())
const groupProgress = computed(() => computeFoundationGroupProgress(statuses.value))
const unlocked = computed(() => isFoundationBuildUnlocked(statuses.value))

const groups = computed(() =>
  FOUNDATION_GROUP_ORDER.map((id) => ({
    id,
    statuses: statuses.value.filter((status) => status.group === id),
  })),
)

const comingSoonGroups = FOUNDATION_COMING_SOON_ORDER

const comingSoonIcon: Record<FoundationComingSoonGroup, string> = {
  emotions: 'mood',
  strengths: 'bolt',
  relationships: 'group',
}

function navigate(payload: {
  routeName: string
  routeParams?: Record<string, string>
}): void {
  router.push({ name: payload.routeName, params: payload.routeParams })
}

function goBuild(): void {
  router.push({ name: 'profile-psychological-build' })
}

onMounted(async () => {
  if (!props.loadOnMount) return
  await loadFoundationSourceData()
})
</script>
