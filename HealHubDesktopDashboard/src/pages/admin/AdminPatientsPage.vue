<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type PatientRow = {
  patient_id: number
  user_id?: string
  full_name?: string
  phone?: string
  email?: string
  dob?: string
  gender?: string
  address?: string
  created_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const rows = ref<PatientRow[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const actionError = ref<string | null>(null)
const deleteLoadingId = ref<number | null>(null)

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

const filters = ref({ q: '' })

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) { success.value = null; actionError.value = null; return }
  if (notice === 'patient_created') showSuccess('Patient created successfully.')
  else if (notice === 'patient_updated') showSuccess('Patient updated successfully.')
  else if (notice === 'patient_deleted') showSuccess('Patient deleted successfully.')
  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: PatientRow[] }>('/api/admin/patients', {
      token: auth.accessToken,
      query: { q: filters.value.q.trim() || undefined },
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load patients'
  } finally {
    isLoading.value = false
  }
}

async function applyFilters() {
  success.value = null; actionError.value = null
  await load()
}
async function clearFilters() {
  filters.value = { q: '' }
  success.value = null; actionError.value = null
  await load()
}

async function deletePatient(patientId: number) {
  if (!confirm('Delete this patient? This action cannot be undone.')) return
  deleteLoadingId.value = patientId
  actionError.value = null; success.value = null
  try {
    await api.del(`/api/admin/patients/${patientId}`, { token: auth.accessToken })
    showSuccess('Patient deleted successfully.')
    await load()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete patient')
  } finally {
    deleteLoadingId.value = null
  }
}

onMounted(() => { consumeNotice(); load() })
onActivated(() => { consumeNotice(); load() })
</script>

<template>
  <div class="page">

    <!-- ══ Page Header ══════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-heading">Patients</h1>
        <p class="page-sub">View, search and manage all patient records.</p>
      </div>
      <router-link class="btn-primary" to="/admin/patients/create">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Add Patient
      </router-link>
    </div>

    <!-- ══ Toast banners ════════════════════════════ -->
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

    <!-- ══ Filter Card ═══════════════════════════════ -->
    <div class="form-section">
      <div class="section-head">
        <div class="section-icon section-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
        </div>
        <div>
          <div class="section-title">Filter Patients</div>
          <div class="section-sub">Search by name, email or phone</div>
        </div>
      </div>

      <form class="filter-row" @submit.prevent="applyFilters">
        <div class="field filter-field">
          <label class="flabel" for="filter-q">Search</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="filter-q" v-model="filters.q"
              class="finput finput--icon" placeholder="Search by name, email…" />
          </div>
        </div>
        <div class="filter-actions">
          <button type="submit" class="btn-primary btn-sm" :disabled="isLoading">
            <svg v-if="isLoading" class="btn-spinner" viewBox="0 0 24 24" fill="none" width="13" height="13">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="28 56"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Apply
          </button>
          <button type="button" class="btn-ghost btn-sm" :disabled="isLoading" @click="clearFilters">
            Clear
          </button>
        </div>
      </form>
    </div>

    <!-- ══ Table Card ════════════════════════════════ -->
    <div class="form-section table-section">

      <!-- table header -->
      <div class="table-header">
        <div class="table-header-left">
          <div class="section-icon section-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Patient List</div>
            <div class="section-sub">
              {{ isLoading ? 'Loading…' : `${rows.length} patient${rows.length !== 1 ? 's' : ''}` }}
            </div>
          </div>
        </div>
        <button class="btn-ghost btn-sm" @click="load" :disabled="isLoading">
          <svg :class="{ 'btn-spinner': isLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <!-- load error -->
      <div v-if="error" class="banner banner--error" style="margin: 0 0 1rem">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        {{ error }}
      </div>

      <!-- table -->
      <div class="table-wrap">
        <table class="ptable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>DOB</th>
              <th>Gender</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <!-- skeleton rows -->
            <tr v-if="isLoading" v-for="i in 5" :key="'sk-'+i" class="ptable-row">
              <td><span class="skeleton skeleton--md"></span></td>
              <td><span class="skeleton skeleton--lg"></span></td>
              <td><span class="skeleton skeleton--sm"></span></td>
              <td><span class="skeleton skeleton--sm"></span></td>
              <td><span class="skeleton skeleton--xs"></span></td>
              <td></td>
            </tr>

            <!-- data rows -->
            <template v-if="!isLoading">
              <tr v-for="r in rows" :key="r.patient_id" class="ptable-row">
                <td>
                  <div class="patient-name-cell">
                    <div class="patient-avatar">
                      {{ (r.full_name || '?').charAt(0).toUpperCase() }}
                    </div>
                    <span class="patient-name">{{ r.full_name || '—' }}</span>
                  </div>
                </td>
                <td class="cell-muted">{{ r.email || '—' }}</td>
                <td class="cell-muted">{{ r.phone || '—' }}</td>
                <td class="cell-muted">{{ r.dob || '—' }}</td>
                <td>
                  <span v-if="r.gender" class="gender-chip" :class="`gender-chip--${(r.gender || '').toLowerCase()}`">
                    {{ r.gender }}
                  </span>
                  <span v-else class="cell-muted">—</span>
                </td>
                <td>
                  <div class="row-actions">
                    <router-link class="action-btn action-btn--view" :to="`/admin/patients/${r.patient_id}`">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                        stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </router-link>
                    <router-link class="action-btn action-btn--edit" :to="`/admin/patients/${r.patient_id}/edit`">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                        stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </router-link>
                    <router-link class="action-btn action-btn--alerts" :to="`/admin/patients/${r.patient_id}/alerts`">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                        stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 01-3.46 0"/>
                      </svg>
                      Alerts
                    </router-link>
                    <button class="action-btn action-btn--delete"
                      :disabled="deleteLoadingId === r.patient_id"
                      @click="deletePatient(r.patient_id)">
                      <svg v-if="deleteLoadingId === r.patient_id"
                        class="btn-spinner" viewBox="0 0 24 24" fill="none" width="13" height="13">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
                          stroke-linecap="round" stroke-dasharray="28 56"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                        stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
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

              <!-- empty -->
              <tr v-if="rows.length === 0">
                <td colspan="6">
                  <div class="empty-state">
                    <div class="empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                        <path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <p class="empty-title">No patients found</p>
                    <p class="empty-sub">Try adjusting your search or add a new patient.</p>
                    <router-link class="btn-primary btn-sm" style="margin-top:.75rem" to="/admin/patients/create">
                      Add Patient
                    </router-link>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
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

/* header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: .625rem;
}
.page-heading {
  font-family: 'Lora', serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 .25rem;
  letter-spacing: -.015em;
}
.page-sub { font-size: .82rem; color: var(--text-3); margin: 0; }

/* ════════════════════════════════════════════════
   BANNER TOASTS
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

/* ════════════════════════════════════════════════
   SECTION CARD  (same as Create/Edit Doctor)
   ════════════════════════════════════════════════ */
.form-section {
  background: var(--bg-topbar);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}
.table-section { padding: 0; overflow: hidden; }

.section-head {
  display: flex; align-items: flex-start; gap: .875rem;
  margin-bottom: 1.25rem;
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

:global(.shell[data-theme="dark"]) .section-icon--blue  { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .section-icon--green { background: #1a3327; border-color: #2a5540; color: #5dba83; }

.section-title { font-size: .9rem; font-weight: 700; color: var(--text-1); }
.section-sub   { font-size: .77rem; color: var(--text-3); margin-top: 2px; }

/* ════════════════════════════════════════════════
   FILTER BAR
   ════════════════════════════════════════════════ */
.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}
.filter-field { flex: 1; min-width: 200px; max-width: 380px; }
.filter-actions { display: flex; align-items: center; gap: .5rem; padding-bottom: .01rem; }

.field { display: flex; flex-direction: column; gap: .38rem; }
.flabel {
  display: flex; align-items: center; gap: .3rem;
  font-size: .72rem; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-3);
}

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
  box-sizing: border-box;
}
.finput::placeholder { color: var(--text-4); }
.finput:focus {
  border-color: var(--g-500, #2E8B57);
  background: var(--bg-topbar);
  box-shadow: 0 0 0 3px rgba(46,139,87,.11);
}
.finput--icon { padding-left: 2.4rem; }

/* ════════════════════════════════════════════════
   TABLE HEADER
   ════════════════════════════════════════════════ */
.table-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding: 1.25rem 1.5rem;
  border-bottom: 1.5px solid var(--border);
  flex-wrap: wrap;
}
.table-header-left { display: flex; align-items: center; gap: .875rem; }

/* ════════════════════════════════════════════════
   TABLE
   ════════════════════════════════════════════════ */
.table-wrap { overflow-x: auto; }

.ptable {
  width: 100%;
  border-collapse: collapse;
  font-size: .84rem;
}
.ptable thead th {
  padding: .75rem 1.25rem;
  font-size: .7rem;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--text-3);
  background: var(--bg-page);
  border-bottom: 1.5px solid var(--border);
  white-space: nowrap;
  text-align: left;
}
.ptable thead th:last-child { text-align: right; }

.ptable-row { border-bottom: 1px solid var(--border); transition: background .12s; }
.ptable-row:last-child { border-bottom: none; }
.ptable-row:hover { background: var(--nav-hover, rgba(46,139,87,.04)); }

.ptable td {
  padding: .875rem 1.25rem;
  color: var(--text-1);
  vertical-align: middle;
}
.cell-muted { color: var(--text-3) !important; font-size: .82rem; }

/* patient name cell */
.patient-name-cell { display: flex; align-items: center; gap: .625rem; }
.patient-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--g-100, #eaf6f0);
  border: 1.5px solid var(--g-200, #c6e8d6);
  color: var(--g-600, #236B43);
  font-size: .72rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
:global(.shell[data-theme="dark"]) .patient-avatar { background: #1a3327; border-color: #2a5540; color: #5dba83; }
.patient-name { font-weight: 700; color: var(--text-1); }

/* gender chip */
.gender-chip {
  display: inline-flex; align-items: center;
  padding: .18rem .6rem; border-radius: 99px;
  font-size: .72rem; font-weight: 700;
}
.gender-chip--male   { background: #eff6ff; color: #3b75d4; border: 1px solid #bfdbfe; }
.gender-chip--female { background: #fdf2f8; color: #a21caf; border: 1px solid #f0abfc; }
.gender-chip--other  { background: var(--g-100, #eaf6f0); color: var(--g-600, #236B43); border: 1px solid var(--g-200, #c6e8d6); }

:global(.shell[data-theme="dark"]) .gender-chip--male   { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .gender-chip--female { background: #2d1040; border-color: #6b2090; color: #e070f0; }

/* skeleton loader */
.skeleton {
  display: inline-block; border-radius: 6px;
  background: linear-gradient(90deg, var(--border) 25%, var(--bg-page) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  height: 14px;
}
.skeleton--xs  { width: 48px; }
.skeleton--sm  { width: 80px; }
.skeleton--md  { width: 120px; }
.skeleton--lg  { width: 160px; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center;
  padding: 3.5rem 1.5rem;
  gap: .35rem;
}
.empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-3); margin-bottom: .5rem;
}
.empty-title { font-size: .95rem; font-weight: 700; color: var(--text-1); margin: 0; }
.empty-sub   { font-size: .8rem; color: var(--text-3); margin: 0; }

/* ════════════════════════════════════════════════
   ROW ACTIONS
   ════════════════════════════════════════════════ */
.row-actions {
  display: flex; align-items: center; justify-content: flex-end;
  gap: .375rem; flex-wrap: wrap;
}

.action-btn {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .32rem .7rem; border-radius: 7px;
  font-family: 'Nunito', sans-serif; font-size: .75rem; font-weight: 700;
  cursor: pointer; text-decoration: none; border: 1.5px solid transparent;
  transition: background .13s, border-color .13s, color .13s, transform .1s;
  white-space: nowrap;
}
.action-btn:active { transform: scale(.97); }
.action-btn:disabled { opacity: .5; cursor: not-allowed; }

.action-btn--view {
  background: var(--bg-page); border-color: var(--border); color: var(--text-3);
}
.action-btn--view:hover { border-color: var(--g-300, #8fcfad); color: var(--text-1); }

.action-btn--edit {
  background: #eff6ff; border-color: #bfdbfe; color: #3b75d4;
}
.action-btn--edit:hover { background: #dbeafe; border-color: #93c5fd; }

.action-btn--alerts {
  background: #fef9ea; border-color: #fde68a; color: #c47b1a;
}
.action-btn--alerts:hover { background: #fef08a; border-color: #fbbf24; }

.action-btn--delete {
  background: #fff5f5; border-color: #f5bcbc; color: #b82020;
}
.action-btn--delete:hover { background: #fee2e2; border-color: #fca5a5; }

:global(.shell[data-theme="dark"]) .action-btn--view   { background: transparent; }
:global(.shell[data-theme="dark"]) .action-btn--edit   { background: #1a2540; border-color: #2a3f6b; color: #7aaaf0; }
:global(.shell[data-theme="dark"]) .action-btn--edit:hover { background: #1e2d55; }
:global(.shell[data-theme="dark"]) .action-btn--alerts { background: #2c2010; border-color: #6b4f00; color: #dba05a; }
:global(.shell[data-theme="dark"]) .action-btn--alerts:hover { background: #3a2c14; }
:global(.shell[data-theme="dark"]) .action-btn--delete { background: #2c1212; border-color: #6b2020; color: #e08585; }
:global(.shell[data-theme="dark"]) .action-btn--delete:hover { background: #3a1818; }

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
.btn-primary:hover:not(:disabled)  { background: var(--g-600, #236B43); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(46,139,87,.3); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary.btn-sm { padding: .5rem 1rem; font-size: .82rem; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .65rem 1.125rem; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--bg-topbar);
  font-family: 'Nunito', sans-serif; font-size: .875rem; font-weight: 700;
  color: var(--text-3); cursor: pointer; text-decoration: none;
  transition: background .15s, border-color .15s, color .15s;
}
.btn-ghost:hover:not(:disabled) { background: var(--nav-hover); color: var(--text-1); border-color: var(--g-300, #8fcfad); }
.btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost.btn-sm { padding: .5rem .875rem; font-size: .82rem; }

.btn-spinner { animation: spin .85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>