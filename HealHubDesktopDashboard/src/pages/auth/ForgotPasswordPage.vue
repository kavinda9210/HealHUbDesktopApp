<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const status = ref<string | null>(null)
const formError = ref<string | null>(null)

async function onSubmit() {
  status.value = null
  formError.value = null
  try {
    status.value = await auth.forgotPassword(email.value)
  } catch {
    formError.value = auth.error || 'Failed to send reset code'
  }
}

function goToReset() {
  router.push({ path: '/reset-password', query: email.value ? { email: email.value } : undefined })
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center px-4">
    <div class="w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <div class="text-xl font-semibold">Forgot password</div>
      <div class="text-sm text-gray-500">We will email you a verification code</div>

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

        <div v-if="status" class="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {{ status }}
        </div>
        <div v-if="formError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ formError }}
        </div>

        <button
          type="submit"
          class="w-full rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
          :disabled="auth.isLoading"
        >
          {{ auth.isLoading ? 'Sending…' : 'Send reset code' }}
        </button>

        <button type="button" class="w-full rounded border border-gray-300 px-3 py-2" @click="goToReset">
          I already have a code
        </button>

        <div class="text-sm">
          <router-link class="text-gray-700 underline" to="/login">Back to login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>
