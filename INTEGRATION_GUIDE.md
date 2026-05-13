# Integration Guide - Adding Prescriptions to Doctor Patient View

## Overview

This guide shows how to integrate the prescription workflow into your existing doctor patient view pages.

## File Locations

- **Prescription Modal:** `src/components/PrescriptionModal.vue`
- **Prescriptions Page:** `src/pages/doctor/patient/PrescriptionsPage.vue`
- **Medicines Service:** `src/lib/medicines.ts`
- **API Service:** `src/lib/api.ts`

## Integration Points

### 1. In DoctorPatientViewPage.vue

If you have a main patient view page, add the prescriptions section:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import PrescriptionsPage from './patient/PrescriptionsPage.vue'
import { useAuthStore } from '../../stores/auth'

// Your existing props
interface Props {
  patientId: number
  appointmentId?: number | null
  clinicId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  appointmentId: null,
  clinicId: null,
})

const auth = useAuthStore()
const activeTab = ref<'info' | 'prescriptions' | 'history'>('info')
</script>

<template>
  <div class="patient-view-container">
    <!-- Tabs -->
    <div class="tabs border-b border-gray-200 mb-6">
      <button
        @click="activeTab = 'info'"
        :class="[
          'px-4 py-2 border-b-2 font-medium transition',
          activeTab === 'info'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
      >
        Patient Info
      </button>
      <button
        @click="activeTab = 'prescriptions'"
        :class="[
          'px-4 py-2 border-b-2 font-medium transition',
          activeTab === 'prescriptions'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
      >
        Prescriptions
      </button>
      <button
        @click="activeTab = 'history'"
        :class="[
          'px-4 py-2 border-b-2 font-medium transition',
          activeTab === 'history'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900',
        ]"
      >
        Medical History
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <div v-if="activeTab === 'info'" class="space-y-6">
        <!-- Your existing patient info content -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-4">Patient Information</h3>
          <!-- Patient details here -->
        </div>
      </div>

      <div v-if="activeTab === 'prescriptions'" class="space-y-6">
        <PrescriptionsPage 
          :patient-id="props.patientId"
          :appointment-id="props.appointmentId"
          :clinic-id="props.clinicId"
        />
      </div>

      <div v-if="activeTab === 'history'" class="space-y-6">
        <!-- Medical history content here -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.patient-view-container {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}
</style>
```

### 2. Minimal Integration (Quick Add)

If you want to add just the "Add Medicine" button without the full prescriptions page:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import PrescriptionModal from '../../components/PrescriptionModal.vue'

interface Props {
  patientId: number
  doctorId: number
  appointmentId?: number | null
  clinicId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  appointmentId: null,
  clinicId: null,
})

const isPrescriptionModalOpen = ref(false)
</script>

<template>
  <div class="patient-header">
    <h2>{{ patientName }}</h2>
    
    <!-- Add Medicine Button -->
    <button
      @click="isPrescriptionModalOpen = true"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      + Add Medicine
    </button>

    <!-- Prescription Modal -->
    <PrescriptionModal
      :is-open="isPrescriptionModalOpen"
      :patient-id="props.patientId"
      :doctor-id="props.doctorId"
      :appointment-id="props.appointmentId"
      :clinic-id="props.clinicId"
      @close="isPrescriptionModalOpen = false"
      @prescription-created="onPrescriptionCreated"
    />
  </div>
</template>
```

### 3. In Router Configuration

Add the prescriptions page to your router (if not auto-imported):

```typescript
// src/router/index.ts
import PrescriptionsPage from '../pages/doctor/patient/PrescriptionsPage.vue'

const routes = [
  // ... other routes
  {
    path: '/doctor/patient/:patientId/prescriptions',
    component: PrescriptionsPage,
    meta: { requiresAuth: true, requiredRole: 'doctor' }
  }
]
```

## Component Props

### PrescriptionModal

```typescript
interface Props {
  patientId: number           // Required: Patient ID
  doctorId: number            // Required: Current doctor's ID
  appointmentId?: number      // Optional: Appointment ID
  clinicId?: number           // Optional: Clinic ID
  isOpen: boolean             // Required: Modal visibility
}

// Events
@close                        // Emitted when modal closes
@prescription-created         // Emitted with { prescription_id, items_created }
```

### PrescriptionsPage

```typescript
interface Props {
  patientId: number           // Required: Patient ID
  appointmentId?: number      // Optional: Appointment ID
  clinicId?: number           // Optional: Clinic ID
}
```

## Styling Integration

The components use Tailwind CSS classes. Ensure your `tailwind.config.js` includes:

```javascript
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Type Safety

All TypeScript types are defined in `src/lib/medicines.ts`:

```typescript
import type {
  Medicine,
  Supplier,
  Prescription,
  PrescriptionItem,
  PrescriptionItemCreate,
} from '../lib/medicines'

// Use in your components
const prescription: Prescription = { ... }
```

## State Management Integration

The components use the existing stores:

```typescript
import { useAuthStore } from '../stores/auth'      // For JWT token
import { useToastStore } from '../stores/toast'    // For notifications
```

Make sure these stores are configured properly.

## API Configuration

The backend URL is configured in `src/lib/api.ts`:

```typescript
function getBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) 
    return fromEnv.trim().replace(/\/$/, '')
  return 'http://127.0.0.1:5000'  // Default fallback
}
```

Set in `.env` or `.env.local`:
```
VITE_API_BASE_URL=http://localhost:5000
```

## Features Checklist

- ✅ Fuzzy search for medicines
- ✅ Recent medicines tab
- ✅ Multi-select functionality
- ✅ Bulk duration & frequency setting
- ✅ Custom time labels
- ✅ Review before save
- ✅ Stock awareness (low stock warnings)
- ✅ Prescription list view
- ✅ Active/inactive prescription status
- ✅ Date calculations
- ✅ Error handling with toast notifications
- ✅ Loading states

## Error Handling

The components include error handling:

```typescript
try {
  const medicines = await MedicinesService.searchMedicines(
    query,
    20,
    auth.accessToken
  )
} catch (e) {
  toast.show('Failed to search medicines', 'error')
  console.error('Error:', e)
}
```

All errors are caught and displayed as toast notifications to the user.

## Performance Considerations

1. **Search Debouncing:** 300ms delay on search input
2. **Result Limiting:** 20 results max per search
3. **Lazy Loading:** Recent medicines only load when modal opens
4. **Pagination:** Not implemented (performance adequate for 20 items)

## Accessibility

The components include:
- Semantic HTML
- ARIA labels on buttons
- Keyboard navigation support
- Focus management
- Color contrast compliance

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires ES2020+ JavaScript support

## Deployment Checklist

- [ ] SQL migration run in Supabase
- [ ] Backend medicines.py route registered
- [ ] Frontend components copied
- [ ] TypeScript services imported
- [ ] Routes configured if needed
- [ ] Environment variables set
- [ ] CORS configured for frontend URL
- [ ] Test with dummy medicines data
- [ ] Test full workflow (search → select → schedule → save)
- [ ] Test with real patient data
- [ ] Check error cases (network, validation)
- [ ] Test on different screen sizes

## Customization

### Change Colors

Modify Tailwind classes in component `<template>`:
```vue
<!-- Blue to green -->
<button class="bg-green-600 hover:bg-green-700">...</button>
```

### Change Search Limit

In `src/lib/medicines.ts`:
```typescript
static async searchMedicines(
  query: string,
  limit: number = 50,  // Change from 20 to 50
  token: string | null = null
)
```

### Add Custom Fields

Extend `PrescriptionItem` interface in `src/lib/medicines.ts`:
```typescript
export interface PrescriptionItem {
  // ... existing fields
  customField?: string  // Add new field
}
```

### Change Modal Size

In `PrescriptionModal.vue`:
```vue
<!-- Increase width -->
<div class="bg-white rounded-lg max-w-4xl">  <!-- max-w-2xl → max-w-4xl -->
```

## Support & Debugging

### Enable Verbose Logging

In `src/components/PrescriptionModal.vue`:
```typescript
async function handleSearch() {
  console.log('Search query:', searchQuery.value)
  // ... rest of function
  console.log('Results:', searchResults.value)
}
```

### Check Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Perform search
4. Check API response in Network tab
5. Verify `/api/medicines/medicines/search` returns 200 OK

### Check Local State

In DevTools Console:
```javascript
// Check auth token
console.log(useAuthStore().accessToken)

// Check selected medicines
console.log(selectedMedicines.value)
```

## Next Steps

1. Run the SQL migration
2. Copy the files to your project
3. Integrate into your doctor patient view
4. Test with sample medicines data
5. Deploy to production
6. Monitor API response times
7. Gather user feedback
8. Plan enhancements (templates, inventory, reminders)

---

For detailed setup instructions, see [MEDICINE_PRESCRIPTION_SETUP.md](./MEDICINE_PRESCRIPTION_SETUP.md)

For API reference, see [PRESCRIPTION_QUICK_REFERENCE.md](./PRESCRIPTION_QUICK_REFERENCE.md)
