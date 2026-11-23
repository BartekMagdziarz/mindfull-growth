<template>
  <div ref="markRef" class="ams">
    <AreaHeroMark
      :load="draft.load"
      :state="draft.state"
      :subject="subject"
      :preview-load="preview?.axis === 'load' ? preview.value : null"
      :preview-state="preview?.axis === 'state' ? preview.value : null"
      :grip="draft.load != null"
      :active="active"
    />
    <!-- znak też da się złapać: kropka = stan, koniec słupka = obciążenie -->
    <span v-if="draft.state != null" class="ams__grab ams__grab--state" :style="{ '--ams-at': draft.state }" aria-hidden="true" @pointerenter="emit('active', 'state')" @pointerleave="emit('active', null)" @pointerdown="startDrag('state', $event)" />
    <span v-if="draft.load != null" class="ams__grab ams__grab--load" :style="{ '--ams-at': draft.load }" aria-hidden="true" @pointerenter="emit('active', 'load')" @pointerleave="emit('active', null)" @pointerdown="startDrag('load', $event)" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { stopFromOffset, type AreaDraft, type AxisKey } from '~lab/lab/areaRatingStep'
import AreaHeroMark from './AreaHeroMark.vue'

/**
 * Runda 4 · duży znak tygodnia jako scena: rysuje cień podglądu z suwaka,
 * budzi element osi, której suwak jest pod kursorem, i pozwala złapać kropkę
 * albo koniec słupka wprost na znaku (ten sam ruch co suwakiem).
 */
const props = defineProps<{
  draft: AreaDraft
  subject: string
  preview: { axis: AxisKey; value: number } | null
  active: AxisKey | null
}>()
const emit = defineEmits<{ rate: [axis: AxisKey, value: number | null]; active: [axis: AxisKey | null] }>()

const markRef = ref<HTMLElement | null>(null)

function startDrag(axis: AxisKey, event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const mark = markRef.value
  if (!mark || event.button !== 0) return
  event.preventDefault()
  target.setPointerCapture(event.pointerId)
  target.classList.add('is-dragging')
  const move = (moveEvent: PointerEvent) => {
    const rect = mark.getBoundingClientRect()
    const value = stopFromOffset(moveEvent.clientX - rect.left, rect.width, rect.height)
    if (value !== props.draft[axis]) emit('rate', axis, value)
  }
  const end = () => {
    target.classList.remove('is-dragging')
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', end)
    target.removeEventListener('pointercancel', end)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', end)
  target.addEventListener('pointercancel', end)
}
</script>

<style scoped>
.ams {
  --ams-size: 3rem;
  position: relative;
}
.ams__grab {
  --ams-x: calc(var(--ams-size) / 2 + (var(--ams-at) - 1) * (100% - var(--ams-size)) / 4);
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--ams-x);
  z-index: 1;
  width: 2.5rem;
  border-radius: var(--mg-radius-pill);
  translate: -50% 0;
  cursor: grab;
  touch-action: none;
}
.ams__grab--load {
  left: calc(var(--ams-x) + 1rem);
  width: 1.25rem;
  cursor: ew-resize;
}
.ams__grab.is-dragging {
  cursor: grabbing;
}
</style>
