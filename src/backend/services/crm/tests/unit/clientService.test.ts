/**
 * @fileoverview Unit tests for ClientService with comprehensive coverage of business logic,
 * security measures, and performance metrics
 * @version 1.0.0
 * @package RefactorTrack
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, jest } from '@jest/globals'; // v29.0.0
import { Repository, DataSource, QueryRunner } from 'typeorm'; // v0.3.17
import { Logger } from '@nestjs/common'; // v9.0.0
import { TypeOrmMock } from 'typeorm-mock-unit-testing'; // v1.0.0
import { z } from 'zod'; // v3.0.0

import { ClientService } from '../../src/services/clientService';
import { 
  IClient, 
  ClientStatus, 
  IndustryType,
  CreateClientPayload,
  UpdateClientPayload 
} from '../../src/interfaces/client.interface';
import { UUID } from '../../../shared/types/common.types';

describe('ClientService', () => {
  let clientService: ClientService;
  let mockRepository: jest.Mocked<Repository<IClient>>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockLogger: jest.Mocked<Logger>;
  let mockMetricsService: jest.Mocked<any>;
  let mockEncryptionService: jest.Mocked<any>;
  let mockTimer: jest.Mocked<any>;

  // Test data
  const validClientData: CreateClientPayload = {
    company_name: 'TechCorp',
    industry: IndustryType.TECHNOLOGY,
    contacts: [{
      name: 'John Doe',
      title: 'CTO',
      email: 'john@techcorp.com',
      phone: '+1234567890',
      is_primary: true
    }],
    status: ClientStatus.ACTIVE,
    billing_address: '123 Tech Street, Silicon Valley, CA',
    notes: 'Premium enterprise client'
  };

  beforeAll(() => {
    // Initialize global mocks
    mockTimer = {
      end: jest.fn()
    };

    mockMetricsService = {
      startTimer: jest.fn().mockReturnValue(mockTimer),
      incrementCounter: jest.fn(),
      recordLatency: jest.fn()
    };

    mockEncryptionService = {
      encrypt: jest.fn().mockImplementation((value) => `encrypted_${value}`),
      decrypt: jest.fn().mockImplementation((value) => value.replace('encrypted_', '')),
      getCurrentKeyId: jest.fn().mockReturnValue('key_123')
    };
  });

  beforeEach(() => {
    // Initialize test-specific mocks
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn(),
      manager: {
        save: jest.fn()
      }
    } as unknown as jest.Mocked<Repository<IClient>>;

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn()
      }
    } as unknown as jest.Mocked<QueryRunner>;

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner)
    } as unknown as jest.Mocked<DataSource>;

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Initialize ClientService with mocks
    clientService = new ClientService(
      mockRepository,
      mockDataSource,
      mockLogger,
      mockMetricsService,
      mockEncryptionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    it('should successfully create a client with encrypted data', async () => {
      // Arrange
      const expectedClient = {
        ...validClientData,
        id: 'client_123' as UUID,
        contacts: [{
          ...validClientData.contacts[0],
          email: 'encrypted_john@techcorp.com',
          phone: 'encrypted_+1234567890'
        }],
        status_history: [{
          status: ClientStatus.ACTIVE,
          timestamp: expect.any(Date),
          reason: 'Initial creation'
        }],
        encryption_key_id: 'key_123',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        version: 1
      };

      mockRepository.create.mockReturnValue(expectedClient);
      mockQueryRunner.manager.save.mockResolvedValue(expectedClient);

      // Act
      const result = await clientService.createClient(validClientData);

      // Assert
      expect(result.status).toBe(201);
      expect(result.data).toMatchObject({
        ...expectedClient,
        contacts: [{
          ...validClientData.contacts[0],
          email: 'john@techcorp.com',
          phone: '+1234567890'
        }]
      });
      expect(mockEncryptionService.encrypt).toHaveBeenCalledTimes(2);
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('crm.client_service.clients_created');
      expect(mockTimer.end).toHaveBeenCalled();
    });

    it('should handle validation errors correctly', async () => {
      // Arrange
      const invalidData = {
        ...validClientData,
        company_name: '' // Invalid empty company name
      };

      // Act & Assert
      await expect(clientService.createClient(invalidData))
        .rejects
        .toThrow('VALIDATION_ERROR');

      expect(mockMetricsService.incrementCounter)
        .toHaveBeenCalledWith('crm.client_service.create_client_errors');
    });

    it('should handle transaction failures and rollback', async () => {
      // Arrange
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(clientService.createClient(validClientData))
        .rejects
        .toThrow('CREATE_FAILED');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockMetricsService.incrementCounter)
        .toHaveBeenCalledWith('crm.client_service.create_client_errors');
    });
  });

  describe('updateClient', () => {
    const clientId = 'existing_client_123' as UUID;
    const updateData: UpdateClientPayload = {
      company_name: 'TechCorp Updated',
      status: ClientStatus.ON_HOLD,
      statusChangeReason: 'Contract review'
    };

    it('should successfully update a client with new encrypted data', async () => {
      // Arrange
      const existingClient = {
        ...validClientData,
        id: clientId,
        version: 1,
        contacts: [{
          ...validClientData.contacts[0],
          email: 'encrypted_john@techcorp.com',
          phone: 'encrypted_+1234567890'
        }],
        status_history: []
      };

      mockRepository.findOne.mockResolvedValue(existingClient);
      mockQueryRunner.manager.save.mockImplementation(async (_, data) => data);

      // Act
      const result = await clientService.updateClient(clientId, updateData);

      // Assert
      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({
        ...existingClient,
        ...updateData,
        version: 2,
        status_history: expect.arrayContaining([{
          status: ClientStatus.ON_HOLD,
          timestamp: expect.any(Date),
          reason: 'Contract review'
        }])
      });
      expect(mockMetricsService.incrementCounter)
        .toHaveBeenCalledWith('crm.client_service.clients_updated');
    });

    it('should handle non-existent client updates', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(clientService.updateClient(clientId, updateData))
        .rejects
        .toThrow('NOT_FOUND');

      expect(mockMetricsService.incrementCounter)
        .toHaveBeenCalledWith('crm.client_service.update_client_errors');
    });

    it('should maintain data integrity with optimistic locking', async () => {
      // Arrange
      const existingClient = {
        ...validClientData,
        id: clientId,
        version: 1
      };

      mockRepository.findOne.mockResolvedValue(existingClient);
      mockQueryRunner.manager.save.mockImplementation(async (_, data) => ({
        ...data,
        version: data.version + 1
      }));

      // Act
      const result = await clientService.updateClient(clientId, updateData);

      // Assert
      expect(result.data.version).toBe(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('sanitizeClientData', () => {
    it('should correctly decrypt sensitive data and remove internal fields', async () => {
      // Arrange
      const rawClient = {
        ...validClientData,
        id: 'client_123' as UUID,
        contacts: [{
          ...validClientData.contacts[0],
          email: 'encrypted_john@techcorp.com',
          phone: 'encrypted_+1234567890'
        }],
        encryption_key_id: 'key_123'
      };

      // Act
      const result = await (clientService as any).sanitizeClientData(rawClient);

      // Assert
      expect(result.contacts[0].email).toBe('john@techcorp.com');
      expect(result.contacts[0].phone).toBe('+1234567890');
      expect(result.encryption_key_id).toBeUndefined();
    });
  });
});