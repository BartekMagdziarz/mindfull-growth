<template>
  <div class="space-y-3">
    <label v-if="label" class="block text-sm font-medium text-on-surface">{{ label }}</label>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <!-- Existing parts -->
      <button
        v-for="part in filteredParts"
        :key="part.id"
        :class="[
          'neo-focus rounded-xl p-3 text-left transition-all',
          part.id === modelValue
            ? 'neo-surface shadow-neu-pressed border-2 border-primary'
            : 'neo-surface shadow-neu-raised-sm hover:-translate-y-px',
          roleBorderClass(part.role),
        ]"
        @click="emit('update:modelValue', part.id === modelValue ? null : part.id)"
      >
        <p class="text-sm font-medium text-on-surface truncate">{{ part.name }}</p>
        <PartRoleBadge :role="part.role" class="mt-1" />
        <p v-if="part.bodyLocations.length" class="text-xs text-on-surface-variant mt-1 truncate">
          {{ part.bodyLocations.map(formatLocation).join(', ') }}
        </p>
      </button>

      <!-- Add new part card -->
      <button
        v-if="allowCreate"
        class="neo-focus rounded-xl p-3 border-2 border-dashed border-neu-border/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 min-h-[80px]"
        @click="showCreateForm = !showCreateForm"
      >
        <AppIcon name="add" class="text-2xl text-on-surface-variant" />
        <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.shared.ifs.partSelector.addPart') }}</span>
      </button>
    </div>

    <!-- Inline create form -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showCreateForm" class="neo-surface shadow-neu-raised-sm rounded-xl p-4 space-y-3">
        <input
          v-model="newPartName"
          type="text"
          class="neo-input w-full"
          :placeholder="t('exerciseWizards.shared.ifs.partSelector.placeholder')"
        />
        <div class="flex flex-wrap gap-2">
          <button
            v-for="role in roleOptions"
            :key="role.value"
            class="neo-pill px-3 py-1 text-xs neo-focus transition-all"
            :class="[
              newPartRole === role.value
                ? `${role.activeClass} shadow-neu-pressed`
                : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px',
            ]"
            @click="newPartRole = role.value"
          >
            {{ role.label }}
          </button>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="text-sm text-on-surface-variant hover:text-on-surface neo-focus px-3 py-1 rounded-lg"
            @click="cancelCreate"
          >
            {{ t('common.buttons.cancel') }}
          </button>
          <button
            class="text-sm text-primary font-medium neo-focus px-3 py-1 rounded-lg neo-surface shadow-neu-raised-sm hover:-translate-y-px active:shadow-neu-pressed disabled:opacity-40"
            :disabled="!newPartName.trim()"
            @click="handleCreate"
          >
            {{ t('common.buttons.save') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import PartRoleBadge from './PartRoleBadge.vue'
import type { IFSPart, IFSPartRole } from '@/domain/exercises'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    parts: IFSPart[]
    filterRole?: IFSPartRole | IFSPartRole[]
    allowCreate?: boolean
    label?: string
  }>(),
  {
    allowCreate: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'create-part': [data: { name: string; role: IFSPartRole }]
}>()

const showCreateForm = ref(false)
const newPartName = ref('')
const newPartRole = ref<IFSPartRole>('unknown')

const roleOptions = computed(() => [
  { value: 'manager' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.manager'), activeClass: 'bg-blue-100 text-blue-700' },
  { value: 'firefighter' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.firefighter'), activeClass: 'bg-orange-100 text-orange-700' },
  { value: 'exile' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.exile'), activeClass: 'bg-purple-100 text-purple-700' },
  { value: 'unknown' as IFSPartRole, label: t('exerciseWizards.shared.ifs.partSelector.roleOptions.notSure'), activeClass: 'bg-neu-base text-on-surface' },
])

const filteredParts = computed(() => {
  if (!props.filterRole) return props.parts
  const roles = Array.isArray(props.filterRole) ? props.filterRole : [props.filterRole]
  return props.parts.filter((p) => roles.includes(p.role))
})

function roleBorderClass(role: IFSPartRole): string {
  switch (role) {
    case 'manager':
      return 'border-l-4 border-l-blue-400'
    case 'firefighter':
      return 'border-l-4 border-l-orange-400'
    case 'exile':
      return 'border-l-4 border-l-purple-400'
    default:
      return ''
  }
}

function formatLocation(location: string): string {
  return location
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function handleCreate() {
  if (!newPartName.value.trim()) return
  emit('create-part', { name: newPartName.value.trim(), role: newPartRole.value })
  cancelCreate()
}

function cancelCreate() {
  showCreateForm.value = false
  newPartName.value = ''
  newPartRole.value = 'unknown'
}

</script>
