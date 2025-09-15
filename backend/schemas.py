from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, validator, root_validator
from datetime import datetime
import re

class BusStopCreate(BaseModel):
    """Schema for creating a new bus stop"""
    stop_name: str = Field(..., min_length=1, max_length=200, description="Name of the bus stop")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate (-90 to 90)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate (-180 to 180)")
    stop_code: Optional[str] = Field(None, max_length=50, description="Unique stop code")
    description: Optional[str] = Field(None, max_length=500, description="Stop description")
    
    @validator('stop_name')
    def validate_stop_name(cls, v):
        if not v or v.strip() == "":
            raise ValueError('Stop name cannot be empty')
        return v.strip()
    
    @validator('stop_code')
    def validate_stop_code(cls, v):
        if v and not re.match(r'^[A-Z0-9_-]+$', v):
            raise ValueError('Stop code must contain only uppercase letters, numbers, hyphens, and underscores')
        return v

class RouteCreate(BaseModel):
    """Schema for creating a new route"""
    route_name: str = Field(..., min_length=1, max_length=200, description="Name of the route")
    route_number: str = Field(..., min_length=1, max_length=20, description="Route number/identifier")
    stops: List[int] = Field(..., min_items=2, description="List of stop IDs in route order")
    description: Optional[str] = Field(None, max_length=500, description="Route description")
    color: Optional[str] = Field("#0066CC", regex=r'^#[0-9A-Fa-f]{6}$', description="Route color (hex format)")
    
    @validator('route_name')
    def validate_route_name(cls, v):
        return v.strip()
    
    @validator('route_number')
    def validate_route_number(cls, v):
        if not re.match(r'^[A-Z0-9\-]+$', v.upper()):
            raise ValueError('Route number must contain only letters, numbers, and hyphens')
        return v.upper()
    
    @validator('stops')
    def validate_stops(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate stops are not allowed in a route')
        return v

class VehicleCreate(BaseModel):
    """Schema for creating a new vehicle"""
    vehicle_number: str = Field(..., min_length=1, max_length=20, description="Vehicle registration number")
    route_id: Optional[int] = Field(None, description="Assigned route ID")
    capacity: Optional[int] = Field(None, ge=1, le=200, description="Passenger capacity")
    vehicle_type: Optional[str] = Field("bus", description="Type of vehicle")
    status: str = Field("inactive", regex=r'^(active|inactive|maintenance)$', description="Vehicle status")
    
    @validator('vehicle_number')
    def validate_vehicle_number(cls, v):
        # Common vehicle number patterns
        if not re.match(r'^[A-Z0-9\-\s]+$', v.upper()):
            raise ValueError('Invalid vehicle number format')
        return v.upper().strip()

class ImportValidation(BaseModel):
    """Schema for validating CSV import data"""
    file_type: str = Field(..., regex=r'^(stops|routes|vehicles)$', description="Type of data being imported")
    validate_only: bool = Field(False, description="Only validate without importing")
    
class CoordinateValidation(BaseModel):
    """Schema for coordinate validation"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    
    @root_validator
    def validate_coordinates(cls, values):
        lat, lon = values.get('latitude'), values.get('longitude')
        
        # Check for obviously invalid coordinates
        if lat == 0 and lon == 0:
            raise ValueError('Coordinates (0,0) are likely invalid')
        
        # Check for coordinates that might be swapped
        if abs(lat) > abs(lon) and abs(lat) > 90:
            raise ValueError('Latitude appears to be out of range')
            
        return values

class UserCredentials(BaseModel):
    """Schema for user authentication"""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    password: str = Field(..., min_length=6, max_length=128, description="Password")
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must contain only letters, numbers, hyphens, and underscores')
        return v.lower()

class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class HealthResponse(BaseModel):
    """Schema for health check response"""
    status: str
    timestamp: datetime
    version: str
    database: bool
    uptime_seconds: float

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime
    
def validate_csv_headers(headers: List[str], required_headers: List[str], optional_headers: List[str] = None) -> Dict[str, Any]:
    """Validate CSV headers against required and optional fields"""
    optional_headers = optional_headers or []
    missing_required = set(required_headers) - set(headers)
    extra_headers = set(headers) - set(required_headers + optional_headers)
    
    validation_result = {
        "valid": len(missing_required) == 0,
        "missing_required": list(missing_required),
        "extra_headers": list(extra_headers),
        "warnings": []
    }
    
    if extra_headers:
        validation_result["warnings"].append(f"Extra columns will be ignored: {', '.join(extra_headers)}")
    
    return validation_result

def validate_import_row(row: Dict[str, Any], row_number: int, schema_class) -> Dict[str, Any]:
    """Validate a single row of import data"""
    try:
        # Create instance to validate
        validated_data = schema_class(**row)
        return {"valid": True, "data": validated_data.dict(), "errors": []}
    except Exception as e:
        return {
            "valid": False, 
            "data": None, 
            "errors": [f"Row {row_number}: {str(e)}"]
        }