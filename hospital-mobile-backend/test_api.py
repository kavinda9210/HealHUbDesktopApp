#!/usr/bin/env python3
"""
Test script for Hospital Management System API
"""
import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"

def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_registration():
    """Test user registration"""
    print("\nTesting user registration...")
    
    # Test data - CHANGE THIS EMAIL FOR EACH TEST
    test_data = {
        "email": f"test_patient_{hash(str(sys.argv))[-6:]}@test.com",
        "password": "Test@1234",
        "role": "patient",
        "full_name": "Test Patient",
        "phone": "1234567890"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=test_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 201:
        print("✓ Registration successful")
        return response.json()['data']['user_id']
    else:
        print("✗ Registration failed")
        return None

def print_api_routes():
    """Print available API routes"""
    print("\n" + "="*60)
    print("HOSPITAL MANAGEMENT SYSTEM API ENDPOINTS")
    print("="*60)
    
    endpoints = [
        ("POST   /api/auth/register", "Register new user (patient/ambulance)"),
        ("POST   /api/auth/verify-email", "Verify email with code"),
        ("POST   /api/auth/login", "User login"),
        ("POST   /api/auth/forgot-password", "Request password reset"),
        ("POST   /api/auth/reset-password", "Reset password with code"),
        ("POST   /api/auth/refresh", "Refresh access token"),
        ("GET    /api/auth/profile", "Get user profile"),
        ("PUT    /api/auth/profile", "Update profile"),
        ("POST   /api/auth/logout", "Logout"),
        ("GET    /api/patient/dashboard", "Patient dashboard"),
        ("GET    /api/patient/appointments", "Get patient appointments"),
        ("POST   /api/patient/appointments", "Create appointment"),
        ("GET    /api/patient/medications", "Get patient medications"),
        ("GET    /api/patient/medicine-reminders", "Get medicine reminders"),
        ("POST   /api/patient/ambulances/nearby", "Find nearby ambulances"),
        ("POST   /api/ambulance/update-location", "Update ambulance location"),
        ("POST   /api/ambulance/availability", "Update availability"),
        ("GET    /api/ambulance/requests", "Get ambulance requests"),
        ("GET    /api/appointment/doctors", "Get available doctors"),
        ("GET    /api/appointment/doctors/{id}/availability", "Get doctor slots"),
        ("POST   /api/medication/prescribe", "Prescribe medication (doctor)"),
        ("POST   /api/payment/pay", "Make payment"),
        ("GET    /api/health", "Health check")
    ]
    
    for endpoint, description in endpoints:
        print(f"{endpoint:45} - {description}")
    
    print("="*60)

def main():
    """Main test function"""
    print("Hospital Management System API Testing")
    print("="*60)
    
    # Test health check
    if not test_health_check():
        print("\n⚠️  API is not running. Please start the server first.")
        print("Run: python run.py")
        sys.exit(1)
    
    # Print API routes
    print_api_routes()
    
    # Test registration (optional)
    if len(sys.argv) > 1 and sys.argv[1] == "--test-registration":
        user_id = test_registration()
        if user_id:
            print(f"\nTest user created with ID: {user_id}")
            print("Please check your email for verification code.")
    
    print("\n✅ API is running and ready!")
    print("\nNext steps:")
    print("1. Update .env file with your Supabase credentials")
    print("2. Test endpoints using Postman or curl")
    print("3. Integrate with your mobile apps")

if __name__ == "__main__":
    main()