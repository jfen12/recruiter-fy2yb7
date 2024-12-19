"""
Enhanced analytics controller for RefactorTrack ATS system.
Implements secure analytics endpoints with comprehensive monitoring and caching.

Version: 1.0.0
"""

# External imports
from fastapi import APIRouter, Depends, HTTPException, Query  # version: ^0.100.0
from pydantic import ValidationError  # version: ^2.0.0
from datetime import datetime, timedelta  # version: ^3.9.0
from typing import Dict, List, Optional, Any
from opentelemetry import trace  # version: ^1.20.0
from opentelemetry.trace import Status, StatusCode

# Internal imports
from ..services.analytics_service import AnalyticsService
from ..middleware.auth_middleware import AuthMiddleware, get_current_user
from ..utils.data_processing import MetricsProcessor
from ..interfaces.analytics_types import DateRange, MetricType

# Initialize router with prefix and tags
router = APIRouter(prefix='/api/v1/analytics', tags=['Analytics'])

# Security and performance constants
REQUIRED_ROLES = ['admin', 'analyst', 'manager']
RATE_LIMIT = 100  # requests per minute
REQUEST_TIMEOUT = 30  # seconds
CACHE_TTL = 300  # seconds

class AnalyticsController:
    """
    Enhanced analytics controller implementing secure endpoints with comprehensive
    monitoring, caching, and error handling.
    """

    def __init__(
        self,
        analytics_service: AnalyticsService,
        auth_middleware: AuthMiddleware,
        metrics_processor: MetricsProcessor
    ):
        """Initialize controller with required services and monitoring."""
        self._analytics_service = analytics_service
        self._auth_middleware = auth_middleware
        self._metrics_processor = metrics_processor
        self._tracer = trace.get_tracer(__name__)

    @router.get('/metrics')
    async def get_recruitment_metrics(
        self,
        start_date: datetime = Query(..., description="Start date for metrics analysis"),
        end_date: datetime = Query(..., description="End date for metrics analysis"),
        metric_types: Optional[List[MetricType]] = Query(None, description="Specific metric types to retrieve"),
        page_size: Optional[int] = Query(50, ge=1, le=100, description="Number of results per page"),
        page_number: Optional[int] = Query(1, ge=1, description="Page number for pagination"),
        current_user: Dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """
        Retrieve recruitment metrics with enhanced security and monitoring.

        Args:
            start_date: Start date for metrics analysis
            end_date: End date for metrics analysis
            metric_types: Optional list of specific metric types
            page_size: Number of results per page
            page_number: Page number for pagination
            current_user: Current authenticated user

        Returns:
            Dict containing paginated recruitment metrics and analytics
        """
        with self._tracer.start_as_current_span("get_recruitment_metrics") as span:
            try:
                # Add trace context
                span.set_attribute("user.id", current_user.get("sub"))
                span.set_attribute("date_range", f"{start_date}-{end_date}")

                # Validate date range
                if end_date < start_date:
                    raise HTTPException(
                        status_code=400,
                        detail="End date must be after start date"
                    )

                # Create date range object
                date_range = DateRange(
                    start_date=start_date,
                    end_date=end_date
                )

                # Get metrics with caching
                metrics = await self._analytics_service.get_recruitment_metrics(
                    date_range,
                    metric_types
                )

                # Process pagination
                start_idx = (page_number - 1) * page_size
                end_idx = start_idx + page_size
                paginated_metrics = metrics[start_idx:end_idx]

                # Add performance metrics
                performance_data = await self._metrics_processor.get_processing_stats()

                response = {
                    "metrics": paginated_metrics,
                    "pagination": {
                        "total_items": len(metrics),
                        "total_pages": (len(metrics) + page_size - 1) // page_size,
                        "current_page": page_number,
                        "page_size": page_size
                    },
                    "performance": performance_data,
                    "generated_at": datetime.utcnow()
                }

                span.set_status(Status(StatusCode.OK))
                return response

            except ValidationError as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=422, detail=str(e))
            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    @router.get('/hiring-performance')
    async def analyze_hiring_performance(
        self,
        start_date: datetime = Query(...),
        end_date: datetime = Query(...),
        aggregation_level: str = Query('weekly'),
        current_user: Dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """
        Analyze hiring performance metrics with enhanced security.

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            aggregation_level: Level of data aggregation
            current_user: Current authenticated user

        Returns:
            Dict containing hiring performance analytics
        """
        with self._tracer.start_as_current_span("analyze_hiring_performance") as span:
            try:
                span.set_attribute("user.id", current_user.get("sub"))
                
                date_range = DateRange(start_date=start_date, end_date=end_date)
                
                performance_data = await self._analytics_service.analyze_hiring_performance(
                    date_range,
                    aggregation_level
                )

                span.set_status(Status(StatusCode.OK))
                return performance_data

            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    @router.get('/skill-trends')
    async def analyze_skill_trends(
        self,
        start_date: datetime = Query(...),
        end_date: datetime = Query(...),
        skill_categories: Optional[List[str]] = Query(None),
        current_user: Dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """
        Analyze skill trends with enhanced security and monitoring.

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            skill_categories: Optional list of skill categories
            current_user: Current authenticated user

        Returns:
            Dict containing skill trends analysis
        """
        with self._tracer.start_as_current_span("analyze_skill_trends") as span:
            try:
                span.set_attribute("user.id", current_user.get("sub"))
                
                date_range = DateRange(start_date=start_date, end_date=end_date)
                
                trends_data = await self._analytics_service.analyze_skill_trends(
                    date_range,
                    skill_categories
                )

                span.set_status(Status(StatusCode.OK))
                return trends_data

            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    @router.get('/reports/performance')
    async def generate_report(
        self,
        start_date: datetime = Query(...),
        end_date: datetime = Query(...),
        report_type: str = Query('comprehensive'),
        current_user: Dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """
        Generate comprehensive performance report with enhanced security.

        Args:
            start_date: Start date for report
            end_date: End date for report
            report_type: Type of report to generate
            current_user: Current authenticated user

        Returns:
            Dict containing performance report data
        """
        with self._tracer.start_as_current_span("generate_performance_report") as span:
            try:
                span.set_attribute("user.id", current_user.get("sub"))
                span.set_attribute("report_type", report_type)
                
                date_range = DateRange(start_date=start_date, end_date=end_date)
                
                report_data = await self._analytics_service.generate_performance_report(
                    date_range,
                    report_type
                )

                span.set_status(Status(StatusCode.OK))
                return report_data

            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

# Export router and controller
__all__ = ['router', 'AnalyticsController']