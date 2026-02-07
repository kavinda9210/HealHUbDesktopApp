import logging
import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.supabase_client import SupabaseClient, get_user_by_id
from app.utils.time_utils import sl_now_iso, sl_today
from app.utils.scheduling import normalize_times, next_fourth_tuesday, daterange
from datetime import date, timedelta

logger = logging.getLogger(__name__)

medication_bp = Blueprint('medication', __name__)


@medication_bp.route('/ping', methods=['GET'])
def medication_ping():
	"""Health endpoint for medication routes (placeholder)."""
	return jsonify({
		'success': True,
		'message': 'Medication routes are available'
	}), 200


def _require_doctor(user_id: str):
	user = get_user_by_id(user_id)
	if not user:
		return None, (jsonify({'success': False, 'message': 'User not found'}), 404)
	if user.get('role') != 'doctor':
		return None, (jsonify({'success': False, 'message': 'Doctor access required'}), 403)
	return user, None


@medication_bp.route('/patient/<int:patient_id>', methods=['GET'])
@jwt_required()
def list_patient_medications(patient_id: int):
	"""List medications for a patient (doctor/admin)."""
	try:
		current_user_id = get_jwt_identity()
		user = get_user_by_id(current_user_id)
		if not user:
			return jsonify({'success': False, 'message': 'User not found'}), 404
		if user.get('role') not in ['doctor', 'admin']:
			return jsonify({'success': False, 'message': 'Access denied'}), 403

		active_only = (request.args.get('active_only', 'false').lower() == 'true')
		query = {'filter_patient_id': patient_id, 'order_by': 'prescribed_at', 'order_desc': True}
		if active_only:
			query['filter_is_active'] = True

		result = SupabaseClient.execute_query('patient_medications', 'select', **query)
		if not result.get('success'):
			return jsonify({'success': False, 'message': 'Failed to fetch medications'}), 500

		return jsonify({'success': True, 'data': result.get('data') or [], 'count': len(result.get('data') or [])}), 200

	except Exception as e:
		logger.error(f"List patient medications error: {e}")
		return jsonify({'success': False, 'message': 'Failed to fetch medications', 'error': str(e)}), 500


@medication_bp.route('/prescribe', methods=['POST'])
@jwt_required()
def prescribe_medication():
	"""Prescribe medication (doctor). Kept for compatibility with earlier clients."""
	try:
		current_user_id = get_jwt_identity()
		_, err = _require_doctor(current_user_id)
		if err:
			return err

		doctor_result = SupabaseClient.execute_query('doctors', 'select', filter_user_id=current_user_id)
		if not doctor_result.get('success') or not doctor_result.get('data'):
			return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404
		doctor = doctor_result['data'][0]

		data = request.get_json() or {}
		patient_id = data.get('patient_id')
		medicine_name = data.get('medicine_name')
		dosage = data.get('dosage')
		start_date = data.get('start_date')
		end_date = data.get('end_date')
		frequency = data.get('frequency', 'Daily')
		times_per_day = int(data.get('times_per_day', 1))

		if not all([patient_id, medicine_name, dosage, start_date]):
			return jsonify({'success': False, 'message': 'patient_id, medicine_name, dosage, start_date are required'}), 400

		specific_times = data.get('specific_times')
		meal_times = data.get('meal_times')
		if isinstance(specific_times, str):
			try:
				specific_times = json.loads(specific_times)
			except Exception:
				specific_times = None

		times = normalize_times(specific_times=specific_times, meal_times=meal_times, times_per_day=times_per_day)

		clinic_date = data.get('clinic_date')
		if not clinic_date:
			clinic_date = next_fourth_tuesday(sl_today()).isoformat()

		med_payload = {
			'patient_id': int(patient_id),
			'doctor_id': doctor['doctor_id'],
			'medicine_name': medicine_name,
			'dosage': dosage,
			'frequency': frequency,
			'times_per_day': max(1, len(times)),
			'specific_times': times,
			'start_date': start_date,
			'end_date': end_date,
			'next_clinic_date': clinic_date,
			'is_active': True,
			'notes': data.get('notes'),
			'prescribed_at': sl_now_iso(),
		}

		ins = SupabaseClient.execute_query('patient_medications', 'insert', **med_payload)
		if not ins.get('success') or not ins.get('data'):
			return jsonify({'success': False, 'message': 'Failed to prescribe medication'}), 500
		med = ins['data'][0]

		# Reminders (next 30 days)
		try:
			start_dt = date.fromisoformat(start_date)
			end_dt = date.fromisoformat(end_date) if end_date else (start_dt + timedelta(days=30))
			max_end = min(end_dt, start_dt + timedelta(days=30))
			rows = []
			for d in daterange(start_dt, max_end):
				for t in times:
					rows.append({
						'patient_id': int(patient_id),
						'medication_id': med['medication_id'],
						'reminder_date': d.isoformat(),
						'reminder_time': t,
						'status': 'Pending',
						'reminder_sent': False,
						'created_at': sl_now_iso(),
					})
			if rows:
				SupabaseClient.execute_query('medicine_reminders', 'insert', rows=rows)
		except Exception:
			pass

		return jsonify({'success': True, 'message': 'Medication prescribed', 'data': med}), 201

	except Exception as e:
		logger.error(f"Prescribe medication error: {e}")
		return jsonify({'success': False, 'message': 'Failed to prescribe medication', 'error': str(e)}), 500

