/**
 * Make every <textarea> in the app grow with its content instead of showing
 * a scrollbar.
 *
 * Modern browsers (Chrome 123+, Edge 123+, Safari 17.4+, Firefox 134+)
 * handle this purely via `field-sizing: content` in `src/styles/main.css`.
 * For browsers that lack support, this module installs a JS fallback that
 *
 *   1. resizes every existing textarea on startup,
 *   2. attaches an `input` listener to grow each textarea as the user types,
 *   3. uses a `MutationObserver` to discover textareas added later (Vue
 *      mounts components dynamically, so we can't just scan once),
 *   4. monkey-patches the `value` setter on `HTMLTextAreaElement.prototype`
 *      so programmatic updates (e.g. Vue's v-model writing back a draft
 *      loaded from IndexedDB) also trigger a resize.
 *
 * Textareas that intentionally cap their height (e.g. the chat input)
 * can opt out with the attribute `data-no-autoresize`.
 */

const ATTACHED_FLAG = '__autoresizeAttached__'

interface AutoresizeTextarea extends HTMLTextAreaElement {
  [ATTACHED_FLAG]?: boolean
}

function isOptedOut(el: HTMLTextAreaElement): boolean {
  return el.hasAttribute('data-no-autoresize')
}

function resize(el: HTMLTextAreaElement): void {
  if (isOptedOut(el)) return
  // Reset first so scrollHeight reflects the actual content rather than the
  // current (possibly oversized) height.
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function attach(el: AutoresizeTextarea): void {
  if (el[ATTACHED_FLAG]) return
  if (isOptedOut(el)) return
  el[ATTACHED_FLAG] = true
  el.addEventListener('input', () => resize(el))
  // Defer the initial sizing so the element's box is laid out first.
  // `requestAnimationFrame` is more reliable than `queueMicrotask` because
  // some textareas are inside `v-if`/transitions that mount synchronously
  // but layout on the next frame.
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => resize(el))
  } else {
    resize(el)
  }
}

function attachToAll(root: ParentNode): void {
  root.querySelectorAll('textarea').forEach((el) => attach(el as AutoresizeTextarea))
}

function patchValueSetter(): void {
  const proto = HTMLTextAreaElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (!descriptor || typeof descriptor.set !== 'function') return
  const originalSet = descriptor.set
  Object.defineProperty(proto, 'value', {
    ...descriptor,
    set(this: AutoresizeTextarea, v: string) {
      originalSet.call(this, v)
      if (this[ATTACHED_FLAG] && this.isConnected) {
        resize(this)
      }
    },
  })
}

let installed = false

export function setupTextareaAutoresize(): void {
  if (installed) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  installed = true

  // Modern browsers handle this entirely in CSS via `field-sizing: content`.
  // Skip the JS fallback to avoid a redundant resize on every keystroke.
  const supportsFieldSizing =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('field-sizing', 'content')
  if (supportsFieldSizing) return

  patchValueSetter()

  const init = () => {
    attachToAll(document)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLTextAreaElement) {
            attach(node as AutoresizeTextarea)
          } else if (node instanceof Element) {
            attachToAll(node)
          }
        })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
}
