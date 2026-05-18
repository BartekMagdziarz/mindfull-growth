<template>
  <div :class="wrapperClass">
    <FoundationProgressHeader
      :done="completionCount"
      :total="statuses.length"
      :build-enabled="completionCount >= FOUNDATION_BUILD_FLOOR"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FoundationProgressHeader from '@/components/profile/FoundationProgressHeader.vue'
import FoundationTile from '@/components/profile/FoundationTile.vue'
import { useT } from '@/composables/useT'
import {
  computeFoundationStatuses,
  foundationCompletionCount,
  loadFoundationSourceData,
  FOUNDATION_BUILD_FLOOR,
  type FoundationGroup,
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
const completionCount = computed(() => foundationCompletionCount(statuses.value))

const statusesByGroup = computed(() => ({
  values: statuses.value.filter((status) => status.group === 'values'),
  personality: statuses.value.filter((status) => status.group === 'personality'),
  lifeBalance: statuses.value.filter((status) => status.group === 'lifeBalance'),
}))

const groupOrder: FoundationGroup[] = ['values', 'personality', 'lifeBalance']

const groups = computed(() =>
  groupOrder.map((id) => ({
    id,
    statuses: statusesByGroup.value[id],
  })),
)

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
