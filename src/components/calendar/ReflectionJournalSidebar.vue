<template>
  <div class="flex min-h-0 flex-col gap-4 lg:flex-row lg:gap-5">
    <!-- ======================= Writing area ======================= -->
    <div class="flex min-h-0 flex-1 flex-col gap-3">
      <!-- WritingCanvas -->
      <div
        class="relative flex min-h-[22rem] flex-1 flex-col rounded-2xl bg-neu-base px-6 py-5 shadow-neu-pressed"
      >
        <div v-if="weekRef" class="mb-3 flex items-center gap-2.5">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neu-top text-primary shadow-neu-raised-sm"
          >
            <AppIcon name="menu_book" class="text-base" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-xs font-semibold text-on-surface">
              {{ t('planning.reflection.sidebar.weekEntryHeading', { week: weekLabel }) }}
            </div>
            <div class="truncate text-[10px] text-on-surface-variant/80">
              {{ dateRangeLabel }}
            </div>
          </div>
          <div class="flex-1" />
          <div class="shrink-0 text-[10px] text-on-surface-variant/80">
            {{ wordCount }} {{ t('planning.reflection.sidebar.wordCount') }}
          </div>
        </div>

        <textarea
          ref="textareaRef"
          :value="modelValue"
          :placeholder="placeholder"
          class="flex-1 resize-none border-none bg-transparent text-sm leading-relaxed text-on-surface outline-none"
          style="font-family: inherit"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- ContextTags -->
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70"
        >
          {{ t('planning.reflection.sidebar.contextTagsLabel') }}
        </span>
        <button
          v-for="tag in contextTags"
          :key="tag.key"
          type="button"
          class="neo-focus neo-pill flex items-center gap-1 text-[11px]"
          @click="insertTag(tag.label)"
        >
          <AppIcon name="add" class="text-xs" />
          {{ tag.label }}
        </button>
      </div>
    </div>

    <!-- ======================= Side panel ======================= -->
    <div
      v-if="!collapsed"
      class="flex min-h-0 w-full shrink-0 flex-col lg:w-[380px]"
    >
      <div
        class="flex flex-1 flex-col gap-3.5 overflow-y-auto rounded-2xl bg-neu-top p-4 shadow-neu-raised-sm"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/80">
            {{ t('planning.reflection.sidebar.contextHeader') }}
          </span>
          <button
            type="button"
            class="neo-focus flex h-7 w-7 items-center justify-center rounded-full bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px hover:shadow-neu-raised"
            :aria-label="t('planning.reflection.sidebar.collapse')"
            @click="collapsed = true"
          >
            <AppIcon name="chevron_right" class="text-sm" />
          </button>
        </div>

        <!-- AI week summary (mock) — only available when an aiSummary v-model is bound -->
        <div
          v-if="props.aiSummary !== undefined"
          class="rounded-xl bg-neu-base p-3 shadow-neu-pressed-sm"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2"
            @click="aiSummaryOpen = !aiSummaryOpen"
          >
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary shadow-neu-raised-sm"
            >
              <AppIcon name="auto_awesome" class="text-xs" />
            </div>
            <span class="flex-1 text-left text-xs font-semibold text-on-surface">
              {{ t('planning.reflection.sidebar.aiSummary') }}
            </span>
            <AppIcon
              :name="aiSummaryOpen ? 'expand_less' : 'expand_more'"
              class="text-sm text-on-surface-variant"
            />
          </button>
          <div v-if="aiSummaryOpen" class="mt-3 flex flex-col gap-2">
            <template v-if="aiSummaryLoading">
              <div class="flex items-center gap-2 py-1 text-[11px] text-on-surface-variant">
                <AppIcon name="auto_awesome" class="animate-spin text-xs text-primary" />
                {{ t('planning.reflection.sidebar.aiSummaryLoading') }}
              </div>
            </template>
            <template v-else-if="hasAiSummary">
              <p class="text-[11px] leading-relaxed text-on-surface whitespace-pre-wrap">
                {{ props.aiSummary }}
              </p>
              <button
                type="button"
                class="neo-focus flex items-center justify-center gap-1 self-start rounded-lg bg-neu-top px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:text-on-surface hover:shadow-neu-raised active:translate-y-0 active:shadow-neu-pressed-sm"
                :title="t('planning.reflection.sidebar.aiSummaryClearTitle')"
                @click="clearAiSummary"
              >
                <AppIcon name="delete_sweep" class="text-xs" />
                {{ t('planning.reflection.sidebar.aiSummaryClear') }}
              </button>
            </template>
            <template v-else>
              <p class="text-[11px] leading-relaxed text-on-surface-variant">
                {{ t('planning.reflection.sidebar.aiSummaryHint') }}
              </p>
              <button
                type="button"
                class="neo-focus flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:shadow-neu-raised active:translate-y-0 active:shadow-neu-pressed-sm"
                @click="generateAiSummary"
              >
                <AppIcon name="auto_awesome" class="text-xs" />
                {{ t('planning.reflection.sidebar.aiGenerate') }}
              </button>
            </template>
          </div>
        </div>

        <!-- AI prompts (mock) -->
        <div class="rounded-xl bg-neu-base p-3 shadow-neu-pressed-sm">
          <div class="mb-2 flex items-center gap-1.5">
            <AppIcon name="auto_awesome" class="text-sm text-primary" />
            <span class="text-xs font-semibold text-on-surface">
              {{ t('planning.reflection.sidebar.aiPrompts') }}
            </span>
          </div>
          <template v-if="!aiPromptsGenerated && !aiPromptsLoading">
            <p class="mb-2 text-[11px] leading-relaxed text-on-surface-variant">
              {{ t('planning.reflection.sidebar.aiPromptsHint') }}
            </p>
            <button
              type="button"
              class="neo-focus flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:shadow-neu-raised active:translate-y-0 active:shadow-neu-pressed-sm"
              @click="generateAiPrompts"
            >
              <AppIcon name="auto_awesome" class="text-xs" />
              {{ t('planning.reflection.sidebar.aiPromptsGenerate') }}
            </button>
          </template>
          <template v-else-if="aiPromptsLoading">
            <div class="flex items-center gap-2 py-1 text-[11px] text-on-surface-variant">
              <AppIcon name="auto_awesome" class="animate-spin text-xs text-primary" />
              {{ t('planning.reflection.sidebar.aiPromptsLoading') }}
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col gap-1.5">
              <button
                v-for="(prompt, i) in aiMockPrompts"
                :key="i"
                type="button"
                class="neo-focus flex items-start gap-1.5 rounded-xl bg-neu-top px-3 py-2 text-left text-[11px] leading-snug text-on-surface-variant shadow-neu-raised-sm transition-all duration-150 hover:-translate-y-px hover:text-on-surface hover:shadow-neu-raised"
                @click="insertPrompt(prompt)"
              >
                <AppIcon name="add" class="mt-0.5 shrink-0 text-xs text-primary" />
                <span>{{ prompt }}</span>
              </button>
            </div>
          </template>
        </div>

        <!-- Context strips: Context / State / Evaluation -->
        <div
          v-for="group in ratingGroups"
          :key="group.title"
          class="rounded-xl bg-neu-base p-3 shadow-neu-pressed-sm"
        >
          <div class="mb-2">
            <span class="text-xs font-semibold text-on-surface">{{ group.title }}</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="item in group.items"
              :key="item.label"
              class="flex items-center gap-2"
            >
              <span class="min-w-0 flex-1 truncate text-[11px] text-on-surface-variant">
                {{ item.label }}
              </span>
              <div class="flex h-1.5 w-[100px] overflow-hidden rounded-full bg-neu-top shadow-neu-pressed-sm">
                <div
                  v-if="item.value !== null"
                  class="h-full rounded-full bg-primary"
                  :style="{ width: `${(item.value / 5) * 100}%` }"
                />
              </div>
              <span class="min-w-[28px] shrink-0 text-right text-[10px] font-semibold tabular-nums text-on-surface-variant">
                <template v-if="item.value !== null">
                  {{ item.value }}<span class="text-on-surface-variant/60">/5</span>
                </template>
                <template v-else>—</template>
              </span>
            </div>
          </div>
        </div>

        <!-- Emotion snapshot -->
        <div v-if="dataBundle" class="rounded-xl bg-neu-base p-3 shadow-neu-pressed-sm">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-semibold text-on-surface">
              {{ t('planning.reflection.sidebar.emotionsTitle') }}
            </span>
            <span class="text-[10px] text-on-surface-variant/80">
              {{ totalEmotionLogs }}× · {{ pleasantPct }}% {{ t('planning.reflection.sidebar.pleasant') }}
            </span>
          </div>
          <div class="mb-2 grid grid-cols-2 gap-1">
            <div
              v-for="q in quadrantTiles"
              :key="q.key"
              class="rounded-lg px-2.5 py-2 shadow-neu-raised-sm"
              :style="getQuadrantSurfaceStyle(q.key)"
            >
              <div class="text-sm font-semibold">
                {{ totalEmotionQuadrants[q.key] }}
              </div>
              <div class="text-[10px] opacity-80">
                {{ t(q.labelKey) }}
              </div>
            </div>
          </div>
          <div v-if="topEmotions.length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="emotion in topEmotions"
              :key="emotion.emotionId"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              :style="getQuadrantChipStyle(emotion.quadrant)"
            >
              {{ emotion.name }}
              <span class="font-semibold">×{{ emotion.count }}</span>
            </span>
          </div>
        </div>

        <!-- Anchors -->
        <div
          v-if="visibleAnchorCategories.length > 0"
          class="rounded-xl bg-neu-base p-3 shadow-neu-pressed-sm"
        >
          <div class="mb-2 text-xs font-semibold text-on-surface">
            {{ t('planning.reflection.sidebar.anchors') }}
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="cat in visibleAnchorCategories"
              :key="cat.key"
              class="rounded-lg bg-neu-top p-2 shadow-neu-pressed-sm"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 text-left"
                @click="toggleAnchorCategory(cat.key)"
              >
                <div
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-neu-base text-primary shadow-neu-raised-sm"
                >
                  <AppIcon :name="cat.icon" class="text-xs" />
                </div>
                <span class="flex-1 truncate text-[11px] font-medium text-on-surface">
                  {{ cat.label }}
                </span>
                <span class="text-[10px] font-semibold text-on-surface-variant/80">
                  {{ getAnchorLines(cat.key).length }}
                </span>
                <AppIcon
                  :name="anchorCategoryOpen[cat.key] !== false ? 'expand_less' : 'expand_more'"
                  class="text-xs text-on-surface-variant"
                />
              </button>
              <ul
                v-if="anchorCategoryOpen[cat.key] !== false"
                class="mt-1.5 space-y-1 pl-7"
              >
                <li
                  v-for="(line, idx) in getAnchorLines(cat.key)"
                  :key="idx"
                  class="relative text-[11px] leading-snug text-on-surface-variant"
                >
                  <span
                    class="absolute -left-3 top-1.5 h-1 w-1 rounded-full bg-primary"
                  />
                  {{ line }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="neo-focus flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px hover:shadow-neu-raised"
      :aria-label="t('planning.reflection.sidebar.expand')"
      @click="collapsed = false"
    >
      <AppIcon name="chevron_left" class="text-sm" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { getPeriodBounds } from '@/utils/periods'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrantChipStyle, getQuadrantSurfaceStyle } from '@/domain/emotion'
import type { WeekRef } from '@/domain/period'
import type { WeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'

const { t } = useT()

export interface SidebarRatingGroup {
  title: string
  items: Array<{ label: string; value: number | null }>
}

// `dataBundle` and `weekRef` are optional so this component can still back
// the monthly reflection wizard (which passes neither and gets a simpler
// panel without the weekly header or emotion snapshot).
const props = defineProps<{
  modelValue: string
  placeholder: string
  anchors: Record<string, string>
  anchorCategories: Array<{ key: string; label: string; icon: string }>
  ratingGroups: SidebarRatingGroup[]
  dataBundle?: WeeklyReflectionDataBundle | null
  weekRef?: WeekRef
  /**
   * Persisted AI summary. When undefined, the AI summary card is hidden
   * (e.g. monthly wizard does not use it). Empty string means "no summary
   * yet — show the generate button."
   */
  aiSummary?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:aiSummary': [value: string]
}>()

// ---------------------------------------------------------------------------
// Refs & layout state
// ---------------------------------------------------------------------------

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const collapsed = ref(false)

const aiSummaryOpen = ref(true)
const aiSummaryLoading = ref(false)

const hasAiSummary = computed(
  () => typeof props.aiSummary === 'string' && props.aiSummary.trim().length > 0,
)

const aiPromptsGenerated = ref(false)
const aiPromptsLoading = ref(false)

const anchorCategoryOpen = reactive<Record<string, boolean>>({})

// ---------------------------------------------------------------------------
// Header / stats
// ---------------------------------------------------------------------------

const weekLabel = computed(() => {
  if (!props.weekRef) return ''
  // WeekRef format: "2026-W15"
  const match = /W(\d+)/.exec(props.weekRef)
  return match ? `W${match[1]}` : props.weekRef
})

const dateRangeLabel = computed(() => {
  if (!props.weekRef) return ''
  const bounds = getPeriodBounds(props.weekRef)
  const start = new Date(bounds.start + 'T12:00:00')
  const end = new Date(bounds.end + 'T12:00:00')
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()
  const startFmt: Intl.DateTimeFormatOptions = sameMonth
    ? { day: 'numeric' }
    : sameYear
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  const endFmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  return `${start.toLocaleDateString(undefined, startFmt)} – ${end.toLocaleDateString(undefined, endFmt)}`
})

const wordCount = computed(() => {
  return props.modelValue.trim().split(/\s+/).filter(Boolean).length
})

// ---------------------------------------------------------------------------
// Context tags (quick-insert)
// ---------------------------------------------------------------------------

const contextTags = computed(() => [
  { key: 'gratitude', label: t('planning.reflection.sidebar.contextTags.gratitude') },
  { key: 'keyMoment', label: t('planning.reflection.sidebar.contextTags.keyMoment') },
  { key: 'challenge', label: t('planning.reflection.sidebar.contextTags.challenge') },
  { key: 'lesson', label: t('planning.reflection.sidebar.contextTags.lesson') },
  { key: 'intention', label: t('planning.reflection.sidebar.contextTags.intention') },
])

function insertTag(label: string) {
  const suffix = props.modelValue.endsWith('\n') || props.modelValue === '' ? '' : '\n\n'
  const prefix = props.modelValue === '' ? '' : suffix
  emit('update:modelValue', `${props.modelValue}${prefix}${label}: `)
  // Focus the textarea so the user can keep typing
  requestAnimationFrame(() => {
    textareaRef.value?.focus()
    const el = textareaRef.value
    if (el) {
      el.selectionStart = el.selectionEnd = el.value.length
    }
  })
}

function insertPrompt(prompt: string) {
  const suffix = props.modelValue.endsWith('\n') || props.modelValue === '' ? '' : '\n\n'
  const prefix = props.modelValue === '' ? '' : suffix
  emit('update:modelValue', `${props.modelValue}${prefix}${prompt}\n`)
  requestAnimationFrame(() => {
    textareaRef.value?.focus()
    const el = textareaRef.value
    if (el) {
      el.selectionStart = el.selectionEnd = el.value.length
    }
  })
}

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

const visibleAnchorCategories = computed(() =>
  props.anchorCategories.filter((cat) => (props.anchors[cat.key] ?? '').trim().length > 0),
)

function getAnchorLines(key: string): string[] {
  const text = props.anchors[key] ?? ''
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
}

function toggleAnchorCategory(key: string) {
  // default open (undefined treated as true)
  anchorCategoryOpen[key] = !(anchorCategoryOpen[key] !== false)
}

// ---------------------------------------------------------------------------
// Emotions snapshot
// ---------------------------------------------------------------------------

const totalEmotionQuadrants = computed<Record<Quadrant, number>>(() => {
  return (
    props.dataBundle?.emotionSummary.quadrantDistribution ?? {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
  )
})

const totalEmotionLogs = computed(() => props.dataBundle?.emotionSummary.totalLogs ?? 0)

const pleasantPct = computed(() => {
  const counts = totalEmotionQuadrants.value
  const total =
    counts['high-energy-high-pleasantness'] +
    counts['high-energy-low-pleasantness'] +
    counts['low-energy-high-pleasantness'] +
    counts['low-energy-low-pleasantness']
  if (total === 0) return 0
  const pleasant =
    counts['high-energy-high-pleasantness'] + counts['low-energy-high-pleasantness']
  return Math.round((pleasant / total) * 100)
})

const topEmotions = computed(() =>
  (props.dataBundle?.emotionSummary.topEmotions ?? []).slice(0, 4),
)

const quadrantTiles: { key: Quadrant; labelKey: string }[] = [
  {
    key: 'high-energy-low-pleasantness',
    labelKey: 'planning.reflection.sidebar.quadrants.highEnergyLowPleasantness',
  },
  {
    key: 'high-energy-high-pleasantness',
    labelKey: 'planning.reflection.sidebar.quadrants.highEnergyHighPleasantness',
  },
  {
    key: 'low-energy-low-pleasantness',
    labelKey: 'planning.reflection.sidebar.quadrants.lowEnergyLowPleasantness',
  },
  {
    key: 'low-energy-high-pleasantness',
    labelKey: 'planning.reflection.sidebar.quadrants.lowEnergyHighPleasantness',
  },
]

// ---------------------------------------------------------------------------
// Mock AI content
// ---------------------------------------------------------------------------

// Locale files store these as pipe-separated strings because useT()
// resolves only string keys (object/array values can't be translated).
const aiMockPrompts = computed<string[]>(() =>
  t('planning.reflection.sidebar.aiPromptsMock')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean),
)

function generateAiSummary() {
  if (aiSummaryLoading.value || hasAiSummary.value) return
  aiSummaryLoading.value = true
  // NOTE: Intentionally NOT calling the backend — mock body comes from i18n.
  // The resolved string is emitted up so the wizard can persist it with the reflection.
  setTimeout(() => {
    aiSummaryLoading.value = false
    emit('update:aiSummary', t('planning.reflection.sidebar.aiSummaryMockBody'))
  }, 1200)
}

function clearAiSummary() {
  emit('update:aiSummary', '')
}

function generateAiPrompts() {
  if (aiPromptsLoading.value || aiPromptsGenerated.value) return
  aiPromptsLoading.value = true
  // NOTE: Intentionally NOT calling the backend — user will wire real AI in a separate session.
  setTimeout(() => {
    aiPromptsLoading.value = false
    aiPromptsGenerated.value = true
  }, 1200)
}
</script>
