/// <reference types="vite/client" />

import { apiClient } from './api-client';

// Environment detection for static mode
const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true' ||
  import.meta.env.MODE === 'production' ||
  (typeof window !== 'undefined' && window.location.hostname.includes('github.io'));

// Define interfaces for backward compatibility
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

export interface Stop {
  id: string | number | undefined;
  name: string | undefined;
  latitude: number;
  longitude: number;
  routes?: Array<string | number>;
  accessibility?: boolean;
}

export interface RouteFeature {
  route_id?: string | number;
  route_name?: string;
  color?: string;
  coordinates: [number, number][];
}

// Helper function to get detailed error message
export function getErrorMessage(error: any): string {
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'ERR_NETWORK') {
    return 'Network Error: Unable to connect to the server. Please check your internet connection and ensure the backend server is running.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Request Timeout: The request took too long to complete. Please try again with a smaller file or check your connection.';
  }
  if (error?.response) {
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
  return error?.message || 'Unknown error occurred';
}

// API adapters using the smart client
export const healthApi = {
  async getStatus(): Promise<HealthStatus> {
    try {
      const response = await apiClient.get('/system/status');
      const data = response.data.data as any;
      return {
        status: data?.status || 'operational',
        uptime: data?.uptime || 'N/A',
        timestamp: data?.last_updated || new Date().toISOString()
      };
    } catch (error) {
      console.warn('Health status unavailable:', error);
      return {
        status: 'operational',
        uptime: 'N/A',
        timestamp: new Date().toISOString()
      };
    }
  },
};

export const vehiclesApi = {
  async getAll(): Promise<Vehicle[]> {
    try {
      const response = await apiClient.get('/vehicles');
      const vehicles = response.data.data as any[];
      if (!Array.isArray(vehicles)) return [];
      return vehicles.map((v: any, idx: number) => ({
        id: Number(idx + 1),
        device_id: v.vehicle_id,
        route_id: v.route_id,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        speed: v.speed != null ? Number(v.speed) : undefined,
        bearing: v.bearing != null ? Number(v.bearing) : undefined,
        timestamp: String(v.last_updated || new Date().toISOString()),
        status: v.status,
      }));
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return [];
    }
  },
};

export const stopsApi = {
  async getAll(): Promise<Stop[]> {
    try {
      const response = await apiClient.get('/bus-stops');
      const stops = response.data.data as any[];
      if (!Array.isArray(stops)) return [];
      return stops.map((stop: any) => ({
        id: stop.stop_id,
        name: stop.name,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        routes: Array.isArray(stop.routes) ? stop.routes : [],
        accessibility: typeof stop.accessibility === 'boolean' ? stop.accessibility : true,
      }));
    } catch (error) {
      console.error('Failed to fetch stops:', error);
      return [];
    }
  },
};

export const routesApi = {
  async getAll(): Promise<Array<{
    route_id?: string | number;
    route_name?: string;
    route_color?: string;
    is_active?: boolean;
    coordinates?: [number, number][];
    stops?: string[]
  }>> {
    try {
      const response = await apiClient.get('/routes');
      const routes = response.data.data as any[];
      if (!Array.isArray(routes)) return [];
      return routes.map((route: any) => ({
        route_id: route.route_id,
        route_name: route.route_name,
        route_color: route.route_color || '#2563eb',
        is_active: !!route.is_active,
        coordinates: Array.isArray(route.coordinates) ? route.coordinates : [],
        stops: Array.isArray(route.stops) ? route.stops : [],
      }));
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      return [];
    }
  },

  async getAllGeoJSON(): Promise<RouteFeature[]> {
    try {
      const response = await apiClient.get('/routes');
      const routes = response.data.data as any[];
      if (!Array.isArray(routes)) return [];
      return routes.map((route: any) => ({
        route_id: route.route_id,
        route_name: route.route_name,
        color: route.route_color || '#2563eb',
        coordinates: Array.isArray(route.coordinates) ? route.coordinates : [],
      }));
    } catch (error) {
      console.error('Failed to fetch route GeoJSON:', error);
      return [];
    }
  },

  // Alias for backward compatibility
  async getGeojson(): Promise<{ features: RouteFeature[] }> {
    const features = await this.getAllGeoJSON();
    return { features };
  },
};

// Export the smart API client as the main API
export const api = apiClient;

// Log the mode for debugging
if (typeof window !== 'undefined') {
  console.log(`🚀 NagaraTrack-Lite running in ${isStaticMode ? 'STATIC' : 'DYNAMIC'} mode`);
  console.log(`📡 API Client:`, apiClient.constructor.name);
}