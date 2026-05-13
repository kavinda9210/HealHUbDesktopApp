import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from typing import List, Optional

from app.utils.supabase_client import SupabaseClient, get_user_by_id
from app.models.medical_models import (
    MedicineCreate, MedicineResponse, MedicineSearchResult,
    SupplierCreate, SupplierResponse,
    PrescriptionCreate, PrescriptionResponse, PrescriptionDetailResponse,
    PrescriptionItemCreate, PrescriptionItemResponse,
    CreatePrescriptionRequest, BulkSetDurationFrequencyRequest,
    RecentMedicineResponse
)
from datetime import date, datetime, timedelta
import json

logger = logging.getLogger(__name__)

medicines_bp = Blueprint('medicines', __name__)


def _require_doctor(user_id: str):
    """Helper to check if user is a doctor"""
    user = get_user_by_id(user_id)
    if not user:
        return None, (jsonify({'success': False, 'message': 'User not found'}), 404)
    if user.get('role') != 'doctor':
        return None, (jsonify({'success': False, 'message': 'Doctor access required'}), 403)
    return user, None


def _require_doctor_or_admin(user_id: str):
    """Helper to check if user is a doctor or admin"""
    user = get_user_by_id(user_id)
    if not user:
        return None, (jsonify({'success': False, 'message': 'User not found'}), 404)
    if user.get('role') not in ('doctor', 'admin'):
        return None, (jsonify({'success': False, 'message': 'Doctor or admin access required'}), 403)
    return user, None


def _serialize_response(data: dict) -> dict:
    """Convert Supabase response to JSON-serializable format"""
    if isinstance(data, list):
        return [_serialize_response(item) for item in data]
    
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, (datetime, date)):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = _serialize_response(value)
            elif isinstance(value, dict):
                result[key] = _serialize_response(value)
            else:
                result[key] = value
        return result
    
    return data


# ==================== SUPPLIERS ROUTES ====================

@medicines_bp.route('/suppliers', methods=['GET'])
@jwt_required()
def list_suppliers():
    """List all suppliers"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        response = SupabaseClient.execute_admin_query(
            'suppliers',
            operation='select',
            columns='*',
            filter_status='Active',
            order_by='supplier_name'
        )
        
        if not response.get('success'):
            return jsonify({
                'success': False,
                'message': response.get('error') or 'Failed to fetch suppliers',
                'data': []
            }), 400
        
        return jsonify({
            'success': True,
            'data': _serialize_response(response.get('data', []))
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing suppliers: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/suppliers', methods=['POST'])
@jwt_required()
def create_supplier():
    """Create a new supplier"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        data = request.get_json()
        supplier = SupplierCreate(**data)
        
        # Check for duplicate supplier name
        existing = SupabaseClient.execute_admin_query(
            'suppliers',
            operation='select',
            columns='supplier_id',
            filter_supplier_name=supplier.supplier_name,
            limit=1
        )
        
        if existing.get('success') and existing.get('data'):
            return jsonify({
                'success': False,
                'message': f"Supplier with name '{supplier.supplier_name}' already exists"
            }), 409
        
        response = SupabaseClient.execute_admin_query(
            'suppliers',
            operation='insert',
            **supplier.dict()
        )
        
        if not response.get('success'):
            return jsonify({
                'success': False,
                'message': response.get('error') or 'Failed to create supplier'
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Supplier created successfully',
            'data': _serialize_response(response.get('data', [{}])[0])
        }), 201
    
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating supplier: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
@jwt_required()
def get_supplier(supplier_id: int):
    """Get a specific supplier by ID"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        response = SupabaseClient.execute_admin_query(
            'suppliers',
            operation='select',
            columns='*',
            filter_supplier_id=supplier_id,
            limit=1
        )
        
        if not response.get('success') or not response.get('data'):
            return jsonify({
                'success': False,
                'message': 'Supplier not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': _serialize_response(response.get('data', [{}])[0])
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting supplier {supplier_id}: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@jwt_required()
def delete_supplier(supplier_id: int):
    """Delete a supplier by ID"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        # Check if supplier exists
        existing = SupabaseClient.execute_admin_query(
            'suppliers',
            operation='select',
            columns='supplier_id',
            filter_supplier_id=supplier_id,
            limit=1
        )
        
        if not existing.get('success') or not existing.get('data'):
            return jsonify({
                'success': False,
                'message': 'Supplier not found'
            }), 404
        
        # Check if supplier has any associated medicines
        medicines_with_supplier = SupabaseClient.execute_admin_query(
            'medicines',
            operation='select',
            columns='medicine_id',
            filter_supplier_id=supplier_id,
            limit=1
        )
        
        if medicines_with_supplier.get('success') and medicines_with_supplier.get('data'):
            return jsonify({
                'success': False,
                'message': 'Cannot delete supplier with associated medicines. Please reassign medicines first.'
            }), 409
        
        # Delete the supplier
        response = SupabaseClient.execute_admin_query(
            'suppliers',
            operation='delete',
            filter_supplier_id=supplier_id
        )
        
        if not response.get('success'):
            return jsonify({
                'success': False,
                'message': response.get('error') or 'Failed to delete supplier'
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Supplier deleted successfully'
        }), 200
    
    except Exception as e:
        logger.error(f"Error deleting supplier {supplier_id}: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== MEDICINES ROUTES ====================

@medicines_bp.route('/medicines/search', methods=['GET'])
@jwt_required()
def search_medicines():
    """
    Search medicines using fuzzy search on name and generic_name
    Query params: q (search query), limit (default 20)
    Uses pg_trgm for fast fuzzy matching
    """
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor(current_user_id)
        if error:
            return error
        
        search_query = request.args.get('q', '').strip()
        limit = int(request.args.get('limit', 20))
        
        if not search_query or len(search_query) < 2:
            return jsonify({
                'success': False,
                'message': 'Search query must be at least 2 characters'
            }), 400
        
        # Use raw SQL for fuzzy search with pg_trgm
        client = SupabaseClient.get_service_client()

        data = []
        try:
            response = client.rpc('search_medicines_fuzzy', {
                'search_term': search_query,
                'limit_count': limit
            }).execute()

            if hasattr(response, 'error') and response.error:
                logger.warning(f"search_medicines_fuzzy not available: {response.error}")
            else:
                data = response.data if hasattr(response, 'data') else []
        except Exception as e:
            logger.warning(f"search_medicines_fuzzy failed: {e}")

        if not data:
            # Fallback to basic ILIKE search if RPC not available
            columns = (
                'medicine_id, medicine_name, generic_name, category, dosage_form, strength, unit, '
                'quantity_in_stock, min_quantity, status'
            )
            name_res = SupabaseClient.execute_admin_query(
                'medicines',
                operation='select',
                columns=columns,
                filter_medicine_name=('ilike', f'%{search_query}%'),
                filter_status='Active',
                limit=limit,
            )
            generic_res = SupabaseClient.execute_admin_query(
                'medicines',
                operation='select',
                columns=columns,
                filter_generic_name=('ilike', f'%{search_query}%'),
                filter_status='Active',
                limit=limit,
            )

            merged: dict[int, dict] = {}
            for row in (name_res.get('data') or []):
                if isinstance(row, dict) and 'medicine_id' in row:
                    merged[int(row['medicine_id'])] = row
            for row in (generic_res.get('data') or []):
                if isinstance(row, dict) and 'medicine_id' in row:
                    merged.setdefault(int(row['medicine_id']), row)

            data = list(merged.values())[:limit]
        
        # Add low stock indicator
        result = []
        for medicine in data:
            medicine['is_low_stock'] = medicine.get('quantity_in_stock', 0) < medicine.get('min_quantity', 10)
            result.append(medicine)
        
        return jsonify({
            'success': True,
            'count': len(result),
            'data': _serialize_response(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error searching medicines: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/medicines/recent', methods=['GET'])
@jwt_required()
def get_recent_medicines():
    """
    Get recent medicines prescribed by this doctor to this patient
    Query params: patient_id, limit (default 10)
    """
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor(current_user_id)
        if error:
            return error
        
        patient_id = request.args.get('patient_id', type=int)
        if not patient_id:
            return jsonify({'success': False, 'message': 'patient_id is required'}), 400
        
        limit = int(request.args.get('limit', 10))
        
        client = SupabaseClient.get_service_client()

        # Resolve doctor_id (numeric) from current user_id (UUID)
        doctor_row = SupabaseClient.execute_query('doctors', 'select', filter_user_id=current_user_id, limit=1)
        doctor_id = None
        if doctor_row.get('success') and doctor_row.get('data'):
            doctor_id = doctor_row['data'][0].get('doctor_id')

        if not doctor_id:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient_row = SupabaseClient.execute_query('patients', 'select', filter_patient_id=patient_id, limit=1)
        patient_user_id = None
        if patient_row.get('success') and patient_row.get('data'):
            patient_user_id = patient_row['data'][0].get('user_id')

        if not patient_user_id:
            return jsonify({'success': False, 'message': 'Patient profile not found'}), 404

        # Query recent medicines via prescription items
        response = client.table('prescription_items').select(
            'medicine_id, medicines(medicine_id, medicine_name, generic_name, category, dosage_form, strength, unit, '
            'quantity_in_stock, min_quantity, status), prescriptions(prescribed_at, patient_id, doctor_id)'
        ).eq('prescriptions.patient_id', patient_user_id).eq('prescriptions.doctor_id', current_user_id).order(
            'prescribed_at', desc=True, foreign_table='prescriptions'
        ).limit(limit).execute()

        rows = response.data if hasattr(response, 'data') else []

        merged: dict[int, dict] = {}
        for row in rows:
            med = row.get('medicines') if isinstance(row, dict) else None
            if not isinstance(med, dict) or 'medicine_id' not in med:
                continue
            med_id = int(med['medicine_id'])
            if med_id in merged:
                continue
            med['is_low_stock'] = med.get('quantity_in_stock', 0) < med.get('min_quantity', 10)
            merged[med_id] = med
            if len(merged) >= limit:
                break

        data = list(merged.values())

        return jsonify({
            'success': True,
            'count': len(data),
            'data': _serialize_response(data)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching recent medicines: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/medicines', methods=['GET'])
@jwt_required()
def list_medicines():
    """List all active medicines with optional filtering"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        category = request.args.get('category')
        status = request.args.get('status', 'Active')
        page = int(request.args.get('page', 0))
        limit = int(request.args.get('limit', 50))
        
        offset = page * limit
        
        response = SupabaseClient.execute_admin_query(
            'medicines',
            operation='select',
            columns='*',
            filter_status=status,
            **({'filter_category': category} if category else {}),
            order_by='medicine_name',
            limit=limit,
            offset=offset,
        )

        if not response.get('success'):
            logger.error(f"Supabase list medicines error: {response.get('error')}")
            return jsonify({'success': False, 'message': response.get('error') or 'Failed to load medicines'}), 400

        data = response.get('data') or []
        
        return jsonify({
            'success': True,
            'count': len(data),
            'data': _serialize_response(data)
        }), 200
    
    except Exception as e:
        logger.exception('Error listing medicines')
        logger.error(f"List medicines query params: category={category}, status={status}, page={page}, limit={limit}")
        print('Error listing medicines:', e)
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/medicines', methods=['POST'])
@jwt_required()
def create_medicine():
    """Create a new medicine in the catalog"""
    data = None
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        data = request.get_json()
        medicine = MedicineCreate(**data)
        
        payload = medicine.dict()
        if isinstance(payload.get('expiry_date'), date):
            payload['expiry_date'] = payload['expiry_date'].isoformat()

        response = SupabaseClient.execute_admin_query(
            'medicines',
            operation='insert',
            **payload
        )

        if not response.get('success'):
            logger.error(f"Supabase insert error: {response.get('error')}")
            return jsonify({'success': False, 'message': response.get('error') or 'Failed to create medicine'}), 400

        result = (response.get('data') or [{}])[0]
        
        return jsonify({
            'success': True,
            'message': 'Medicine created successfully',
            'data': _serialize_response(result)
        }), 201
    
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.exception('Error creating medicine')
        logger.error(f"Medicine payload: {data}")
        print('Error creating medicine:', e)
        print('Medicine payload:', data)
        return jsonify({'success': False, 'message': str(e) or 'Failed to create medicine'}), 500


@medicines_bp.route('/medicines/<int:medicine_id>', methods=['GET'])
@jwt_required()
def get_medicine(medicine_id: int):
    """Get a specific medicine"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        response = SupabaseClient.execute_admin_query(
            'medicines',
            operation='select',
            columns='*',
            filter_medicine_id=medicine_id,
            limit=1,
        )

        if not response.get('success'):
            return jsonify({'success': False, 'message': response.get('error') or 'Failed to load medicine'}), 400

        data = (response.get('data') or [None])[0]
        
        if not data:
            return jsonify({'success': False, 'message': 'Medicine not found'}), 404
        
        return jsonify({
            'success': True,
            'data': _serialize_response(data)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching medicine: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/medicines/<int:medicine_id>', methods=['PUT'])
@jwt_required()
def update_medicine(medicine_id: int):
    """Update a medicine"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error
        
        data = request.get_json()
        
        response = SupabaseClient.execute_admin_query(
            'medicines',
            operation='update',
            filter_medicine_id=medicine_id,
            **data
        )

        if not response.get('success'):
            return jsonify({'success': False, 'message': response.get('error') or 'Failed to update medicine'}), 400

        result = (response.get('data') or [{}])[0]
        
        return jsonify({
            'success': True,
            'message': 'Medicine updated successfully',
            'data': _serialize_response(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error updating medicine: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/medicines/<int:medicine_id>', methods=['DELETE'])
@jwt_required()
def delete_medicine(medicine_id: int):
    """Delete a medicine"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor_or_admin(current_user_id)
        if error:
            return error

        response = SupabaseClient.execute_admin_query(
            'medicines',
            operation='delete',
            filter_medicine_id=medicine_id,
        )

        if not response.get('success'):
            return jsonify({'success': False, 'message': response.get('error') or 'Failed to delete medicine'}), 400

        return jsonify({
            'success': True,
            'message': 'Medicine deleted successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error deleting medicine: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== HELPER FUNCTIONS ====================

def calculate_end_date(start_date: date, duration_type: str, duration_value: int) -> date:
    """Calculate end date based on duration"""
    if duration_type == 'day':
        return start_date + timedelta(days=duration_value)
    elif duration_type == 'week':
        return start_date + timedelta(weeks=duration_value)
    elif duration_type == 'month':
        # Add months by calculating day of next month
        month = start_date.month - 1 + duration_value
        year = start_date.year + month // 12
        month = month % 12 + 1
        day = min(start_date.day, [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
            if month == 2:
                day = min(start_date.day, 29)
        return date(year, month, day)
    else:  # custom
        return start_date + timedelta(days=duration_value)


# ==================== PRESCRIPTIONS ROUTES ====================

@medicines_bp.route('/prescriptions', methods=['POST'])
@jwt_required()
def create_prescription():
    """
    Create a complete prescription with multiple medicines
    Expects: patient_id, doctor_id, items (list of prescription items)
    """
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor(current_user_id)
        if error:
            return error
        
        data = request.get_json()
        prescription_req = CreatePrescriptionRequest(**data)
        
        client = SupabaseClient.get_service_client()

        doctor_row = SupabaseClient.execute_query('doctors', 'select', filter_user_id=current_user_id, limit=1)
        if not doctor_row.get('success') or not doctor_row.get('data'):
            return jsonify({
                'success': False,
                'message': 'Doctor profile not found'
            }), 404

        doctor_record = doctor_row['data'][0]

        patient_row = None
        if isinstance(prescription_req.patient_id, int):
            patient_row = SupabaseClient.execute_query('patients', 'select', filter_patient_id=prescription_req.patient_id, limit=1)
        else:
            patient_row = SupabaseClient.execute_query('patients', 'select', filter_user_id=str(prescription_req.patient_id), limit=1)

        if not patient_row.get('success') or not patient_row.get('data'):
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404

        patient_record = patient_row['data'][0]
        
        requested_doctor_id = str(prescription_req.doctor_id)
        if requested_doctor_id not in {str(current_user_id), str(doctor_record.get('doctor_id'))}:
            return jsonify({
                'success': False,
                'message': 'Cannot create prescription for another doctor'
            }), 403

        patient_user_id = patient_record.get('user_id')
        doctor_user_id = doctor_record.get('user_id') or str(current_user_id)
        
        # Create prescription record
        prescription_data = {
            'patient_id': patient_user_id,
            'doctor_id': doctor_user_id,
            'appointment_id': prescription_req.appointment_id,
            'clinic_id': prescription_req.clinic_id,
            'notes': prescription_req.notes,
            'prescribed_at': datetime.now().isoformat(),
            'is_active': True
        }
        
        prescription_response = client.table('prescriptions').insert(prescription_data).execute()
        
        if not hasattr(prescription_response, 'data') or not prescription_response.data:
            return jsonify({
                'success': False,
                'message': 'Failed to create prescription'
            }), 400
        
        prescription_id = prescription_response.data[0]['prescription_id']
        
        # Create prescription items
        items_to_insert = []
        for item in prescription_req.items:
            start_date_obj = item.start_date if isinstance(item.start_date, date) else date.fromisoformat(str(item.start_date))
            end_date = calculate_end_date(
                start_date_obj,
                item.duration_type.value,
                item.duration_value
            )
            
            item_data = {
                'prescription_id': prescription_id,
                'medicine_id': item.medicine_id,
                'dosage': item.dosage,
                'duration_type': item.duration_type.value,
                'duration_value': item.duration_value,
                'frequency_type': item.frequency_type.value,
                'times_per_day': item.times_per_day,
                'specific_times': item.specific_times,
                'start_date': start_date_obj.isoformat(),
                'end_date': end_date.isoformat(),
                'next_clinic_date': item.next_clinic_date.isoformat() if item.next_clinic_date else None,
                'instructions': item.instructions,
                'is_active': True
            }
            items_to_insert.append(item_data)
        
        # Batch insert items
        if items_to_insert:
            items_response = client.table('prescription_items').insert(items_to_insert).execute()

        # Also insert into patient_medications so doctor views show prescriptions
        try:
            doctor_id = doctor_record.get('doctor_id')

            medicine_ids = list({int(item.medicine_id) for item in prescription_req.items})
            medicine_lookup: dict[int, str] = {}
            if medicine_ids:
                med_res = SupabaseClient.execute_admin_query(
                    'medicines',
                    operation='select',
                    columns='medicine_id, medicine_name',
                    filter_medicine_id=('in', medicine_ids),
                )
                for row in med_res.get('data') or []:
                    if isinstance(row, dict) and 'medicine_id' in row:
                        medicine_lookup[int(row['medicine_id'])] = str(row.get('medicine_name') or '').strip()

            if doctor_id:
                meds_rows = []
                for item in prescription_req.items:
                    med_name = medicine_lookup.get(int(item.medicine_id)) or f"Medicine {item.medicine_id}"
                    times = item.specific_times or []
                    times_per_day = item.times_per_day or (len(times) if times else 1)
                    end_date_str = None
                    try:
                        start_dt = item.start_date if isinstance(item.start_date, date) else date.fromisoformat(str(item.start_date))
                        end_date_str = calculate_end_date(start_dt, item.duration_type.value, item.duration_value).isoformat()
                    except Exception:
                        end_date_str = None

                    meds_rows.append({
                        'patient_id': patient_record.get('patient_id'),
                        'doctor_id': doctor_id,
                        'medicine_name': med_name,
                        'dosage': item.dosage,
                        'frequency': 'Daily',
                        'times_per_day': times_per_day,
                        'specific_times': times,
                        'start_date': str(item.start_date),
                        'end_date': end_date_str,
                        'next_clinic_date': item.next_clinic_date.isoformat() if item.next_clinic_date else None,
                        'is_active': True,
                        'notes': item.instructions or prescription_req.notes,
                        'prescribed_at': datetime.now().isoformat(),
                    })

                if meds_rows:
                    SupabaseClient.execute_query('patient_medications', 'insert', rows=meds_rows)
        except Exception as e:
            logger.warning(f"Failed to sync prescription to patient_medications: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Prescription created successfully',
            'prescription_id': prescription_id,
            'items_created': len(items_to_insert)
        }), 201
    
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error creating prescription: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/prescriptions/<int:prescription_id>', methods=['GET'])
@jwt_required()
def get_prescription(prescription_id: int):
    """Get a prescription with all its items"""
    try:
        current_user_id = get_jwt_identity()
        user = get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        client = SupabaseClient.get_client()
        
        # Get prescription
        pres_response = client.table('prescriptions').select('*').eq('prescription_id', prescription_id).execute()
        
        if not hasattr(pres_response, 'data') or not pres_response.data:
            return jsonify({'success': False, 'message': 'Prescription not found'}), 404
        
        prescription = pres_response.data[0]
        
        # Check access
        if user.get('role') == 'doctor' and prescription['doctor_id'] != int(current_user_id):
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        # Get items
        items_response = client.table('prescription_items').select('*').eq('prescription_id', prescription_id).execute()
        items = items_response.data if hasattr(items_response, 'data') else []
        
        prescription['items'] = items
        
        return jsonify({
            'success': True,
            'data': _serialize_response(prescription)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching prescription: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/prescriptions/<int:patient_id>/list', methods=['GET'])
@jwt_required()
def list_patient_prescriptions(patient_id: int):
    """List all prescriptions for a patient"""
    try:
        current_user_id = get_jwt_identity()
        user = get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        client = SupabaseClient.get_client()
        query = client.table('prescriptions').select('*').eq('patient_id', patient_id)
        
        if active_only:
            query = query.eq('is_active', True)
        
        response = query.order('prescribed_at', desc=True).execute()
        data = response.data if hasattr(response, 'data') else []
        
        return jsonify({
            'success': True,
            'count': len(data),
            'data': _serialize_response(data)
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing patient prescriptions: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/prescription-items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_prescription_item(item_id: int):
    """Update a prescription item"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor(current_user_id)
        if error:
            return error
        
        data = request.get_json()
        
        client = SupabaseClient.get_client()
        response = client.table('prescription_items').update(data).eq('prescription_item_id', item_id).execute()
        
        result = response.data[0] if hasattr(response, 'data') and response.data else {}
        
        return jsonify({
            'success': True,
            'message': 'Item updated successfully',
            'data': _serialize_response(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error updating prescription item: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/prescription-items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_prescription_item(item_id: int):
    """Delete a prescription item"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor(current_user_id)
        if error:
            return error
        
        client = SupabaseClient.get_client()
        response = client.table('prescription_items').delete().eq('prescription_item_id', item_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Item deleted successfully'
        }), 200
    
    except Exception as e:
        logger.error(f"Error deleting prescription item: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@medicines_bp.route('/prescription-items/bulk-update', methods=['PUT'])
@jwt_required()
def bulk_update_prescription_items():
    """Bulk update duration and frequency for multiple items"""
    try:
        current_user_id = get_jwt_identity()
        user, error = _require_doctor(current_user_id)
        if error:
            return error
        
        data = request.get_json()
        bulk_req = BulkSetDurationFrequencyRequest(**data)
        
        client = SupabaseClient.get_client()
        
        # Calculate end date
        start_date_obj = bulk_req.start_date if isinstance(bulk_req.start_date, date) else date.fromisoformat(str(bulk_req.start_date))
        end_date = calculate_end_date(
            start_date_obj,
            bulk_req.duration_type.value,
            bulk_req.duration_value
        )
        
        update_data = {
            'duration_type': bulk_req.duration_type.value,
            'duration_value': bulk_req.duration_value,
            'frequency_type': bulk_req.frequency_type.value,
            'times_per_day': bulk_req.times_per_day,
            'specific_times': bulk_req.specific_times,
            'start_date': start_date_obj.isoformat(),
            'end_date': end_date.isoformat()
        }
        
        # Update each item
        for item_id in bulk_req.prescription_item_ids:
            client.table('prescription_items').update(update_data).eq('prescription_item_id', item_id).execute()
        
        return jsonify({
            'success': True,
            'message': f'Updated {len(bulk_req.prescription_item_ids)} items',
            'items_updated': len(bulk_req.prescription_item_ids)
        }), 200
    
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error bulk updating items: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500
