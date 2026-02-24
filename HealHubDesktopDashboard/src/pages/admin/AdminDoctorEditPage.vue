<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type DoctorRow = {
  doctor_id: number
  user_id: string
  full_name: string
  specialization?: string
  qualification?: string
  phone?: string
  email?: string
  consultation_fee?: number
  available_days?: unknown
  start_time?: string | null
  end_time?: string | null
  is_available?: boolean
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const doctorId = computed(() => {
  const raw = route.params.doctorId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const passwordVisible = ref(false)

const daysOfWeek = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
]

function normalizeDays(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean)
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return []
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean)
      } catch { /* fall back */ }
    }
    return s.split(',').map((x) => x.trim()).filter(Boolean)
  }
  return []
}

function timeToMinutes(t: string) {
  const m = t.match(/^(\d{2}):(\d{2})/)
  if (!m) return NaN
  return Number(m[1]) * 60 + Number(m[2])
}

function validateForm() {
  if (!form.value.email.trim())          return 'Email is required.'
  if (!form.value.full_name.trim())      return 'Full name is required.'
  if (!form.value.specialization.trim()) return 'Specialization is required.'
  if (!form.value.phone.trim())          return 'Phone is required.'
  if (form.value.is_available) {
    if (!form.value.available_days.length)
      return 'Please select at least one available day.'
    if (!form.value.start_time.trim() || !form.value.end_time.trim())
      return 'Start time and end time are required when available.'
    const s = timeToMinutes(form.value.start_time)
    const e = timeToMinutes(form.value.end_time)
    if (!Number.isFinite(s) || !Number.isFinite(e)) return 'Invalid start or end time.'
    if (e <= s) return 'End time must be after start time.'
  }
  return null
}

const form = ref({
  email: '',
  new_password: '',
  full_name: '',
  specialization: '',
  qualification: '',
  phone: '',
  consultation_fee: '',
  is_available: true,
  available_days: [] as string[],
  start_time: '',
  end_time: '',
})

async function load() {
  if (!Number.isFinite(doctorId.value)) { loadError.value = 'Invalid doctor id'; return }
  isLoading.value = true
  loadError.value = null
  try {
    const res = await api.get<{ success: boolean; data: DoctorRow }>(
      `/api/admin/doctors/${doctorId.value}`,
      { token: auth.accessToken }
    )
    const d = res.data
    form.value = {
      email: d.email || '',
      new_password: '',
      full_name: d.full_name || '',
      specialization: d.specialization || '',
      qualification: d.qualification || '',
      phone: d.phone || '',
      consultation_fee: d.consultation_fee != null ? String(d.consultation_fee) : '',
      is_available: Boolean(d.is_available ?? true),
      available_days: normalizeDays(d.available_days),
      start_time: d.start_time ? String(d.start_time).slice(0, 5) : '',
      end_time: d.end_time ? String(d.end_time).slice(0, 5) : '',
    }
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Failed to load doctor'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!Number.isFinite(doctorId.value)) return
  const err = validateForm()
  if (err) { saveError.value = err; return }
  isSaving.value = true
  saveError.value = null
  try {
    const fee = form.value.consultation_fee.trim() ? Number(form.value.consultation_fee) : 0
    const payload: Record<string, unknown> = {
      email: form.value.email.trim(),
      full_name: form.value.full_name.trim(),
      specialization: form.value.specialization.trim(),
      qualification: form.value.qualification.trim(),
      phone: form.value.phone.trim(),
      consultation_fee: Number.isFinite(fee) ? fee : 0,
      is_available: Boolean(form.value.is_available),
      available_days: form.value.is_available ? form.value.available_days : null,
      start_time: form.value.is_available ? form.value.start_time.trim() : null,
      end_time: form.value.is_available ? form.value.end_time.trim() : null,
    }
    if (form.value.new_password.trim()) payload.password = form.value.new_password.trim()
    await api.put(`/api/admin/doctors/${doctorId.value}`, payload, { token: auth.accessToken })
    router.replace({ path: `/admin/doctors/${doctorId.value}`, query: { notice: 'doctor_updated' } })
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Failed to save doctor'
  } finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">

    <!-- ── Page Header ─────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" :to="`/admin/doctors/${route.params.doctorId}`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Doctor
        </router-link>
        <h1 class="page-heading">Edit Doctor</h1>
        <p class="page-sub">Update the doctor's profile and availability.</p>
      </div>
    </div>

    <!-- ── Loading ──────────────────────────────── -->
    <div v-if="isLoading" class="state-card">
      <svg class="state-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-dasharray="28 56"/>
      </svg>
      Loading doctor…
    </div>

    <!-- ── Load Error ────────────────────────────── -->
    <div v-else-if="loadError" class="form-error" role="alert">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="flex-shrink-0">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
      </svg>
      {{ loadError }}
    </div>

    <!-- ── Form ──────────────────────────────────── -->
    <form v-else class="form-layout" @submit.prevent="save" novalidate>

      <!-- ── Section: Account Credentials ─────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Account Credentials</div>
            <div class="section-sub">Login email and optional new password</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Email -->
          <div class="field">
            <label class="flabel" for="email">
              Email address <span class="required" aria-hidden="true">*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input id="email" v-model="form.email" type="email"
                class="finput finput--icon"
                placeholder="doctor@hospital.org" autocomplete="email" required />
            </div>
          </div>

          <!-- New Password -->
          <div class="field">
            <label class="flabel" for="new_password">
              New password <span class="optional-badge">optional</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <input id="new_password" v-model="form.new_password"
                :type="passwordVisible ? 'text' : 'password'"
                class="finput finput--icon finput--trail"
                placeholder="Leave blank to keep current"
                autocomplete="new-password" />
              <button type="button" class="eye-btn"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                @click="passwordVisible = !passwordVisible">
                <svg v-if="!passwordVisible" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Section: Professional Details ─────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
              <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Professional Details</div>
            <div class="section-sub">Name, specialization and contact information</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Full name -->
          <div class="field">
            <label class="flabel" for="full_name">Full name <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input id="full_name" v-model="form.full_name"
                class="finput finput--icon" placeholder="Dr. Jane Smith" required />
            </div>
          </div>

          <!-- Specialization -->
          <div class="field">
            <label class="flabel" for="specialization">Specialization <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
                <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/>
                <circle cx="20" cy="10" r="2"/>
              </svg>
              <input id="specialization" v-model="form.specialization"
                class="finput finput--icon" placeholder="e.g. Cardiologist" required />
            </div>
          </div>

          <!-- Qualification -->
          <div class="field">
            <label class="flabel" for="qualification">Qualification</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <input id="qualification" v-model="form.qualification"
                class="finput finput--icon" placeholder="e.g. MBBS, MD (optional)" />
            </div>
          </div>

          <!-- Phone -->
          <div class="field">
            <label class="flabel" for="phone">Phone <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2z"/>
              </svg>
              <input id="phone" v-model="form.phone" type="tel"
                class="finput finput--icon" placeholder="+1 (555) 000-0000" required />
            </div>
          </div>

          <!-- Consultation fee -->
          <div class="field">
            <label class="flabel" for="fee">Consultation fee</label>
            <div class="input-wrap">
              <span class="input-prefix">$</span>
              <input id="fee" v-model="form.consultation_fee" inputmode="decimal"
                class="finput finput--prefix" placeholder="0.00" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Section: Availability ──────────────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Availability Schedule</div>
            <div class="section-sub">Set when the doctor is available for appointments</div>
          </div>
        </div>

        <!-- Toggle row -->
        <div class="avail-toggle-row">
          <label class="toggle-switch" :class="{ 'toggle-switch--on': form.is_available }">
            <input type="checkbox" v-model="form.is_available" class="toggle-input" />
            <span class="toggle-track" aria-hidden="true">
              <span class="toggle-thumb"></span>
            </span>
          </label>
          <div class="toggle-label-text">
            <span class="toggle-label-main">{{ form.is_available ? 'Available for appointments' : 'Not available' }}</span>
            <span class="toggle-label-sub">{{ form.is_available ? 'Doctor will appear in booking' : 'Doctor is hidden from booking' }}</span>
          </div>
          <span class="avail-chip" :class="form.is_available ? 'chip-available' : 'chip-unavailable'">
            <span class="chip-dot" aria-hidden="true"></span>
            {{ form.is_available ? 'Available' : 'Unavailable' }}
          </span>
        </div>

        <Transition name="avail-expand">
          <div v-if="form.is_available" class="avail-detail">
            <!-- Days -->
            <div class="field">
              <label class="flabel">Available days</label>
              <div class="days-grid">
                <label
                  v-for="d in daysOfWeek" :key="d.key"
                  class="day-pill"
                  :class="{ 'day-pill--active': form.available_days.includes(d.key) }"
                >
                  <input type="checkbox" :value="d.key" v-model="form.available_days" class="sr-only" />
                  {{ d.label }}
                </label>
              </div>
              <p v-if="form.available_days.length > 0" class="days-summary">
                {{ form.available_days.length }} day{{ form.available_days.length !== 1 ? 's' : '' }} selected:
                <strong>{{ form.available_days.join(', ') }}</strong>
              </p>
            </div>

            <!-- Time range -->
            <div class="fields-grid fields-grid--half">
              <div class="field">
                <label class="flabel" for="start_time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Start time
                </label>
                <input id="start_time" v-model="form.start_time" type="time" class="finput" />
              </div>
              <div class="field">
                <label class="flabel" for="end_time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 8 14"/>
                  </svg>
                  End time
                </label>
                <input id="end_time" v-model="form.end_time" type="time" class="finput" />
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ── Save Error ──────────────────────────────── -->
      <Transition name="toast">
        <div v-if="saveError" class="form-error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="flex-shrink-0">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ saveError }}
        </div>
      </Transition>

      <!-- ── Actions ─────────────────────────────────── -->
      <div class="form-actions">
        <router-link class="btn-ghost" :to="`/admin/doctors/${route.params.doctorId}`">Cancel</router-link>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          <svg v-if="isSaving" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="15" height="15">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-dasharray="28 56"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ isSaving ? 'Saving…' : 'Save Changes' }}
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

/* ════════════════════════════════════════════════
   PAGE  — identical to CreateDoctor.vue
   ════════════════════════════════════════════════ */
.page {
  font-family: 'Nunito', sans-serif;
  max-width: 780px;
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: pg-in 0.25s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header { margin-bottom: 1.75rem; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-3);
  text-decoration: none;
  margin-bottom: 0.75rem;
  transition: color 0.15s;
}
.back-link:hover { color: var(--g-500, #2E8B57); }

.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 0.25rem;
  letter-spacing: -0.015em;
}
.page-sub { font-size: 0.82rem; color: var(--text-3); margin: 0; }

/* loading */
.state-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-3);
}
.state-spinner { color: var(--g-500, #2E8B57); animation: spin 0.85s linear infinite; }

/* ════════════════════════════════════════════════
   FORM LAYOUT
   ════════════════════════════════════════════════ */
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.form-section {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 1.375rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
}

.section-icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.section-icon--green { background: var(--g-100, #eaf6f0); color: var(--g-500, #2E8B57); border: 1.5px solid var(--g-200, #c6e8d6); }
.section-icon--blue  { background: #eff6ff; color: #3b75d4; border: 1.5px solid #bfdbfe; }
.section-icon--amber { background: #fef9ea; color: #c47b1a; border: 1.5px solid #fde68a; }

:global(.shell[data-theme="dark"]) .section-icon--green { background: #1a3327; border-color: #2a5540; color: #5dba83; }
:global(.shell[data-theme="dark"]) .section-icon--blue  { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .section-icon--amber { background: #2c2010; border-color: #6b4f00; color: #dba05a; }

.section-title { font-size: 0.9rem; font-weight: 700; color: var(--text-1); }
.section-sub   { font-size: 0.77rem; color: var(--text-3); margin-top: 2px; }

/* ── fields ── */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.fields-grid--half {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.field { display: flex; flex-direction: column; gap: 0.38rem; }

.flabel {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-3);
}
.required { color: #e05252; font-size: 0.75rem; }
.optional-badge {
  display: inline-flex; align-items: center;
  padding: 0.1rem 0.42rem; border-radius: 99px;
  background: var(--bg-page); border: 1px solid var(--border);
  font-size: 0.65rem; font-weight: 700;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--text-4);
}

/* ── inputs ── */
.input-wrap { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 0.8rem; color: var(--text-4); pointer-events: none; flex-shrink: 0; }
.input-prefix {
  position: absolute; left: 0.875rem;
  font-size: 0.875rem; font-weight: 700;
  color: var(--text-3); pointer-events: none;
}

.finput {
  width: 100%;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 9px;
  padding: 0.65rem 0.875rem;
  font-family: 'Nunito', sans-serif;
  font-size: 0.875rem;
  color: var(--text-1);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.finput::placeholder { color: var(--text-4); }
.finput:focus {
  border-color: var(--g-500, #2E8B57);
  background: var(--bg-topbar);
  box-shadow: 0 0 0 3px rgba(46,139,87,0.11);
}
.finput:disabled { opacity: 0.45; cursor: not-allowed; }
.finput--icon   { padding-left: 2.4rem; }
.finput--trail  { padding-right: 2.5rem; }
.finput--prefix { padding-left: 1.75rem; }

.eye-btn {
  position: absolute; right: 0.8rem;
  background: none; border: none; padding: 0;
  cursor: pointer; color: var(--text-4);
  display: flex; transition: color 0.15s;
}
.eye-btn:hover { color: var(--g-500, #2E8B57); }

/* ════════════════════════════════════════════════
   AVAILABILITY  — identical to CreateDoctor.vue
   ════════════════════════════════════════════════ */
.avail-toggle-row {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.125rem;
  border-radius: 10px;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.toggle-switch { position: relative; cursor: pointer; flex-shrink: 0; }
.toggle-input  { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  display: block; width: 42px; height: 24px;
  border-radius: 99px;
  background: var(--border); border: 1.5px solid var(--border);
  transition: background 0.2s, border-color 0.2s;
  position: relative;
}
.toggle-switch--on .toggle-track { background: var(--g-500, #2E8B57); border-color: var(--g-500, #2E8B57); }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.toggle-switch--on .toggle-thumb { transform: translateX(18px); }

.toggle-label-text { flex: 1; }
.toggle-label-main { display: block; font-size: 0.875rem; font-weight: 700; color: var(--text-1); }
.toggle-label-sub  { display: block; font-size: 0.75rem; color: var(--text-3); margin-top: 1px; }

.avail-chip {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.22rem 0.7rem; border-radius: 99px;
  font-size: 0.74rem; font-weight: 700; white-space: nowrap;
}
.chip-available   { background: #f0faf5; color: #1e6b41; border: 1px solid rgba(46,139,87,0.2); }
.chip-unavailable { background: #fdf4f4; color: #9b1d1d; border: 1px solid rgba(200,40,40,0.12); }
.chip-dot { width: 6px; height: 6px; border-radius: 50%; }
.chip-available   .chip-dot { background: var(--g-500, #2E8B57); }
.chip-unavailable .chip-dot { background: #dc2626; }

:global(.shell[data-theme="dark"]) .chip-available   { background: #1a3327; color: #6cd49a; border-color: #2a5540; }
:global(.shell[data-theme="dark"]) .chip-unavailable { background: #2c1212; color: #e08585; border-color: #6b2020; }

.avail-detail { display: flex; flex-direction: column; gap: 1.125rem; }

.avail-expand-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1), max-height 0.25s ease;
  max-height: 400px; overflow: hidden;
}
.avail-expand-leave-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
  max-height: 400px; overflow: hidden;
}
.avail-expand-enter-from, .avail-expand-leave-to {
  opacity: 0; max-height: 0; transform: translateY(-6px);
}

.days-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem; }
.day-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 38px; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-page);
  font-size: 0.78rem; font-weight: 700; color: var(--text-3);
  cursor: pointer; user-select: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.12s;
}
.day-pill:hover { border-color: var(--g-300, #8fcfad); color: var(--text-1); }
.day-pill--active { background: var(--g-500, #2E8B57); border-color: var(--g-500, #2E8B57); color: #fff; transform: scale(1.04); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

.days-summary { font-size: 0.77rem; color: var(--text-3); margin: 0.5rem 0 0; }
.days-summary strong { color: var(--g-600, #236B43); }

/* ── error ── */
.form-error {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.875rem 1.125rem; border-radius: 10px;
  background: #fff5f5; border: 1.5px solid #f5bcbc;
  color: #b82020; font-size: 0.84rem; font-weight: 600;
}
:global(.shell[data-theme="dark"]) .form-error { background: #2c1212; border-color: #6b2020; color: #e08585; }

.toast-enter-active, .toast-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-5px); }

/* ── actions ── */
.form-actions {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 0.75rem; padding-top: 0.25rem;
}

.btn-primary {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.65rem 1.375rem; border-radius: 9px;
  border: none; background: var(--g-500, #2E8B57);
  font-family: 'Nunito', sans-serif; font-size: 0.875rem; font-weight: 700;
  color: #fff; cursor: pointer;
  transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
  box-shadow: 0 2px 10px rgba(46,139,87,0.25);
}
.btn-primary:hover:not(:disabled)  { background: var(--g-600, #236B43); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(46,139,87,0.3); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.125rem; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif; font-size: 0.875rem; font-weight: 700;
  color: var(--text-3); cursor: pointer; text-decoration: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.btn-ghost:hover { background: var(--nav-hover); color: var(--text-1); border-color: var(--g-300, #8fcfad); }

.btn-spinner { animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>