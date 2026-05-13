<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

type SupplierRow = {
  supplier_id: number
  supplier_name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  status: 'Active' | 'Inactive'
  created_at?: string
  updated_at?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const rows = ref<SupplierRow[]>([])
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

const filters = ref({ q: '', status: '' })
const hasActiveFilters = ref(false)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const res = await api.get<{ success: boolean; data: SupplierRow[] }>('/api/medicines/suppliers', {
      token: auth.accessToken,
      query: {
        q: filters.value.q.trim() || undefined,
        status: filters.value.status.trim() || undefined,
      },
    })
    rows.value = res.data || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Failed to load suppliers'
  } finally {
    isLoading.value = false
  }
}

async function applyFilters() {
  success.value = null
  actionError.value = null
  hasActiveFilters.value = !!(filters.value.q || filters.value.status)
  await load()
}

async function clearFilters() {
  filters.value = { q: '', status: '' }
  hasActiveFilters.value = false
  success.value = null
  actionError.value = null
  await load()
}

function consumeNotice() {
  const notice = route.query.notice
  if (typeof notice !== 'string' || !notice) { success.value = null; actionError.value = null; return }
  if (notice === 'supplier_created') showSuccess('Supplier created successfully.')
  else if (notice === 'supplier_updated') showSuccess('Supplier updated successfully.')
  else if (notice === 'supplier_deleted') showSuccess('Supplier deleted successfully.')
  const nextQuery: LocationQueryRaw = { ...route.query }
  delete (nextQuery as any).notice
  router.replace({ query: nextQuery })
}

function confirmDelete(supplierId: number) {
  pendingDeleteId.value = supplierId
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
    await api.del(`/api/medicines/suppliers/${id}`, { token: auth.accessToken })
    showSuccess('Supplier deleted successfully.')
    await load()
  } catch (e) {
    showError(e instanceof ApiError ? e.message : 'Failed to delete supplier')
  } finally {
    deletingId.value = null
  }
}

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

onMounted(() => { consumeNotice(); load() })
onActivated(() => { consumeNotice(); load() })
</script>

<template>
  <div class="page">

    <!-- ── Header ──────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-heading">Suppliers</h1>
        <p class="page-sub">{{ isLoading ? 'Loading…' : `${rows.length} supplier${rows.length !== 1 ? 's' : ''} registered` }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" :disabled="isLoading" @click="load">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" :class="{ spinning: isLoading }">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
        <router-link class="btn-primary" to="/admin/suppliers/create">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Supplier
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

    <!-- ── Filter section ────────────────────────── -->
    <div class="filters-section">
      <div class="filters-header">
        <h2 class="filters-title">Search & Filter</h2>
        <span v-if="hasActiveFilters" class="filter-badge">✓ Filters Active</span>
      </div>
      <form class="filters-form" @submit.prevent="applyFilters">
        <div class="filters-grid">
          <div class="filter-field">
            <label class="filter-label">Name / Contact Person</label>
            <div class="search-input">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input v-model="filters.q" class="search-field" placeholder="Search supplier name or contact…" />
            </div>
          </div>

          <div class="filter-field">
            <label class="filter-label">Status</label>
            <select v-model="filters.status" class="filter-select">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div class="filter-actions">
            <button type="submit" class="btn-primary btn-sm">Search</button>
            <button v-if="hasActiveFilters" type="button" class="btn-secondary btn-sm" @click="clearFilters">Clear</button>
          </div>
        </div>
      </form>
    </div>

    <!-- ── Data table ───────────────────────────── -->
    <div class="table-card">
      <div class="table-header">
        <h3 class="table-title">Suppliers List</h3>
        <span class="table-count">{{ rows.length }} supplier{{ rows.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="table-wrapper">
        <table class="data-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Supplier Name</th>
              <th scope="col">Contact Person</th>
              <th scope="col">Phone</th>
              <th scope="col">Email</th>
              <th scope="col">Status</th>
              <th scope="col" style="text-align: right">Actions</th>
            </tr>
          </thead>
          <tbody v-if="!isLoading && rows.length > 0">
            <tr v-for="supplier in rows" :key="supplier.supplier_id" class="table-row">
              <td class="col-name"><strong>{{ supplier.supplier_name }}</strong></td>
              <td class="col-contact">{{ supplier.contact_person || '—' }}</td>
              <td class="col-phone">{{ supplier.phone || '—' }}</td>
              <td class="col-email">{{ supplier.email || '—' }}</td>
              <td class="col-status">
                <span class="status-badge" :class="`status-${supplier.status.toLowerCase()}`">
                  {{ supplier.status }}
                </span>
              </td>
              <td class="col-actions">
                <div class="action-buttons">
                  <router-link :to="`/admin/suppliers/${supplier.supplier_id}/edit`" class="btn-action btn-edit" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </router-link>
                  <button
                    type="button"
                    class="btn-action btn-delete"
                    :disabled="deletingId === supplier.supplier_id"
                    @click="confirmDelete(supplier.supplier_id)"
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!isLoading && rows.length === 0">
            <tr>
              <td colspan="6" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
                  <path d="M9 12.5h1M14 12.5h1M6 9c0-1 1-3 6-3s6 2 6 3"/>
                  <path d="M7 14h10v4H7z"/>
                </svg>
                <p>No suppliers found</p>
                <p class="muted">Try adjusting your filters or <router-link to="/admin/suppliers/create">add a new supplier</router-link></p>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="6" class="empty-state loading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" class="spinner">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/>
                </svg>
                Loading suppliers…
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Delete confirmation modal ────────────── -->
    <Transition name="modal">
      <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
        <div class="modal" role="alertdialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Delete Supplier</h2>
            <button type="button" class="close-btn" @click="cancelDelete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this supplier? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-ghost" @click="cancelDelete">Cancel</button>
            <button type="button" class="btn-danger" @click="executeDelete">Delete</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.5em;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1em;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.35em;
}

.page-heading {
  margin: 0;
  font-size: 1.7em;
  font-weight: 700;
  color: #1f2937;
}

.page-sub {
  margin: 0;
  color: #6b7280;
  font-size: 1.02em;
}

.header-actions {
  display: flex;
  gap: 0.75em;
  align-items: center;
}

.btn-ghost {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 0.5em;
  padding: 0.65em 1em;
  font-size: 0.95em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  text-decoration: none;
}

.btn-ghost:hover {
  background: #f9fafb;
  color: #111827;
}

.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5em;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  padding: 0.65em 1em;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  text-decoration: none;
}

.btn-primary:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.toast {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  padding: 0.7em 0.95em;
  border-radius: 0.5em;
  font-size: 0.92em;
  border: 1px solid transparent;
}

.toast-success {
  color: #065f46;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.toast-error {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  padding: 1em;
}

.modal {
  width: min(460px, 100%);
  background: white;
  border-radius: 0.75em;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1em 1.1em;
  border-bottom: 1px solid #f3f4f6;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.05em;
  color: #111827;
}

.close-btn {
  width: 2em;
  height: 2em;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 0.45em;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn:hover {
  background: #f9fafb;
  color: #111827;
}

.modal-body {
  padding: 1em 1.1em;
  color: #4b5563;
  line-height: 1.55;
}

.modal-footer {
  padding: 0.95em 1.1em 1.1em;
  display: flex;
  justify-content: flex-end;
  gap: 0.65em;
}

.btn-danger {
  border: 1px solid #fecaca;
  background: #ef4444;
  color: #fff;
  border-radius: 0.5em;
  padding: 0.62em 1em;
  font-size: 0.92em;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: #dc2626;
}

.spinning {
  animation: spin 1s linear infinite;
}

.toast-enter-active,
.toast-leave-active,
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to,
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.filters-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75em;
  padding: 1.5em;
  margin-bottom: 2em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.filters-header {
  display: flex;
  align-items: center;
  gap: 1em;
  margin-bottom: 1.25em;
}

.filters-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.filter-badge {
  background: #dbeafe;
  color: #0369a1;
  padding: 0.35em 0.75em;
  border-radius: 9999px;
  font-size: 0.85em;
  font-weight: 500;
}

.filters-form {
  display: contents;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 150px auto;
  gap: 1em;
  align-items: flex-end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.filter-label {
  font-size: 0.9em;
  font-weight: 500;
  color: #374151;
}

.search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input svg {
  position: absolute;
  left: 0.75em;
  color: #9ca3af;
  pointer-events: none;
}

.search-field {
  width: 100%;
  padding: 0.65em 0.75em 0.65em 2.5em;
  border: 1px solid #d1d5db;
  border-radius: 0.5em;
  font-size: 0.95em;
  background: white;
  transition: all 0.2s;
}

.search-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-select {
  padding: 0.65em 0.75em;
  border: 1px solid #d1d5db;
  border-radius: 0.5em;
  font-size: 0.95em;
  background: white;
  color: #1f2937;
  transition: all 0.2s;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-actions {
  display: flex;
  gap: 0.75em;
}

.btn-sm {
  padding: 0.65em 1em;
  font-size: 0.9em;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  white-space: nowrap;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5em;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 0.5em;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f9fafb;
  color: #1f2937;
  border-color: #9ca3af;
}

.table-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75em;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.table-header {
  padding: 1.5em;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f9fafb;
}

.table-title {
  font-size: 1.05em;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.table-count {
  font-size: 0.9em;
  color: #6b7280;
  font-weight: 500;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95em;
}

.data-table thead {
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
}

.data-table th {
  padding: 0.75em 1em;
  text-align: left;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.table-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.table-row:hover {
  background: #f9fafb;
}

.data-table td {
  padding: 1em;
  vertical-align: middle;
}

.col-name {
  font-weight: 500;
  color: #1f2937;
}

.col-contact {
  color: #6b7280;
  font-size: 0.9em;
}

.col-phone {
  color: #6b7280;
  font-size: 0.9em;
}

.col-email {
  color: #6b7280;
  font-size: 0.9em;
  word-break: break-all;
}

.col-status {
  /* */
}

.status-badge {
  display: inline-block;
  padding: 0.4em 0.85em;
  border-radius: 0.375em;
  font-size: 0.85em;
  font-weight: 500;
}

.status-active {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}

.status-inactive {
  background: rgba(107, 114, 128, 0.1);
  color: #374151;
}

.col-actions {
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 0.5em;
  justify-content: flex-end;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2em;
  height: 2.2em;
  border-radius: 0.4em;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9em;
}

.btn-edit {
  background: #dbeafe;
  color: #0369a1;
}

.btn-edit:hover {
  background: #bfdbfe;
  color: #0c4a6e;
}

.btn-delete {
  background: #fee2e2;
  color: #991b1b;
}

.btn-delete:hover:not(:disabled) {
  background: #fecaca;
  color: #7f1d1d;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 3em 1em;
  color: #6b7280;
}

.empty-state.loading {
  color: #9ca3af;
}

.empty-state svg {
  margin-bottom: 1em;
  opacity: 0.5;
}

.empty-state p {
  margin: 0.5em 0;
}

.empty-state .muted {
  font-size: 0.9em;
  opacity: 0.8;
}

.empty-state a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.empty-state a:hover {
  text-decoration: underline;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .col-phone,
  .col-email {
    display: none;
  }
}
</style>
