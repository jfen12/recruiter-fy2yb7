"""
Integration tests for RefactorTrack analytics service.
Validates end-to-end functionality including ETL pipeline, data processing,
and reporting capabilities with enhanced performance monitoring.

Version: 1.0.0
"""

# External imports
import pytest  # version: ^7.0.0
import pytest_asyncio  # version: ^0.21.0
import pytest_timeout  # version: ^2.1.0
import pytest_xdist  # version: ^3.3.0
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import asyncio
import json

# Internal imports
from ../../src/services/analytics_service import AnalyticsService
from ../../src/services/etl_service import ETLService
from ../../src/config/database import DatabaseManager
from ../../src/config/elasticsearch import ElasticsearchManager

# Test constants
TEST_START_DATE = datetime.now() - timedelta(days=30)
TEST_END_DATE = datetime.now()
PERFORMANCE_THRESHOLD_SECONDS = 30
TEST_DATA_VOLUME = 1000

@pytest.mark.asyncio
@pytest.mark.timeout(60)
class TestAnalyticsIntegration:
    """
    Enhanced integration test suite for analytics service functionality with 
    comprehensive performance monitoring and error handling.
    """

    @classmethod
    @pytest.mark.asyncio
    async def async_setup_class(cls):
        """Enhanced class setup with connection validation and performance monitoring."""
        try:
            # Initialize database manager with connection pooling
            cls._db_manager = DatabaseManager()
            await cls._db_manager.initialize()
            
            # Initialize Elasticsearch manager with health checks
            cls._es_manager = ElasticsearchManager()
            await cls._es_manager.initialize()
            
            # Validate all connections
            db_health = await cls._db_manager.check_health()
            es_health = await cls._es_manager.check_health()
            
            assert db_health['postgres']['status'] == 'healthy', "PostgreSQL connection unhealthy"
            assert db_health['mongodb']['status'] == 'healthy', "MongoDB connection unhealthy"
            assert es_health['status'] == 'green', "Elasticsearch cluster unhealthy"
            
            # Initialize services
            cls._analytics_service = AnalyticsService(cls._db_manager, cls._es_manager)
            await cls._analytics_service.initialize()
            
            cls._etl_service = ETLService(cls._db_manager, cls._es_manager)
            
            # Generate and load test data
            await cls._setup_test_data()
            
            # Initialize performance metrics collection
            cls._performance_metrics = {
                'etl_duration': [],
                'query_duration': [],
                'processing_duration': []
            }
            
        except Exception as e:
            pytest.fail(f"Setup failed: {str(e)}")

    @classmethod
    @pytest.mark.asyncio
    async def async_teardown_class(cls):
        """Enhanced class cleanup with comprehensive resource management."""
        try:
            # Clean up test data
            await cls._db_manager.cleanup_test_data()
            await cls._es_manager.cleanup_test_indices()
            
            # Close database connections
            await cls._db_manager.close()
            
            # Export performance metrics
            with open('analytics_performance_metrics.json', 'w') as f:
                json.dump(cls._performance_metrics, f, indent=2)
                
        except Exception as e:
            pytest.fail(f"Teardown failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_etl_pipeline_performance(self):
        """Validate ETL pipeline performance and data integrity."""
        start_time = datetime.now()
        
        try:
            # Run ETL pipeline
            success = await self._etl_service.run_etl_pipeline(
                date_range={
                    'start_date': TEST_START_DATE,
                    'end_date': TEST_END_DATE
                }
            )
            
            duration = (datetime.now() - start_time).total_seconds()
            self._performance_metrics['etl_duration'].append(duration)
            
            # Validate performance
            assert duration <= PERFORMANCE_THRESHOLD_SECONDS, \
                f"ETL pipeline exceeded performance threshold: {duration}s > {PERFORMANCE_THRESHOLD_SECONDS}s"
            
            # Validate data integrity
            assert success, "ETL pipeline failed to complete successfully"
            
            # Verify data was loaded correctly
            metrics = await self._analytics_service.get_recruitment_metrics(
                TEST_START_DATE,
                TEST_END_DATE
            )
            
            assert metrics is not None, "Failed to retrieve processed metrics"
            assert len(metrics) > 0, "No metrics data found after ETL"
            
        except Exception as e:
            pytest.fail(f"ETL pipeline test failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_recruitment_metrics_analysis(self):
        """Test recruitment metrics analysis functionality."""
        start_time = datetime.now()
        
        try:
            # Get recruitment metrics
            metrics = await self._analytics_service.get_recruitment_metrics(
                TEST_START_DATE,
                TEST_END_DATE
            )
            
            duration = (datetime.now() - start_time).total_seconds()
            self._performance_metrics['query_duration'].append(duration)
            
            # Validate metrics structure
            assert 'total_requisitions' in metrics, "Missing total requisitions metric"
            assert 'filled_requisitions' in metrics, "Missing filled requisitions metric"
            assert 'average_time_to_hire' in metrics, "Missing time to hire metric"
            assert 'client_satisfaction_rate' in metrics, "Missing satisfaction rate metric"
            
            # Validate metric values
            assert metrics['total_requisitions'] > 0, "Invalid total requisitions count"
            assert metrics['average_time_to_hire'] >= 0, "Invalid time to hire value"
            assert 0 <= metrics['client_satisfaction_rate'] <= 100, "Invalid satisfaction rate"
            
        except Exception as e:
            pytest.fail(f"Recruitment metrics analysis test failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_skill_trends_analysis(self):
        """Test skill trends analysis with performance monitoring."""
        start_time = datetime.now()
        
        try:
            # Analyze skill trends
            trends = await self._analytics_service.analyze_skill_trends(
                date_range={
                    'start_date': TEST_START_DATE,
                    'end_date': TEST_END_DATE
                }
            )
            
            duration = (datetime.now() - start_time).total_seconds()
            self._performance_metrics['processing_duration'].append(duration)
            
            # Validate trends data
            assert trends.skill_demand is not None, "Missing skill demand data"
            assert trends.skill_availability is not None, "Missing skill availability data"
            assert trends.skill_gaps is not None, "Missing skill gaps analysis"
            assert trends.market_trends is not None, "Missing market trends data"
            
            # Validate trend calculations
            assert len(trends.skill_demand) > 0, "No skill demand data found"
            assert all(trend.growth_rate >= 0 for trend in trends.skill_demand), \
                "Invalid growth rate values"
            
        except Exception as e:
            pytest.fail(f"Skill trends analysis test failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_performance_report_generation(self):
        """Test comprehensive performance report generation."""
        try:
            # Generate performance report
            report = await self._analytics_service.generate_performance_report(
                date_range={
                    'start_date': TEST_START_DATE,
                    'end_date': TEST_END_DATE
                }
            )
            
            # Validate report structure
            assert 'summary' in report, "Missing report summary"
            assert 'hiring_metrics' in report, "Missing hiring metrics"
            assert 'skill_analysis' in report, "Missing skill analysis"
            assert 'recommendations' in report, "Missing recommendations"
            
            # Validate report content
            assert isinstance(report['recommendations'], list), "Invalid recommendations format"
            assert len(report['recommendations']) > 0, "No recommendations generated"
            
        except Exception as e:
            pytest.fail(f"Performance report generation test failed: {str(e)}")

    @classmethod
    async def _setup_test_data(cls):
        """Generate and load test data for integration tests."""
        try:
            # Generate test requisitions
            requisitions = [
                {
                    'id': f'req_{i}',
                    'title': f'Test Requisition {i}',
                    'status': 'open',
                    'created_at': TEST_START_DATE + timedelta(days=i % 30)
                }
                for i in range(TEST_DATA_VOLUME)
            ]
            
            # Generate test candidates
            candidates = [
                {
                    'id': f'cand_{i}',
                    'skills': ['Python', 'Java', 'AWS'],
                    'experience': 5,
                    'created_at': TEST_START_DATE + timedelta(days=i % 30)
                }
                for i in range(TEST_DATA_VOLUME)
            ]
            
            # Load test data through ETL service
            await cls._etl_service.load_test_data(
                requisitions=requisitions,
                candidates=candidates
            )
            
        except Exception as e:
            pytest.fail(f"Test data setup failed: {str(e)}")