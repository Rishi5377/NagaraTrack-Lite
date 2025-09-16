import { useEffect, useRef, useState } from 'react';
import { Vehicle } from '../types/api';

interface UseRealtimeVehiclesProps {
  vehicles: Vehicle[];
  updateInterval?: number;
  enabled?: boolean;
}

interface UseRealtimeVehiclesReturn {
  realtimeVehicles: Vehicle[];
  isSimulating: boolean;
  toggleSimulation: () => void;
}

export const useRealtimeVehicles = ({
  vehicles,
  updateInterval = 3000,
  enabled = true
}: UseRealtimeVehiclesProps): UseRealtimeVehiclesReturn => {
  const [realtimeVehicles, setRealtimeVehicles] = useState<Vehicle[]>(vehicles);
  const [isSimulating, setIsSimulating] = useState(enabled);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize vehicles when prop changes
  useEffect(() => {
    setRealtimeVehicles(vehicles);
  }, [vehicles]);

  // Simulate vehicle movement
  useEffect(() => {
    if (!isSimulating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRealtimeVehicles(currentVehicles => 
        currentVehicles.map(vehicle => {
          // Skip if vehicle is offline
          if (vehicle.status === 'offline') return vehicle;

          // Simulate movement based on bearing and speed
          const speed = vehicle.speed || 25; // Default speed in km/h
          const bearing = vehicle.bearing || Math.random() * 360;
          
          // Convert speed to degrees per update (rough approximation)
          const speedInDegreesPerHour = speed / 111; // 1 degree ≈ 111 km
          const speedInDegreesPerUpdate = speedInDegreesPerHour * (updateInterval / 3600000);
          
          // Calculate new position
          const bearingInRadians = (bearing * Math.PI) / 180;
          const deltaLat = Math.cos(bearingInRadians) * speedInDegreesPerUpdate;
          const deltaLon = Math.sin(bearingInRadians) * speedInDegreesPerUpdate;
          
          // Add some randomness to make it more realistic
          const randomFactorLat = (Math.random() - 0.5) * 0.0001;
          const randomFactorLon = (Math.random() - 0.5) * 0.0001;
          
          const newLat = vehicle.latitude + deltaLat + randomFactorLat;
          const newLon = vehicle.longitude + deltaLon + randomFactorLon;
          
          // Keep within reasonable bounds (Delhi NCR area)
          const boundedLat = Math.max(28.4, Math.min(28.8, newLat));
          const boundedLon = Math.max(76.8, Math.min(77.6, newLon));
          
          // Randomly update speed and bearing occasionally
          const shouldUpdateSpeed = Math.random() < 0.1; // 10% chance
          const shouldUpdateBearing = Math.random() < 0.05; // 5% chance
          const shouldChangeStatus = Math.random() < 0.02; // 2% chance
          
          let newSpeed = vehicle.speed || 25;
          let newBearing = bearing;
          let newStatus = vehicle.status || 'in_transit';
          
          if (shouldUpdateSpeed) {
            newSpeed = Math.max(0, Math.min(60, newSpeed + (Math.random() - 0.5) * 10));
          }
          
          if (shouldUpdateBearing) {
            newBearing = (bearing + (Math.random() - 0.5) * 30) % 360;
            if (newBearing < 0) newBearing += 360;
          }
          
          if (shouldChangeStatus) {
            const statuses = ['in_transit', 'at_stop', 'delayed'];
            newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          }
          
          return {
            ...vehicle,
            latitude: boundedLat,
            longitude: boundedLon,
            speed: Math.round(newSpeed),
            bearing: Math.round(newBearing),
            status: newStatus,
            timestamp: new Date().toISOString()
          };
        })
      );
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSimulating, updateInterval]);

  const toggleSimulation = () => {
    setIsSimulating(prev => !prev);
  };

  return {
    realtimeVehicles,
    isSimulating,
    toggleSimulation
  };
};

export default useRealtimeVehicles;