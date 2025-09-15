import axios from 'axios';

function browserBaseUrl(): string {
  try {
    const loc = window?.location;
    if (!loc) return 'http://localhost:8000';
    // Prefer same-origin when app is hosted by backend (single-link deploy)
    return `${loc.protocol}//${loc.host}`;
  } catch {
    return 'http://localhost:8000';
  }
}

let API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || '';
try {
  if (!API_BASE_URL) {
    // No env override: prefer same-origin (works when backend serves frontend)
    API_BASE_URL = browserBaseUrl();
  } else {
    const u = new URL(API_BASE_URL);
    if (u.hostname === 'backend') {
      // Replace docker-internal hostname with a browser-reachable host: use current host but backend port 8000
      try {
        const loc = window?.location;
        const host = loc?.hostname || 'localhost';
        const proto = loc?.protocol || 'http:';
        // Preserve https if the page is https and backend terminates TLS at same host on 8000; otherwise this may be blocked by mixed content
        API_BASE_URL = `${proto}//${host}:8000`;
      } catch {
        API_BASE_URL = 'http://localhost:8000';
      }
    }
  }
} catch {
  API_BASE_URL = browserBaseUrl();
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for large imports
});

// Add retry interceptor for network reliability
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || config._retryCount >= 3) {
      throw error;
    }
    
    config._retryCount = config._retryCount || 0;
    config._retryCount++;
    
    // Retry on network errors or 5xx errors
    if (
      error.code === 'NETWORK_ERROR' || 
      error.code === 'ECONNABORTED' ||
      (error.response && error.response.status >= 500)
    ) {
      console.log(`Retrying request (attempt ${config._retryCount})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * config._retryCount));
      return api.request(config);
    }
    
    throw error;
  }
);

// Helper function to get detailed error message
export function getErrorMessage(error: any): string {
  if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
    return 'Network Error: Unable to connect to the server. Please check your internet connection and ensure the backend server is running.';
  }
  if (error.code === 'ECONNABORTED') {
    return 'Request Timeout: The request took too long to complete. Please try again with a smaller file or check your connection.';
  }
  if (error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail;
    
    switch (status) {
      case 400:
        return `Bad Request: ${detail || 'Invalid data format'}`;
      case 401:
        return 'Unauthorized: Please check your authentication';
      case 403:
        return 'Forbidden: You do not have permission to perform this action';
      case 404:
        return 'Not Found: The requested endpoint does not exist';
      case 409:
        return `Conflict: ${detail || 'Data already exists'}`;
      case 422:
        return `Validation Error: ${detail || 'Invalid data provided'}`;
      case 500:
        return `Server Error: ${detail || 'Internal server error occurred'}`;
      case 502:
        return 'Bad Gateway: Server is temporarily unavailable';
      case 503:
        return 'Service Unavailable: Server is temporarily overloaded';
      default:
        return `HTTP Error ${status}: ${detail || error.message || 'Unknown error'}`;
    }
  }
  return error.message || 'Unknown error occurred';
}

export interface HealthStatus {
  status: string;
  services?: Record<string, string>;
  uptime?: string;
  timestamp?: string;
}

export interface Vehicle {
  id: number;
  device_id?: string;
  route_id?: number | string;
  latitude: number;
  longitude: number;
  speed?: number;
  bearing?: number;
  timestamp: string;
  status?: string;
}

export const healthApi = {
  async getStatus(): Promise<HealthStatus> {
    const { data } = await api.get('/health');
    return data;
  },
};

export const vehiclesApi = {
  async getAll(): Promise<Vehicle[]> {
    const { data } = await api.get('/api/vehicles');
    if (!Array.isArray(data)) return [];
    return data.map((v: any, idx: number) => ({
      id: Number(v.id ?? idx + 1) || idx + 1,
      device_id: v.device_id ?? v.vehicle_id,
      route_id: v.route_id,
      latitude: Number(v.latitude ?? v.lat ?? v.last_lat),
      longitude: Number(v.longitude ?? v.lon ?? v.last_lon),
      speed: v.speed != null ? Number(v.speed) : (v.last_speed != null ? Number(v.last_speed) : undefined),
      bearing: v.bearing != null ? Number(v.bearing) : (v.last_heading != null ? Number(v.last_heading) : undefined),
      timestamp: String(v.timestamp ?? v.updated_at ?? v.last_seen ?? new Date().toISOString()),
      status: typeof v.status === 'string' ? v.status : undefined,
    }));
  },
};

export interface Stop {
  id: string | number | undefined;
  name: string | undefined;
  latitude: number;
  longitude: number;
  routes?: Array<string | number>;
  accessibility?: boolean;
}

export const stopsApi = {
  // Backend returns GeoJSON FeatureCollection of Point features
  async getAll(): Promise<Stop[]> {
    const { data } = await api.get('/api/stops', { params: { limit: 10000 } });
    const features: any[] = Array.isArray(data?.features) ? data.features : [];
    return features
      .map((f: any) => {
        const coords = f?.geometry?.coordinates; // [lon, lat]
        const props = f?.properties ?? {};
        const lon = Number(coords?.[0]);
        const lat = Number(coords?.[1]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          return {
            id: props.stop_id,
            name: props.stop_name,
            latitude: lat,
            longitude: lon,
            routes: Array.isArray(props.routes) ? props.routes : [],
            accessibility: typeof props.accessibility === 'boolean' ? props.accessibility : true,
          } as Stop;
        }
        return null;
      })
      .filter(Boolean) as Stop[];
  },
};

export interface RouteFeature {
  route_id?: string | number;
  route_name?: string;
  color?: string;
  coordinates: [number, number][]; // [lon, lat] per backend; will flip to [lat, lon] for Leaflet
}

export const routesApi = {
  async getAll(): Promise<Array<{ route_id?: string | number; route_name?: string; route_color?: string; is_active?: boolean; coordinates?: [number, number][]; stops?: string[] }>> {
    const { data } = await api.get('/api/routes');
    const routes = Array.isArray(data?.routes) ? data.routes : [];
    return routes.map((r: any) => ({
      route_id: r.route_id,
      route_name: r.route_name,
      route_color: r.route_color || r.color || '#2563eb',
      is_active: !!r.is_active,
      coordinates: Array.isArray(r.coordinates) ? r.coordinates : [],
      stops: Array.isArray(r.stops) ? r.stops : [],
    }));
  },
  async getGeojson(): Promise<{ features: RouteFeature[] }> {
    const { data } = await api.get('/api/routes/geojson');
    const features = Array.isArray(data?.features) ? data.features : [];
    return {
      features: features.map((f: any) => ({
        route_id: f?.properties?.route_id,
        route_name: f?.properties?.route_name,
        color: f?.properties?.color || '#2563eb',
        coordinates: Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : [],
      })),
    };
  },
};