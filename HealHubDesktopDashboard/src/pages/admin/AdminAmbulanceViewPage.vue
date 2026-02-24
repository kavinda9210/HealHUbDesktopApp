<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
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
  created_at?: string
  role?: string
  user_is_active?: boolean
  user_is_verified?: boolean
  user_created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const ambulanceId = computed(() => {
  const raw = route.params.ambulanceId
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
})

const row = ref<AmbulanceRow | null>(null)
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
  successTimer = window.setTimeout(() => {
    success.value = null
    successTimer = null
  }, 3000)
}

function showError(msg: string) {
  actionError.value = msg
  if (errorTimer) window.clearTimeout(errorTimer)
  errorTimer = window.setTimeout(() => {
    actionError.value = null
    errorTimer = null
  }, 4000)
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) {
    success.value = null
    actionError.value = null
    return
  }

  if (notice === 'ambulance_updated') showSuccess('Ambulance staff updated successfully.')

  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  if (!Number.isFinite(ambulanceId.value)) {
    error.value = 'Invalid ambulance id'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: AmbulanceRow }>(`/api/admin/ambulances/${ambulanceId.value}`, {
      token: auth.accessToken,
    })
    row.value = res.data
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load ambulance staff'
  } finally {
    isLoading.value = false
  }
}

async function deleteAmbulance() {
  if (!row.value) return
  if (!confirm('Delete this ambulance staff?')) return
  isDeleting.value = true
  actionError.value = null
  try {
    await api.del(`/api/admin/ambulances/${row.value.ambulance_id}`, { token: auth.accessToken })
    router.replace({ path: '/admin/ambulances', query: { notice: 'ambulance_deleted' } })
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete ambulance staff')
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

onMounted(() => {
  consumeNotice()
  load()
})
onActivated(() => {
  consumeNotice()
  load()
})
</script>

<template>
  <div class="page">

    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" to="/admin/ambulances">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Ambulances
        </router-link>
        <h1 class="page-heading">Ambulance Staff Details</h1>
        <p class="page-sub">View full staff profile and unit details.</p>
      </div>

      <div v-if="row" class="header-actions">
        <router-link class="action-btn action-btn--alerts" :to="`/admin/ambulances/${row.ambulance_id}/alerts`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          Alerts
        </router-link>
        <router-link class="action-btn action-btn--edit" :to="`/admin/ambulances/${row.ambulance_id}/edit`">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </router-link>
        <button class="action-btn action-btn--delete" :disabled="isDeleting" @click="deleteAmbulance">
          <svg v-if="isDeleting" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="14" height="14">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
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

    <!-- Banners -->
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

    <!-- Load error -->
    <div v-if="error" class="banner banner--error" role="alert">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </div>

    <!-- Loading skeleton -->
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

    <!-- Data -->
    <template v-else-if="row">

      <div v-if="isLoading" class="refreshing-bar">
        <svg class="btn-spinner" viewBox="0 0 24 24" fill="none" width="13" height="13">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
        </svg>
        Refreshing…
      </div>

      <div class="profile-hero">
        <div class="profile-avatar">
          {{ (row.driver_name || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ row.driver_name || '—' }}</h2>
          <p class="profile-email">{{ row.email || '—' }}</p>
          <div class="profile-badges">
            <span v-if="row.ambulance_number" class="badge badge--gray">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
              </svg>
              {{ row.ambulance_number }}
            </span>
            <span class="badge" :class="row.is_available ? 'badge--green' : 'badge--red'">
              {{ row.is_available ? 'Available' : 'Unavailable' }}
            </span>
            <span v-if="row.user_is_active === false" class="badge badge--gray">Inactive</span>
            <span v-if="row.user_is_verified" class="badge badge--green">Verified</span>
          </div>
        </div>
        <div class="profile-id">
          <span class="id-label">Ambulance ID</span>
          <span class="id-value">#{{ row.ambulance_id }}</span>
        </div>
      </div>

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
            <div class="section-title">Staff & Unit Information</div>
            <div class="section-sub">Driver contact and ambulance details</div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-label">Driver name</div>
            <div class="detail-value">{{ row.driver_name || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Driver phone</div>
            <div class="detail-value">{{ row.driver_phone || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Email</div>
            <div class="detail-value">{{ row.email || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Ambulance number</div>
            <div class="detail-value">{{ row.ambulance_number || '—' }}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Availability</div>
            <div class="detail-value">
              <span class="badge" :class="row.is_available ? 'badge--green' : 'badge--red'">
                {{ row.is_available ? 'Available' : 'Unavailable' }}
              </span>
            </div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Created</div>
            <div class="detail-value">{{ formatDate(row.created_at) }}</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="form-section">
      <div class="section-title">Ambulance staff not found.</div>
      <div class="section-sub">The record may have been deleted or the link is invalid.</div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Lora:wght@500;600&display=swap');

.page {
  font-family: 'Nunito', sans-serif;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  animation: pg-in .25s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: .25rem;
}

.back-link {
  display: inline-flex; align-items: center; gap: .4rem;
  font-size: .78rem; font-weight: 700;
  color: var(--text-3); text-decoration: none;
  margin-bottom: .75rem; transition: color .15s;
}
.back-link:hover { color: var(--g-500, #2E8B57); }

.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 .25rem;
  letter-spacing: -.015em;
}
.page-sub { font-size: .82rem; color: var(--text-3); margin: 0; }

.header-actions { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding: .5rem .85rem;
  border-radius: 9px;
  font-family: 'Nunito', sans-serif;
  font-size: .82rem;
  font-weight: 800;
  border: 1.5px solid transparent;
  text-decoration: none;
  cursor: pointer;
  transition: background .13s, border-color .13s, transform .1s;
}
.action-btn:active { transform: scale(.98); }
.action-btn:disabled { opacity: .55; cursor: not-allowed; }

.action-btn--alerts { background: #fef9ea; border-color: #fde68a; color: #c47b1a; }
.action-btn--alerts:hover { background: #fef08a; border-color: #fbbf24; }
.action-btn--edit { background: #eff6ff; border-color: #bfdbfe; color: #3b75d4; }
.action-btn--edit:hover { background: #dbeafe; border-color: #93c5fd; }
.action-btn--delete { background: #fff5f5; border-color: #f5bcbc; color: #b82020; }
.action-btn--delete:hover { background: #fee2e2; border-color: #fca5a5; }

:global(.shell[data-theme="dark"]) .action-btn--alerts { background: #2c2010; border-color: #6b4f00; color: #dba05a; }
:global(.shell[data-theme="dark"]) .action-btn--alerts:hover { background: #3a2c14; }
:global(.shell[data-theme="dark"]) .action-btn--edit { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .action-btn--edit:hover { background: #1e2d55; }
:global(.shell[data-theme="dark"]) .action-btn--delete { background: #2c1212; border-color: #6b2020; color: #e08585; }
:global(.shell[data-theme="dark"]) .action-btn--delete:hover { background: #3a1818; }

.banner {
  display: flex; align-items: center; gap: .6rem;
  padding: .875rem 1.125rem;
  border-radius: 10px;
  font-size: .84rem;
  font-weight: 700;
}
.banner--success { background: #f0faf5; border: 1.5px solid rgba(46,139,87,.25); color: #1e6b41; }
.banner--error { background: #fff5f5; border: 1.5px solid #f5bcbc; color: #b82020; }

:global(.shell[data-theme="dark"]) .banner--success { background: #1a3327; border-color: #2a5540; color: #6cd49a; }
:global(.shell[data-theme="dark"]) .banner--error { background: #2c1212; border-color: #6b2020; color: #e08585; }

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
.section-icon--red { background: #fff5f5; color: #dc2626; border: 1.5px solid #fecaca; }
:global(.shell[data-theme="dark"]) .section-icon--red { background: #2c1212; border-color: #6b2020; color: #f87171; }

.section-title { font-size: .9rem; font-weight: 800; color: var(--text-1); }
.section-sub { font-size: .77rem; color: var(--text-3); margin-top: 2px; }

.refreshing-bar {
  display: inline-flex; align-items: center; gap: .5rem;
  padding: .5rem .75rem;
  border-radius: 10px;
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  color: var(--text-3);
  font-size: .8rem;
  font-weight: 700;
}

.profile-hero {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 1.25rem 1.25rem;
  border-radius: 14px;
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  box-shadow: var(--shadow-sm);
}
@media (max-width: 768px) {
  .profile-hero { grid-template-columns: auto 1fr; }
  .profile-id { grid-column: 1 / -1; justify-self: start; }
}

.profile-avatar {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #fff5f5;
  border: 1.5px solid #fecaca;
  color: #b82020;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
}
:global(.shell[data-theme="dark"]) .profile-avatar { background: #2c1212; border-color: #6b2020; color: #f87171; }

.profile-name { margin: 0; font-size: 1.05rem; font-weight: 900; color: var(--text-1); }
.profile-email { margin: .15rem 0 0; font-size: .85rem; color: var(--text-3); }

.profile-badges { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .65rem; }

.badge {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .22rem .6rem;
  border-radius: 999px;
  font-size: .74rem;
  font-weight: 800;
  border: 1.5px solid transparent;
}
.badge--green { background: #f0faf5; color: #1e6b41; border-color: rgba(46,139,87,.2); }
.badge--red { background: #fff5f5; color: #b82020; border-color: rgba(200,40,40,.15); }
.badge--gray { background: var(--bg-page); border-color: var(--border); color: var(--text-3); }

:global(.shell[data-theme="dark"]) .badge--green { background: #1a3327; border-color: #2a5540; color: #6cd49a; }
:global(.shell[data-theme="dark"]) .badge--red { background: #2c1212; border-color: #6b2020; color: #e08585; }

.profile-id { text-align: right; }
.id-label { display: block; font-size: .7rem; color: var(--text-3); font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.id-value { display: block; margin-top: .15rem; font-size: 1rem; font-weight: 900; color: var(--text-1); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: .75rem;
}
@media (min-width: 768px) {
  .detail-grid { grid-template-columns: 1fr 1fr; }
}

.detail-cell {
  padding: .75rem .85rem;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--bg-page);
}
.detail-label {
  font-size: .7rem;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.detail-value { margin-top: .35rem; font-size: .9rem; font-weight: 800; color: var(--text-1); }

.skeleton-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(90deg, var(--border) 25%, var(--bg-page) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton {
  display: inline-block;
  border-radius: 6px;
  height: 13px;
  background: linear-gradient(90deg, var(--border) 25%, var(--bg-page) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton--sm { width: 90px; }
.skeleton--md { width: 140px; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

.btn-spinner { animation: spin .85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toast-enter-active, .toast-leave-active { transition: opacity .22s ease, transform .22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-5px); }
</style>
