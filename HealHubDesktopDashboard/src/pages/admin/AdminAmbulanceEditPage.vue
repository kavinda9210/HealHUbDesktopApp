<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type AmbulanceRow = {
  ambulance_id: number
  user_id: string
  ambulance_number?: string
  driver_name?: string
  driver_phone?: string
  is_available?: boolean
  email?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const ambulanceId = computed(() => {
  const raw = route.params.ambulanceId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)

const form = ref({
  email: '',
  ambulance_number: '',
  driver_name: '',
  driver_phone: '',
  is_available: true,
})

async function load() {
  if (!Number.isFinite(ambulanceId.value)) {
    loadError.value = 'Invalid ambulance id'
    return
  }

  isLoading.value = true
  loadError.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow }>(`/api/admin/ambulances/${ambulanceId.value}`, {
      token: auth.accessToken,
    })

    const a = res.data
    form.value = {
      email: a.email || '',
      ambulance_number: a.ambulance_number || '',
      driver_name: a.driver_name || '',
      driver_phone: a.driver_phone || '',
      is_available: Boolean(a.is_available ?? true),
    }
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Failed to load ambulance staff'
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!Number.isFinite(ambulanceId.value)) return

  isSaving.value = true
  saveError.value = null
  try {
    const payload = {
      email: form.value.email.trim(),
      ambulance_number: form.value.ambulance_number.trim(),
      driver_name: form.value.driver_name.trim(),
      driver_phone: form.value.driver_phone.trim(),
      is_available: Boolean(form.value.is_available),
    }

    await api.put(`/api/admin/ambulances/${ambulanceId.value}`, payload, { token: auth.accessToken })
    router.replace({ path: `/admin/ambulances/${ambulanceId.value}`, query: { notice: 'ambulance_updated' } })
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Failed to save ambulance staff'
  } finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">

    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" :to="`/admin/ambulances/${route.params.ambulanceId}`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Ambulance Staff
        </router-link>
        <h1 class="page-heading">Edit Ambulance Staff</h1>
        <p class="page-sub">Update staff details and availability.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="state-card">
      <svg class="state-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-dasharray="28 56"/>
      </svg>
      Loading ambulance staff…
    </div>

    <!-- Load Error -->
    <div v-else-if="loadError" class="form-error" role="alert">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
      </svg>
      {{ loadError }}
    </div>

    <!-- Form -->
    <form v-else class="form-layout" @submit.prevent="save" novalidate>

      <!-- Account -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Account Credentials</div>
            <div class="section-sub">Login email for the ambulance staff</div>
          </div>
        </div>

        <div class="fields-grid">
          <div class="field">
            <label class="flabel" for="email">Email address <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input id="email" v-model="form.email" type="email" class="finput finput--icon" placeholder="staff@hospital.org" autocomplete="email" required />
            </div>
          </div>
        </div>
      </div>

      <!-- Staff -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Staff Details</div>
            <div class="section-sub">Ambulance number and driver contact information</div>
          </div>
        </div>

        <div class="fields-grid">
          <div class="field">
            <label class="flabel" for="ambulance_number">Ambulance number <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <input id="ambulance_number" v-model="form.ambulance_number" class="finput finput--icon" placeholder="AMB-001" required />
            </div>
          </div>

          <div class="field">
            <label class="flabel" for="driver_name">Driver name <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input id="driver_name" v-model="form.driver_name" class="finput finput--icon" placeholder="John Doe" required />
            </div>
          </div>

          <div class="field">
            <label class="flabel" for="driver_phone">Driver phone <span class="required">*</span></label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2z"/>
              </svg>
              <input id="driver_phone" v-model="form.driver_phone" type="tel" class="finput finput--icon" placeholder="+1 (555) 000-0000" required />
            </div>
          </div>
        </div>
      </div>

      <!-- Availability -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Availability</div>
            <div class="section-sub">Control whether the unit is available for dispatch</div>
          </div>
        </div>

        <div class="avail-toggle-row">
          <label class="toggle-switch" :class="{ 'toggle-switch--on': form.is_available }">
            <input type="checkbox" v-model="form.is_available" class="toggle-input" />
            <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
          </label>
          <div class="toggle-label-text">
            <span class="toggle-label-main">{{ form.is_available ? 'Available for dispatch' : 'Not available' }}</span>
            <span class="toggle-label-sub">{{ form.is_available ? 'Unit will appear as available' : 'Unit will be marked unavailable' }}</span>
          </div>
          <span class="avail-chip" :class="form.is_available ? 'chip-available' : 'chip-unavailable'">
            <span class="chip-dot" aria-hidden="true"></span>
            {{ form.is_available ? 'Available' : 'Unavailable' }}
          </span>
        </div>
      </div>

      <!-- Save Error -->
      <Transition name="toast">
        <div v-if="saveError" class="form-error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ saveError }}
        </div>
      </Transition>

      <div class="form-actions">
        <router-link class="btn-ghost" :to="`/admin/ambulances/${route.params.ambulanceId}`">Cancel</router-link>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          <svg v-if="isSaving" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="15" height="15">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
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
  font-size: 1.55rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 .35rem;
  letter-spacing: -.015em;
}
.page-sub { font-size: .84rem; color: var(--text-3); margin: 0; }

.state-card {
  display: flex; align-items: center; gap: .6rem;
  padding: .95rem 1.125rem;
  border-radius: 12px;
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  color: var(--text-3);
  font-weight: 700;
  font-size: .86rem;
}
.state-spinner { animation: spin .85s linear infinite; }

.form-layout { display: flex; flex-direction: column; gap: 1.25rem; }
.form-section {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-head {
  display: flex; align-items: flex-start; gap: .875rem;
  margin-bottom: 1.25rem; padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
}
.section-icon {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.section-icon--blue  { background: #eff6ff; color: #3b75d4; border: 1.5px solid #bfdbfe; }
.section-icon--red   { background: #fff5f5; color: #dc2626; border: 1.5px solid #fecaca; }
.section-icon--amber { background: #fef9ea; color: #c47b1a; border: 1.5px solid #fde68a; }

:global(.shell[data-theme="dark"]) .section-icon--blue  { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .section-icon--red   { background: #2c1212; border-color: #6b2020; color: #f87171; }
:global(.shell[data-theme="dark"]) .section-icon--amber { background: #2c2010; border-color: #6b4f00; color: #dba05a; }

.section-title { font-size: .9rem; font-weight: 800; color: var(--text-1); }
.section-sub   { font-size: .77rem; color: var(--text-3); margin-top: 2px; }

.fields-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 768px) {
  .fields-grid { grid-template-columns: 1fr 1fr; }
}

.field { display: flex; flex-direction: column; gap: .38rem; }

.flabel {
  display: flex; align-items: center; gap: .3rem;
  font-size: .72rem; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-3);
}
.required { color: #dc2626; font-weight: 900; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: .8rem; color: var(--text-4); pointer-events: none; flex-shrink: 0; }

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
}
.finput::placeholder { color: var(--text-4); }
.finput:focus {
  border-color: var(--g-500, #2E8B57);
  background: var(--bg-topbar);
  box-shadow: 0 0 0 3px rgba(46,139,87,.11);
}
.finput--icon { padding-left: 2.4rem; }

.avail-toggle-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.125rem;
  border-radius: 10px;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  flex-wrap: wrap;
}

.toggle-switch { position: relative; cursor: pointer; flex-shrink: 0; }
.toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  display: block;
  width: 42px;
  height: 24px;
  border-radius: 99px;
  background: var(--border);
  border: 1.5px solid var(--border);
  transition: background .2s, border-color .2s;
  position: relative;
}
.toggle-switch--on .toggle-track {
  background: var(--g-500, #2E8B57);
  border-color: var(--g-500, #2E8B57);
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
  transition: transform .2s cubic-bezier(.34,1.56,.64,1);
}
.toggle-switch--on .toggle-thumb { transform: translateX(18px); }

.toggle-label-text { flex: 1; }
.toggle-label-main { display: block; font-size: .875rem; font-weight: 800; color: var(--text-1); }
.toggle-label-sub  { display: block; font-size: .75rem; color: var(--text-3); margin-top: 1px; }

.avail-chip {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  padding: .22rem .7rem;
  border-radius: 99px;
  font-size: .74rem;
  font-weight: 800;
  white-space: nowrap;
}
.chip-available   { background: #f0faf5; color: #1e6b41; border: 1px solid rgba(46,139,87,.2); }
.chip-unavailable { background: #fdf4f4; color: #9b1d1d; border: 1px solid rgba(200,40,40,.12); }
.chip-dot { width: 6px; height: 6px; border-radius: 50%; }
.chip-available .chip-dot   { background: var(--g-500, #2E8B57); }
.chip-unavailable .chip-dot { background: #dc2626; }

:global(.shell[data-theme="dark"]) .chip-available   { background: #1a3327; color: #6cd49a; border-color: #2a5540; }
:global(.shell[data-theme="dark"]) .chip-unavailable { background: #2c1212; color: #e08585; border-color: #6b2020; }

.form-error {
  display: flex; align-items: center; gap: .6rem;
  padding: .875rem 1.125rem;
  border-radius: 10px;
  background: #fff5f5;
  border: 1.5px solid #f5bcbc;
  color: #b82020;
  font-size: .84rem;
  font-weight: 700;
}
:global(.shell[data-theme="dark"]) .form-error { background: #2c1212; border-color: #6b2020; color: #e08585; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: .75rem;
  padding-top: .5rem;
}

.btn-primary {
  display: inline-flex; align-items: center; gap: .45rem;
  padding: .65rem 1.375rem;
  border-radius: 9px;
  border: none;
  background: var(--g-500, #2E8B57);
  font-family: 'Nunito', sans-serif;
  font-size: .875rem;
  font-weight: 800;
  color: #fff;
  cursor: pointer;
  text-decoration: none;
  transition: background .15s, transform .12s, box-shadow .15s;
  box-shadow: 0 2px 10px rgba(46,139,87,.25);
}
.btn-primary:hover:not(:disabled)  { background: var(--g-600, #236B43); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(46,139,87,.3); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: .55; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .65rem 1.125rem;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif;
  font-size: .875rem;
  font-weight: 800;
  color: var(--text-3);
  cursor: pointer;
  text-decoration: none;
  transition: background .15s, border-color .15s, color .15s;
}
.btn-ghost:hover { background: var(--nav-hover); color: var(--text-1); border-color: var(--g-300, #8fcfad); }

.btn-spinner { animation: spin .85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toast-enter-active, .toast-leave-active { transition: opacity .22s ease, transform .22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-5px); }
</style>
