import './assets/main.css'
import './index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
const useDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: useDarkTheme ? 'dark' : 'light',
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
