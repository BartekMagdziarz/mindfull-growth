<template>
  <div class="space-y-4" data-test-review-step>
    <!-- Top action bar -->
    <div class="flex items-start justify-between gap-2 flex-wrap">
      <p class="text-sm text-on-surface-variant min-w-0 flex-1">
        {{ t('profile.psychologicalProfile.wizard.review.subtitle') }}
      </p>
      <div class="flex items-center gap-2 shrink-0">
        <AppButton
          v-if="!wizard.editingAll.value"
          variant="text"
          data-test-edit-all
          @click="wizard.enterEditAllMode"
        >
          <AppIcon name="edit" class="text-base mr-1" />
          {{ t('profile.psychologicalProfile.wizard.review.editAll') }}
        </AppButton>
        <AppButton
          v-else
          variant="text"
          data-test-done-editing
          @click="wizard.exitEditAllMode"
        >
          <AppIcon name="check" class="text-base mr-1" />
          {{ t('profile.psychologicalProfile.wizard.review.doneEditing') }}
        </AppButton>
        <AppButton
          variant="text"
          data-test-regenerate
          @click="handleRegenerate"
        >
          <AppIcon name="refresh" class="text-base mr-1" />
          {{ t('profile.psychologicalProfile.wizard.review.regenerate') }}
        </AppButton>
      </div>
    </div>

    <!-- Sections -->
    <div class="space-y-3">
      <section
        v-for="sectionId in PROFILE_SECTION_IDS"
        :key="sectionId"
        class="neo-surface rounded-2xl p-4"
        :data-test-section="sectionId"
      >
        <header class="flex items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-semibold text-on-surface">
            {{ sectionTitle(sectionId) }}
          </h3>
          <button
            type="button"
            class="neo-icon-button neo-focus"
            :aria-label="
              wizard.editingPerSection[sectionId]
                ? t('common.buttons.done')
                : t('common.buttons.edit')
            "
            :data-test-toggle-section="sectionId"
            @click="wizard.toggleEditSection(sectionId)"
          >
            <AppIcon
              v-if="wizard.editingPerSection[sectionId]"
              name="check"
              class="text-base text-primary"
            />
            <AppIcon v-else name="edit" class="text-base text-on-surface-variant" />
          </button>
        </header>

        <textarea
          v-if="wizard.editingPerSection[sectionId]"
          :value="wizard.editedSections.value[sectionId]"
          :rows="textareaRows(wizard.editedSections.value[sectionId])"
          class="neo-input w-full p-3 text-sm resize-y"
          :placeholder="t('profile.psychologicalProfile.wizard.review.placeholder')"
          :data-test-textarea="sectionId"
          @input="onSectionInput(sectionId, $event)"
        />
        <p
          v-else-if="wizard.editedSections.value[sectionId] && wizard.editedSections.value[sectionId].trim().length > 0"
          class="text-sm text-on-surface whitespace-pre-wrap"
        >
          {{ wizard.editedSections.value[sectionId] }}
        </p>
        <p v-else class="text-sm text-on-surface-variant italic">
          {{ t('profile.psychologicalProfile.wizard.review.emptySection') }}
        </p>
      </section>

      <!-- Extras bucket (read-only) -->
      <section
        v-if="wizard.extras.value.trim().length > 0"
        class="neo-warning rounded-2xl p-4"
        data-test-extras
      >
        <header class="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <h3 class="text-sm font-semibold text-on-surface">
            {{ t('profile.psychologicalProfile.wizard.review.extrasTitle') }}
          </h3>
          <span class="text-xs text-on-surface-variant">
            {{ t('profile.psychologicalProfile.wizard.review.extrasHelp') }}
          </span>
        </header>
        <p class="text-sm text-on-surface whitespace-pre-wrap">
          {{ wizard.extras.value }}
        </p>
      </section>
    </div>

    <!-- Unsaved-edits badge -->
    <p
      v-if="wizard.hasUnsavedEdits.value"
      class="text-xs text-on-surface-variant text-center"
      data-test-unsaved-note
    >
      {{ t('profile.psychologicalProfile.wizard.review.unsavedNote') }}
    </p>

    <!-- Regenerate confirmation dialog -->
    <AppDialog
      v-model="showRegenConfirm"
      :title="t('profile.psychologicalProfile.wizard.review.regenDialog.title')"
      :message="t('profile.psychologicalProfile.wizard.review.regenDialog.message')"
      :confirm-text="t('profile.psychologicalProfile.wizard.review.regenDialog.confirm')"
      :cancel-text="t('common.buttons.cancel')"
      confirm-variant="filled"
      @confirm="confirmRegenerate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { useProfileBuildWizard } from '@/composables/useProfileBuildWizard'
import {
  PROFILE_SECTION_IDS,
  type ProfileSectionId,
} from '@/domain/userProfile'
import { useT } from '@/composables/useT'

const props = defineProps<{
  wizard: ReturnType<typeof useProfileBuildWizard>
}>()

const { t } = useT()
const showRegenConfirm = ref(false)

async function handleRegenerate(): Promise<void> {
  const res = await props.wizard.regenerate()
  if (res.confirmationNeeded) {
    showRegenConfirm.value = true
  }
}

async function confirmRegenerate(): Promise<void> {
  showRegenConfirm.value = false
  await props.wizard.regenerate({ force: true })
}

function sectionTitle(id: ProfileSectionId): string {
  return t(`profile.psychologicalProfile.sections.${id}`)
}

/**
 * Pragmatic auto-grow: pick `rows` from content length. No `ResizeObserver`
 * — the textarea is also `resize-y`, so the user can drag the corner if the
 * heuristic underestimates.
 */
function textareaRows(value: string | undefined): number {
  const len = value?.length ?? 0
  return Math.max(4, Math.ceil(len / 80))
}

function onSectionInput(id: ProfileSectionId, event: Event): void {
  const target = event.target as HTMLTextAreaElement | null
  if (!target) return
  props.wizard.setSectionValue(id, target.value)
}
</script>
