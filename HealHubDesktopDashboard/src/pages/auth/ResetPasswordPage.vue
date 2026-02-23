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
const confirmPassword = ref('')
const passwordVisible = ref(false)

const canSubmit = computed(() => Boolean(email.value && verificationCode.value && newPassword.value && confirmPassword.value))

const status = ref<string | null>(null)
const formError = ref<string | null>(null)

async function onSubmit() {
  status.value = null
  formError.value = null
  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match'
    return
  }
  try {
    status.value = await auth.resetPassword(email.value, verificationCode.value, newPassword.value, confirmPassword.value)
    await router.replace('/login')
  } catch {
    formError.value = auth.error || 'Failed to reset password'
  }
}
</script>

<template>
  <div class="page-root">

    <div class="bg-texture" aria-hidden="true"></div>

    <div class="card-wrap">

      <!-- Back link -->
      <router-link class="back-link" to="/login">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" width="14" height="14">
          <path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back to login
      </router-link>

      <div class="card">

        <!-- Icon -->
        <div class="icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="24" height="24">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 11V7a4 4 0 018 0v4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <h1 class="card-title">Reset password</h1>
        <p class="card-sub">Enter the verification code we sent to your email along with your new password.</p>

        <!-- Steps indicator -->
        <div class="steps" aria-hidden="true">
          <div class="step step-done">
            <span class="step-dot">
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" width="10" height="10">
                <path d="M2 5l2.5 2.5L8 3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="step-label">Email sent</span>
          </div>
          <div class="step-line"></div>
          <div class="step step-active">
            <span class="step-dot step-dot-active">2</span>
            <span class="step-label">Enter code</span>
          </div>
          <div class="step-line"></div>
          <div class="step step-idle">
            <span class="step-dot step-dot-idle">3</span>
            <span class="step-label">Done</span>
          </div>
        </div>

        <!-- Success -->
        <Transition name="fade-up">
          <div v-if="status" class="alert alert-success" role="status">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
            </svg>
            {{ status }}
          </div>
        </Transition>

        <form class="form" @submit.prevent="onSubmit" novalidate>

          <!-- Email -->
          <div class="field">
            <label class="label" for="email">Email address</label>
            <div class="input-wrap">
              <svg class="field-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                <path d="M2.5 6.5l7.5 5 7.5-5M2.5 5.5h15a1 1 0 011 1v8a1 1 0 01-1 1h-15a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input
                id="email"
                v-model="email"
                type="email"
                class="input"
                placeholder="doctor@hospital.org"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <!-- Verification code -->
          <div class="field">
            <label class="label" for="code">Verification code</label>
            <div class="input-wrap">
              <svg class="field-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                <rect x="2" y="5" width="16" height="12" rx="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 9h2m4 0h2M6 13h1m3 0h1m3 0h1" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input
                id="code"
                v-model="verificationCode"
                inputmode="numeric"
                class="input input-code"
                placeholder="e.g. 123456"
                required
              />
            </div>
            <p class="field-hint">Check your inbox or spam folder for the code.</p>
          </div>

          <!-- New password -->
          <div class="field">
            <label class="label" for="new-password">New password</label>
            <div class="input-wrap">
              <svg class="field-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                <rect x="4" y="8.5" width="12" height="9" rx="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 8.5V6a3 3 0 016 0v2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input
                id="new-password"
                v-model="newPassword"
                :type="passwordVisible ? 'text' : 'password'"
                class="input input-pass"
                placeholder="••••••••••"
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                class="eye-btn"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                @click="passwordVisible = !passwordVisible"
              >
                <svg v-if="!passwordVisible" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                  <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="10" cy="10" r="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                  <path d="M3 3l14 14M8.93 8.93A2.5 2.5 0 0012.5 12.5M4.55 4.55C3.24 5.7 2 7.3 2 10c0 0 3 6 8 6a8 8 0 004.45-1.55M7 4.29A8 8 0 0110 4c5 0 8 6 8 6a14 14 0 01-1.55 2.45" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Confirm password -->
          <div class="field">
            <label class="label" for="confirm-password">Confirm new password</label>
            <div class="input-wrap">
              <svg class="field-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                <rect x="4" y="8.5" width="12" height="9" rx="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 8.5V6a3 3 0 016 0v2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="passwordVisible ? 'text' : 'password'"
                class="input input-pass"
                placeholder="••••••••••"
                autocomplete="new-password"
                required
              />
            </div>
          </div>

          <!-- Error -->
          <Transition name="fade-up">
            <div v-if="formError" class="alert alert-error" role="alert">
              <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
              </svg>
              {{ formError }}
            </div>
          </Transition>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-primary"
            :disabled="auth.isLoading || !canSubmit"
          >
            <span v-if="!auth.isLoading">Reset password</span>
            <span v-else class="btn-loading">
              <svg class="spinner" viewBox="0 0 24 24" fill="none" width="15" height="15">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
              </svg>
              Resetting…
            </span>
          </button>

        </form>
      </div>

      <!-- Resend hint -->
      <p class="resend-hint">
        Didn't receive the code?
        <router-link to="/forgot-password" class="resend-link">Resend it</router-link>
      </p>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:ital,wght@0,500;0,600;1,500&display=swap');

/* ── Variables ───────────────────────────────── */
.page-root {
  --green:       #2E8B57;
  --green-dark:  #236B43;
  --green-light: #e8f5ee;
  --green-muted: #4fa872;
  --green-mid:   #a8cdb9;
  --white:       #ffffff;
  --text:        #1c2e25;
  --text-muted:  #5a7668;
  --border:      #cfe0d8;
  --input-bg:    #f5faf7;

  font-family: 'Nunito', sans-serif;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background: linear-gradient(140deg, #f5faf7 0%, #ffffff 60%, #edf7f2 100%);
  position: relative;
  overflow: hidden;
}

.bg-texture {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(46,139,87,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(46,139,87,0.04) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}

/* ── Card wrapper ────────────────────────────── */
.card-wrap {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  animation: card-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Back link ───────────────────────────────── */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: color 0.15s;
  align-self: flex-start;
}
.back-link:hover { color: var(--green); }

/* ── Card ────────────────────────────────────── */
.card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 2.25rem 2rem;
  box-shadow:
    0 1px 3px rgba(46,139,87,0.06),
    0 8px 32px rgba(46,139,87,0.08);
}

/* ── Icon ────────────────────────────────────── */
.icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--green-light);
  border: 1.5px solid rgba(46,139,87,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--green);
  margin-bottom: 1.25rem;
}

/* ── Heading ─────────────────────────────────── */
.card-title {
  font-family: 'Lora', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.35rem;
  letter-spacing: -0.01em;
}
.card-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

/* ── Steps ───────────────────────────────────── */
.steps {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 1.75rem;
  padding: 0.875rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.step {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}
.step-line {
  flex: 1;
  height: 1.5px;
  background: var(--border);
  margin: 0 0.5rem;
}
.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  flex-shrink: 0;
  /* done state */
  background: var(--green);
  color: var(--white);
  border: 1.5px solid var(--green);
}
.step-dot-active {
  background: var(--white);
  color: var(--green);
  border: 2px solid var(--green);
}
.step-dot-idle {
  background: var(--white);
  color: var(--green-mid);
  border: 1.5px solid var(--border);
}
.step-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.step-done .step-label  { color: var(--green-dark); }
.step-active .step-label { color: var(--green); }
.step-idle .step-label   { color: var(--text-muted); }

/* ── Alerts ──────────────────────────────────── */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}
.alert-icon { flex-shrink: 0; margin-top: 1px; }
.alert-success {
  background: #f0faf5;
  border: 1px solid rgba(46,139,87,0.25);
  color: var(--green-dark);
}
.alert-error {
  background: #fff5f5;
  border: 1px solid #f5c0c0;
  color: #b82020;
  margin-top: 0.2rem;
  margin-bottom: 0;
}

.fade-up-enter-active, .fade-up-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.fade-up-enter-from, .fade-up-leave-to {
  opacity: 0; transform: translateY(-5px);
}

/* ── Form ────────────────────────────────────── */
.form { display: flex; flex-direction: column; gap: 1.1rem; }
.field { display: flex; flex-direction: column; gap: 0.42rem; }
.label {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.field-hint {
  font-size: 0.74rem;
  color: var(--text-muted);
  margin: 0;
}

.input-wrap { position: relative; display: flex; align-items: center; }
.field-icon {
  position: absolute;
  left: 0.875rem;
  color: var(--green-muted);
  opacity: 0.7;
  pointer-events: none;
}
.input {
  width: 100%;
  background: var(--input-bg);
  border: 1.5px solid var(--border);
  border-radius: 9px;
  padding: 0.72rem 0.875rem 0.72rem 2.625rem;
  font-family: 'Nunito', sans-serif;
  font-size: 0.9rem;
  color: var(--text);
  outline: none;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}
.input::placeholder { color: var(--green-mid); font-size: 0.85rem; }
.input:focus {
  border-color: var(--green);
  background: #fff;
  box-shadow: 0 0 0 3.5px rgba(46,139,87,0.12);
}
.input-code {
  font-family: 'Nunito', monospace;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.input-pass { padding-right: 2.75rem; }

.eye-btn {
  position: absolute;
  right: 0.875rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  transition: color 0.15s;
}
.eye-btn:hover { color: var(--green); }

/* ── Button ──────────────────────────────────── */
.btn-primary {
  margin-top: 0.25rem;
  width: 100%;
  padding: 0.85rem 1rem;
  background: var(--green);
  border: none;
  border-radius: 9px;
  font-family: 'Nunito', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--white);
  cursor: pointer;
  transition: background 0.18s, transform 0.14s, box-shadow 0.18s;
  box-shadow: 0 4px 14px rgba(46,139,87,0.28);
}
.btn-primary:hover:not(:disabled) {
  background: var(--green-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(46,139,87,0.36);
}
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.spinner { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Resend hint ─────────────────────────────── */
.resend-hint {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}
.resend-link {
  color: var(--green);
  font-weight: 700;
  text-decoration: none;
  transition: color 0.15s;
}
.resend-link:hover { color: var(--green-dark); }
</style>