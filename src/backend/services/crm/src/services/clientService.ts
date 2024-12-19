/**
 * @fileoverview Enhanced client relationship management service with security and performance features
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Injectable, Service } from '@nestjs/common'; // v9.0.0
import { Repository, QueryRunner, DataSource } from 'typeorm'; // v0.3.17
import { InjectRepository } from '@nestjs/typeorm'; // v9.0.0
import { Logger } from '@nestjs/common'; // v9.0.0
import { MetricsService } from '@refactortrack/metrics'; // v1.0.0
import { ClientError } from '@refactortrack/errors'; // v1.0.0
import { ClientEncryptionService } from '@refactortrack/encryption'; // v1.0.0

import {
  IClient,
  IClientContact,
  ClientStatus,
  IndustryType,
  CreateClientSchema,
  UpdateClientSchema,
  CreateClientPayload,
  UpdateClientPayload
} from '../interfaces/client.interface';
import { UUID, ApiResponse } from '../../../shared/types/common.types';

/**
 * Enhanced service class for client relationship management
 * Implements comprehensive security, monitoring, and performance features
 */
@Service()
@Injectable()
export class ClientService {
  private readonly METRICS_PREFIX = 'crm.client_service';

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
    private readonly metrics: MetricsService,
    private readonly encryptionService: ClientEncryptionService
  ) {
    this.logger.setContext('ClientService');
  }

  /**
   * Creates a new client with enhanced security and validation
   * @param createClientDto - Client creation payload
   * @returns Newly created client with encrypted sensitive data
   * @throws ClientError for validation or processing failures
   */
  async createClient(createClientDto: CreateClientPayload): Promise<ApiResponse<IClient>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.create_client`);
    
    try {
      // Validate input data
      const validationResult = CreateClientSchema.safeParse(createClientDto);
      if (!validationResult.success) {
        throw new ClientError('VALIDATION_ERROR', validationResult.error.message);
      }

      // Start transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Encrypt sensitive data
        const encryptedContacts = await Promise.all(
          createClientDto.contacts.map(async (contact) => ({
            ...contact,
            email: await this.encryptionService.encrypt(contact.email),
            phone: await this.encryptionService.encrypt(contact.phone)
          }))
        );

        // Create client entity
        const client = this.clientRepository.create({
          ...createClientDto,
          contacts: encryptedContacts,
          status_history: [{
            status: ClientStatus.ACTIVE,
            timestamp: new Date(),
            reason: 'Initial creation'
          }],
          encryption_key_id: await this.encryptionService.getCurrentKeyId()
        });

        // Save with optimistic locking
        const savedClient = await queryRunner.manager.save(client);
        await queryRunner.commitTransaction();

        // Log success and record metrics
        this.logger.log(`Created client: ${savedClient.id}`);
        this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_created`);

        return {
          data: this.sanitizeClientData(savedClient),
          status: 201,
          message: 'Client created successfully',
          errors: null,
          metadata: {},
          pagination: null
        };

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error) {
      this.logger.error(`Failed to create client: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.create_client_errors`);
      throw new ClientError('CREATE_FAILED', error.message);
    } finally {
      timer.end();
    }
  }

  /**
   * Updates existing client with validation and security checks
   * @param clientId - UUID of client to update
   * @param updateClientDto - Client update payload
   * @returns Updated client with refreshed encryption
   * @throws ClientError for validation or processing failures
   */
  async updateClient(
    clientId: UUID,
    updateClientDto: UpdateClientPayload
  ): Promise<ApiResponse<IClient>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.update_client`);

    try {
      // Validate input data
      const validationResult = UpdateClientSchema.safeParse(updateClientDto);
      if (!validationResult.success) {
        throw new ClientError('VALIDATION_ERROR', validationResult.error.message);
      }

      // Start transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Fetch existing client
        const existingClient = await this.clientRepository.findOne({
          where: { id: clientId },
          lock: { mode: 'pessimistic_write' }
        });

        if (!existingClient) {
          throw new ClientError('NOT_FOUND', `Client with ID ${clientId} not found`);
        }

        // Handle contact updates with encryption
        let updatedContacts: IClientContact[] = existingClient.contacts;
        if (updateClientDto.contacts) {
          updatedContacts = await Promise.all(
            updateClientDto.contacts.map(async (contact) => ({
              ...contact,
              email: await this.encryptionService.encrypt(contact.email),
              phone: await this.encryptionService.encrypt(contact.phone)
            }))
          );
        }

        // Handle status change
        if (updateClientDto.status && updateClientDto.status !== existingClient.status) {
          existingClient.status_history.push({
            status: updateClientDto.status,
            timestamp: new Date(),
            reason: updateClientDto.statusChangeReason || 'Status updated'
          });
        }

        // Update client
        const updatedClient = await queryRunner.manager.save(Client, {
          ...existingClient,
          ...updateClientDto,
          contacts: updatedContacts,
          updated_at: new Date(),
          version: existingClient.version + 1
        });

        await queryRunner.commitTransaction();

        // Log success and record metrics
        this.logger.log(`Updated client: ${clientId}`);
        this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_updated`);

        return {
          data: this.sanitizeClientData(updatedClient),
          status: 200,
          message: 'Client updated successfully',
          errors: null,
          metadata: {},
          pagination: null
        };

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error) {
      this.logger.error(`Failed to update client ${clientId}: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.update_client_errors`);
      throw new ClientError('UPDATE_FAILED', error.message);
    } finally {
      timer.end();
    }
  }

  /**
   * Sanitizes client data by decrypting necessary fields and removing sensitive information
   * @param client - Raw client data from database
   * @returns Sanitized client data safe for external use
   * @private
   */
  private async sanitizeClientData(client: IClient): Promise<IClient> {
    const decryptedContacts = await Promise.all(
      client.contacts.map(async (contact) => ({
        ...contact,
        email: await this.encryptionService.decrypt(contact.email),
        phone: await this.encryptionService.decrypt(contact.phone)
      }))
    );

    return {
      ...client,
      contacts: decryptedContacts,
      encryption_key_id: undefined
    };
  }
}