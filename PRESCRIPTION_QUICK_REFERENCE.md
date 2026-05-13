# Medicine Prescription Workflow - Quick Reference

## Doctor's 30-Second Prescription Guide

### For Desktop Application Users

#### Step 1: Open Patient Record
1. Go to **Doctor Dashboard** → **Patients**
2. Click on patient name or ID
3. Scroll to **Prescriptions** section

#### Step 2: Add Medicine (5 Seconds)
Click **"+ Add Medicine"** button

**Modal Opens with "Recent" Tab Selected:**
- Shows **last 10 medicines** you prescribed to this patient
- **One click** to select any medicine
- Select multiple medicines before setting schedule

#### Step 3: Search (If Not in Recent)
Click **"Search All"** tab and type medicine name:
- Searches both brand name and generic name
- Results appear instantly (fuzzy matching)
- Low stock warning shows with ⚠️ icon
- Select multiple medicines

#### Step 4: Set Schedule for All (15 Seconds)
Click **"Next"** → **Duration & Frequency Tab**

**Set Duration (for all selected medicines):**
- [ ] 1 Day
- [ ] 1 Week
- [ ] 2 Weeks
- [x] 3 Weeks ← Example
- [ ] 1 Month
- [ ] Custom Days

**Set Frequency (how often per day):**
- [ ] Once a day
- [x] Twice a day ← Example
- [ ] Thrice a day
- [ ] Custom times

**For Custom Times:**
- Click "Custom" frequency
- Enter specific times (e.g., 08:00, 20:00)
- Optional: Label times (Before Breakfast, At Bedtime, etc.)

**Set Start Date:**
- Pick today or future date
- End date calculates automatically

#### Step 5: Review (5 Seconds)
Click **"Review"**

**Table shows:**
| Medicine | Duration | Frequency |
|----------|----------|-----------|
| Paracetamol | 3 weeks | Twice daily |
| Amoxicillin | 3 weeks | Twice daily |

**Add optional notes** (prescriber instructions, special warnings)

#### Step 6: Save (2 Seconds)
Click **"Save Prescription"** ✓

Done! Prescription saved to patient record.

---

## API Responses (Developer Reference)

### Search Medicines
```bash
curl -X GET "http://localhost:5000/api/medicines/medicines/search?q=para&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "medicine_id": 1,
      "medicine_name": "Paracetamol 500mg",
      "generic_name": "Acetaminophen",
      "quantity_in_stock": 1000,
      "min_quantity": 50,
      "is_low_stock": false,
      "status": "Active",
      "category": "Analgesic",
      "dosage_form": "Tablet",
      "strength": "500mg"
    }
  ]
}
```

### Get Recent Medicines
```bash
curl -X GET "http://localhost:5000/api/medicines/medicines/recent?patient_id=123&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Create Prescription
```bash
curl -X POST "http://localhost:5000/api/medicines/prescriptions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 123,
    "doctor_id": 456,
    "appointment_id": 789,
    "notes": "Take with food",
    "items": [
      {
        "medicine_id": 1,
        "dosage": "1 tablet",
        "duration_type": "week",
        "duration_value": 3,
        "frequency_type": "twice",
        "times_per_day": 2,
        "specific_times": ["08:00", "20:00"],
        "start_date": "2024-05-15"
      },
      {
        "medicine_id": 2,
        "dosage": "1 capsule",
        "duration_type": "week",
        "duration_value": 3,
        "frequency_type": "twice",
        "times_per_day": 2,
        "specific_times": ["08:00", "20:00"],
        "start_date": "2024-05-15"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Prescription created successfully",
  "prescription_id": 999,
  "items_created": 2
}
```

### List Patient Prescriptions
```bash
curl -X GET "http://localhost:5000/api/medicines/prescriptions/123/list?active_only=true" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "prescription_id": 999,
      "patient_id": 123,
      "doctor_id": 456,
      "prescribed_at": "2024-05-15T10:30:00",
      "is_active": true,
      "notes": "Take with food",
      "items": [
        {
          "prescription_item_id": 1,
          "medicine_id": 1,
          "dosage": "1 tablet",
          "duration_type": "week",
          "duration_value": 3,
          "frequency_type": "twice",
          "times_per_day": 2,
          "specific_times": ["08:00", "20:00"],
          "start_date": "2024-05-15",
          "end_date": "2024-06-05",
          "is_active": true
        }
      ]
    }
  ]
}
```

---

## Database Query Examples

### Find all medicines in a category
```sql
SELECT * FROM medicines 
WHERE category = 'Analgesic' AND status = 'Active'
ORDER BY medicine_name;
```

### Find prescriptions for a patient
```sql
SELECT p.*, pi.* FROM prescriptions p
LEFT JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
WHERE p.patient_id = 123
ORDER BY p.prescribed_at DESC;
```

### Find medicines running low on stock
```sql
SELECT * FROM medicines
WHERE quantity_in_stock < min_quantity
AND status = 'Active'
ORDER BY quantity_in_stock ASC;
```

### Find expired medicines
```sql
SELECT * FROM medicines
WHERE expiry_date < CURRENT_DATE
AND status = 'Active'
ORDER BY expiry_date ASC;
```

### Find recent prescriptions for a doctor
```sql
SELECT DISTINCT m.* FROM medicines m
JOIN prescription_items pi ON m.medicine_id = pi.medicine_id
JOIN prescriptions p ON pi.prescription_id = p.prescription_id
WHERE p.doctor_id = 456 AND p.patient_id = 123
ORDER BY p.prescribed_at DESC
LIMIT 10;
```

---

## Common Tasks

### ✅ Prescribe Paracetamol for 1 Week, Twice Daily
1. Click **"+ Add Medicine"**
2. Recent tab → Select "Paracetamol 500mg"
3. Next → Select "1 Week" + "Twice a day"
4. Review → Save ✓

### ✅ Prescribe Antibiotic Course (7 days, 3 times daily)
1. Click **"+ Add Medicine"**
2. Search All → Type "amoxicillin"
3. Select "Amoxicillin 500mg"
4. Next → "1 Day" duration? No, need custom...
   - Select "Custom Days" → Enter "7"
   - Select "Custom" frequency → Add 3 times
5. Enter times: 08:00, 14:00, 20:00
6. Review → Save ✓

### ✅ Prescribe Multiple Medicines with Same Schedule
1. Click **"+ Add Medicine"**
2. Select Medicine A
3. Select Medicine B
4. Select Medicine C
5. Next → Set common schedule once
6. All three get the same schedule automatically ✓

### ✅ Update Existing Prescription
Not yet in UI - requires custom edit component or manual DB update

### ✅ Deactivate a Prescription Item
Through API:
```bash
curl -X DELETE "http://localhost:5000/api/medicines/prescription-items/<item_id>" \
  -H "Authorization: Bearer <token>"
```

---

## Low Stock Warnings

Medicines show **"Low Stock"** indicator when:
```
quantity_in_stock < min_quantity
```

Example:
- Medicine: Paracetamol
- Current stock: 5 tablets
- Min threshold: 50 tablets
- Status: ⚠️ **Low Stock** - Still can prescribe, but alerts reorder

---

## Known Limitations

1. **Cannot edit dosage per medicine** - Currently set to "1 tablet" or default
   - Future: Individual dosage override
   
2. **Cannot edit individual medicine schedules** - All get same
   - Workaround: Create separate prescriptions
   - Future: Click medicine in review to override

3. **No prescription templates** - Must select medicines each time
   - Future: Save common combinations as templates

4. **No SMS/push notifications** - Patient doesn't know about prescription
   - Future: Integrate with patient app for reminders

5. **Stock not decremented** - No inventory management yet
   - Future: Auto-reduce stock when prescription filled

---

## Testing Your Setup

### Quick Test

1. **Test Backend:**
   ```bash
   curl "http://localhost:5000/api/medicines/medicines/search?q=test" \
     -H "Authorization: Bearer <your_token>"
   ```
   Should return `{ "success": true, "count": 0, "data": [] }`

2. **Test Frontend:**
   - Open Doctor Dashboard
   - Go to any patient
   - See "Prescriptions" section
   - Click "+ Add Medicine"
   - Modal should open

3. **Test Database:**
   ```sql
   SELECT COUNT(*) as medicine_count FROM medicines;
   SELECT COUNT(*) as supplier_count FROM suppliers;
   ```

### Seed Test Data

```sql
INSERT INTO suppliers (supplier_name, status) VALUES ('Test Supplier', 'Active');

INSERT INTO medicines (
  medicine_name, generic_name, category, dosage_form, strength, unit,
  quantity_in_stock, min_quantity, max_quantity, unit_price, status
) VALUES (
  'Paracetamol 500mg', 'Acetaminophen', 'Analgesic', 'Tablet', '500mg', 'Tablet',
  1000, 50, 2000, 0.50, 'Active'
),
(
  'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 'Capsule', '500mg', 'Capsule',
  500, 100, 1000, 1.20, 'Active'
);
```

---

## Troubleshooting Checklist

- [ ] Supabase SQL migration ran successfully
- [ ] `medicines` table exists with data
- [ ] `prescriptions` table exists
- [ ] `prescription_items` table exists
- [ ] Backend server is running (`python run.py`)
- [ ] Frontend is running (`npm run dev`)
- [ ] JWT token is valid (check Auth store)
- [ ] Doctor user role is set correctly
- [ ] CORS is configured for frontend URL
- [ ] `/api/medicines/medicines/search` returns 200 OK
