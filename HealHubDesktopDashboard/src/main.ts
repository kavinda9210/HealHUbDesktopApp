import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css'
import App from './App.vue'
import { createAppRouter } from './router'
import { setUnauthorizedHandler } from './lib/api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
const router = createAppRouter(pinia)

app.use(pinia)
app.use(router)

setUnauthorizedHandler(({ message }) => {
	const auth = useAuthStore(pinia)
	auth.logout()

	const next = router.currentRoute.value.fullPath
	router.replace({ path: '/login', query: { reason: 'expired', msg: message || 'Token has expired', next } })
})

app.mount('#app')
