"""
Analytics type definitions and data models for RefactorTrack ATS system.
Provides comprehensive analytics data models with strict type validation and Pydantic integration.

Version: 1.0.0
"""

from dataclasses import dataclass  # version: 3.11+
from datetime import datetime  # version: 3.11+
from typing import Dict, List, Literal, Optional, Any  # version: 3.11+
from uuid import uuid4  # version: 3.11+
import pydantic  # version: ^2.0.0
from pydantic import validator  # version: ^2.0.0

# Type definitions for analytics aggregation and metric types
AggregationLevel = Literal['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
MetricType = Literal['time_to_hire', 'satisfaction', 'requisition_fill_rate', 'skill_demand']

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class BaseAnalyticsModel:
    """
    Base model class for analytics types with core fields and validation.
    Provides common attributes and functionality for all analytics models.
    """
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    @staticmethod
    def generate_id() -> str:
        """Generate a new UUID for the model."""
        return str(uuid4())

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class TrendPoint:
    """Data point for historical trend analysis."""
    date: datetime
    value: float
    confidence: float

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class DateRange:
    """
    Data class representing a date range for analytics queries with validation.
    """
    start_date: datetime
    end_date: datetime

    @validator('end_date')
    def validate_range(cls, end_date: datetime, values: Dict[str, Any]) -> datetime:
        """Validates that start_date is before end_date."""
        if 'start_date' in values and end_date < values['start_date']:
            raise ValueError("end_date must be after start_date")
        return end_date

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class RecruitmentMetrics(BaseAnalyticsModel):
    """
    Data class representing detailed recruitment performance metrics.
    Tracks key performance indicators for recruitment processes.
    """
    total_requisitions: int
    filled_requisitions: int
    average_time_to_hire: float  # in days
    client_satisfaction_rate: float  # percentage
    requisition_fill_rate: float  # percentage
    period_start: datetime
    period_end: datetime
    skill_based_metrics: Dict[str, float]

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class SkillAvailability:
    """Data class representing availability metrics for a specific skill."""
    skill_name: str
    available_candidates: int
    average_experience: float
    market_availability: float  # percentage
    geographical_distribution: Dict[str, int]

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class SkillGap:
    """Data class representing skill gap analysis metrics."""
    skill_name: str
    demand_supply_ratio: float
    gap_severity: float  # 0-1 scale
    projected_growth: float  # percentage
    recommended_actions: List[str]

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class SkillDemand(BaseAnalyticsModel):
    """
    Enhanced data class representing demand for a specific skill with trends.
    Provides comprehensive market demand analysis for skills.
    """
    skill_name: str
    demand_count: int
    growth_rate: float  # percentage
    market_rate: float  # hourly rate
    historical_trend: List[TrendPoint]
    regional_demand: Dict[str, float]

@dataclass(slots=True)
@pydantic.dataclasses.dataclass
class SkillsAnalytics(BaseAnalyticsModel):
    """
    Comprehensive data class for skills analytics with market insights.
    Provides complete analysis of skills landscape including demand, availability, and gaps.
    """
    skill_demand: List[SkillDemand]
    skill_availability: List[SkillAvailability]
    skill_gaps: List[SkillGap]
    market_trends: Dict[str, float]
    historical_analysis: Dict[str, List[TrendPoint]]

    def get_critical_skills(self, threshold: float = 0.8) -> List[str]:
        """Returns list of skills with high demand-to-availability ratio."""
        return [
            gap.skill_name for gap in self.skill_gaps 
            if gap.demand_supply_ratio > threshold
        ]

    def get_trending_skills(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns top trending skills based on growth rate."""
        return sorted(
            [{'skill': demand.skill_name, 'growth': demand.growth_rate} 
             for demand in self.skill_demand],
            key=lambda x: x['growth'],
            reverse=True
        )[:limit]

# Export all relevant types and models
__all__ = [
    'AggregationLevel',
    'MetricType',
    'BaseAnalyticsModel',
    'DateRange',
    'RecruitmentMetrics',
    'SkillDemand',
    'SkillAvailability',
    'SkillGap',
    'SkillsAnalytics',
    'TrendPoint'
]