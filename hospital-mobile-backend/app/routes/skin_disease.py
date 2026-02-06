import logging
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import io
from PIL import Image

from app.services.skin_disease_predictor import (
    get_predictor, initialize_predictor
)
from app.utils.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)

skin_disease_bp = Blueprint('skin_disease', __name__)

@skin_disease_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict_skin_disease():
    """Predict skin disease from uploaded image"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if image is uploaded
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No image file provided'
            }), 400
        
        image_file = request.files['image']
        
        # Check if file is selected
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Check file extension
        allowed_extensions = current_app.config.get('ALLOWED_IMAGE_EXTENSIONS', {'png', 'jpg', 'jpeg'})
        if '.' not in image_file.filename or \
           image_file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({
                'success': False,
                'message': f'Allowed file types: {", ".join(allowed_extensions)}'
            }), 400
        
        # Read image file
        image_bytes = image_file.read()
        
        # Initialize predictor if not already
        model_path = current_app.config.get('MODEL_PATH', 'instance/models/Skin_disease_model.h5')
        if not initialize_predictor(model_path):
            return jsonify({
                'success': False,
                'message': 'Prediction service is not available'
            }), 503
        
        predictor = get_predictor()
        
        # Validate image
        is_valid, message = predictor.validate_image(image_bytes)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': message
            }), 400
        
        # Make prediction
        result = predictor.predict(image_bytes)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'message': 'Prediction failed',
                'error': result.get('error', 'Unknown error')
            }), 500
        
        # Get patient ID
        patient_result = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_user_id=current_user_id
        )
        
        patient_id = None
        if patient_result['success'] and patient_result['data']:
            patient_id = patient_result['data'][0]['patient_id']
        
        # Save prediction to database
        if patient_id:
            try:
                # Create prediction record
                prediction_data = {
                    'patient_id': patient_id,
                    'predicted_disease': result['predicted_disease'],
                    'disease_name': result['disease_name'],
                    'confidence': result['confidence'],
                    'severity': result['severity'],
                    'type': result['type'],
                    'recommendation': result['recommendation'],
                    'image_filename': image_file.filename,
                    'created_at': datetime.utcnow().isoformat()
                }
                
                # Save to database (create a new table for predictions)
                # For now, we'll store in a JSON column in medical_reports or create new table
                # Let's create a skin_predictions table first
                
                SupabaseClient.execute_query(
                    'notifications',
                    'insert',
                    user_id=current_user_id,
                    title='Skin Analysis Completed',
                    message=f'Your skin analysis shows possible {result["disease_name"]} with {result["confidence"]:.1%} confidence',
                    type='Report',
                    created_at=datetime.utcnow().isoformat()
                )
                
            except Exception as e:
                logger.error(f"Failed to save prediction record: {str(e)}")
                # Continue even if save fails
        
        return jsonify({
            'success': True,
            'message': 'Analysis completed successfully',
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Skin disease prediction error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to analyze image',
            'error': str(e)
        }), 500

@skin_disease_bp.route('/predict/history', methods=['GET'])
@jwt_required()
def get_prediction_history():
    """Get user's skin disease prediction history"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get patient ID
        patient_result = SupabaseClient.execute_query(
            'patients',
            'select',
            filter_user_id=current_user_id
        )
        
        if not patient_result['success'] or not patient_result['data']:
            return jsonify({
                'success': False,
                'message': 'Patient profile not found'
            }), 404
        
        patient_id = patient_result['data'][0]['patient_id']
        
        # In a real implementation, you would query from a skin_predictions table
        # For now, return empty or mock data
        
        # Check if we have a skin_predictions table
        # If not, return empty list for now
        predictions = []
        
        # For development, you can create the table with:
        # CREATE TABLE skin_predictions (
        #     prediction_id SERIAL PRIMARY KEY,
        #     patient_id INTEGER REFERENCES patients(patient_id),
        #     predicted_disease VARCHAR(100),
        #     disease_name VARCHAR(100),
        #     confidence DECIMAL(5,4),
        #     severity VARCHAR(20),
        #     type VARCHAR(50),
        #     recommendation TEXT,
        #     image_filename VARCHAR(255),
        #     created_at TIMESTAMP DEFAULT NOW()
        # );
        
        return jsonify({
            'success': True,
            'data': predictions,
            'count': len(predictions)
        }), 200
        
    except Exception as e:
        logger.error(f"Get prediction history error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get prediction history',
            'error': str(e)
        }), 500

@skin_disease_bp.route('/diseases/info', methods=['GET'])
def get_diseases_info():
    """Get information about all skin diseases the model can detect"""
    try:
        model_path = current_app.config.get('MODEL_PATH', 'instance/models/Skin_disease_model.h5')
        if not initialize_predictor(model_path):
            return jsonify({
                'success': False,
                'message': 'Service not available'
            }), 503
        
        predictor = get_predictor()
        
        diseases = []
        for key, info in predictor.disease_info.items():
            diseases.append({
                'code': key,
                'name': info['name'],
                'description': info['description'],
                'severity': info['severity'],
                'type': info['type'],
                'recommendation': info['recommendation']
            })
        
        return jsonify({
            'success': True,
            'data': diseases,
            'count': len(diseases)
        }), 200
        
    except Exception as e:
        logger.error(f"Get diseases info error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get diseases information',
            'error': str(e)
        }), 500

@skin_disease_bp.route('/status', methods=['GET'])
def get_service_status():
    """Check if skin disease prediction service is available"""
    try:
        model_path = current_app.config.get('MODEL_PATH', 'instance/models/Skin_disease_model.h5')
        
        # Check if model file exists
        model_exists = os.path.exists(model_path)
        
        # Try to initialize predictor
        service_available = initialize_predictor(model_path) if model_exists else False
        
        return jsonify({
            'success': True,
            'data': {
                'service_available': service_available,
                'model_exists': model_exists,
                'model_path': model_path,
                'max_image_size_mb': current_app.config.get('MAX_IMAGE_SIZE_MB', 10),
                'allowed_extensions': list(current_app.config.get('ALLOWED_IMAGE_EXTENSIONS', {'png', 'jpg', 'jpeg'}))
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get service status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get service status',
            'error': str(e)
        }), 500
    
def save_prediction_to_db(patient_id, result, filename):
    """Save prediction to database"""
    try:
        prediction_data = {
            'patient_id': patient_id,
            'predicted_disease': result['predicted_disease'],
            'disease_name': result['disease_name'],
            'confidence': result['confidence'],
            'severity': result['severity'],
            'type': result['type'],
            'recommendation': result['recommendation'],
            'image_filename': filename,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Check if table exists, if not create it dynamically or skip
        save_result = SupabaseClient.execute_query('skin_predictions', 'insert', **prediction_data)
        
        return save_result['success']
        
    except Exception as e:
        logger.error(f"Failed to save prediction to DB: {str(e)}")
        return False   