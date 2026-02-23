<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type DoctorRow = {
  doctor_id: number
  user_id: string
  full_name: string
  specialization?: string
  phone?: string
  email?: string
  consultation_fee?: number
  is_available?: boolean
  created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const rows = ref<DoctorRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const actionError = ref<string | null>(null)
const deletingId = ref<number | null>(null)
const showDeleteModal = ref(false)
const pendingDeleteId = ref<number | null>(null)

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

const filters = ref({ q: '', specialization: '', min_fee: '', max_fee: '' })
const hasActiveFilters = ref(false)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const minFee = filters.value.min_fee.trim() ? Number(filters.value.min_fee) : NaN
    const maxFee = filters.value.max_fee.trim() ? Number(filters.value.max_fee) : NaN
    const res = await api.get<{ success: boolean; data: DoctorRow[] }>('/api/admin/doctors', {
      token: auth.accessToken,
      query: {
        q: filters.value.q.trim() || undefined,
        specialization: filters.value.specialization.trim() || undefined,
        min_fee: Number.isFinite(minFee) ? minFee : undefined,
        max_fee: Number.isFinite(maxFee) ? maxFee : undefined,
      },
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load doctors'
  } finally {
    isLoading.value = false
  }
}

async function applyFilters() {
  success.value = null
  actionError.value = null
  hasActiveFilters.value = !!(filters.value.q || filters.value.specialization || filters.value.min_fee || filters.value.max_fee)
  await load()
}

async function clearFilters() {
  filters.value = { q: '', specialization: '', min_fee: '', max_fee: '' }
  hasActiveFilters.value = false
  success.value = null
  actionError.value = null
  await load()
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) { success.value = null; actionError.value = null; return }
  if (notice === 'doctor_created') showSuccess('Doctor created successfully.')
  else if (notice === 'doctor_updated') showSuccess('Doctor updated successfully.')
  else if (notice === 'doctor_deleted') showSuccess('Doctor deleted successfully.')
  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

function confirmDelete(doctorId: number) {
  pendingDeleteId.value = doctorId
  showDeleteModal.value = true
}

function cancelDelete() {
  pendingDeleteId.value = null
  showDeleteModal.value = false
}

async function executeDelete() {
  if (!pendingDeleteId.value) return
  const id = pendingDeleteId.value
  showDeleteModal.value = false
  pendingDeleteId.value = null
  deletingId.value = id
  actionError.value = null
  success.value = null
  try {
    await api.del(`/api/admin/doctors/${id}`, { token: auth.accessToken })
    showSuccess('Doctor deleted successfully.')
    await load()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete doctor')
  } finally {
    deletingId.value = null
  }
}

const formatFee = (fee?: number) => fee != null ? `$${fee.toLocaleString()}` : '—'
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

onMounted(() => { consumeNotice(); load() })
onActivated(() => { consumeNotice(); load() })
</script>

<template>
  <div class="page">

    <!-- ── Header ──────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-heading">Doctors</h1>
        <p class="page-sub">{{ isLoading ? 'Loading…' : `${rows.length} doctor${rows.length !== 1 ? 's' : ''} registered` }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" :disabled="isLoading" @click="load">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" :class="{ spinning: isLoading }">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
        <router-link class="btn-primary" to="/admin/doctors/create">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Doctor
        </router-link>
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

    <!-- ── Filter card ─────────────────────────── -->
    <div class="filter-card">
      <div class="filter-header">
        <div class="filter-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
          <span v-if="hasActiveFilters" class="filter-active-badge">Active</span>
        </div>
      </div>
      <form class="filter-form" @submit.prevent="applyFilters">
        <div class="filter-fields">
          <div class="field">
            <label class="flabel">Name / Email</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input v-model="filters.q" class="finput finput-icon" placeholder="Search name or email…" />
            </div>
          </div>
          <div class="field">
            <label class="flabel">Specialization</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
                <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/>
              </svg>
              <input v-model="filters.specialization" class="finput finput-icon" placeholder="e.g. Cardiologist…" />
            </div>
          </div>
          <div class="field">
            <label class="flabel">Min Fee ($)</label>
            <input v-model="filters.min_fee" class="finput" inputmode="decimal" placeholder="0" />
          </div>
          <div class="field">
            <label class="flabel">Max Fee ($)</label>
            <input v-model="filters.max_fee" class="finput" inputmode="decimal" placeholder="9999" />
          </div>
        </div>
        <div class="filter-actions">
          <button type="submit" class="btn-primary btn-sm" :disabled="isLoading">Apply</button>
          <button type="button" class="btn-ghost btn-sm" :disabled="isLoading" @click="clearFilters">Clear filters</button>
        </div>
      </form>
    </div>

    <!-- ── Table card ──────────────────────────── -->
    <div class="table-card">

      <!-- Table error -->
      <div v-if="error" class="table-error">
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        {{ error }}
      </div>

      <!-- Loading skeleton rows -->
      <div v-else-if="isLoading" class="skeleton-list">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line w-24"></div>
          </div>
          <div class="skeleton-line w-32 ml-auto"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="rows.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 100 .3"/>
            <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/>
          </svg>
        </div>
        <p class="empty-title">No doctors found</p>
        <p class="empty-sub">{{ hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first doctor to get started.' }}</p>
        <router-link v-if="!hasActiveFilters" class="btn-primary btn-sm" to="/admin/doctors/create">Add Doctor</router-link>
        <button v-else class="btn-ghost btn-sm" @click="clearFilters">Clear filters</button>
      </div>

      <!-- Table -->
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Specialization</th>
              <th>Contact</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Joined</th>
              <th class="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.doctor_id"
              class="trow"
              :class="{ 'trow-deleting': deletingId === r.doctor_id }"
            >
              <!-- Doctor -->
              <td class="td-doctor">
                <div class="doc-avatar" aria-hidden="true">
                  {{ r.full_name.charAt(0).toUpperCase() }}
                </div>
                <div class="doc-info">
                  <span class="doc-name">{{ r.full_name }}</span>
                  <span class="doc-id">ID #{{ r.doctor_id }}</span>
                </div>
              </td>
              <!-- Specialization -->
              <td>
                <span v-if="r.specialization" class="spec-badge">{{ r.specialization }}</span>
                <span v-else class="td-empty">—</span>
              </td>
              <!-- Contact -->
              <td class="td-contact">
                <span v-if="r.email" class="td-email">{{ r.email }}</span>
                <span v-if="r.phone" class="td-phone">{{ r.phone }}</span>
                <span v-if="!r.email && !r.phone" class="td-empty">—</span>
              </td>
              <!-- Fee -->
              <td>
                <span v-if="r.consultation_fee != null" class="fee-value">{{ formatFee(r.consultation_fee) }}</span>
                <span v-else class="td-empty">—</span>
              </td>
              <!-- Status -->
              <td>
                <span class="status-chip" :class="r.is_available ? 'status-available' : 'status-unavailable'">
                  <span class="status-dot" aria-hidden="true"></span>
                  {{ r.is_available ? 'Available' : 'Unavailable' }}
                </span>
              </td>
              <!-- Joined -->
              <td class="td-date">{{ formatDate(r.created_at) }}</td>
              <!-- Actions -->
              <td class="td-actions">
                <div class="row-actions">
                  <router-link class="act-btn act-view" :to="`/admin/doctors/${r.doctor_id}`" title="View profile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                  </router-link>
                  <router-link class="act-btn act-edit" :to="`/admin/doctors/${r.doctor_id}/edit`" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </router-link>
                  <router-link class="act-btn act-alerts" :to="`/admin/doctors/${r.doctor_id}/alerts`" title="Alerts">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                    Alerts
                  </router-link>
                  <button
                    class="act-btn act-delete"
                    :disabled="deletingId === r.doctor_id"
                    title="Delete"
                    @click="confirmDelete(r.doctor_id)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table footer -->
      <div v-if="rows.length > 0 && !isLoading" class="table-footer">
        Showing <strong>{{ rows.length }}</strong> doctor{{ rows.length !== 1 ? 's' : '' }}
        <span v-if="hasActiveFilters" class="filter-note">· Filtered results</span>
      </div>
    </div>

    <!-- ── Delete confirm modal ────────────────── -->
    <Transition name="modal">
      <div v-if="showDeleteModal" class="modal-backdrop" @click.self="cancelDelete">
        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 id="modal-title" class="modal-title">Delete Doctor?</h3>
          <p class="modal-body">This action is permanent and cannot be undone. The doctor's profile and associated data will be removed.</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="cancelDelete">Cancel</button>
            <button class="btn-danger" @click="executeDelete">Yes, delete</button>
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
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 1200px;
  animation: pg-in 0.25s ease both;
}
@keyframes pg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Page header ──────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 0.2rem;
  letter-spacing: -0.015em;
}
.page-sub { font-size: 0.82rem; color: var(--text-3); margin: 0; font-weight: 500; }
.header-actions { display: flex; align-items: center; gap: 0.625rem; }

/* ── Buttons ──────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.58rem 1.1rem;
  border-radius: 9px;
  border: none;
  background: var(--g-500, #2E8B57);
  font-family: 'Nunito', sans-serif;
  font-size: 0.855rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(46,139,87,0.25);
}
.btn-primary:hover { background: var(--g-600, #236B43); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(46,139,87,0.3); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.58rem 1rem;
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
.btn-ghost:hover { background: var(--nav-hover); color: var(--text-1); border-color: var(--g-300, #8fcfad); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
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
.btn-danger:hover { background: #b91c1c; }

.btn-sm { padding: 0.45rem 0.875rem; font-size: 0.8rem; }

.spinning { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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

.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Filter card ──────────────────────────────── */
.filter-card {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
}
.filter-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-2);
}
.filter-active-badge {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
}
.filter-form { padding: 1.125rem 1.25rem; }
.filter-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.875rem;
  margin-bottom: 1rem;
}

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.flabel { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-3); }
.input-wrap { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 0.75rem; color: var(--text-4); pointer-events: none; }

.finput {
  width: 100%;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 0.58rem 0.75rem;
  font-family: 'Nunito', sans-serif;
  font-size: 0.855rem;
  color: var(--text-1);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.finput-icon { padding-left: 2.25rem; }
.finput::placeholder { color: var(--text-4); }
.finput:focus { border-color: var(--g-500, #2E8B57); background: var(--bg-topbar); box-shadow: 0 0 0 3px rgba(46,139,87,0.11); }

.filter-actions { display: flex; align-items: center; gap: 0.625rem; }

/* ── Table card ───────────────────────────────── */
.table-card {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* Error inside table */
.table-error {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  font-size: 0.84rem;
  font-weight: 600;
  background: #fff5f5;
  border-bottom: 1px solid #f5bcbc;
  color: #b82020;
}
:global(.shell[data-theme="dark"]) .table-error { background: #2c1212; border-color: #6b2020; color: #e08585; }

/* Skeleton loading */
.skeleton-list { padding: 0.5rem 0; }
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border-light, #edf5f0);
}
.skeleton-row:last-child { border-bottom: none; }
.skeleton-avatar {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: var(--border);
  flex-shrink: 0;
  animation: shimmer 1.4s ease infinite;
}
.skeleton-lines { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.skeleton-line {
  height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--border-light, #edf5f0) 25%, var(--border, #daeae2) 50%, var(--border-light, #edf5f0) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
}
.w-40 { width: 40%; } .w-24 { width: 24%; } .w-32 { width: 32%; } .ml-auto { margin-left: auto; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3.5rem 2rem;
  gap: 0.625rem;
  text-align: center;
}
.empty-icon {
  width: 60px; height: 60px;
  border-radius: 16px;
  background: var(--g-100, #eaf6f0);
  color: var(--g-500, #2E8B57);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.5rem;
}
.empty-title { font-size: 0.975rem; font-weight: 700; color: var(--text-1); margin: 0; }
.empty-sub { font-size: 0.82rem; color: var(--text-3); margin: 0 0 0.5rem; }

/* Table */
.table-wrap { overflow-x: auto; }
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.table thead tr {
  background: var(--bg-page);
  border-bottom: 1.5px solid var(--border);
}
.table th {
  padding: 0.75rem 1.1rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-3);
  white-space: nowrap;
  text-align: left;
}
.th-actions { text-align: right; }

/* Table rows */
.trow {
  border-bottom: 1px solid var(--border-light, #edf5f0);
  transition: background 0.12s;
}
.trow:last-child { border-bottom: none; }
.trow:hover { background: var(--nav-hover, #edf6f1); }
.trow-deleting { opacity: 0.4; pointer-events: none; }

.table td { padding: 0.875rem 1.1rem; vertical-align: middle; color: var(--text-2); }

/* Doctor cell */
.td-doctor { display: flex; align-items: center; gap: 0.75rem; }
.doc-avatar {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
  font-size: 0.82rem;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  border: 1.5px solid var(--g-200, #c6e8d6);
}
.doc-info { display: flex; flex-direction: column; gap: 1px; }
.doc-name { font-size: 0.875rem; font-weight: 700; color: var(--text-1); white-space: nowrap; }
.doc-id { font-size: 0.7rem; color: var(--text-4); font-weight: 600; }

/* Specialization badge */
.spec-badge {
  display: inline-block;
  padding: 0.18rem 0.625rem;
  border-radius: 99px;
  font-size: 0.74rem;
  font-weight: 700;
  background: var(--g-100, #eaf6f0);
  color: var(--g-600, #236B43);
  border: 1px solid var(--g-200, #c6e8d6);
  white-space: nowrap;
}

/* Contact cell */
.td-contact { display: flex; flex-direction: column; gap: 2px; }
.td-email { font-size: 0.8rem; color: var(--text-2); }
.td-phone { font-size: 0.75rem; color: var(--text-3); }
.td-empty { color: var(--text-4); }

/* Fee */
.fee-value { font-weight: 700; color: var(--text-1); font-size: 0.875rem; }

/* Status chip */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.22rem 0.625rem;
  border-radius: 99px;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
}
.status-available   { background: #f0faf5; color: #1e6b41; border: 1px solid rgba(46,139,87,0.2); }
.status-unavailable { background: #fdf4f4; color: #9b1d1d; border: 1px solid rgba(200,40,40,0.15); }
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-available .status-dot   { background: #2E8B57; box-shadow: 0 0 0 2px rgba(46,139,87,0.2); }
.status-unavailable .status-dot { background: #dc2626; box-shadow: 0 0 0 2px rgba(220,38,38,0.15); }

:global(.shell[data-theme="dark"]) .status-available   { background: #1a3327; color: #6cd49a; border-color: #2a5540; }
:global(.shell[data-theme="dark"]) .status-unavailable { background: #2c1212; color: #e08585; border-color: #6b2020; }

/* Date */
.td-date { font-size: 0.78rem; color: var(--text-3); white-space: nowrap; }

/* Row actions */
.td-actions { text-align: right; }
.row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem; flex-wrap: nowrap; }

.act-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.32rem 0.65rem;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-3);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}
.act-view:hover   { background: var(--g-100, #eaf6f0); border-color: var(--g-300, #8fcfad); color: var(--g-600, #236B43); }
.act-edit:hover   { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.act-alerts:hover { background: #fefce8; border-color: #fde68a; color: #92400e; }
.act-delete       { border-color: var(--border); }
.act-delete:hover { background: #fff5f5; border-color: #fca5a5; color: #dc2626; }
.act-delete:disabled { opacity: 0.4; cursor: not-allowed; }

:global(.shell[data-theme="dark"]) .act-view:hover   { background: #1a3327; border-color: #2a5540; color: #6cd49a; }
:global(.shell[data-theme="dark"]) .act-edit:hover   { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .act-alerts:hover { background: #2c2010; border-color: #6b4f00; color: #dba05a; }
:global(.shell[data-theme="dark"]) .act-delete:hover { background: #2c1212; border-color: #6b2020; color: #e08585; }

/* Table footer */
.table-footer {
  padding: 0.75rem 1.25rem;
  font-size: 0.77rem;
  color: var(--text-3);
  font-weight: 600;
  border-top: 1px solid var(--border-light, #edf5f0);
}
.table-footer strong { color: var(--text-1); }
.filter-note { color: var(--g-500, #2E8B57); }

/* ── Delete modal ─────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 21, 16, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
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
  max-width: 380px;
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
.modal-actions { display: flex; gap: 0.75rem; justify-content: center; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-box { transform: scale(0.92); }
</style>