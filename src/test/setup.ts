import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/vue'
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { config } from '@vue/test-utils'
import { defineComponent, h, type App, type Plugin } from 'vue'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { connectTestDatabase } from '@/test/testDatabase'

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}

if (!window.IntersectionObserver) {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin = ''
    readonly thresholds: ReadonlyArray<number> = []

    constructor(
      _callback: IntersectionObserverCallback,
      _options?: IntersectionObserverInit
    ) {}

    observe(_target: Element) {
      return undefined
    }
    unobserve(_target: Element) {
      return undefined
    }
    disconnect() {
      return undefined
    }
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  window.IntersectionObserver = IntersectionObserverStub
}

if (!window.ResizeObserver) {
  class ResizeObserverStub implements ResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}

    observe(_target: Element, _options?: ResizeObserverOptions) {
      return undefined
    }
    unobserve(_target: Element) {
      return undefined
    }
    disconnect() {
      return undefined
    }
  }

  window.ResizeObserver = ResizeObserverStub
}

const piniaPlugin: Plugin = {
  install(app: App) {
    let pinia = getActivePinia()
    if (!pinia) {
      pinia = createPinia()
      setActivePinia(pinia)
    }
    app.use(pinia)
  },
}

const AppDialogStub = defineComponent({
  name: 'AppDialogStub',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    confirmText: { type: String, default: 'Confirm' },
    cancelText: { type: String, default: 'Cancel' },
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  setup(props, { emit, slots }) {
    const handleConfirm = () => {
      emit('confirm')
      emit('update:modelValue', false)
    }
    const handleCancel = () => {
      emit('cancel')
      emit('update:modelValue', false)
    }
    return () =>
      props.modelValue
        ? h('div', { 'data-testid': 'app-dialog' }, [
            props.title ? h('p', { 'data-testid': 'dialog-title' }, props.title) : null,
            props.message ? h('p', { 'data-testid': 'dialog-message' }, props.message) : null,
            slots.default?.(),
            h('button', { onClick: handleCancel }, props.cancelText),
            h('button', { onClick: handleConfirm }, props.confirmText),
          ])
        : null
  },
})

config.global.plugins = [piniaPlugin]
config.global.components = {
  ...(config.global.components ?? {}),
  AppDialog: AppDialogStub,
}
config.global.stubs = {
  ...(config.global.stubs ?? {}),
  'router-link': {
    template: '<a><slot /></a>',
  },
  'router-view': {
    template: '<div><slot /></div>',
  },
}

beforeEach(async () => {
  setActivePinia(createPinia())
  const db = await connectTestDatabase()

  // Clear drafts table to prevent leakage between tests
  await db.drafts.clear()

  // Lock locale to 'en' so existing text-based test assertions keep working
  const { useUserPreferencesStore } = await import('@/stores/userPreferences.store')
  const prefs = useUserPreferencesStore()
  prefs.$patch({ locale: 'en' })
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
