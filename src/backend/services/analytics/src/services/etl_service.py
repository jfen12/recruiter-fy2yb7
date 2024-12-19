"""
ETL (Extract, Transform, Load) service for RefactorTrack analytics module.
Implements high-performance data pipeline with support for chunked processing,
caching, and parallel execution.

Version: 1.0.0
"""

# External imports
import pandas as pd  # version: ^2.0.0
import numpy as np  # version: ^1.24.0
import asyncio  # version: ^3.9.0
from typing import Dict, List, Optional, Any  # version: ^3.9.0
from datetime import datetime, timedelta
from cachetools import TTLCache  # version: ^5.0.0

# Internal imports
from ..config.database import DatabaseManager
from ..config.elasticsearch import ElasticsearchManager
from ..utils.data_processing import MetricsProcessor
from ..interfaces.analytics_types import DateRange

class ETLService:
    """
    Enhanced service class that handles ETL operations for analytics data with 
    support for chunked processing, caching, and parallel execution.
    """

    def __init__(
        self,
        db_manager: DatabaseManager,
        es_manager: ElasticsearchManager,
        chunk_size: int = 1000,
        parallel_workers: int = 4
    ):
        """
        Initialize ETL service with required dependencies and configuration.

        Args:
            db_manager: Database manager instance
            es_manager: Elasticsearch manager instance
            chunk_size: Size of data chunks for processing
            parallel_workers: Number of parallel workers
        """
        self._db_manager = db_manager
        self._es_manager = es_manager
        self._metrics_processor = MetricsProcessor(cache_ttl_seconds=300)
        self._chunk_size = chunk_size
        self._parallel_workers = parallel_workers
        
        # Initialize cache with 1-hour TTL
        self._cache = TTLCache(maxsize=100, ttl=3600)

    async def extract_recruitment_data(
        self,
        date_range: DateRange,
        chunk_size: Optional[int] = None
    ) -> Dict[str, List[Dict]]:
        """
        Extracts recruitment data from various sources with chunked processing.

        Args:
            date_range: Date range for data extraction
            chunk_size: Optional override for chunk size

        Returns:
            Dictionary containing extracted recruitment data
        """
        chunk_size = chunk_size or self._chunk_size
        cache_key = f"recruitment_data_{date_range.start_date}_{date_range.end_date}"

        # Check cache first
        if cache_key in self._cache:
            return self._cache[cache_key]

        try:
            # Get database connections
            pg_pool = await self._db_manager.get_pg_pool()
            mongo_db = await self._db_manager.get_mongo_db()

            # Extract requisition data from PostgreSQL
            requisitions = []
            async with pg_pool.acquire() as conn:
                query = """
                    SELECT r.*, c.client_name, c.industry
                    FROM requisitions r
                    JOIN clients c ON r.client_id = c.id
                    WHERE r.created_at BETWEEN $1 AND $2
                """
                async for chunk in conn.cursor(query, date_range.start_date, date_range.end_date):
                    requisitions.extend(chunk)

            # Extract candidate data from MongoDB
            candidates = []
            cursor = mongo_db.candidates.find({
                "created_at": {
                    "$gte": date_range.start_date,
                    "$lte": date_range.end_date
                }
            }).batch_size(chunk_size)
            async for doc in cursor:
                candidates.append(doc)

            # Extract communication logs
            communications = []
            cursor = mongo_db.communications.find({
                "timestamp": {
                    "$gte": date_range.start_date,
                    "$lte": date_range.end_date
                }
            }).batch_size(chunk_size)
            async for doc in cursor:
                communications.append(doc)

            extracted_data = {
                "requisitions": requisitions,
                "candidates": candidates,
                "communications": communications
            }

            # Cache the results
            self._cache[cache_key] = extracted_data
            return extracted_data

        except Exception as e:
            raise Exception(f"Error extracting recruitment data: {str(e)}")

    async def transform_metrics_data(
        self,
        raw_data: Dict[str, List[Dict]],
        parallel_workers: Optional[int] = None
    ) -> Dict[str, pd.DataFrame]:
        """
        Transforms raw recruitment data into analytics metrics with parallel processing.

        Args:
            raw_data: Raw data dictionary
            parallel_workers: Optional override for parallel workers

        Returns:
            Dictionary containing transformed metrics data
        """
        workers = parallel_workers or self._parallel_workers

        try:
            # Convert raw data to DataFrames
            req_df = pd.DataFrame(raw_data["requisitions"])
            cand_df = pd.DataFrame(raw_data["candidates"])
            comm_df = pd.DataFrame(raw_data["communications"])

            # Split data into chunks for parallel processing
            req_chunks = np.array_split(req_df, workers)
            cand_chunks = np.array_split(cand_df, workers)

            # Create processing tasks
            tasks = []
            for i in range(workers):
                tasks.append(asyncio.create_task(
                    self._process_metrics_chunk(req_chunks[i], cand_chunks[i], comm_df)
                ))

            # Wait for all processing tasks to complete
            processed_chunks = await asyncio.gather(*tasks)

            # Combine processed chunks
            transformed_data = {
                "recruitment_metrics": pd.concat([chunk["metrics"] for chunk in processed_chunks]),
                "skill_analytics": pd.concat([chunk["skills"] for chunk in processed_chunks]),
                "time_to_hire": pd.concat([chunk["time_to_hire"] for chunk in processed_chunks])
            }

            return transformed_data

        except Exception as e:
            raise Exception(f"Error transforming metrics data: {str(e)}")

    async def load_analytics_data(
        self,
        processed_data: Dict[str, pd.DataFrame]
    ) -> bool:
        """
        Loads processed analytics data into appropriate stores with error handling.

        Args:
            processed_data: Dictionary containing processed DataFrames

        Returns:
            Boolean indicating success status
        """
        try:
            # Get database connections
            pg_pool = await self._db_manager.get_pg_pool()
            es_client = await self._es_manager.get_client()

            # Start PostgreSQL transaction
            async with pg_pool.acquire() as conn:
                async with conn.transaction():
                    # Load recruitment metrics
                    metrics_records = processed_data["recruitment_metrics"].to_dict('records')
                    await conn.executemany("""
                        INSERT INTO analytics.recruitment_metrics
                        (requisition_id, time_to_hire, fill_rate, satisfaction_score, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                    """, [(r['requisition_id'], r['time_to_hire'], 
                          r['fill_rate'], r['satisfaction_score'], 
                          r['created_at']) for r in metrics_records])

                    # Load skill analytics
                    skill_records = processed_data["skill_analytics"].to_dict('records')
                    await conn.executemany("""
                        INSERT INTO analytics.skill_metrics
                        (skill_name, demand_count, growth_rate, created_at)
                        VALUES ($1, $2, $3, $4)
                    """, [(r['skill_name'], r['demand_count'], 
                          r['growth_rate'], r['created_at']) for r in skill_records])

            # Index searchable metrics in Elasticsearch
            await es_client.bulk([
                {
                    "_index": "recruitment_analytics",
                    "_source": record
                }
                for record in processed_data["recruitment_metrics"].to_dict('records')
            ])

            return True

        except Exception as e:
            raise Exception(f"Error loading analytics data: {str(e)}")

    async def run_etl_pipeline(
        self,
        date_range: DateRange,
        config: Optional[Dict] = None
    ) -> bool:
        """
        Executes the complete ETL pipeline with monitoring and error recovery.

        Args:
            date_range: Date range for data processing
            config: Optional configuration overrides

        Returns:
            Boolean indicating pipeline success status
        """
        start_time = datetime.now()
        config = config or {}

        try:
            # Extract data
            raw_data = await self.extract_recruitment_data(
                date_range,
                chunk_size=config.get('chunk_size', self._chunk_size)
            )

            # Transform data
            processed_data = await self.transform_metrics_data(
                raw_data,
                parallel_workers=config.get('parallel_workers', self._parallel_workers)
            )

            # Load data
            success = await self.load_analytics_data(processed_data)

            # Log pipeline metrics
            pipeline_duration = (datetime.now() - start_time).total_seconds()
            print(f"ETL Pipeline completed in {pipeline_duration} seconds")
            print(f"Processed {len(raw_data['requisitions'])} requisitions")
            print(f"Generated {len(processed_data['recruitment_metrics'])} metrics records")

            return success

        except Exception as e:
            print(f"ETL Pipeline failed: {str(e)}")
            # Implement retry mechanism here if needed
            raise

    async def _process_metrics_chunk(
        self,
        req_chunk: pd.DataFrame,
        cand_chunk: pd.DataFrame,
        comm_df: pd.DataFrame
    ) -> Dict[str, pd.DataFrame]:
        """
        Process a chunk of data for metrics calculation.

        Args:
            req_chunk: Chunk of requisition data
            cand_chunk: Chunk of candidate data
            comm_df: Communication data

        Returns:
            Dictionary containing processed metrics
        """
        # Calculate recruitment metrics
        metrics = await self._metrics_processor.process_recruitment_metrics(
            req_chunk.to_dict('records'),
            'weekly'
        )

        # Calculate skill analytics
        skills = await self._metrics_processor.analyze_skills_data(
            cand_chunk.to_dict('records')
        )

        # Calculate time to hire metrics
        time_to_hire = await self._metrics_processor.analyze_time_to_hire(
            req_chunk.to_dict('records'),
            DateRange(
                start_date=req_chunk['created_at'].min(),
                end_date=req_chunk['created_at'].max()
            )
        )

        return {
            "metrics": pd.DataFrame([metrics]),
            "skills": pd.DataFrame([skills]),
            "time_to_hire": pd.DataFrame([time_to_hire])
        }