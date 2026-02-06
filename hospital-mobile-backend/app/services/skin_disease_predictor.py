import numpy as np
import cv2
from PIL import Image
import io
from keras.models import load_model
import logging
import os

logger = logging.getLogger(__name__)

class SkinDiseasePredictor:
    """Skin disease prediction service"""
    
    def __init__(self, model_path: str = None):
        self.model = None
        self.class_indices = {
            0: 'BA-cellulitis',
            1: 'BA-impetigo',
            2: 'FU-athlete-foot',
            3: 'FU-nail-fungus',
            4: 'FU-ringworm',
            5: 'PA-cutaneous-larva-migrans',
            6: 'VI-chickenpox',
            7: 'VI-shingles'
        }
        
        # Disease descriptions and recommendations
        self.disease_info = {
            'BA-cellulitis': {
                'name': 'Cellulitis',
                'description': 'A common bacterial skin infection that causes redness, swelling, and pain.',
                'recommendation': 'Requires antibiotics. See a doctor immediately.',
                'severity': 'High',
                'type': 'Bacterial Infection'
            },
            'BA-impetigo': {
                'name': 'Impetigo',
                'description': 'A highly contagious skin infection common in children, causing red sores.',
                'recommendation': 'Antibiotic ointment or oral antibiotics. Keep affected area clean.',
                'severity': 'Medium',
                'type': 'Bacterial Infection'
            },
            'FU-athlete-foot': {
                'name': 'Athlete\'s Foot',
                'description': 'Fungal infection affecting feet, causing itching, scaling, and redness.',
                'recommendation': 'Antifungal creams, keep feet dry, wear breathable shoes.',
                'severity': 'Low',
                'type': 'Fungal Infection'
            },
            'FU-nail-fungus': {
                'name': 'Nail Fungus',
                'description': 'Fungal infection causing thickened, discolored, or brittle nails.',
                'recommendation': 'Antifungal medication, maintain good foot hygiene.',
                'severity': 'Low',
                'type': 'Fungal Infection'
            },
            'FU-ringworm': {
                'name': 'Ringworm',
                'description': 'Fungal infection causing ring-shaped rash on skin.',
                'recommendation': 'Antifungal creams, keep skin clean and dry.',
                'severity': 'Low',
                'type': 'Fungal Infection'
            },
            'PA-cutaneous-larva-migrans': {
                'name': 'Cutaneous Larva Migrans',
                'description': 'Parasitic skin infection caused by hookworm larvae.',
                'recommendation': 'Antiparasitic medication. Avoid walking barefoot in contaminated areas.',
                'severity': 'Medium',
                'type': 'Parasitic Infection'
            },
            'VI-chickenpox': {
                'name': 'Chickenpox',
                'description': 'Viral infection causing itchy blisters and fever.',
                'recommendation': 'Antiviral medication for high-risk patients. Rest and hydration.',
                'severity': 'Medium',
                'type': 'Viral Infection'
            },
            'VI-shingles': {
                'name': 'Shingles',
                'description': 'Viral infection causing painful rash, reactivation of chickenpox virus.',
                'recommendation': 'Antiviral medication within 72 hours of rash onset.',
                'severity': 'High',
                'type': 'Viral Infection'
            }
        }
        
        if model_path:
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load the trained model"""
        try:
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return False
            
            self.model = load_model(model_path)
            logger.info(f"Model loaded successfully from {model_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            return False
    
    def preprocess_image(self, image_data, img_size: int = 224):
        """Preprocess image for model prediction"""
        try:
            # If image is bytes (from file upload)
            if isinstance(image_data, bytes):
                img = Image.open(io.BytesIO(image_data))
            else:
                img = image_data
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(img)
            
            # Resize and pad using the same function from training
            processed_img = self.resize_and_pad(img_array, img_size)
            
            # Normalize
            processed_img = processed_img / 255.0
            
            # Add batch dimension
            processed_img = np.expand_dims(processed_img, axis=0)
            
            return processed_img
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise
    
    def resize_and_pad(self, img, desired_size: int = 224):
        """Resize and pad image (same as training preprocessing)"""
        try:
            old_size = img.shape[:2]  # (height, width)
            
            # Compute ratio and new size
            ratio = float(desired_size) / max(old_size)
            new_size = tuple([int(x * ratio) for x in old_size])
            
            # Resize the image
            img = cv2.resize(img, (new_size[1], new_size[0]))
            
            # Padding
            delta_w = desired_size - new_size[1]
            delta_h = desired_size - new_size[0]
            top, bottom = delta_h // 2, delta_h - (delta_h // 2)
            left, right = delta_w // 2, delta_w - (delta_w // 2)
            
            padded_img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0])
            return padded_img
            
        except Exception as e:
            logger.error(f"Resize and pad failed: {str(e)}")
            raise
    
    def predict(self, image_data):
        """Make prediction on image"""
        try:
            if self.model is None:
                raise ValueError("Model not loaded. Call load_model() first.")
            
            # Preprocess image
            processed_img = self.preprocess_image(image_data)
            
            # Make prediction
            predictions = self.model.predict(processed_img, verbose=0)
            predicted_index = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_index])
            
            # Get disease label
            predicted_label = self.class_indices.get(predicted_index, 'Unknown')
            
            # Get disease information
            disease_info = self.disease_info.get(predicted_label, {
                'name': 'Unknown',
                'description': 'No information available',
                'recommendation': 'Consult a dermatologist',
                'severity': 'Unknown',
                'type': 'Unknown'
            })
            
            # Get top 3 predictions
            top_indices = np.argsort(predictions[0])[-3:][::-1]
            top_predictions = []
            
            for idx in top_indices:
                label = self.class_indices.get(idx, f'Class_{idx}')
                prob = float(predictions[0][idx])
                info = self.disease_info.get(label, {})
                top_predictions.append({
                    'disease': label,
                    'probability': prob,
                    'name': info.get('name', label),
                    'type': info.get('type', 'Unknown')
                })
            
            result = {
                'predicted_disease': predicted_label,
                'confidence': confidence,
                'disease_name': disease_info['name'],
                'description': disease_info['description'],
                'recommendation': disease_info['recommendation'],
                'severity': disease_info['severity'],
                'type': disease_info['type'],
                'top_predictions': top_predictions,
                'success': True
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'predicted_disease': 'Unknown',
                'confidence': 0.0
            }
    
    def validate_image(self, image_data, max_size_mb: int = 10):
        """Validate uploaded image"""
        try:
            if isinstance(image_data, bytes):
                # Check file size
                size_mb = len(image_data) / (1024 * 1024)
                if size_mb > max_size_mb:
                    return False, f"Image size exceeds {max_size_mb}MB limit"
                
                # Try to open image
                img = Image.open(io.BytesIO(image_data))
                img.verify()  # Verify it's a valid image
                
                # Check dimensions
                if img.width < 50 or img.height < 50:
                    return False, "Image dimensions too small"
                
                return True, "Valid image"
                
            return False, "Invalid image data"
            
        except Exception as e:
            return False, f"Invalid image: {str(e)}"

# Global instance
skin_predictor = None

def initialize_predictor(model_path: str = "models/Skin_disease_model.h5"):
    """Initialize the predictor singleton"""
    global skin_predictor
    if skin_predictor is None:
        # Prefer the explicitly provided path, but fall back to the bundled model
        # location if the configured path doesn't exist.
        resolved_model_path = model_path
        if resolved_model_path and not os.path.exists(resolved_model_path):
            bundled_model_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "models_storage", "Skin_disease_model.h5")
            )
            if os.path.exists(bundled_model_path):
                resolved_model_path = bundled_model_path

        skin_predictor = SkinDiseasePredictor(resolved_model_path)
        if not skin_predictor.load_model(resolved_model_path):
            logger.error("Failed to initialize skin disease predictor")
            return False
    return True

def get_predictor():
    """Get the predictor instance"""
    global skin_predictor
    return skin_predictor