/**
 * @fileoverview Enhanced search service for candidate profiles with advanced matching capabilities
 * Implements Elasticsearch-based search with caching, monitoring, and resilience patterns
 * @version 1.0.0
 * @package RefactorTrack
 */

// External dependencies
import { Client, SearchResponse, errors } from '@elastic/elasticsearch'; // v8.0.0
import CircuitBreaker from 'opossum'; // v6.0.0
import Redis from 'ioredis'; // v5.0.0
import { injectable, inject } from 'inversify'; // v6.0.0

// Internal dependencies
import { ICandidate, CandidateStatus } from '../interfaces/candidate.interface';
import { ElasticsearchConfig } from '../config/elasticsearch';
import { Logger } from '../../../shared/utils/logger';
import { MetricsCollector } from '../../../shared/utils/metrics';

// Types
interface SearchParams {
  query: string;
  skills?: string[];
  status?: CandidateStatus;
  experience?: {
    min: number;
    max: number;
  };
  location?: {
    city?: string;
    country?: string;
    remote?: boolean;
  };
  page: number;
  limit: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  took: number;
}

interface MatchingCriteria {
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceYears: number;
  location?: string;
  remoteOk?: boolean;
}

interface MatchResult {
  candidate: ICandidate;
  score: number;
  skillMatches: {
    matched: string[];
    missing: string[];
  };
}

@injectable()
export class CandidateSearchService {
  private readonly esClient: Client;
  private readonly logger: Logger;
  private readonly indexName: string;
  private readonly searchBreaker: CircuitBreaker;
  private readonly cacheClient: Redis;
  private readonly metricsCollector: MetricsCollector;
  private readonly CACHE_TTL = 900; // 15 minutes
  private readonly MAX_RETRIES = 3;

  constructor(
    @inject('ElasticsearchConfig') esConfig: ElasticsearchConfig,
    @inject('RedisClient') cacheClient: Redis,
    @inject('MetricsCollector') metricsCollector: MetricsCollector
  ) {
    this.logger = new Logger('candidate-search-service');
    this.esClient = esConfig.getClient();
    this.indexName = esConfig.getIndexName('candidate', process.env.NODE_ENV || 'development');
    this.cacheClient = cacheClient;
    this.metricsCollector = metricsCollector;

    // Configure circuit breaker for search operations
    this.searchBreaker = new CircuitBreaker(this.executeSearch.bind(this), {
      timeout: 5000, // 5 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds
      name: 'candidate-search'
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Performs advanced candidate search with caching and monitoring
   */
  public async searchCandidates(params: SearchParams): Promise<SearchResult<ICandidate>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(params);

    try {
      // Check cache first
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logger.debug('Cache hit for search query', { params });
        return cachedResult;
      }

      // Build search query
      const searchQuery = this.buildSearchQuery(params);
      
      // Execute search through circuit breaker
      const result = await this.searchBreaker.fire(searchQuery) as SearchResponse;
      
      // Transform and cache results
      const searchResult = this.transformSearchResponse(result, params);
      await this.cacheResult(cacheKey, searchResult);

      // Record metrics
      this.metricsCollector.recordSearchMetrics({
        duration: Date.now() - startTime,
        resultCount: searchResult.total,
        cacheHit: false
      });

      return searchResult;
    } catch (error) {
      this.handleSearchError(error as Error, params);
      throw error;
    }
  }

  /**
   * Matches candidates to job requisitions with weighted scoring
   */
  public async matchCandidatesToRequisition(
    requisitionId: string,
    criteria: MatchingCriteria
  ): Promise<MatchResult[]> {
    const startTime = Date.now();

    try {
      const matchQuery = this.buildMatchingQuery(criteria);
      const response = await this.searchBreaker.fire(matchQuery) as SearchResponse;

      const matches = this.calculateMatchScores(response, criteria);

      this.metricsCollector.recordMatchingMetrics({
        duration: Date.now() - startTime,
        matchCount: matches.length,
        requisitionId
      });

      return matches;
    } catch (error) {
      this.logger.error('Error matching candidates to requisition', error as Error, {
        requisitionId,
        criteria
      });
      throw error;
    }
  }

  /**
   * Builds optimized Elasticsearch query from search parameters
   */
  private buildSearchQuery(params: SearchParams): object {
    const query: any = {
      index: this.indexName,
      body: {
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        from: (params.page - 1) * params.limit,
        size: params.limit
      }
    };

    // Full-text search
    if (params.query) {
      query.body.query.bool.must.push({
        multi_match: {
          query: params.query,
          fields: ['firstName^2', 'lastName^2', 'skills^1.5', 'resumeText'],
          fuzziness: 'AUTO'
        }
      });
    }

    // Skills filter
    if (params.skills?.length) {
      query.body.query.bool.filter.push({
        terms: { 'skills.name.keyword': params.skills }
      });
    }

    // Status filter
    if (params.status) {
      query.body.query.bool.filter.push({
        term: { status: params.status }
      });
    }

    // Experience range
    if (params.experience) {
      query.body.query.bool.filter.push({
        range: {
          'experience.years': {
            gte: params.experience.min,
            lte: params.experience.max
          }
        }
      });
    }

    // Location filtering
    if (params.location) {
      const locationFilter: any = { bool: { should: [] } };
      
      if (params.location.city) {
        locationFilter.bool.should.push({
          match: { 'location.city': params.location.city }
        });
      }
      
      if (params.location.country) {
        locationFilter.bool.should.push({
          match: { 'location.country': params.location.country }
        });
      }
      
      if (params.location.remote) {
        locationFilter.bool.should.push({
          term: { 'willing_to_relocate': true }
        });
      }
      
      query.body.query.bool.filter.push(locationFilter);
    }

    // Sorting
    if (params.sort) {
      query.body.sort = [{
        [params.sort.field]: {
          order: params.sort.order
        }
      }];
    }

    return query;
  }

  /**
   * Builds specialized query for candidate-requisition matching
   */
  private buildMatchingQuery(criteria: MatchingCriteria): object {
    return {
      index: this.indexName,
      body: {
        query: {
          bool: {
            must: [
              {
                terms: {
                  'skills.name.keyword': criteria.requiredSkills,
                  boost: 2.0
                }
              }
            ],
            should: criteria.preferredSkills?.map(skill => ({
              term: {
                'skills.name.keyword': {
                  value: skill,
                  boost: 1.0
                }
              }
            })) || [],
            filter: [
              {
                range: {
                  'experience.years': {
                    gte: Math.max(0, criteria.experienceYears - 2),
                    lte: criteria.experienceYears + 5
                  }
                }
              },
              {
                term: { status: CandidateStatus.ACTIVE }
              }
            ]
          }
        },
        size: 100,
        _source: true
      }
    };
  }

  /**
   * Executes search operation with retry logic
   */
  private async executeSearch(query: object, retryCount = 0): Promise<SearchResponse> {
    try {
      return await this.esClient.search(query);
    } catch (error) {
      if (error instanceof errors.ConnectionError && retryCount < this.MAX_RETRIES) {
        this.logger.warn('Retrying failed search operation', {
          retryCount,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return this.executeSearch(query, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Transforms Elasticsearch response into standardized search result
   */
  private transformSearchResponse(
    response: SearchResponse,
    params: SearchParams
  ): SearchResult<ICandidate> {
    return {
      items: response.hits.hits.map(hit => ({
        ...hit._source as ICandidate,
        score: hit._score
      })),
      total: response.hits.total.value,
      page: params.page,
      limit: params.limit,
      took: response.took
    };
  }

  /**
   * Calculates and ranks candidate matches based on criteria
   */
  private calculateMatchScores(
    response: SearchResponse,
    criteria: MatchingCriteria
  ): MatchResult[] {
    return response.hits.hits.map(hit => {
      const candidate = hit._source as ICandidate;
      const candidateSkills = new Set(candidate.skills.map(s => s.name));
      
      const matchedSkills = criteria.requiredSkills.filter(skill => 
        candidateSkills.has(skill)
      );
      
      const missingSkills = criteria.requiredSkills.filter(skill => 
        !candidateSkills.has(skill)
      );

      return {
        candidate,
        score: hit._score,
        skillMatches: {
          matched: matchedSkills,
          missing: missingSkills
        }
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Generates cache key from search parameters
   */
  private generateCacheKey(params: SearchParams): string {
    return `search:${JSON.stringify(params)}`;
  }

  /**
   * Retrieves cached search results
   */
  private async getCachedResult(key: string): Promise<SearchResult<ICandidate> | null> {
    const cached = await this.cacheClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Caches search results
   */
  private async cacheResult(key: string, result: SearchResult<ICandidate>): Promise<void> {
    await this.cacheClient.setex(key, this.CACHE_TTL, JSON.stringify(result));
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.searchBreaker.on('open', () => {
      this.logger.warn('Search circuit breaker opened');
    });

    this.searchBreaker.on('halfOpen', () => {
      this.logger.info('Search circuit breaker half-opened');
    });

    this.searchBreaker.on('close', () => {
      this.logger.info('Search circuit breaker closed');
    });
  }

  /**
   * Handles and logs search errors
   */
  private handleSearchError(error: Error, params: SearchParams): void {
    this.logger.error('Search operation failed', error, {
      params,
      indexName: this.indexName
    });

    if (error instanceof errors.ConnectionError) {
      this.metricsCollector.recordSearchMetrics({
        error: 'connection_error',
        params: JSON.stringify(params)
      });
    } else if (error instanceof errors.ResponseError) {
      this.metricsCollector.recordSearchMetrics({
        error: 'response_error',
        params: JSON.stringify(params)
      });
    }
  }
}