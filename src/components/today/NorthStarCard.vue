<template>
  <AppCard class="neo-raised w-full overflow-hidden">
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            {{ t('today.northStar.title') }}
          </p>

          <div class="mt-4 space-y-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                {{ weekHeading }}
              </p>
              <p class="mt-1 text-2xl font-semibold leading-tight text-on-surface md:text-[2rem]">
                {{ primaryLine }}
              </p>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="neo-surface rounded-2xl px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {{ monthHeading }}
                </p>
                <p class="mt-1 text-sm leading-relaxed text-on-surface">
                  {{ secondaryLine }}
                </p>
              </div>

              <div class="neo-surface rounded-2xl px-4 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {{ yearHeading }}
                </p>
                <p class="mt-1 text-sm leading-relaxed text-on-surface">
                  {{ tertiaryLine }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:max-w-[16rem] lg:justify-end">
          <span
            v-if="dueReflectionCount > 0"
            class="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
          >
            {{ t('today.northStar.reflectionsDue', { count: dueReflectionCount }) }}
          </span>
          <AppButton variant="tonal" class="px-4 py-2 text-sm" @click="emit('openPlanning')">
            {{ t('today.northStar.openPlanning') }}
          </AppButton>
        </div>
      </div>

      <div v-if="visibleChains.length > 0" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-on-surface">{{ t('today.northStar.focusChains') }}</p>
          <button
            v-if="overflowCount > 0"
            type="button"
            class="neo-pill neo-focus px-3 py-1 text-xs font-medium"
            @click="isExpanded = !isExpanded"
          >
            {{
              isExpanded
                ? t('today.northStar.showLess')
                : t('today.northStar.showMore', { count: overflowCount })
            }}
          </button>
        </div>

        <div class="grid gap-3 xl:grid-cols-2">
          <article
            v-for="chain in visibleChains"
            :key="chain.id"
            class="neo-surface rounded-[24px] px-4 py-4"
          >
            <div class="flex items-start gap-3">
              <EntityIcon
                :icon="chain.lifeArea?.icon"
                :color="chain.lifeArea?.color"
                size="md"
                :title="chain.lifeArea?.name"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    v-if="chain.lifeArea"
                    class="inline-flex items-center rounded-full border border-neu-border/25 bg-background/45 px-2.5 py-1 text-[11px] font-medium text-on-surface-variant"
                  >
                    {{ chain.lifeArea.name }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full border border-neu-border/25 bg-section/70 px-2.5 py-1 text-[11px] font-medium text-on-surface-variant"
                  >
                    {{ sourceLabel(chain.source) }}
                  </span>
                </div>

                <p class="mt-3 text-base font-semibold leading-snug text-on-surface">
                  {{ chain.priority.name }}
                </p>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                  <template v-if="chain.projects.length > 0">
                    <span class="font-medium text-on-surface-variant">{{ t('today.northStar.projects') }}</span>
                    <span
                      v-for="project in chain.projects"
                      :key="project.id"
                      class="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-on-surface"
                    >
                      {{ project.name }}
                    </span>
                  </template>
                  <span v-else class="text-on-surface-variant">
                    {{ t('today.northStar.priorityOnly') }}
                  </span>
                </div>

                <div
                  v-if="chain.commitmentTotal > 0"
                  class="mt-3 inline-flex items-center rounded-full border border-neu-border/20 bg-background/45 px-3 py-1 text-xs text-on-surface-variant"
                >
                  {{
                    t('today.northStar.commitmentProgress', {
                      done: chain.commitmentDone,
                      total: chain.commitmentTotal,
                    })
                  }}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div
        v-else
        class="neo-surface rounded-[24px] px-5 py-5 text-sm text-on-surface-variant"
      >
        <p>{{ t('today.northStar.empty') }}</p>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EntityIcon from '@/components/planning/EntityIcon.vue'
import { useT } from '@/composables/useT'
import type { TodayFocusChain } from '@/types/today'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    yearLabel?: string
    yearTheme?: string
    monthLabel?: string
    monthIntention?: string
    weekLabel?: string
    weekFocusSentence?: string
    focusChains: TodayFocusChain[]
    dueReflectionCount?: number
  }>(),
  {
    yearLabel: '',
    yearTheme: '',
    monthLabel: '',
    monthIntention: '',
    weekLabel: '',
    weekFocusSentence: '',
    dueReflectionCount: 0,
  },
)

const emit = defineEmits<{
  openPlanning: []
}>()

const isExpanded = ref(false)

const weekHeading = computed(() => props.weekLabel || t('today.northStar.weekFallback'))
const monthHeading = computed(() => props.monthLabel || t('today.northStar.monthFallback'))
const yearHeading = computed(() => props.yearLabel || t('today.northStar.yearFallback'))

const primaryLine = computed(() => props.weekFocusSentence || t('today.northStar.noWeekFocus'))
const secondaryLine = computed(() => props.monthIntention || t('today.northStar.noMonthIntention'))
const tertiaryLine = computed(() => props.yearTheme || t('today.northStar.noYearTheme'))

const visibleChains = computed(() =>
  isExpanded.value ? props.focusChains : props.focusChains.slice(0, 3),
)

const overflowCount = computed(() => Math.max(props.focusChains.length - 3, 0))

function sourceLabel(source: TodayFocusChain['source']) {
  if (source === 'weekly-project') return t('today.northStar.sources.weekly')
  if (source === 'monthly-project') return t('today.northStar.sources.monthly')
  return t('today.northStar.sources.priority')
}
</script>
