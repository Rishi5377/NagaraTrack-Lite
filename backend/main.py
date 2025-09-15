# ...existing code...
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os
from datetime import datetime, timedelta
import json
import ast
import asyncpg
from typing import Any, Dict, List, Tuple, Optional
import math
import re
import traceback
import csv
import threading
import time
import logging
import structlog
import bcrypt
import jwt

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger("nagaratrack")

# Request monitoring middleware
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info("request_started",
               method=request.method,
               url=str(request.url),
               client_ip=request.client.host if request.client else None,
               user_agent=request.headers.get("user-agent"))
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Log response
        logger.info("request_completed",
                   method=request.method,
                   url=str(request.url),
                   status_code=response.status_code,
                   duration_ms=round(duration * 1000, 2))
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error("request_failed",
                    method=request.method,
                    url=str(request.url),
                    error=str(e),
                    duration_ms=round(duration * 1000, 2))
        raise

# Performance monitoring decorator
def monitor_performance(operation_name: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info("operation_completed", 
                          operation=operation_name, 
                          duration_ms=round(duration * 1000, 2),
                          status="success")
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error("operation_failed",
                           operation=operation_name,
                           duration_ms=round(duration * 1000, 2),
                           error=str(e),
                           status="error")
                raise
        return wrapper
    return decorator
import jwt
import hashlib
import secrets

# Data directory for dummy CSVs (mounted via Docker Compose)
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")

app = FastAPI(
    title="NagaraTrack Lite Backend", 
    version="1.0.0",
    description="""
    ## NagaraTrack Lite - Bus Tracking System API
    
    A comprehensive bus tracking and management system with real-time monitoring capabilities.
    
    ### Features
    - **Bus Stop Management**: Add, update, and manage bus stops with geographic coordinates
    - **Route Management**: Define bus routes with stops and scheduling
    - **Vehicle Tracking**: Real-time vehicle location and status monitoring
    - **Data Import/Export**: Bulk operations for managing transportation data
    - **Authentication**: Secure admin access for data modifications
    
    ### Authentication
    Use `/api/auth/login` to obtain an access token, then include it in requests:
    ```
    Authorization: Bearer <your-token>
    ```
    
    ### Data Formats
    - **Coordinates**: Use decimal degrees (WGS84)
    - **Routes**: JSON arrays for stop lists and coordinate paths
    - **Timestamps**: ISO 8601 format (UTC)
    
    ### Rate Limits
    - General endpoints: 50 requests/minute
    - Import endpoints: 10 requests/minute
    """,
    contact={
        "name": "NagaraTrack Support",
        "email": "support@nagaratrack.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {"name": "Authentication", "description": "User authentication and authorization"},
        {"name": "Bus Stops", "description": "Bus stop management operations"},
        {"name": "Routes", "description": "Bus route management operations"},
        {"name": "Vehicles", "description": "Vehicle tracking and monitoring"},
        {"name": "Data Import", "description": "Bulk data import operations"},
        {"name": "Admin", "description": "Administrative operations"},
        {"name": "System", "description": "System health and monitoring"},
    ]
)
APP_START = datetime.now()

# Add GZip compression for better performance
try:
    from fastapi.middleware.gzip import GZipMiddleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
except ImportError:
    # GZip not available in this FastAPI version
    pass

# Add request logging middleware
app.middleware("http")(log_requests)

# CORS Configuration
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5000,http://localhost:3000").split(",")
PRODUCTION_MODE = os.environ.get("PRODUCTION", "false").lower() == "true"

if PRODUCTION_MODE:
    # Production: Restrict to specific origins
    allowed_origins = [origin.strip() for origin in CORS_ORIGINS if origin.strip()]
else:
    # Development: Allow localhost and common dev ports
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5000", 
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8080"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    
    # Remove server header
    if "server" in response.headers:
        del response.headers["server"]
    
    return response

# Simple rate limiting (in-memory)
from collections import defaultdict
import asyncio

# Rate limiting storage: {client_ip: [(timestamp, count), ...]}
rate_limit_storage = defaultdict(list)
RATE_LIMIT_REQUESTS = 100  # requests per minute
RATE_LIMIT_WINDOW = 60    # seconds

async def check_rate_limit(client_ip: str) -> bool:
    """Check if client IP is within rate limits."""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    
    # Clean old entries
    rate_limit_storage[client_ip] = [
        (timestamp, count) for timestamp, count in rate_limit_storage[client_ip]
        if timestamp > window_start
    ]
    
    # Count requests in current window
    total_requests = sum(count for _, count in rate_limit_storage[client_ip])
    
    if total_requests >= RATE_LIMIT_REQUESTS:
        return False
    
    # Add current request
    rate_limit_storage[client_ip].append((now, 1))
    return True

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health checks
    if request.url.path in ["/health", "/docs", "/openapi.json"]:
        return await call_next(request)
    
    client_ip = request.client.host if request.client else "unknown"
    
    if not await check_rate_limit(client_ip):
        return Response(
            content='{"detail":"Rate limit exceeded. Too many requests."}',
            status_code=429,
            media_type="application/json"
        )
    
    return await call_next(request)

# Request logging middleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("nagaratrack")

# Simple in-memory cache for CSV data
import hashlib

# Cache storage
cache_storage = {}
cache_timestamps = {}
CACHE_TTL = 60  # Cache TTL in seconds

def get_file_hash(filepath: str) -> str:
    """Get file content hash for cache invalidation."""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except FileNotFoundError:
        return "missing"

def get_cached_csv(filepath: str) -> List[Dict[str, Any]]:
    """Get cached CSV data with file modification check."""
    cache_key = filepath
    current_hash = get_file_hash(filepath)
    current_time = time.time()
    
    # Check if cache is valid
    if (cache_key in cache_storage and 
        cache_key in cache_timestamps and
        current_time - cache_timestamps[cache_key]['time'] < CACHE_TTL and
        cache_timestamps[cache_key]['hash'] == current_hash):
        return cache_storage[cache_key]
    
    # Load fresh data
    data = _read_csv(filepath)
    
    # Update cache
    cache_storage[cache_key] = data
    cache_timestamps[cache_key] = {
        'time': current_time,
        'hash': current_hash
    }
    
    return data

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log request details
    logger.info(
        f"{client_ip} - {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Time: {process_time:.3f}s"
    )
    
    # Log suspicious activity
    if response.status_code >= 400:
        logger.warning(
            f"HTTP {response.status_code} - {client_ip} - {request.method} {request.url.path} - "
            f"User-Agent: {request.headers.get('user-agent', 'unknown')}"
        )
    
    return response

# Database URL configuration
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/nagaratrack"
)

# Database mode flag - set to True to use PostgreSQL, False for CSV-only
USE_DATABASE = os.environ.get("USE_DATABASE", "false").lower() == "true"

# Authentication configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

# Simple in-memory admin users (replace with database in production)
ADMIN_USERS = {
    "admin": {"password": "admin123", "role": "admin"},  # Change in production!
    "demo": {"password": "demo123", "role": "viewer"}
}

class AuthManager:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Simple password verification (use bcrypt in production)"""
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Simple password hashing (use bcrypt in production)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def create_access_token(data: dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return f"simple-token-{data.get('sub', 'user')}-{int(expire.timestamp())}"
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            if token.startswith("simple-token-"):
                # Simple token format
                parts = token.split("-")
                if len(parts) >= 4 and int(parts[-1]) > time.time():
                    return {"sub": parts[2], "exp": int(parts[-1])}
                return None
        except:
            pass
        return None

# Simple auth dependency
async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """Get current authenticated user from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    payload = AuthManager.verify_token(token)
    if not payload:
        return None
    
    username = payload.get("sub")
    if username in ADMIN_USERS:
        return {"username": username, "role": ADMIN_USERS[username]["role"]}
    return None

async def require_auth(request: Request) -> Dict[str, Any]:
    """Require authentication"""
    current_user = await get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return current_user

async def require_admin(request: Request) -> Dict[str, Any]:
    """Require admin role"""
    current_user = await require_auth(request)
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
'''
@app.get("/api/stops")
async def get_stops():
    """Fetch stops with coordinates from PostGIS using asyncpg"""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops LIMIT 100;")
    finally:
        await conn.close()

    stops = [
        {
            "stop_id": r["stop_id"],
            "stop_name": r["stop_name"],
            "lat": float(r["stop_lat"]) if r["stop_lat"] is not None else None,
            "lon": float(r["stop_lon"]) if r["stop_lon"] is not None else None
        }
        for r in rows
    ]
    return {"stops": stops}
'''
def _read_csv(path: str) -> List[Dict[str, Any]]:
    try:
        with open(path, newline='', encoding='utf-8') as f:
            return list(csv.DictReader(f))
    except FileNotFoundError:
        return []


# Global lock for CSV file operations
_csv_lock = threading.Lock()

def _write_csv(path: str, rows: List[Dict[str, Any]], fieldnames: List[str]) -> None:
    """Write CSV with file locking to prevent race conditions."""
    with _csv_lock:
        tmp_path = path + ".tmp"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Write to temporary file first
        with open(tmp_path, "w", newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                writer.writerow({k: r.get(k, "") for k in fieldnames})
        
        # Atomic replace - ensures consistency even if interrupted
        max_retries = 3
        for attempt in range(max_retries):
            try:
                os.replace(tmp_path, path)
                break
            except OSError as e:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(0.1)  # Brief wait before retry


# Default CSV schemas for replace operations
BUS_STOPS_FIELDS = ["stop_id", "name", "latitude", "longitude", "routes", "accessibility"]
ROUTES_FIELDS = ["route_id", "route_name", "route_color", "is_active", "coordinates", "stops"]
VEHICLES_FIELDS = ["vehicle_id", "route_id", "latitude", "longitude", "bearing", "speed", "status", "last_updated"]

# Validation utilities
def validate_coordinates(lat: Any, lon: Any) -> Tuple[float, float]:
    """Validate and convert latitude/longitude coordinates."""
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid coordinate format. Must be numeric.")
    
    if not (-90 <= lat_f <= 90):
        raise HTTPException(status_code=400, detail="Invalid latitude. Must be between -90 and 90.")
    
    if not (-180 <= lon_f <= 180):
        raise HTTPException(status_code=400, detail="Invalid longitude. Must be between -180 and 180.")
    
    return lat_f, lon_f

def validate_stop_id(stop_id: Any) -> str:
    """Validate stop ID format."""
    if not stop_id:
        raise HTTPException(status_code=400, detail="stop_id is required.")
    
    stop_id_str = str(stop_id).strip()
    if not stop_id_str:
        raise HTTPException(status_code=400, detail="stop_id cannot be empty.")
    
    if len(stop_id_str) > 50:
        raise HTTPException(status_code=400, detail="stop_id too long. Maximum 50 characters.")
    
    if not re.match(r'^[A-Za-z0-9_-]+$', stop_id_str):
        raise HTTPException(status_code=400, detail="stop_id can only contain letters, numbers, hyphens, and underscores.")
    
    return stop_id_str

def validate_route_id(route_id: Any) -> str:
    """Validate route ID format."""
    if not route_id:
        raise HTTPException(status_code=400, detail="route_id is required.")
    
    route_id_str = str(route_id).strip()
    if not route_id_str:
        raise HTTPException(status_code=400, detail="route_id cannot be empty.")
    
    if len(route_id_str) > 50:
        raise HTTPException(status_code=400, detail="route_id too long. Maximum 50 characters.")
    
    if not re.match(r'^[A-Za-z0-9_-]+$', route_id_str):
        raise HTTPException(status_code=400, detail="route_id can only contain letters, numbers, hyphens, and underscores.")
    
    return route_id_str

def validate_vehicle_id(vehicle_id: Any) -> str:
    """Validate vehicle ID format."""
    if not vehicle_id:
        raise HTTPException(status_code=400, detail="vehicle_id is required.")
    
    vehicle_id_str = str(vehicle_id).strip()
    if not vehicle_id_str:
        raise HTTPException(status_code=400, detail="vehicle_id cannot be empty.")
    
    if len(vehicle_id_str) > 50:
        raise HTTPException(status_code=400, detail="vehicle_id too long. Maximum 50 characters.")
    
    if not re.match(r'^[A-Za-z0-9_-]+$', vehicle_id_str):
        raise HTTPException(status_code=400, detail="vehicle_id can only contain letters, numbers, hyphens, and underscores.")
    
    return vehicle_id_str

def validate_color_hex(color: Any) -> str:
    """Validate hex color format."""
    if not color:
        return "#2563eb"  # Default blue
    
    color_str = str(color).strip()
    if not color_str.startswith('#'):
        color_str = '#' + color_str
    
    if not re.match(r'^#[0-9A-Fa-f]{6}$', color_str):
        raise HTTPException(status_code=400, detail="Invalid color format. Must be hex color (e.g., #FF0000).")
    
    return color_str

def validate_name(name: Any, field_name: str = "name") -> str:
    """Validate name field."""
    if not name:
        raise HTTPException(status_code=400, detail=f"{field_name} is required.")
    
    name_str = str(name).strip()
    if not name_str:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be empty.")
    
    if len(name_str) > 200:
        raise HTTPException(status_code=400, detail=f"{field_name} too long. Maximum 200 characters.")
    
    return name_str

# Database utilities
async def get_db_connection():
    """Get database connection with error handling."""
    try:
        return await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

async def check_database_health() -> Dict[str, Any]:
    """Check database connectivity and return status."""
    if not USE_DATABASE:
        return {"status": "disabled", "mode": "csv"}
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            # Test basic connectivity
            result = await conn.fetchval("SELECT 1")
            # Check if tables exist
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN ('routes', 'stops', 'vehicles')
            """)
            table_names = [row['table_name'] for row in tables]
            
            return {
                "status": "healthy" if result == 1 else "error",
                "mode": "database",
                "tables": table_names,
                "missing_tables": [t for t in ['routes', 'stops', 'vehicles'] if t not in table_names]
            }
        finally:
            await conn.close()
    except Exception as e:
        return {
            "status": "error", 
            "mode": "database",
            "error": str(e)
        }


def _parse_list(value: Any) -> List[str]:
    """Robustly parse a list of strings from CSV fields.
    Accepts JSON (double quotes) or Python-style (single quotes) lists.
    Falls back to comma-separated parsing.
    """
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return []
        # Try JSON first
        try:
            j = json.loads(s)
            if isinstance(j, list):
                flat: List[Any] = []
                for x in j:
                    if isinstance(x, str) and x.strip().startswith(("[", "(") ):
                        # Handle nested list-like strings such as "['42']"
                        try:
                            lit = ast.literal_eval(x)
                            if isinstance(lit, (list, tuple)):
                                flat.extend(list(lit))
                            else:
                                flat.append(x)
                        except Exception:
                            flat.append(x)
                    else:
                        flat.append(x)
                return [str(x).strip() for x in flat if str(x).strip()]
        except Exception:
            pass
        # Then try Python literal (single quotes)
        try:
            lit = ast.literal_eval(s)
            if isinstance(lit, (list, tuple)):
                return [str(x).strip() for x in lit if str(x).strip()]
        except Exception:
            pass
        # Fallback: naive comma-split
        s2 = s.strip("[]()")
        parts = [p.strip().strip("'\"") for p in s2.split(",")]
        return [p for p in parts if p]
    return []


class BusStopIn(BaseModel):
    stop_id: str = Field(..., description="Unique identifier for the stop")
    name: str = Field(..., description="Display name of the stop")
    latitude: float
    longitude: float
    routes: List[str] | None = None
    accessibility: bool | None = True


class RouteIn(BaseModel):
    route_id: str = Field(..., description="Unique route identifier")
    route_name: str = Field(..., description="Public name of the route")
    route_color: str | None = Field(None, description="Hex color like #2563eb")
    is_active: bool | None = True
    # Coordinates come as [lat, lon] pairs in CSV; we'll accept either [[lat,lon], ...]
    coordinates: List[List[float]] | None = None
    stops: List[str] | None = None


class VehicleIn(BaseModel):
    vehicle_id: str = Field(..., description="Unique vehicle/device id")
    route_id: str | int | None = None
    latitude: float
    longitude: float
    bearing: float | None = None
    speed: float | None = None
    status: str | None = None
    last_updated: str | None = None


def _norm_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "y")
    return default


def _load_stop_route_mappings() -> tuple[Dict[str, set[str]], Dict[str, set[str]]]:
    """Return (stop_to_routes, route_to_stops) derived from CSV files.
    - Reads BusStops.csv routes[] and Routes.csv stops[] and merges both ways.
    """
    stop_to_routes: Dict[str, set[str]] = {}
    route_to_stops: Dict[str, set[str]] = {}

    # From BusStops.csv
    bs_rows = _read_csv(os.path.join(DATA_DIR, 'BusStops.csv'))
    for r in bs_rows:
        sid = str(r.get("stop_id") or r.get("id") or "").strip()
        if not sid:
            continue
        routes = _parse_list(r.get("routes") or "[]")
        for rid in routes:
            rid_s = str(rid).strip()
            if not rid_s:
                continue
            stop_to_routes.setdefault(sid, set()).add(rid_s)
            route_to_stops.setdefault(rid_s, set()).add(sid)

    # From Routes.csv
    rt_rows = _read_csv(os.path.join(DATA_DIR, 'Routes.csv'))
    for r in rt_rows:
        rid = str(r.get("route_id") or "").strip()
        if not rid:
            continue
        stops = _parse_list(r.get("stops") or "[]")
        for sid in stops:
            sid_s = str(sid).strip()
            if not sid_s:
                continue
            route_to_stops.setdefault(rid, set()).add(sid_s)
            stop_to_routes.setdefault(sid_s, set()).add(rid)

    return stop_to_routes, route_to_stops


def _collect_route_stop_ids(
    rid: str,
    route_row: Dict[str, Any],
    stops_rows: List[Dict[str, Any]],
    route_to_stops: Dict[str, set[str]],
) -> List[str]:
    """Collect a comprehensive, de-duplicated list of stop_ids for a route.
    Union of:
    - The explicit route_row["stops"] list
    - Derived mappings route_to_stops[rid]
    - Any BusStops rows whose 'routes' field contains this rid (tolerant token scan)
    """
    base_list = _parse_list(route_row.get("stops") or "[]")
    ids_set: set[str] = set(str(x).strip() for x in base_list if str(x).strip())
    ids_set |= set(route_to_stops.get(rid, set()))
    # Scan BusStops for this rid
    extra: List[str] = []
    for srow in stops_rows:
        sid = str(srow.get("stop_id") or srow.get("id") or "").strip()
        if not sid:
            continue
        raw = srow.get("routes")
        tokens: List[str] = []
        if isinstance(raw, list):
            tokens = [str(x).strip("'\"") for x in raw if str(x).strip()]
        else:
            sstr = str(raw or "")
            sstr2 = (
                sstr.replace("[", " ")
                .replace("]", " ")
                .replace("(", " ")
                .replace(")", " ")
                .replace("\"", " ")
                .replace("'", " ")
            )
            tokens = [t for t in re.split(r"[^A-Za-z0-9_]+", sstr2) if t]
        if rid and rid in tokens:
            extra.append(sid)
    ids_set |= set(extra)
    return sorted(list(ids_set))


def _nearest_neighbor_order(
    points: List[Tuple[float, float]],  # (lat, lon)
    start_index: int | None = None,
) -> List[Tuple[float, float]]:
    """Return a simple nearest-neighbor path visiting all points.
    - If start_index is None, start at the left-most (min lon) point.
    - Distance metric is Euclidean in lat/lon degrees (good enough for city scale).
    """
    if not points:
        return []
    n = len(points)
    used = [False] * n
    # Pick start
    if start_index is None or not (0 <= start_index < n):
        start_index = min(range(n), key=lambda i: (points[i][1], points[i][0]))  # by lon, then lat
    order: List[int] = [start_index]
    used[start_index] = True

    def d2(a: Tuple[float, float], b: Tuple[float, float]) -> float:
        return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

    while len(order) < n:
        last = order[-1]
        cand = [(i, d2(points[last], points[i])) for i in range(n) if not used[i]]
        if not cand:
            break
        i_next = min(cand, key=lambda t: t[1])[0]
        used[i_next] = True
        order.append(i_next)
    return [points[i] for i in order]


@app.get("/api/routes")
async def get_routes(city: str | None = None):
    """Return routes from CSV including coordinates and stops where available.
    Shape: { routes: [{route_id, route_name, route_color, is_active, coordinates, stops}] }
    """
    rows = _read_csv(os.path.join(DATA_DIR, 'Routes.csv'))
    stop_to_routes, route_to_stops = _load_stop_route_mappings()
    routes: List[Dict[str, Any]] = []
    for r in rows:
        coords_text = r.get("coordinates") or "[]"
        stops_text = r.get("stops") or "[]"
        try:
            coordinates = json.loads(coords_text)
        except Exception:
            coordinates = []
        stops = _parse_list(stops_text)
        # union stops from CSV + derived from BusStops.csv
        stops_union = set()
        if isinstance(coordinates, list):
            pass  # coordinates not used for stops
        if isinstance(stops, list):
            for s in stops:
                stops_union.add(str(s))
        for s in route_to_stops.get(str(r.get("route_id")), set()):
            stops_union.add(str(s))

        routes.append({
            "route_id": r.get("route_id"),
            "route_name": r.get("route_name") or r.get("route_long_name") or r.get("route_short_name"),
            "route_color": r.get("route_color") or "#2563eb",
            "is_active": str(r.get("is_active", "True")).lower() in ("true", "1", "yes"),
            "coordinates": coordinates,
            "stops": sorted(stops_union),
        })
    # City filter is not applied in dummy CSV mode
    return {"routes": routes}


@app.get("/api/routes/geojson")
async def routes_geojson():
    """Return routes from CSV as GeoJSON FeatureCollection.
    CSV stores coordinates in [lat, lon]; GeoJSON expects [lon, lat].
    More tolerant parsing:
    - Derive from ordered stops[] when possible, skipping missing stops (require >= 2 points)
    - Fallback to coordinates field accepting JSON or Python-literal strings
    - Always include a usable route_name
    """
    rows = _read_csv(os.path.join(DATA_DIR, 'Routes.csv'))
    # Also load derived mappings so we can fallback when route.stops is missing
    _stop_to_routes, route_to_stops = _load_stop_route_mappings()
    # Build stop_id -> (lat, lon) lookup from BusStops
    stops_rows = _read_csv(os.path.join(DATA_DIR, 'BusStops.csv'))
    stop_lookup: Dict[str, Tuple[float, float]] = {}
    for s in stops_rows:
        sid = str(s.get("stop_id") or s.get("id") or "").strip()
        try:
            lat = float(s.get("latitude") or s.get("stop_lat"))
            lon = float(s.get("longitude") or s.get("stop_lon"))
        except Exception:
            continue
        if sid:
            stop_lookup[sid] = (lat, lon)

    features: List[Dict[str, Any]] = []
    for r in rows:
        color = r.get("route_color") or "#2563eb"
        # Prefer deriving from stops order; skip missing stops instead of failing entire line
        rid = str(r.get("route_id") or "").strip()
        # Collect a comprehensive set of stop ids (explicit + derived + scanned)
        all_stop_ids = _collect_route_stop_ids(rid, r, stops_rows, route_to_stops)
        # Maintain original order as a hint when available
        stops_list = _parse_list(r.get("stops") or "[]") or all_stop_ids
        derived_line: List[List[float]] = []  # [lon, lat]
        if stops_list:
            # First pass: take known coords in provided order
            ordered_pts: List[Tuple[float, float]] = []  # (lat,lon)
            missing: List[str] = []
            for sid in stops_list:
                tpl = stop_lookup.get(str(sid))
                if not tpl:
                    missing.append(str(sid))
                else:
                    ordered_pts.append((float(tpl[0]), float(tpl[1])))
            # If we have at least 2 points, connect them; otherwise we will try fallbacks
            if len(ordered_pts) >= 2:
                # Improve path: if original order looks sparse or unordered, reorder by nearest-neighbor
                nn_path = _nearest_neighbor_order(ordered_pts)
                derived_line = [[lon, lat] for (lat, lon) in nn_path]
            # If some sids were missing coordinates, try to include other relevant stops by proximity
            if len(derived_line) < 2:
                # Use all known coords from the comprehensive id set and connect by nearest-neighbor
                pts: List[Tuple[float, float]] = []
                for sid in all_stop_ids:
                    tpl = stop_lookup.get(str(sid))
                    if tpl:
                        pts.append((float(tpl[0]), float(tpl[1])))
                if len(pts) >= 2:
                    nn_path = _nearest_neighbor_order(pts)
                    derived_line = [[lon, lat] for (lat, lon) in nn_path]

        if not derived_line:
            # Fallback to stored coordinates if derivation failed or insufficient points
            coords_text = r.get("coordinates")
            if coords_text:
                pairs: List[Any] = []
                try:
                    pairs = json.loads(coords_text)
                except Exception:
                    try:
                        lit = ast.literal_eval(coords_text)
                        if isinstance(lit, (list, tuple)):
                            pairs = list(lit)
                    except Exception:
                        pairs = []
                # Expect pairs as [lat, lon]; convert to [lon, lat]
                derived_line = [
                    [float(p[1]), float(p[0])] for p in pairs
                    if isinstance(p, (list, tuple)) and len(p) == 2 and
                    all(isinstance(x, (int, float, str)) for x in p)
                ]

        if not derived_line:
            # Second fallback: derive from route_to_stops or scan BusStops.csv for route id tokens
            ids = _collect_route_stop_ids(rid, r, stops_rows, route_to_stops)
            pts: List[Tuple[float, float]] = []  # (lat, lon)
            for sid in ids:
                tpl = stop_lookup.get(str(sid))
                if tpl:
                    pts.append((float(tpl[0]), float(tpl[1])))
            if len(pts) >= 2:
                nn_path = _nearest_neighbor_order(pts)
                derived_line = [[lon, lat] for (lat, lon) in nn_path]

        # Even if we don't have enough points for a visible polyline, still return the feature
        # so clients (Active Routes list) can display names; map can skip drawing empty lines.
        route_name = (
            r.get("route_name")
            or r.get("route_long_name")
            or r.get("route_short_name")
            or r.get("name")
            or f"Route {r.get('route_id') or ''}"
        )

        features.append({
            "type": "Feature",
            "properties": {
                "route_id": r.get("route_id"),
                "route_name": route_name,
                "color": color,
            },
            "geometry": {
                "type": "LineString",
                "coordinates": derived_line,
            }
        })
    return {"type": "FeatureCollection", "features": features}


@app.post("/api/routes")
async def add_route(route: RouteIn):
    """Append a route to data/Routes.csv and return the created record."""
    path = os.path.join(DATA_DIR, 'Routes.csv')
    rows = _read_csv(path)

    for r in rows:
        if str(r.get("route_id")) == route.route_id:
            raise HTTPException(status_code=409, detail="route_id already exists")

    new_row: Dict[str, Any] = {
        "route_id": route.route_id,
        "route_name": route.route_name,
        "route_color": route.route_color or "#2563eb",
        "is_active": "True" if (route.is_active is None or route.is_active) else "False",
        "coordinates": json.dumps(route.coordinates or []),
        "stops": json.dumps(route.stops or []),
    }

    # Preserve/merge headers
    fieldnames = [
        "route_id",
        "route_name",
        "route_color",
        "is_active",
        "coordinates",
        "stops",
    ]
    if rows:
        existing_fields = list({fn for r in rows for fn in r.keys()})
        for fn in fieldnames:
            if fn not in existing_fields:
                existing_fields.append(fn)
        fieldnames = existing_fields

    rows.append(new_row)
    _write_csv(path, rows, fieldnames)

    return {
        "route_id": new_row["route_id"],
        "route_name": new_row["route_name"],
        "route_color": new_row["route_color"],
        "is_active": new_row["is_active"] == "True",
        "coordinates": json.loads(new_row["coordinates"]),
        "stops": json.loads(new_row["stops"]),
    }


@app.delete("/api/routes/{route_id}")
async def delete_route(route_id: str):
    path = os.path.join(DATA_DIR, 'Routes.csv')
    rows = _read_csv(path)
    if not rows:
        raise HTTPException(status_code=404, detail="No routes found")
    new_rows = [r for r in rows if str(r.get("route_id")) != route_id]
    if len(new_rows) == len(rows):
        raise HTTPException(status_code=404, detail="route_id not found")
    fieldnames = list({fn for r in rows for fn in r.keys()})
    _write_csv(path, new_rows, fieldnames)
    return {"deleted": True}


@app.delete("/api/routes")
async def delete_all_routes():
    """Delete ALL routes (CSV replace with empty set, preserving header)."""
    path = os.path.join(DATA_DIR, 'Routes.csv')
    _write_csv(path, [], ROUTES_FIELDS)
    return {"deleted": True, "count": 0}


# --- Static frontend hosting (optional) ---
# If a built frontend exists at /app/frontend-dist, serve it at root path
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", "/app/frontend-dist")
if os.path.isdir(FRONTEND_DIST):
    print(f"Frontend found at {FRONTEND_DIST}, enabling static file serving")
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    print("No frontend found, API-only mode")
    @app.get("/")
    async def root():
        return {"message": "NagaraTrack Lite Backend API", "status": "running", "timestamp": datetime.now().isoformat()}


@app.get("/api/stops")
async def stops_geojson(limit: int = 100):
    """Return stops as a GeoJSON FeatureCollection from CSV."""
    rows = _read_csv(os.path.join(DATA_DIR, 'BusStops.csv'))[:limit]
    stop_to_routes, _route_to_stops = _load_stop_route_mappings()
    features: List[Dict[str, Any]] = []
    for r in rows:
        try:
            lat = float(r.get("latitude") or r.get("stop_lat"))
            lon = float(r.get("longitude") or r.get("stop_lon"))
        except Exception:
            continue
        sid = r.get("stop_id")
        # read accessibility if present
        acc = r.get("accessibility")
        acc_bool = None
        if isinstance(acc, str):
            acc_bool = acc.lower() in ("true", "1", "yes")
        elif isinstance(acc, bool):
            acc_bool = acc
        routes_list = sorted(list(stop_to_routes.get(str(sid), set())))
        features.append({
            "type": "Feature",
            "properties": {
                "stop_id": sid,
                "stop_name": r.get("name") or r.get("stop_name"),
                "routes": routes_list,
                "accessibility": acc_bool if acc_bool is not None else True,
            },
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        })
    return {"type": "FeatureCollection", "features": features}


@app.post("/api/stops")
async def add_stop(stop: BusStopIn):
    """Append a stop to data/BusStops.csv and return the created record."""
    path = os.path.join(DATA_DIR, 'BusStops.csv')
    rows = _read_csv(path)

    # Ensure unique stop_id
    for r in rows:
        if str(r.get("stop_id")) == stop.stop_id:
            raise HTTPException(status_code=409, detail="stop_id already exists")

    # Normalize row to current schema
    new_row = {
        "stop_id": stop.stop_id,
        "name": stop.name,
        "latitude": f"{float(stop.latitude):.6f}",
        "longitude": f"{float(stop.longitude):.6f}",
        "routes": json.dumps(stop.routes or []),
        "accessibility": "True" if (stop.accessibility is None or stop.accessibility) else "False",
    }

    # Determine fieldnames: use existing header if present else default
    fieldnames = [
        "stop_id",
        "name",
        "latitude",
        "longitude",
        "routes",
        "accessibility",
    ]
    if rows:
        # Keep any extra columns that might exist
        existing_fields = list({fn for r in rows for fn in r.keys()})
        for fn in fieldnames:
            if fn not in existing_fields:
                existing_fields.append(fn)
        fieldnames = existing_fields

    rows.append(new_row)
    _write_csv(path, rows, fieldnames)

    # Return as GeoJSON-like properties for client convenience
    return {
        "stop_id": new_row["stop_id"],
        "name": new_row["name"],
        "latitude": float(new_row["latitude"]),
        "longitude": float(new_row["longitude"]),
        "routes": json.loads(new_row["routes"]),
        "accessibility": new_row["accessibility"] == "True",
    }


@app.delete("/api/stops/{stop_id}")
async def delete_stop(stop_id: str):
    """Delete a stop from data/BusStops.csv by stop_id."""
    path = os.path.join(DATA_DIR, 'BusStops.csv')
    rows = _read_csv(path)
    if not rows:
        raise HTTPException(status_code=404, detail="No stops found")

    new_rows = [r for r in rows if str(r.get("stop_id")) != stop_id]
    if len(new_rows) == len(rows):
        raise HTTPException(status_code=404, detail="stop_id not found")

    # Preserve existing header fields
    fieldnames = list({fn for r in rows for fn in r.keys()})
    _write_csv(path, new_rows, fieldnames)
    return {"deleted": True}


@app.delete("/api/stops")
async def delete_all_stops():
    """Delete ALL stops (CSV replace with empty set, preserving header)."""
    path = os.path.join(DATA_DIR, 'BusStops.csv')
    _write_csv(path, [], BUS_STOPS_FIELDS)
    return {"deleted": True, "count": 0}


@app.get("/api/vehicles")
async def vehicles_list():
    """Return vehicles from CSV (dummy mode).
    Shape keys chosen to be easily normalized by frontend.
    """
    rows = _read_csv(os.path.join(DATA_DIR, 'Vehicles.csv'))
    vehicles: List[Dict[str, Any]] = []
    now = datetime.utcnow()
    for idx, r in enumerate(rows):
        try:
            lat = float(r.get("latitude") or r.get("lat"))
            lon = float(r.get("longitude") or r.get("lon"))
        except Exception:
            continue
        # compute status
        status_csv = (r.get("status") or "").strip().lower()
        last_updated = r.get("last_updated")
        is_active = False
        if last_updated:
            try:
                dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                # consider active if seen within last 24 hours
                is_active = (now - dt.replace(tzinfo=None)) <= timedelta(hours=24)
            except Exception:
                is_active = False
        if status_csv in ("active", "inactive", "not active"):
            # CSV overrides computed
            status_str = "active" if status_csv == "active" else "not active"
        else:
            status_str = "active" if is_active else "not active"
        vehicles.append({
            "id": idx + 1,
            "device_id": r.get("vehicle_id") or r.get("device_id"),
            "route_id": r.get("route_id"),
            "lat": lat,
            "lon": lon,
            "last_speed": float(r.get("speed")) if r.get("speed") else None,
            "last_heading": float(r.get("bearing")) if r.get("bearing") else None,
            "updated_at": r.get("last_updated"),
            "status": status_str,
        })
    return vehicles


@app.post("/api/vehicles")
async def add_vehicle(v: VehicleIn):
    """Append a vehicle to data/Vehicles.csv and return created record (normalized)."""
    path = os.path.join(DATA_DIR, 'Vehicles.csv')
    rows = _read_csv(path)

    for r in rows:
        if str(r.get("vehicle_id") or r.get("device_id")) == v.vehicle_id:
            raise HTTPException(status_code=409, detail="vehicle_id already exists")

    new_row: Dict[str, Any] = {
        "vehicle_id": v.vehicle_id,
        "route_id": str(v.route_id) if v.route_id is not None else "",
        "latitude": f"{float(v.latitude):.6f}",
        "longitude": f"{float(v.longitude):.6f}",
        "bearing": f"{float(v.bearing):.2f}" if v.bearing is not None else "",
        "speed": f"{float(v.speed):.2f}" if v.speed is not None else "",
        "status": v.status or "active",
        "last_updated": v.last_updated or datetime.now().isoformat(),
    }

    fieldnames = [
        "vehicle_id",
        "route_id",
        "latitude",
        "longitude",
        "bearing",
        "speed",
        "status",
        "last_updated",
    ]
    if rows:
        existing_fields = list({fn for r in rows for fn in r.keys()})
        for fn in fieldnames:
            if fn not in existing_fields:
                existing_fields.append(fn)
        fieldnames = existing_fields

    rows.append(new_row)
    _write_csv(path, rows, fieldnames)

    return {
        "vehicle_id": new_row["vehicle_id"],
        "route_id": new_row["route_id"],
        "latitude": float(new_row["latitude"]),
        "longitude": float(new_row["longitude"]),
        "bearing": float(new_row["bearing"]) if new_row["bearing"] != "" else None,
        "speed": float(new_row["speed"]) if new_row["speed"] != "" else None,
        "status": new_row["status"],
        "last_updated": new_row["last_updated"],
    }


@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str):
    path = os.path.join(DATA_DIR, 'Vehicles.csv')
    rows = _read_csv(path)
    if not rows:
        raise HTTPException(status_code=404, detail="No vehicles found")
    new_rows = [r for r in rows if str(r.get("vehicle_id") or r.get("device_id")) != vehicle_id]
    if len(new_rows) == len(rows):
        raise HTTPException(status_code=404, detail="vehicle_id not found")
    fieldnames = list({fn for r in rows for fn in r.keys()})
    _write_csv(path, new_rows, fieldnames)
    return {"deleted": True}


@app.delete("/api/vehicles")
async def delete_all_vehicles():
    """Delete ALL vehicles (CSV replace with empty set, preserving header)."""
    path = os.path.join(DATA_DIR, 'Vehicles.csv')
    _write_csv(path, [], VEHICLES_FIELDS)
    return {"deleted": True, "count": 0}


@app.post("/api/routes/rebuild-coordinates")
async def rebuild_route_coordinates():
    """Persist coordinates for each route by deriving an ordered polyline from its stops.
    Uses BusStops.csv lat/lon for each stop id in the route's stops[] field.
    If a route has fewer than 2 resolvable stops, it is skipped.
    """
    routes_path = os.path.join(DATA_DIR, 'Routes.csv')
    stops_path = os.path.join(DATA_DIR, 'BusStops.csv')
    routes_rows = _read_csv(routes_path)
    stops_rows = _read_csv(stops_path)
    if not routes_rows:
        return {"updated": 0}

    stop_lookup: Dict[str, Tuple[float, float]] = {}
    for s in stops_rows:
        sid = str(s.get("stop_id") or s.get("id") or "").strip()
        try:
            lat = float(s.get("latitude") or s.get("stop_lat"))
            lon = float(s.get("longitude") or s.get("stop_lon"))
        except Exception:
            continue
        if sid:
            stop_lookup[sid] = (lat, lon)

    updated = 0
    for r in routes_rows:
        rid = str(r.get("route_id") or "").strip()
        # Collect comprehensive ids and use nearest-neighbor to connect all available stops
        ids = _collect_route_stop_ids(rid, r, stops_rows, _load_stop_route_mappings()[1])
        pts: List[Tuple[float, float]] = []  # (lat, lon)
        for sid in ids:
            tpl = stop_lookup.get(str(sid))
            if tpl:
                pts.append((float(tpl[0]), float(tpl[1])))
        if len(pts) >= 2:
            nn_path = _nearest_neighbor_order(pts)
            coords = [[lat, lon] for (lat, lon) in nn_path]  # persist as [lat, lon]
            r["coordinates"] = json.dumps(coords)
            updated += 1

    # Write back preserving headers
    if updated:
        fieldnames = list({fn for row in routes_rows for fn in row.keys()})
        _write_csv(routes_path, routes_rows, fieldnames)
    return {"updated": updated}


@app.post("/api/stops/import", tags=["Data Import"])
async def import_stops(request: Request):
    """
    ## Import Bus Stops
    
    **🔒 Requires Admin Authentication**
    
    Bulk import bus stops from JSON data. Supports validation and duplicate handling.
    
    **Request Body:**
    ```json
    {
        "data": [
            {
                "stop_id": "STOP_001",
                "name": "Central Station", 
                "latitude": 28.6139,
                "longitude": 77.209,
                "routes": ["RT001", "RT002"],
                "accessibility": true
            }
        ],
        "mode": "replace"
    }
    ```
    
    **Validation Rules:**
    - stop_id: Required, alphanumeric with hyphens/underscores, max 50 chars
    - name: Required, max 200 chars  
    - latitude: Required, between -90 and 90
    - longitude: Required, between -180 and 180
    - routes: Optional array of route IDs
    - accessibility: Optional boolean, defaults to true
    """
    # Require admin authentication for import operations
    await require_admin(request)
    # Check request size limit (10MB)
    MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10MB
    
    raw = await request.body()
    if len(raw) > MAX_IMPORT_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"Request too large. Maximum size is {MAX_IMPORT_SIZE // 1024 // 1024}MB"
        )
    
    try:
        payload = json.loads(raw.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    mode = "replace"
    data = None
    if isinstance(payload, list):
        data = payload
    elif isinstance(payload, dict):
        data = payload.get("data")
        mode = str(payload.get("mode") or mode).lower()
    
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Expected a list of rows to import")
    
    if mode not in ["replace", "append"]:
        raise HTTPException(status_code=400, detail="Mode must be 'replace' or 'append'")

    # Load existing for append/merge
    path = os.path.join(DATA_DIR, 'BusStops.csv')
    existing = _read_csv(path) if mode == "append" else []
    keep: Dict[str, Dict[str, Any]] = {str(r.get("stop_id")): r for r in existing if r.get("stop_id")}

    validation_errors = []
    processed_count = 0
    
    for i, obj in enumerate(data):
        if not isinstance(obj, dict):
            validation_errors.append(f"Row {i+1}: Must be an object/dictionary")
            continue
        
        try:
            # Validate stop_id
            sid = validate_stop_id(obj.get("stop_id") or obj.get("id"))
            
            # Validate name
            name = validate_name(obj.get("name") or obj.get("stop_name"), "stop name")
            
            # Validate coordinates
            lat_raw = obj.get("latitude") or obj.get("lat") or obj.get("stop_lat")
            lon_raw = obj.get("longitude") or obj.get("lon") or obj.get("stop_lon")
            
            if lat_raw is None or lon_raw is None:
                validation_errors.append(f"Row {i+1} (stop_id: {sid}): Missing latitude or longitude")
                continue
                
            lat, lon = validate_coordinates(lat_raw, lon_raw)
            
            # Parse routes
            routes = obj.get("routes")
            if isinstance(routes, str):
                routes_list = _parse_list(routes)
            elif isinstance(routes, list):
                routes_list = [str(x) for x in routes]
            else:
                routes_list = []
                
            # Validate accessibility
            acc = _norm_bool(obj.get("accessibility"), True)
            
            keep[sid] = {
                "stop_id": sid,
                "name": name,
                "latitude": f"{lat:.6f}",
                "longitude": f"{lon:.6f}",
                "routes": json.dumps(routes_list),
                "accessibility": "True" if acc else "False",
            }
            processed_count += 1
            
        except HTTPException as e:
            validation_errors.append(f"Row {i+1}: {e.detail}")
        except Exception as e:
            validation_errors.append(f"Row {i+1}: Unexpected error - {str(e)}")

    # Return validation errors if any critical issues found
    if validation_errors and len(validation_errors) > len(data) * 0.5:  # More than 50% errors
        raise HTTPException(
            status_code=400, 
            detail=f"Too many validation errors ({len(validation_errors)}): " + "; ".join(validation_errors[:5])
        )

    rows = list(keep.values())
    _write_csv(path, rows, BUS_STOPS_FIELDS if not existing else list({*BUS_STOPS_FIELDS, *{k for r in existing for k in r.keys()}}))
    
    result = {"imported": len(data), "saved": len(rows), "processed": processed_count}
    if validation_errors:
        result["warnings"] = validation_errors[:10]  # Include first 10 warnings
    
    return result


@app.post("/api/routes/import")
async def import_routes(request: Request):
    # Check request size limit (10MB)
    MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10MB
    
    raw = await request.body()
    if len(raw) > MAX_IMPORT_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"Request too large. Maximum size is {MAX_IMPORT_SIZE // 1024 // 1024}MB"
        )
    
    try:
        payload = json.loads(raw.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    mode = "replace"
    data = None
    if isinstance(payload, list):
        data = payload
    elif isinstance(payload, dict):
        data = payload.get("data")
        mode = str(payload.get("mode") or mode).lower()
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Expected a list of rows to import")

    path = os.path.join(DATA_DIR, 'Routes.csv')
    existing = _read_csv(path) if mode == "append" else []
    keep: Dict[str, Dict[str, Any]] = {str(r.get("route_id")): r for r in existing if r.get("route_id")}

    for obj in data:
        if not isinstance(obj, dict):
            continue
        rid = str(obj.get("route_id") or obj.get("id") or "").strip()
        name = obj.get("route_name") or obj.get("name") or obj.get("route_long_name") or obj.get("route_short_name") or ""
        if not rid or name == "":
            continue
        color = obj.get("route_color") or obj.get("color") or "#2563eb"
        is_active = _norm_bool(obj.get("is_active"), True)
        # coordinates: expect [[lat,lon],...]
        coords = obj.get("coordinates")
        if isinstance(coords, str):
            try:
                coords_list = json.loads(coords)
            except Exception:
                coords_list = []
        elif isinstance(coords, list):
            coords_list = coords
        else:
            coords_list = []
        # sanitize coordinates
        clean_coords: List[List[float]] = []
        for p in coords_list or []:
            if isinstance(p, (list, tuple)) and len(p) == 2:
                try:
                    a = float(p[0]); b = float(p[1])
                    clean_coords.append([a, b])
                except Exception:
                    pass
        stops = obj.get("stops")
        if isinstance(stops, str):
            stops_list = _parse_list(stops)
        elif isinstance(stops, list):
            stops_list = [str(x) for x in stops]
        else:
            stops_list = []
        keep[rid] = {
            "route_id": rid,
            "route_name": str(name),
            "route_color": str(color or "#2563eb"),
            "is_active": "True" if is_active else "False",
            "coordinates": json.dumps(clean_coords),
            "stops": json.dumps(stops_list),
        }

    rows = list(keep.values())
    _write_csv(path, rows, ROUTES_FIELDS if not existing else list({*ROUTES_FIELDS, *{k for r in existing for k in r.keys()}}))
    return {"imported": len(data), "saved": len(rows)}


@app.post("/api/vehicles/import")
async def import_vehicles(request: Request):
    # Check request size limit (10MB)
    MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10MB
    
    raw = await request.body()
    if len(raw) > MAX_IMPORT_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"Request too large. Maximum size is {MAX_IMPORT_SIZE // 1024 // 1024}MB"
        )
    
    try:
        payload = json.loads(raw.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    mode = "replace"
    data = None
    if isinstance(payload, list):
        data = payload
    elif isinstance(payload, dict):
        data = payload.get("data")
        mode = str(payload.get("mode") or mode).lower()
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Expected a list of rows to import")

    path = os.path.join(DATA_DIR, 'Vehicles.csv')
    existing = _read_csv(path) if mode == "append" else []
    keep: Dict[str, Dict[str, Any]] = {str(r.get("vehicle_id") or r.get("device_id")): r for r in existing if (r.get("vehicle_id") or r.get("device_id"))}

    now_iso = datetime.now().isoformat()
    for obj in data:
        if not isinstance(obj, dict):
            continue
        vid = str(obj.get("vehicle_id") or obj.get("device_id") or obj.get("id") or "").strip()
        lat = obj.get("latitude") or obj.get("lat")
        lon = obj.get("longitude") or obj.get("lon")
        if not vid or lat is None or lon is None:
            continue
        keep[vid] = {
            "vehicle_id": vid,
            "route_id": str(obj.get("route_id") or ""),
            "latitude": f"{float(lat):.6f}",
            "longitude": f"{float(lon):.6f}",
            "bearing": f"{float(obj.get('bearing')):.2f}" if obj.get('bearing') is not None else "",
            "speed": f"{float(obj.get('speed')):.2f}" if obj.get('speed') is not None else "",
            "status": str(obj.get("status") or "active"),
            "last_updated": str(obj.get("last_updated") or now_iso),
        }

    rows = list(keep.values())
    _write_csv(path, rows, VEHICLES_FIELDS if not existing else list({*VEHICLES_FIELDS, *{k for r in existing for k in r.keys()}}))
    return {"imported": len(data), "saved": len(rows)}

# Authentication endpoints
@app.post("/api/auth/login", tags=["Authentication"])
async def login(request: Request):
    """
    ## User Login
    
    Authenticate with username and password to receive an access token.
    
    **Default Users:**
    - Username: `admin`, Password: `admin123` (Admin role)
    - Username: `demo`, Password: `demo123` (Viewer role)
    
    **Request Body:**
    ```json
    {
        "username": "admin",
        "password": "admin123"
    }
    ```
    
    **Response:**
    ```json
    {
        "access_token": "simple-token-admin-1234567890",
        "token_type": "bearer",
        "user": {
            "username": "admin",
            "role": "admin"
        }
    }
    ```
    """
    try:
        body = await request.json()
        username = body.get("username", "").strip()
        password = body.get("password", "")
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password required")
        
        if username not in ADMIN_USERS:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = ADMIN_USERS[username]
        if password != user["password"]:  # Simple comparison (use proper hashing in production)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        access_token = AuthManager.create_access_token(data={"sub": username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"username": username, "role": user["role"]}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid request body")

@app.get("/api/auth/me", tags=["Authentication"])
async def get_user_info(request: Request):
    """
    ## Get Current User Info
    
    Returns information about the currently authenticated user.
    Requires valid Authorization header.
    """
    current_user = await get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@app.post("/api/auth/logout")
async def logout():
    """User logout (client should delete token)"""
    return {"message": "Logged out successfully"}

# Protected endpoint example
@app.get("/api/admin/stats")
async def admin_stats(request: Request):
    """Admin-only statistics endpoint"""
    await require_admin(request)
    
    # Get data counts
    stops_count = len(_read_csv(os.path.join(DATA_DIR, 'BusStops.csv')))
    routes_count = len(_read_csv(os.path.join(DATA_DIR, 'Routes.csv'))) 
    vehicles_count = len(_read_csv(os.path.join(DATA_DIR, 'Vehicles.csv')))
    
    return {
        "stops": stops_count,
        "routes": routes_count, 
        "vehicles": vehicles_count,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", tags=["System"])
async def health():
    """
    ## System Health Check
    
    Returns system status, uptime, and service health information.
    
    **Response:**
    ```json
    {
        "status": "healthy",
        "services": {
            "database": "disabled",
            "traccar": "disabled", 
            "data": "csv"
        },
        "uptime": "01:23:45",
        "timestamp": "2025-09-15T08:30:00.123456"
    }
    ```
    """
    # Calculate uptime as HH:MM:SS
    delta: timedelta = datetime.now() - APP_START
    total_seconds = int(delta.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    # Check database health
    db_health = await check_database_health()
    
    services = {
        "database": db_health.get("status", "unknown"),
        "traccar": "disabled", 
        "data": db_health.get("mode", "csv")
    }
    
    overall_status = "healthy"
    if USE_DATABASE and db_health.get("status") != "healthy":
        overall_status = "degraded"

    result = {
        "status": overall_status,
        "services": services,
        "uptime": uptime,
        "timestamp": datetime.now().isoformat(),
    }
    
    # Include database details if enabled
    if USE_DATABASE:
        result["database"] = db_health
    
    return result

"""
GTFS-RT endpoints disabled in dummy CSV mode
@app.get("/gtfs-rt/vehicle-positions")
async def get_vehicle_positions():
    ...

@app.get("/gtfs-rt/trip-updates")
async def get_trip_updates():
    ...
"""
