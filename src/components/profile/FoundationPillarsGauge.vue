<template>
  <div
    role="img"
    :aria-label="ariaLabel"
    class="flex flex-col gap-3"
  >
    <!-- Keystone: dim while locked, lit once every pillar clears its line. -->
    <div
      class="flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-500"
      :class="
        unlocked
          ? 'bg-primary/15 text-primary-strong shadow-neu-raised-sm ring-1 ring-primary/40'
          : 'bg-neu-base text-on-surface-variant shadow-neu-pressed-sm'
      "
      data-testid="foundation-keystone"
    >
      <AppIcon :name="unlocked ? 'lock_open' : 'lock'" class="text-base" />
      <span>{{ keystoneLabel }}</span>
    </div>

    <!-- Pillars: one per group, filling toward its unlock line. -->
    <div class="flex items-end gap-2">
      <div
        v-for="pillar in pillars"
        :key="pillar.group"
        class="flex min-w-0 flex-1 flex-col items-center gap-1.5"
        :data-test-foundation-pillar="pillar.group"
      >
        <div
          class="relative h-24 w-full overflow-hidden rounded-xl bg-neu-base shadow-neu-pressed sm:h-28"
        >
          <!-- Fill -->
          <div
            class="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t transition-[height] duration-500 ease-out"
            :class="
              pillar.satisfied
                ? 'from-primary to-primary/70'
                : 'from-primary/45 to-primary/25'
            "
            :style="{ height: pillar.fillPct + '%' }"
          />
          <!-- Unlock line (the minimum needed for this group) -->
          <div
            class="absolute inset-x-1 border-t border-dashed transition-colors duration-500"
            :class="pillar.satisfied ? 'border-primary-strong/70' : 'border-on-surface-variant/40'"
            :style="{ bottom: pillar.linePct + '%' }"
          />
          <!-- Satisfied check -->
          <Transition name="fade">
            <span
              v-if="pillar.satisfied"
              class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neu-base text-primary shadow-neu-raised-sm"
            >
              <AppIcon name="check" class="text-sm" />
            </span>
          </Transition>
        </div>

        <p class="w-full truncate text-center text-[11px] font-medium leading-tight text-on-surface">
          {{ groupLabel(pillar.group) }}
        </p>
        <p class="text-[11px] tabular-nums text-on-surface-variant">
          {{ pillar.completed }}/{{ pillar.total }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type {
  FoundationGroup,
  FoundationGroupProgress,
} from '@/services/foundationCompleteness'

const props = defineProps<{
  groups: FoundationGroupProgress[]
  unlocked: boolean
}>()

const { t } = useT()

function clampPct(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, value))
}

const pillars = computed(() =>
  props.groups.map((g) => ({
    ...g,
    fillPct: g.total > 0 ? clampPct((g.completed / g.total) * 100) : 0,
    linePct: g.total > 0 ? clampPct((g.minRequired / g.total) * 100) : 0,
  })),
)

function groupLabel(group: FoundationGroup): string {
  return t(`profile.psychologicalProfile.foundation.groups.${group}`)
}

const satisfiedCount = computed(() => props.groups.filter((g) => g.satisfied).length)

const keystoneLabel = computed(() =>
  props.unlocked
    ? t('profile.psychologicalProfile.foundation.gauge.unlocked')
    : t('profile.psychologicalProfile.foundation.gauge.locked', {
        done: satisfiedCount.value,
        total: props.groups.length,
      }),
)

const ariaLabel = computed(() =>
  t('profile.psychologicalProfile.foundation.gauge.aria', {
    done: satisfiedCount.value,
    total: props.groups.length,
  }),
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
