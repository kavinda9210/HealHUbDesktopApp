<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, homePathForRole } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const formError = ref<string | null>(null)
const passwordVisible = ref(false)

const expiredMessage = computed(() => {
  const reason = typeof route.query.reason === 'string' ? route.query.reason : null
  if (reason !== 'expired') return null
  const msg = typeof route.query.msg === 'string' ? route.query.msg : null
  return msg || 'Token has expired. Please login again.'
})

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
  <div class="login-root">

    <!-- LEFT — Brand panel -->
    <div class="brand-panel" aria-hidden="true">
      <div class="brand-panel-inner">
        <div class="deco-circle deco-tl"></div>
        <div class="deco-circle deco-tr"></div>
        <div class="deco-circle deco-bl"></div>

        <div class="brand-content">
          <img src="/src/assets/HealHub_icon.png" alt="HealHub" class="brand-logo" />
          <p class="brand-tagline">Caring for You</p>
          <div class="brand-divider"></div>
          <p class="brand-desc">
            A secure clinical workspace for healthcare professionals.
            Patient-first. Evidence-driven.
          </p>
        </div>

        <div class="brand-badges">
          <span class="badge">
            <svg viewBox="0 0 12 14" fill="currentColor" width="10" height="11">
              <path d="M6 0L0 2.5v4C0 9.9 2.6 13 6 14c3.4-1 6-4.1 6-7.5v-4L6 0z"/>
            </svg>
            HIPAA Compliant
          </span>
          <span class="badge">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11">
              <circle cx="7" cy="7" r="6"/>
              <path d="M5 7l1.5 1.5L9 5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ISO 27001
          </span>
        </div>
      </div>
    </div>

    <!-- RIGHT — Form panel -->
    <div class="form-panel">
      <div class="form-wrap">

        <!-- Mobile logo -->
        <div class="mobile-logo">
          <img src="/src/assets/HealHub_icon.png" alt="HealHub" class="mobile-logo-img" />
          <span class="mobile-brand-name">HealHub</span>
        </div>

        <h2 class="form-title">Welcome back</h2>
        <p class="form-subtitle">Sign in to your clinical account</p>

        <Transition name="slide-fade">
          <div v-if="expiredMessage" class="alert alert-warn" role="alert">
            <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
            </svg>
            {{ expiredMessage }}
          </div>
        </Transition>

        <form class="form" @submit.prevent="onSubmit" novalidate>

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

          <div class="field">
            <div class="label-row">
              <label class="label" for="password">Password</label>
              <router-link class="forgot-inline" to="/forgot-password">Forgot password?</router-link>
            </div>
            <div class="input-wrap">
              <svg class="field-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                <rect x="4" y="8.5" width="12" height="9" rx="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 8.5V6a3 3 0 016 0v2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input
                id="password"
                v-model="password"
                :type="passwordVisible ? 'text' : 'password'"
                class="input input-pass"
                placeholder="••••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="eye-btn" :aria-label="passwordVisible ? 'Hide' : 'Show'" @click="passwordVisible = !passwordVisible">
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

          <Transition name="slide-fade">
            <div v-if="formError" class="alert alert-error" role="alert">
              <svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
              </svg>
              {{ formError }}
            </div>
          </Transition>

          <button type="submit" class="btn-submit" :disabled="auth.isLoading">
            <span v-if="!auth.isLoading">Sign in</span>
            <span v-else class="btn-loading">
              <svg class="spinner" viewBox="0 0 24 24" fill="none" width="16" height="16">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
              </svg>
              Authenticating…
            </span>
          </button>
        </form>

        <p class="form-role-note">
          Access restricted to <strong>Admins</strong> and <strong>Doctors</strong>
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:ital,wght@0,500;0,600;1,500&display=swap');

/* ── Variables ───────────────────────────────── */
.login-root {
  --green:       #2E8B57;
  --green-dark:  #236B43;
  --green-deep:  #1a5233;
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
  background: var(--white);
}

/* ─────────────────────────────────────────────── */
/* LEFT — Brand panel                              */
/* ─────────────────────────────────────────────── */
.brand-panel {
  width: 400px;
  flex-shrink: 0;
  background: var(--green);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Diagonal stripe texture */
.brand-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    135deg,
    rgba(255,255,255,0.03) 0px,
    rgba(255,255,255,0.03) 1px,
    transparent 1px,
    transparent 28px
  );
  pointer-events: none;
}

.brand-panel-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2.5rem;
}

/* Decorative circles mirroring the logo's aesthetic */
.deco-circle { position: absolute; border-radius: 50%; pointer-events: none; }
.deco-tl { width: 150px; height: 150px; background: rgba(255,255,255,0.07); top: -50px; left: -50px; }
.deco-tr { width: 110px; height: 110px; background: rgba(255,255,255,0.055); top: 50px; right: -25px; }
.deco-bl { width: 220px; height: 220px; background: rgba(0,0,0,0.06); bottom: -70px; left: -70px; }

.brand-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.brand-logo {
  width: 128px;
  height: 128px;
  object-fit: contain;
  border-radius: 22px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  animation: logo-in 0.65s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes logo-in {
  from { opacity: 0; transform: translateY(18px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.brand-tagline {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 1.15rem;
  color: rgba(255,255,255,0.88);
  margin: 1.2rem 0 0;
}
.brand-divider {
  width: 36px; height: 2px;
  background: rgba(255,255,255,0.28);
  border-radius: 99px;
  margin: 1rem auto;
}
.brand-desc {
  font-size: 0.81rem;
  color: rgba(255,255,255,0.62);
  line-height: 1.7;
  max-width: 250px;
}

.brand-badges {
  display: flex;
  gap: 0.65rem;
  justify-content: center;
  flex-wrap: wrap;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.68);
  background: rgba(255,255,255,0.09);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 0.32rem 0.72rem;
  border-radius: 99px;
}

/* ─────────────────────────────────────────────── */
/* RIGHT — Form panel                              */
/* ─────────────────────────────────────────────── */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: linear-gradient(140deg, #ffffff 65%, #f0faf5 100%);
  animation: panel-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s both;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}

.form-wrap { width: 100%; max-width: 370px; }

/* Mobile logo */
.mobile-logo {
  display: none;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
.mobile-logo-img { width: 44px; height: 44px; border-radius: 10px; }
.mobile-brand-name {
  font-family: 'Lora', serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--green);
}

.form-title {
  font-family: 'Lora', serif;
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.3rem;
  letter-spacing: -0.015em;
}
.form-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 2rem;
}

/* ── Alerts ───────────────────────────────────── */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.5;
  margin-bottom: 1.25rem;
}
.alert-icon { flex-shrink: 0; margin-top: 1px; }
.alert-warn  { background: #fffbeb; border: 1px solid #f0cc5a; color: #7d5a00; }
.alert-error { background: #fff5f5; border: 1px solid #f5c0c0; color: #b82020; margin-top: 0.2rem; margin-bottom: 0; }

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0; transform: translateY(-5px);
}

/* ── Form ─────────────────────────────────────── */
.form { display: flex; flex-direction: column; gap: 1.15rem; }
.field { display: flex; flex-direction: column; gap: 0.42rem; }
.label-row { display: flex; align-items: center; justify-content: space-between; }
.label {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.forgot-inline {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--green);
  text-decoration: none;
  transition: color 0.15s;
}
.forgot-inline:hover { color: var(--green-dark); }

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

/* ── Button ────────────────────────────────────── */
.btn-submit {
  margin-top: 0.35rem;
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
.btn-submit:hover:not(:disabled) {
  background: var(--green-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(46,139,87,0.36);
}
.btn-submit:active:not(:disabled) { transform: translateY(0); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.spinner { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Role note */
.form-role-note {
  margin-top: 1.75rem;
  text-align: center;
  font-size: 0.77rem;
  color: var(--text-muted);
}
.form-role-note strong { color: var(--green-dark); }

/* ── Responsive ────────────────────────────────── */
@media (max-width: 700px) {
  .login-root { flex-direction: column; }
  .brand-panel { display: none; }
  .mobile-logo { display: flex; }
  .form-panel { padding: 2.5rem 1.5rem; }
}
</style>