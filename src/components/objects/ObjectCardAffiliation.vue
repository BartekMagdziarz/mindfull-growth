<template>
  <div class="mg-v2-glyph-row" role="group" :aria-label="groupLabel">
    <button
      v-for="glyph in visiblePriorities"
      :key="glyph.key"
      type="button"
      class="mg-v2-glyph mg-v2-glyph--pencil"
      :aria-label="glyph.label"
      @click.stop="$emit('open', 'priority')"
    >
      <EntityIcon :icon="glyph.icon" size="xs" :circle="false" />
      <span class="mg-v2-glyph__name">{{ glyph.label }}</span>
    </button>

    <span v-if="hasSeparator" class="mg-v2-glyph-row__sep" aria-hidden="true" />

    <button
      v-for="glyph in visibleLifeAreas"
      :key="glyph.key"
      type="button"
      class="mg-v2-glyph"
      :aria-label="glyph.label"
      @click.stop="$emit('open', 'lifeArea')"
    >
      <EntityIcon :icon="glyph.icon" size="xs" :circle="false" />
      <span class="mg-v2-glyph__name">{{ glyph.label }}</span>
    </button>

    <button
      v-if="overflow.length > 0"
      type="button"
      class="mg-v2-glyph mg-v2-glyph--pencil"
      :aria-label="overflow.map((glyph) => glyph.label).join(', ')"
      @click.stop="$emit('open', null)"
    >
      <span class="px-0.5 text-[10px] font-extrabold tabular-nums">+{{ overflow.length }}</span>
      <span class="mg-v2-glyph__name">{{ overflow.map((glyph) => glyph.label).join(' · ') }}</span>
    </button>

    <button
      v-if="visibleGlyphs.length === 0 && overflow.length === 0 && emptyLabel"
      type="button"
      class="mg-v2-glyph mg-v2-glyph--pencil mg-v2-glyph--empty"
      :aria-label="emptyLabel"
      @click.stop="$emit('open', null)"
    >
      <AppIcon name="add" class="text-xs" />
      <span class="mg-v2-glyph__name">{{ emptyLabel }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

export type AffiliationKind = 'priority' | 'lifeArea'

interface Glyph {
  key: string
  kind: AffiliationKind
  label: string
  icon: string
}

const props = withDefaults(
  defineProps<{
    priorityIds: string[]
    lifeAreaIds: string[]
    priorityOptions: ObjectsLibraryFilterOption[]
    lifeAreaOptions: ObjectsLibraryFilterOption[]
    groupLabel: string
    /** Shown as a dashed "+" glyph when nothing is linked; omit to render nothing. */
    emptyLabel?: string
    maxGlyphs?: number
  }>(),
  { emptyLabel: undefined, maxGlyphs: 4 },
)

defineEmits<{ open: [kind: AffiliationKind | null] }>()

// Only ids that resolve to a (currently active) option are drawn — the
// options list is the same one the pickers use, so the glyphs and the
// editor always agree.
const glyphs = computed<Glyph[]>(() => {
  const priorities = props.priorityOptions
    .filter((option) => props.priorityIds.includes(option.id))
    .map<Glyph>((option) => ({
      key: `priority:${option.id}`,
      kind: 'priority',
      label: option.label,
      icon: option.icon ?? 'flag',
    }))
  const lifeAreas = props.lifeAreaOptions
    .filter((option) => props.lifeAreaIds.includes(option.id))
    .map<Glyph>((option) => ({
      key: `lifeArea:${option.id}`,
      kind: 'lifeArea',
      label: option.label,
      icon: option.icon ?? 'category',
    }))
  return [...priorities, ...lifeAreas]
})

const visibleGlyphs = computed(() =>
  glyphs.value.length > props.maxGlyphs ? glyphs.value.slice(0, props.maxGlyphs - 1) : glyphs.value,
)
const overflow = computed(() =>
  glyphs.value.length > props.maxGlyphs ? glyphs.value.slice(props.maxGlyphs - 1) : [],
)

const visiblePriorities = computed(() => visibleGlyphs.value.filter((glyph) => glyph.kind === 'priority'))
const visibleLifeAreas = computed(() => visibleGlyphs.value.filter((glyph) => glyph.kind === 'lifeArea'))

const hasSeparator = computed(
  () => visiblePriorities.value.length > 0 && visibleLifeAreas.value.length > 0,
)
</script>
