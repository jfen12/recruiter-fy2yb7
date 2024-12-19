/**
 * @fileoverview Integration tests for RequisitionService validating CRUD operations,
 * caching behavior, security constraints, and performance metrics
 * @version 1.0.0
 * @package RefactorTrack
 */

import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'jest'; // v29.0.0
import { Repository, DataSource } from 'typeorm'; // v0.3.17
import Redis from 'ioredis'; // v5.3.0
import { Logger } from 'winston'; // v3.8.0
import { Client as ElasticsearchClient } from '@elastic/elasticsearch'; // v8.0.0

import { RequisitionService } from '../../src/services/requisitionService';
import { MatchingService } from '../../src/services/matchingService';
import { RequisitionModel } from '../../src/models/requisition.model';
import { RequisitionStatus, RequiredSkill, Requisition } from '../../src/interfaces/requisition.interface';
import { ValidationError } from '../../src/utils/validation';

// Test configuration constants
const TEST_TIMEOUT = 30000;
const PERFORMANCE_THRESHOLD = 30000; // 30 seconds max processing time
const MAX_CONCURRENT_OPERATIONS = 10;
const CACHE_PREFIX = 'test:req:';

describe('RequisitionService Integration Tests', () => {
  let dataSource: DataSource;
  let repository: Repository<RequisitionModel>;
  let redisClient: Redis;
  let elasticClient: ElasticsearchClient;
  let requisitionService: RequisitionService;
  let matchingService: MatchingService;
  let logger: Logger;

  // Test data
  const testSkills: RequiredSkill[] = [
    {
      skill_id: '550e8400-e29b-41d4-a716-446655440000',
      minimum_years: 3,
      required_level: 'ADVANCED',
      is_mandatory: true,
      weight: 1
    }
  ];

  const validRequisition = {
    title: 'Senior Software Engineer',
    client_id: '550e8400-e29b-41d4-a716-446655440001',
    hiring_manager_id: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Senior software engineer position',
    required_skills: testSkills,
    status: RequisitionStatus.DRAFT,
    priority: 'HIGH',
    location: {
      city: 'New York',
      state: 'NY',
      country: 'USA',
      remote_allowed: true
    },
    rate: 150,
    max_rate: 200,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  };

  beforeAll(async () => {
    // Initialize database connection
    dataSource = new DataSource({
      type: 'postgres',
      database: 'refactortrack_test',
      entities: [RequisitionModel],
      synchronize: true
    });
    await dataSource.initialize();

    // Initialize Redis client
    redisClient = new Redis({
      keyPrefix: CACHE_PREFIX,
      enableOfflineQueue: false
    });

    // Initialize Elasticsearch client
    elasticClient = new ElasticsearchClient({
      node: 'http://localhost:9200'
    });

    // Initialize logger
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as Logger;

    // Initialize repository
    repository = dataSource.getRepository(RequisitionModel);

    // Initialize services
    matchingService = new MatchingService(elasticClient, logger, redisClient, {});
    requisitionService = new RequisitionService(repository, matchingService, redisClient, logger);
  });

  beforeEach(async () => {
    // Clear test data
    await repository.clear();
    await redisClient.flushdb();
    await elasticClient.indices.refresh({ index: '_all' });
  });

  afterAll(async () => {
    await dataSource.destroy();
    await redisClient.quit();
    await elasticClient.close();
  });

  describe('Requisition Lifecycle Tests', () => {
    it('should successfully create and retrieve a requisition', async () => {
      const startTime = Date.now();

      // Create requisition
      const created = await requisitionService.createRequisition(validRequisition);
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.status).toBe(RequisitionStatus.DRAFT);

      // Verify creation performance
      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // Verify cache
      const cached = await redisClient.get(`req:${created.id}`);
      expect(cached).toBeDefined();
      expect(JSON.parse(cached!)).toMatchObject(created);

      // Retrieve and verify
      const retrieved = await requisitionService.getRequisitionById(created.id);
      expect(retrieved).toMatchObject(created);
    }, TEST_TIMEOUT);

    it('should handle status transitions correctly', async () => {
      // Create initial requisition
      const requisition = await requisitionService.createRequisition(validRequisition);

      // Test valid status transitions
      const transitions = [
        { from: RequisitionStatus.DRAFT, to: RequisitionStatus.OPEN },
        { from: RequisitionStatus.OPEN, to: RequisitionStatus.IN_PROGRESS },
        { from: RequisitionStatus.IN_PROGRESS, to: RequisitionStatus.CLOSED }
      ];

      for (const transition of transitions) {
        const updated = await requisitionService.updateRequisitionStatus(
          requisition.id,
          transition.to
        );
        expect(updated.status).toBe(transition.to);
      }

      // Test invalid transition
      await expect(
        requisitionService.updateRequisitionStatus(
          requisition.id,
          RequisitionStatus.DRAFT
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce security constraints and input validation', async () => {
      // Test XSS prevention
      const maliciousRequisition = {
        ...validRequisition,
        description: '<script>alert("xss")</script>Malicious content'
      };

      const created = await requisitionService.createRequisition(maliciousRequisition);
      expect(created.description).not.toContain('<script>');

      // Test input size limits
      const largeDescription = 'a'.repeat(1024 * 1024 + 1);
      await expect(
        requisitionService.createRequisition({
          ...validRequisition,
          description: largeDescription
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Candidate Matching Tests', () => {
    it('should find matching candidates within performance threshold', async () => {
      // Create test requisition
      const requisition = await requisitionService.createRequisition(validRequisition);

      const startTime = Date.now();

      // Find matches
      const matches = await requisitionService.findMatchingCandidates(requisition.id);

      // Verify performance
      const matchTime = Date.now() - startTime;
      expect(matchTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // Verify match structure
      expect(Array.isArray(matches)).toBe(true);
      if (matches.length > 0) {
        expect(matches[0]).toHaveProperty('candidateId');
        expect(matches[0]).toHaveProperty('score');
        expect(matches[0]).toHaveProperty('skillMatches');
      }

      // Verify cache
      const cached = await redisClient.get(`req:match:${requisition.id}`);
      expect(cached).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Concurrent Operation Tests', () => {
    it('should handle concurrent updates correctly', async () => {
      // Create initial requisition
      const requisition = await requisitionService.createRequisition(validRequisition);

      // Perform concurrent updates
      const updates = Array(MAX_CONCURRENT_OPERATIONS).fill(null).map((_, index) => 
        requisitionService.updateRequisition({
          id: requisition.id,
          title: `Updated Title ${index}`
        })
      );

      // Execute updates and verify
      const results = await Promise.allSettled(updates);
      const successfulUpdates = results.filter(r => r.status === 'fulfilled');
      const failedUpdates = results.filter(r => r.status === 'rejected');

      // Verify only one update succeeded due to optimistic locking
      expect(successfulUpdates.length).toBe(1);
      expect(failedUpdates.length).toBe(MAX_CONCURRENT_OPERATIONS - 1);
    }, TEST_TIMEOUT);
  });

  describe('Cache Behavior Tests', () => {
    it('should properly handle cache invalidation', async () => {
      // Create requisition
      const requisition = await requisitionService.createRequisition(validRequisition);
      
      // Verify initial cache
      let cached = await redisClient.get(`req:${requisition.id}`);
      expect(cached).toBeDefined();

      // Update requisition
      await requisitionService.updateRequisition({
        id: requisition.id,
        title: 'Updated Title'
      });

      // Verify cache invalidation
      cached = await redisClient.get(`req:${requisition.id}`);
      expect(cached).toBeNull();

      // Verify new cache entry after retrieval
      await requisitionService.getRequisitionById(requisition.id);
      cached = await redisClient.get(`req:${requisition.id}`);
      expect(cached).toBeDefined();
    });
  });
});