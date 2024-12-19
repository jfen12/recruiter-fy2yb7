# External dependencies
# elasticsearch v8.0.0 - Official Elasticsearch client
from elasticsearch import AsyncElasticsearch, RequestsHttpConnection
from elasticsearch.exceptions import ConnectionError, TransportError
# elasticsearch_dsl v8.0.0 - High-level Elasticsearch DSL
from elasticsearch_dsl import Index, IndexTemplate
# Standard library imports
from typing import Dict, Optional, Any, List
import os
import asyncio
from datetime import datetime

# Internal imports
from ../../shared/utils/logger import Logger

# Global configuration with secure defaults and environment variable overrides
ELASTICSEARCH_CONFIG = {
    'hosts': os.getenv('ELASTICSEARCH_HOSTS', 'localhost:9200').split(','),
    'username': os.getenv('ELASTICSEARCH_USERNAME', 'elastic'),
    'password': os.getenv('ELASTICSEARCH_PASSWORD'),
    'use_ssl': os.getenv('ELASTICSEARCH_USE_SSL', 'false').lower() == 'true',
    'verify_certs': os.getenv('ELASTICSEARCH_VERIFY_CERTS', 'true').lower() == 'true',
    'retry_on_timeout': True,
    'max_retries': 3,
    'timeout': 30,
    'maxsize': int(os.getenv('ELASTICSEARCH_POOL_SIZE', 25)),
    'sniff_on_start': True,
    'sniff_on_connection_fail': True,
    'sniffer_timeout': 60,
    'http_compress': True,
    'connection_class': RequestsHttpConnection
}

# Index settings optimized for analytics workload
INDEX_SETTINGS = {
    'number_of_shards': int(os.getenv('ES_NUMBER_OF_SHARDS', 3)),
    'number_of_replicas': int(os.getenv('ES_NUMBER_OF_REPLICAS', 1)),
    'refresh_interval': os.getenv('ES_REFRESH_INTERVAL', '1s'),
    'analysis': {
        'analyzer': {
            'custom_analyzer': {
                'type': 'custom',
                'tokenizer': 'standard',
                'filter': ['lowercase', 'stop', 'snowball']
            }
        }
    },
    'index.lifecycle.name': 'analytics_policy',
    'index.routing.allocation.total_shards_per_node': 3
}

class ElasticsearchManager:
    """
    Manages Elasticsearch connections and operations for analytics service with 
    advanced cluster management and monitoring capabilities.
    """
    
    def __init__(self):
        """Initialize Elasticsearch manager with enhanced configuration."""
        self._client: Optional[AsyncElasticsearch] = None
        self._logger = Logger("elasticsearch_manager")
        self._config = ELASTICSEARCH_CONFIG.copy()
        self._health_status = {
            'last_check': None,
            'status': None,
            'node_count': 0,
            'shards': {},
            'indices': {}
        }

    async def initialize(self) -> None:
        """
        Initialize Elasticsearch client and verify connection with enhanced error handling.
        """
        try:
            # Create client instance with retry logic
            self._client = AsyncElasticsearch(**self._config)
            
            # Verify cluster connection
            await self._client.ping()
            
            # Check initial cluster health
            health = await self._client.cluster.health()
            self._health_status.update({
                'last_check': datetime.utcnow(),
                'status': health['status'],
                'node_count': health['number_of_nodes']
            })
            
            self._logger.info("Elasticsearch client initialized successfully", {
                'cluster_name': health['cluster_name'],
                'node_count': health['number_of_nodes'],
                'status': health['status']
            })
            
        except ConnectionError as e:
            self._logger.error("Failed to connect to Elasticsearch cluster", e, {
                'hosts': self._config['hosts']
            })
            raise
        except Exception as e:
            self._logger.error("Unexpected error during Elasticsearch initialization", e)
            raise

    async def check_health(self) -> Dict[str, Any]:
        """
        Performs comprehensive health check of Elasticsearch cluster.
        
        Returns:
            Dict containing detailed health metrics and status information.
        """
        if not self._client:
            raise RuntimeError("Elasticsearch client not initialized")
            
        try:
            # Get cluster health
            health = await self._client.cluster.health()
            
            # Get node stats
            nodes = await self._client.nodes.stats()
            
            # Get indices health
            indices = await self._client.cat.indices(format='json')
            
            # Update internal health tracking
            self._health_status.update({
                'last_check': datetime.utcnow(),
                'status': health['status'],
                'node_count': len(nodes['nodes']),
                'shards': {
                    'total': health['active_shards'],
                    'relocating': health['relocating_shards'],
                    'unassigned': health['unassigned_shards']
                },
                'indices': {idx['index']: idx['health'] for idx in indices}
            })
            
            return self._health_status
            
        except Exception as e:
            self._logger.error("Error checking Elasticsearch health", e)
            raise

    async def create_index_template(self, template_name: str, template_body: Dict[str, Any]) -> bool:
        """
        Creates or updates index template with specified settings.
        
        Args:
            template_name: Name of the template to create/update
            template_body: Template configuration and mappings
            
        Returns:
            bool: Success status of template creation
        """
        if not self._client:
            raise RuntimeError("Elasticsearch client not initialized")
            
        try:
            # Merge default settings with template settings
            template_body['settings'] = {
                **INDEX_SETTINGS,
                **template_body.get('settings', {})
            }
            
            # Create/update template
            response = await self._client.indices.put_template(
                name=template_name,
                body=template_body
            )
            
            success = response.get('acknowledged', False)
            if success:
                self._logger.info(f"Successfully created index template: {template_name}")
            else:
                self._logger.warn(f"Index template creation not acknowledged: {template_name}")
                
            return success
            
        except Exception as e:
            self._logger.error(f"Error creating index template: {template_name}", e)
            raise

async def create_elasticsearch_manager() -> ElasticsearchManager:
    """
    Factory function to create ElasticsearchManager instance with enhanced configuration.
    
    Returns:
        Initialized ElasticsearchManager instance
    """
    manager = ElasticsearchManager()
    await manager.initialize()
    await manager.check_health()
    return manager