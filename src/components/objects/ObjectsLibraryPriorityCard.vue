<template>
  <article
    class="group/card neo-card neo-raised border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3.5"
  >
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          aria-label="Priority icon"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          :value="item.title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.priorityTitlePlaceholder')"
          @input="handleTitleInput"
        />
        <div class="-mr-10 flex shrink-0 items-center gap-1.5 opacity-0 transition-all duration-200 ease-in-out group-hover/card:mr-0 group-hover/card:opacity-100">
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="neo-icon-button neo-focus"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleArchive"
              >
                {{ item.status === 'active' ? t('planning.objects.actions.pause') : t('planning.objects.actions.activate') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
                @click="handleDelete"
              >
                {{ t('common.buttons.delete') }}
              </button>
            </div>
          </div>
        </div>
        <StatusIconButton
          :model-value="item.status"
          :options="statusOptions"
          @update:model-value="emitFieldChange('status', $event)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <PriorityYearsDropdown
          :linked-years="linkedYears"
          @link-year="$emit('link-year', item.id, $event)"
          @unlink-year="$emit('unlink-year', item.id, $event)"
        />

        <div ref="linksRef" class="relative">
          <button
            type="button"
            class="neo-icon-button neo-focus"
            :title="t('planning.objects.form.lifeAreas')"
            :aria-label="t('planning.objects.form.lifeAreas')"
            @click.stop="linksOpen = !linksOpen"
          >
            <AppIcon name="link" class="text-base" />
          </button>
          <span
            v-if="(item.lifeAreaIds ?? []).length > 0"
            class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-on-primary"
          >
            {{ item.lifeAreaIds?.length }}
          </span>
          <div
            v-if="linksOpen"
            class="absolute left-0 z-20 mt-1 max-h-56 min-w-[190px] overflow-y-auto rounded-xl border border-outline/30 bg-surface p-1 shadow-lg"
            @click.stop
          >
            <button
              v-for="option in lifeAreaOptions"
              :key="option.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium text-on-surface hover:bg-primary-soft/30"
              @click="emitFieldChange('toggleLifeArea', option.id)"
            >
              <AppIcon v-if="item.lifeAreaIds?.includes(option.id)" name="check" class="text-xs text-primary" />
              <span v-else class="h-3 w-3" />
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            </button>
            <div v-if="lifeAreaOptions.length === 0" class="px-3 py-2 text-xs text-on-surface-variant">
              {{ t('planning.objects.filters.noOptions') }}
            </div>
          </div>
        </div>

        <span
          v-if="item.order"
          class="neo-pill px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant"
        >
          #{{ item.order }}
        </span>
      </div>

      <textarea
        :value="item.whyNow ?? ''"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.whyNow')"
        @input="handleTextInput('whyNow', $event)"
      />

      <textarea
        :value="item.desiredDirection ?? ''"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.desiredDirection')"
        @input="handleTextInput('desiredDirection', $event)"
      />

      <textarea
        :value="item.tradeoffs ?? ''"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.tradeoffs')"
        @input="handleTextInput('tradeoffs', $event)"
      />

      <textarea
        :value="signalsText(item.progressSignals)"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.progressSignals')"
        @change="emitFieldChange('progressSignals', ($event.target as HTMLTextAreaElement).value)"
      />

      <textarea
        :value="signalsText(item.riskSignals)"
        rows="4"
        class="neo-input min-h-[7rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
        :placeholder="t('planning.objects.form.riskSignals')"
        @change="emitFieldChange('riskSignals', ($event.target as HTMLTextAreaElement).value)"
      />

      <section v-if="item.status === 'closed'" class="space-y-2 rounded-xl border border-white/45 bg-white/35 p-2.5">
        <input
          :value="item.closingReflection?.closedAt ?? ''"
          type="text"
          class="neo-input w-full px-3 py-2 text-xs"
          :placeholder="t('planning.objects.form.closedAt')"
          @change="emitFieldChange('closingReflection.closedAt', ($event.target as HTMLInputElement).value)"
        />
        <textarea
          :value="item.closingReflection?.summary ?? ''"
          rows="2"
          class="neo-input min-h-[4.25rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
          :placeholder="t('planning.objects.form.closingSummary')"
          @input="handleTextInput('closingReflection.summary', $event)"
        />
        <div class="grid gap-2 sm:grid-cols-3">
          <textarea
            :value="item.closingReflection?.workedWell ?? ''"
            rows="3"
            class="neo-input min-h-[5.5rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
            :placeholder="t('planning.objects.form.workedWell')"
            @input="handleTextInput('closingReflection.workedWell', $event)"
          />
          <textarea
            :value="item.closingReflection?.wasDifficult ?? ''"
            rows="3"
            class="neo-input min-h-[5.5rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
            :placeholder="t('planning.objects.form.wasDifficult')"
            @input="handleTextInput('closingReflection.wasDifficult', $event)"
          />
          <textarea
            :value="item.closingReflection?.learned ?? ''"
            rows="3"
            class="neo-input min-h-[5.5rem] w-full resize-none px-3 py-2 text-xs leading-relaxed"
            :placeholder="t('planning.objects.form.learned')"
            @input="handleTextInput('closingReflection.learned', $event)"
          />
        </div>
      </section>

      <div v-if="item.linkedCounts" class="grid grid-cols-4 gap-1.5">
        <div
          v-for="metric in linkedMetrics"
          :key="metric.label"
          class="rounded-xl border border-white/45 bg-white/40 px-2 py-1.5 text-center"
        >
          <div class="text-sm font-semibold tabular-nums text-on-surface">{{ metric.value }}</div>
          <div class="truncate text-[9px] font-medium uppercase text-on-surface-variant">{{ metric.label }}</div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import PriorityYearsDropdown from '@/components/objects/PriorityYearsDropdown.vue'
import type { LinkedYear } from '@/components/objects/PriorityYearsDropdown.vue'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryFilterOption, ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  item: ObjectsLibraryListItem
  statusOptions: Array<{ value: string; label: string }>
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  isNew?: boolean
}>()

const emit = defineEmits<{
  'field-change': [id: string, field: string, value: unknown]
  'link-year': [id: string, yearRef: string]
  'unlink-year': [id: string, yearRef: string]
  archive: [id: string, isCurrentlyActive: boolean]
  delete: [id: string, title: string]
}>()

const { t } = useT()
const titleRef = ref<HTMLInputElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const linksRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const linksOpen = ref(false)

let titleDebounceTimer: ReturnType<typeof setTimeout> | undefined
let textDebounceTimer: ReturnType<typeof setTimeout> | undefined

const linkedYears = computed<LinkedYear[]>(() =>
  (props.item.years ?? []).map((year) => ({ yearRef: year, displayLabel: year })),
)

const linkedMetrics = computed(() => [
  { label: t('planning.objects.families.goals'), value: props.item.linkedCounts?.goals ?? 0 },
  { label: t('planning.objects.families.habits'), value: props.item.linkedCounts?.habits ?? 0 },
  { label: t('planning.objects.families.trackers'), value: props.item.linkedCounts?.trackers ?? 0 },
  { label: t('planning.objects.families.initiatives'), value: props.item.linkedCounts?.initiatives ?? 0 },
])

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

function handleTitleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  clearTimeout(titleDebounceTimer)
  titleDebounceTimer = setTimeout(() => {
    emitFieldChange('title', value)
  }, 400)
}

function handleTextInput(field: string, event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value
  clearTimeout(textDebounceTimer)
  textDebounceTimer = setTimeout(() => {
    emitFieldChange(field, value)
  }, 500)
}

function signalsText(signals: string[] | undefined): string {
  return (signals ?? []).join('\n')
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.status === 'active')
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  const target = event.target as Node
  if (menuRef.value && !menuRef.value.contains(target)) {
    menuOpen.value = false
  }
  if (linksRef.value && !linksRef.value.contains(target)) {
    linksOpen.value = false
  }
}

watch(
  () => props.isNew,
  (isNew) => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
  clearTimeout(titleDebounceTimer)
  clearTimeout(textDebounceTimer)
})
</script>
