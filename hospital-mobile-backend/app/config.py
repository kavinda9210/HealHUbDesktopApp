import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    
    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # CORS Configuration
    # Default origins cover local web dev (React/Vue/Expo) and Tauri desktop apps.
    _default_cors_origins = (
        'http://localhost:3000,'
        'http://localhost:8081,'
        'http://localhost:5173,'
        'tauri://localhost,'
        'http://tauri.localhost,'
        'https://tauri.localhost'
    )
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get('CORS_ORIGINS', _default_cors_origins).split(',')
        if o.strip()
    ]
    
    # Email Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')
    
    # Supabase Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    # App URLs
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:5000')

    MODEL_PATH = os.environ.get('MODEL_PATH', 'app/models_storage/Skin_disease_model.h5')
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
    MAX_IMAGE_SIZE_MB = 10
    
    # Security
    PASSWORD_RESET_TIMEOUT = 900  # 15 minutes in seconds
    
    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    MAIL_SUPPRESS_SEND = False  # Send real emails in development

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MAIL_SUPPRESS_SEND = True  # Don't send emails in testing
    SUPABASE_URL = os.environ.get('TEST_SUPABASE_URL')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)  # Shorter for security
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}