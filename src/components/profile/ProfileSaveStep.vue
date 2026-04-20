<template>
  <div class="space-y-4" data-test-save-step>
    <!-- Header -->
    <div>
      <h2 class="text-lg font-semibold text-on-surface">
        {{ t('profile.psychologicalProfile.wizard.save.title') }}
      </h2>
      <p class="text-sm text-on-surface-variant mt-1">
        {{ t('profile.psychologicalProfile.wizard.save.subtitle') }}
      </p>
    </div>

    <!-- Summary card -->
    <AppCard padding="md" variant="raised" data-test-save-summary>
      <dl class="space-y-2 text-sm">
        <div class="flex items-start justify-between gap-4">
          <dt class="text-on-surface-variant shrink-0">
            {{ t('profile.psychologicalProfile.wizard.save.summary.dateRange') }}
          </dt>
          <dd
            class="text-on-surface text-right"
            data-test-summary-date-range
          >
            {{ dateRangeLabel }}
          </dd>
        </div>
        <div class="flex items-start justify-between gap-4">
          <dt class="text-on-surface-variant shrink-0">
            {{ t('profile.psychologicalProfile.wizard.save.summary.dataTypes') }}
          </dt>
          <dd
            class="text-on-surface text-right"
            data-test-summary-data-types
          >
            {{ dataTypesLabel }}
          </dd>
        </div>
        <div class="flex items-start justify-between gap-4">
          <dt class="text-on-surface-variant shrink-0">
            {{ t('profile.psychologicalProfile.wizard.save.summary.totalItems') }}
          </dt>
          <dd
            class="text-on-surface text-right"
            data-test-summary-total-items
          >
            {{ totalItems }}
          </dd>
        </div>
        <div class="flex items-start justify-between gap-4">
          <dt class="text-on-surface-variant shrink-0">
            {{ t('profile.psychologicalProfile.wizard.save.summary.model') }}
          </dt>
          <dd class="text-on-surface text-right" data-test-summary-model>
            {{ wizard.generatedModel.value || '—' }}
          </dd>
        </div>
        <div
          v-if="wizard.hasUnsavedEdits.value"
          class="flex items-start justify-between gap-4"
          data-test-summary-edits
        >
          <dt class="text-on-surface-variant shrink-0">
            {{ t('profile.psychologicalProfile.wizard.save.summary.edits') }}
          </dt>
          <dd class="text-on-surface text-right">
            {{ t('profile.psychologicalProfile.wizard.save.summary.editsPresent') }}
          </dd>
        </div>
      </dl>
    </AppCard>

    <!-- Note input -->
    <div>
      <label
        class="block text-xs text-on-surface-variant mb-1"
        for="profile-save-note"
      >
        {{ t('profile.psychologicalProfile.wizard.save.note.label') }}
      </label>
      <input
        id="profile-save-note"
        type="text"
        class="neo-input w-full p-3 text-sm"
        :placeholder="t('profile.psychologicalProfile.wizard.save.note.placeholder')"
        :value="wizard.note.value"
        :maxlength="120"
        data-test-save-note
        @input="onNoteInput"
      />
      <p class="text-xs text-on-surface-variant mt-1">
        {{ t('profile.psychologicalProfile.wizard.save.note.help') }}
      </p>
    </div>

    <!-- Revert edits shortcut -->
    <div
      v-if="wizard.hasUnsavedEdits.value"
      class="flex items-center justify-end"
    >
      <AppButton
        variant="text"
        data-test-revert-edits
        @click="wizard.revertEdits"
      >
        {{ t('profile.psychologicalProfile.wizard.save.revertEdits') }}
      </AppButton>
    </div>

    <!-- Error banner -->
    <div
      v-if="wizard.saveError.value"
      class="neo-warning p-3 rounded-2xl"
      data-test-save-error
    >
      <p class="text-sm text-on-surface">{{ wizard.saveError.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import type { useProfileBuildWizard } from '@/composables/useProfileBuildWizard'
import { useT } from '@/composables/useT'

const props = defineProps<{
  wizard: ReturnType<typeof useProfileBuildWizard>
}>()

const { t } = useT()

const totalItems = computed(() =>
  Object.values(props.wizard.previewCountsByType.value).reduce(
    (sum, n) => sum + (n ?? 0),
    0,
  ),
)

const dataTypesLabel = computed(() => {
  const titles = props.wizard.dataTypes.value.map((d) =>
    t(`profile.psychologicalProfile.wizard.scope.types.${d}.title`),
  )
  return titles.length > 0 ? titles.join(', ') : '—'
})

const dateRangeLabel = computed(() => {
  const range = props.wizard.dateRange.value
  if (range.kind === 'preset') {
    return t(
      `profile.psychologicalProfile.wizard.scope.dateRange.presets.${range.preset}`,
    )
  }
  // Custom range — slice the ISO date strings to YYYY-MM-DD for display.
  const start = range.start ? range.start.slice(0, 10) : '?'
  const end = range.end ? range.end.slice(0, 10) : '?'
  return `${start} — ${end}`
})

function onNoteInput(event: Event): void {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  props.wizard.note.value = target.value
}
</script>
