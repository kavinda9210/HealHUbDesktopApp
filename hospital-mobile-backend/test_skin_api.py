import requests
import json
import os

BASE_URL = "http://localhost:5000/api"

def test_service_status():
    """Test if skin disease service is available"""
    print("Testing service status...")
    response = requests.get(f"{BASE_URL}/skin-disease/status")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_diseases_info():
    """Test getting diseases information"""
    print("\nTesting diseases info...")
    response = requests.get(f"{BASE_URL}/skin-disease/diseases/info")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['count']} diseases")
        for disease in data['data'][:3]:  # Show first 3
            print(f"  - {disease['name']} ({disease['type']})")
    return response.status_code == 200

def test_prediction_with_image(image_path, token=None):
    """Test prediction with an image file"""
    print(f"\nTesting prediction with image: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"✗ Image file not found: {image_path}")
        return None
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    with open(image_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(f"{BASE_URL}/skin-disease/predict", files=files, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            result = data['data']
            print(f"✓ Prediction successful!")
            print(f"  Disease: {result['disease_name']}")
            print(f"  Confidence: {result['confidence']:.1%}")
            print(f"  Severity: {result['severity']}")
            print(f"  Recommendation: {result['recommendation'][:100]}...")
            return result
        else:
            print(f"✗ Prediction failed: {data.get('message')}")
    else:
        print(f"✗ Request failed: {response.text[:200]}")
    
    return None

def main():
    """Main test function"""
    print("="*60)
    print("SKIN DISEASE PREDICTION API TESTING")
    print("="*60)
    
    # Test without authentication first
    if not test_service_status():
        print("\n⚠️  Service not available. Check if model file exists.")
        return
    
    test_diseases_info()
    
    print("\n" + "="*60)
    print("API ENDPOINTS FOR SKIN DISEASE:")
    print("="*60)
    print("GET    /api/skin-disease/status        - Check service status")
    print("GET    /api/skin-disease/diseases/info - Get diseases info")
    print("POST   /api/skin-disease/predict       - Predict from image (auth required)")
    print("GET    /api/skin-disease/predict/history - Get prediction history (auth)")
    print("="*60)
    
    # Note about authentication
    print("\nNote: /predict endpoint requires JWT authentication")
    print("First register/login as patient, then use the token")
    print("Example: curl -X POST -H 'Authorization: Bearer <token>' -F 'image=@test.jpg' http://localhost:5000/api/skin-disease/predict")
    
    # Test with a sample image if available
    sample_images = [
        'test_skin.jpg',
        'sample.jpg',
        'skin_image.png'
    ]
    
    for img in sample_images:
        if os.path.exists(img):
            print(f"\nFound sample image: {img}")
            print("To test prediction, first get a JWT token from /api/auth/login")
            print("Then run: python test_skin_api.py --predict <image_path> --token <jwt_token>")
            break

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--predict":
        image_path = sys.argv[2] if len(sys.argv) > 2 else "test.jpg"
        token = sys.argv[3] if len(sys.argv) > 3 else None
        test_prediction_with_image(image_path, token)
    else:
        main()