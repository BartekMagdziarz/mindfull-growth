import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '../../../src/styles/main.css'
import '../../../src/design-system/index.css'
import './styles/lab.css'

createApp(App).use(createPinia()).use(router).mount('#app')
