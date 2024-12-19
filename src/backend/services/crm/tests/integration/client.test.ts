/**
 * @fileoverview Integration tests for CRM service client management functionality
 * @version 1.0.0
 * @package RefactorTrack
 */

import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals'; // v29.0.0
import supertest from 'supertest'; // v6.3.3
import { DataSource, Repository } from 'typeorm'; // v0.3.17
import { ClientController } from '../../src/controllers/clientController';
import { ClientService } from '../../src/services/clientService';
import { 
  IClient, 
  IndustryType, 
  ClientStatus,
  CreateClientPayload 
} from '../../src/interfaces/client.interface';
import { UUID, ApiResponse } from '../../../shared/types/common.types';

// Test constants
const TEST_AUTH_TOKEN = 'test-auth-token';
const BASE_URL = '/api/v1/clients';
const MOCK_CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000' as UUID;

// Test data factory
const createTestClient = (): CreateClientPayload => ({
  company_name: 'Test Company LLC',
  industry: IndustryType.TECHNOLOGY,
  contacts: [
    {
      name: 'John Doe',
      title: 'CTO',
      email: 'john.doe@testcompany.com',
      phone: '+12025550123',
      is_primary: true
    }
  ],
  status: ClientStatus.ACTIVE,
  billing_address: '123 Test St, Test City, TS 12345',
  notes: 'Test client notes'
});

describe('Client API Integration Tests', () => {
  let app: Express.Application;
  let request: supertest.SuperTest<supertest.Test>;
  let dataSource: DataSource;
  let clientRepository: Repository<IClient>;
  let testClient: IClient;

  beforeAll(async () => {
    // Initialize test database connection
    dataSource = new DataSource({
      type: 'postgres',
      database: 'refactortrack_test',
      synchronize: true,
      logging: false,
      entities: ['src/entities/**/*.ts'],
    });
    await dataSource.initialize();

    // Initialize test application
    const clientService = new ClientService(
      dataSource.getRepository(IClient),
      dataSource,
      console,
      metrics,
      encryption
    );
    const clientController = new ClientController(clientService, console, metrics);
    app = createTestApp(clientController);
    request = supertest(app);

    // Create test client repository
    clientRepository = dataSource.getRepository(IClient);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await clientRepository.clear();
    
    // Create a test client for each test
    testClient = await clientRepository.save(createTestClient());
  });

  describe('POST /clients', () => {
    it('should create a new client with valid data', async () => {
      const clientData = createTestClient();

      const response = await request
        .post(BASE_URL)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .send(clientData)
        .expect(201);

      const result = response.body as ApiResponse<IClient>;
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data?.company_name).toBe(clientData.company_name);
      expect(result.data?.contacts).toHaveLength(1);
      expect(result.data?.status).toBe(ClientStatus.ACTIVE);
    });

    it('should reject client creation with invalid data', async () => {
      const invalidClient = {
        ...createTestClient(),
        company_name: '', // Invalid empty name
      };

      const response = await request
        .post(BASE_URL)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .send(invalidClient)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toContain('Company name is too short');
    });

    it('should enforce rate limiting on client creation', async () => {
      const clientData = createTestClient();
      
      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 101; i++) {
        const response = await request
          .post(BASE_URL)
          .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
          .send(clientData);

        if (i === 100) {
          expect(response.status).toBe(429);
          expect(response.body.message).toContain('Too many requests');
        }
      }
    });
  });

  describe('GET /clients/:id', () => {
    it('should retrieve an existing client', async () => {
      const response = await request
        .get(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .expect(200);

      const result = response.body as ApiResponse<IClient>;
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(testClient.id);
      expect(result.data?.company_name).toBe(testClient.company_name);
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-999999999999' as UUID;
      
      const response = await request
        .get(`${BASE_URL}/${nonExistentId}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /clients/:id', () => {
    it('should update an existing client', async () => {
      const updateData = {
        company_name: 'Updated Company Name',
        notes: 'Updated test notes'
      };

      const response = await request
        .put(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .send(updateData)
        .expect(200);

      const result = response.body as ApiResponse<IClient>;
      expect(result.data?.company_name).toBe(updateData.company_name);
      expect(result.data?.notes).toBe(updateData.notes);
      expect(result.data?.version).toBe(testClient.version + 1);
    });

    it('should handle concurrent updates correctly', async () => {
      const update1 = request
        .put(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .send({ company_name: 'Update 1' });

      const update2 = request
        .put(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .send({ company_name: 'Update 2' });

      const [response1, response2] = await Promise.all([update1, update2]);
      expect(response1.status === 200 || response2.status === 200).toBeTruthy();
      expect(response1.status === 409 || response2.status === 409).toBeTruthy();
    });
  });

  describe('GET /clients', () => {
    it('should retrieve paginated list of clients', async () => {
      // Create additional test clients
      await Promise.all([
        clientRepository.save(createTestClient()),
        clientRepository.save(createTestClient())
      ]);

      const response = await request
        .get(BASE_URL)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      const result = response.body as ApiResponse<IClient[]>;
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination?.total).toBeGreaterThan(2);
    });

    it('should filter clients by industry', async () => {
      const response = await request
        .get(BASE_URL)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .query({ filters: { industry: IndustryType.TECHNOLOGY } })
        .expect(200);

      const result = response.body as ApiResponse<IClient[]>;
      result.data?.forEach(client => {
        expect(client.industry).toBe(IndustryType.TECHNOLOGY);
      });
    });
  });

  describe('DELETE /clients/:id', () => {
    it('should soft delete an existing client', async () => {
      const response = await request
        .delete(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .expect(200);

      // Verify soft delete
      const deletedClient = await clientRepository.findOne({
        where: { id: testClient.id },
        withDeleted: true
      });
      expect(deletedClient?.deleted_at).toBeDefined();
    });

    it('should prevent access to deleted client', async () => {
      // First delete the client
      await request
        .delete(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`);

      // Then try to access it
      const response = await request
        .get(`${BASE_URL}/${testClient.id}`)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('Security Tests', () => {
    it('should reject requests without authentication', async () => {
      const response = await request
        .get(BASE_URL)
        .expect(401);

      expect(response.body.message).toContain('unauthorized');
    });

    it('should validate input data for XSS attempts', async () => {
      const maliciousClient = {
        ...createTestClient(),
        company_name: '<script>alert("xss")</script>',
      };

      const response = await request
        .post(BASE_URL)
        .set('Authorization', `Bearer ${TEST_AUTH_TOKEN}`)
        .send(maliciousClient)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0]).toContain('invalid characters');
    });
  });
});