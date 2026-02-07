<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const verificationCode = ref('')
const newPassword = ref('')

const canSubmit = computed(() => Boolean(email.value && verificationCode.value && newPassword.value))

const status = ref<string | null>(null)
const formError = ref<string | null>(null)

async function onSubmit() {
  status.value = null
  formError.value = null
  try {
    status.value = await auth.resetPassword(email.value, verificationCode.value, newPassword.value)
    await router.replace('/login')
  } catch {
    formError.value = auth.error || 'Failed to reset password'
  }
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center px-4">
    <div class="w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <div class="text-xl font-semibold">Reset password</div>
      <div class="text-sm text-gray-500">Enter the verification code sent to your email</div>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="block text-sm font-medium">Email</label>
          <input v-model="email" type="email" class="mt-1 w-full rounded border border-gray-300 px-3 py-2" required />
        </div>

        <div>
          <label class="block text-sm font-medium">Verification code</label>
          <input
            v-model="verificationCode"
            inputmode="numeric"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium">New password</label>
          <input
            v-model="newPassword"
            type="password"
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            autocomplete="new-password"
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
          :disabled="auth.isLoading || !canSubmit"
        >
          {{ auth.isLoading ? 'Resetting…' : 'Reset password' }}
        </button>

        <div class="text-sm">
          <router-link class="text-gray-700 underline" to="/login">Back to login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>
