// External dependencies
// @elastic/elasticsearch v8.0.0 - Official Elasticsearch client
import { Client, ConfigOptions } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';

// Internal dependencies
import { Logger } from '../../shared/utils/logger';

// Environment-based configuration with secure defaults
const ES_NODE = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const ES_USERNAME = process.env.ELASTICSEARCH_USERNAME;
const ES_PASSWORD = process.env.ELASTICSEARCH_PASSWORD;
const ES_INDEX_PREFIX = 'refactortrack_candidates';
const ES_MAX_RETRIES = Number(process.env.ELASTICSEARCH_MAX_RETRIES || 3);
const ES_REQUEST_TIMEOUT = Number(process.env.ELASTICSEARCH_REQUEST_TIMEOUT || 30000);
const ES_PING_TIMEOUT = Number(process.env.ELASTICSEARCH_PING_TIMEOUT || 3000);
const ES_SNIFF_ON_START = process.env.ELASTICSEARCH_SNIFF_ON_START === 'true';
const ES_SSL_VERIFY = process.env.NODE_ENV === 'production';

/**
 * Enhanced configuration class for Elasticsearch with comprehensive error handling
 * and health monitoring capabilities.
 */
export class ElasticsearchConfig {
  private client: Client;
  private logger: Logger;
  private options: ConfigOptions;
  private isConnected: boolean = false;
  private healthCheckInterval: NodeJS.Timer | null = null;

  constructor(options: ConfigOptions = {}) {
    this.logger = new Logger('elasticsearch-config', {
      additionalMeta: { service: 'candidate-service' }
    });

    this.options = this.mergeConfig(options);
    this.client = this.initializeClient();
    this.setupHealthCheck();
  }

  /**
   * Merges provided configuration with default settings
   */
  private mergeConfig(options: ConfigOptions): ConfigOptions {
    const defaultConfig: ConfigOptions = {
      node: ES_NODE,
      auth: ES_USERNAME && ES_PASSWORD ? {
        username: ES_USERNAME,
        password: ES_PASSWORD
      } : undefined,
      maxRetries: ES_MAX_RETRIES,
      requestTimeout: ES_REQUEST_TIMEOUT,
      pingTimeout: ES_PING_TIMEOUT,
      sniffOnStart: ES_SNIFF_ON_START,
      ssl: ES_SSL_VERIFY ? {
        rejectUnauthorized: true
      } : undefined
    };

    return { ...defaultConfig, ...options };
  }

  /**
   * Initializes Elasticsearch client with error handling
   */
  private initializeClient(): Client {
    try {
      const client = new Client(this.options);
      this.logger.info('Elasticsearch client initialized', { node: ES_NODE });
      return client;
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch client', error as Error);
      throw error;
    }
  }

  /**
   * Sets up periodic health checks for the Elasticsearch connection
   */
  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkConnection();
      } catch (error) {
        this.logger.error('Health check failed', error as Error);
        this.isConnected = false;
      }
    }, ES_PING_TIMEOUT);
  }

  /**
   * Returns validated Elasticsearch client instance
   */
  public async getClient(): Promise<Client> {
    if (!this.isConnected) {
      await this.checkConnection();
    }
    return this.client;
  }

  /**
   * Comprehensive connection and cluster health verification
   */
  public async checkConnection(): Promise<boolean> {
    try {
      // Ping test
      await this.client.ping({ timeout: ES_PING_TIMEOUT });

      // Cluster health check
      const health = await this.client.cluster.health();
      
      if (health.status === 'red') {
        this.logger.warn('Elasticsearch cluster health is red', { health });
        return false;
      }

      this.isConnected = true;
      this.logger.debug('Elasticsearch connection verified', { 
        health,
        node: ES_NODE 
      });
      
      return true;
    } catch (error) {
      this.isConnected = false;
      if (error instanceof errors.ConnectionError) {
        this.logger.error('Elasticsearch connection error', error);
      } else if (error instanceof errors.TimeoutError) {
        this.logger.error('Elasticsearch timeout error', error);
      } else {
        this.logger.error('Elasticsearch check failed', error as Error);
      }
      throw error;
    }
  }

  /**
   * Creates and maintains required indices with proper mappings
   */
  public async createIndices(): Promise<void> {
    try {
      const indexName = getIndexName('candidate', process.env.NODE_ENV || 'development');
      
      const indexExists = await this.client.indices.exists({ index: indexName });
      
      if (!indexExists) {
        await this.client.indices.create({
          index: indexName,
          body: {
            settings: {
              number_of_shards: 3,
              number_of_replicas: 2,
              analysis: {
                analyzer: {
                  resume_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball']
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                firstName: { type: 'text' },
                lastName: { type: 'text' },
                email: { type: 'keyword' },
                skills: { type: 'keyword' },
                resumeText: { 
                  type: 'text',
                  analyzer: 'resume_analyzer'
                },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            }
          }
        });
        
        this.logger.info('Created Elasticsearch index', { index: indexName });
      }
    } catch (error) {
      this.logger.error('Failed to create indices', error as Error);
      throw error;
    }
  }

  /**
   * Cleanup resources on service shutdown
   */
  public async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    await this.client.close();
    this.logger.info('Elasticsearch resources cleaned up');
  }
}

/**
 * Creates and configures an Elasticsearch client instance
 */
export async function createElasticsearchClient(options: ConfigOptions = {}): Promise<Client> {
  const config = new ElasticsearchConfig(options);
  await config.checkConnection();
  await config.createIndices();
  return config.getClient();
}

/**
 * Generates environment-aware index names
 */
export function getIndexName(entityType: string, environment: string): string {
  if (!entityType) {
    throw new Error('Entity type is required for index name generation');
  }
  
  const envSuffix = environment !== 'production' ? `_${environment}` : '';
  return `${ES_INDEX_PREFIX}_${entityType}${envSuffix}`.toLowerCase();
}