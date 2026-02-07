import logging
import re
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.user_models import (
    AmbulanceCreate, AmbulanceLocation, AmbulanceResponse
)
from app.utils.supabase_client import SupabaseClient, get_user_by_id
from app.utils.email_service import EmailService
from app.utils.time_utils import sl_now_iso

logger = logging.getLogger(__name__)

ambulance_bp = Blueprint('ambulance', __name__)

# Helper function to get ambulance ID from user ID
def get_ambulance_id(user_id: str):
    """Get ambulance ID from user ID"""
    result = SupabaseClient.execute_query(
        'ambulances',
        'select',
        filter_user_id=user_id
    )
    
    if result['success'] and result['data']:
        return result['data'][0]['ambulance_id']
    return None

@ambulance_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get ambulance staff dashboard"""
    try:
        current_user_id = get_jwt_identity()
        ambulance_id = get_ambulance_id(current_user_id)
        
        if not ambulance_id:
            return jsonify({
                'success': False,
                'message': 'Ambulance profile not found'
            }), 404
        
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
        
        # Get recent notifications
        notifications_result = SupabaseClient.execute_query(
            'notifications',
            'select',
            filter_user_id=current_user_id,
            limit=10,
            order_by='created_at',
            order_desc=True
        )
        
        # Get recent requests (notifications of type 'Ambulance')
        requests_result = SupabaseClient.execute_query(
            'notifications',
            'select',
            filter_user_id=current_user_id,
            filter_type='Ambulance',
            filter_is_read=False,
            order_by='created_at',
            order_desc=True
        )
        
        dashboard_data = {
            'ambulance': ambulance,
            'notifications': notifications_result.get('data', []) if notifications_result['success'] else [],
            'requests': requests_result.get('data', []) if requests_result['success'] else []
        }
        
        return jsonify({
            'success': True,
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        logger.error(f"Get ambulance dashboard error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get dashboard',
            'error': str(e)
        }), 500

@ambulance_bp.route('/update-location', methods=['POST'])
@jwt_required()
def update_location():
    """Update ambulance location and availability"""
    try:
        current_user_id = get_jwt_identity()
        ambulance_id = get_ambulance_id(current_user_id)
        
        if not ambulance_id:
            return jsonify({
                'success': False,
                'message': 'Ambulance profile not found'
            }), 404
        
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        if 'latitude' not in data or 'longitude' not in data:
            return jsonify({
                'success': False,
                'message': 'Latitude and longitude are required'
            }), 400
        
        # Update location
        update_data = {
            'current_latitude': data['latitude'],
            'current_longitude': data['longitude'],
            'last_updated': sl_now_iso()
        }
        
        # Update availability if provided
        if 'is_available' in data:
            # Convert string to boolean if needed
            if isinstance(data['is_available'], str):
                update_data['is_available'] = data['is_available'].lower() in ['true', '1', 'yes']
            else:
                update_data['is_available'] = bool(data['is_available'])
        
        result = SupabaseClient.execute_query(
            'ambulances',
            'update',
            filter_ambulance_id=ambulance_id,
            **update_data
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to update location'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Location updated successfully',
            'data': update_data
        }), 200
        
    except Exception as e:
        logger.error(f"Update location error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update location',
            'error': str(e)
        }), 500

@ambulance_bp.route('/availability', methods=['POST'])
@jwt_required()
def update_availability():
    """Update ambulance availability status"""
    try:
        current_user_id = get_jwt_identity()
        ambulance_id = get_ambulance_id(current_user_id)
        
        if not ambulance_id:
            return jsonify({
                'success': False,
                'message': 'Ambulance profile not found'
            }), 404
        
        # Parse request data
        data = request.get_json()
        if not data or 'is_available' not in data:
            return jsonify({
                'success': False,
                'message': 'Availability status is required'
            }), 400
        
        # Convert string to boolean if needed
        if isinstance(data['is_available'], str):
            is_available = data['is_available'].lower() in ['true', '1', 'yes']
        else:
            is_available = bool(data['is_available'])
        
        # Update availability
        result = SupabaseClient.execute_query(
            'ambulances',
            'update',
            filter_ambulance_id=ambulance_id,
            is_available=is_available,
            last_updated=sl_now_iso()
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to update availability'
            }), 500

        cleared = 0
        if is_available:
            # Remove previous ambulance requests from DB for this ambulance user
            clear_result = SupabaseClient.execute_query(
                'notifications',
                'delete',
                filter_user_id=current_user_id,
                filter_type='Ambulance'
            )
            if clear_result.get('success'):
                cleared = int(clear_result.get('count') or 0)
        
        status_text = "available" if is_available else "unavailable"
        
        return jsonify({
            'success': True,
            'message': f'Ambulance marked as {status_text}',
            'is_available': is_available,
            'cleared_requests': cleared
        }), 200
        
    except Exception as e:
        logger.error(f"Update availability error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update availability',
            'error': str(e)
        }), 500

@ambulance_bp.route('/current-status', methods=['GET'])
@jwt_required()
def get_current_status():
    """Get current ambulance status"""
    try:
        current_user_id = get_jwt_identity()
        ambulance_id = get_ambulance_id(current_user_id)
        
        if not ambulance_id:
            return jsonify({
                'success': False,
                'message': 'Ambulance profile not found'
            }), 404
        
        # Get ambulance details
        result = SupabaseClient.execute_query(
            'ambulances',
            'select',
            filter_ambulance_id=ambulance_id
        )
        
        if not result['success'] or not result['data']:
            return jsonify({
                'success': False,
                'message': 'Ambulance not found'
            }), 404
        
        ambulance = result['data'][0]
        
        status_data = {
            'ambulance_id': ambulance['ambulance_id'],
            'ambulance_number': ambulance['ambulance_number'],
            'driver_name': ambulance['driver_name'],
            'driver_phone': ambulance['driver_phone'],
            'current_latitude': ambulance['current_latitude'],
            'current_longitude': ambulance['current_longitude'],
            'is_available': ambulance['is_available'],
            'last_updated': ambulance['last_updated']
        }
        
        return jsonify({
            'success': True,
            'data': status_data
        }), 200
        
    except Exception as e:
        logger.error(f"Get current status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get status',
            'error': str(e)
        }), 500

@ambulance_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_requests():
    """Get ambulance requests (notifications)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        is_read = request.args.get('is_read')
        limit = int(request.args.get('limit', 20))
        
        query_params = {
            'filter_user_id': current_user_id,
            'filter_type': 'Ambulance',
            'limit': limit,
            'order_by': 'created_at',
            'order_desc': True
        }
        
        if is_read is not None:
            # Convert string to boolean
            if isinstance(is_read, str):
                query_params['filter_is_read'] = is_read.lower() in ['true', '1', 'yes']
            else:
                query_params['filter_is_read'] = bool(is_read)
        
        result = SupabaseClient.execute_query('notifications', 'select', **query_params)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch requests'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result['data'] or [],
            'count': len(result['data'] or [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get requests error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get requests',
            'error': str(e)
        }), 500

@ambulance_bp.route('/requests/<int:notification_id>/accept', methods=['POST'])
@jwt_required()
def accept_request(notification_id: int):
    """Accept an ambulance request"""
    try:
        current_user_id = get_jwt_identity()
        ambulance_id = get_ambulance_id(current_user_id)
        
        if not ambulance_id:
            return jsonify({
                'success': False,
                'message': 'Ambulance profile not found'
            }), 404
        
        # Get notification
        notification_result = SupabaseClient.execute_query(
            'notifications',
            'select',
            filter_notification_id=notification_id,
            filter_user_id=current_user_id,
            filter_type='Ambulance'
        )
        
        if not notification_result['success'] or not notification_result['data']:
            return jsonify({
                'success': False,
                'message': 'Request not found'
            }), 404
        
        notification = notification_result['data'][0]

        # Remove request notification from DB once handled
        SupabaseClient.execute_query(
            'notifications',
            'delete',
            filter_notification_id=notification_id,
            filter_user_id=current_user_id,
            filter_type='Ambulance'
        )
        
        # Update ambulance as unavailable when accepting request
        SupabaseClient.execute_query(
            'ambulances',
            'update',
            filter_ambulance_id=ambulance_id,
            is_available=False,
            last_updated=sl_now_iso()
        )
        
        # Notify patient (if metadata exists in the message)
        message = notification.get('message') or ''

        def extract_meta(key: str):
            m = re.search(rf"{re.escape(key)}=([^\s]+)", message)
            return m.group(1) if m else None

        patient_user_id = extract_meta('meta_patient_user_id')
        patient_lat = extract_meta('meta_patient_lat')
        patient_lng = extract_meta('meta_patient_lng')

        ambulance_result = SupabaseClient.execute_query(
            'ambulances',
            'select',
            filter_ambulance_id=ambulance_id
        )
        ambulance = (ambulance_result.get('data') or [{}])[0]

        if patient_user_id:
            directions = ''
            if patient_lat and patient_lng:
                directions = f"Directions: https://www.google.com/maps/dir/?api=1&destination={patient_lat},{patient_lng}"

            SupabaseClient.execute_query(
                'notifications',
                'insert',
                user_id=patient_user_id,
                title='Ambulance Request Accepted',
                message=(
                    f"Ambulance {ambulance.get('ambulance_number', ambulance_id)} accepted your request and is on the way. "
                    f"Driver: {ambulance.get('driver_name', '')} {ambulance.get('driver_phone', '')}. "
                    f"{directions}"
                ).strip(),
                type='Ambulance',
                created_at=sl_now_iso()
            )

        logger.info(f"Ambulance {ambulance_id} accepted request: {message}")
        
        return jsonify({
            'success': True,
            'message': 'Request accepted. Ambulance is now en route.',
            'notification': {
                'id': notification['notification_id'],
                'title': notification['title'],
                'message': notification['message'],
                'accepted_at': sl_now_iso()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Accept request error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to accept request',
            'error': str(e)
        }), 500

@ambulance_bp.route('/requests/<int:notification_id>/reject', methods=['POST'])
@jwt_required()
def reject_request(notification_id: int):
    """Reject an ambulance request"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get notification
        notification_result = SupabaseClient.execute_query(
            'notifications',
            'select',
            filter_notification_id=notification_id,
            filter_user_id=current_user_id,
            filter_type='Ambulance'
        )
        
        if not notification_result['success'] or not notification_result['data']:
            return jsonify({
                'success': False,
                'message': 'Request not found'
            }), 404

        # Remove request notification from DB once handled
        SupabaseClient.execute_query(
            'notifications',
            'delete',
            filter_notification_id=notification_id,
            filter_user_id=current_user_id,
            filter_type='Ambulance'
        )

        # Notify patient (if metadata exists)
        message = (notification_result['data'][0].get('message') or '') if notification_result.get('data') else ''

        def extract_meta(key: str):
            m = re.search(rf"{re.escape(key)}=([^\s]+)", message)
            return m.group(1) if m else None

        patient_user_id = extract_meta('meta_patient_user_id')

        if patient_user_id:
            SupabaseClient.execute_query(
                'notifications',
                'insert',
                user_id=patient_user_id,
                title='Ambulance Request Rejected',
                message='Your ambulance request was rejected. Please try another ambulance.',
                type='Ambulance',
                created_at=sl_now_iso()
            )
        
        return jsonify({
            'success': True,
            'message': 'Request rejected'
        }), 200
        
    except Exception as e:
        logger.error(f"Reject request error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to reject request',
            'error': str(e)
        }), 500

@ambulance_bp.route('/complete-mission', methods=['POST'])
@jwt_required()
def complete_mission():
    """Mark current mission as complete and make ambulance available again"""
    try:
        current_user_id = get_jwt_identity()
        ambulance_id = get_ambulance_id(current_user_id)
        
        if not ambulance_id:
            return jsonify({
                'success': False,
                'message': 'Ambulance profile not found'
            }), 404
        
        # Update ambulance as available
        result = SupabaseClient.execute_query(
            'ambulances',
            'update',
            filter_ambulance_id=ambulance_id,
            is_available=True,
            last_updated=sl_now_iso()
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to update status'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Mission completed. Ambulance is now available.',
            'is_available': True
        }), 200
        
    except Exception as e:
        logger.error(f"Complete mission error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to complete mission',
            'error': str(e)
        }), 500

@ambulance_bp.route('/register-ambulance', methods=['POST'])
@jwt_required()
def register_ambulance():
    """Register ambulance details (for new ambulance staff)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if ambulance already registered
        existing_ambulance = SupabaseClient.execute_query(
            'ambulances',
            'select',
            filter_user_id=current_user_id
        )
        
        if existing_ambulance['success'] and existing_ambulance['data']:
            return jsonify({
                'success': False,
                'message': 'Ambulance already registered for this account'
            }), 400
        
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['ambulance_number', 'driver_name', 'driver_phone']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Check if ambulance number is unique
        ambulance_check = SupabaseClient.execute_query(
            'ambulances',
            'select',
            filter_ambulance_number=data['ambulance_number']
        )
        
        if ambulance_check['success'] and ambulance_check['data']:
            return jsonify({
                'success': False,
                'message': 'Ambulance number already registered'
            }), 409
        
        # Create ambulance record
        ambulance_data = {
            'user_id': current_user_id,
            'ambulance_number': data['ambulance_number'],
            'driver_name': data['driver_name'],
            'driver_phone': data['driver_phone'],
            'is_available': True,
            'created_at': sl_now_iso()
        }
        
        # Add location if provided
        if 'latitude' in data and 'longitude' in data:
            ambulance_data['current_latitude'] = data['latitude']
            ambulance_data['current_longitude'] = data['longitude']
            ambulance_data['last_updated'] = sl_now_iso()
        
        result = SupabaseClient.execute_query('ambulances', 'insert', **ambulance_data)
        
        if not result['success'] or not result['data']:
            return jsonify({
                'success': False,
                'message': 'Failed to register ambulance'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Ambulance registered successfully',
            'data': result['data'][0]
        }), 201
        
    except Exception as e:
        logger.error(f"Register ambulance error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to register ambulance',
            'error': str(e)
        }), 500

@ambulance_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get all notifications for ambulance staff"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        is_read = request.args.get('is_read')
        limit = int(request.args.get('limit', 50))
        
        query_params = {
            'filter_user_id': current_user_id,
            'limit': limit,
            'order_by': 'created_at',
            'order_desc': True
        }
        
        if is_read is not None:
            # Convert string to boolean
            if isinstance(is_read, str):
                query_params['filter_is_read'] = is_read.lower() in ['true', '1', 'yes']
            else:
                query_params['filter_is_read'] = bool(is_read)
        
        result = SupabaseClient.execute_query('notifications', 'select', **query_params)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch notifications'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result['data'] or [],
            'count': len(result['data'] or [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get notifications',
            'error': str(e)
        }), 500

@ambulance_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id: int):
    """Mark notification as read"""
    try:
        current_user_id = get_jwt_identity()
        
        # Update notification
        result = SupabaseClient.execute_query(
            'notifications',
            'update',
            filter_notification_id=notification_id,
            filter_user_id=current_user_id,
            is_read=True
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to update notification'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        logger.error(f"Mark notification read error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update notification',
            'error': str(e)
        }), 500

@ambulance_bp.route('/emergency-contacts', methods=['GET'])
@jwt_required()
def get_emergency_contacts():
    """Get emergency contact information"""
    try:
        # These could be hospital contacts, emergency services, etc.
        # For now, return a static list
        emergency_contacts = [
            {
                'name': 'National Emergency Service',
                'phone': '1990',
                'type': 'Emergency'
            },
            {
                'name': 'Police Emergency',
                'phone': '119',
                'type': 'Police'
            },
            {
                'name': 'Ambulance Service',
                'phone': '110',
                'type': 'Ambulance'
            },
            {
                'name': 'Fire Department',
                'phone': '111',
                'type': 'Fire'
            }
        ]
        
        return jsonify({
            'success': True,
            'data': emergency_contacts
        }), 200
        
    except Exception as e:
        logger.error(f"Get emergency contacts error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get emergency contacts',
            'error': str(e)
        }), 500