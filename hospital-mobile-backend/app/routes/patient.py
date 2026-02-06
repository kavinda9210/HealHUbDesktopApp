import logging
from datetime import datetime, date
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import math

from app.models.medical_models import (
    AppointmentCreate, AppointmentResponse,
    MedicationResponse, MedicalReportResponse,
    BillingResponse, NearbyAmbulanceRequest
)
from app.models.user_models import PatientResponse
from app.utils.supabase_client import SupabaseClient, get_user_by_id
from app.utils.email_service import EmailService
from app.utils.time_utils import sl_today_iso, sl_now_iso

logger = logging.getLogger(__name__)

patient_bp = Blueprint('patient', __name__)

# Helper function to get patient ID from user ID
def get_patient_id(user_id: str):
    """Get patient ID from user ID"""
    result = SupabaseClient.execute_query(
        'patients',
        'select',
        filter_user_id=user_id
    )
    
    if result['success'] and result['data']:
        return result['data'][0]['patient_id']
    return None

@patient_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get patient dashboard data"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get today's appointments
        today = sl_today_iso()
        appointments_result = SupabaseClient.execute_query(
            'appointments',
            'select',
            filter_patient_id=patient_id,
            filter_appointment_date=('gte', today)
        )
        
        # Get active medications
        medications_result = SupabaseClient.execute_query(
            'patient_medications',
            'select',
            filter_patient_id=patient_id,
            filter_is_active=True
        )
        
        # Get upcoming clinics
        clinics_result = SupabaseClient.execute_query(
            'clinic_participation',
            'select',
            filter_patient_id=patient_id,
            filter_clinic_date=('gte', today),
            filter_status='Scheduled'
        )
        
        # Get recent medical reports
        reports_result = SupabaseClient.execute_query(
            'medical_reports',
            'select',
            limit=5,
            order_by='created_at',
            order_desc=True
        )
        
        # Get pending bills
        bills_result = SupabaseClient.execute_query(
            'billing',
            'select',
            filter_patient_id=patient_id,
            filter_payment_status=('neq', 'Paid')
        )
        
        dashboard_data = {
            'appointments': appointments_result.get('data', []) if appointments_result['success'] else [],
            'medications': medications_result.get('data', []) if medications_result['success'] else [],
            'clinics': clinics_result.get('data', []) if clinics_result['success'] else [],
            'reports': reports_result.get('data', []) if reports_result['success'] else [],
            'bills': bills_result.get('data', []) if bills_result['success'] else []
        }
        
        return jsonify({
            'success': True,
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        logger.error(f"Get dashboard error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard data',
            'error': str(e)
        }), 500

@patient_bp.route('/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    """Get all appointments for patient"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get query parameters
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query_params = {'filter_patient_id': patient_id}
        
        if status:
            query_params['filter_status'] = status
        
        if date_from:
            query_params['filter_appointment_date'] = ('gte', date_from)
        
        if date_to:
            # If we already have a filter, we need to handle it differently
            # For simplicity, we'll get all and filter in Python
            pass
        
        # Get appointments
        result = SupabaseClient.execute_query('appointments', 'select', **query_params)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch appointments'
            }), 500
        
        # Filter by date_to if provided
        appointments = result['data'] or []
        if date_to:
            appointments = [a for a in appointments if a['appointment_date'] <= date_to]
        
        # Sort by date (newest first)
        appointments.sort(key=lambda x: x['appointment_date'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': appointments,
            'count': len(appointments)
        }), 200
        
    except Exception as e:
        logger.error(f"Get appointments error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get appointments',
            'error': str(e)
        }), 500

@patient_bp.route('/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    """Create a new appointment"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['doctor_id', 'appointment_date', 'appointment_time']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Check if doctor exists and is available
        doctor_result = SupabaseClient.execute_query(
            'doctors',
            'select',
            filter_doctor_id=data['doctor_id']
        )
        
        if not doctor_result['success'] or not doctor_result['data']:
            return jsonify({
                'success': False,
                'message': 'Doctor not found'
            }), 404
        
        doctor = doctor_result['data'][0]
        if not doctor.get('is_available', True):
            return jsonify({
                'success': False,
                'message': 'Doctor is not available'
            }), 400
        
        # Check if time slot is available
        existing_appointments = SupabaseClient.execute_query(
            'appointments',
            'select',
            filter_doctor_id=data['doctor_id'],
            filter_appointment_date=data['appointment_date'],
            filter_appointment_time=data['appointment_time'],
            filter_status=('in', ['Scheduled', 'Confirmed'])
        )
        
        if existing_appointments['success'] and existing_appointments['data']:
            return jsonify({
                'success': False,
                'message': 'Time slot not available'
            }), 409
        
        # Create appointment
        appointment_data = {
            'patient_id': patient_id,
            'doctor_id': data['doctor_id'],
            'appointment_date': data['appointment_date'],
            'appointment_time': data['appointment_time'],
            'symptoms': data.get('symptoms'),
            'status': 'Scheduled',
            'booked_at': sl_now_iso()
        }
        
        result = SupabaseClient.execute_query('appointments', 'insert', **appointment_data)
        
        if not result['success'] or not result['data']:
            return jsonify({
                'success': False,
                'message': 'Failed to create appointment'
            }), 500
        
        appointment = result['data'][0]
        
        # Send notification to doctor
        patient_info = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_patient_id=patient_id
        )
        
        if patient_info['success'] and patient_info['data']:
            patient = patient_info['data'][0]
            
            # Get doctor's user ID
            doctor_user_result = SupabaseClient.execute_query(
                'doctors',
                'select',
                filter_doctor_id=data['doctor_id']
            )
            
            if doctor_user_result['success'] and doctor_user_result['data']:
                doctor_user = doctor_user_result['data'][0]
                
                # Create notification for doctor
                SupabaseClient.execute_query(
                    'notifications',
                    'insert',
                    user_id=doctor_user['user_id'],
                    title='New Appointment Request',
                    message=f'Patient {patient["full_name"]} has requested an appointment on {data["appointment_date"]} at {data["appointment_time"]}',
                    type='Appointment',
                    created_at=sl_now_iso()
                )
                
                # Send email to doctor
                doctor_email_result = SupabaseClient.execute_query(
                    'users',
                    'select',
                    filter_user_id=doctor_user['user_id']
                )
                
                if doctor_email_result['success'] and doctor_email_result['data']:
                    doctor_email = doctor_email_result['data'][0]['email']
                    EmailService.send_async_email(
                        to_email=doctor_email,
                        subject='New Appointment Request',
                        html_content=f'''
                        <h2>New Appointment Request</h2>
                        <p>Patient: {patient['full_name']}</p>
                        <p>Date: {data['appointment_date']}</p>
                        <p>Time: {data['appointment_time']}</p>
                        <p>Symptoms: {data.get('symptoms', 'Not specified')}</p>
                        <p>Please log in to confirm or reject this appointment.</p>
                        '''
                    )
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'data': appointment
        }), 201
        
    except Exception as e:
        logger.error(f"Create appointment error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create appointment',
            'error': str(e)
        }), 500

@patient_bp.route('/appointments/<int:appointment_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_appointment(appointment_id: int):
    """Cancel an appointment"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Check if appointment belongs to patient
        appointment_result = SupabaseClient.execute_query(
            'appointments',
            'select',
            filter_appointment_id=appointment_id,
            filter_patient_id=patient_id
        )
        
        if not appointment_result['success'] or not appointment_result['data']:
            return jsonify({
                'success': False,
                'message': 'Appointment not found or access denied'
            }), 404
        
        appointment = appointment_result['data'][0]
        
        # Check if appointment can be cancelled
        if appointment['status'] in ['Completed', 'Cancelled']:
            return jsonify({
                'success': False,
                'message': f'Appointment is already {appointment["status"]}'
            }), 400
        
        # Cancel appointment
        update_result = SupabaseClient.execute_query(
            'appointments',
            'update',
            filter_appointment_id=appointment_id,
            status='Cancelled'
        )
        
        if not update_result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to cancel appointment'
            }), 500
        
        # Notify doctor
        doctor_result = SupabaseClient.execute_query(
            'doctors',
            'select',
            filter_doctor_id=appointment['doctor_id']
        )
        
        if doctor_result['success'] and doctor_result['data']:
            doctor = doctor_result['data'][0]
            
            # Get patient info
            patient_result = SupabaseClient.execute_query(
                'patients',
                'select',
                filter_patient_id=patient_id
            )
            
            if patient_result['success'] and patient_result['data']:
                patient = patient_result['data'][0]
                
                # Create notification for doctor
                SupabaseClient.execute_query(
                    'notifications',
                    'insert',
                    user_id=doctor['user_id'],
                    title='Appointment Cancelled',
                    message=f'Patient {patient["full_name"]} has cancelled appointment on {appointment["appointment_date"]}',
                    type='Appointment',
                    created_at=sl_now_iso()
                )
        
        return jsonify({
            'success': True,
            'message': 'Appointment cancelled successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Cancel appointment error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to cancel appointment',
            'error': str(e)
        }), 500

@patient_bp.route('/medications', methods=['GET'])
@jwt_required()
def get_medications():
    """Get patient medications"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get query parameters
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        query_params = {'filter_patient_id': patient_id}
        
        if active_only:
            query_params['filter_is_active'] = True
        
        result = SupabaseClient.execute_query('patient_medications', 'select', **query_params)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch medications'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result['data'] or [],
            'count': len(result['data'] or [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get medications error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get medications',
            'error': str(e)
        }), 500

@patient_bp.route('/medicine-reminders', methods=['GET'])
@jwt_required()
def get_medicine_reminders():
    """Get today's medicine reminders"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        today = sl_today_iso()
        
        result = SupabaseClient.execute_query(
            'medicine_reminders',
            'select',
            filter_patient_id=patient_id,
            filter_reminder_date=today,
            filter_status='Pending'
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch reminders'
            }), 500
        
        # Sort by time
        reminders = result['data'] or []
        reminders.sort(key=lambda x: x['reminder_time'])
        
        return jsonify({
            'success': True,
            'data': reminders,
            'count': len(reminders)
        }), 200
        
    except Exception as e:
        logger.error(f"Get reminders error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get reminders',
            'error': str(e)
        }), 500

@patient_bp.route('/medicine-reminders/<int:reminder_id>/mark-taken', methods=['POST'])
@jwt_required()
def mark_medicine_taken(reminder_id: int):
    """Mark medicine as taken"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Update reminder status
        result = SupabaseClient.execute_query(
            'medicine_reminders',
            'update',
            filter_reminder_id=reminder_id,
            filter_patient_id=patient_id,
            status='Taken',
            taken_at=sl_now_iso()
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to update reminder'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Medicine marked as taken'
        }), 200
        
    except Exception as e:
        logger.error(f"Mark medicine taken error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update reminder',
            'error': str(e)
        }), 500

@patient_bp.route('/medical-reports', methods=['GET'])
@jwt_required()
def get_medical_reports():
    """Get patient medical reports"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get reports through appointments
        appointments_result = SupabaseClient.execute_query(
            'appointments',
            'select',
            filter_patient_id=patient_id,
            filter_status='Completed'
        )
        
        reports = []
        
        if appointments_result['success'] and appointments_result['data']:
            for appointment in appointments_result['data']:
                report_result = SupabaseClient.execute_query(
                    'medical_reports',
                    'select',
                    filter_appointment_id=appointment['appointment_id']
                )
                
                if report_result['success'] and report_result['data']:
                    for report in report_result['data']:
                        # Add appointment info to report
                        report['appointment_date'] = appointment['appointment_date']
                        report['doctor_id'] = appointment['doctor_id']
                        
                        # Get doctor info
                        doctor_result = SupabaseClient.execute_query(
                            'doctors',
                            'select',
                            filter_doctor_id=appointment['doctor_id']
                        )
                        
                        if doctor_result['success'] and doctor_result['data']:
                            report['doctor_name'] = doctor_result['data'][0]['full_name']
                            report['specialization'] = doctor_result['data'][0]['specialization']
                        
                        reports.append(report)
        
        # Sort by date (newest first)
        reports.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'data': reports,
            'count': len(reports)
        }), 200
        
    except Exception as e:
        logger.error(f"Get medical reports error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get medical reports',
            'error': str(e)
        }), 500

@patient_bp.route('/bills', methods=['GET'])
@jwt_required()
def get_bills():
    """Get patient bills"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get query parameters
        status = request.args.get('status')
        
        query_params = {'filter_patient_id': patient_id}
        
        if status:
            query_params['filter_payment_status'] = status
        
        result = SupabaseClient.execute_query('billing', 'select', **query_params)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch bills'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result['data'] or [],
            'count': len(result['data'] or [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get bills error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get bills',
            'error': str(e)
        }), 500

@patient_bp.route('/ambulances/nearby', methods=['POST'])
@jwt_required()
def get_nearby_ambulances():
    """Get nearby ambulances based on patient location"""
    try:
        current_user_id = get_jwt_identity()
        
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        location_request = NearbyAmbulanceRequest(**data)
        
        # Get all available ambulances
        ambulances_result = SupabaseClient.execute_query(
            'ambulances',
            'select',
            filter_is_available=True
        )
        
        if not ambulances_result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch ambulances'
            }), 500
        
        nearby_ambulances = []
        
        # Calculate distance for each ambulance
        for ambulance in ambulances_result['data'] or []:
            if ambulance['current_latitude'] and ambulance['current_longitude']:
                # Calculate distance using Haversine formula
                lat1, lon1 = map(math.radians, [location_request.latitude, location_request.longitude])
                lat2, lon2 = map(math.radians, [ambulance['current_latitude'], ambulance['current_longitude']])
                
                dlon = lon2 - lon1
                dlat = lat2 - lat1
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
                c = 2 * math.asin(math.sqrt(a))
                distance_km = 6371 * c  # Radius of earth in kilometers
                
                if distance_km <= location_request.radius_km:
                    ambulance['distance_km'] = round(distance_km, 2)
                    ambulance['estimated_arrival'] = round((distance_km / 40) * 60, 0)  # Assuming 40 km/h average speed
                    nearby_ambulances.append(ambulance)
        
        # Sort by distance
        nearby_ambulances.sort(key=lambda x: x['distance_km'])
        
        # Apply limit
        nearby_ambulances = nearby_ambulances[:location_request.limit]
        
        return jsonify({
            'success': True,
            'data': nearby_ambulances,
            'count': len(nearby_ambulances)
        }), 200
        
    except Exception as e:
        logger.error(f"Get nearby ambulances error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to find nearby ambulances',
            'error': str(e)
        }), 500

@patient_bp.route('/ambulances/<int:ambulance_id>/request', methods=['POST'])
@jwt_required()
def request_ambulance(ambulance_id: int):
    """Request a specific ambulance"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get patient location from request
        data = request.get_json()
        if not data or 'latitude' not in data or 'longitude' not in data:
            return jsonify({
                'success': False,
                'message': 'Patient location is required'
            }), 400
        
        # Get ambulance details
        ambulance_result = SupabaseClient.execute_query(
            'ambulances',
            'select',
            filter_ambulance_id=ambulance_id
        )
        
        if not ambulance_result['success'] or not ambulance_result['data']:
            return jsonify({
                'success': False,
                'message': 'Ambulance not found'
            }), 404
        
        ambulance = ambulance_result['data'][0]
        
        # Check if ambulance is available
        if not ambulance.get('is_available', True):
            return jsonify({
                'success': False,
                'message': 'Ambulance is not available'
            }), 400
        
        # Get patient info
        patient_result = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_patient_id=patient_id
        )
        
        if not patient_result['success'] or not patient_result['data']:
            return jsonify({
                'success': False,
                'message': 'Patient not found'
            }), 404
        
        patient = patient_result['data'][0]
        
        # Create notification for ambulance staff
        SupabaseClient.execute_query(
            'notifications',
            'insert',
            user_id=ambulance['user_id'],
            title='Ambulance Request',
            message=(
                f"Patient {patient['full_name']} ({patient['phone']}) requested an ambulance. "
                f"Location: {data['latitude']}, {data['longitude']}. "
                f"Directions: https://www.google.com/maps/dir/?api=1&destination={data['latitude']},{data['longitude']}"
            ),
            type='Ambulance',
            created_at=sl_now_iso()
        )
        
        # Send email to ambulance staff
        ambulance_user_result = SupabaseClient.execute_query(
            'users',
            'select',
            filter_user_id=ambulance['user_id']
        )
        
        if ambulance_user_result['success'] and ambulance_user_result['data']:
            ambulance_email = ambulance_user_result['data'][0]['email']
            
            EmailService.send_async_email(
                to_email=ambulance_email,
                subject='Ambulance Request - Urgent',
                html_content=f'''
                <h2>Ambulance Request</h2>
                <p><strong>Patient:</strong> {patient['full_name']}</p>
                <p><strong>Phone:</strong> {patient['phone']}</p>
                <p><strong>Emergency Contact:</strong> {patient.get('emergency_contact', 'Not provided')}</p>
                <p><strong>Patient Location:</strong></p>
                <p>Latitude: {data['latitude']}</p>
                <p>Longitude: {data['longitude']}</p>
                <p><strong>Blood Group:</strong> {patient.get('blood_group', 'Not specified')}</p>
                <p>Please proceed to the location immediately.</p>
                '''
            )
        
        return jsonify({
            'success': True,
            'message': 'Ambulance request sent successfully',
            'ambulance': {
                'driver_name': ambulance['driver_name'],
                'driver_phone': ambulance['driver_phone'],
                'ambulance_number': ambulance['ambulance_number']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Request ambulance error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to request ambulance',
            'error': str(e)
        }), 500

@patient_bp.route('/history', methods=['GET'])
@jwt_required()
def get_patient_history():
    """Get complete patient history"""
    try:
        current_user_id = get_jwt_identity()
        patient_id = get_patient_id(current_user_id)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Call Supabase function
        result = SupabaseClient.rpc('get_patient_complete_history', {
            'p_patient_id': patient_id
        })
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch history'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result['data'] or [],
            'count': len(result['data'] or [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get patient history error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get history',
            'error': str(e)
        }), 500
@patient_bp.route('/skin-analysis', methods=['POST'])
@jwt_required()
def skin_analysis():
    """Endpoint for skin disease analysis (alias to skin-disease/predict)"""
    # This redirects to the skin disease prediction endpoint
    # You can keep this for backward compatibility or remove it
    pass