// Smart API client that switches between static and backend modes
import { StaticApiClient } from './static-api';

// Backend API client for when you deploy the FastAPI backend
class BackendApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('auth_token');
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Generic get method for API consistency
    async get(endpoint: string) {
        return this.request(endpoint, { method: 'GET' });
    }

    // Generic post method for API consistency
    async post(endpoint: string, data?: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // Generic delete method for API consistency
    async delete(endpoint: string) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication
    async login(username: string, password: string) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        this.token = response.access_token;
        localStorage.setItem('auth_token', this.token!);
        return response;
    }

    async logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    // Bus Stops
    async getBusStops() {
        return this.request('/api/stops');
    }

    async createBusStop(stopData: any) {
        return this.request('/api/stops', {
            method: 'POST',
            body: JSON.stringify(stopData),
        });
    }

    async deleteBusStop(stopId: string) {
        return this.request(`/api/stops/${stopId}`, {
            method: 'DELETE',
        });
    }

    // Routes
    async getRoutes() {
        return this.request('/api/routes');
    }

    async createRoute(routeData: any) {
        return this.request('/api/routes', {
            method: 'POST',
            body: JSON.stringify(routeData),
        });
    }

    async deleteRoute(routeId: string) {
        return this.request(`/api/routes/${routeId}`, {
            method: 'DELETE',
        });
    }

    // Vehicles
    async getVehicles() {
        return this.request('/api/vehicles');
    }

    async createVehicle(vehicleData: any) {
        return this.request('/api/vehicles', {
            method: 'POST',
            body: JSON.stringify(vehicleData),
        });
    }

    async deleteVehicle(vehicleId: string) {
        return this.request(`/api/vehicles/${vehicleId}`, {
            method: 'DELETE',
        });
    }

    // Data Import
    async importBusStops(csvData: string) {
        return this.request('/api/stops/import', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: csvData,
        });
    }

    async importRoutes(csvData: string) {
        return this.request('/api/routes/import', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: csvData,
        });
    }

    async importVehicles(csvData: string) {
        return this.request('/api/vehicles/import', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: csvData,
        });
    }
}

// Smart factory function that creates the appropriate client
export const createApiClient = () => {
    // Check if we're in static mode (GitHub Pages, static build, or no backend URL)
    const isStaticMode =
        import.meta.env.VITE_STATIC_MODE === 'true' ||
        window.location.hostname.includes('github.io') ||
        !import.meta.env.VITE_API_URL;

    if (isStaticMode) {
        console.log('🎮 Using Static API Client (Demo Mode)');
        return new StaticApiClient();
    } else {
        console.log('🚀 Using Backend API Client (Production Mode)');
        return new BackendApiClient();
    }
};

// Export the client instance
export const apiClient = createApiClient();