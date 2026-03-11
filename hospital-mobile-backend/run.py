import os
from app import create_app
from app.realtime import socketio

# Create application instance
app = create_app(os.getenv('FLASK_ENV', 'default'))

if __name__ == '__main__':
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Run the application (Socket.IO)
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=app.config.get('DEBUG', False),
        allow_unsafe_werkzeug=True,
    )