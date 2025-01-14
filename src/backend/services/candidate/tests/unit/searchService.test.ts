import { Container } from 'typedi';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import { CandidateSearchService } from '../../src/services/searchService';
import { ICandidate, CandidateStatus } from '../../src/interfaces/candidate.interface';
import { ElasticsearchConfig } from '../../src/config/elasticsearch';
import { Logger } from '../../../shared/utils/logger';
import { MetricsCollector } from '../../../shared/utils/metrics';

jest.mock('@elastic/elasticsearch');
jest.mock('ioredis');
jest.mock('../../../shared/utils/logger');
jest.mock('../../../shared/utils/metrics');

describe('CandidateSearchService Unit Tests', () => {
  let searchService: CandidateSearchService;
  let esClient: ElasticsearchClient;
  let redisClient: Redis;
  let logger: Logger;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    esClient = new ElasticsearchClient({ node: 'http://localhost:9200' });
    redisClient = new Redis();
    logger = new Logger('test-logger');
    metricsCollector = new MetricsCollector('test-metrics');

    const esConfig = new ElasticsearchConfig({
      node: 'http://localhost:9200'
    });

    Container.set('ElasticsearchConfig', esConfig);
    Container.set('RedisClient', redisClient);
    Container.set('MetricsCollector', metricsCollector);

    searchService = new CandidateSearchService(esConfig, redisClient, metricsCollector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Container.reset();
  });

  describe('searchCandidates', () => {
    it('should return search results from Elasticsearch', async () => {
      const mockResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            {
              _source: {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                skills: [{ skill_id: '123', years_of_experience: 5, proficiency_level: 'ADVANCED' }],
                status: CandidateStatus.ACTIVE
              },
              _score: 1.0
            }
          ]
        },
        took: 10
      };

      esClient.search = jest.fn().mockResolvedValue(mockResponse);

      const params = {
        query: 'John',
        page: 1,
        limit: 10
      };

      const result = await searchService.searchCandidates(params);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].firstName).toBe('John');
      expect(result.took).toBe(10);
    });

    it('should cache search results', async () => {
      const mockResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            {
              _source: {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                skills: [{ skill_id: '123', years_of_experience: 5, proficiency_level: 'ADVANCED' }],
                status: CandidateStatus.ACTIVE
              },
              _score: 1.0
            }
          ]
        },
        took: 10
      };

      esClient.search = jest.fn().mockResolvedValue(mockResponse);
      redisClient.get = jest.fn().mockResolvedValue(null);
      redisClient.setex = jest.fn().mockResolvedValue('OK');

      const params = {
        query: 'John',
        page: 1,
        limit: 10
      };

      const result = await searchService.searchCandidates(params);

      expect(redisClient.setex).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].firstName).toBe('John');
      expect(result.took).toBe(10);
    });

    it('should return cached search results', async () => {
      const cachedResult = {
        items: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            skills: [{ skill_id: '123', years_of_experience: 5, proficiency_level: 'ADVANCED' }],
            status: CandidateStatus.ACTIVE
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        took: 10
      };

      redisClient.get = jest.fn().mockResolvedValue(JSON.stringify(cachedResult));

      const params = {
        query: 'John',
        page: 1,
        limit: 10
      };

      const result = await searchService.searchCandidates(params);

      expect(redisClient.get).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].firstName).toBe('John');
      expect(result.took).toBe(10);
    });

    it('should handle search errors gracefully', async () => {
      esClient.search = jest.fn().mockRejectedValue(new Error('Elasticsearch error'));

      const params = {
        query: 'John',
        page: 1,
        limit: 10
      };

      await expect(searchService.searchCandidates(params)).rejects.toThrow('Elasticsearch error');
    });
  });

  describe('matchCandidatesToRequisition', () => {
    it('should return matched candidates with scores', async () => {
      const mockResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            {
              _source: {
                id: '1',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                skills: [{ skill_id: '123', years_of_experience: 5, proficiency_level: 'ADVANCED' }],
                status: CandidateStatus.ACTIVE
              },
              _score: 1.0
            }
          ]
        },
        took: 10
      };

      esClient.search = jest.fn().mockResolvedValue(mockResponse);

      const criteria = {
        requiredSkills: ['123'],
        experienceYears: 5
      };

      const result = await searchService.matchCandidatesToRequisition('req-1', criteria);

      expect(result).toHaveLength(1);
      expect(result[0].candidate.firstName).toBe('John');
      expect(result[0].score).toBe(1.0);
      expect(result[0].skillMatches.matched).toContain('123');
    });

    it('should handle matching errors gracefully', async () => {
      esClient.search = jest.fn().mockRejectedValue(new Error('Elasticsearch error'));

      const criteria = {
        requiredSkills: ['123'],
        experienceYears: 5
      };

      await expect(searchService.matchCandidatesToRequisition('req-1', criteria)).rejects.toThrow('Elasticsearch error');
    });
  });
});
