<template>
  <!-- One plus for every object type. Hover opens the cascade (type → object);
       click pins it for keyboard use. Only types with candidates are listed. -->
  <div
    class="next-day-add"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false; activeGroup = null"
    @keydown.esc.stop="close"
    @focusout="onFocusOut"
  >
    <button
      type="button"
      class="next-day-rail__tool next-day-add__button"
      :aria-label="t('planning.today.actions.addToPlan')"
      :title="t('planning.today.actions.addToPlan')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :disabled="!groups.length"
      @click="pinned = !pinned"
    >
      <AppIcon name="add" />
    </button>
    <div v-if="isOpen" class="next-day-add__menu" role="menu" :aria-label="t('planning.today.actions.addToPlan')">
      <div class="next-day-add__types">
        <button
          v-for="group in groups"
          :key="group.id"
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="activeGroup === group.id"
          :class="{ 'is-active': activeGroup === group.id }"
          @mouseenter="activeGroup = group.id"
          @focus="activeGroup = group.id"
          @click="activeGroup = group.id"
        >
          <span>{{ group.label }}</span>
          <AppIcon name="chevron_right" />
        </button>
      </div>
      <div v-if="currentGroup" class="next-day-add__items" role="menu" :aria-label="currentGroup.label">
        <button
          v-for="candidate in currentGroup.items"
          :key="candidate.key"
          type="button"
          role="menuitem"
          :title="candidate.subject.title"
          @click="pick(candidate)"
        >
          <AppIcon :name="candidateIcon(candidate)" />
          <span>{{ candidate.subject.title }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TodayAddCandidate } from '@/services/todayViewQueries'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

export interface AddMenuGroup {
  id: string
  label: string
  items: TodayAddCandidate[]
}

const props = defineProps<{ groups: AddMenuGroup[] }>()
const emit = defineEmits<{ add: [candidate: TodayAddCandidate] }>()
const { t } = useT()

const hovering = ref(false)
const pinned = ref(false)
const activeGroup = ref<string | null>(null)
const isOpen = computed(() => (hovering.value || pinned.value) && props.groups.length > 0)
const currentGroup = computed(() => props.groups.find(group => group.id === activeGroup.value) ?? null)

const PANEL_TYPE_ICONS: Record<string, string> = { habit: 'loop', tracker: 'monitoring', keyResult: 'flag', weeklyIntention: 'target' }

function candidateIcon(candidate: TodayAddCandidate): string {
  const subject = candidate.subject as { icon?: string }
  return subject.icon || candidate.goalIcon || PANEL_TYPE_ICONS[candidate.subjectType] || 'circle'
}

function close() {
  pinned.value = false
  hovering.value = false
  activeGroup.value = null
}

function pick(candidate: TodayAddCandidate) {
  emit('add', candidate)
  close()
}

function onFocusOut(event: FocusEvent) {
  const wrap = event.currentTarget as HTMLElement
  if (!(event.relatedTarget instanceof Node) || !wrap.contains(event.relatedTarget)) pinned.value = false
}
</script>
