<template>
  <section v-if="pendingLinks.length" class="mg-v2-surface mg-v2-surface--inset space-y-3 p-4 text-left">
    <div>
      <p class="flex items-center gap-2 text-sm font-semibold text-on-surface">
        {{ t('planning.priorityRitual.drafts.title') }}
        <span class="mg-v2-badge">{{ pendingLinks.length }}</span>
      </p>
      <p class="text-xs text-on-surface-variant">{{ t('planning.priorityRitual.drafts.hint') }}</p>
    </div>

    <ul class="space-y-2">
      <li
        v-for="link in pendingLinks"
        :key="link.id"
        class="mg-v2-surface mg-v2-surface--flat flex flex-wrap items-center gap-2 p-3"
      >
        <AppIcon :name="proposalIcon(link.proposal?.objectType)" class="text-base text-on-surface-variant" />
        <span class="min-w-0 flex-1">
          <span class="block text-xs text-on-surface-variant">{{ proposalTypeLabel(link.proposal?.objectType) }}</span>
          <span class="block truncate text-sm font-medium text-on-surface">{{ link.proposal?.title }}</span>
        </span>
        <button
          type="button"
          class="mg-v2-button text-xs"
          :disabled="busyId === link.id"
          @click="handleFinish(link)"
        >
          <AppIcon name="check_circle" class="text-sm" />
          {{ busyId === link.id ? t('planning.priorityRitual.drafts.creating') : t('planning.priorityRitual.drafts.finish') }}
        </button>
        <button
          type="button"
          class="mg-v2-button mg-v2-button--icon-sm"
          :aria-label="t('planning.priorityRitual.drafts.remove')"
          :disabled="busyId === link.id"
          @click="handleRemove(link)"
        >
          <AppIcon name="delete" class="text-sm" />
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { PriorityLink } from '@/domain/planning'
import {
  abandonProposedLink,
  createObjectFromProposal,
  listLinksForPriority,
  type ResolvedProposalResult,
} from '@/services/priorityLinkService'
import { useT } from '@/composables/useT'

const props = defineProps<{ priorityId: string }>()

const emit = defineEmits<{
  /** A proposal was created into a real object — parent should reload its data. */
  resolved: [result: ResolvedProposalResult]
  /** A proposal was abandoned (hard-deleted). */
  removed: [linkId: string]
  /** Any change to the pending list (create/remove) — parent may reload. */
  changed: []
  /** User-facing success message (host shows it in a snackbar). */
  notify: [message: string]
  error: [message: string]
}>()

const { t } = useT()

const pendingLinks = ref<PriorityLink[]>([])
const busyId = ref<string | null>(null)

const PROPOSAL_ICONS: Record<string, string> = {
  goal: 'flag',
  habit: 'routine',
  tracker: 'monitoring',
  weeklyIntention: 'gps_fixed',
}

function proposalIcon(type?: string): string {
  return (type && PROPOSAL_ICONS[type]) || 'category'
}

function proposalTypeLabel(type?: string): string {
  return type ? t(`planning.priorityRitual.drafts.types.${type}`) : ''
}

async function load(): Promise<void> {
  const links = await listLinksForPriority(props.priorityId)
  pendingLinks.value = links.filter(link => link.status === 'proposed')
}

async function handleFinish(link: PriorityLink): Promise<void> {
  if (busyId.value) return
  busyId.value = link.id
  const title = link.proposal?.title ?? ''
  try {
    const result = await createObjectFromProposal(link)
    await load()
    emit('resolved', result)
    emit('notify', t('planning.priorityRitual.drafts.createdToast', { title }))
    emit('changed')
  } catch (error) {
    console.error('Failed to create object from proposal:', error)
    emit('error', t('planning.priorityRitual.drafts.errorCreate'))
  } finally {
    busyId.value = null
  }
}

async function handleRemove(link: PriorityLink): Promise<void> {
  if (busyId.value) return
  busyId.value = link.id
  try {
    await abandonProposedLink(link.id)
    await load()
    emit('removed', link.id)
    emit('changed')
  } catch (error) {
    console.error('Failed to remove proposal:', error)
    emit('error', t('planning.priorityRitual.drafts.errorRemove'))
  } finally {
    busyId.value = null
  }
}

watch(() => props.priorityId, () => { void load() })
onMounted(() => { void load() })

defineExpose({ reload: load })
</script>
