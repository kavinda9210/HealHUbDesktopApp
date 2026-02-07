<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, homePathForRole } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const formError = ref<string | null>(null)

async function onSubmit() {
  formError.value = null
  try {
    const user = await auth.login(email.value, password.value)
    const next = typeof route.query.next === 'string' ? route.query.next : null
    await router.replace(next || homePathForRole(user.role))
  } catch {
    formError.value = auth.error || 'Login failed'
  }
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center px-4">
    <div class="w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <div class="text-xl font-semibold">HealHub Desktop</div>
      <div class="text-sm text-gray-500">Admin / Doctor login</div>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="block text-sm font-medium">Email</label>
          <input
            v-model="email"
            type="email"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            autocomplete="email"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium">Password</label>
          <input
            v-model="password"
            type="password"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="formError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ formError }}
        </div>

        <button
          type="submit"
          class="w-full rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
          :disabled="auth.isLoading"
        >
          {{ auth.isLoading ? 'Signing in…' : 'Login' }}
        </button>

        <div class="text-sm">
          <router-link class="text-gray-700 underline" to="/forgot-password">Forgot password?</router-link>
        </div>
      </form>
    </div>
  </div>
</template>
