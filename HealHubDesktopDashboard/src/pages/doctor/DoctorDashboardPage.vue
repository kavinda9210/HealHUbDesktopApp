<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

type AppointmentRow = {
  appointment_id: number
  patient_id: number
  doctor_id: number
  appointment_date: string
  appointment_time: string
  status: string
}

const auth = useAuthStore()
const toast = useToastStore()

const signedInAs = computed(() => auth.user?.full_name || auth.user?.email || 'Doctor')

const todayIso = computed(() => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
})

const todaysAppointments = ref<AppointmentRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function loadToday() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AppointmentRow[] }>('/api/doctor/appointments', {
      token: auth.accessToken,
      query: { date_from: todayIso.value },
    })
    const rows = res.data || []
    todaysAppointments.value = rows.filter((r) => r.appointment_date === todayIso.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load today\'s appointments'
  } finally {
    isLoading.value = false
  }
}

function refresh() {
  toast.show('Refreshing…', 'info', 1200)
  loadToday()
}

const greet = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

onMounted(loadToday)
onActivated(loadToday)
</script>

<template>
  <div class="dashboard">

    <!-- ── Page header ─────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <p class="greet-line">
          <span class="greet-wave">👋</span>
          {{ greet() }}, <strong>{{ signedInAs }}</strong>
        </p>
        <h1 class="page-heading">Overview</h1>
        <p class="page-sub">Here are your tasks and appointments for today.</p>
      </div>
      <button class="refresh-btn" :class="{ spinning: isLoading }" :disabled="isLoading" @click="refresh" aria-label="Refresh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        <span>{{ isLoading ? 'Refreshing…' : 'Refresh' }}</span>
      </button>
    </div>

    <!-- ── Error ───────────────────────────────── -->
    <Transition name="fade">
      <div v-if="error" class="error-banner" role="alert">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="error-icon">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        {{ error }}
      </div>
    </Transition>

    <!-- ── Quick actions ───────────────────────── -->
    <div class="section-label">Quick Actions</div>
    <div class="quick-grid">
      <router-link class="quick-card" to="/doctor/patients">
        <div class="quick-icon quick-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <path d="M9 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Patients</span>
          <span class="quick-sub">Search patients, clinics, medication, and reports</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>

      <router-link class="quick-card" to="/doctor/appointments">
        <div class="quick-icon quick-icon--teal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M7 3v3"/>
            <path d="M17 3v3"/>
            <path d="M4 7h16"/>
            <path d="M5 6h14a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1"/>
            <path d="M8 11h4"/>
            <path d="M8 15h6"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Appointments</span>
          <span class="quick-sub">Accept or decline appointment requests</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>

      <router-link class="quick-card" to="/doctor/notifications">
        <div class="quick-icon quick-icon--amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Notifications</span>
          <span class="quick-sub">Patient requests and alerts</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>

      <router-link class="quick-card" to="/doctor/profile">
        <div class="quick-icon quick-icon--sage">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4"/>
            <path d="M4 21v-1a7 7 0 0 1 14 0v1"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Profile</span>
          <span class="quick-sub">Update your account details</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>
    </div>

    <div class="section-label section-label--spaced">Today’s Appointments</div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">Appointments for today</div>
          <div class="panel-sub">Quick actions to open a patient, add a report, or prescribe medication</div>
        </div>
        <button class="panel-btn" :disabled="isLoading" @click="refresh">Refresh</button>
      </div>

      <div v-if="!error && isLoading" class="panel-note">Loading…</div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Status</th>
              <th>Patient ID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in todaysAppointments" :key="a.appointment_id">
              <td>{{ a.appointment_time }}</td>
              <td>{{ a.status }}</td>
              <td>{{ a.patient_id }}</td>
              <td class="actions">
                <router-link class="row-btn" :to="`/doctor/patients/${a.patient_id}/overview`">Open</router-link>
                <router-link class="row-btn" :to="`/doctor/patients/${a.patient_id}/reports/add`">Add report</router-link>
                <router-link class="row-btn row-btn--primary" :to="`/doctor/patients/${a.patient_id}/medicines/add`">Prescribe</router-link>
              </td>
            </tr>
            <tr v-if="!isLoading && todaysAppointments.length === 0">
              <td class="empty" colspan="4">No appointments scheduled for today.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

.dashboard {
  font-family: 'Nunito', sans-serif;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: pg-in 0.3s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}
.greet-line {
  font-size: 0.83rem;
  color: var(--text-3);
  margin: 0 0 0.3rem;
}
.greet-wave { margin-right: 0.3rem; }
.greet-line strong { color: var(--text-2); font-weight: 700; }

.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.65rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 0.25rem;
  letter-spacing: -0.02em;
}
.page-sub {
  font-size: 0.83rem;
  color: var(--text-3);
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1rem;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-3);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.refresh-btn:hover:not(:disabled) {
  background: var(--g-100, #eaf6f0);
  border-color: var(--g-300, #8fcfad);
  color: var(--g-600, #236B43);
}
.refresh-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.refresh-btn svg { flex-shrink: 0; }
.refresh-btn.spinning svg { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: #fff5f5;
  border: 1px solid #f5c0c0;
  color: #b82020;
  font-size: 0.84rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}
.error-icon { flex-shrink: 0; }

:global(.shell[data-theme="dark"]) .error-banner {
  background: color-mix(in srgb, var(--g-500) 10%, var(--bg-topbar));
  border-color: color-mix(in srgb, var(--g-500) 20%, var(--border));
  color: var(--g-500);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.section-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-4);
  margin-bottom: 0.75rem;
}

.section-label--spaced { margin-top: 1.85rem; }

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1rem 1rem 1.125rem;
  background: var(--bg-topbar);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  box-shadow: var(--shadow-sm);
}
.quick-card:hover {
  background: var(--nav-hover, #edf6f1);
  border-color: var(--g-300, #8fcfad);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.quick-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.quick-icon--green { background: #e6f4ee; color: #2E8B57; }
.quick-icon--teal  { background: #e6f0fb; color: #3b75d4; }
.quick-icon--sage  { background: #f0f4e6; color: #6a8c1a; }
.quick-icon--amber { background: #fdf3e6; color: #c47b1a; }

:global(.shell[data-theme="dark"]) .quick-icon--green,
:global(.shell[data-theme="dark"]) .quick-icon--teal,
:global(.shell[data-theme="dark"]) .quick-icon--sage,
:global(.shell[data-theme="dark"]) .quick-icon--amber {
  background: color-mix(in srgb, var(--g-500) 14%, var(--bg-topbar));
  color: var(--g-500);
}

.quick-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.quick-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quick-sub {
  font-size: 0.75rem;
  color: var(--text-3);
  font-weight: 500;
}
.quick-arrow {
  color: var(--text-4);
  flex-shrink: 0;
  transition: transform 0.15s, color 0.15s;
}
.quick-card:hover .quick-arrow {
  transform: translateX(3px);
  color: var(--g-500, #2E8B57);
}

.panel {
  background: var(--bg-topbar);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--border-light);
}

.panel-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-1);
}

.panel-sub {
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: var(--text-3);
  font-weight: 600;
}

.panel-btn {
  padding: 0.55rem 0.95rem;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-family: 'Nunito', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-3);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.panel-btn:hover:not(:disabled) {
  background: var(--g-100, #eaf6f0);
  border-color: var(--g-300, #8fcfad);
  color: var(--g-600, #236B43);
}
.panel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.panel-note {
  padding: 0.85rem 1.25rem;
  font-size: 0.84rem;
  color: var(--text-3);
  font-weight: 700;
}

.table-wrap { overflow: auto; }

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  color: var(--text-2);
}

.table thead th {
  text-align: left;
  padding: 0.75rem 1.25rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 900;
  color: var(--text-4);
  background: color-mix(in srgb, var(--bg-topbar) 70%, var(--bg-page));
  border-bottom: 1px solid var(--border-light);
}

.table tbody td {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--border-light);
  vertical-align: middle;
}

.actions {
  text-align: right;
  white-space: nowrap;
}

.row-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.38rem 0.7rem;
  border-radius: 9px;
  border: 1.25px solid var(--border);
  background: transparent;
  text-decoration: none;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--text-3);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  margin-left: 0.4rem;
}

.row-btn:hover {
  background: var(--nav-hover);
  color: var(--text-1);
}

.row-btn--primary {
  background: linear-gradient(135deg, var(--g-500), var(--g-600));
  border-color: color-mix(in srgb, var(--g-600) 65%, var(--border));
  color: white;
}

.row-btn--primary:hover {
  filter: brightness(1.03);
  background: linear-gradient(135deg, var(--g-600), var(--g-500));
  color: white;
}

.empty {
  padding: 1.25rem 1.25rem;
  color: var(--text-3);
  font-weight: 700;
}

@media (max-width: 720px) {
  .actions { text-align: left; white-space: normal; }
  .row-btn { margin-left: 0; margin-right: 0.4rem; margin-top: 0.35rem; }
}
</style>
