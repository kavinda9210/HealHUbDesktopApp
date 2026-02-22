import json
import logging
import re
from datetime import date, datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.supabase_client import SupabaseClient, get_user_by_id
from app.utils.email_service import EmailService
from app.utils.time_utils import sl_now_iso, sl_today
from app.utils.scheduling import normalize_times, next_fourth_tuesday, daterange

logger = logging.getLogger(__name__)

doctor_bp = Blueprint('doctor', __name__)


_FREQ_EVERY_DAYS_RE = re.compile(r"^\s*every\s+(\d+)\s*day(s)?\s*$", re.IGNORECASE)


def _add_months_clamped(d: date, months: int) -> date:
    """Add months to a date, clamping the day to the last valid day of the target month."""
    # Compute target year/month
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1

    # Find last day of target month
    if m == 12:
        next_month = date(y + 1, 1, 1)
    else:
        next_month = date(y, m + 1, 1)
    last_day = (next_month - timedelta(days=1)).day

    return date(y, m, min(d.day, last_day))


def _iter_dates_by_frequency(frequency: str, start_dt: date, end_inclusive: date):
    """Yield reminder dates according to frequency within [start_dt, end_inclusive].

    Supported (best-effort, backward compatible):
    - Daily (default)
    - Weekly
    - Monthly
    - Every N days (e.g. "Every 2 days")
    - As Needed / PRN (no generated dates)
    """
    f = (frequency or "Daily").strip().lower()

    if f in {"as needed", "as_needed", "prn", "when needed"}:
        return

    if f in {"once", "one time", "one-time", "single"}:
        if start_dt <= end_inclusive:
            yield start_dt
        return

    if f in {"weekly", "week"}:
        current = start_dt
        while current <= end_inclusive:
            yield current
            current += timedelta(days=7)
        return

    if f in {"monthly", "month"}:
        current = start_dt
        while current <= end_inclusive:
            yield current
            current = _add_months_clamped(current, 1)
        return

    m = _FREQ_EVERY_DAYS_RE.match(frequency or "")
    if m:
        step = max(1, int(m.group(1)))
        current = start_dt
        while current <= end_inclusive:
            yield current
            current += timedelta(days=step)
        return

    # Default: daily
    yield from daterange(start_dt, end_inclusive)


def _require_doctor(user_id: str):
    user = get_user_by_id(user_id)
    if not user:
        return None, (jsonify({'success': False, 'message': 'User not found'}), 404)
    if user.get('role') != 'doctor':
        return None, (jsonify({'success': False, 'message': 'Doctor access required'}), 403)
    return user, None


def _get_doctor_row(user_id: str):
    result = SupabaseClient.execute_query('doctors', 'select', filter_user_id=user_id)
    if result.get('success') and result.get('data'):
        return result['data'][0]
    return None


def _get_patient_row(patient_id: int):
    result = SupabaseClient.execute_query('patients', 'select', filter_patient_id=patient_id)
    if result.get('success') and result.get('data'):
        return result['data'][0]
    return None


def _get_user_email(user_id: str):
    result = SupabaseClient.execute_query('users', 'select', filter_user_id=user_id, columns='user_id,email')
    if result.get('success') and result.get('data'):
        return result['data'][0].get('email')
    return None


def _notify(user_id: str, title: str, message: str, ntype: str):
    return SupabaseClient.execute_query(
        'notifications',
        'insert',
        user_id=user_id,
        title=title,
        message=message,
        type=ntype,
        created_at=sl_now_iso(),
    )


def _doctor_can_access_patient(doctor_id: int, patient_id: int) -> bool:
    """Doctor can access a patient if there is at least one appointment or clinic participation linking them."""
    try:
        appt = SupabaseClient.execute_query(
            'appointments',
            'select',
            columns='appointment_id',
            filter_doctor_id=doctor_id,
            filter_patient_id=patient_id,
            limit=1,
        )
        if appt.get('success') and appt.get('data'):
            return True
    except Exception:
        pass

    try:
        cl = SupabaseClient.execute_query(
            'clinic_participation',
            'select',
            columns='clinic_id',
            filter_doctor_id=doctor_id,
            filter_patient_id=patient_id,
            limit=1,
        )
        if cl.get('success') and cl.get('data'):
            return True
    except Exception:
        pass

    return False


def _require_patient_access(doctor_id: int, patient_id: int):
    if not _doctor_can_access_patient(doctor_id, patient_id):
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    return None


@doctor_bp.route('/profile', methods=['GET'])
@jwt_required()
def doctor_get_profile():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        return jsonify({'success': True, 'data': doctor}), 200
    except Exception as e:
        logger.error(f"Doctor get profile error: {e}")
        return jsonify({'success': False, 'message': 'Failed to get profile', 'error': str(e)}), 500


@doctor_bp.route('/profile', methods=['PUT'])
@jwt_required()
def doctor_update_profile():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        data = request.get_json() or {}
        allowed = {
            'full_name', 'specialization', 'qualification', 'phone', 'consultation_fee',
            'available_days', 'start_time', 'end_time', 'is_available'
        }
        update_data = {k: v for k, v in data.items() if k in allowed}
        if not update_data:
            return jsonify({'success': False, 'message': 'No updatable fields provided'}), 400

        result = SupabaseClient.execute_query('doctors', 'update', filter_doctor_id=doctor['doctor_id'], **update_data)
        if not result.get('success'):
            return jsonify({'success': False, 'message': 'Failed to update profile'}), 500

        return jsonify({'success': True, 'message': 'Profile updated'}), 200

    except Exception as e:
        logger.error(f"Doctor update profile error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update profile', 'error': str(e)}), 500


# -----------------
# Appointments
# -----------------
@doctor_bp.route('/appointments', methods=['GET'])
@jwt_required()
def doctor_list_appointments():
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        status = request.args.get('status')
        date_from = request.args.get('date_from')
        patient_id = request.args.get('patient_id')

        query = {'filter_doctor_id': doctor['doctor_id'], 'order_by': 'appointment_date', 'order_desc': False}
        if status:
            query['filter_status'] = status
        if date_from:
            query['filter_appointment_date'] = ('gte', date_from)
        if patient_id:
            try:
                query['filter_patient_id'] = int(patient_id)
            except Exception:
                return jsonify({'success': False, 'message': 'patient_id must be a number'}), 400

        result = SupabaseClient.execute_query('appointments', 'select', **query)
        if not result.get('success'):
            return jsonify({'success': False, 'message': 'Failed to fetch appointments'}), 500

        rows = result.get('data') or []
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200

    except Exception as e:
        logger.error(f"Doctor list appointments error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch appointments', 'error': str(e)}), 500


@doctor_bp.route('/appointments/<int:appointment_id>/accept', methods=['POST'])
@jwt_required()
def doctor_accept_appointment(appointment_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        appt_result = SupabaseClient.execute_query('appointments', 'select', filter_appointment_id=appointment_id)
        if not appt_result.get('success') or not appt_result.get('data'):
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        appt = appt_result['data'][0]
        if appt.get('doctor_id') != doctor['doctor_id']:
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        if appt.get('status') in ['Cancelled', 'Completed']:
            return jsonify({'success': False, 'message': f"Appointment already {appt.get('status')}"}), 400

        payload = request.get_json(silent=True) or {}
        fee_override = payload.get('consultation_fee')
        try:
            fee_override = float(fee_override) if fee_override is not None else None
        except Exception:
            return jsonify({'success': False, 'message': 'consultation_fee must be a number'}), 400

        upd = SupabaseClient.execute_query(
            'appointments',
            'update',
            filter_appointment_id=appointment_id,
            status='Confirmed',
            checked_by_doctor_at=sl_now_iso(),
        )
        if not upd.get('success'):
            return jsonify({'success': False, 'message': 'Failed to accept appointment'}), 500

        patient = _get_patient_row(appt['patient_id'])
        if patient:
            _notify(
                patient['user_id'],
                'Appointment Confirmed',
                f"Your appointment on {appt['appointment_date']} at {appt['appointment_time']} has been confirmed.",
                'Appointment'
            )

            patient_email = _get_user_email(patient['user_id'])
            if patient_email:
                EmailService.send_async_email(
                    to_email=patient_email,
                    subject='Appointment Confirmed',
                    html_content=(
                        f"<h2>Appointment Confirmed</h2>"
                        f"<p>Your appointment has been confirmed.</p>"
                        f"<ul><li>Date: {appt['appointment_date']}</li><li>Time: {appt['appointment_time']}</li>"
                        f"<li>Doctor: {doctor.get('full_name','')}</li></ul>"
                    )
                )

        # Create (or update) a bill for channeling fee
        fee = fee_override if fee_override is not None else float(doctor.get('consultation_fee') or 0.0)
        if fee < 0:
            return jsonify({'success': False, 'message': 'consultation_fee cannot be negative'}), 400

        bill_created_or_updated = False
        try:
            existing_bill = SupabaseClient.execute_query('billing', 'select', filter_appointment_id=appointment_id)
            if existing_bill.get('success') and existing_bill.get('data'):
                bill = existing_bill['data'][0]
                # If doctor provided a fee override, update pending bill amount
                if fee_override is not None and str(bill.get('payment_status')) != 'Paid':
                    SupabaseClient.execute_query(
                        'billing',
                        'update',
                        filter_bill_id=bill.get('bill_id'),
                        total_amount=fee,
                    )
                    bill_created_or_updated = True
            else:
                SupabaseClient.execute_query(
                    'billing',
                    'insert',
                    patient_id=appt['patient_id'],
                    appointment_id=appointment_id,
                    clinic_id=None,
                    total_amount=fee,
                    paid_amount=0.0,
                    payment_status='Pending',
                    bill_date=appt['appointment_date'],
                    created_at=sl_now_iso(),
                )
                bill_created_or_updated = True
        except Exception:
            bill_created_or_updated = False

        # Notify patient about billing (so they can pay)
        if patient and bill_created_or_updated:
            _notify(
                patient['user_id'],
                'Doctor Charge Added',
                f"Doctor charge added for your appointment: LKR {fee:.2f}. Please pay from the Payments/Bills section.",
                'Billing'
            )

            patient_email = _get_user_email(patient['user_id'])
            if patient_email:
                EmailService.send_async_email(
                    to_email=patient_email,
                    subject='Doctor Charge Added',
                    html_content=(
                        f"<h2>Doctor Charge Added</h2>"
                        f"<p>A doctor charge has been added for your appointment.</p>"
                        f"<ul>"
                        f"<li>Date: {appt['appointment_date']}</li>"
                        f"<li>Time: {appt['appointment_time']}</li>"
                        f"<li>Doctor: {doctor.get('full_name','')}</li>"
                        f"<li>Charge: LKR {fee:.2f}</li>"
                        f"</ul>"
                        f"<p>Please pay from your Bills/Payments section.</p>"
                    )
                )

        return jsonify({'success': True, 'message': 'Appointment accepted', 'consultation_fee': fee}), 200

    except Exception as e:
        logger.error(f"Doctor accept appointment error: {e}")
        return jsonify({'success': False, 'message': 'Failed to accept appointment', 'error': str(e)}), 500


@doctor_bp.route('/appointments/<int:appointment_id>/decline', methods=['POST'])
@jwt_required()
def doctor_decline_appointment(appointment_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        appt_result = SupabaseClient.execute_query('appointments', 'select', filter_appointment_id=appointment_id)
        if not appt_result.get('success') or not appt_result.get('data'):
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        appt = appt_result['data'][0]
        if appt.get('doctor_id') != doctor['doctor_id']:
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        upd = SupabaseClient.execute_query(
            'appointments',
            'update',
            filter_appointment_id=appointment_id,
            status='Cancelled',
            checked_by_doctor_at=sl_now_iso(),
        )
        if not upd.get('success'):
            return jsonify({'success': False, 'message': 'Failed to decline appointment'}), 500

        patient = _get_patient_row(appt['patient_id'])
        if patient:
            _notify(
                patient['user_id'],
                'Appointment Declined',
                f"Your appointment request on {appt['appointment_date']} at {appt['appointment_time']} was declined.",
                'Appointment'
            )

            patient_email = _get_user_email(patient['user_id'])
            if patient_email:
                EmailService.send_async_email(
                    to_email=patient_email,
                    subject='Appointment Declined',
                    html_content=(
                        f"<h2>Appointment Declined</h2>"
                        f"<p>Your appointment request was declined.</p>"
                        f"<ul><li>Date: {appt['appointment_date']}</li><li>Time: {appt['appointment_time']}</li>"
                        f"<li>Doctor: {doctor.get('full_name','')}</li></ul>"
                    )
                )

        return jsonify({'success': True, 'message': 'Appointment declined'}), 200

    except Exception as e:
        logger.error(f"Doctor decline appointment error: {e}")
        return jsonify({'success': False, 'message': 'Failed to decline appointment', 'error': str(e)}), 500


@doctor_bp.route('/appointments', methods=['POST'])
@jwt_required()
def doctor_create_appointment_for_patient():
    """Doctor creates (books) an appointment for a patient; auto-creates a bill using consultation_fee."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        data = request.get_json() or {}
        patient_id = data.get('patient_id')
        appointment_date = data.get('appointment_date')
        appointment_time = data.get('appointment_time')

        if not all([patient_id, appointment_date, appointment_time]):
            return jsonify({'success': False, 'message': 'patient_id, appointment_date, appointment_time are required'}), 400

        # Ensure patient exists
        patient = _get_patient_row(int(patient_id))
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        # Check slot availability
        existing = SupabaseClient.execute_query(
            'appointments',
            'select',
            filter_doctor_id=doctor['doctor_id'],
            filter_appointment_date=appointment_date,
            filter_appointment_time=appointment_time,
            filter_status=('in', ['Scheduled', 'Confirmed']),
        )
        if existing.get('success') and existing.get('data'):
            return jsonify({'success': False, 'message': 'Time slot not available'}), 409

        appt_payload = {
            'patient_id': int(patient_id),
            'doctor_id': doctor['doctor_id'],
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'status': 'Confirmed',
            'symptoms': data.get('symptoms'),
            'notes': data.get('notes'),
            'checked_by_doctor_at': sl_now_iso(),
            'booked_at': sl_now_iso(),
        }

        appt_ins = SupabaseClient.execute_query('appointments', 'insert', **appt_payload)
        if not appt_ins.get('success') or not appt_ins.get('data'):
            return jsonify({'success': False, 'message': 'Failed to create appointment'}), 500

        appt = appt_ins['data'][0]

        # Bill for consultation_fee
        fee = float(doctor.get('consultation_fee') or 0.0)
        SupabaseClient.execute_query(
            'billing',
            'insert',
            patient_id=int(patient_id),
            appointment_id=appt['appointment_id'],
            clinic_id=None,
            total_amount=fee,
            paid_amount=0.0,
            payment_status='Pending',
            bill_date=appointment_date,
            created_at=sl_now_iso(),
        )

        _notify(
            patient['user_id'],
            'Appointment Booked',
            f"An appointment was booked for {appointment_date} at {appointment_time} with Dr. {doctor.get('full_name','')}.",
            'Appointment'
        )

        patient_email = _get_user_email(patient['user_id'])
        if patient_email:
            EmailService.send_async_email(
                to_email=patient_email,
                subject='Appointment Booked',
                html_content=(
                    f"<h2>Appointment Booked</h2>"
                    f"<p>An appointment has been booked for you.</p>"
                    f"<ul><li>Date: {appointment_date}</li><li>Time: {appointment_time}</li>"
                    f"<li>Doctor: {doctor.get('full_name','')}</li></ul>"
                    f"<p>Channeling fee: {fee}</p>"
                )
            )

        return jsonify({'success': True, 'message': 'Appointment created', 'data': appt}), 201

    except Exception as e:
        logger.error(f"Doctor create appointment error: {e}")
        return jsonify({'success': False, 'message': 'Failed to create appointment', 'error': str(e)}), 500


# -----------------
# Medications + Reminders + Clinic scheduling
# -----------------
@doctor_bp.route('/patients/<int:patient_id>/medications', methods=['POST'])
@jwt_required()
def doctor_prescribe_medication(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        data = request.get_json() or {}

        medicine_name = data.get('medicine_name')
        dosage = data.get('dosage')
        frequency = data.get('frequency', 'Daily')
        times_per_day = int(data.get('times_per_day', 1))
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        notes = data.get('notes')

        if not all([medicine_name, dosage, start_date]):
            return jsonify({'success': False, 'message': 'medicine_name, dosage, start_date are required'}), 400

        specific_times = data.get('specific_times')
        meal_times = data.get('meal_times')

        # Accept specific_times either as list or JSON string
        if isinstance(specific_times, str):
            try:
                specific_times = json.loads(specific_times)
            except Exception:
                specific_times = None

        times = normalize_times(
            specific_times=specific_times,
            meal_times=meal_times,
            times_per_day=times_per_day,
        )

        # Clinic scheduling
        clinic_date = data.get('next_clinic_date') or data.get('clinic_date')
        clinic_time = data.get('clinic_time') or data.get('start_time') or '09:00'

        if not clinic_date:
            clinic_date = next_fourth_tuesday(sl_today()).isoformat()

        # Store medication
        med_payload = {
            'patient_id': patient_id,
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
            'notes': notes,
            'prescribed_at': sl_now_iso(),
        }

        med_ins = SupabaseClient.execute_query('patient_medications', 'insert', **med_payload)
        if not med_ins.get('success') or not med_ins.get('data'):
            return jsonify({'success': False, 'message': 'Failed to prescribe medication'}), 500

        medication = med_ins['data'][0]

        # Create clinic participation record (scheduled)
        try:
            SupabaseClient.execute_query(
                'clinic_participation',
                'insert',
                patient_id=patient_id,
                doctor_id=doctor['doctor_id'],
                clinic_date=clinic_date,
                start_time=clinic_time,
                end_time=None,
                status='Scheduled',
                notes='Auto scheduled from medication plan',
                created_at=sl_now_iso(),
            )
        except Exception:
            pass

        # Create reminders (up to next 30 days or end_date)
        try:
            start_dt = date.fromisoformat(start_date)
            end_dt = date.fromisoformat(end_date) if end_date else (start_dt + timedelta(days=30))
            max_end = min(end_dt, start_dt + timedelta(days=30))

            reminder_rows = []
            for d in _iter_dates_by_frequency(frequency, start_dt, max_end):
                for t in times:
                    reminder_rows.append({
                        'patient_id': patient_id,
                        'medication_id': medication['medication_id'],
                        'reminder_date': d.isoformat(),
                        'reminder_time': t,
                        'status': 'Pending',
                        'reminder_sent': False,
                        'created_at': sl_now_iso(),
                    })

            if reminder_rows:
                SupabaseClient.execute_query('medicine_reminders', 'insert', rows=reminder_rows)
        except Exception as re:
            logger.warning(f"Reminder generation failed: {re}")

        _notify(
            patient['user_id'],
            'New Medicine Added',
            f"Dr. {doctor.get('full_name','')} prescribed {medicine_name} ({dosage}). Times: {', '.join(times)}.",
            'Medicine'
        )

        _notify(
            patient['user_id'],
            'Next Clinic Scheduled',
            f"Your next clinic is scheduled on {clinic_date} at {clinic_time}.",
            'Clinic'
        )

        patient_email = _get_user_email(patient['user_id'])
        if patient_email:
            EmailService.send_async_email(
                to_email=patient_email,
                subject='New Medication Plan',
                html_content=(
                    f"<h2>New Medication Plan</h2>"
                    f"<p>Doctor: {doctor.get('full_name','')}</p>"
                    f"<p>Medicine: <b>{medicine_name}</b> ({dosage})</p>"
                    f"<p>Times: {', '.join(times)}</p>"
                    f"<p>Start: {start_date} End: {end_date or 'Open'}</p>"
                    f"<p>Next clinic: {clinic_date} {clinic_time}</p>"
                )
            )

        return jsonify({'success': True, 'message': 'Medication prescribed', 'data': medication}), 201

    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        logger.error(f"Doctor prescribe medication error: {e}")
        return jsonify({'success': False, 'message': 'Failed to prescribe medication', 'error': str(e)}), 500


# -----------------
# Reports + History
# -----------------
@doctor_bp.route('/patients/<int:patient_id>/reports', methods=['POST'])
@jwt_required()
def doctor_create_report(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        data = request.get_json() or {}
        diagnosis = data.get('diagnosis')
        prescription = data.get('prescription')
        notes = data.get('notes')
        appointment_id = data.get('appointment_id')
        clinic_id = data.get('clinic_id')

        if not diagnosis or not prescription or (not appointment_id and not clinic_id):
            return jsonify({'success': False, 'message': 'diagnosis, prescription and (appointment_id or clinic_id) are required'}), 400

        # Validate that the appointment/clinic belongs to this patient AND current doctor
        if appointment_id:
            appt = SupabaseClient.execute_query('appointments', 'select', filter_appointment_id=int(appointment_id))
            if not appt.get('success') or not appt.get('data'):
                return jsonify({'success': False, 'message': 'Appointment not found'}), 404
            a = appt['data'][0]
            if int(a.get('patient_id')) != int(patient_id) or int(a.get('doctor_id')) != int(doctor['doctor_id']):
                return jsonify({'success': False, 'message': 'Access denied'}), 403

        if clinic_id:
            cl = SupabaseClient.execute_query('clinic_participation', 'select', filter_clinic_id=int(clinic_id))
            if not cl.get('success') or not cl.get('data'):
                return jsonify({'success': False, 'message': 'Clinic participation not found'}), 404
            c = cl['data'][0]
            if int(c.get('patient_id')) != int(patient_id) or int(c.get('doctor_id')) != int(doctor['doctor_id']):
                return jsonify({'success': False, 'message': 'Access denied'}), 403

        payload = {
            'appointment_id': appointment_id,
            'clinic_id': clinic_id,
            'diagnosis': diagnosis,
            'prescription': prescription,
            'notes': notes,
            'created_by_doctor_id': doctor['doctor_id'],
            'created_at': sl_now_iso(),
        }

        ins = SupabaseClient.execute_query('medical_reports', 'insert', **payload)
        if not ins.get('success') or not ins.get('data'):
            return jsonify({'success': False, 'message': 'Failed to create report'}), 500

        report = ins['data'][0]

        # Add patient-doctor history
        try:
            encounter_type = 'Appointment' if appointment_id else 'Clinic'
            encounter_date = None
            encounter_time = None
            if appointment_id:
                appt = SupabaseClient.execute_query('appointments', 'select', filter_appointment_id=appointment_id)
                if appt.get('success') and appt.get('data'):
                    encounter_date = appt['data'][0].get('appointment_date')
                    encounter_time = appt['data'][0].get('appointment_time')
            if clinic_id and not encounter_date:
                cl = SupabaseClient.execute_query('clinic_participation', 'select', filter_clinic_id=clinic_id)
                if cl.get('success') and cl.get('data'):
                    encounter_date = cl['data'][0].get('clinic_date')
                    encounter_time = cl['data'][0].get('start_time')

            if encounter_date:
                SupabaseClient.execute_query(
                    'patient_doctor_history',
                    'insert',
                    patient_id=patient_id,
                    doctor_id=doctor['doctor_id'],
                    encounter_type=encounter_type,
                    encounter_date=encounter_date,
                    encounter_time=encounter_time,
                    notes=notes,
                    recorded_at=sl_now_iso(),
                )
        except Exception:
            pass

        _notify(
            patient['user_id'],
            'New Medical Report',
            f"A new medical report was added by Dr. {doctor.get('full_name','')}.",
            'Report'
        )

        patient_email = _get_user_email(patient['user_id'])
        if patient_email:
            EmailService.send_async_email(
                to_email=patient_email,
                subject='New Medical Report',
                html_content=(
                    f"<h2>New Medical Report</h2>"
                    f"<p>Doctor: {doctor.get('full_name','')}</p>"
                    f"<p><b>Diagnosis:</b> {diagnosis}</p>"
                    f"<p><b>Prescription:</b> {prescription}</p>"
                    f"<p>Notes: {notes or ''}</p>"
                )
            )

        return jsonify({'success': True, 'message': 'Report created', 'data': report}), 201

    except Exception as e:
        logger.error(f"Doctor create report error: {e}")
        return jsonify({'success': False, 'message': 'Failed to create report', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/history', methods=['GET'])
@jwt_required()
def doctor_get_patient_history(patient_id: int):
    """Return prior appointments/clinics, reports and medications for a patient."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        # Ensure patient exists
        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        limit = int(request.args.get('limit', 50))

        appts = SupabaseClient.execute_query(
            'appointments',
            'select',
            filter_patient_id=patient_id,
            limit=limit,
            order_by='appointment_date',
            order_desc=True,
        )
        clinics = SupabaseClient.execute_query(
            'clinic_participation',
            'select',
            filter_patient_id=patient_id,
            limit=limit,
            order_by='clinic_date',
            order_desc=True,
        )
        meds = SupabaseClient.execute_query(
            'patient_medications',
            'select',
            filter_patient_id=patient_id,
            limit=limit,
            order_by='prescribed_at',
            order_desc=True,
        )

        reports = SupabaseClient.execute_query(
            'medical_reports',
            'select',
            limit=limit,
            order_by='created_at',
            order_desc=True,
        )

        return jsonify({
            'success': True,
            'data': {
                'patient': patient,
                'appointments': appts.get('data') or [],
                'clinics': clinics.get('data') or [],
                'medications': meds.get('data') or [],
                'reports': reports.get('data') or [],
            }
        }), 200

    except Exception as e:
        logger.error(f"Doctor patient history error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch history', 'error': str(e)}), 500


# -----------------
# Doctor Dashboard: Patients + Tabs
# -----------------
@doctor_bp.route('/patients', methods=['GET'])
@jwt_required()
def doctor_list_patients():
    """List patients with pagination, sorting, and filters (name/phone search, chronic, today's appointments)."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        q = (request.args.get('q') or '').strip()
        chronic_only = (request.args.get('chronic_only') or '').lower() in ('1', 'true', 'yes')
        today_only = (request.args.get('today_appointments') or '').lower() in ('1', 'true', 'yes')

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 20))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        sort_by = (request.args.get('sort_by') or 'created_at').strip()
        sort_dir = (request.args.get('sort_dir') or 'desc').strip().lower()
        sort_desc = sort_dir != 'asc'
        allowed_sort = {
            'created_at',
            'full_name',
            'dob',
            'gender',
            'phone',
            'blood_group',
            'has_chronic_condition',
        }
        if sort_by not in allowed_sort:
            sort_by = 'created_at'

        client = SupabaseClient.get_client()
        query = client.table('patients').select(
            'patient_id,user_id,full_name,dob,gender,phone,address,blood_group,emergency_contact,has_chronic_condition,created_at',
            count='exact',
        )

        if chronic_only:
            query = query.eq('has_chronic_condition', True)

        if today_only:
            today = sl_today().isoformat()
            appts = SupabaseClient.execute_query(
                'appointments',
                'select',
                columns='patient_id',
                filter_doctor_id=doctor['doctor_id'],
                filter_appointment_date=today,
                filter_status=('in', ['Scheduled', 'Confirmed']),
                limit=1000,
            )
            patient_ids = sorted({int(r['patient_id']) for r in (appts.get('data') or []) if r.get('patient_id') is not None})
            if not patient_ids:
                return jsonify({'success': True, 'data': [], 'count': 0, 'page': page, 'page_size': page_size}), 200
            query = query.in_('patient_id', patient_ids)

        if q:
            # PostgREST OR filter: https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering-rows
            like = f"%{q}%"
            query = query.or_(f"full_name.ilike.{like},phone.ilike.{like}")

        query = query.order(sort_by, desc=sort_desc)
        query = query.range(offset, offset + page_size - 1)
        res = query.execute()

        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0

        return jsonify({
            'success': True,
            'data': res.data or [],
            'count': count,
            'page': page,
            'page_size': page_size,
        }), 200

    except Exception as e:
        logger.error(f"Doctor list patients error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch patients', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/overview', methods=['GET'])
@jwt_required()
def doctor_get_patient_overview(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        today = sl_today().isoformat()
        upcoming = SupabaseClient.execute_query(
            'clinic_participation',
            'select',
            filter_patient_id=patient_id,
            filter_clinic_date=('gte', today),
            order_by='clinic_date',
            order_desc=False,
            limit=100,
        )

        return jsonify({
            'success': True,
            'data': {
                'patient': patient,
                'upcoming_clinics': upcoming.get('data') or [],
            }
        }), 200

    except Exception as e:
        logger.error(f"Doctor patient overview error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch patient overview', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/blood-group', methods=['PUT'])
@jwt_required()
def doctor_update_patient_blood_group(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        data = request.get_json() or {}
        raw = data.get('blood_group', None)

        if raw is None:
            blood_group = None
        else:
            s = str(raw).strip().upper()
            blood_group = s or None

        if blood_group is not None and not re.match(r'^(A|B|AB|O)[+-]$', blood_group):
            return jsonify({'success': False, 'message': 'Invalid blood group (expected A+, A-, B+, B-, AB+, AB-, O+, O-)'}), 400

        upd = SupabaseClient.execute_query('patients', 'update', filter_patient_id=patient_id, blood_group=blood_group)
        if not upd.get('success'):
            return jsonify({'success': False, 'message': 'Failed to update blood group'}), 500

        updated_row = None
        if upd.get('data'):
            updated_row = upd['data'][0]

        return jsonify({'success': True, 'message': 'Blood group updated', 'data': updated_row}), 200

    except Exception as e:
        logger.error(f"Doctor update blood group error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update blood group', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/clinic-participation', methods=['GET'])
@jwt_required()
def doctor_list_clinic_participation(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        doctor_only = (request.args.get('doctor_only') or '').lower() in ('1', 'true', 'yes')
        date_eq = (request.args.get('date') or '').strip()
        date_from = (request.args.get('from') or '').strip()
        date_to = (request.args.get('to') or '').strip()

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 25))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        filters = []
        if date_from:
            filters.append(('clinic_date', 'gte', date_from))
        if date_to:
            filters.append(('clinic_date', 'lte', date_to))

        client = SupabaseClient.get_client()
        q = client.table('clinic_participation').select('*', count='exact').eq('patient_id', patient_id)
        if doctor_only:
            q = q.eq('doctor_id', doctor['doctor_id'])
        if date_eq:
            q = q.eq('clinic_date', date_eq)
        for (col, op, val) in filters:
            q = q.filter(col, op, val)
        q = q.order('clinic_date', desc=True).order('start_time', desc=True)
        q = q.range(offset, offset + page_size - 1)

        res = q.execute()
        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0

        return jsonify({'success': True, 'data': res.data or [], 'count': count, 'page': page, 'page_size': page_size}), 200

    except Exception as e:
        logger.error(f"Doctor list clinic participation error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch clinic participation', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/clinic-participation', methods=['POST'])
@jwt_required()
def doctor_create_clinic_participation(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        data = request.get_json() or {}
        clinic_date = data.get('clinic_date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        status = data.get('status', 'Scheduled')
        notes = data.get('notes')

        if not clinic_date or not start_time:
            return jsonify({'success': False, 'message': 'clinic_date and start_time are required'}), 400

        payload = {
            'patient_id': patient_id,
            'doctor_id': doctor['doctor_id'],
            'clinic_date': clinic_date,
            'start_time': start_time,
            'end_time': end_time,
            'status': status,
            'notes': notes,
            'created_at': sl_now_iso(),
        }
        ins = SupabaseClient.execute_query('clinic_participation', 'insert', **payload)
        if not ins.get('success') or not ins.get('data'):
            return jsonify({'success': False, 'message': 'Failed to create clinic participation'}), 500

        row = ins['data'][0]

        _notify(
            patient['user_id'],
            'Clinic Scheduled',
            f"A clinic visit was scheduled on {clinic_date} at {start_time}.",
            'Clinic'
        )

        return jsonify({'success': True, 'message': 'Clinic participation created', 'data': row}), 201

    except Exception as e:
        logger.error(f"Doctor create clinic participation error: {e}")
        return jsonify({'success': False, 'message': 'Failed to create clinic participation', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/clinic-participation/<int:clinic_id>', methods=['PUT'])
@jwt_required()
def doctor_update_clinic_participation(patient_id: int, clinic_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        data = request.get_json() or {}
        status = (data.get('status') or '').strip()
        notes = data.get('notes', None)

        allowed_status = {'Scheduled', 'Confirmed', 'Completed', 'No-show', 'Cancelled'}
        if status and status not in allowed_status:
            return jsonify({'success': False, 'message': f"Invalid status. Allowed: {', '.join(sorted(allowed_status))}"}), 400

        update_data = {}
        if status:
            update_data['status'] = status
        if 'notes' in data:
            update_data['notes'] = notes

        if not update_data:
            return jsonify({'success': False, 'message': 'No updatable fields provided'}), 400

        client = SupabaseClient.get_client()

        # Ensure this clinic participation belongs to this patient and current doctor.
        existing = client.table('clinic_participation').select('clinic_id,patient_id,doctor_id,status').eq('clinic_id', clinic_id).eq('patient_id', patient_id).execute()
        if not existing.data:
            return jsonify({'success': False, 'message': 'Clinic participation not found'}), 404

        row = existing.data[0]
        if int(row.get('doctor_id') or 0) != int(doctor['doctor_id']):
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        res = client.table('clinic_participation').update(update_data).eq('clinic_id', clinic_id).eq('patient_id', patient_id).eq('doctor_id', doctor['doctor_id']).execute()
        if not res.data:
            return jsonify({'success': False, 'message': 'Failed to update clinic participation'}), 500

        return jsonify({'success': True, 'message': 'Clinic participation updated', 'data': res.data[0]}), 200

    except Exception as e:
        logger.error(f"Doctor update clinic participation error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update clinic participation', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/medications', methods=['GET'])
@jwt_required()
def doctor_list_patient_medications(patient_id: int):
    """List medications for patient, including prescriber info."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 25))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        client = SupabaseClient.get_client()
        q = client.table('patient_medications').select(
            'medication_id,patient_id,doctor_id,medicine_name,dosage,frequency,times_per_day,specific_times,start_date,end_date,next_clinic_date,is_active,notes,prescribed_at,doctors(full_name,specialization)',
            count='exact',
        ).eq('patient_id', patient_id).order('prescribed_at', desc=True).range(offset, offset + page_size - 1)

        res = q.execute()
        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0

        return jsonify({'success': True, 'data': res.data or [], 'count': count, 'page': page, 'page_size': page_size}), 200

    except Exception as e:
        logger.error(f"Doctor list medications error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch medications', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/medicine-reminders', methods=['GET'])
@jwt_required()
def doctor_list_medicine_reminders(patient_id: int):
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        date_from = (request.args.get('from') or '').strip()
        date_to = (request.args.get('to') or '').strip()
        status = (request.args.get('status') or '').strip()

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 25))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        client = SupabaseClient.get_client()
        q = client.table('medicine_reminders').select('*', count='exact').eq('patient_id', patient_id)
        if status:
            q = q.eq('status', status)
        if date_from:
            q = q.filter('reminder_date', 'gte', date_from)
        if date_to:
            q = q.filter('reminder_date', 'lte', date_to)
        q = q.order('reminder_date', desc=True).order('reminder_time', desc=True).range(offset, offset + page_size - 1)
        res = q.execute()
        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0
        return jsonify({'success': True, 'data': res.data or [], 'count': count, 'page': page, 'page_size': page_size}), 200

    except Exception as e:
        logger.error(f"Doctor list medicine reminders error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch medicine reminders', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/reports', methods=['GET'])
@jwt_required()
def doctor_list_reports(patient_id: int):
    """List medical reports for a patient (joined with creating doctor)."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 25))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        # Collect report_ids via appointment/clinic for this patient
        client = SupabaseClient.get_client()
        q = client.table('medical_reports').select(
            'report_id,appointment_id,clinic_id,diagnosis,prescription,notes,created_by_doctor_id,created_at,doctors!medical_reports_created_by_doctor_id_fkey(full_name,specialization)',
            count='exact',
        )

        # Filter by appointment/clinic belonging to patient (server side: join isn't easy); we filter in two steps.
        # Approach: get appointment_ids and clinic_ids for patient, then filter reports by those.
        appts = SupabaseClient.execute_query('appointments', 'select', columns='appointment_id', filter_patient_id=patient_id, limit=1000)
        clinics = SupabaseClient.execute_query('clinic_participation', 'select', columns='clinic_id', filter_patient_id=patient_id, limit=1000)
        appt_ids = [r['appointment_id'] for r in (appts.get('data') or []) if r.get('appointment_id') is not None]
        clinic_ids = [r['clinic_id'] for r in (clinics.get('data') or []) if r.get('clinic_id') is not None]

        if not appt_ids and not clinic_ids:
            return jsonify({'success': True, 'data': [], 'count': 0, 'page': page, 'page_size': page_size}), 200

        # Use OR over appointment_id/clinic_id
        or_parts = []
        if appt_ids:
            # PostgREST in list: appointment_id=in.(1,2,3)
            or_parts.append('appointment_id=in.(' + ','.join([str(int(x)) for x in appt_ids]) + ')')
        if clinic_ids:
            or_parts.append('clinic_id=in.(' + ','.join([str(int(x)) for x in clinic_ids]) + ')')
        q = q.or_(','.join(or_parts))
        q = q.order('created_at', desc=True).range(offset, offset + page_size - 1)
        res = q.execute()

        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0

        return jsonify({'success': True, 'data': res.data or [], 'count': count, 'page': page, 'page_size': page_size}), 200

    except Exception as e:
        logger.error(f"Doctor list reports error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch reports', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/prescription-records', methods=['GET'])
@jwt_required()
def doctor_list_prescription_records(patient_id: int):
    """List prescription history for a patient (joined with prescribing doctor)."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 25))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        appts = SupabaseClient.execute_query('appointments', 'select', columns='appointment_id', filter_patient_id=patient_id, limit=1000)
        clinics = SupabaseClient.execute_query('clinic_participation', 'select', columns='clinic_id', filter_patient_id=patient_id, limit=1000)
        appt_ids = [r['appointment_id'] for r in (appts.get('data') or []) if r.get('appointment_id') is not None]
        clinic_ids = [r['clinic_id'] for r in (clinics.get('data') or []) if r.get('clinic_id') is not None]

        if not appt_ids and not clinic_ids:
            return jsonify({'success': True, 'data': [], 'count': 0, 'page': page, 'page_size': page_size}), 200

        client = SupabaseClient.get_client()
        q = client.table('prescription_records').select(
            'prescription_id,appointment_id,clinic_id,prescription_text,prescribed_by_doctor_id,created_at,doctors!prescription_records_prescribed_by_doctor_id_fkey(full_name,specialization)',
            count='exact',
        )

        or_parts = []
        if appt_ids:
            or_parts.append('appointment_id=in.(' + ','.join([str(int(x)) for x in appt_ids]) + ')')
        if clinic_ids:
            or_parts.append('clinic_id=in.(' + ','.join([str(int(x)) for x in clinic_ids]) + ')')
        q = q.or_(','.join(or_parts))
        q = q.order('created_at', desc=True).range(offset, offset + page_size - 1)
        res = q.execute()

        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0

        return jsonify({'success': True, 'data': res.data or [], 'count': count, 'page': page, 'page_size': page_size}), 200

    except Exception as e:
        logger.error(f"Doctor list prescription records error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch prescription records', 'error': str(e)}), 500


@doctor_bp.route('/patients/<int:patient_id>/doctor-history', methods=['GET'])
@jwt_required()
def doctor_list_doctor_history(patient_id: int):
    """List all encounters for a patient with doctor join."""
    try:
        current_user_id = get_jwt_identity()
        _, err = _require_doctor(current_user_id)
        if err:
            return err

        doctor = _get_doctor_row(current_user_id)
        if not doctor:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 404

        patient = _get_patient_row(patient_id)
        if not patient:
            return jsonify({'success': False, 'message': 'Patient not found'}), 404

        page = max(1, int(request.args.get('page', 1)))
        page_size = int(request.args.get('page_size', 25))
        page_size = min(max(5, page_size), 100)
        offset = (page - 1) * page_size

        client = SupabaseClient.get_client()
        q = client.table('patient_doctor_history').select(
            'history_id,patient_id,doctor_id,encounter_type,encounter_date,encounter_time,notes,recorded_at,doctors(full_name,specialization)',
            count='exact',
        ).eq('patient_id', patient_id)
        q = q.order('encounter_date', desc=True).order('encounter_time', desc=True).range(offset, offset + page_size - 1)
        res = q.execute()

        count = getattr(res, 'count', None)
        if count is None:
            count = len(res.data) if res.data else 0

        return jsonify({'success': True, 'data': res.data or [], 'count': count, 'page': page, 'page_size': page_size}), 200

    except Exception as e:
        logger.error(f"Doctor list doctor history error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch doctor history', 'error': str(e)}), 500
