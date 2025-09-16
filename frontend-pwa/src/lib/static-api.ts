import type { BusStop, Route, Vehicle, ApiResponse, SystemStatus, AnalyticsData } from '../types/api';

// Import static data - these will be fetched at runtime
let busStopsData: BusStop[] = [];
let routesData: Route[] = [];
let vehiclesData: Vehicle[] = [];

// Initialize data
async function loadStaticData() {
    try {
        const [busStopsRes, routesRes, vehiclesRes] = await Promise.all([
            fetch('/data/bus-stops.json'),
            fetch('/data/routes.json'),
            fetch('/data/vehicles.json')
        ]);

        busStopsData = await busStopsRes.json();
        routesData = await routesRes.json();
        vehiclesData = await vehiclesRes.json();
    } catch (error) {
        console.warn('Failed to load static data:', error);
    }
}

// Load data on module initialization
loadStaticData();

// Client-side state management for demo interactions
export class StaticApiClient {
    private busStops: BusStop[] = [];
    private routes: Route[] = [];
    private vehicles: Vehicle[] = [];
    private isDemo = true;
    private dataLoaded = false;

    constructor() {
        this.initializeData();
    }

    private async initializeData() {
        if (this.dataLoaded) return;

        // Use the loaded data or fallback to empty arrays
        this.busStops = [...busStopsData];
        this.routes = [...routesData];
        this.vehicles = [...vehiclesData];
        this.dataLoaded = true;
    }

    // Generic get method for backward compatibility
    async get(endpoint: string): Promise<any> {
        await this.delay();

        // Route the endpoint to the appropriate method
        switch (endpoint) {
            case '/system/status':
                return { data: await this.getSystemStatus() };
            case '/vehicles':
                return { data: await this.getVehicles() };
            case '/bus-stops':
                return { data: await this.getBusStops() };
            case '/routes':
                return { data: await this.getRoutes() };
            default:
                throw new Error(`Endpoint ${endpoint} not supported in static mode`);
        }
    }

    // Generic post method for API consistency (demo mode)
    async post(endpoint: string, data?: any): Promise<any> {
        await this.delay();
        console.log(`🎮 Demo POST to ${endpoint}:`, data);
        return { data: { success: true, message: 'Demo operation completed' } };
    }

    // Generic delete method for API consistency (demo mode)
    async delete(endpoint: string): Promise<any> {
        await this.delay();
        console.log(`🎮 Demo DELETE to ${endpoint}`);
        return { data: { success: true, message: 'Demo operation completed' } };
    }

    // Simulate network delay for realistic feel
    private async delay(ms: number = 300): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private successResponse<T>(data: T, message?: string): ApiResponse<T> {
        return {
            status: 'success',
            data,
            message,
            ...(Array.isArray(data) && { total: data.length })
        };
    }

    private errorResponse<T = any>(message: string): ApiResponse<T> {
        return {
            status: 'error',
            data: null as any,
            message
        };
    }

    // Bus Stops API
    async getBusStops(): Promise<ApiResponse<BusStop[]>> {
        await this.initializeData();
        await this.delay();
        return this.successResponse(this.busStops);
    }

    async getBusStop(stopId: string): Promise<ApiResponse<BusStop | null>> {
        await this.initializeData();
        await this.delay();
        const stop = this.busStops.find(s => s.stop_id === stopId);
        return stop
            ? this.successResponse(stop)
            : this.errorResponse<BusStop>(`Bus stop ${stopId} not found`);
    }

    async createBusStop(stop: Omit<BusStop, 'stop_id'>): Promise<ApiResponse<BusStop>> {
        await this.delay();
        const newStop: BusStop = {
            ...stop,
            stop_id: `BTS${String(this.busStops.length + 1).padStart(3, '0')}`
        };
        this.busStops.push(newStop);
        return this.successResponse(newStop, 'Bus stop created successfully');
    }

    async updateBusStop(stopId: string, updates: Partial<BusStop>): Promise<ApiResponse<BusStop>> {
        await this.delay();
        const index = this.busStops.findIndex(s => s.stop_id === stopId);
        if (index === -1) {
            return this.errorResponse(`Bus stop ${stopId} not found`);
        }
        this.busStops[index] = { ...this.busStops[index], ...updates };
        return this.successResponse(this.busStops[index], 'Bus stop updated successfully');
    }

    async deleteBusStop(stopId: string): Promise<ApiResponse<null>> {
        await this.delay();
        const index = this.busStops.findIndex(s => s.stop_id === stopId);
        if (index === -1) {
            return this.errorResponse(`Bus stop ${stopId} not found`);
        }
        this.busStops.splice(index, 1);
        return this.successResponse(null, 'Bus stop deleted successfully');
    }

    // Routes API
    async getRoutes(): Promise<ApiResponse<Route[]>> {
        await this.delay();
        return this.successResponse(this.routes);
    }

    async getRoute(routeId: string): Promise<ApiResponse<Route | null>> {
        await this.initializeData();
        await this.delay();
        const route = this.routes.find(r => r.route_id === routeId);
        return route
            ? this.successResponse(route)
            : this.errorResponse<Route>(`Route ${routeId} not found`);
    }

    async createRoute(route: Omit<Route, 'route_id'>): Promise<ApiResponse<Route>> {
        await this.delay();
        const newRoute: Route = {
            ...route,
            route_id: `RT${String(this.routes.length + 1).padStart(3, '0')}`
        };
        this.routes.push(newRoute);
        return this.successResponse(newRoute, 'Route created successfully');
    }

    async updateRoute(routeId: string, updates: Partial<Route>): Promise<ApiResponse<Route>> {
        await this.delay();
        const index = this.routes.findIndex(r => r.route_id === routeId);
        if (index === -1) {
            return this.errorResponse(`Route ${routeId} not found`);
        }
        this.routes[index] = { ...this.routes[index], ...updates };
        return this.successResponse(this.routes[index], 'Route updated successfully');
    }

    async deleteRoute(routeId: string): Promise<ApiResponse<null>> {
        await this.delay();
        const index = this.routes.findIndex(r => r.route_id === routeId);
        if (index === -1) {
            return this.errorResponse(`Route ${routeId} not found`);
        }
        this.routes.splice(index, 1);
        return this.successResponse(null, 'Route deleted successfully');
    }

    // Vehicles API
    async getVehicles(): Promise<ApiResponse<Vehicle[]>> {
        await this.delay();
        // Simulate real-time updates by slightly modifying positions
        const updatedVehicles = this.vehicles.map(vehicle => ({
            ...vehicle,
            latitude: vehicle.latitude + (Math.random() - 0.5) * 0.001,
            longitude: vehicle.longitude + (Math.random() - 0.5) * 0.001,
            speed: Math.max(0, vehicle.speed + (Math.random() - 0.5) * 10),
            last_updated: new Date().toISOString()
        }));
        return this.successResponse(updatedVehicles);
    }

    async getVehicle(vehicleId: string): Promise<ApiResponse<Vehicle | null>> {
        await this.delay();
        const vehicle = this.vehicles.find(v => v.vehicle_id === vehicleId);
        return vehicle
            ? this.successResponse(vehicle)
            : this.errorResponse(`Vehicle ${vehicleId} not found`);
    }

    async getVehiclesByRoute(routeId: string): Promise<ApiResponse<Vehicle[]>> {
        await this.delay();
        const routeVehicles = this.vehicles.filter(v => v.route_id === routeId);
        return this.successResponse(routeVehicles);
    }

    // System Status API
    async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
        await this.delay();
        const status: SystemStatus = {
            status: 'operational',
            uptime: '15d 4h 23m',
            vehicles_active: this.vehicles.filter(v => v.status !== 'offline').length,
            routes_active: this.routes.filter(r => r.is_active).length,
            stops_total: this.busStops.length,
            last_updated: new Date().toISOString()
        };
        return this.successResponse(status);
    }

    // Analytics API
    async getAnalytics(): Promise<ApiResponse<AnalyticsData>> {
        await this.delay();
        const analytics: AnalyticsData = {
            daily_ridership: 12847,
            avg_delay: 3.2,
            routes_on_time: 4,
            total_routes: this.routes.length,
            peak_hours: ['08:00-09:00', '17:30-18:30'],
            popular_stops: [
                { stop_id: 'BTS001', name: 'Central Station', daily_passengers: 2340 },
                { stop_id: 'BTS002', name: 'Airport Terminal', daily_passengers: 1876 },
                { stop_id: 'BTS003', name: 'Shopping Mall', daily_passengers: 1654 }
            ]
        };
        return this.successResponse(analytics);
    }

    // Authentication (Demo Mode)
    async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
        await this.delay();
        if (email === 'demo@nagaratrack.com' && password === 'demo123') {
            return this.successResponse({
                token: 'demo-jwt-token-' + Date.now(),
                user: { id: 1, email, name: 'Demo User', role: 'admin' }
            }, 'Login successful');
        }
        return this.errorResponse<{ token: string; user: any }>('Invalid credentials');
    }
}

// Export singleton instance
export const staticApi = new StaticApiClient();

// Legacy API object for backward compatibility
export const api = {
    get: async (endpoint: string) => {
        const path = endpoint.replace('/api/', '').split('/');

        switch (path[0]) {
            case 'bus-stops':
                if (path[1]) {
                    return { data: await staticApi.getBusStop(path[1]) };
                }
                return { data: await staticApi.getBusStops() };

            case 'routes':
                if (path[1]) {
                    return { data: await staticApi.getRoute(path[1]) };
                }
                return { data: await staticApi.getRoutes() };

            case 'vehicles':
                if (path[1] === 'route' && path[2]) {
                    return { data: await staticApi.getVehiclesByRoute(path[2]) };
                }
                if (path[1]) {
                    return { data: await staticApi.getVehicle(path[1]) };
                }
                return { data: await staticApi.getVehicles() };

            case 'system':
                if (path[1] === 'status') {
                    return { data: await staticApi.getSystemStatus() };
                }
                break;

            case 'analytics':
                return { data: await staticApi.getAnalytics() };
        }

        throw new Error(`Endpoint ${endpoint} not implemented in static mode`);
    },

    post: async (endpoint: string, data: any) => {
        const path = endpoint.replace('/api/', '').split('/');

        switch (path[0]) {
            case 'auth':
                if (path[1] === 'login') {
                    return { data: await staticApi.login(data.email, data.password) };
                }
                break;

            case 'bus-stops':
                return { data: await staticApi.createBusStop(data) };

            case 'routes':
                return { data: await staticApi.createRoute(data) };
        }

        throw new Error(`POST ${endpoint} not implemented in static mode`);
    },

    put: async (endpoint: string, data: any) => {
        const path = endpoint.replace('/api/', '').split('/');

        if (path[0] === 'bus-stops' && path[1]) {
            return { data: await staticApi.updateBusStop(path[1], data) };
        }

        if (path[0] === 'routes' && path[1]) {
            return { data: await staticApi.updateRoute(path[1], data) };
        }

        throw new Error(`PUT ${endpoint} not implemented in static mode`);
    },

    delete: async (endpoint: string) => {
        const path = endpoint.replace('/api/', '').split('/');

        if (path[0] === 'bus-stops' && path[1]) {
            return { data: await staticApi.deleteBusStop(path[1]) };
        }

        if (path[0] === 'routes' && path[1]) {
            return { data: await staticApi.deleteRoute(path[1]) };
        }

        throw new Error(`DELETE ${endpoint} not implemented in static mode`);
    }
};