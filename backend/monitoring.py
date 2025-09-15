import time
import psutil
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class SystemMetrics(BaseModel):
    """System performance metrics"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_available_mb: float
    disk_usage_percent: float
    active_connections: int
    uptime_seconds: float

class APIMetrics(BaseModel):
    """API performance metrics"""
    endpoint: str
    method: str
    total_requests: int
    avg_response_time_ms: float
    error_rate_percent: float
    last_24h_requests: int

class DatabaseMetrics(BaseModel):
    """Database performance metrics"""
    active_connections: int
    total_connections: int
    queries_per_second: float
    cache_hit_ratio: float
    slow_queries: int
    database_size_mb: float

class PerformanceMonitor:
    """Performance monitoring service"""
    
    def __init__(self):
        self.start_time = time.time()
        self.api_stats = {}
        self.system_metrics_history = []
        self.max_history_size = 100
    
    def get_system_metrics(self) -> SystemMetrics:
        """Get current system performance metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available_mb = memory.available / (1024 * 1024)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            
            # Network connections (approximate active connections)
            connections = psutil.net_connections()
            active_connections = len([c for c in connections if c.status == 'ESTABLISHED'])
            
            # Uptime
            uptime_seconds = time.time() - self.start_time
            
            metrics = SystemMetrics(
                timestamp=datetime.utcnow(),
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                memory_available_mb=memory_available_mb,
                disk_usage_percent=disk_usage_percent,
                active_connections=active_connections,
                uptime_seconds=uptime_seconds
            )
            
            # Store in history
            self.system_metrics_history.append(metrics)
            if len(self.system_metrics_history) > self.max_history_size:
                self.system_metrics_history.pop(0)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            raise HTTPException(status_code=500, detail="Failed to collect system metrics")
    
    def record_api_call(self, endpoint: str, method: str, response_time_ms: float, status_code: int):
        """Record API call metrics"""
        key = f"{method}:{endpoint}"
        
        if key not in self.api_stats:
            self.api_stats[key] = {
                "total_requests": 0,
                "total_response_time": 0,
                "errors": 0,
                "recent_calls": []
            }
        
        stats = self.api_stats[key]
        stats["total_requests"] += 1
        stats["total_response_time"] += response_time_ms
        
        if status_code >= 400:
            stats["errors"] += 1
        
        # Track recent calls for 24h metrics
        now = datetime.utcnow()
        stats["recent_calls"].append(now)
        
        # Remove calls older than 24 hours
        cutoff = now - timedelta(hours=24)
        stats["recent_calls"] = [call for call in stats["recent_calls"] if call > cutoff]
    
    def get_api_metrics(self) -> List[APIMetrics]:
        """Get API performance metrics"""
        metrics = []
        
        for key, stats in self.api_stats.items():
            method, endpoint = key.split(":", 1)
            
            avg_response_time = (stats["total_response_time"] / stats["total_requests"] 
                               if stats["total_requests"] > 0 else 0)
            
            error_rate = (stats["errors"] / stats["total_requests"] * 100 
                         if stats["total_requests"] > 0 else 0)
            
            metrics.append(APIMetrics(
                endpoint=endpoint,
                method=method,
                total_requests=stats["total_requests"],
                avg_response_time_ms=avg_response_time,
                error_rate_percent=error_rate,
                last_24h_requests=len(stats["recent_calls"])
            ))
        
        return sorted(metrics, key=lambda x: x.total_requests, reverse=True)
    
    async def get_database_metrics(self, db_connection) -> DatabaseMetrics:
        """Get database performance metrics"""
        try:
            # This would need to be implemented based on your database setup
            # For now, returning mock data
            return DatabaseMetrics(
                active_connections=5,
                total_connections=10,
                queries_per_second=25.5,
                cache_hit_ratio=95.2,
                slow_queries=2,
                database_size_mb=150.5
            )
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
            raise HTTPException(status_code=500, detail="Failed to collect database metrics")
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        system_metrics = self.get_system_metrics()
        api_metrics = self.get_api_metrics()
        
        # Calculate summary statistics
        total_requests = sum(m.total_requests for m in api_metrics)
        avg_response_time = (sum(m.avg_response_time_ms * m.total_requests for m in api_metrics) 
                           / total_requests if total_requests > 0 else 0)
        overall_error_rate = (sum(m.error_rate_percent * m.total_requests for m in api_metrics) 
                            / total_requests if total_requests > 0 else 0)
        
        return {
            "timestamp": datetime.utcnow(),
            "system": {
                "cpu_percent": system_metrics.cpu_percent,
                "memory_percent": system_metrics.memory_percent,
                "disk_usage_percent": system_metrics.disk_usage_percent,
                "uptime_hours": system_metrics.uptime_seconds / 3600
            },
            "api": {
                "total_requests": total_requests,
                "avg_response_time_ms": avg_response_time,
                "error_rate_percent": overall_error_rate,
                "active_endpoints": len(api_metrics)
            },
            "alerts": self._get_performance_alerts(system_metrics, api_metrics)
        }
    
    def _get_performance_alerts(self, system_metrics: SystemMetrics, api_metrics: List[APIMetrics]) -> List[str]:
        """Generate performance alerts"""
        alerts = []
        
        # System alerts
        if system_metrics.cpu_percent > 80:
            alerts.append(f"High CPU usage: {system_metrics.cpu_percent:.1f}%")
        
        if system_metrics.memory_percent > 85:
            alerts.append(f"High memory usage: {system_metrics.memory_percent:.1f}%")
        
        if system_metrics.disk_usage_percent > 90:
            alerts.append(f"High disk usage: {system_metrics.disk_usage_percent:.1f}%")
        
        # API alerts
        for metric in api_metrics:
            if metric.avg_response_time_ms > 5000:  # 5 seconds
                alerts.append(f"Slow endpoint: {metric.endpoint} ({metric.avg_response_time_ms:.0f}ms)")
            
            if metric.error_rate_percent > 10:
                alerts.append(f"High error rate: {metric.endpoint} ({metric.error_rate_percent:.1f}%)")
        
        return alerts

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

# Router for monitoring endpoints
router = APIRouter(prefix="/metrics", tags=["Monitoring"])

@router.get("/system")
async def get_system_metrics():
    """Get current system performance metrics"""
    return performance_monitor.get_system_metrics()

@router.get("/api")
async def get_api_metrics():
    """Get API performance metrics"""
    return performance_monitor.get_api_metrics()

@router.get("/summary")
async def get_performance_summary():
    """Get performance summary with alerts"""
    return performance_monitor.get_performance_summary()

@router.get("/history")
async def get_metrics_history():
    """Get historical system metrics"""
    return {
        "metrics": performance_monitor.system_metrics_history[-50:],  # Last 50 data points
        "total_points": len(performance_monitor.system_metrics_history)
    }