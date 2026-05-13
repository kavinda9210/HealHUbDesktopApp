<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

interface Supplier {
  supplier_id: number
  supplier_name: string
}

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const medicineId = Number(route.params.medicineId) || 0
const loadError = ref<string | null>(null)
const createError = ref<string | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const suppliers = ref<Supplier[]>([])
const loadingSuppliers = ref(false)

const form = ref({
  medicine_name: '',
  generic_name: '',
  category: '',
  dosage_form: '',
  strength: '',
  unit: '',
  batch_no: '',
  expiry_date: '',
  quantity_in_stock: '0',
  min_quantity: '10',
  max_quantity: '500',
  unit_price: '',
  supplier_id: '',
  location: '',
  status: 'Active',
})

const dosageForms = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Suspension',
  'Powder',
  'Cream',
  'Ointment',
  'Lotion',
  'Drops',
  'Spray',
  'Patch',
]

const units = [
  'Tablet',
  'Capsule',
  'Bottle',
  'Vial',
  'Ampoule',
  'ml',
  'Gram',
  'Strip',
  'Box',
]

async function loadSuppliers() {
  loadingSuppliers.value = true
  try {
    const res = await api.get<{ success: boolean; data: Supplier[] }>(
      '/api/medicines/suppliers',
      { token: auth.accessToken }
    )
    suppliers.value = res.data || []
  } catch (e) {
    console.error('Failed to load suppliers:', e)
    suppliers.value = []
  } finally {
    loadingSuppliers.value = false
  }
}

async function loadMedicine() {
  isLoading.value = true
  loadError.value = null
  try {
    const res = await api.get<any>(
      `/api/medicines/medicines/${medicineId}`,
      { token: auth.accessToken }
    )
    const med = res.data

    form.value = {
      medicine_name: med.medicine_name || '',
      generic_name: med.generic_name || '',
      category: med.category || '',
      dosage_form: med.dosage_form || '',
      strength: med.strength || '',
      unit: med.unit || '',
      batch_no: med.batch_no || '',
      expiry_date: med.expiry_date || '',
      quantity_in_stock: String(med.quantity_in_stock || 0),
      min_quantity: String(med.min_quantity || 10),
      max_quantity: String(med.max_quantity || 500),
      unit_price: med.unit_price ? String(med.unit_price) : '',
      supplier_id: med.supplier_id ? String(med.supplier_id) : '',
      location: med.location || '',
      status: med.status || 'Active',
    }
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Failed to load medicine'
  } finally {
    isLoading.value = false
  }
}

async function updateMedicine() {
  createError.value = null
  isSaving.value = true

  try {
    // Validation
    if (!form.value.medicine_name.trim()) {
      createError.value = 'Medicine name is required.'
      return
    }
    if (!form.value.category.trim()) {
      createError.value = 'Category is required.'
      return
    }
    if (!form.value.unit.trim()) {
      createError.value = 'Unit is required.'
      return
    }
    if (!form.value.supplier_id) {
      createError.value = 'Supplier is required.'
      return
    }

    const qtyInStock = form.value.quantity_in_stock.trim() ? Number(form.value.quantity_in_stock) : 0
    const minQty = form.value.min_quantity.trim() ? Number(form.value.min_quantity) : 10
    const maxQty = form.value.max_quantity.trim() ? Number(form.value.max_quantity) : 500
    const price = form.value.unit_price.trim() ? Number(form.value.unit_price) : null

    if (!Number.isFinite(qtyInStock) || qtyInStock < 0) {
      createError.value = 'Quantity in stock must be a non-negative number.'
      return
    }
    if (!Number.isFinite(minQty) || minQty < 0) {
      createError.value = 'Minimum quantity must be a non-negative number.'
      return
    }
    if (!Number.isFinite(maxQty) || maxQty < 0) {
      createError.value = 'Maximum quantity must be a non-negative number.'
      return
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      createError.value = 'Unit price must be a non-negative number.'
      return
    }

    if (form.value.expiry_date && form.value.expiry_date < new Date().toISOString().split('T')[0]) {
      createError.value = 'Expiry date cannot be in the past.'
      return
    }

    const payload = {
      medicine_name: form.value.medicine_name,
      generic_name: form.value.generic_name || null,
      category: form.value.category,
      dosage_form: form.value.dosage_form || null,
      strength: form.value.strength || null,
      unit: form.value.unit,
      batch_no: form.value.batch_no || null,
      expiry_date: form.value.expiry_date || null,
      quantity_in_stock: qtyInStock,
      min_quantity: minQty,
      max_quantity: maxQty,
      unit_price: price,
      supplier_id: Number(form.value.supplier_id),
      location: form.value.location || null,
      status: form.value.status,
    }

    await api.put(`/api/medicines/medicines/${medicineId}`, payload, { token: auth.accessToken })
    router.replace({ path: '/admin/medicines', query: { notice: 'medicine_updated' } })
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : 'Failed to update medicine'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  if (medicineId) {
    loadSuppliers()
    loadMedicine()
  } else {
    loadError.value = 'Invalid medicine ID'
  }
})
</script>

<template>
  <div class="page">

    <!-- ── Page Header ─────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <router-link class="back-link" to="/admin/medicines">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Medicines
        </router-link>
        <h1 class="page-heading">Edit Medicine</h1>
        <p class="page-sub">Update the medicine details below.</p>
      </div>
    </div>

    <!-- ── Load Error ──────────────────────────── -->
    <Transition name="alert">
      <div v-if="loadError" class="alert alert-error" role="alert">
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        {{ loadError }}
      </div>
    </Transition>

    <!-- ── Loading State ───────────────────────── -->
    <div v-if="isLoading" class="loading-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32" class="spinner">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/>
      </svg>
      <p>Loading medicine details…</p>
    </div>

    <!-- ── Form ────────────────────────────────── -->
    <form v-if="!isLoading" class="form-layout" @submit.prevent="updateMedicine" novalidate>

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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Basic Information</div>
            <div class="section-sub">Medicine name and identifiers</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Medicine Name -->
          <div class="field">
            <label class="flabel" for="medicine_name">
              Medicine Name
              <span class="required" aria-hidden="true">*</span>
            </label>
            <div class="input-wrap">
              <input
                id="medicine_name"
                v-model="form.medicine_name"
                type="text"
                class="finput"
                placeholder="e.g., Aspirin"
                required
              />
            </div>
          </div>

          <!-- Generic Name -->
          <div class="field">
            <label class="flabel" for="generic_name">Generic Name</label>
            <div class="input-wrap">
              <input
                id="generic_name"
                v-model="form.generic_name"
                type="text"
                class="finput"
                placeholder="e.g., Acetylsalicylic acid"
              />
            </div>
          </div>

          <!-- Category -->
          <div class="field">
            <label class="flabel" for="category">
              Category
              <span class="required" aria-hidden="true">*</span>
            </label>
            <div class="input-wrap">
              <input
                id="category"
                v-model="form.category"
                type="text"
                class="finput"
                placeholder="e.g., Analgesic"
                required
              />
            </div>
          </div>

          <!-- Batch No -->
          <div class="field">
            <label class="flabel" for="batch_no">Batch No</label>
            <div class="input-wrap">
              <input
                id="batch_no"
                v-model="form.batch_no"
                type="text"
                class="finput"
                placeholder="e.g., BATCH2024001"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Section: Dosage & Strength ────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Dosage & Strength</div>
            <div class="section-sub">How the medicine is presented and dosed</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Dosage Form -->
          <div class="field">
            <label class="flabel" for="dosage_form">Dosage Form</label>
            <select id="dosage_form" v-model="form.dosage_form" class="finput">
              <option value="">Select dosage form</option>
              <option v-for="form_opt in dosageForms" :key="form_opt" :value="form_opt">{{ form_opt }}</option>
            </select>
          </div>

          <!-- Strength -->
          <div class="field">
            <label class="flabel" for="strength">Strength</label>
            <div class="input-wrap">
              <input
                id="strength"
                v-model="form.strength"
                type="text"
                class="finput"
                placeholder="e.g., 500mg"
              />
            </div>
          </div>

          <!-- Unit -->
          <div class="field">
            <label class="flabel" for="unit">
              Unit
              <span class="required" aria-hidden="true">*</span>
            </label>
            <select id="unit" v-model="form.unit" class="finput" required>
              <option value="">Select unit</option>
              <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>

          <!-- Expiry Date -->
          <div class="field">
            <label class="flabel" for="expiry_date">Expiry Date</label>
            <input id="expiry_date" v-model="form.expiry_date" type="date" class="finput" />
          </div>
        </div>
      </div>

      <!-- ── Section: Inventory ───────────────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4v8h-4M4 21h14"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Inventory</div>
            <div class="section-sub">Stock levels and pricing</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Quantity in Stock -->
          <div class="field">
            <label class="flabel" for="quantity_in_stock">Quantity in Stock</label>
            <input id="quantity_in_stock" v-model="form.quantity_in_stock" type="number" class="finput" placeholder="0" />
          </div>

          <!-- Min Quantity -->
          <div class="field">
            <label class="flabel" for="min_quantity">Minimum Quantity</label>
            <input id="min_quantity" v-model="form.min_quantity" type="number" class="finput" placeholder="10" />
          </div>

          <!-- Max Quantity -->
          <div class="field">
            <label class="flabel" for="max_quantity">Maximum Quantity</label>
            <input id="max_quantity" v-model="form.max_quantity" type="number" class="finput" placeholder="500" />
          </div>

          <!-- Unit Price -->
          <div class="field">
            <label class="flabel" for="unit_price">Unit Price (LKR)</label>
            <input id="unit_price" v-model="form.unit_price" type="number" class="finput" step="0.01" placeholder="0.00" />
          </div>
        </div>
      </div>

      <!-- ── Section: Supplier & Location ──────── -->
      <div class="form-section">
        <div class="section-head">
          <div class="section-icon section-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
          </div>
          <div>
            <div class="section-title">Supplier & Location</div>
            <div class="section-sub">Where the medicine comes from and where it's stored</div>
          </div>
        </div>

        <div class="fields-grid">
          <!-- Supplier -->
          <div class="field">
            <label class="flabel" for="supplier_id">
              Supplier
              <span class="required" aria-hidden="true">*</span>
            </label>
            <select id="supplier_id" v-model="form.supplier_id" class="finput" required :disabled="loadingSuppliers">
              <option value="">{{ loadingSuppliers ? 'Loading suppliers...' : 'Select supplier' }}</option>
              <option v-for="supplier in suppliers" :key="supplier.supplier_id" :value="supplier.supplier_id">
                {{ supplier.supplier_name }}
              </option>
            </select>
          </div>

          <!-- Location -->
          <div class="field">
            <label class="flabel" for="location">Storage Location</label>
            <div class="input-wrap">
              <input
                id="location"
                v-model="form.location"
                type="text"
                class="finput"
                placeholder="e.g., Shelf A-1"
              />
            </div>
          </div>

          <!-- Status -->
          <div class="field">
            <label class="flabel" for="status">Status</label>
            <select id="status" v-model="form.status" class="finput">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discontinued">Discontinued</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ── Form Actions ────────────────────── -->
      <div class="form-actions">
        <router-link to="/admin/medicines" class="btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Cancel
        </router-link>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          <svg v-if="!isSaving" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="spinner">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/>
          </svg>
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1em;
  padding: 4em 1em;
  text-align: center;
  color: #6b7280;
}

.loading-state svg {
  width: 2.5em;
  height: 2.5em;
  opacity: 0.6;
}

.form-layout {
  display: contents;
}

.alert {
  padding: 1.2em;
  border-radius: 0.5em;
  margin-bottom: 2em;
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  font-size: 0.95em;
  line-height: 1.5;
  border: 1px solid;
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
.section-icon--orange { background: #f97316; }

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

.finput:invalid {
  border-color: #ef4444;
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

@keyframes spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
</style>
