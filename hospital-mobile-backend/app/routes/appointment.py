import logging
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.medical_models import (
    BillingResponse, PaymentCreate, PaymentStatus
)
from app.utils.supabase_client import SupabaseClient, get_user_by_id
from app.utils.email_service import EmailService
from app.utils.time_utils import sl_now, sl_now_iso

logger = logging.getLogger(__name__)

appointment_bp = Blueprint('appointment', __name__)
payment_bp = Blueprint('payment', __name__)


@appointment_bp.route('/ping', methods=['GET'])
def appointment_ping():
    """Health endpoint for appointment routes (placeholder)."""
    return jsonify({
        'success': True,
        'message': 'Appointment routes are not implemented yet'
    }), 200

# Helper functions
def get_patient_id_from_user(user_id: str):
    """Get patient ID from user ID"""
    result = SupabaseClient.execute_query(
        'patients',
        'select',
        filter_user_id=user_id
    )
    if result['success'] and result['data']:
        return result['data'][0]['patient_id']
    return None

def get_user_role(user_id: str):
    """Get user role"""
    user = get_user_by_id(user_id)
    if user:
        return user['role']
    return None

@payment_bp.route('/create-bill', methods=['POST'])
@jwt_required()
def create_bill():
    """Create a bill for an appointment or clinic (admin/doctor only)"""
    try:
        current_user_id = get_jwt_identity()
        user_role = get_user_role(current_user_id)
        
        # Only admin and doctor can create bills
        if user_role not in ['admin', 'doctor']:
            return jsonify({
                'success': False,
                'message': 'Only admin and doctors can create bills'
            }), 403
        
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['patient_id', 'total_amount', 'bill_date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Check if appointment_id or clinic_id is provided
        if 'appointment_id' not in data and 'clinic_id' not in data:
            return jsonify({
                'success': False,
                'message': 'Either appointment_id or clinic_id is required'
            }), 400
        
        # Create bill
        bill_data = {
            'patient_id': data['patient_id'],
            'appointment_id': data.get('appointment_id'),
            'clinic_id': data.get('clinic_id'),
            'total_amount': data['total_amount'],
            'paid_amount': 0.00,
            'payment_status': 'Pending',
            'bill_date': data['bill_date'],
            'created_at': sl_now_iso()
        }
        
        result = SupabaseClient.execute_query('billing', 'insert', **bill_data)
        
        if not result['success'] or not result['data']:
            return jsonify({
                'success': False,
                'message': 'Failed to create bill'
            }), 500
        
        bill = result['data'][0]
        
        # Notify patient
        patient_result = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_patient_id=data['patient_id']
        )
        
        if patient_result['success'] and patient_result['data']:
            patient = patient_result['data'][0]
            
            SupabaseClient.execute_query(
                'notifications',
                'insert',
                user_id=patient['user_id'],
                title='New Bill Generated',
                message=f'A bill of ${data["total_amount"]} has been generated for you.',
                type='System',
                created_at=sl_now_iso()
            )
            
            # Send email to patient
            patient_user_result = SupabaseClient.execute_query(
                'users',
                'select',
                filter_user_id=patient['user_id']
            )
            
            if patient_user_result['success'] and patient_user_result['data']:
                patient_email = patient_user_result['data'][0]['email']
                
                bill_type = "Appointment" if data.get('appointment_id') else "Clinic"
                bill_ref = data.get('appointment_id') or data.get('clinic_id')
                
                EmailService.send_async_email(
                    to_email=patient_email,
                    subject='New Bill Generated',
                    html_content=f'''
                    <h2>New Bill Generated</h2>
                    <p>A new bill has been generated for your {bill_type}.</p>
                    <p><strong>Bill Details:</strong></p>
                    <ul>
                        <li>Bill ID: {bill['bill_id']}</li>
                        <li>{bill_type} ID: {bill_ref}</li>
                        <li>Total Amount: ${data['total_amount']}</li>
                        <li>Due Date: {data['bill_date']}</li>
                    </ul>
                    <p>Please log in to your account to view and pay the bill.</p>
                    '''
                )
        
        return jsonify({
            'success': True,
            'message': 'Bill created successfully',
            'data': bill
        }), 201
        
    except Exception as e:
        logger.error(f"Create bill error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create bill',
            'error': str(e)
        }), 500

@payment_bp.route('/pay', methods=['POST'])
@jwt_required()
def make_payment():
    """Make a payment for a bill (patient only)"""
    try:
        current_user_id = get_jwt_identity()
        user_role = get_user_role(current_user_id)
        
        if user_role != 'patient':
            return jsonify({
                'success': False,
                'message': 'Only patients can make payments'
            }), 403
        
        patient_id = get_patient_id_from_user(current_user_id)
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
        required_fields = ['bill_id', 'amount', 'payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        # Get bill details
        bill_result = SupabaseClient.execute_query(
            'billing',
            'select',
            filter_bill_id=data['bill_id'],
            filter_patient_id=patient_id
        )
        
        if not bill_result['success'] or not bill_result['data']:
            return jsonify({
                'success': False,
                'message': 'Bill not found or access denied'
            }), 404
        
        bill = bill_result['data'][0]
        
        # Validate payment amount
        amount = float(data['amount'])
        remaining_amount = float(bill['total_amount']) - float(bill['paid_amount'])
        
        if amount <= 0:
            return jsonify({
                'success': False,
                'message': 'Payment amount must be greater than 0'
            }), 400
        
        if amount > remaining_amount:
            return jsonify({
                'success': False,
                'message': f'Payment amount exceeds remaining balance. Remaining: ${remaining_amount}'
            }), 400
        
        # Generate payment reference
        payment_reference = str(uuid.uuid4())[:8].upper()
        
        # Update bill payment
        new_paid_amount = float(bill['paid_amount']) + amount
        payment_status = 'Paid' if new_paid_amount >= float(bill['total_amount']) else 'Partial'
        
        update_result = SupabaseClient.execute_query(
            'billing',
            'update',
            filter_bill_id=data['bill_id'],
            paid_amount=new_paid_amount,
            payment_status=payment_status
        )
        
        if not update_result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to process payment'
            }), 500
        
        # Record payment transaction (in a real app, you'd have a payments table)
        # For now, we'll just log it
        
        # Get patient info for notification
        patient_result = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_patient_id=patient_id
        )
        
        if patient_result['success'] and patient_result['data']:
            patient = patient_result['data'][0]
            
            # Create notification for patient
            SupabaseClient.execute_query(
                'notifications',
                'insert',
                user_id=patient['user_id'],
                title='Payment Successful',
                message=f'Payment of ${amount} for Bill #{data["bill_id"]} was successful. Reference: {payment_reference}',
                type='System',
                created_at=sl_now_iso()
            )
            
            # Send email receipt to patient
            patient_user_result = SupabaseClient.execute_query(
                'users',
                'select',
                filter_user_id=patient['user_id']
            )
            
            if patient_user_result['success'] and patient_user_result['data']:
                patient_email = patient_user_result['data'][0]['email']
                
                EmailService.send_async_email(
                    to_email=patient_email,
                    subject='Payment Receipt',
                    html_content=f'''
                    <h2>Payment Receipt</h2>
                    <p>Thank you for your payment.</p>
                    <p><strong>Payment Details:</strong></p>
                    <ul>
                        <li>Bill ID: {data['bill_id']}</li>
                        <li>Amount Paid: ${amount}</li>
                        <li>Payment Method: {data['payment_method']}</li>
                        <li>Payment Reference: {payment_reference}</li>
                        <li>Date: {sl_now().strftime("%Y-%m-%d %H:%M:%S")}</li>
                    </ul>
                    <p><strong>Bill Status:</strong></p>
                    <ul>
                        <li>Total Amount: ${bill['total_amount']}</li>
                        <li>Paid Amount: ${new_paid_amount}</li>
                        <li>Remaining: ${float(bill['total_amount']) - new_paid_amount}</li>
                        <li>Status: {payment_status}</li>
                    </ul>
                    <p>This is your payment receipt. Please keep it for your records.</p>
                    '''
                )
        
        return jsonify({
            'success': True,
            'message': 'Payment successful',
            'data': {
                'payment_reference': payment_reference,
                'amount_paid': amount,
                'new_paid_amount': new_paid_amount,
                'payment_status': payment_status,
                'remaining_balance': float(bill['total_amount']) - new_paid_amount
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Make payment error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Payment failed',
            'error': str(e)
        }), 500

@payment_bp.route('/history', methods=['GET'])
@jwt_required()
def get_payment_history():
    """Get payment history for patient"""
    try:
        current_user_id = get_jwt_identity()
        user_role = get_user_role(current_user_id)
        
        if user_role != 'patient':
            return jsonify({
                'success': False,
                'message': 'Only patients can view payment history'
            }), 403
        
        patient_id = get_patient_id_from_user(current_user_id)
        if not patient_id:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        # Get all bills for patient
        result = SupabaseClient.execute_query(
            'billing',
            'select',
            filter_patient_id=patient_id,
            order_by='created_at',
            order_desc=True
        )
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch payment history'
            }), 500
        
        return jsonify({
            'success': True,
            'data': result['data'] or [],
            'count': len(result['data'] or [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get payment history error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get payment history',
            'error': str(e)
        }), 500

@payment_bp.route('/invoice/<int:bill_id>', methods=['GET'])
@jwt_required()
def get_invoice(bill_id: int):
    """Get invoice details for a bill"""
    try:
        current_user_id = get_jwt_identity()
        user_role = get_user_role(current_user_id)
        
        patient_id = get_patient_id_from_user(current_user_id)
        
        # Get bill
        query_params = {'filter_bill_id': bill_id}
        
        # Patients can only see their own bills
        if user_role == 'patient' and patient_id:
            query_params['filter_patient_id'] = patient_id
        
        result = SupabaseClient.execute_query('billing', 'select', **query_params)
        
        if not result['success'] or not result['data']:
            return jsonify({
                'success': False,
                'message': 'Invoice not found or access denied'
            }), 404
        
        bill = result['data'][0]
        
        # Get additional details
        invoice_data = {
            'bill': bill,
            'patient': None,
            'appointment': None,
            'clinic': None,
            'doctor': None
        }
        
        # Get patient info
        patient_result = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_patient_id=bill['patient_id']
        )
        
        if patient_result['success'] and patient_result['data']:
            invoice_data['patient'] = patient_result['data'][0]
        
        # Get appointment or clinic details
        if bill['appointment_id']:
            appointment_result = SupabaseClient.execute_query(
                'appointments',
                'select',
                filter_appointment_id=bill['appointment_id']
            )
            
            if appointment_result['success'] and appointment_result['data']:
                invoice_data['appointment'] = appointment_result['data'][0]
                
                # Get doctor info
                doctor_result = SupabaseClient.execute_query(
                    'doctors',
                    'select',
                    filter_doctor_id=appointment_result['data'][0]['doctor_id']
                )
                
                if doctor_result['success'] and doctor_result['data']:
                    invoice_data['doctor'] = doctor_result['data'][0]
        
        elif bill['clinic_id']:
            clinic_result = SupabaseClient.execute_query(
                'clinic_participation',
                'select',
                filter_clinic_id=bill['clinic_id']
            )
            
            if clinic_result['success'] and clinic_result['data']:
                invoice_data['clinic'] = clinic_result['data'][0]
                
                # Get doctor info
                doctor_result = SupabaseClient.execute_query(
                    'doctors',
                    'select',
                    filter_doctor_id=clinic_result['data'][0]['doctor_id']
                )
                
                if doctor_result['success'] and doctor_result['data']:
                    invoice_data['doctor'] = doctor_result['data'][0]
        
        return jsonify({
            'success': True,
            'data': invoice_data
        }), 200
        
    except Exception as e:
        logger.error(f"Get invoice error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get invoice',
            'error': str(e)
        }), 500

@payment_bp.route('/methods', methods=['GET'])
def get_payment_methods():
    """Get available payment methods"""
    try:
        # In a real app, this would come from a database
        payment_methods = [
            {
                'id': 'credit_card',
                'name': 'Credit Card',
                'description': 'Pay with Visa, MasterCard, or American Express',
                'enabled': True
            },
            {
                'id': 'debit_card',
                'name': 'Debit Card',
                'description': 'Pay with your debit card',
                'enabled': True
            },
            {
                'id': 'bank_transfer',
                'name': 'Bank Transfer',
                'description': 'Transfer funds directly from your bank account',
                'enabled': True
            },
            {
                'id': 'mobile_payment',
                'name': 'Mobile Payment',
                'description': 'Pay using mobile payment apps',
                'enabled': True
            }
        ]
        
        return jsonify({
            'success': True,
            'data': payment_methods
        }), 200
        
    except Exception as e:
        logger.error(f"Get payment methods error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get payment methods',
            'error': str(e)
        }), 500