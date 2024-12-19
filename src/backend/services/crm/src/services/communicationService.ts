/**
 * @fileoverview Service class for managing client communications and interaction history
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Service, Injectable } from '@nestjs/common'; // v9.0.0
import { Repository } from 'typeorm'; // v0.3.0
import { InjectRepository } from '@nestjs/typeorm'; // v9.0.0
import Redis from 'ioredis'; // v5.0.0
import { Logger } from 'winston'; // v3.8.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { AES, enc } from 'crypto-js'; // v4.1.1

import {
  ICommunication,
  ICreateCommunicationDTO,
  CommunicationType,
  CommunicationDirection,
  CommunicationSchema,
  CreateCommunicationSchema
} from '../interfaces/communication.interface';
import { ApiResponse, UUID } from '../../../shared/types/common.types';

// Encryption key should be stored in secure environment variables
const ENCRYPTION_KEY = process.env.COMMUNICATION_ENCRYPTION_KEY;
const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Enhanced service class for managing communications with security and performance features
 */
@Service()
@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(Communication)
    private readonly communicationRepository: Repository<Communication>,
    private readonly cacheClient: Redis,
    private readonly logger: Logger
  ) {}

  /**
   * Encrypts sensitive communication content
   * @param content - Content to encrypt
   * @returns Encrypted content string
   */
  private encryptContent(content: string): string {
    return AES.encrypt(content, ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypts encrypted communication content
   * @param encryptedContent - Encrypted content to decrypt
   * @returns Decrypted content string
   */
  private decryptContent(encryptedContent: string): string {
    const bytes = AES.decrypt(encryptedContent, ENCRYPTION_KEY);
    return bytes.toString(enc.Utf8);
  }

  /**
   * Generates cache key for communication records
   * @param id - Communication ID
   * @returns Cache key string
   */
  private getCacheKey(id: string): string {
    return `communication:${id}`;
  }

  /**
   * Creates a new communication record with encryption and audit trail
   * @param createDto - Communication creation DTO
   * @param userId - ID of user creating the communication
   * @returns Promise resolving to created communication
   */
  async createCommunication(
    createDto: ICreateCommunicationDTO,
    userId: UUID
  ): Promise<ApiResponse<ICommunication>> {
    try {
      // Validate input data
      const validationResult = CreateCommunicationSchema.safeParse(createDto);
      if (!validationResult.success) {
        return {
          data: null,
          status: 400,
          message: 'Invalid communication data',
          errors: validationResult.error.errors.map(e => e.message),
          metadata: {},
          pagination: null
        };
      }

      // Encrypt sensitive content
      const encryptedContent = this.encryptContent(createDto.content);

      // Create communication entity
      const communication = this.communicationRepository.create({
        ...createDto,
        id: uuidv4(),
        content: encryptedContent,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: userId
      });

      // Save to database
      const savedCommunication = await this.communicationRepository.save(communication);

      // Cache the new record
      await this.cacheClient.setex(
        this.getCacheKey(savedCommunication.id),
        CACHE_TTL,
        JSON.stringify(savedCommunication)
      );

      // Log the operation
      this.logger.info('Communication created', {
        id: savedCommunication.id,
        type: savedCommunication.type,
        userId
      });

      return {
        data: {
          ...savedCommunication,
          content: createDto.content // Return decrypted content
        },
        status: 201,
        message: 'Communication created successfully',
        errors: null,
        metadata: {
          encrypted: true,
          created_by: userId
        },
        pagination: null
      };
    } catch (error) {
      this.logger.error('Error creating communication', { error, userId });
      throw error;
    }
  }

  /**
   * Retrieves a communication record by ID with caching
   * @param id - Communication ID
   * @param userId - ID of user requesting the communication
   * @returns Promise resolving to communication record or null
   */
  async getCommunicationById(
    id: UUID,
    userId: UUID
  ): Promise<ApiResponse<ICommunication | null>> {
    try {
      // Check cache first
      const cached = await this.cacheClient.get(this.getCacheKey(id));
      let communication: ICommunication | null = null;

      if (cached) {
        communication = JSON.parse(cached);
      } else {
        // Query database if not in cache
        communication = await this.communicationRepository.findOne({ where: { id } });

        if (communication) {
          // Cache the result
          await this.cacheClient.setex(
            this.getCacheKey(id),
            CACHE_TTL,
            JSON.stringify(communication)
          );
        }
      }

      if (!communication) {
        return {
          data: null,
          status: 404,
          message: 'Communication not found',
          errors: null,
          metadata: {},
          pagination: null
        };
      }

      // Decrypt content before returning
      const decryptedContent = this.decryptContent(communication.content);

      return {
        data: {
          ...communication,
          content: decryptedContent
        },
        status: 200,
        message: 'Communication retrieved successfully',
        errors: null,
        metadata: {
          cached: !!cached,
          encrypted: true
        },
        pagination: null
      };
    } catch (error) {
      this.logger.error('Error retrieving communication', { error, id, userId });
      throw error;
    }
  }

  /**
   * Updates an existing communication record
   * @param id - Communication ID
   * @param updateDto - Updated communication data
   * @param userId - ID of user updating the communication
   * @returns Promise resolving to updated communication
   */
  async updateCommunication(
    id: UUID,
    updateDto: Partial<ICommunication>,
    userId: UUID
  ): Promise<ApiResponse<ICommunication>> {
    try {
      const existing = await this.communicationRepository.findOne({ where: { id } });
      
      if (!existing) {
        return {
          data: null,
          status: 404,
          message: 'Communication not found',
          errors: null,
          metadata: {},
          pagination: null
        };
      }

      // Encrypt content if it's being updated
      const updatedData = {
        ...updateDto,
        content: updateDto.content ? this.encryptContent(updateDto.content) : existing.content,
        updated_at: new Date()
      };

      const updated = await this.communicationRepository.save({
        ...existing,
        ...updatedData
      });

      // Invalidate cache
      await this.cacheClient.del(this.getCacheKey(id));

      this.logger.info('Communication updated', { id, userId });

      return {
        data: {
          ...updated,
          content: updateDto.content || this.decryptContent(existing.content)
        },
        status: 200,
        message: 'Communication updated successfully',
        errors: null,
        metadata: {
          updated_by: userId
        },
        pagination: null
      };
    } catch (error) {
      this.logger.error('Error updating communication', { error, id, userId });
      throw error;
    }
  }
}

export { CommunicationService };