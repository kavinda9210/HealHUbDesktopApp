/**
 * Medicines and Prescriptions API Service
 * Handles all API calls for the prescription workflow
 */

import { api } from './api'

export interface Medicine {
  medicine_id: number
  medicine_name: string
  generic_name: string | null
  category: string | null
  dosage_form: string | null
  strength: string | null
  unit: string | null
  batch_no: string | null
  expiry_date: string | null
  quantity_in_stock: number
  min_quantity: number
  max_quantity: number
  unit_price: number | null
  supplier_id: number | null
  location: string | null
  status: 'Active' | 'Inactive' | 'Discontinued'
  created_at: string
  updated_at: string | null
  is_low_stock?: boolean
}

export interface Supplier {
  supplier_id: number
  supplier_name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  status: 'Active' | 'Inactive'
  created_at: string
  updated_at: string | null
}

export interface PrescriptionItem {
  prescription_item_id: number
  prescription_id: number
  medicine_id: number
  dosage: string
  duration_type: 'day' | 'week' | 'month' | 'custom'
  duration_value: number
  frequency_type: 'once' | 'twice' | 'thrice' | 'custom'
  times_per_day: number | null
  specific_times: string[] | null
  start_date: string
  end_date: string | null
  next_clinic_date: string | null
  instructions: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface Prescription {
  prescription_id: number
  patient_id: number | string
  doctor_id: number | string
  appointment_id: number | null
  clinic_id: number | null
  prescribed_at: string
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
  items?: PrescriptionItem[]
}

export class MedicinesService {
  /**
   * Search medicines using fuzzy search
   */
  static async searchMedicines(
    query: string,
    limit: number = 20,
    token: string | null = null,
  ): Promise<Medicine[]> {
    try {
      const res = await api.get<{ success: boolean; data: Medicine[] }>(
        '/api/medicines/medicines/search',
        {
          token,
          query: { q: query, limit },
        },
      )
      return res.data || []
    } catch (e) {
      console.error('Error searching medicines:', e)
      return []
    }
  }

  /**
   * Get recent medicines for a patient
   */
  static async getRecentMedicines(
    patientId: number,
    limit: number = 10,
    token: string | null = null,
  ): Promise<Medicine[]> {
    try {
      const res = await api.get<{ success: boolean; data: Medicine[] }>(
        '/api/medicines/medicines/recent',
        {
          token,
          query: { patient_id: patientId, limit },
        },
      )
      return res.data || []
    } catch (e) {
      console.error('Error fetching recent medicines:', e)
      return []
    }
  }

  /**
   * Get all active medicines
   */
  static async listMedicines(
    page: number = 0,
    limit: number = 50,
    category?: string,
    token: string | null = null,
  ): Promise<{ medicines: Medicine[]; total: number }> {
    try {
      const res = await api.get<{ success: boolean; data: Medicine[]; count: number }>(
        '/api/medicines/medicines',
        {
          token,
          query: { page, limit, ...(category && { category }) },
        },
      )
      return {
        medicines: res.data || [],
        total: res.count || 0,
      }
    } catch (e) {
      console.error('Error listing medicines:', e)
      return { medicines: [], total: 0 }
    }
  }

  /**
   * List all suppliers
   */
  static async listSuppliers(token: string | null = null): Promise<Supplier[]> {
    try {
      const res = await api.get<{ success: boolean; data: Supplier[] }>(
        '/api/medicines/suppliers',
        { token },
      )
      return res.data || []
    } catch (e) {
      console.error('Error listing suppliers:', e)
      return []
    }
  }

  /**
   * Get a specific supplier
   */
  static async getSupplier(supplierId: number, token: string | null = null): Promise<Supplier | null> {
    try {
      const res = await api.get<{ success: boolean; data: Supplier }>(
        `/api/medicines/suppliers/${supplierId}`,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error fetching supplier:', e)
      return null
    }
  }

  /**
   * Create a new supplier
   */
  static async createSupplier(supplier: Partial<Supplier>, token: string | null = null): Promise<Supplier | null> {
    try {
      const res = await api.post<{ success: boolean; data: Supplier }>(
        '/api/medicines/suppliers',
        supplier,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error creating supplier:', e)
      return null
    }
  }

  /**
   * Delete a supplier
   */
  static async deleteSupplier(supplierId: number, token: string | null = null): Promise<boolean> {
    try {
      await api.del(`/api/medicines/suppliers/${supplierId}`, { token })
      return true
    } catch (e) {
      console.error('Error deleting supplier:', e)
      return false
    }
  }

  /**
   * Get a specific medicine
   */
  static async getMedicine(medicineId: number, token: string | null = null): Promise<Medicine | null> {
    try {
      const res = await api.get<{ success: boolean; data: Medicine }>(
        `/api/medicines/medicines/${medicineId}`,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error fetching medicine:', e)
      return null
    }
  }

  /**
   * Create a new medicine
   */
  static async createMedicine(medicine: Partial<Medicine>, token: string | null = null): Promise<Medicine | null> {
    try {
      const res = await api.post<{ success: boolean; data: Medicine }>(
        '/api/medicines/medicines',
        medicine,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error creating medicine:', e)
      return null
    }
  }

  /**
   * Update a medicine
   */
  static async updateMedicine(
    medicineId: number,
    updates: Partial<Medicine>,
    token: string | null = null,
  ): Promise<Medicine | null> {
    try {
      const res = await api.put<{ success: boolean; data: Medicine }>(
        `/api/medicines/medicines/${medicineId}`,
        updates,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error updating medicine:', e)
      return null
    }
  }
}

export class PrescriptionsService {
  /**
   * Create a new prescription with multiple items
   */
  static async createPrescription(
    prescription: {
      patient_id: number | string
      doctor_id: number | string
      appointment_id?: number | null
      clinic_id?: number | null
      notes?: string | null
      items: Partial<PrescriptionItem>[]
    },
    token: string | null = null,
  ): Promise<{ prescription_id: number; items_created: number } | null> {
    try {
      const res = await api.post<{
        success: boolean
        prescription_id: number
        items_created: number
      }>('/api/medicines/prescriptions', prescription, { token })
      return res || null
    } catch (e) {
      console.error('Error creating prescription:', e)
      return null
    }
  }

  /**
   * Get a prescription with all its items
   */
  static async getPrescription(
    prescriptionId: number,
    token: string | null = null,
  ): Promise<Prescription | null> {
    try {
      const res = await api.get<{ success: boolean; data: Prescription }>(
        `/api/medicines/prescriptions/${prescriptionId}`,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error fetching prescription:', e)
      return null
    }
  }

  /**
   * Get all prescriptions for a patient
   */
  static async listPatientPrescriptions(
    patientId: number,
    activeOnly: boolean = true,
    token: string | null = null,
  ): Promise<Prescription[]> {
    try {
      const res = await api.get<{ success: boolean; data: Prescription[] }>(
        `/api/medicines/prescriptions/${patientId}/list`,
        {
          token,
          query: { active_only: activeOnly },
        },
      )
      return res.data || []
    } catch (e) {
      console.error('Error fetching prescriptions:', e)
      return []
    }
  }

  /**
   * Update a prescription item
   */
  static async updatePrescriptionItem(
    itemId: number,
    updates: Partial<PrescriptionItem>,
    token: string | null = null,
  ): Promise<PrescriptionItem | null> {
    try {
      const res = await api.put<{ success: boolean; data: PrescriptionItem }>(
        `/api/medicines/prescription-items/${itemId}`,
        updates,
        { token },
      )
      return res.data || null
    } catch (e) {
      console.error('Error updating prescription item:', e)
      return null
    }
  }

  /**
   * Delete a prescription item
   */
  static async deletePrescriptionItem(itemId: number, token: string | null = null): Promise<boolean> {
    try {
      await api.del(`/api/medicines/prescription-items/${itemId}`, { token })
      return true
    } catch (e) {
      console.error('Error deleting prescription item:', e)
      return false
    }
  }

  /**
   * Bulk update duration and frequency for multiple items
   */
  static async bulkUpdateItems(
    itemIds: number[],
    updates: {
      duration_type: 'day' | 'week' | 'month' | 'custom'
      duration_value: number
      frequency_type: 'once' | 'twice' | 'thrice' | 'custom'
      times_per_day?: number | null
      specific_times?: string[] | null
      start_date: string
    },
    token: string | null = null,
  ): Promise<{ items_updated: number } | null> {
    try {
      const res = await api.put<{ success: boolean; items_updated: number }>(
        '/api/medicines/prescription-items/bulk-update',
        {
          prescription_item_ids: itemIds,
          ...updates,
        },
        { token },
      )
      return res || null
    } catch (e) {
      console.error('Error bulk updating items:', e)
      return null
    }
  }
}
