import logging
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token, 
    jwt_required, 
    get_jwt_identity,
    get_jwt
)
import random

from app.models.user_models import (
    UserCreate, UserLogin, UserResponse, 
    VerificationRequest, VerifyCodeRequest,
    PasswordResetRequest, TokenResponse
)
from app.utils.supabase_client import (
    SupabaseClient, get_user_by_email, get_user_by_id,
    create_user, update_user
)
from app.utils.email_service import EmailService
from app.utils.time_utils import sl_now, sl_now_iso, utc_now, parse_iso_datetime

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

from app.utils.security import hash_password

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (patient or ambulance staff only)"""
    try:
        # Parse and validate request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        import random

        from app.utils.supabase_client import (
            SupabaseClient, get_user_by_email, get_user_by_id,
            create_user, update_user
        )
        # Default role to patient when omitted
        if isinstance(data, dict) and 'role' not in data:
            data['role'] = 'patient'
        
        # Validate input using Pydantic model
        user_data = UserCreate(**data)

        role_value = user_data.role.value if hasattr(user_data.role, 'value') else str(user_data.role)
        
        # Check if user already exists
        existing_user = get_user_by_email(user_data.email)
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 409
        
        # Only allow patient and ambulance_staff registration through this endpoint
        if role_value not in ['patient', 'ambulance_staff']:
            return jsonify({
                'success': False,
                'message': 'Invalid role for self-registration. Doctors and admins must be created by admin.'
            }), 403
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Generate verification token
        verification_token = str(uuid.uuid4())
        
        # Prepare user data for database
        db_user_data = {
            'email': user_data.email,
            'password_hash': hashed_password,
            'role': role_value,
            'is_verified': False,
            'verification_token': verification_token,
            'verification_token_expires': sl_now_iso(),
            'is_active': True
        }
        
        # Create user in database
        created_user = create_user(db_user_data)
        if not created_user:
            return jsonify({
                'success': False,
                'message': 'Failed to create user'
            }), 500
        
        # Generate verification code (6 digits)
        import random
        verification_code = str(random.randint(100000, 999999))
        
        # Store verification code in database
        verification_ttl_seconds = int(current_app.config.get('PASSWORD_RESET_TIMEOUT', 900))
        verification_expires_at = (sl_now() + timedelta(seconds=verification_ttl_seconds)).isoformat(timespec='seconds')
        SupabaseClient.execute_query(
            'verification_codes',
            'insert',
            user_id=created_user['user_id'],
            email=user_data.email,
            verification_code=verification_code,
            verification_type='registration',
            verification_method='email',
            expires_at=verification_expires_at
        )
        
        # Send verification email
        email_sent = EmailService.send_verification_code(
            email=user_data.email,
            verification_code=verification_code,
            user_name=user_data.full_name
        )
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {user_data.email}")
        
        # Create user profile based on role
        if role_value == 'patient':
            # Create patient record (patient fields are validated by UserCreate)
            SupabaseClient.execute_query(
                'patients',
                'insert',
                user_id=created_user['user_id'],
                full_name=user_data.full_name,
                phone=user_data.phone,
                dob=user_data.dob.isoformat() if user_data.dob else None,
                gender=user_data.gender.value if getattr(user_data, 'gender', None) else None,
                address=user_data.address,
                emergency_contact=user_data.emergency_contact,
                created_at=sl_now_iso()
            )
        elif role_value == 'ambulance_staff' and user_data.full_name and user_data.phone:
            # Create ambulance staff record will be created when they register ambulance
            pass
        
        return jsonify({
            'success': True,
            'message': (
                'Registration successful. Please verify your email.'
                if email_sent
                else 'Registration successful, but verification email could not be sent. Please contact support or try again later.'
            ),
            'user_id': created_user['user_id'],
            'email_sent': email_sent
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Registration failed',
            'error': str(e)
        }), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify user email with verification code"""
    try:
        # Parse and validate request
        data = request.get_json()
        verify_data = VerifyCodeRequest(**data)

        user_id: str | None = None

        # Prefer RPC if available, but fall back to table queries when RPC is broken.
        result = SupabaseClient.rpc('verify_registration_code', {
            'p_email': verify_data.email,
            'p_verification_code': verify_data.verification_code
        })

        if result.get('success') and result.get('data'):
            result_data = result['data'][0] if isinstance(result['data'], list) and result['data'] else result['data']
            if isinstance(result_data, dict) and result_data.get('is_valid'):
                user_id = result_data.get('user_id')
            elif isinstance(result_data, dict) and not result_data.get('is_valid'):
                return jsonify({
                    'success': False,
                    'message': result_data.get('message', 'Verification failed')
                }), 400

        if not user_id:
            # Fallback: verify against verification_codes + users tables.
            try:
                client = SupabaseClient.get_client()
                query = (
                    client.table('verification_codes')
                    .select('*')
                    .eq('email', verify_data.email)
                    .eq('verification_code', verify_data.verification_code)
                    .eq('verification_type', 'registration')
                )

                # If schema has is_used, enforce one-time use.
                try:
                    query = query.eq('is_used', False)
                except Exception:
                    pass

                vc_result = query.execute()
                vc_rows = getattr(vc_result, 'data', None) or []
                if not vc_rows:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid verification code'
                    }), 400

                vc = vc_rows[0]
                user_id = vc.get('user_id')
                if not user_id:
                    return jsonify({
                        'success': False,
                        'message': 'Verification failed'
                    }), 400

                # Expiry check if expires_at exists.
                expires_at = vc.get('expires_at')
                if expires_at and parse_iso_datetime(expires_at) < utc_now():
                    return jsonify({
                        'success': False,
                        'message': 'Verification code has expired'
                    }), 400

                # Mark user verified.
                update_user_result = SupabaseClient.execute_query(
                    'users',
                    'update',
                    filter_user_id=user_id,
                    is_verified=True
                )
                if not update_user_result.get('success'):
                    return jsonify({
                        'success': False,
                        'message': 'Verification failed'
                    }), 400

                # Mark code as used if possible.
                try:
                    SupabaseClient.execute_query(
                        'verification_codes',
                        'update',
                        filter_email=verify_data.email,
                        filter_verification_code=verify_data.verification_code,
                        filter_verification_type='registration',
                        is_used=True
                    )
                except Exception:
                    pass
            except Exception as fallback_error:
                logger.error(f"Verification fallback failed: {fallback_error}")
                return jsonify({
                    'success': False,
                    'message': 'Verification failed'
                }), 400

        # Get user information
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
                
        # Generate tokens
        access_token = create_access_token(identity=user['user_id'])
        refresh_token = create_refresh_token(identity=user['user_id'])

        # Get user role-specific data
        user_response = {
            'user_id': user['user_id'],
            'email': user['email'],
            'role': user['role'],
            'is_verified': True,
            'is_active': user['is_active'],
            'created_at': user['created_at']
        }

        # Add role-specific data
        if user['role'] == 'patient':
            patient_data = SupabaseClient.execute_query(
                'patients',
                'select',
                filter_user_id=user['user_id']
            )
            if patient_data['success'] and patient_data['data']:
                user_response['full_name'] = patient_data['data'][0].get('full_name')
                user_response['phone'] = patient_data['data'][0].get('phone')

        return jsonify({
            'success': True,
            'message': 'Email verified successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'expires_in': 3600,  # 1 hour in seconds
            'user': user_response
        }), 200
        
    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Verification failed',
            'error': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    try:
        # Parse and validate request
        data = request.get_json()
        login_data = UserLogin(**data)
        
        # Get user from database
        user = get_user_by_email(login_data.email)
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'Account is deactivated'
            }), 403
        
        # Check if email is verified
        if not user.get('is_verified', False):
            return jsonify({
                'success': False,
                'message': 'Please verify your email first'
            }), 403
        
        # Verify password
        hashed_password = hash_password(login_data.password)
        if user['password_hash'] != hashed_password:
            # Log failed attempt
            SupabaseClient.execute_query(
                'login_attempts',
                'insert',
                email=login_data.email,
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
                is_successful=False,
                failed_reason='Invalid password'
            )
            
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Log successful attempt
        SupabaseClient.execute_query(
            'login_attempts',
            'insert',
            email=login_data.email,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
            is_successful=True
        )
        
        # Generate tokens
        access_token = create_access_token(identity=user['user_id'])
        refresh_token = create_refresh_token(identity=user['user_id'])
        
        # Get user role-specific data
        user_response = {
            'user_id': user['user_id'],
            'email': user['email'],
            'role': user['role'],
            'is_verified': user['is_verified'],
            'is_active': user['is_active'],
            'created_at': user['created_at']
        }
        
        # Add role-specific data
        if user['role'] == 'patient':
            patient_data = SupabaseClient.execute_query(
                'patients',
                'select',
                filter_user_id=user['user_id']
            )
            if patient_data['success'] and patient_data['data']:
                user_response['full_name'] = patient_data['data'][0].get('full_name')
                user_response['phone'] = patient_data['data'][0].get('phone')
        
        elif user['role'] == 'doctor':
            doctor_data = SupabaseClient.execute_query(
                'doctors',
                'select',
                filter_user_id=user['user_id']
            )
            if doctor_data['success'] and doctor_data['data']:
                user_response['full_name'] = doctor_data['data'][0].get('full_name')
                user_response['phone'] = doctor_data['data'][0].get('phone')
        
        elif user['role'] == 'ambulance_staff':
            ambulance_data = SupabaseClient.execute_query(
                'ambulances',
                'select',
                filter_user_id=user['user_id']
            )
            if ambulance_data['success'] and ambulance_data['data']:
                user_response['full_name'] = ambulance_data['data'][0].get('driver_name')
                user_response['phone'] = ambulance_data['data'][0].get('driver_phone')
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'expires_in': 3600,  # 1 hour in seconds
            'user': user_response
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e)
        }), 500


@auth_bp.route('/notifications', methods=['GET'])
@jwt_required()
def list_my_notifications():
    """List notifications for the currently authenticated user (any role)."""
    try:
        current_user_id = get_jwt_identity()

        notification_type = request.args.get('type')
        is_read = request.args.get('is_read')
        limit = int(request.args.get('limit', 50))

        query_params = {
            'filter_user_id': current_user_id,
            'limit': limit,
            'order_by': 'created_at',
            'order_desc': True,
        }

        if notification_type:
            query_params['filter_type'] = notification_type

        if is_read is not None:
            if isinstance(is_read, str):
                query_params['filter_is_read'] = is_read.lower() in ['true', '1', 'yes']
            else:
                query_params['filter_is_read'] = bool(is_read)

        result = SupabaseClient.execute_query('notifications', 'select', **query_params)
        if not result.get('success'):
            return jsonify({'success': False, 'message': 'Failed to fetch notifications'}), 500

        rows = result.get('data') or []
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200

    except Exception as e:
        logger.error(f"List my notifications error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch notifications', 'error': str(e)}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        email = data['email']
        
        # Call Supabase function
        result = SupabaseClient.rpc('request_password_reset', {
            'p_email': email
        })
        
        if not result['success']:
            # Still return success to prevent email enumeration
            return jsonify({
                'success': True,
                'message': 'If the email exists, a reset code has been sent'
            }), 200
        
        result_data = result['data']
        if result_data and len(result_data) > 0:
            result_data = result_data[0]
            
            if result_data.get('success'):
                # Send reset code email
                email_sent = EmailService.send_password_reset_code(
                    email=email,
                    reset_code=result_data['reset_code']
                )
                
                return jsonify({
                    'success': True,
                    'message': (
                        'Password reset code sent to your email'
                        if email_sent
                        else 'If the email exists, a reset code has been sent'
                    ),
                    'email_sent': email_sent
                }), 200
        
        # Always return success to prevent email enumeration
        return jsonify({
            'success': True,
            'message': 'If the email exists, a reset code has been sent'
        }), 200
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return jsonify({
            'success': True,  # Still return success for security
            'message': 'If the email exists, a reset code has been sent'
        }), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with verification code"""
    try:
        data = request.get_json()
        reset_data = PasswordResetRequest(**data)
        
        # Verify reset code first
        user = get_user_by_email(reset_data.email)
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid reset code or email'
            }), 400
        
        # Check if reset code matches and is not expired
        if (user.get('password_reset_token') != reset_data.verification_code or
            not user.get('password_reset_expires') or
            parse_iso_datetime(user['password_reset_expires']) < utc_now()):
            return jsonify({
                'success': False,
                'message': 'Invalid or expired reset code'
            }), 400
        
        # Hash new password
        new_password_hash = hash_password(reset_data.new_password)
        
        # Update password in database
        update_success = update_user(user['user_id'], {
            'password_hash': new_password_hash,
            'password_reset_token': None,
            'password_reset_expires': None
        })
        
        if not update_success:
            return jsonify({
                'success': False,
                'message': 'Failed to reset password'
            }), 500
        
        # Mark verification code as used
        SupabaseClient.execute_query(
            'verification_codes',
            'update',
            filter_email=reset_data.email,
            filter_verification_code=reset_data.verification_code,
            is_used=True
        )
        
        return jsonify({
            'success': True,
            'message': 'Password reset successful'
        }), 200
        
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Password reset failed',
            'error': str(e)
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user = get_jwt_identity()
        
        # Create new access token
        access_token = create_access_token(identity=current_user)
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'token_type': 'bearer',
            'expires_in': 3600
        }), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Token refresh failed'
        }), 401

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user from database
        user = get_user_by_id(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Build response based on role
        response_data = {
            'user_id': user['user_id'],
            'email': user['email'],
            'role': user['role'],
            'is_verified': user['is_verified'],
            'is_active': user['is_active'],
            'created_at': user['created_at']
        }
        
        # Add role-specific data
        if user['role'] == 'patient':
            patient_data = SupabaseClient.execute_query(
                'patients',
                'select',
                filter_user_id=user['user_id']
            )
            if patient_data['success'] and patient_data['data']:
                patient = patient_data['data'][0]
                response_data.update({
                    'full_name': patient.get('full_name'),
                    'phone': patient.get('phone'),
                    'dob': patient.get('dob'),
                    'gender': patient.get('gender'),
                    'address': patient.get('address'),
                    'blood_group': patient.get('blood_group'),
                    'emergency_contact': patient.get('emergency_contact'),
                    'has_chronic_condition': patient.get('has_chronic_condition', False),
                    'condition_notes': patient.get('condition_notes'),
                    'is_phone_verified': patient.get('is_phone_verified', False)
                })
        
        elif user['role'] == 'ambulance_staff':
            ambulance_data = SupabaseClient.execute_query(
                'ambulances',
                'select',
                filter_user_id=user['user_id']
            )
            if ambulance_data['success'] and ambulance_data['data']:
                ambulance = ambulance_data['data'][0]
                response_data.update({
                    'full_name': ambulance.get('driver_name'),
                    'phone': ambulance.get('driver_phone'),
                    'ambulance_number': ambulance.get('ambulance_number'),
                    'current_latitude': ambulance.get('current_latitude'),
                    'current_longitude': ambulance.get('current_longitude'),
                    'is_available': ambulance.get('is_available', True),
                    'last_updated': ambulance.get('last_updated')
                })
        
        return jsonify({
            'success': True,
            'data': response_data
        }), 200
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get profile',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile (without changing email)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Remove email from update data (email change requires separate verification)
        data.pop('email', None)
        data.pop('password_hash', None)  # Password change requires separate endpoint
        
        # Get user role
        user = get_user_by_id(current_user_id)
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Update based on role
        if user['role'] == 'patient':
            # Update patient table
            patient_data = {k: v for k, v in data.items() if k in [
                'full_name', 'phone', 'dob', 'gender', 'address',
                'blood_group', 'emergency_contact', 'has_chronic_condition',
                'condition_notes'
            ]}
            
            if patient_data:
                SupabaseClient.execute_query(
                    'patients',
                    'update',
                    filter_user_id=current_user_id,
                    **patient_data
                )
        
        elif user['role'] == 'ambulance_staff':
            # Update ambulance table
            ambulance_data = {k: v for k, v in data.items() if k in [
                'driver_name', 'driver_phone', 'ambulance_number'
            ]}
            
            if ambulance_data:
                SupabaseClient.execute_query(
                    'ambulances',
                    'update',
                    filter_user_id=current_user_id,
                    **ambulance_data
                )
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update profile',
            'error': str(e)
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (invalidate token on client side)"""
    try:
        # Note: JWT tokens are stateless, so we can't invalidate them server-side
        # without implementing a token blacklist. For now, just return success.
        # Client should delete the token.
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500


@auth_bp.route('/change-email/request', methods=['POST'])
@jwt_required()
def request_email_change():
    """Request an email change (sends a verification code to the new email)."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        new_email = (data.get('new_email') or '').strip().lower()

        if not new_email:
            return jsonify({'success': False, 'message': 'new_email is required'}), 400

        # Ensure new email isn't already taken.
        existing = get_user_by_email(new_email)
        if existing:
            return jsonify({'success': False, 'message': 'Email already in use'}), 409

        # Generate code and store it.
        verification_code = str(random.randint(100000, 999999))
        ttl_seconds = int(current_app.config.get('PASSWORD_RESET_TIMEOUT', 900))
        expires_at = (sl_now() + timedelta(seconds=ttl_seconds)).isoformat(timespec='seconds')

        ins = SupabaseClient.execute_query(
            'verification_codes',
            'insert',
            user_id=current_user_id,
            email=new_email,
            verification_code=verification_code,
            verification_type='email_change',
            verification_method='email',
            expires_at=expires_at,
            is_used=False,
            created_at=sl_now_iso(),
        )

        if not ins.get('success'):
            return jsonify({'success': False, 'message': 'Failed to create verification code'}), 500

        email_sent = EmailService.send_verification_code(
            email=new_email,
            verification_code=verification_code,
            user_name=None,
        )

        return jsonify({
            'success': True,
            'message': 'Verification code sent to new email',
            'email_sent': email_sent,
            'expires_in_seconds': ttl_seconds,
        }), 200

    except Exception as e:
        logger.error(f"Request email change error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to request email change', 'error': str(e)}), 500


@auth_bp.route('/change-email/verify', methods=['POST'])
@jwt_required()
def verify_email_change():
    """Verify an email change using code and update the user's email."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        new_email = (data.get('new_email') or '').strip().lower()
        verification_code = (data.get('verification_code') or '').strip()

        if not new_email or not verification_code:
            return jsonify({'success': False, 'message': 'new_email and verification_code are required'}), 400

        # Ensure new email isn't already taken.
        existing = get_user_by_email(new_email)
        if existing:
            return jsonify({'success': False, 'message': 'Email already in use'}), 409

        client = SupabaseClient.get_client()
        query = (
            client.table('verification_codes')
            .select('*')
            .eq('user_id', current_user_id)
            .eq('email', new_email)
            .eq('verification_code', verification_code)
            .eq('verification_type', 'email_change')
        )
        try:
            query = query.eq('is_used', False)
        except Exception:
            pass

        vc_result = query.execute()
        rows = getattr(vc_result, 'data', None) or []
        if not rows:
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400

        vc = rows[0]
        expires_at = vc.get('expires_at')
        if expires_at and parse_iso_datetime(expires_at) < utc_now():
            return jsonify({'success': False, 'message': 'Verification code has expired'}), 400

        upd = SupabaseClient.execute_query(
            'users',
            'update',
            filter_user_id=current_user_id,
            email=new_email,
        )
        if not upd.get('success'):
            return jsonify({'success': False, 'message': 'Failed to update email'}), 500

        try:
            SupabaseClient.execute_query(
                'verification_codes',
                'update',
                filter_verification_id=vc.get('verification_id'),
                is_used=True,
            )
        except Exception:
            pass

        return jsonify({'success': True, 'message': 'Email updated successfully', 'new_email': new_email}), 200

    except Exception as e:
        logger.error(f"Verify email change error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to verify email change', 'error': str(e)}), 500