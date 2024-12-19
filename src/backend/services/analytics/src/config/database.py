# External dependencies
import asyncpg  # v0.27.0 - PostgreSQL async driver
import motor.motor_asyncio  # v3.1.1 - MongoDB async driver
import os
import ssl
from typing import Dict, Optional, Any
from datetime import datetime

# Internal imports
from ....shared.utils.logger import Logger

# Database configuration with secure defaults
POSTGRES_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'database': os.getenv('POSTGRES_DB', 'refactortrack_analytics'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD'),
    'min_connections': int(os.getenv('POSTGRES_MIN_CONNECTIONS', 5)),
    'max_connections': int(os.getenv('POSTGRES_MAX_CONNECTIONS', 20)),
    'connection_timeout': int(os.getenv('POSTGRES_CONN_TIMEOUT', 30)),
    'ssl_mode': os.getenv('POSTGRES_SSL_MODE', 'require'),
    'statement_timeout': int(os.getenv('POSTGRES_STMT_TIMEOUT', 30000))
}

MONGODB_CONFIG = {
    'uri': os.getenv('MONGODB_URI', 'mongodb://localhost:27017'),
    'database': os.getenv('MONGODB_DATABASE', 'refactortrack_analytics'),
    'max_pool_size': int(os.getenv('MONGODB_MAX_POOL_SIZE', 100)),
    'min_pool_size': int(os.getenv('MONGODB_MIN_POOL_SIZE', 10)),
    'max_idle_time_ms': int(os.getenv('MONGODB_MAX_IDLE_TIME', 60000)),
    'server_selection_timeout_ms': int(os.getenv('MONGODB_SERVER_SELECTION_TIMEOUT', 30000)),
    'ssl': os.getenv('MONGODB_SSL', 'true').lower() == 'true'
}

class DatabaseManager:
    """Enhanced database manager with robust connection handling, monitoring, and performance optimization"""

    def __init__(self):
        """Initialize database manager with enhanced configuration and monitoring"""
        self._logger = Logger("DatabaseManager", {"enableConsole": True})
        self._pg_pool: Optional[asyncpg.Pool] = None
        self._mongo_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
        self._mongo_db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None
        self._health_status: Dict[str, Any] = {
            'postgres': {'status': 'not_initialized', 'last_check': None, 'metrics': {}},
            'mongodb': {'status': 'not_initialized', 'last_check': None, 'metrics': {}}
        }

    async def initialize(self) -> None:
        """Initialize database connections with retry logic and health checks"""
        try:
            # Configure SSL context for PostgreSQL
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE if POSTGRES_CONFIG['ssl_mode'] == 'disable' else ssl.CERT_REQUIRED

            # Initialize PostgreSQL connection pool with enhanced configuration
            self._pg_pool = await asyncpg.create_pool(
                host=POSTGRES_CONFIG['host'],
                port=POSTGRES_CONFIG['port'],
                database=POSTGRES_CONFIG['database'],
                user=POSTGRES_CONFIG['user'],
                password=POSTGRES_CONFIG['password'],
                min_size=POSTGRES_CONFIG['min_connections'],
                max_size=POSTGRES_CONFIG['max_connections'],
                command_timeout=POSTGRES_CONFIG['statement_timeout'],
                ssl=ssl_context if POSTGRES_CONFIG['ssl_mode'] != 'disable' else None,
                timeout=POSTGRES_CONFIG['connection_timeout']
            )

            # Initialize MongoDB client with enhanced options
            mongo_options = {
                'maxPoolSize': MONGODB_CONFIG['max_pool_size'],
                'minPoolSize': MONGODB_CONFIG['min_pool_size'],
                'maxIdleTimeMS': MONGODB_CONFIG['max_idle_time_ms'],
                'serverSelectionTimeoutMS': MONGODB_CONFIG['server_selection_timeout_ms'],
                'ssl': MONGODB_CONFIG['ssl'],
                'retryWrites': True,
                'retryReads': True
            }

            self._mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
                MONGODB_CONFIG['uri'],
                **mongo_options
            )
            self._mongo_db = self._mongo_client[MONGODB_CONFIG['database']]

            # Verify connections and update health status
            await self._verify_connections()
            self._logger.info("Database connections initialized successfully", {
                'postgres_pool_size': self._pg_pool.get_size(),
                'mongodb_options': mongo_options
            })

        except Exception as e:
            self._logger.error("Failed to initialize database connections", e)
            raise

    async def close(self) -> None:
        """Gracefully close database connections with cleanup"""
        try:
            if self._pg_pool:
                await self._pg_pool.close()
                self._pg_pool = None
                self._logger.info("PostgreSQL connection pool closed")

            if self._mongo_client:
                self._mongo_client.close()
                self._mongo_client = None
                self._mongo_db = None
                self._logger.info("MongoDB connection closed")

            self._health_status = {
                'postgres': {'status': 'closed', 'last_check': datetime.utcnow()},
                'mongodb': {'status': 'closed', 'last_check': datetime.utcnow()}
            }

        except Exception as e:
            self._logger.error("Error during database connection cleanup", e)
            raise

    async def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check of database connections"""
        try:
            current_time = datetime.utcnow()
            
            # Check PostgreSQL health
            if self._pg_pool:
                async with self._pg_pool.acquire() as conn:
                    await conn.execute('SELECT 1')
                    pool_stats = {
                        'size': self._pg_pool.get_size(),
                        'free_size': self._pg_pool.get_free_size(),
                        'used_size': self._pg_pool.get_size() - self._pg_pool.get_free_size()
                    }
                    self._health_status['postgres'] = {
                        'status': 'healthy',
                        'last_check': current_time,
                        'metrics': pool_stats
                    }
            
            # Check MongoDB health
            if self._mongo_client:
                await self._mongo_db.command('ping')
                server_info = await self._mongo_db.command('serverStatus')
                mongo_stats = {
                    'connections': server_info.get('connections', {}),
                    'opcounters': server_info.get('opcounters', {}),
                }
                self._health_status['mongodb'] = {
                    'status': 'healthy',
                    'last_check': current_time,
                    'metrics': mongo_stats
                }

            return self._health_status

        except asyncpg.exceptions.PostgresError as e:
            self._health_status['postgres'] = {
                'status': 'unhealthy',
                'last_check': current_time,
                'error': str(e)
            }
            self._logger.error("PostgreSQL health check failed", e)
            raise

        except Exception as e:
            self._health_status['mongodb'] = {
                'status': 'unhealthy',
                'last_check': current_time,
                'error': str(e)
            }
            self._logger.error("MongoDB health check failed", e)
            raise

    async def _verify_connections(self) -> None:
        """Internal method to verify database connections during initialization"""
        try:
            # Verify PostgreSQL connection
            async with self._pg_pool.acquire() as conn:
                await conn.execute('SELECT 1')

            # Verify MongoDB connection
            await self._mongo_db.command('ping')

            self._logger.info("Database connections verified successfully")

        except Exception as e:
            self._logger.error("Connection verification failed", e)
            raise

async def create_database_manager() -> DatabaseManager:
    """Factory function to create DatabaseManager instance with enhanced configuration"""
    db_manager = DatabaseManager()
    await db_manager.initialize()
    await db_manager.check_health()
    return db_manager

# Export DatabaseManager and factory function
__all__ = ['DatabaseManager', 'create_database_manager']