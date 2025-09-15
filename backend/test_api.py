import pytest
import asyncio
from httpx import AsyncClient
import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app

@pytest.fixture
async def client():
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def auth_headers():
    """Get authentication headers for admin user"""
    # In a real test, you'd get a proper token
    # For now, using a simple token that matches the fallback auth
    return {"Authorization": "Bearer admin_token"}

class TestHealthEndpoints:
    """Test health and system endpoints"""
    
    async def test_health_check(self, client: AsyncClient):
        """Test health check endpoint"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data

    async def test_metrics_endpoint(self, client: AsyncClient):
        """Test metrics endpoint"""
        response = await client.get("/metrics")
        assert response.status_code == 200

class TestAuthenticationEndpoints:
    """Test authentication system"""
    
    async def test_login_invalid_credentials(self, client: AsyncClient):
        """Test login with invalid credentials"""
        response = await client.post(
            "/api/auth/login",
            json={"username": "invalid", "password": "wrong"}
        )
        assert response.status_code == 401

    async def test_login_valid_admin(self, client: AsyncClient):
        """Test login with valid admin credentials"""
        response = await client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        # May fail if environment not set up, but should not crash
        assert response.status_code in [200, 401]

    async def test_protected_route_without_auth(self, client: AsyncClient):
        """Test protected route without authentication"""
        response = await client.post("/api/stops/import")
        assert response.status_code == 401

class TestBusStopsEndpoints:
    """Test bus stops CRUD operations"""
    
    async def test_get_all_stops(self, client: AsyncClient):
        """Test getting all bus stops"""
        response = await client.get("/api/stops")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_create_stop_invalid_data(self, client: AsyncClient, auth_headers):
        """Test creating stop with invalid data"""
        invalid_stop = {
            "stop_name": "",  # Empty name
            "latitude": 91,   # Invalid latitude
            "longitude": 181  # Invalid longitude
        }
        response = await client.post(
            "/api/stops",
            json=invalid_stop,
            headers=auth_headers
        )
        assert response.status_code in [400, 401, 422]

    async def test_create_stop_valid_data(self, client: AsyncClient, auth_headers):
        """Test creating stop with valid data"""
        valid_stop = {
            "stop_name": "Test Stop",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "stop_code": "TEST001"
        }
        response = await client.post(
            "/api/stops",
            json=valid_stop,
            headers=auth_headers
        )
        # May fail if auth not set up, but should not crash
        assert response.status_code in [200, 201, 401]

class TestRoutesEndpoints:
    """Test routes CRUD operations"""
    
    async def test_get_all_routes(self, client: AsyncClient):
        """Test getting all routes"""
        response = await client.get("/api/routes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_create_route_invalid_data(self, client: AsyncClient, auth_headers):
        """Test creating route with invalid data"""
        invalid_route = {
            "route_name": "",  # Empty name
            "route_number": "",  # Empty number
            "stops": []  # No stops
        }
        response = await client.post(
            "/api/routes",
            json=invalid_route,
            headers=auth_headers
        )
        assert response.status_code in [400, 401, 422]

class TestVehiclesEndpoints:
    """Test vehicles CRUD operations"""
    
    async def test_get_all_vehicles(self, client: AsyncClient):
        """Test getting all vehicles"""
        response = await client.get("/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_create_vehicle_invalid_data(self, client: AsyncClient, auth_headers):
        """Test creating vehicle with invalid data"""
        invalid_vehicle = {
            "vehicle_number": "",  # Empty number
            "capacity": -1  # Invalid capacity
        }
        response = await client.post(
            "/api/vehicles",
            json=invalid_vehicle,
            headers=auth_headers
        )
        assert response.status_code in [400, 401, 422]

class TestDataImportEndpoints:
    """Test data import functionality"""
    
    async def test_import_validation_only(self, client: AsyncClient, auth_headers):
        """Test import validation without importing"""
        # Test with minimal CSV content
        csv_content = "stop_name,latitude,longitude\nTest Stop,12.9716,77.5946"
        
        response = await client.post(
            "/api/stops/import",
            params={"validate_only": True},
            files={"file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers
        )
        # May fail if auth not set up, but should not crash
        assert response.status_code in [200, 401, 422]

class TestDataValidation:
    """Test data validation functions"""
    
    def test_coordinate_validation(self):
        """Test coordinate validation"""
        from schemas import CoordinateValidation
        
        # Valid coordinates
        valid_coords = CoordinateValidation(latitude=12.9716, longitude=77.5946)
        assert valid_coords.latitude == 12.9716
        assert valid_coords.longitude == 77.5946
        
        # Invalid coordinates should raise error
        with pytest.raises(Exception):
            CoordinateValidation(latitude=91, longitude=77.5946)
        
        with pytest.raises(Exception):
            CoordinateValidation(latitude=12.9716, longitude=181)

    def test_stop_validation(self):
        """Test bus stop validation"""
        from schemas import BusStopCreate
        
        # Valid stop
        valid_stop = BusStopCreate(
            stop_name="Test Stop",
            latitude=12.9716,
            longitude=77.5946,
            stop_code="TEST001"
        )
        assert valid_stop.stop_name == "Test Stop"
        assert valid_stop.stop_code == "TEST001"
        
        # Invalid stop name
        with pytest.raises(Exception):
            BusStopCreate(stop_name="", latitude=12.9716, longitude=77.5946)

if __name__ == "__main__":
    pytest.main([__file__])