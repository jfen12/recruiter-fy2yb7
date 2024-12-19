"""
Enhanced analytics reporting controller for RefactorTrack ATS system.
Implements secure, high-performance analytics endpoints with caching, RBAC, and monitoring.

Version: 1.0.0
"""

# External imports
from fastapi import APIRouter, Depends, HTTPException, Query  # version: ^0.100.0
from fastapi.security import OAuth2PasswordBearer  # version: ^0.100.0
from pydantic import ValidationError  # version: ^2.0.0
from datetime import datetime, timedelta  # version: ^3.9.0
from typing import Dict, List, Optional, Any
from opentelemetry import trace  # version: ^1.0.0
import redis  # version: ^4.0.0
import functools

# Internal imports
from ..services.analytics_service import AnalyticsService
from ..services.etl_service import ETLService
from ..interfaces.analytics_types import (
    DateRange,
    MetricType,
    RecruitmentMetrics,
    SkillsAnalytics
)

# Initialize router with prefix and tags
router = APIRouter(prefix='/api/v1/reports', tags=['reports'])

# Constants
DEFAULT_DATE_RANGE = timedelta(days=30)
CACHE_TTL = timedelta(minutes=15)
MAX_CHUNK_SIZE = 1000

# Initialize tracer
tracer = trace.get_tracer(__name__)

def require_role(roles: List[str]):
    """Role-based access control decorator."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user role from context
            user_role = kwargs.get('user_role')
            if not user_role or user_role not in roles:
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def cache_response(ttl: timedelta):
    """Response caching decorator."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            self = args[0]
            cache_key = f"{func.__name__}:{str(kwargs)}"
            
            # Check cache
            cached_response = await self._get_cached_response(cache_key)
            if cached_response:
                return cached_response
                
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await self._cache_response(cache_key, result, ttl)
            return result
        return wrapper
    return decorator

class ReportingController:
    """
    Enhanced controller handling analytics reporting endpoints with caching,
    security, and comprehensive monitoring.
    """

    def __init__(
        self,
        analytics_service: AnalyticsService,
        etl_service: ETLService,
        redis_client: redis.Redis
    ):
        """Initialize controller with required services and monitoring."""
        self._analytics_service = analytics_service
        self._etl_service = etl_service
        self._redis_client = redis_client
        self._logger = Logger("ReportingController", {"enableConsole": True})

    @router.get('/metrics')
    @require_role(['analyst', 'admin'])
    @cache_response(ttl=CACHE_TTL)
    async def get_recruitment_metrics(
        self,
        start_date: Optional[datetime] = Query(None),
        end_date: Optional[datetime] = Query(None),
        metric_types: Optional[List[MetricType]] = Query(None)
    ) -> Dict[str, Any]:
        """
        Retrieve recruitment metrics with caching and security controls.

        Args:
            start_date: Start date for metrics analysis
            end_date: End date for metrics analysis
            metric_types: Optional list of specific metric types

        Returns:
            Dict containing recruitment metrics and analytics
        """
        with tracer.start_as_current_span("get_recruitment_metrics") as span:
            try:
                # Set default date range if not provided
                if not start_date:
                    end_date = datetime.utcnow()
                    start_date = end_date - DEFAULT_DATE_RANGE

                # Validate date range
                if end_date < start_date:
                    raise HTTPException(
                        status_code=400,
                        detail="End date must be after start date"
                    )

                date_range = DateRange(
                    start_date=start_date,
                    end_date=end_date
                )

                # Get metrics with monitoring
                metrics = await self._analytics_service.get_recruitment_metrics(
                    start_date=start_date,
                    end_date=end_date,
                    metric_types=metric_types
                )

                return {
                    "metrics": metrics,
                    "period": {
                        "start": start_date,
                        "end": end_date
                    },
                    "generated_at": datetime.utcnow()
                }

            except ValidationError as e:
                self._logger.error("Validation error in get_recruitment_metrics", e)
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                self._logger.error("Error retrieving recruitment metrics", e)
                raise HTTPException(status_code=500, detail="Internal server error")

    @router.get('/hiring-performance')
    @require_role(['analyst', 'admin'])
    @cache_response(ttl=CACHE_TTL)
    async def get_hiring_performance(
        self,
        start_date: Optional[datetime] = Query(None),
        end_date: Optional[datetime] = Query(None),
        aggregation_level: str = Query('weekly')
    ) -> Dict[str, Any]:
        """Get hiring performance analytics with trend analysis."""
        with tracer.start_as_current_span("get_hiring_performance") as span:
            try:
                if not start_date:
                    end_date = datetime.utcnow()
                    start_date = end_date - DEFAULT_DATE_RANGE

                date_range = DateRange(start_date=start_date, end_date=end_date)
                
                performance = await self._analytics_service.analyze_hiring_performance(
                    date_range=date_range,
                    aggregation_level=aggregation_level
                )

                return {
                    "performance": performance,
                    "period": {"start": start_date, "end": end_date},
                    "generated_at": datetime.utcnow()
                }

            except Exception as e:
                self._logger.error("Error retrieving hiring performance", e)
                raise HTTPException(status_code=500, detail="Internal server error")

    @router.get('/skill-trends')
    @require_role(['analyst', 'admin'])
    @cache_response(ttl=CACHE_TTL)
    async def get_skill_trends(
        self,
        start_date: Optional[datetime] = Query(None),
        end_date: Optional[datetime] = Query(None),
        skill_categories: Optional[List[str]] = Query(None)
    ) -> SkillsAnalytics:
        """Get skill trends and demand patterns analysis."""
        with tracer.start_as_current_span("get_skill_trends") as span:
            try:
                if not start_date:
                    end_date = datetime.utcnow()
                    start_date = end_date - DEFAULT_DATE_RANGE

                date_range = DateRange(start_date=start_date, end_date=end_date)
                
                trends = await self._analytics_service.analyze_skill_trends(
                    date_range=date_range,
                    skill_categories=skill_categories
                )

                return trends

            except Exception as e:
                self._logger.error("Error retrieving skill trends", e)
                raise HTTPException(status_code=500, detail="Internal server error")

    @router.post('/refresh')
    @require_role(['admin'])
    async def refresh_analytics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Refresh analytics data for specified period."""
        with tracer.start_as_current_span("refresh_analytics") as span:
            try:
                date_range = DateRange(start_date=start_date, end_date=end_date)
                
                # Run ETL pipeline
                success = await self._etl_service.run_etl_pipeline(
                    date_range=date_range
                )

                if not success:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to refresh analytics data"
                    )

                return {
                    "status": "success",
                    "period": {"start": start_date, "end": end_date},
                    "completed_at": datetime.utcnow()
                }

            except Exception as e:
                self._logger.error("Error refreshing analytics data", e)
                raise HTTPException(status_code=500, detail="Internal server error")

    async def _get_cached_response(self, key: str) -> Optional[Dict]:
        """Retrieve cached response."""
        try:
            cached = await self._redis_client.get(key)
            return cached if cached else None
        except Exception as e:
            self._logger.error("Cache retrieval error", e)
            return None

    async def _cache_response(
        self,
        key: str,
        response: Dict,
        ttl: timedelta
    ) -> None:
        """Cache response with TTL."""
        try:
            await self._redis_client.setex(
                key,
                int(ttl.total_seconds()),
                response
            )
        except Exception as e:
            self._logger.error("Cache storage error", e)