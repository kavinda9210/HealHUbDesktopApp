<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

type DashboardStats = {
  doctors: number
  patients: number
  ambulances: number
  new_users: number
  new_users_since?: string
  as_of?: string
}

const stats = ref<DashboardStats | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/api/admin/dashboard-stats', {
      token: auth.accessToken,
    })
    stats.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load dashboard stats'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
onActivated(load)

const greet = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
</script>

<template>
  <div class="dashboard">

    <!-- ── Page header ─────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <p class="greet-line">
          <span class="greet-wave">👋</span>
          {{ greet() }}, <strong>{{ auth.user?.full_name || auth.user?.email }}</strong>
        </p>
        <h1 class="page-heading">Overview</h1>
        <p class="page-sub">Here's what's happening across your clinic today.</p>
      </div>
      <button class="refresh-btn" :class="{ spinning: isLoading }" :disabled="isLoading" @click="load" aria-label="Refresh stats">
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

    <!-- ── Stat cards ──────────────────────────── -->
    <div class="stats-grid">

      <!-- Doctors -->
      <div class="stat-card stat-card--doctors" :class="{ 'is-loading': isLoading }">
        <div class="stat-top">
          <span class="stat-label">Total Doctors</span>
          <div class="stat-icon-wrap stat-icon--doctors">
            <!-- stethoscope -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
              <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">
          <span v-if="isLoading" class="stat-shimmer"></span>
          <span v-else>{{ stats?.doctors ?? '—' }}</span>
        </div>
        <div class="stat-footer">
          <router-link class="stat-link" to="/admin/doctors">
            Manage doctors
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </router-link>
        </div>
        <div class="stat-bar stat-bar--doctors" aria-hidden="true"></div>
      </div>

      <!-- Patients -->
      <div class="stat-card stat-card--patients" :class="{ 'is-loading': isLoading }">
        <div class="stat-top">
          <span class="stat-label">Total Patients</span>
          <div class="stat-icon-wrap stat-icon--patients">
            <!-- heart-pulse -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>
              <path d="M3.22 12H9.5l1.5-3 2 4.5 1.5-3H22"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">
          <span v-if="isLoading" class="stat-shimmer"></span>
          <span v-else>{{ stats?.patients ?? '—' }}</span>
        </div>
        <div class="stat-footer">
          <router-link class="stat-link" to="/admin/patients">
            Manage patients
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </router-link>
        </div>
        <div class="stat-bar stat-bar--patients" aria-hidden="true"></div>
      </div>

      <!-- Ambulances -->
      <div class="stat-card stat-card--ambulances" :class="{ 'is-loading': isLoading }">
        <div class="stat-top">
          <span class="stat-label">Ambulance Staff</span>
          <div class="stat-icon-wrap stat-icon--ambulances">
            <!-- ambulance truck -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M10 17H3a1 1 0 01-1-1V6a1 1 0 011-1h10a1 1 0 011 1v3"/>
              <path d="M14 9h4l3 3v3h-7V9z"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
              <path d="M6 10h4M8 8v4"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">
          <span v-if="isLoading" class="stat-shimmer"></span>
          <span v-else>{{ stats?.ambulances ?? '—' }}</span>
        </div>
        <div class="stat-footer">
          <router-link class="stat-link" to="/admin/ambulances">
            Manage staff
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </router-link>
        </div>
        <div class="stat-bar stat-bar--ambulances" aria-hidden="true"></div>
      </div>

      <!-- New users -->
      <div class="stat-card stat-card--newusers" :class="{ 'is-loading': isLoading }">
        <div class="stat-top">
          <span class="stat-label">New Users <span class="label-badge">7 days</span></span>
          <div class="stat-icon-wrap stat-icon--newusers">
            <!-- user-plus / trending -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M19 8v6M22 11h-6"/>
            </svg>
          </div>
        </div>
        <div class="stat-value">
          <span v-if="isLoading" class="stat-shimmer"></span>
          <span v-else>{{ stats?.new_users ?? '—' }}</span>
        </div>
        <div class="stat-footer">
          <span class="stat-updated">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
              <circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5l2 1.5"/>
            </svg>
            Updated {{ stats?.as_of || '—' }}
          </span>
        </div>
        <div class="stat-bar stat-bar--newusers" aria-hidden="true"></div>
      </div>

    </div>

    <!-- ── Quick actions ───────────────────────── -->
    <div class="section-label">Quick Actions</div>
    <div class="quick-grid">
      <router-link class="quick-card" to="/admin/doctors/create">
        <div class="quick-icon quick-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21a8 8 0 10-16 0"/>
            <path d="M16 19h6M19 16v6"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Add Doctor</span>
          <span class="quick-sub">Register a new doctor</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>

      <router-link class="quick-card" to="/admin/patients/create">
        <div class="quick-icon quick-icon--teal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21a8 8 0 10-16 0"/>
            <path d="M16 19h6M19 16v6"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Add Patient</span>
          <span class="quick-sub">Register a new patient</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>

      <router-link class="quick-card" to="/admin/ambulances/create">
        <div class="quick-icon quick-icon--sage">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M10 17H3a1 1 0 01-1-1V6a1 1 0 011-1h10a1 1 0 011 1v3"/>
            <path d="M14 9h4l3 3v3h-7V9z"/>
            <circle cx="7.5" cy="17.5" r="2.5"/>
            <circle cx="17.5" cy="17.5" r="2.5"/>
            <path d="M6 10h4M8 8v4"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Add Ambulance Staff</span>
          <span class="quick-sub">Register a new driver or paramedic</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>

      <router-link class="quick-card" to="/admin/notifications">
        <div class="quick-icon quick-icon--amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
            <path d="M2 8c0-2.2.7-4.3 2-6M22 8a10 10 0 00-2-6"/>
          </svg>
        </div>
        <div class="quick-text">
          <span class="quick-title">Notifications</span>
          <span class="quick-sub">View recent alerts</span>
        </div>
        <svg class="quick-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 4l4 4-4 4"/>
        </svg>
      </router-link>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

/* ════════════════════════════════════════════════
   Token inheritance from layout shell
   ════════════════════════════════════════════════ */
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

/* ── Page header ──────────────────────────────── */
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

/* ── Error ────────────────────────────────────── */
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

/* Dark error */
:global(.shell[data-theme="dark"]) .error-banner {
  background: #2c1212;
  border-color: #6b2020;
  color: #e08585;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Stats grid ───────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

/* Stat card base */
.stat-card {
  background: var(--bg-topbar);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.25rem 1.25rem 1rem;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.06));
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.stat-card:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));
  transform: translateY(-2px);
}

/* Stat top row */
.stat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.stat-label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.label-badge {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
  text-transform: uppercase;
}

/* Icon wrapper */
.stat-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon--doctors   { background: #e6f4ee; color: #2E8B57; }
.stat-icon--patients  { background: #e6f0fb; color: #3b75d4; }
.stat-icon--ambulances{ background: #f0f4e6; color: #6a8c1a; }
.stat-icon--newusers  { background: #fdf3e6; color: #c47b1a; }

:global(.shell[data-theme="dark"]) .stat-icon--doctors    { background: #1a3327; color: #5dba83; }
:global(.shell[data-theme="dark"]) .stat-icon--patients   { background: #1a2540; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .stat-icon--ambulances { background: #222c14; color: #9ab84d; }
:global(.shell[data-theme="dark"]) .stat-icon--newusers   { background: #2c2010; color: #dba05a; }

/* Stat value */
.stat-value {
  font-family: 'Lora', serif;
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1;
  margin-bottom: 0.875rem;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
}

/* Loading shimmer */
.stat-shimmer {
  display: block;
  width: 64px;
  height: 2rem;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--border-light, #edf5f0) 25%, var(--border, #daeae2) 50%, var(--border-light, #edf5f0) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* Stat footer */
.stat-footer {
  display: flex;
  align-items: center;
}
.stat-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--g-500, #2E8B57);
  text-decoration: none;
  transition: color 0.15s, gap 0.15s;
}
.stat-link:hover { color: var(--g-600, #236B43); gap: 0.5rem; }
.stat-updated {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-4);
  font-weight: 600;
}

/* Bottom accent bar */
.stat-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 0 0 14px 14px;
}
.stat-bar--doctors    { background: linear-gradient(90deg, #2E8B57, #5dba83); }
.stat-bar--patients   { background: linear-gradient(90deg, #3b75d4, #7aaaf0); }
.stat-bar--ambulances { background: linear-gradient(90deg, #6a8c1a, #9ab84d); }
.stat-bar--newusers   { background: linear-gradient(90deg, #c47b1a, #dba05a); }

/* ── Section label ────────────────────────────── */
.section-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-4);
  margin-bottom: 0.75rem;
}

/* ── Quick actions grid ───────────────────────── */
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

:global(.shell[data-theme="dark"]) .quick-icon--green { background: #1a3327; color: #5dba83; }
:global(.shell[data-theme="dark"]) .quick-icon--teal  { background: #1a2540; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .quick-icon--sage  { background: #222c14; color: #9ab84d; }
:global(.shell[data-theme="dark"]) .quick-icon--amber { background: #2c2010; color: #dba05a; }

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
</style>