export interface BusStop {
  stop_id: string;
  name: string;
  latitude: number;
  longitude: number;
  routes: string[];
  accessibility: boolean;
}

export interface Route {
  route_id: string;
  route_name: string;
  route_color: string;
  is_active: boolean;
  coordinates: [number, number][];
  stops: string[];
}

export interface Vehicle {
  vehicle_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  status: 'in_transit' | 'at_stop' | 'delayed' | 'offline';
  last_updated: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
  total?: number;
}

export interface SystemStatus {
  status: string;
  uptime: string;
  vehicles_active: number;
  routes_active: number;
  stops_total: number;
  last_updated: string;
}

export interface AnalyticsData {
  daily_ridership: number;
  avg_delay: number;
  routes_on_time: number;
  total_routes: number;
  peak_hours: string[];
  popular_stops: Array<{
    stop_id: string;
    name: string;
    daily_passengers: number;
  }>;
}