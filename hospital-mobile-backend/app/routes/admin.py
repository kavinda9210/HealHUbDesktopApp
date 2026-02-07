import logging
from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.supabase_client import SupabaseClient, get_user_by_id, get_user_by_email
from app.utils.security import hash_password
from app.utils.time_utils import sl_now_iso

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)


def _require_admin(user_id: str):
    user = get_user_by_id(user_id)
    if not user:
        return None, (jsonify({'success': False, 'message': 'User not found'}), 404)
    if user.get('role') != 'admin':
        return None, (jsonify({'success': False, 'message': 'Admin access required'}), 403)
    return user, None


def _attach_user_emails(rows: list, user_id_key: str = 'user_id') -> list:
    user_ids = [r.get(user_id_key) for r in rows if r.get(user_id_key)]
    user_ids = list(dict.fromkeys(user_ids))
    if not user_ids:
        return rows

    users_result = SupabaseClient.execute_admin_query(
        'users',
        'select',
        filter_user_id=('in', user_ids),
        columns='user_id,email,role,is_active,is_verified,created_at'
    )
    users = {u['user_id']: u for u in (users_result.get('data') or [])}

    for r in rows:
        u = users.get(r.get(user_id_key))
        if u:
            r['email'] = u.get('email')
            r['role'] = u.get('role')
            r['user_is_active'] = u.get('is_active')
            r['user_is_verified'] = u.get('is_verified')
            r['user_created_at'] = u.get('created_at')
    return rows


def _create_user(*, email: str, password: str, role: str, is_verified: bool = True, is_active: bool = True):
    if get_user_by_email(email):
        return None, (jsonify({'success': False, 'message': 'Email already registered'}), 409)

    user_payload = {
        'email': email,
        'password_hash': hash_password(password),
        'role': role,
        'is_verified': is_verified,
        'is_active': is_active,
        'created_at': sl_now_iso(),
    }

    result = SupabaseClient.execute_admin_query('users', 'insert', **user_payload)
    if not result.get('success') or not result.get('data'):
        return None, (jsonify({'success': False, 'message': 'Failed to create user'}), 500)

    return result['data'][0], None


# -----------------
# Doctors (Admin)
# -----------------
@admin_bp.route('/doctors', methods=['GET'])
@jwt_required()
def admin_list_doctors():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        q = (request.args.get('q') or '').strip()
        query = {'order_by': 'created_at', 'order_desc': True}
        if q:
            query['filter_full_name'] = ('ilike', f'%{q}%')

        result = SupabaseClient.execute_admin_query('doctors', 'select', **query)
        if not result.get('success'):
            return jsonify({'success': False, 'message': 'Failed to fetch doctors'}), 500

        rows = _attach_user_emails(result.get('data') or [])
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200
    except Exception as e:
        logger.error(f"Admin list doctors error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch doctors', 'error': str(e)}), 500


@admin_bp.route('/doctors', methods=['POST'])
@jwt_required()
def admin_create_doctor():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        full_name = data.get('full_name')
        specialization = data.get('specialization')
        phone = data.get('phone')

        if not all([email, password, full_name, specialization, phone]):
            return jsonify({'success': False, 'message': 'email, password, full_name, specialization, phone are required'}), 400

        consultation_fee = data.get('consultation_fee', 0.0)

        created_user, user_err = _create_user(email=email, password=password, role='doctor', is_verified=True)
        if user_err:
            return user_err

        doctor_payload = {
            'user_id': created_user['user_id'],
            'full_name': full_name,
            'specialization': specialization,
            'qualification': data.get('qualification'),
            'phone': phone,
            'email': email,
            'consultation_fee': consultation_fee,
            'available_days': data.get('available_days'),
            'start_time': data.get('start_time'),
            'end_time': data.get('end_time'),
            'is_available': bool(data.get('is_available', True)),
            'created_at': sl_now_iso(),
        }

        result = SupabaseClient.execute_admin_query('doctors', 'insert', **doctor_payload)
        if not result.get('success') or not result.get('data'):
            # rollback user
            try:
                SupabaseClient.execute_admin_query('users', 'delete', filter_user_id=created_user['user_id'])
            except Exception:
                pass
            return jsonify({'success': False, 'message': 'Failed to create doctor'}), 500

        doctor = result['data'][0]
        doctor['email'] = email
        return jsonify({'success': True, 'message': 'Doctor created', 'data': doctor}), 201

    except Exception as e:
        logger.error(f"Admin create doctor error: {e}")
        return jsonify({'success': False, 'message': 'Failed to create doctor', 'error': str(e)}), 500


@admin_bp.route('/doctors/<int:doctor_id>', methods=['GET'])
@jwt_required()
def admin_get_doctor(doctor_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        result = SupabaseClient.execute_admin_query('doctors', 'select', filter_doctor_id=doctor_id)
        if not result.get('success') or not result.get('data'):
            return jsonify({'success': False, 'message': 'Doctor not found'}), 404

        row = result['data'][0]
        row = _attach_user_emails([row])[0]
        return jsonify({'success': True, 'data': row}), 200

    except Exception as e:
        logger.error(f"Admin get doctor error: {e}")
        return jsonify({'success': False, 'message': 'Failed to get doctor', 'error': str(e)}), 500


@admin_bp.route('/doctors/<int:doctor_id>', methods=['PUT'])
@jwt_required()
def admin_update_doctor(doctor_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        data = request.get_json() or {}

        # Fetch doctor to find user_id
        doctor_result = SupabaseClient.execute_admin_query('doctors', 'select', filter_doctor_id=doctor_id)
        if not doctor_result.get('success') or not doctor_result.get('data'):
            return jsonify({'success': False, 'message': 'Doctor not found'}), 404

        doctor = doctor_result['data'][0]
        user_id = doctor.get('user_id')

        doctor_update = {k: v for k, v in data.items() if k in [
            'full_name', 'specialization', 'qualification', 'phone', 'consultation_fee',
            'available_days', 'start_time', 'end_time', 'is_available'
        ]}

        if doctor_update:
            upd = SupabaseClient.execute_admin_query('doctors', 'update', filter_doctor_id=doctor_id, **doctor_update)
            if not upd.get('success'):
                return jsonify({'success': False, 'message': 'Failed to update doctor'}), 500

        # Optional: admin can update doctor's email directly
        new_email = (data.get('email') or '').strip().lower() if 'email' in data else None
        if new_email and user_id:
            if get_user_by_email(new_email) and get_user_by_email(new_email).get('user_id') != user_id:
                return jsonify({'success': False, 'message': 'Email already in use'}), 409
            upd_user = SupabaseClient.execute_admin_query('users', 'update', filter_user_id=user_id, email=new_email)
            if not upd_user.get('success'):
                return jsonify({'success': False, 'message': 'Failed to update email'}), 500
            SupabaseClient.execute_admin_query('doctors', 'update', filter_doctor_id=doctor_id, email=new_email)

        return jsonify({'success': True, 'message': 'Doctor updated'}), 200

    except Exception as e:
        logger.error(f"Admin update doctor error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update doctor', 'error': str(e)}), 500


@admin_bp.route('/doctors/<int:doctor_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_doctor(doctor_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        doctor_result = SupabaseClient.execute_admin_query('doctors', 'select', filter_doctor_id=doctor_id)
        if not doctor_result.get('success') or not doctor_result.get('data'):
            return jsonify({'success': False, 'message': 'Doctor not found'}), 404

        user_id = doctor_result['data'][0].get('user_id')

        del_doc = SupabaseClient.execute_admin_query('doctors', 'delete', filter_doctor_id=doctor_id)
        if not del_doc.get('success'):
            return jsonify({'success': False, 'message': 'Failed to delete doctor'}), 500

        if user_id:
            SupabaseClient.execute_admin_query('users', 'delete', filter_user_id=user_id)

        return jsonify({'success': True, 'message': 'Doctor deleted'}), 200

    except Exception as e:
        logger.error(f"Admin delete doctor error: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete doctor', 'error': str(e)}), 500


# -----------------
# Patients (Admin)
# -----------------
@admin_bp.route('/patients', methods=['GET'])
@jwt_required()
def admin_list_patients():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        q = (request.args.get('q') or '').strip()
        query = {'order_by': 'created_at', 'order_desc': True}
        if q:
            query['filter_full_name'] = ('ilike', f'%{q}%')

        result = SupabaseClient.execute_admin_query('patients', 'select', **query)
        if not result.get('success'):
            return jsonify({'success': False, 'message': 'Failed to fetch patients'}), 500

        rows = _attach_user_emails(result.get('data') or [])
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200
    except Exception as e:
        logger.error(f"Admin list patients error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch patients', 'error': str(e)}), 500


@admin_bp.route('/patients', methods=['POST'])
@jwt_required()
def admin_create_patient():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        full_name = data.get('full_name')
        phone = data.get('phone')
        dob = data.get('dob')
        gender = data.get('gender')
        address = data.get('address')

        if not all([email, password, full_name, phone, dob, gender, address]):
            return jsonify({'success': False, 'message': 'email, password, full_name, phone, dob, gender, address are required'}), 400

        created_user, user_err = _create_user(email=email, password=password, role='patient', is_verified=True)
        if user_err:
            return user_err

        patient_payload = {
            'user_id': created_user['user_id'],
            'full_name': full_name,
            'dob': dob,
            'gender': gender,
            'phone': phone,
            'address': address,
            'blood_group': data.get('blood_group'),
            'emergency_contact': data.get('emergency_contact'),
            'has_chronic_condition': bool(data.get('has_chronic_condition', False)),
            'condition_notes': data.get('condition_notes'),
            'created_at': sl_now_iso(),
        }

        result = SupabaseClient.execute_admin_query('patients', 'insert', **patient_payload)
        if not result.get('success') or not result.get('data'):
            try:
                SupabaseClient.execute_admin_query('users', 'delete', filter_user_id=created_user['user_id'])
            except Exception:
                pass
            return jsonify({'success': False, 'message': 'Failed to create patient'}), 500

        row = result['data'][0]
        row['email'] = email
        return jsonify({'success': True, 'message': 'Patient created', 'data': row}), 201

    except Exception as e:
        logger.error(f"Admin create patient error: {e}")
        return jsonify({'success': False, 'message': 'Failed to create patient', 'error': str(e)}), 500


@admin_bp.route('/patients/<int:patient_id>', methods=['GET'])
@jwt_required()
def admin_get_patient(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        result = SupabaseClient.execute_admin_query('patients', 'select', filter_patient_id=patient_id)
        if not result.get('success') or not result.get('data'):
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        row = _attach_user_emails([result['data'][0]])[0]
        return jsonify({'success': True, 'data': row}), 200

    except Exception as e:
        logger.error(f"Admin get patient error: {e}")
        return jsonify({'success': False, 'message': 'Failed to get patient', 'error': str(e)}), 500


@admin_bp.route('/patients/<int:patient_id>', methods=['PUT'])
@jwt_required()
def admin_update_patient(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        data = request.get_json() or {}
        patient_result = SupabaseClient.execute_admin_query('patients', 'select', filter_patient_id=patient_id)
        if not patient_result.get('success') or not patient_result.get('data'):
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        patient = patient_result['data'][0]
        user_id = patient.get('user_id')

        patient_update = {k: v for k, v in data.items() if k in [
            'full_name', 'dob', 'gender', 'phone', 'address', 'blood_group',
            'emergency_contact', 'has_chronic_condition', 'condition_notes'
        ]}
        if patient_update:
            upd = SupabaseClient.execute_admin_query('patients', 'update', filter_patient_id=patient_id, **patient_update)
            if not upd.get('success'):
                return jsonify({'success': False, 'message': 'Failed to update patient'}), 500

        new_email = (data.get('email') or '').strip().lower() if 'email' in data else None
        if new_email and user_id:
            existing = get_user_by_email(new_email)
            if existing and existing.get('user_id') != user_id:
                return jsonify({'success': False, 'message': 'Email already in use'}), 409
            upd_user = SupabaseClient.execute_admin_query('users', 'update', filter_user_id=user_id, email=new_email)
            if not upd_user.get('success'):
                return jsonify({'success': False, 'message': 'Failed to update email'}), 500

        return jsonify({'success': True, 'message': 'Patient updated'}), 200

    except Exception as e:
        logger.error(f"Admin update patient error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update patient', 'error': str(e)}), 500


@admin_bp.route('/patients/<int:patient_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_patient(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        patient_result = SupabaseClient.execute_admin_query('patients', 'select', filter_patient_id=patient_id)
        if not patient_result.get('success') or not patient_result.get('data'):
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        user_id = patient_result['data'][0].get('user_id')

        del_pat = SupabaseClient.execute_admin_query('patients', 'delete', filter_patient_id=patient_id)
        if not del_pat.get('success'):
            return jsonify({'success': False, 'message': 'Failed to delete patient'}), 500

        if user_id:
            SupabaseClient.execute_admin_query('users', 'delete', filter_user_id=user_id)

        return jsonify({'success': True, 'message': 'Patient deleted'}), 200

    except Exception as e:
        logger.error(f"Admin delete patient error: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete patient', 'error': str(e)}), 500


# -----------------
# Ambulances (Admin)
# -----------------
@admin_bp.route('/ambulances', methods=['GET'])
@jwt_required()
def admin_list_ambulances():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        q = (request.args.get('q') or '').strip()
        query = {'order_by': 'created_at', 'order_desc': True}
        if q:
            query['filter_driver_name'] = ('ilike', f'%{q}%')

        result = SupabaseClient.execute_admin_query('ambulances', 'select', **query)
        if not result.get('success'):
            return jsonify({'success': False, 'message': 'Failed to fetch ambulances'}), 500

        rows = _attach_user_emails(result.get('data') or [])
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200
    except Exception as e:
        logger.error(f"Admin list ambulances error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch ambulances', 'error': str(e)}), 500


@admin_bp.route('/ambulances', methods=['POST'])
@jwt_required()
def admin_create_ambulance():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        ambulance_number = data.get('ambulance_number')
        driver_name = data.get('driver_name')
        driver_phone = data.get('driver_phone')

        if not all([email, password, ambulance_number, driver_name, driver_phone]):
            return jsonify({'success': False, 'message': 'email, password, ambulance_number, driver_name, driver_phone are required'}), 400

        created_user, user_err = _create_user(email=email, password=password, role='ambulance_staff', is_verified=True)
        if user_err:
            return user_err

        payload = {
            'user_id': created_user['user_id'],
            'ambulance_number': ambulance_number,
            'driver_name': driver_name,
            'driver_phone': driver_phone,
            'is_available': bool(data.get('is_available', True)),
            'created_at': sl_now_iso(),
        }

        result = SupabaseClient.execute_admin_query('ambulances', 'insert', **payload)
        if not result.get('success') or not result.get('data'):
            try:
                SupabaseClient.execute_admin_query('users', 'delete', filter_user_id=created_user['user_id'])
            except Exception:
                pass
            return jsonify({'success': False, 'message': 'Failed to create ambulance'}), 500

        row = result['data'][0]
        row['email'] = email
        return jsonify({'success': True, 'message': 'Ambulance created', 'data': row}), 201

    except Exception as e:
        logger.error(f"Admin create ambulance error: {e}")
        return jsonify({'success': False, 'message': 'Failed to create ambulance', 'error': str(e)}), 500


@admin_bp.route('/ambulances/<int:ambulance_id>', methods=['GET'])
@jwt_required()
def admin_get_ambulance(ambulance_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        result = SupabaseClient.execute_admin_query('ambulances', 'select', filter_ambulance_id=ambulance_id)
        if not result.get('success') or not result.get('data'):
            return jsonify({'success': False, 'message': 'Ambulance not found'}), 404

        row = _attach_user_emails([result['data'][0]])[0]
        return jsonify({'success': True, 'data': row}), 200

    except Exception as e:
        logger.error(f"Admin get ambulance error: {e}")
        return jsonify({'success': False, 'message': 'Failed to get ambulance', 'error': str(e)}), 500


@admin_bp.route('/ambulances/<int:ambulance_id>', methods=['PUT'])
@jwt_required()
def admin_update_ambulance(ambulance_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        data = request.get_json() or {}
        amb_result = SupabaseClient.execute_admin_query('ambulances', 'select', filter_ambulance_id=ambulance_id)
        if not amb_result.get('success') or not amb_result.get('data'):
            return jsonify({'success': False, 'message': 'Ambulance not found'}), 404

        amb = amb_result['data'][0]
        user_id = amb.get('user_id')

        update_data = {k: v for k, v in data.items() if k in [
            'ambulance_number', 'driver_name', 'driver_phone', 'is_available',
            'current_latitude', 'current_longitude'
        ]}
        if update_data:
            upd = SupabaseClient.execute_admin_query('ambulances', 'update', filter_ambulance_id=ambulance_id, **update_data)
            if not upd.get('success'):
                return jsonify({'success': False, 'message': 'Failed to update ambulance'}), 500

        new_email = (data.get('email') or '').strip().lower() if 'email' in data else None
        if new_email and user_id:
            existing = get_user_by_email(new_email)
            if existing and existing.get('user_id') != user_id:
                return jsonify({'success': False, 'message': 'Email already in use'}), 409
            upd_user = SupabaseClient.execute_admin_query('users', 'update', filter_user_id=user_id, email=new_email)
            if not upd_user.get('success'):
                return jsonify({'success': False, 'message': 'Failed to update email'}), 500

        return jsonify({'success': True, 'message': 'Ambulance updated'}), 200

    except Exception as e:
        logger.error(f"Admin update ambulance error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update ambulance', 'error': str(e)}), 500


@admin_bp.route('/ambulances/<int:ambulance_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_ambulance(ambulance_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_admin(current_user_id)
        if err:
            return err

        amb_result = SupabaseClient.execute_admin_query('ambulances', 'select', filter_ambulance_id=ambulance_id)
        if not amb_result.get('success') or not amb_result.get('data'):
            return jsonify({'success': False, 'message': 'Ambulance not found'}), 404

        user_id = amb_result['data'][0].get('user_id')

        del_amb = SupabaseClient.execute_admin_query('ambulances', 'delete', filter_ambulance_id=ambulance_id)
        if not del_amb.get('success'):
            return jsonify({'success': False, 'message': 'Failed to delete ambulance'}), 500

        if user_id:
            SupabaseClient.execute_admin_query('users', 'delete', filter_user_id=user_id)

        return jsonify({'success': True, 'message': 'Ambulance deleted'}), 200

    except Exception as e:
        logger.error(f"Admin delete ambulance error: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete ambulance', 'error': str(e)}), 500
