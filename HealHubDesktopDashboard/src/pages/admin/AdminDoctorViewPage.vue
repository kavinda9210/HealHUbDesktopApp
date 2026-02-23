<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
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
  created_at?: string
  role?: string
  user_is_active?: boolean
  user_is_verified?: boolean
  user_created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const doctorId = computed(() => {
  const raw = route.params.doctorId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const row = ref<DoctorRow | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const actionError = ref<string | null>(null)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

function displayDays(days?: unknown) {
  if (days == null) return null
  const raw: unknown = days
  if (Array.isArray(raw)) {
    const parts = raw.map((x) => String(x).trim()).filter(Boolean)
    return parts.length ? parts : null
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return null
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) {
          const parts = parsed.map((x) => String(x).trim()).filter(Boolean)
          return parts.length ? parts : null
        }
      } catch { /* fall through */ }
    }
    const parts = s.split(',').map((x) => x.trim()).filter(Boolean)
    return parts.length ? parts : null
  }
  return null
}

function displayTime(t?: string | null) {
  if (!t) return null
  const m = String(t).match(/^(\d{2}:\d{2})/)
  return m ? m[1] : String(t)
}

function formatDate(d?: string) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

let successTimer: number | null = null
let errorTimer: number | null = null

function showSuccess(msg: string) {
  success.value = msg
  if (successTimer) window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => { success.value = null; successTimer = null }, 3500)
}

function showError(msg: string) {
  actionError.value = msg
  if (errorTimer) window.clearTimeout(errorTimer)
  errorTimer = window.setTimeout(() => { actionError.value = null; errorTimer = null }, 4500)
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) { success.value = null; actionError.value = null; return }
  if (notice === 'doctor_updated') showSuccess('Doctor updated successfully.')
  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  if (!Number.isFinite(doctorId.value)) { error.value = 'Invalid doctor ID'; return }
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: DoctorRow }>(`/api/admin/doctors/${doctorId.value}`, { token: auth.accessToken })
    row.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctor'
  } finally {
    isLoading.value = false
  }
}

async function executeDelete() {
  if (!row.value) return
  isDeleting.value = true
  actionError.value = null
  try {
    await api.del(`/api/admin/doctors/${row.value.doctor_id}`, { token: auth.accessToken })
    router.replace({ path: '/admin/doctors', query: { notice: 'doctor_deleted' } })
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete doctor')
    showDeleteModal.value = false
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => { consumeNotice(); load() })
onActivated(() => { consumeNotice(); load() })

const availDays = computed(() => row.value?.is_available ? displayDays(row.value.available_days) : null)
const startTime = computed(() => row.value?.is_available ? displayTime(row.value.start_time) : null)
const endTime   = computed(() => row.value?.is_available ? displayTime(row.value.end_time) : null)
</script>

<template>
  <div class="page">

    <!-- ── Page header ─────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" to="/admin/doctors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Doctors
        </router-link>
        <div class="heading-row">
          <div>
            <h1 class="page-heading">
              <template v-if="row">{{ row.full_name }}</template>
              <template v-else-if="isLoading">Loading…</template>
              <template v-else>Doctor Profile</template>
            </h1>
            <p class="page-sub">
              <template v-if="row?.specialization">
                <span class="spec-badge">{{ row.specialization }}</span>
              </template>
              <template v-else>Doctor profile details</template>
            </p>
          </div>

          <!-- Actions (only when data loaded) -->
          <div v-if="row" class="header-actions">
            <router-link class="act-btn act-edit" :to="`/admin/doctors/${row.doctor_id}/edit`">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </router-link>
            <router-link class="act-btn act-alerts" :to="`/admin/doctors/${row.doctor_id}/alerts`">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              Alerts
            </router-link>
            <button class="act-btn act-delete" @click="showDeleteModal = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Toasts ──────────────────────────────── -->
    <Transition name="toast">
      <div v-if="success" class="toast toast-success" role="status">
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        {{ success }}
      </div>
    </Transition>
    <Transition name="toast">
      <div v-if="actionError" class="toast toast-error" role="alert">
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        {{ actionError }}
      </div>
    </Transition>

    <!-- ── Load error ──────────────────────────── -->
    <div v-if="error" class="load-error">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </div>

    <!-- ── Skeleton ────────────────────────────── -->
    <div v-else-if="isLoading && !row" class="skeleton-card">
      <div class="skeleton-profile">
        <div class="sk sk-avatar"></div>
        <div class="sk-lines">
          <div class="sk sk-h1"></div>
          <div class="sk sk-h2"></div>
        </div>
      </div>
      <div class="sk-grid">
        <div v-for="i in 8" :key="i" class="sk-field">
          <div class="sk sk-label"></div>
          <div class="sk sk-value"></div>
        </div>
      </div>
    </div>

    <!-- ── Profile card ────────────────────────── -->
    <div v-else-if="row" class="profile-card">

      <!-- Refreshing indicator -->
      <Transition name="fade">
        <div v-if="isLoading" class="refresh-bar">
          <svg class="spin-icon" viewBox="0 0 24 24" fill="none" width="12" height="12">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
          </svg>
          Refreshing…
        </div>
      </Transition>

      <!-- Profile hero -->
      <div class="profile-hero">
        <div class="profile-avatar" aria-hidden="true">
          {{ row.full_name.charAt(0).toUpperCase() }}
        </div>
        <div class="profile-hero-info">
          <div class="profile-name">{{ row.full_name }}</div>
          <div class="profile-meta">
            <span v-if="row.specialization" class="meta-pill meta-spec">{{ row.specialization }}</span>
            <span v-if="row.qualification" class="meta-pill meta-qual">{{ row.qualification }}</span>
            <span class="avail-chip" :class="row.is_available ? 'chip-available' : 'chip-unavailable'">
              <span class="chip-dot" aria-hidden="true"></span>
              {{ row.is_available ? 'Available' : 'Unavailable' }}
            </span>
          </div>
        </div>
        <div class="profile-hero-id">
          <span class="id-label">Doctor ID</span>
          <span class="id-value">#{{ row.doctor_id }}</span>
        </div>
      </div>

      <div class="profile-divider"></div>

      <!-- ── Sections ──────────────────────────── -->

      <!-- Contact & Professional -->
      <div class="info-sections">

        <div class="info-section">
          <div class="info-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
              <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
            Professional Info
          </div>
          <div class="info-grid">
            <div class="info-field">
              <div class="field-label">Email</div>
              <div class="field-value">
                <a v-if="row.email" :href="`mailto:${row.email}`" class="field-link">{{ row.email }}</a>
                <span v-else class="field-empty">—</span>
              </div>
            </div>
            <div class="info-field">
              <div class="field-label">Phone</div>
              <div class="field-value">
                <a v-if="row.phone" :href="`tel:${row.phone}`" class="field-link">{{ row.phone }}</a>
                <span v-else class="field-empty">—</span>
              </div>
            </div>
            <div class="info-field">
              <div class="field-label">Qualification</div>
              <div class="field-value">{{ row.qualification || '' }}<span v-if="!row.qualification" class="field-empty">—</span></div>
            </div>
            <div class="info-field">
              <div class="field-label">Consultation Fee</div>
              <div class="field-value field-value--fee">
                <template v-if="row.consultation_fee != null">
                  ${{ row.consultation_fee.toLocaleString() }}
                </template>
                <span v-else class="field-empty">—</span>
              </div>
            </div>
            <div class="info-field">
              <div class="field-label">Member since</div>
              <div class="field-value">{{ formatDate(row.created_at) || '—' }}</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="info-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Availability Schedule
          </div>

          <!-- Not available state -->
          <div v-if="!row.is_available" class="unavail-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            This doctor is currently not available for appointments.
          </div>

          <!-- Available details -->
          <div v-else class="avail-details">
            <div class="info-field info-field--full">
              <div class="field-label">Working days</div>
              <div class="field-value">
                <div v-if="availDays" class="days-row">
                  <span
                    v-for="day in availDays"
                    :key="day"
                    class="day-tag"
                  >{{ day }}</span>
                </div>
                <span v-else class="field-empty">—</span>
              </div>
            </div>
            <div class="info-field">
              <div class="field-label">Start time</div>
              <div class="field-value time-value">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ startTime || '—' }}
              </div>
            </div>
            <div class="info-field">
              <div class="field-label">End time</div>
              <div class="field-value time-value">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 8 14"/>
                </svg>
                {{ endTime || '—' }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Not found ───────────────────────────── -->
    <div v-else class="not-found">
      <div class="not-found-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </div>
      <p class="not-found-title">Doctor not found</p>
      <p class="not-found-sub">The requested doctor profile could not be located.</p>
      <router-link class="btn-ghost" to="/admin/doctors">Back to Doctors</router-link>
    </div>

    <!-- ── Delete modal ────────────────────────── -->
    <Transition name="modal">
      <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 id="modal-title" class="modal-title">Delete Doctor?</h3>
          <p class="modal-body">
            You are about to permanently delete <strong>{{ row?.full_name }}</strong>. This action cannot be undone.
          </p>
          <div class="modal-actions">
            <button class="btn-ghost" :disabled="isDeleting" @click="showDeleteModal = false">Cancel</button>
            <button class="btn-danger" :disabled="isDeleting" @click="executeDelete">
              <svg v-if="isDeleting" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="14" height="14">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
              </svg>
              {{ isDeleting ? 'Deleting…' : 'Yes, delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

.page {
  font-family: 'Nunito', sans-serif;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: pg-in 0.25s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ───────────────────────────────────── */
.page-header { display: flex; flex-direction: column; }
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
.heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 0.35rem;
  letter-spacing: -0.015em;
}
.page-sub { margin: 0; display: flex; align-items: center; gap: 0.5rem; }
.spec-badge {
  display: inline-block;
  padding: 0.18rem 0.65rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
  border: 1px solid var(--g-200, #c6e8d6);
}

.header-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

/* Action buttons */
.act-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.48rem 0.875rem;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-3);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}
.act-edit:hover   { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.act-alerts:hover { background: #fefce8; border-color: #fde68a; color: #92400e; }
.act-delete:hover { background: #fff5f5; border-color: #fca5a5; color: #dc2626; }

:global(.shell[data-theme="dark"]) .act-edit:hover   { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .act-alerts:hover { background: #2c2010; border-color: #6b4f00; color: #dba05a; }
:global(.shell[data-theme="dark"]) .act-delete:hover { background: #2c1212; border-color: #6b2020; color: #e08585; }

/* ── Toasts ───────────────────────────────────── */
.toast {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
}
.toast-success { background: #f0faf5; border: 1px solid rgba(46,139,87,0.25); color: var(--g-600, #236B43); }
.toast-error   { background: #fff5f5; border: 1px solid #f5bcbc; color: #b82020; }
:global(.shell[data-theme="dark"]) .toast-success { background: #1a3327; border-color: #2a5540; color: #6cd49a; }
:global(.shell[data-theme="dark"]) .toast-error   { background: #2c1212; border-color: #6b2020; color: #e08585; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-5px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Load error ───────────────────────────────── */
.load-error {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: #fff5f5;
  border: 1.5px solid #f5bcbc;
  color: #b82020;
  font-size: 0.84rem;
  font-weight: 600;
}
:global(.shell[data-theme="dark"]) .load-error { background: #2c1212; border-color: #6b2020; color: #e08585; }

/* ── Skeleton ─────────────────────────────────── */
.skeleton-card {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: var(--shadow-sm);
}
.skeleton-profile { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.sk-lines { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.sk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.sk-field { display: flex; flex-direction: column; gap: 6px; }
.sk {
  border-radius: 6px;
  background: linear-gradient(90deg, var(--border-light, #edf5f0) 25%, var(--border, #daeae2) 50%, var(--border-light, #edf5f0) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.sk-avatar { width: 60px; height: 60px; border-radius: 14px; flex-shrink: 0; }
.sk-h1 { height: 22px; width: 55%; }
.sk-h2 { height: 14px; width: 35%; }
.sk-label { height: 10px; width: 40%; }
.sk-value { height: 16px; width: 70%; }

/* ── Profile card ─────────────────────────────── */
.profile-card {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* Refresh bar */
.refresh-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-3);
  background: var(--bg-page);
  border-bottom: 1px solid var(--border-light, #edf5f0);
}
.spin-icon { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Profile hero */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.75rem 1.75rem 1.5rem;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--g-500, #2E8B57), var(--g-600, #236B43));
  color: white;
  font-size: 1.5rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(46,139,87,0.3);
}
.profile-hero-info { flex: 1; min-width: 0; }
.profile-name {
  font-family: 'Lora', serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 0.5rem;
}
.profile-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.meta-pill {
  display: inline-block;
  padding: 0.18rem 0.625rem;
  border-radius: 99px;
  font-size: 0.74rem;
  font-weight: 700;
}
.meta-spec {
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
  border: 1px solid var(--g-200, #c6e8d6);
}
.meta-qual {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}
:global(.shell[data-theme="dark"]) .meta-spec { background: #1a3327; border-color: #2a5540; color: #6cd49a; }
:global(.shell[data-theme="dark"]) .meta-qual { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }

/* Availability chip */
.avail-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.22rem 0.7rem;
  border-radius: 99px;
  font-size: 0.74rem;
  font-weight: 700;
}
.chip-available   { background: #f0faf5; color: #1e6b41; border: 1px solid rgba(46,139,87,0.2); }
.chip-unavailable { background: #fdf4f4; color: #9b1d1d; border: 1px solid rgba(200,40,40,0.12); }
.chip-dot { width: 6px; height: 6px; border-radius: 50%; }
.chip-available .chip-dot   { background: #2E8B57; }
.chip-unavailable .chip-dot { background: #dc2626; }
:global(.shell[data-theme="dark"]) .chip-available   { background: #1a3327; color: #6cd49a; border-color: #2a5540; }
:global(.shell[data-theme="dark"]) .chip-unavailable { background: #2c1212; color: #e08585; border-color: #6b2020; }

.profile-hero-id {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.id-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-4); }
.id-value { font-family: 'Lora', serif; font-size: 1.1rem; font-weight: 600; color: var(--text-2); }

.profile-divider { height: 1px; background: var(--border); margin: 0 1.75rem; }

/* Info sections */
.info-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0;
}
.info-section {
  padding: 1.5rem 1.75rem;
  border-right: 1px solid var(--border-light, #edf5f0);
}
.info-section:last-child { border-right: none; }

@media (max-width: 680px) {
  .info-section { border-right: none; border-bottom: 1px solid var(--border-light, #edf5f0); }
  .info-section:last-child { border-bottom: none; }
}

.info-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 1.125rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem 1rem;
}
.info-field { display: flex; flex-direction: column; gap: 0.3rem; }
.info-field--full { grid-column: 1 / -1; }

.field-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-4);
}
.field-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-1);
}
.field-value--fee {
  font-family: 'Lora', serif;
  font-size: 1.05rem;
  color: var(--g-600, #236B43);
}
.field-empty { color: var(--text-4); font-weight: 500; }
.field-link {
  color: var(--g-500, #2E8B57);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}
.field-link:hover { color: var(--g-600, #236B43); text-decoration: underline; }

/* Days row */
.days-row { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.25rem; }
.day-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.6rem;
  border-radius: 7px;
  font-size: 0.74rem;
  font-weight: 700;
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
  border: 1px solid var(--g-200, #c6e8d6);
}
:global(.shell[data-theme="dark"]) .day-tag { background: #1a3327; border-color: #2a5540; color: #6cd49a; }

/* Time value */
.time-value {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Avail details */
.avail-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem 1rem;
}

/* Unavailable banner */
.unavail-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  background: #fdf4f4;
  border: 1px solid rgba(220,38,38,0.15);
  color: #9b1d1d;
  font-size: 0.82rem;
  font-weight: 600;
}
:global(.shell[data-theme="dark"]) .unavail-banner { background: #2c1212; border-color: #6b2020; color: #e08585; }

/* ── Not found ────────────────────────────────── */
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3.5rem 2rem;
  gap: 0.625rem;
  text-align: center;
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 16px;
}
.not-found-icon {
  width: 60px; height: 60px;
  border-radius: 16px;
  background: var(--g-100, #eaf6f0);
  color: var(--g-500, #2E8B57);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.5rem;
}
.not-found-title { font-family: 'Lora', serif; font-size: 1rem; font-weight: 600; color: var(--text-1); margin: 0; }
.not-found-sub { font-size: 0.82rem; color: var(--text-3); margin: 0 0 0.5rem; }

/* ── Modal ────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10,21,16,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1.5rem;
}
.modal-box {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  text-align: center;
}
.modal-icon-wrap {
  width: 52px; height: 52px;
  border-radius: 14px;
  background: #fef9ea;
  color: #c47b1a;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem;
  border: 1.5px solid #fde68a;
}
:global(.shell[data-theme="dark"]) .modal-icon-wrap { background: #2c2010; border-color: #6b4f00; color: #dba05a; }
.modal-title { font-family: 'Lora', serif; font-size: 1.2rem; font-weight: 600; color: var(--text-1); margin: 0 0 0.5rem; }
.modal-body { font-size: 0.84rem; color: var(--text-3); line-height: 1.6; margin: 0 0 1.5rem; }
.modal-body strong { color: var(--text-1); }
.modal-actions { display: flex; gap: 0.75rem; justify-content: center; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* ── Shared buttons ───────────────────────────── */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.58rem 1.1rem;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif;
  font-size: 0.855rem;
  font-weight: 700;
  color: var(--text-3);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.btn-ghost:hover:not(:disabled) { background: var(--nav-hover); color: var(--text-1); border-color: var(--g-300, #8fcfad); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.58rem 1.1rem;
  border-radius: 9px;
  border: none;
  background: #dc2626;
  font-family: 'Nunito', sans-serif;
  font-size: 0.855rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover:not(:disabled) { background: #b91c1c; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-spinner { animation: spin 0.85s linear infinite; }
</style>