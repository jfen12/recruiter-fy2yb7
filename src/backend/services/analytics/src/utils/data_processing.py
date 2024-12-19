"""
Advanced utility module for processing and transforming analytics data in the RefactorTrack ATS system.
Implements high-performance data processing, statistical analysis, and trend detection with caching.

Version: 1.0.0
Author: RefactorTrack Development Team
"""

import numpy as np  # version: ^1.24.0
import pandas as pd  # version: ^2.0.0
from typing import Dict, List, Any, Optional, Tuple  # version: ^3.9.0
from datetime import datetime, timedelta  # version: ^3.9.0

from ..interfaces.analytics_types import (
    RecruitmentMetrics,
    TimeToHireAnalytics,
    DateRange,
    TrendPoint
)

class MetricsProcessor:
    """
    Advanced analytics processor implementing high-performance data processing 
    with caching and optimization capabilities.
    """

    def __init__(self, cache_ttl_seconds: int = 300, enable_monitoring: bool = True):
        """
        Initialize the metrics processor with caching and monitoring capabilities.

        Args:
            cache_ttl_seconds (int): Cache time-to-live in seconds
            enable_monitoring (bool): Enable performance monitoring
        """
        # Initialize optimized DataFrame with appropriate dtypes
        self._metrics_df: Optional[pd.DataFrame] = None
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        self._processing_stats: Dict[str, int] = {
            'cache_hits': 0,
            'cache_misses': 0,
            'total_processed': 0
        }
        
        self._cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self._enable_monitoring = enable_monitoring

        # Configure pandas for optimal performance
        pd.set_option('compute.use_numexpr', True)
        pd.set_option('mode.chained_assignment', None)

    async def process_recruitment_metrics(
        self,
        raw_metrics: List[Dict],
        aggregation_level: str,
        use_cache: bool = True
    ) -> RecruitmentMetrics:
        """
        Process recruitment metrics with caching and optimization.

        Args:
            raw_metrics (List[Dict]): Raw metrics data
            aggregation_level (str): Level of data aggregation
            use_cache (bool): Whether to use caching

        Returns:
            RecruitmentMetrics: Processed metrics with trends
        """
        cache_key = f"metrics_{aggregation_level}_{hash(str(raw_metrics))}"

        if use_cache and self._is_cache_valid(cache_key):
            self._processing_stats['cache_hits'] += 1
            return self._cache[cache_key]

        self._processing_stats['cache_misses'] += 1

        try:
            # Convert to DataFrame with optimized dtypes
            metrics_df = pd.DataFrame(raw_metrics).astype({
                'requisition_id': 'category',
                'status': 'category',
                'time_to_hire': 'float32',
                'satisfaction_score': 'float32'
            })

            # Process metrics in chunks for large datasets
            chunk_size = 10000
            processed_chunks = []

            for chunk_start in range(0, len(metrics_df), chunk_size):
                chunk = metrics_df.iloc[chunk_start:chunk_start + chunk_size]
                processed_chunk = self._process_metrics_chunk(chunk, aggregation_level)
                processed_chunks.append(processed_chunk)

            # Combine processed chunks
            combined_metrics = self._combine_processed_chunks(processed_chunks)
            
            # Calculate advanced metrics
            result = RecruitmentMetrics(
                id=RecruitmentMetrics.generate_id(),
                created_at=datetime.now(),
                total_requisitions=combined_metrics['total_reqs'],
                filled_requisitions=combined_metrics['filled_reqs'],
                average_time_to_hire=combined_metrics['avg_time_to_hire'],
                client_satisfaction_rate=combined_metrics['satisfaction_rate'],
                requisition_fill_rate=combined_metrics['fill_rate'],
                period_start=combined_metrics['period_start'],
                period_end=combined_metrics['period_end'],
                skill_based_metrics=combined_metrics['skill_metrics']
            )

            if use_cache:
                self._update_cache(cache_key, result)

            self._processing_stats['total_processed'] += len(raw_metrics)
            return result

        except Exception as e:
            raise ValueError(f"Error processing recruitment metrics: {str(e)}")

    async def analyze_time_to_hire(
        self,
        requisition_data: List[Dict],
        date_range: DateRange,
        include_seasonality: bool = True
    ) -> TimeToHireAnalytics:
        """
        Perform advanced time-to-hire analysis with trend detection.

        Args:
            requisition_data (List[Dict]): Historical requisition data
            date_range (DateRange): Analysis date range
            include_seasonality (bool): Include seasonal pattern analysis

        Returns:
            TimeToHireAnalytics: Detailed time-to-hire analysis
        """
        try:
            # Convert to DataFrame with optimized dtypes
            df = pd.DataFrame(requisition_data).astype({
                'created_at': 'datetime64[ns]',
                'filled_at': 'datetime64[ns]',
                'time_to_hire': 'float32'
            })

            # Filter by date range
            mask = (df['created_at'] >= date_range.start_date) & \
                  (df['created_at'] <= date_range.end_date)
            df = df.loc[mask]

            # Calculate basic statistics
            avg_days = float(df['time_to_hire'].mean())
            median_days = float(df['time_to_hire'].median())

            # Generate trend data
            trend_data = self._calculate_trends(df)

            # Calculate seasonal patterns if requested
            seasonal_patterns = {}
            if include_seasonality:
                seasonal_patterns = self._analyze_seasonality(df)

            return TimeToHireAnalytics(
                average_days=avg_days,
                median_days=median_days,
                trend_data=trend_data,
                seasonal_patterns=seasonal_patterns
            )

        except Exception as e:
            raise ValueError(f"Error analyzing time to hire: {str(e)}")

    def _process_metrics_chunk(
        self,
        chunk: pd.DataFrame,
        aggregation_level: str
    ) -> Dict[str, Any]:
        """
        Process a chunk of metrics data.

        Args:
            chunk (pd.DataFrame): Data chunk to process
            aggregation_level (str): Aggregation level

        Returns:
            Dict[str, Any]: Processed metrics for the chunk
        """
        grouped = chunk.groupby(pd.Grouper(key='created_at', freq=aggregation_level[0].upper()))
        
        return {
            'total_reqs': len(chunk),
            'filled_reqs': len(chunk[chunk['status'] == 'filled']),
            'avg_time_to_hire': float(chunk['time_to_hire'].mean()),
            'satisfaction_rate': float(chunk['satisfaction_score'].mean()),
            'fill_rate': len(chunk[chunk['status'] == 'filled']) / len(chunk) * 100,
            'period_start': chunk['created_at'].min(),
            'period_end': chunk['created_at'].max(),
            'skill_metrics': self._calculate_skill_metrics(chunk)
        }

    def _calculate_trends(self, df: pd.DataFrame) -> List[TrendPoint]:
        """
        Calculate trend data points with confidence intervals.

        Args:
            df (pd.DataFrame): Input DataFrame

        Returns:
            List[TrendPoint]: Trend data points
        """
        trends = []
        grouped = df.groupby(pd.Grouper(key='created_at', freq='W'))
        
        for date, group in grouped:
            if not group.empty:
                mean_value = float(group['time_to_hire'].mean())
                std_dev = float(group['time_to_hire'].std())
                confidence = 1.96 * std_dev / np.sqrt(len(group))  # 95% confidence interval
                
                trends.append(TrendPoint(
                    date=date,
                    value=mean_value,
                    confidence=confidence
                ))
        
        return trends

    def _analyze_seasonality(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Analyze seasonal patterns in time-to-hire data.

        Args:
            df (pd.DataFrame): Input DataFrame

        Returns:
            Dict[str, float]: Seasonal pattern analysis
        """
        seasonal_patterns = {}
        
        # Calculate monthly averages
        monthly_avg = df.groupby(df['created_at'].dt.month)['time_to_hire'].mean()
        
        # Calculate seasonal indices
        global_mean = df['time_to_hire'].mean()
        for month, avg in monthly_avg.items():
            seasonal_patterns[f"month_{month}"] = float(avg / global_mean)
            
        return seasonal_patterns

    def _is_cache_valid(self, cache_key: str) -> bool:
        """
        Check if cached data is still valid.

        Args:
            cache_key (str): Cache key to check

        Returns:
            bool: True if cache is valid
        """
        if cache_key not in self._cache_timestamps:
            return False
            
        age = datetime.now() - self._cache_timestamps[cache_key]
        return age < self._cache_ttl

    def _update_cache(self, cache_key: str, value: Any) -> None:
        """
        Update cache with new value.

        Args:
            cache_key (str): Cache key
            value (Any): Value to cache
        """
        self._cache[cache_key] = value
        self._cache_timestamps[cache_key] = datetime.now()

    def _calculate_skill_metrics(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Calculate skill-based metrics.

        Args:
            df (pd.DataFrame): Input DataFrame

        Returns:
            Dict[str, float]: Skill-based metrics
        """
        if 'required_skills' not in df.columns:
            return {}
            
        skill_metrics = {}
        all_skills = df['required_skills'].explode()
        
        for skill in all_skills.unique():
            skill_reqs = df[df['required_skills'].apply(lambda x: skill in x)]
            skill_metrics[skill] = len(skill_reqs) / len(df) * 100
            
        return skill_metrics

    def get_processing_stats(self) -> Dict[str, int]:
        """
        Get processing statistics.

        Returns:
            Dict[str, int]: Processing statistics
        """
        return self._processing_stats.copy()