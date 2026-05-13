<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const createError = ref<string | null>(null)
const createLoading = ref(false)

const form = ref({
  supplier_name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  payment_terms: '',
  status: 'Active',
})

async function createSupplier() {
  createLoading.value = true
  createError.value = null

  try {
    if (!form.value.supplier_name.trim()) {
      createError.value = 'Supplier name is required.'
      return
    }

    const payload = {
      supplier_name: form.value.supplier_name,
      contact_person: form.value.contact_person || null,
      phone: form.value.phone || null,
      email: form.value.email || null,
      address: form.value.address || null,
      payment_terms: form.value.payment_terms || null,
      status: form.value.status,
    }

    await api.post('/api/medicines/suppliers', payload, { token: auth.accessToken })
    router.replace({ path: '/admin/suppliers', query: { notice: 'supplier_created' } })
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      createError.value = 'Doctor access required.'
    } else {
      createError.value = e instanceof ApiError ? e.message : 'Failed to create supplier'
    }
  } finally {
    createLoading.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- ── Page Header ─────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" to="/admin/suppliers">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Suppliers
        </router-link>
        <h1 class="page-heading">Add New Supplier</h1>
        <p class="page-sub">Fill in the details below to register a new supplier.</p>
      </div>
    </div>

    <form class="form-layout" @submit.prevent="createSupplier" novalidate>

      <!-- ── Error Alert ───────────────────────── -->
      <Transition name="alert">
        <div v-if="createError" class="alert alert-error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          {{ createError }}
        </div>
      </Transition>

      <!-- ── Section: Basic Information ────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Basic Information</div>
            <div class="section-sub">Supplier company name and contact person</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Supplier Name -->
          <div class="field">
            <label class="flabel" for="supplier_name">
              Supplier Name
              <span class="required" aria-hidden="true">*</span>
            </label>
            <div class="input-wrap">
              <input
                id="supplier_name"
                v-model="form.supplier_name"
                type="text"
                class="finput"
                placeholder="e.g., ABC Pharmaceuticals Ltd."
                required
              />
            </div>
          </div>

          <!-- Contact Person -->
          <div class="field">
            <label class="flabel" for="contact_person">Contact Person</label>
            <div class="input-wrap">
              <input
                id="contact_person"
                v-model="form.contact_person"
                type="text"
                class="finput"
                placeholder="e.g., John Smith"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Section: Contact Details ────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Contact Details</div>
            <div class="section-sub">Phone number and email address</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Phone -->
          <div class="field">
            <label class="flabel" for="phone">Phone</label>
            <div class="input-wrap">
              <input
                id="phone"
                v-model="form.phone"
                type="tel"
                class="finput"
                placeholder="e.g., +1 (555) 123-4567"
              />
            </div>
          </div>

          <!-- Email -->
          <div class="field">
            <label class="flabel" for="email">Email</label>
            <div class="input-wrap">
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="finput"
                placeholder="e.g., supplier@abcpharm.com"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Section: Address & Terms ────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Address & Payment Terms</div>
            <div class="section-sub">Supplier location and payment information</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Address -->
          <div class="field" style="grid-column: 1 / -1">
            <label class="flabel" for="address">Address</label>
            <div class="input-wrap">
              <textarea
                id="address"
                v-model="form.address"
                class="finput"
                placeholder="Street address, city, state, postal code…"
                rows="3"
              />
            </div>
          </div>

          <!-- Payment Terms -->
          <div class="field" style="grid-column: 1 / -1">
            <label class="flabel" for="payment_terms">Payment Terms</label>
            <div class="input-wrap">
              <input
                id="payment_terms"
                v-model="form.payment_terms"
                type="text"
                class="finput"
                placeholder="e.g., Net 30, Due on receipt, 2/10 Net 30"
              />
            </div>
          </div>

          <!-- Status -->
          <div class="field">
            <label class="flabel" for="status">Status</label>
            <select id="status" v-model="form.status" class="finput">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ── Form Actions ────────────────────── -->
      <div class="form-actions">
        <router-link to="/admin/suppliers" class="btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Cancel
        </router-link>
        <button type="submit" class="btn-primary" :disabled="createLoading">
          <svg v-if="!createLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="spinner">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/>
          </svg>
          {{ createLoading ? 'Creating...' : 'Create Supplier' }}
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
.alert {
  padding: 1em;
  border-radius: 0.5em;
  margin-bottom: 1.5em;
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  font-size: 0.95em;
  line-height: 1.5;
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  color: #991b1b;
  border-color: rgba(239, 68, 68, 0.3);
}

.required {
  color: #ef4444;
  margin-left: 0.2em;
}

.page {
  padding: 2em;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2.5em;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 1em;
  transition: color 0.2s;
}

.back-link:hover {
  color: #2563eb;
}

.page-heading {
  font-size: 1.75em;
  font-weight: 700;
  color: #1f2937;
  margin: 0.5em 0 0;
}

.page-sub {
  font-size: 1em;
  color: #6b7280;
  margin: 0.5em 0 0;
}

.form-layout {
  display: contents;
}

.form-section {
  padding: 2em;
  background: white;
  border-radius: 0.75em;
  border: 1px solid #e5e7eb;
  margin-bottom: 2em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 1.5em;
  margin-bottom: 2em;
  padding-bottom: 1.5em;
  border-bottom: 1px solid #f3f4f6;
}

.section-icon {
  width: 3em;
  height: 3em;
  border-radius: 0.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.section-icon--blue { background: #3b82f6; }
.section-icon--green { background: #10b981; }
.section-icon--purple { background: #8b5cf6; }

.section-title {
  font-size: 1.15em;
  font-weight: 600;
  color: #1f2937;
}

.section-sub {
  font-size: 0.9em;
  color: #6b7280;
  margin-top: 0.35em;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.75em;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.flabel {
  font-weight: 500;
  font-size: 0.95em;
  color: #374151;
  display: flex;
  align-items: center;
}

.finput {
  padding: 0.7em 0.85em;
  border: 1px solid #d1d5db;
  border-radius: 0.5em;
  font-size: 0.95em;
  font-family: inherit;
  background: white;
  color: #1f2937;
  transition: all 0.2s;
}

.finput::placeholder {
  color: #9ca3af;
}

.finput:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.finput:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

textarea.finput {
  resize: vertical;
  line-height: 1.5;
  min-height: 100px;
}

.input-wrap {
  position: relative;
}

.form-actions {
  display: flex;
  gap: 1em;
  justify-content: flex-end;
  padding: 1.5em 2em;
  background: white;
  border-radius: 0.75em;
  border: 1px solid #e5e7eb;
  margin-top: 2em;
}

.btn-ghost {
  padding: 0.7em 1.5em;
  color: #6b7280;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5em;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-ghost:hover {
  background: #f9fafb;
  color: #1f2937;
  border-color: #9ca3af;
}

.btn-primary {
  padding: 0.7em 1.75em;
  color: white;
  background: #3b82f6;
  border: none;
  border-radius: 0.5em;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .page {
    padding: 1.5em;
  }

  .page-heading {
    font-size: 1.5em;
  }

  .form-section {
    padding: 1.5em;
  }

  .fields-grid {
    grid-template-columns: 1fr;
    gap: 1.5em;
  }

  .form-actions {
    flex-direction: column-reverse;
    padding: 1.5em;
  }

  .btn-primary,
  .btn-ghost {
    width: 100%;
    justify-content: center;
  }
}
</style>
