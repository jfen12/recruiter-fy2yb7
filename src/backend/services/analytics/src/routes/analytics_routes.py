"""
Analytics routes configuration for RefactorTrack ATS system.
Implements secure, performant, and monitored routes for analytics endpoints.

Version: 1.0.0
"""

# External imports
from fastapi import APIRouter, Depends, Query, HTTPException  # version: ^0.100.0
from pydantic import ValidationError  # version: ^2.0.0
from prometheus_client import Counter, Histogram  # version: ^0.17.0
from opentelemetry import trace  # version: ^1.20.0
from opentelemetry.trace import Status, StatusCode
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

# Internal imports
from ..controllers.analytics_controller import AnalyticsController
from ..middleware.auth_middleware import AuthMiddleware, get_current_user
from ..services.analytics_service import AnalyticsService
from ..interfaces.analytics_types import DateRange, MetricType

# Initialize router with prefix and tags
router = APIRouter(prefix='/api/v1/analytics', tags=['Analytics'])

# Security and performance constants
REQUIRED_ROLES = ['admin', 'analyst', 'manager']
METRICS_TIMEOUT = 25  # seconds
CACHE_TTL = 300  # seconds

# Performance monitoring metrics
REQUEST_COUNTER = Counter(
    'analytics_requests_total',
    'Total number of analytics requests',
    ['endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'analytics_request_duration_seconds',
    'Analytics request duration in seconds',
    ['endpoint']
)

# Initialize tracer
tracer = trace.get_tracer(__name__)

async def setup_routes(
    analytics_controller: AnalyticsController,
    auth_middleware: AuthMiddleware
) -> APIRouter:
    """
    Configure and initialize analytics routes with security and monitoring.

    Args:
        analytics_controller: Analytics controller instance
        auth_middleware: Authentication middleware instance

    Returns:
        Configured FastAPI router
    """
    @router.get('/metrics')
    async def get_metrics(
        start_date: datetime = Query(..., description="Start date for metrics analysis"),
        end_date: datetime = Query(..., description="End date for metrics analysis"),
        metric_types: Optional[List[MetricType]] = Query(None, description="Specific metric types to retrieve"),
        current_user: Dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """
        Retrieve recruitment metrics with enhanced security and monitoring.

        Args:
            start_date: Start date for metrics analysis
            end_date: End date for metrics analysis
            metric_types: Optional list of specific metric types
            current_user: Current authenticated user

        Returns:
            Dict containing recruitment metrics and analytics
        """
        with tracer.start_as_current_span("get_metrics") as span:
            try:
                # Add trace context
                span.set_attribute("user.id", current_user.get("sub"))
                span.set_attribute("date_range", f"{start_date}-{end_date}")
                
                # Start latency tracking
                start_time = datetime.utcnow()

                # Validate date range
                if end_date < start_date:
                    REQUEST_COUNTER.labels(endpoint='metrics', status='error').inc()
                    raise HTTPException(
                        status_code=400,
                        detail="End date must be after start date"
                    )

                # Create date range object
                date_range = DateRange(
                    start_date=start_date,
                    end_date=end_date
                )

                # Get metrics with timeout control
                metrics = await analytics_controller.get_recruitment_metrics(
                    start_date=start_date,
                    end_date=end_date,
                    metric_types=metric_types,
                    current_user=current_user
                )

                # Record success metrics
                REQUEST_COUNTER.labels(endpoint='metrics', status='success').inc()
                REQUEST_LATENCY.labels(endpoint='metrics').observe(
                    (datetime.utcnow() - start_time).total_seconds()
                )

                span.set_status(Status(StatusCode.OK))
                return metrics

            except ValidationError as e:
                REQUEST_COUNTER.labels(endpoint='metrics', status='validation_error').inc()
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=422, detail=str(e))

            except Exception as e:
                REQUEST_COUNTER.labels(endpoint='metrics', status='error').inc()
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    @router.get('/hiring-performance')
    async def analyze_hiring_performance(
        start_date: datetime = Query(..., description="Start date for analysis"),
        end_date: datetime = Query(..., description="End date for analysis"),
        aggregation_level: str = Query('weekly', description="Level of data aggregation"),
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
        with tracer.start_as_current_span("analyze_hiring_performance") as span:
            try:
                span.set_attribute("user.id", current_user.get("sub"))
                start_time = datetime.utcnow()

                performance_data = await analytics_controller.analyze_hiring_performance(
                    start_date=start_date,
                    end_date=end_date,
                    aggregation_level=aggregation_level,
                    current_user=current_user
                )

                REQUEST_COUNTER.labels(endpoint='hiring_performance', status='success').inc()
                REQUEST_LATENCY.labels(endpoint='hiring_performance').observe(
                    (datetime.utcnow() - start_time).total_seconds()
                )

                span.set_status(Status(StatusCode.OK))
                return performance_data

            except Exception as e:
                REQUEST_COUNTER.labels(endpoint='hiring_performance', status='error').inc()
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    @router.get('/skill-trends')
    async def analyze_skill_trends(
        start_date: datetime = Query(..., description="Start date for analysis"),
        end_date: datetime = Query(..., description="End date for analysis"),
        skill_categories: Optional[List[str]] = Query(None, description="Optional list of skill categories"),
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
        with tracer.start_as_current_span("analyze_skill_trends") as span:
            try:
                span.set_attribute("user.id", current_user.get("sub"))
                start_time = datetime.utcnow()

                trends_data = await analytics_controller.analyze_skill_trends(
                    start_date=start_date,
                    end_date=end_date,
                    skill_categories=skill_categories,
                    current_user=current_user
                )

                REQUEST_COUNTER.labels(endpoint='skill_trends', status='success').inc()
                REQUEST_LATENCY.labels(endpoint='skill_trends').observe(
                    (datetime.utcnow() - start_time).total_seconds()
                )

                span.set_status(Status(StatusCode.OK))
                return trends_data

            except Exception as e:
                REQUEST_COUNTER.labels(endpoint='skill_trends', status='error').inc()
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    @router.get('/reports/performance')
    async def generate_report(
        start_date: datetime = Query(..., description="Start date for report"),
        end_date: datetime = Query(..., description="End date for report"),
        report_type: str = Query('comprehensive', description="Type of report to generate"),
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
        with tracer.start_as_current_span("generate_performance_report") as span:
            try:
                span.set_attribute("user.id", current_user.get("sub"))
                span.set_attribute("report_type", report_type)
                start_time = datetime.utcnow()

                report_data = await analytics_controller.generate_report(
                    start_date=start_date,
                    end_date=end_date,
                    report_type=report_type,
                    current_user=current_user
                )

                REQUEST_COUNTER.labels(endpoint='reports', status='success').inc()
                REQUEST_LATENCY.labels(endpoint='reports').observe(
                    (datetime.utcnow() - start_time).total_seconds()
                )

                span.set_status(Status(StatusCode.OK))
                return report_data

            except Exception as e:
                REQUEST_COUNTER.labels(endpoint='reports', status='error').inc()
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise HTTPException(status_code=500, detail=str(e))

    return router

# Export router for application use
__all__ = ['router', 'setup_routes']