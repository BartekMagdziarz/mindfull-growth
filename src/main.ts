import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { applyCachedTheme } from './services/theme.service'

// Apply theme before Vue mounts to avoid a flash of the default palette.
applyCachedTheme()

const app = createApp(App)

// Pinia must be installed before router (router guard uses auth store)
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')
