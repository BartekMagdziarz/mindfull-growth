import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { applyCachedTheme } from './services/theme.service'
import { setupTextareaAutoresize } from './utils/textareaAutoresize'

// Apply theme before Vue mounts to avoid a flash of the default palette.
applyCachedTheme()

// Make every <textarea> grow with its content instead of showing a scrollbar.
// Modern browsers handle this via `field-sizing: content` in main.css; this
// installs a JS fallback for older browsers (no-op when CSS support exists).
setupTextareaAutoresize()

const app = createApp(App)

// Pinia must be installed before router (router guard uses auth store)
const pinia = createPinia()
app.use(pinia)
app.use(router)

if (import.meta.env.DEV) {
  Promise.all([
    import('./services/todayVisualizationAudit'),
    import('./repositories/habitDexieRepository'),
    import('./repositories/keyResultDexieRepository'),
    import('./repositories/trackerDexieRepository'),
  ]).then(async ([
    { auditMeasurementRecords },
    { habitDexieRepository },
    { keyResultDexieRepository },
    { trackerDexieRepository },
  ]) => {
    const [habits, keyResults, trackers] = await Promise.all([
      habitDexieRepository.listAll(),
      keyResultDexieRepository.listAll(),
      trackerDexieRepository.listAll(),
    ])
    const invalid = auditMeasurementRecords(habits, keyResults, trackers)
    if (invalid.length > 0) {
      console.warn('[Today viz audit] Found invalid measurement records:', invalid)
    }
  })
}

app.mount('#app')
