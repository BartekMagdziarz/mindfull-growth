import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

// Pinia must be installed before router (router guard uses auth store)
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')
