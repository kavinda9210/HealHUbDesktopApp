from pydantic import BaseModel, EmailStr, Field, validator, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import re
from enum import Enum

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"
    AMBULANCE_STAFF = "ambulance_staff"

class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"

class AppointmentStatus(str, Enum):
    SCHEDULED = "Scheduled"
    CONFIRMED = "Confirmed"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    NO_SHOW = "No-show"

# Base Models
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole
    
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)

    # Patient profile fields (required when role == patient)
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, min_length=10, max_length=20)

    @model_validator(mode='after')
    def validate_patient_fields(self):
        role_value = self.role.value if hasattr(self.role, 'value') else str(self.role)
        if role_value == 'patient':
            missing = []
            if not self.full_name:
                missing.append('full_name')
            if not self.phone:
                missing.append('phone')
            if self.dob is None:
                missing.append('dob')
            if self.gender is None:
                missing.append('gender')
            if not self.address:
                missing.append('address')

            if missing:
                raise ValueError(f"Missing required fields for patient registration: {', '.join(missing)}")

        return self
    
    @field_validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @field_validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Remove any non-digit characters
            digits = re.sub(r'\D', '', v)
            if len(digits) < 10:
                raise ValueError('Phone number must be at least 10 digits')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    user_id: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    full_name: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True

# Patient Models
class PatientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    dob: date
    gender: Gender
    phone: str = Field(..., min_length=10, max_length=20)
    address: Optional[str] = None
    blood_group: Optional[str] = Field(None, pattern='^(A|B|AB|O)[+-]$')
    emergency_contact: Optional[str] = Field(None, min_length=10, max_length=20)

class PatientResponse(PatientCreate):
    patient_id: int
    user_id: str
    is_phone_verified: bool
    has_chronic_condition: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Doctor Models
class DoctorCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    specialization: str = Field(..., min_length=2, max_length=100)
    qualification: Optional[str] = None
    phone: str = Field(..., min_length=10, max_length=20)
    consultation_fee: float = Field(..., ge=0)
    available_days: Optional[str] = None  # Comma-separated days
    start_time: Optional[str] = None  # HH:MM format
    end_time: Optional[str] = None    # HH:MM format

class DoctorResponse(DoctorCreate):
    doctor_id: int
    user_id: str
    is_available: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Ambulance Models
class AmbulanceCreate(BaseModel):
    ambulance_number: str = Field(..., min_length=5, max_length=50)
    driver_name: str = Field(..., min_length=2, max_length=100)
    driver_phone: str = Field(..., min_length=10, max_length=20)

class AmbulanceLocation(BaseModel):
    current_latitude: float = Field(..., ge=-90, le=90)
    current_longitude: float = Field(..., ge=-180, le=180)
    is_available: bool = True

class AmbulanceResponse(AmbulanceCreate, AmbulanceLocation):
    ambulance_id: int
    user_id: str
    last_updated: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Verification Models
class VerificationRequest(BaseModel):
    email: EmailStr
    verification_type: str = Field(..., pattern='^(registration|password_reset|email_change)$')

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=10)

class PasswordResetRequest(BaseModel):
    email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=10)
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('confirm_password')
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @field_validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

# Token Models
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str