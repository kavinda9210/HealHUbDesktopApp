from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, time, datetime
from enum import Enum
import json

# Enums
class MedicationFrequency(str, Enum):
    DAILY = "Daily"
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"
    AS_NEEDED = "As Needed"

class ReminderStatus(str, Enum):
    PENDING = "Pending"
    TAKEN = "Taken"
    SKIPPED = "Skipped"
    MISSED = "Missed"

class ClinicStatus(str, Enum):
    SCHEDULED = "Scheduled"
    ATTENDED = "Attended"
    MISSED = "Missed"
    CANCELLED = "Cancelled"

class PaymentStatus(str, Enum):
    PENDING = "Pending"
    PARTIAL = "Partial"
    PAID = "Paid"

# Appointment Models
class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: str  # HH:MM format
    symptoms: Optional[str] = None
    
    @validator('appointment_time')
    def validate_time_format(cls, v):
        try:
            hours, minutes = map(int, v.split(':'))
            if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                raise ValueError
        except:
            raise ValueError('Time must be in HH:MM format')
        return v

class AppointmentResponse(AppointmentCreate):
    appointment_id: int
    status: str
    notes: Optional[str] = None
    checked_by_doctor_at: Optional[datetime] = None
    booked_at: datetime
    
    class Config:
        from_attributes = True

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

# Medication Models
class MedicationCreate(BaseModel):
    patient_id: int
    medicine_name: str = Field(..., min_length=2, max_length=255)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency: MedicationFrequency = MedicationFrequency.DAILY
    times_per_day: int = Field(1, ge=1, le=10)
    specific_times: Optional[str] = None  # JSON string of times
    start_date: date
    end_date: Optional[date] = None
    next_clinic_date: date
    notes: Optional[str] = None
    
    @validator('specific_times')
    def validate_specific_times(cls, v):
        if v:
            try:
                times = json.loads(v)
                if not isinstance(times, list):
                    raise ValueError('specific_times must be a JSON array')
                for time_str in times:
                    if not isinstance(time_str, str):
                        raise ValueError('All times must be strings')
                    # Validate time format
                    hours, minutes = map(int, time_str.split(':'))
                    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                        raise ValueError
            except Exception as e:
                raise ValueError(f'Invalid specific_times format: {str(e)}')
        return v
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date cannot be before start_date')
        return v

class MedicationResponse(MedicationCreate):
    medication_id: int
    doctor_id: int
    is_active: bool
    prescribed_at: datetime
    
    class Config:
        from_attributes = True

# Medical Report Models
class MedicalReportCreate(BaseModel):
    appointment_id: Optional[int] = None
    clinic_id: Optional[int] = None
    diagnosis: str = Field(..., min_length=2)
    prescription: str = Field(..., min_length=2)
    notes: Optional[str] = None
    
    @validator('appointment_id', 'clinic_id')
    def validate_reference(cls, v, values):
        # Ensure at least one of appointment_id or clinic_id is provided
        if not values.get('appointment_id') and not values.get('clinic_id'):
            raise ValueError('Either appointment_id or clinic_id must be provided')
        return v

class MedicalReportResponse(MedicalReportCreate):
    report_id: int
    created_by_doctor_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Clinic Models
class ClinicCreate(BaseModel):
    patient_id: int
    clinic_date: date
    start_time: str  # HH:MM format
    
    @validator('start_time')
    def validate_time_format(cls, v):
        try:
            hours, minutes = map(int, v.split(':'))
            if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                raise ValueError
        except:
            raise ValueError('Time must be in HH:MM format')
        return v

class ClinicResponse(ClinicCreate):
    clinic_id: int
    doctor_id: int
    end_time: Optional[str] = None
    status: str
    notes: Optional[str] = None
    checked_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Billing Models
class BillingCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    clinic_id: Optional[int] = None
    total_amount: float = Field(..., ge=0)
    bill_date: date

class BillingResponse(BillingCreate):
    bill_id: int
    paid_amount: float
    payment_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    bill_id: int
    amount: float = Field(..., gt=0)
    payment_method: str = Field(..., min_length=2, max_length=50)

# Notification Models
class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=2)
    notification_type: str = Field(..., pattern='^(Appointment|Medicine|Clinic|Report|System|Ambulance)$')

class NotificationResponse(NotificationCreate):
    notification_id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Location Models
class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class NearbyAmbulanceRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(10, gt=0, le=100)  # Default 10km radius, max 100km
    limit: int = Field(10, gt=0, le=50)  # Default 10 results, max 50