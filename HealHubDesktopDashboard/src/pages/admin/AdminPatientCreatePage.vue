<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const createError = ref<string | null>(null)
const createLoading = ref(false)
const passwordVisible = ref(false)

const bloodGroups = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']
const genderOptions = ['Male', 'Female', 'Other']

const form = ref({
  email: '',
  password: '',
  full_name: '',
  phone: '',
  dob: '',
  gender: '',
  address: '',
  blood_group: '',
  emergency_contact: '',
  has_chronic_condition: false,
  condition_notes: '',
})

async function createPatient() {
  createLoading.value = true
  createError.value = null
  try {
    const payload = {
      email: form.value.email.trim(),
      password: form.value.password,
      full_name: form.value.full_name.trim(),
      phone: form.value.phone.trim(),
      dob: form.value.dob,
      gender: form.value.gender.trim(),
      address: form.value.address.trim(),
      blood_group: form.value.blood_group.trim() || null,
      emergency_contact: form.value.emergency_contact.trim() || null,
      has_chronic_condition: Boolean(form.value.has_chronic_condition),
      condition_notes: form.value.condition_notes.trim() || null,
    }
    await api.post('/api/admin/patients', payload, { token: auth.accessToken })
    router.replace({ path: '/admin/patients', query: { notice: 'patient_created' } })
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : 'Failed to create patient'
  } finally {
    createLoading.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- ══ Page Header ══════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" to="/admin/patients">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Patients
        </router-link>
        <h1 class="page-heading">Add New Patient</h1>
        <p class="page-sub">Fill in the details below to register a new patient account.</p>
      </div>
    </div>

    <form class="form-layout" @submit.prevent="createPatient" novalidate>

      <!-- ══ Section: Account ══════════════════════ -->
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
            <div class="section-sub">Login email and password for the patient</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Email -->
          <div class="field">
            <label class="flabel" for="email">
              Email address <span class="required">*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input id="email" v-model="form.email" type="email"
                class="finput finput--icon"
                placeholder="patient@email.com" autocomplete="email" required />
            </div>
          </div>

          <!-- Password -->
          <div class="field">
            <label class="flabel" for="password">
              Password <span class="required">*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <input id="password" v-model="form.password"
                :type="passwordVisible ? 'text' : 'password'"
                class="finput finput--icon finput--trail"
                placeholder="••••••••••" autocomplete="new-password" required />
              <button type="button" class="eye-btn"
                :aria-label="passwordVisible ? 'Hide' : 'Show'"
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

      <!-- ══ Section: Personal Info ════════════════ -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Personal Information</div>
            <div class="section-sub">Name, contact, and demographic details</div>
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
                class="finput finput--icon" placeholder="Jane Smith" required />
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

          <!-- DOB -->
          <div class="field">
            <label class="flabel" for="dob">Date of birth <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input id="dob" v-model="form.dob" type="date"
                class="finput finput--icon" required />
            </div>
          </div>

          <!-- Gender -->
          <div class="field">
            <label class="flabel" for="gender">Gender <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              <select id="gender" v-model="form.gender" class="finput finput--icon" required>
                <option value="" disabled>Select gender</option>
                <option v-for="g in genderOptions" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
          </div>

          <!-- Address -->
          <div class="field field--full">
            <label class="flabel" for="address">Address <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" style="top:.75rem;align-self:flex-start" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input id="address" v-model="form.address"
                class="finput finput--icon" placeholder="123 Main St, City, State" required />
            </div>
          </div>
        </div>
      </div>

      <!-- ══ Section: Medical Info ═════════════════ -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Medical Information</div>
            <div class="section-sub">Blood group, emergency contact and conditions</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Blood group -->
          <div class="field">
            <label class="flabel" for="blood_group">
              Blood group <span class="optional-badge">optional</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <select id="blood_group" v-model="form.blood_group" class="finput finput--icon">
                <option value="">Select (optional)</option>
                <option v-for="bg in bloodGroups" :key="bg" :value="bg">{{ bg }}</option>
              </select>
            </div>
          </div>

          <!-- Emergency contact -->
          <div class="field">
            <label class="flabel" for="emergency_contact">
              Emergency contact <span class="optional-badge">optional</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2z"/>
              </svg>
              <input id="emergency_contact" v-model="form.emergency_contact"
                class="finput finput--icon" placeholder="Name or phone number" />
            </div>
          </div>

          <!-- Chronic condition toggle -->
          <div class="field field--full">
            <div class="condition-toggle-row">
              <label class="toggle-switch" :class="{ 'toggle-switch--on': form.has_chronic_condition }">
                <input type="checkbox" v-model="form.has_chronic_condition" class="toggle-input" />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
              <div class="toggle-label-text">
                <span class="toggle-label-main">{{ form.has_chronic_condition ? 'Has chronic condition' : 'No chronic condition' }}</span>
                <span class="toggle-label-sub">{{ form.has_chronic_condition ? 'Add notes below' : 'Toggle to record a chronic condition' }}</span>
              </div>
              <span class="condition-chip" :class="form.has_chronic_condition ? 'chip--yes' : 'chip--no'">
                <span class="chip-dot"></span>
                {{ form.has_chronic_condition ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>

          <!-- Condition notes -->
          <Transition name="avail-expand">
            <div v-if="form.has_chronic_condition" class="field field--full">
              <label class="flabel" for="condition_notes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Condition notes <span class="optional-badge">optional</span>
              </label>
              <textarea id="condition_notes" v-model="form.condition_notes" rows="3"
                class="finput ftextarea"
                placeholder="Describe the chronic condition, medications, or relevant notes…" />
            </div>
          </Transition>
        </div>
      </div>

      <!-- ══ Error ══════════════════════════════════ -->
      <Transition name="toast">
        <div v-if="createError" class="form-error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ createError }}
        </div>
      </Transition>

      <!-- ══ Actions ════════════════════════════════ -->
      <div class="form-actions">
        <router-link class="btn-ghost" to="/admin/patients">Cancel</router-link>
        <button type="submit" class="btn-primary" :disabled="createLoading">
          <svg v-if="createLoading" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="15" height="15">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-dasharray="28 56"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          {{ createLoading ? 'Creating…' : 'Create Patient' }}
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

/* ════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════ */
.page {
  font-family: 'Nunito', sans-serif;
  max-width: 780px;
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: pg-in .25s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header { margin-bottom: 1.75rem; }
.back-link {
  display: inline-flex; align-items: center; gap: .4rem;
  font-size: .78rem; font-weight: 700;
  color: var(--text-3); text-decoration: none;
  margin-bottom: .75rem; transition: color .15s;
}
.back-link:hover { color: var(--g-500, #2E8B57); }

.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.6rem; font-weight: 600;
  color: var(--text-1); margin: 0 0 .25rem;
  letter-spacing: -.015em;
}
.page-sub { font-size: .82rem; color: var(--text-3); margin: 0; }

/* ════════════════════════════════════════════════
   FORM LAYOUT
   ════════════════════════════════════════════════ */
.form-layout {
  display: flex; flex-direction: column; gap: 1.125rem;
}

.form-section {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-head {
  display: flex; align-items: flex-start; gap: .875rem;
  margin-bottom: 1.375rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
}

.section-icon {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.section-icon--blue  { background: #eff6ff; color: #3b75d4; border: 1.5px solid #bfdbfe; }
.section-icon--green { background: var(--g-100, #eaf6f0); color: var(--g-500, #2E8B57); border: 1.5px solid var(--g-200, #c6e8d6); }
.section-icon--red   { background: #fff5f5; color: #dc2626; border: 1.5px solid #fecaca; }

:global(.shell[data-theme="dark"]) .section-icon--blue  { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .section-icon--green { background: #1a3327; border-color: #2a5540; color: #5dba83; }
:global(.shell[data-theme="dark"]) .section-icon--red   { background: #2c1212; border-color: #6b2020; color: #f87171; }

.section-title { font-size: .9rem; font-weight: 700; color: var(--text-1); }
.section-sub   { font-size: .77rem; color: var(--text-3); margin-top: 2px; }

/* ── fields ── */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.field { display: flex; flex-direction: column; gap: .38rem; }
.field--full { grid-column: 1 / -1; }

.flabel {
  display: flex; align-items: center; gap: .3rem;
  font-size: .72rem; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-3);
}
.required { color: #e05252; font-size: .75rem; }
.optional-badge {
  display: inline-flex; align-items: center;
  padding: .1rem .42rem; border-radius: 99px;
  background: var(--bg-page); border: 1px solid var(--border);
  font-size: .65rem; font-weight: 700;
  letter-spacing: .04em; text-transform: uppercase;
  color: var(--text-4);
}

/* ── inputs ── */
.input-wrap { position: relative; display: flex; align-items: center; }
.input-icon {
  position: absolute; left: .8rem;
  color: var(--text-4); pointer-events: none; flex-shrink: 0;
}

.finput {
  width: 100%;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 9px;
  padding: .65rem .875rem;
  font-family: 'Nunito', sans-serif;
  font-size: .875rem;
  color: var(--text-1);
  outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
  box-sizing: border-box;
  appearance: none;
}
.finput::placeholder { color: var(--text-4); }
.finput:focus {
  border-color: var(--g-500, #2E8B57);
  background: var(--bg-topbar);
  box-shadow: 0 0 0 3px rgba(46,139,87,.11);
}
.finput--icon  { padding-left: 2.4rem; }
.finput--trail { padding-right: 2.5rem; }

/* select arrow */
select.finput {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right .875rem center;
  padding-right: 2.25rem;
}

/* textarea */
.ftextarea {
  resize: vertical;
  min-height: 90px;
  line-height: 1.55;
}

.eye-btn {
  position: absolute; right: .8rem;
  background: none; border: none; padding: 0;
  cursor: pointer; color: var(--text-4);
  display: flex; transition: color .15s;
}
.eye-btn:hover { color: var(--g-500, #2E8B57); }

/* ════════════════════════════════════════════════
   CHRONIC CONDITION TOGGLE  (mirrors availability)
   ════════════════════════════════════════════════ */
.condition-toggle-row {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.125rem;
  border-radius: 10px;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  flex-wrap: wrap;
}

.toggle-switch { position: relative; cursor: pointer; flex-shrink: 0; }
.toggle-input  { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  display: block; width: 42px; height: 24px; border-radius: 99px;
  background: var(--border); border: 1.5px solid var(--border);
  transition: background .2s, border-color .2s; position: relative;
}
.toggle-switch--on .toggle-track { background: var(--g-500, #2E8B57); border-color: var(--g-500, #2E8B57); }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: white; box-shadow: 0 1px 3px rgba(0,0,0,.15);
  transition: transform .2s cubic-bezier(.34,1.56,.64,1);
}
.toggle-switch--on .toggle-thumb { transform: translateX(18px); }

.toggle-label-text { flex: 1; }
.toggle-label-main { display: block; font-size: .875rem; font-weight: 700; color: var(--text-1); }
.toggle-label-sub  { display: block; font-size: .75rem; color: var(--text-3); margin-top: 1px; }

.condition-chip {
  display: inline-flex; align-items: center; gap: .375rem;
  padding: .22rem .7rem; border-radius: 99px;
  font-size: .74rem; font-weight: 700; white-space: nowrap;
}
.chip--yes { background: #fff5f5; color: #b82020; border: 1px solid rgba(220,38,38,.2); }
.chip--no  { background: var(--g-100, #eaf6f0); color: var(--g-600, #236B43); border: 1px solid rgba(46,139,87,.2); }
.chip-dot  { width: 6px; height: 6px; border-radius: 50%; }
.chip--yes .chip-dot { background: #dc2626; }
.chip--no  .chip-dot { background: var(--g-500, #2E8B57); }

:global(.shell[data-theme="dark"]) .chip--yes { background: #2c1212; color: #e08585; border-color: #6b2020; }
:global(.shell[data-theme="dark"]) .chip--no  { background: #1a3327; color: #6cd49a; border-color: #2a5540; }

/* expand animation */
.avail-expand-enter-active {
  transition: opacity .22s ease, transform .22s cubic-bezier(.22,1,.36,1), max-height .25s ease;
  max-height: 200px; overflow: hidden;
}
.avail-expand-leave-active {
  transition: opacity .15s ease, max-height .2s ease;
  max-height: 200px; overflow: hidden;
}
.avail-expand-enter-from, .avail-expand-leave-to {
  opacity: 0; max-height: 0; transform: translateY(-6px);
}

/* ── error ── */
.form-error {
  display: flex; align-items: center; gap: .6rem;
  padding: .875rem 1.125rem; border-radius: 10px;
  background: #fff5f5; border: 1.5px solid #f5bcbc;
  color: #b82020; font-size: .84rem; font-weight: 600;
}
:global(.shell[data-theme="dark"]) .form-error { background: #2c1212; border-color: #6b2020; color: #e08585; }

.toast-enter-active, .toast-leave-active { transition: opacity .22s ease, transform .22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-5px); }

/* ── actions ── */
.form-actions {
  display: flex; align-items: center; justify-content: flex-end;
  gap: .75rem; padding-top: .25rem;
}

.btn-primary {
  display: inline-flex; align-items: center; gap: .45rem;
  padding: .65rem 1.375rem; border-radius: 9px;
  border: none; background: var(--g-500, #2E8B57);
  font-family: 'Nunito', sans-serif; font-size: .875rem; font-weight: 700;
  color: #fff; cursor: pointer;
  transition: background .15s, transform .12s, box-shadow .15s;
  box-shadow: 0 2px 10px rgba(46,139,87,.25);
}
.btn-primary:hover:not(:disabled)  { background: var(--g-600, #236B43); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(46,139,87,.3); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .65rem 1.125rem; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif; font-size: .875rem; font-weight: 700;
  color: var(--text-3); cursor: pointer; text-decoration: none;
  transition: background .15s, border-color .15s, color .15s;
}
.btn-ghost:hover { background: var(--nav-hover); color: var(--text-1); border-color: var(--g-300, #8fcfad); }

.btn-spinner { animation: spin .85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>