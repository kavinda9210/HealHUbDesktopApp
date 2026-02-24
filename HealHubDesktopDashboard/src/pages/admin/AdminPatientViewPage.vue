<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  user_id: string
  full_name?: string
  phone?: string
  email?: string
  dob?: string
  gender?: string
  address?: string
  blood_group?: string
  emergency_contact?: string
  has_chronic_condition?: boolean
  condition_notes?: string
  created_at?: string
  role?: string
  user_is_active?: boolean
  user_is_verified?: boolean
  user_created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const patientId = computed(() => {
  const raw = route.params.patientId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const row = ref<PatientRow | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const actionError = ref<string | null>(null)
const isDeleting = ref(false)

let successTimer: number | null = null
let errorTimer: number | null = null

function showSuccess(msg: string) {
  success.value = msg
  if (successTimer) window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => { success.value = null; successTimer = null }, 3000)
}
function showError(msg: string) {
  actionError.value = msg
  if (errorTimer) window.clearTimeout(errorTimer)
  errorTimer = window.setTimeout(() => { actionError.value = null; errorTimer = null }, 4000)
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) { success.value = null; actionError.value = null; return }
  if (notice === 'patient_updated') showSuccess('Patient updated successfully.')
  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  if (!Number.isFinite(patientId.value)) { error.value = 'Invalid patient id'; return }
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: PatientRow }>(
      `/api/admin/patients/${patientId.value}`,
      { token: auth.accessToken }
    )
    row.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patient'
  } finally {
    isLoading.value = false
  }
}

async function deletePatient() {
  if (!row.value) return
  if (!confirm('Delete this patient? This action cannot be undone.')) return
  isDeleting.value = true
  actionError.value = null
  try {
    await api.del(`/api/admin/patients/${row.value.patient_id}`, { token: auth.accessToken })
    router.replace({ path: '/admin/patients', query: { notice: 'patient_deleted' } })
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete patient')
  } finally {
    isDeleting.value = false
  }
}

function formatDate(val?: string) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return val }
}

onMounted(() => { consumeNotice(); load() })
onActivated(() => { consumeNotice(); load() })
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
        <h1 class="page-heading">Patient Details</h1>
        <p class="page-sub">View full patient profile and medical information.</p>
      </div>

      <div v-if="row" class="header-actions">
        <router-link class="action-btn action-btn--alerts" :to="`/admin/patients/${row.patient_id}/alerts`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          Alerts
        </router-link>
        <router-link class="action-btn action-btn--edit" :to="`/admin/patients/${row.patient_id}/edit`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </router-link>
        <button class="action-btn action-btn--delete" :disabled="isDeleting" @click="deletePatient">
          <svg v-if="isDeleting" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="14" height="14">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-dasharray="28 56"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          Delete
        </button>
      </div>
    </div>

    <!-- ══ Banners ══════════════════════════════════ -->
    <Transition name="toast">
      <div v-if="success" class="banner banner--success" role="status">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        {{ success }}
      </div>
    </Transition>
    <Transition name="toast">
      <div v-if="actionError" class="banner banner--error" role="alert">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        {{ actionError }}
      </div>
    </Transition>

    <!-- ══ Load error ═══════════════════════════════ -->
    <div v-if="error" class="banner banner--error" role="alert">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </div>

    <!-- ══ Loading skeleton ═════════════════════════ -->
    <template v-else-if="isLoading && !row">
      <div class="form-section">
        <div class="section-head">
          <div class="skeleton-icon"></div>
          <div style="flex:1">
            <div class="skeleton skeleton--md" style="margin-bottom:.4rem"></div>
            <div class="skeleton skeleton--sm"></div>
          </div>
        </div>
        <div class="detail-grid">
          <div v-for="i in 6" :key="i" class="detail-cell">
            <div class="skeleton skeleton--sm" style="margin-bottom:.4rem"></div>
            <div class="skeleton skeleton--md"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ Patient Data ═════════════════════════════ -->
    <template v-else-if="row">

      <!-- refreshing indicator -->
      <div v-if="isLoading" class="refreshing-bar">
        <svg class="btn-spinner" viewBox="0 0 24 24" fill="none" width="13" height="13">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-dasharray="28 56"/>
        </svg>
        Refreshing…
      </div>

      <!-- ── Profile header card ─────────────────── -->
      <div class="profile-hero">
        <div class="profile-avatar">
          {{ (row.full_name || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ row.full_name || '—' }}</h2>
          <p class="profile-email">{{ row.email || '—' }}</p>
          <div class="profile-badges">
            <span v-if="row.gender" class="badge"
              :class="row.gender.toLowerCase() === 'male' ? 'badge--blue' : row.gender.toLowerCase() === 'female' ? 'badge--purple' : 'badge--green'">
              {{ row.gender }}
            </span>
            <span v-if="row.blood_group" class="badge badge--red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
              </svg>
              {{ row.blood_group }}
            </span>
            <span v-if="row.has_chronic_condition" class="badge badge--amber">
              Chronic condition
            </span>
            <span v-if="row.user_is_active === false" class="badge badge--gray">Inactive</span>
            <span v-if="row.user_is_verified" class="badge badge--green">Verified</span>
          </div>
        </div>
        <div class="profile-id">
          <span class="id-label">Patient ID</span>
          <span class="id-value">#{{ row.patient_id }}</span>
        </div>
      </div>

      <!-- ── Section: Personal Info ──────────────── -->
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
            <div class="section-sub">Contact and demographic details</div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-label">Full name</div>
            <div class="detail-value">{{ row.full_name || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Email</div>
            <div class="detail-value">{{ row.email || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Phone</div>
            <div class="detail-value">{{ row.phone || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Date of birth</div>
            <div class="detail-value">{{ formatDate(row.dob) }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Gender</div>
            <div class="detail-value">{{ row.gender || '—' }}</div>
          </div>
          <div class="detail-cell detail-cell--full">
            <div class="detail-label">Address</div>
            <div class="detail-value">{{ row.address || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- ── Section: Medical Info ───────────────── -->
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

        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-label">Blood group</div>
            <div class="detail-value">
              <span v-if="row.blood_group" class="badge badge--red">{{ row.blood_group }}</span>
              <span v-else>—</span>
            </div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Emergency contact</div>
            <div class="detail-value">{{ row.emergency_contact || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Chronic condition</div>
            <div class="detail-value">
              <span class="condition-chip" :class="row.has_chronic_condition ? 'chip--yes' : 'chip--no'">
                <span class="chip-dot"></span>
                {{ row.has_chronic_condition ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>
          <div class="detail-cell detail-cell--full">
            <div class="detail-label">Condition notes</div>
            <div class="detail-value detail-value--pre">{{ row.condition_notes || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- ── Section: Account Info ───────────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Account Information</div>
            <div class="section-sub">System account status and metadata</div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-label">Account status</div>
            <div class="detail-value">
              <span class="condition-chip"
                :class="row.user_is_active !== false ? 'chip--no' : 'chip--yes'">
                <span class="chip-dot"></span>
                {{ row.user_is_active !== false ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Email verified</div>
            <div class="detail-value">
              <span class="condition-chip" :class="row.user_is_verified ? 'chip--no' : 'chip--yes'">
                <span class="chip-dot"></span>
                {{ row.user_is_verified ? 'Verified' : 'Unverified' }}
              </span>
            </div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Patient since</div>
            <div class="detail-value">{{ formatDate(row.created_at) }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">User ID</div>
            <div class="detail-value detail-value--mono">{{ row.user_id || '—' }}</div>
          </div>
        </div>
      </div>

    </template>

    <!-- ══ Not found ════════════════════════════════ -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <p class="empty-title">Patient not found</p>
      <p class="empty-sub">This patient may have been deleted or the ID is invalid.</p>
      <router-link class="btn-primary" style="margin-top:.75rem" to="/admin/patients">Back to Patients</router-link>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

/* ════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════ */
.page {
  font-family: 'Nunito', sans-serif;
  max-width: 820px;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  animation: pg-in .25s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* header */
.page-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 1rem;
  flex-wrap: wrap; margin-bottom: .125rem;
}
.back-link {
  display: inline-flex; align-items: center; gap: .4rem;
  font-size: .78rem; font-weight: 700;
  color: var(--text-3); text-decoration: none;
  margin-bottom: .75rem; transition: color .15s;
}
.back-link:hover { color: var(--g-500, #2E8B57); }
.page-heading {
  font-family: 'Lora', serif; font-size: 1.6rem; font-weight: 600;
  color: var(--text-1); margin: 0 0 .25rem; letter-spacing: -.015em;
}
.page-sub { font-size: .82rem; color: var(--text-3); margin: 0; }

.header-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; padding-top: 2.5rem; }

/* ── header action buttons ── */
.action-btn {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .5rem 1rem; border-radius: 9px;
  font-family: 'Nunito', sans-serif; font-size: .82rem; font-weight: 700;
  cursor: pointer; text-decoration: none; border: 1.5px solid transparent;
  transition: background .13s, border-color .13s, color .13s, transform .1s;
  white-space: nowrap;
}
.action-btn:active:not(:disabled) { transform: scale(.97); }
.action-btn:disabled { opacity: .5; cursor: not-allowed; }

.action-btn--edit   { background: #eff6ff; border-color: #bfdbfe; color: #3b75d4; }
.action-btn--edit:hover { background: #dbeafe; border-color: #93c5fd; }
.action-btn--alerts { background: #fef9ea; border-color: #fde68a; color: #c47b1a; }
.action-btn--alerts:hover { background: #fef08a; border-color: #fbbf24; }
.action-btn--delete { background: #fff5f5; border-color: #f5bcbc; color: #b82020; }
.action-btn--delete:hover { background: #fee2e2; border-color: #fca5a5; }

:global(.shell[data-theme="dark"]) .action-btn--edit   { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .action-btn--edit:hover { background: #1e2d55; }
:global(.shell[data-theme="dark"]) .action-btn--alerts { background: #2c2010; border-color: #6b4f00; color: #dba05a; }
:global(.shell[data-theme="dark"]) .action-btn--alerts:hover { background: #3a2c14; }
:global(.shell[data-theme="dark"]) .action-btn--delete { background: #2c1212; border-color: #6b2020; color: #e08585; }
:global(.shell[data-theme="dark"]) .action-btn--delete:hover { background: #3a1818; }

/* ════════════════════════════════════════════════
   BANNERS
   ════════════════════════════════════════════════ */
.banner {
  display: flex; align-items: center; gap: .6rem;
  padding: .875rem 1.125rem; border-radius: 10px;
  font-size: .84rem; font-weight: 600;
}
.banner--success { background: #f0faf5; border: 1.5px solid rgba(46,139,87,.25); color: #1e6b41; }
.banner--error   { background: #fff5f5; border: 1.5px solid #f5bcbc; color: #b82020; }

:global(.shell[data-theme="dark"]) .banner--success { background: #1a3327; border-color: #2a5540; color: #6cd49a; }
:global(.shell[data-theme="dark"]) .banner--error   { background: #2c1212; border-color: #6b2020; color: #e08585; }

.toast-enter-active, .toast-leave-active { transition: opacity .22s ease, transform .22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-5px); }

/* refreshing */
.refreshing-bar {
  display: flex; align-items: center; gap: .5rem;
  font-size: .77rem; font-weight: 600; color: var(--text-3);
  padding: .4rem .25rem;
}

/* ════════════════════════════════════════════════
   PROFILE HERO CARD
   ════════════════════════════════════════════════ */
.profile-hero {
  display: flex; align-items: center; gap: 1.25rem;
  padding: 1.5rem;
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}
.profile-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--g-100, #eaf6f0);
  border: 2px solid var(--g-200, #c6e8d6);
  color: var(--g-600, #236B43);
  font-size: 1.5rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
:global(.shell[data-theme="dark"]) .profile-avatar { background: #1a3327; border-color: #2a5540; color: #5dba83; }

.profile-info { flex: 1; min-width: 0; }
.profile-name {
  font-family: 'Lora', serif; font-size: 1.2rem; font-weight: 600;
  color: var(--text-1); margin: 0 0 .2rem; letter-spacing: -.01em;
}
.profile-email { font-size: .82rem; color: var(--text-3); margin: 0 0 .6rem; }
.profile-badges { display: flex; flex-wrap: wrap; gap: .4rem; }

.profile-id {
  display: flex; flex-direction: column; align-items: flex-end; gap: .2rem;
}
.id-label { font-size: .68rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--text-4); }
.id-value  { font-size: 1rem; font-weight: 800; color: var(--text-1); font-family: monospace; }

/* badges */
.badge {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .18rem .6rem; border-radius: 99px;
  font-size: .72rem; font-weight: 700;
}
.badge--blue   { background: #eff6ff; color: #3b75d4; border: 1px solid #bfdbfe; }
.badge--purple { background: #fdf2f8; color: #a21caf; border: 1px solid #f0abfc; }
.badge--green  { background: var(--g-100, #eaf6f0); color: var(--g-600, #236B43); border: 1px solid var(--g-200, #c6e8d6); }
.badge--red    { background: #fff5f5; color: #b82020; border: 1px solid #fecaca; }
.badge--amber  { background: #fef9ea; color: #c47b1a; border: 1px solid #fde68a; }
.badge--gray   { background: var(--bg-page); color: var(--text-3); border: 1px solid var(--border); }

:global(.shell[data-theme="dark"]) .badge--blue   { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .badge--purple { background: #2d1040; border-color: #6b2090; color: #e070f0; }
:global(.shell[data-theme="dark"]) .badge--red    { background: #2c1212; border-color: #6b2020; color: #f87171; }
:global(.shell[data-theme="dark"]) .badge--amber  { background: #2c2010; border-color: #6b4f00; color: #dba05a; }

/* ════════════════════════════════════════════════
   SECTION CARDS  (same as Create/Edit pages)
   ════════════════════════════════════════════════ */
.form-section {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-head {
  display: flex; align-items: flex-start; gap: .875rem;
  margin-bottom: 1.375rem; padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
}
.section-icon {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.section-icon--green { background: var(--g-100, #eaf6f0); color: var(--g-500, #2E8B57); border: 1.5px solid var(--g-200, #c6e8d6); }
.section-icon--red   { background: #fff5f5; color: #dc2626; border: 1.5px solid #fecaca; }
.section-icon--blue  { background: #eff6ff; color: #3b75d4; border: 1.5px solid #bfdbfe; }

:global(.shell[data-theme="dark"]) .section-icon--green { background: #1a3327; border-color: #2a5540; color: #5dba83; }
:global(.shell[data-theme="dark"]) .section-icon--red   { background: #2c1212; border-color: #6b2020; color: #f87171; }
:global(.shell[data-theme="dark"]) .section-icon--blue  { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }

.section-title { font-size: .9rem; font-weight: 700; color: var(--text-1); }
.section-sub   { font-size: .77rem; color: var(--text-3); margin-top: 2px; }

/* ════════════════════════════════════════════════
   DETAIL GRID
   ════════════════════════════════════════════════ */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0;
}
.detail-cell {
  padding: .875rem 1rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
  border-right: 1px solid var(--border-light, #edf5f0);
}
/* remove right border on last column and bottom border on last row */
.detail-cell:nth-child(even) { border-right: none; }
.detail-cell:last-child,
.detail-cell:nth-last-child(2):nth-child(odd) { border-bottom: none; }
.detail-cell--full {
  grid-column: 1 / -1;
  border-right: none;
}
.detail-cell--full:last-child { border-bottom: none; }

.detail-label {
  font-size: .68rem; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-4); margin-bottom: .35rem;
}
.detail-value {
  font-size: .875rem; font-weight: 600; color: var(--text-1);
  line-height: 1.4;
}
.detail-value--pre { white-space: pre-wrap; font-weight: 400; font-size: .84rem; color: var(--text-3); }
.detail-value--mono { font-family: monospace; font-size: .8rem; color: var(--text-3); }

/* condition chip */
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

/* ════════════════════════════════════════════════
   SKELETON LOADER
   ════════════════════════════════════════════════ */
.skeleton-icon {
  width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(90deg, var(--border) 25%, var(--bg-page) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton {
  display: block; border-radius: 6px; height: 13px;
  background: linear-gradient(90deg, var(--border) 25%, var(--bg-page) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton--sm  { width: 80px; }
.skeleton--md  { width: 140px; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* ════════════════════════════════════════════════
   EMPTY STATE
   ════════════════════════════════════════════════ */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 4rem 1.5rem; gap: .35rem;
}
.empty-icon {
  width: 60px; height: 60px; border-radius: 14px;
  background: var(--bg-page); border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-3); margin-bottom: .5rem;
}
.empty-title { font-size: 1rem; font-weight: 700; color: var(--text-1); margin: 0; }
.empty-sub   { font-size: .82rem; color: var(--text-3); margin: 0; }

/* ════════════════════════════════════════════════
   BUTTONS
   ════════════════════════════════════════════════ */
.btn-primary {
  display: inline-flex; align-items: center; gap: .45rem;
  padding: .65rem 1.375rem; border-radius: 9px;
  border: none; background: var(--g-500, #2E8B57);
  font-family: 'Nunito', sans-serif; font-size: .875rem; font-weight: 700;
  color: #fff; cursor: pointer; text-decoration: none;
  transition: background .15s, transform .12s, box-shadow .15s;
  box-shadow: 0 2px 10px rgba(46,139,87,.25);
}
.btn-primary:hover { background: var(--g-600, #236B43); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(46,139,87,.3); }

.btn-spinner { animation: spin .85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>