import { inject, onBeforeUnmount, provide, type InjectionKey } from 'vue'

interface DayPlanDragMotion {
  start: (event: DragEvent) => void
  hover: (element: HTMLElement | null) => void
  land: (element: HTMLElement) => void
  cancel: () => void
}
const motionKey: InjectionKey<DayPlanDragMotion> = Symbol('day-plan-drag-motion')

/** A workspace-local visual layer. Scheduling and validation stay in the store. */
export function provideDayPlanDragMotion() {
  let preview: HTMLElement | null = null
  let source: HTMLElement | null = null
  let target: HTMLElement | null = null
  let animation: Animation | null = null
  let frame = 0
  let x = 0
  let y = 0
  let offsetX = 0
  let offsetY = 0
  let landing = false
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function hover(element: HTMLElement | null) {
    target?.classList.remove('is-drag-over')
    target = element
    target?.classList.add('is-drag-over')
  }
  function cleanup() {
    cancelAnimationFrame(frame)
    animation?.cancel()
    animation = null
    preview?.remove()
    preview = null
    source?.classList.remove('ndi--drag-source')
    source = null
    hover(null)
    landing = false
    document.removeEventListener('dragover', move)
  }
  function position() {
    if (preview) preview.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0) rotate(-2deg) scale(1.025)`
  }
  function move(event: DragEvent) {
    if (landing) return
    x = event.clientX
    y = event.clientY
    if (target && !(event.target instanceof Node && target.contains(event.target))) hover(null)
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(position)
  }
  function start(event: DragEvent) {
    cleanup()
    const handle = event.currentTarget as HTMLElement | null
    source = handle?.closest<HTMLElement>('.ndi') ?? null
    if (!source || !event.dataTransfer) return
    const bounds = source.getBoundingClientRect()
    // Preserve the actual card's typography, icon and progress in the lifted copy.
    const card = source.cloneNode(true) as HTMLElement
    card.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    card.removeAttribute('id')
    card.classList.remove('ndi--staged')
    preview = document.createElement('div')
    preview.className = 'mg-design-v2 planning-next day-plan-drag-preview'
    preview.setAttribute('aria-hidden', 'true')
    preview.inert = true
    preview.style.width = `${bounds.width}px`
    preview.append(card)
    document.body.append(preview)
    offsetX = Math.max(16, Math.min(event.clientX - bounds.left, bounds.width - 16))
    offsetY = Math.max(16, Math.min(event.clientY - bounds.top, bounds.height - 16))
    x = event.clientX
    y = event.clientY
    position()
    // Hide the browser's handle-only ghost; the card follows dragover instead.
    const transparent = document.createElement('canvas')
    transparent.width = transparent.height = 1
    event.dataTransfer.setDragImage(transparent, 0, 0)
    source.classList.add('ndi--drag-source')
    document.addEventListener('dragover', move)
  }
  function settle(element: HTMLElement, returning: boolean) {
    if (!preview) { cleanup(); return }
    landing = true
    cancelAnimationFrame(frame)
    document.removeEventListener('dragover', move)
    hover(null)
    const bounds = element.getBoundingClientRect()
    const scale = returning ? 1 : Math.min(bounds.width / preview.offsetWidth, 0.24)
    const endX = returning ? bounds.left : bounds.left + bounds.width / 2 - preview.offsetWidth * scale / 2
    const endY = returning ? bounds.top : bounds.top + bounds.height / 2 - preview.offsetHeight * scale / 2
    if (reducedMotion() || !preview.animate) { cleanup(); return }
    animation = preview.animate([
      { transform: preview.style.transform, opacity: 1 },
      { transform: `translate3d(${endX}px, ${endY}px, 0) rotate(0deg) scale(${scale})`, opacity: returning ? 1 : 0 },
    ], { duration: returning ? 220 : 320, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' })
    animation.onfinish = cleanup
  }
  const motion: DayPlanDragMotion = {
    start,
    hover,
    land: element => settle(element, false),
    cancel: () => { if (!landing) source?.isConnected ? settle(source, true) : cleanup() },
  }
  provide(motionKey, motion)
  onBeforeUnmount(cleanup)
  return motion
}

export function useDayPlanDragMotion() {
  return inject(motionKey, null)
}
