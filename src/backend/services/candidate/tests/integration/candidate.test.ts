/**
 * @fileoverview Integration tests for candidate service functionality
 * Validates end-to-end operations including database interactions,
 * search indexing, and API endpoints with comprehensive coverage
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Container } from 'typedi'; // v0.10.0
import { createConnection, getConnection, Connection } from 'typeorm'; // v0.3.17
import { Client as ElasticsearchClient } from '@elastic/elasticsearch'; // v8.0.0
import Redis from 'ioredis'; // v5.3.0

import { CandidateService } from '../../src/services/candidateService';
import { ICandidate, CandidateStatus } from '../../src/interfaces/candidate.interface';
import { ElasticsearchConfig } from '../../src/config/elasticsearch';
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Test utilities and helpers
let testConnection: Connection;
let candidateService: CandidateService;
let elasticsearchClient: ElasticsearchClient;
let redisClient: Redis;
let logger: Logger;
let metricsService: MetricsService;

/**
 * Test data generator for creating valid candidate profiles
 */
const createTestCandidate = (overrides: Partial<ICandidate> = {}): ICandidate => ({
  first_name: 'John',
  last_name: 'Doe',
  email: `john.doe.${Date.now()}@example.com`,
  phone: '+1234567890',
  skills: [
    {
      skill_id: '123e4567-e89b-12d3-a456-426614174000',
      years_of_experience: 5,
      proficiency_level: 'ADVANCED'
    }
  ],
  experience: [{
    company: 'Tech Corp',
    title: 'Senior Developer',
    start_date: new Date('2020-01-01'),
    end_date: null,
    description: 'Full stack development',
    technologies_used: ['Node.js', 'React'],
    is_current: true,
    location: 'Remote',
    achievements: ['Increased performance by 50%']
  }],
  education: [{
    institution: 'Tech University',
    degree: 'Bachelor',
    field_of_study: 'Computer Science',
    graduation_date: new Date('2019-05-15'),
    gpa: 3.8,
    honors: ['Cum Laude'],
    certifications: ['AWS Certified'],
    is_verified: true
  }],
  status: CandidateStatus.ACTIVE,
  resume_url: 'https://example.com/resume.pdf',
  preferred_location: 'New York',
  willing_to_relocate: true,
  remote_work_preference: 'REMOTE',
  availability_date: new Date(),
  salary_expectations: {
    minimum: 100000,
    maximum: 150000,
    currency: 'USD',
    rate_type: 'ANNUAL'
  },
  gdpr_consent: true,
  data_retention_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  marketing_consent: true,
  last_consent_date: new Date(),
  source: 'LinkedIn',
  tags: ['javascript', 'react'],
  notes: ['Excellent communication skills'],
  last_activity_date: new Date(),
  ...overrides
});

/**
 * Test setup - runs before each test
 */
beforeEach(async () => {
  // Initialize logger and metrics
  logger = new Logger('candidate-service-test');
  metricsService = new MetricsService('candidate-test');

  // Create test database connection
  testConnection = await createConnection({
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: Number(process.env.TEST_DB_PORT) || 5432,
    username: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    database: process.env.TEST_DB_NAME || 'refactortrack_test',
    entities: ['src/backend/services/candidate/src/models/*.ts'],
    synchronize: true,
    dropSchema: true
  });

  // Initialize Elasticsearch client
  const esConfig = new ElasticsearchConfig({
    node: process.env.TEST_ES_NODE || 'http://localhost:9200'
  });
  elasticsearchClient = await esConfig.getClient();
  await esConfig.createIndices();

  // Initialize Redis client
  redisClient = new Redis({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: Number(process.env.TEST_REDIS_PORT) || 6379,
    db: Number(process.env.TEST_REDIS_DB) || 1
  });

  // Initialize candidate service
  Container.set('Logger', logger);
  Container.set('MetricsService', metricsService);
  Container.set('ElasticsearchClient', elasticsearchClient);
  Container.set('RedisClient', redisClient);
  candidateService = Container.get(CandidateService);
});

/**
 * Test cleanup - runs after each test
 */
afterEach(async () => {
  // Clean up database
  await testConnection.dropDatabase();
  await testConnection.close();

  // Clean up Elasticsearch
  await elasticsearchClient.indices.delete({
    index: 'refactortrack_candidates_test'
  });

  // Clean up Redis
  await redisClient.flushdb();
  await redisClient.quit();

  Container.reset();
});

describe('CandidateService Integration Tests', () => {
  describe('createCandidate', () => {
    it('should create a candidate with all required fields', async () => {
      const candidateData = createTestCandidate();
      const startTime = Date.now();

      const result = await candidateService.createCandidate(candidateData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(candidateData.email);
      expect(Date.now() - startTime).toBeLessThan(30000); // 30-second requirement
    });

    it('should handle concurrent candidate creation', async () => {
      const candidates = Array(5).fill(null).map(() => createTestCandidate());
      const results = await Promise.all(
        candidates.map(candidate => candidateService.createCandidate(candidate))
      );

      expect(results).toHaveLength(5);
      expect(new Set(results.map(r => r.id)).size).toBe(5);
    });

    it('should reject invalid candidate data', async () => {
      const invalidData = createTestCandidate({ email: 'invalid-email' });
      await expect(candidateService.createCandidate(invalidData))
        .rejects.toThrow();
    });
  });

  describe('updateCandidate', () => {
    it('should update candidate profile within performance requirements', async () => {
      // Create initial candidate
      const candidate = await candidateService.createCandidate(createTestCandidate());
      
      const updateData = {
        skills: [
          {
            skill_id: '123e4567-e89b-12d3-a456-426614174001',
            years_of_experience: 6,
            proficiency_level: 'EXPERT'
          }
        ]
      };

      const startTime = Date.now();
      const result = await candidateService.updateCandidate(
        candidate.id,
        updateData,
        candidate.version
      );

      expect(result.skills).toHaveLength(1);
      expect(result.version).toBe(candidate.version + 1);
      expect(Date.now() - startTime).toBeLessThan(30000);
    });

    it('should handle concurrent updates correctly', async () => {
      const candidate = await candidateService.createCandidate(createTestCandidate());

      const updates = Array(3).fill(null).map((_, i) => ({
        skills: [{
          skill_id: `skill-${i}`,
          years_of_experience: 5 + i,
          proficiency_level: 'EXPERT'
        }]
      }));

      await expect(Promise.all(
        updates.map(update => 
          candidateService.updateCandidate(candidate.id, update, candidate.version)
        )
      )).rejects.toThrow();
    });
  });

  describe('searchCandidates', () => {
    beforeEach(async () => {
      // Create test dataset
      const candidates = Array(10).fill(null).map((_, i) => createTestCandidate({
        skills: [{
          skill_id: `skill-${i}`,
          years_of_experience: 5,
          proficiency_level: 'ADVANCED'
        }],
        tags: [`tag-${i}`]
      }));

      await Promise.all(candidates.map(c => candidateService.createCandidate(c)));
      // Allow time for indexing
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should perform accurate skill-based search', async () => {
      const result = await candidateService.searchCandidates({
        query: '',
        skills: ['skill-1'],
        page: 1,
        limit: 10
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle complex search criteria', async () => {
      const result = await candidateService.searchCandidates({
        query: 'Senior Developer',
        skills: ['skill-1'],
        status: CandidateStatus.ACTIVE,
        page: 1,
        limit: 10,
        sort: {
          field: 'last_activity_date',
          order: 'desc'
        }
      });

      expect(result.items).toBeDefined();
      expect(result.took).toBeLessThan(1000); // 1-second response time
    });
  });

  describe('deleteCandidate', () => {
    it('should handle GDPR-compliant deletion', async () => {
      const candidate = await candidateService.createCandidate(createTestCandidate());
      
      await candidateService.deleteCandidate(candidate.id);

      // Verify deletion
      const searchResult = await candidateService.searchCandidates({
        query: candidate.email,
        page: 1,
        limit: 10
      });

      expect(searchResult.total).toBe(0);
    });
  });
});