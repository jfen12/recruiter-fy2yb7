/**
 * @fileoverview Service class implementing core business logic for managing job requisitions
 * Provides comprehensive requisition management with enhanced caching, security, and performance
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Injectable } from '@nestjs/common'; // v9.0.0
import { Repository } from 'typeorm'; // v0.3.17
import { Logger } from 'winston'; // v3.8.0
import Redis from 'ioredis'; // v5.3.0
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import { InjectRepository } from '@nestjs/typeorm'; // v9.0.0

import { Requisition, RequisitionStatus } from '../interfaces/requisition.interface';
import { RequisitionModel } from '../models/requisition.model';
import { MatchingService } from './matchingService';
import { 
  validateCreateRequisition, 
  validateUpdateRequisition,
  ValidationError 
} from '../utils/validation';

/**
 * Cache configuration for requisition data
 */
const CACHE_CONFIG = {
  REQUISITION_TTL: 3600, // 1 hour
  LIST_TTL: 300, // 5 minutes
  MATCH_TTL: 1800 // 30 minutes
};

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  CREATE: { points: 50, duration: 3600 }, // 50 creates per hour
  UPDATE: { points: 100, duration: 3600 }, // 100 updates per hour
  SEARCH: { points: 300, duration: 3600 } // 300 searches per hour
};

/**
 * Service class implementing requisition management functionality
 */
@Injectable()
export class RequisitionService {
  private readonly cacheKeyPrefix = 'req:';

  constructor(
    @InjectRepository(RequisitionModel)
    private readonly repository: Repository<RequisitionModel>,
    private readonly matchingService: MatchingService,
    private readonly redisClient: Redis,
    private readonly logger: Logger,
    private readonly rateLimiter: RateLimiter
  ) {}

  /**
   * Creates a new requisition with validation and caching
   * @param data - Requisition creation data
   * @returns Created requisition
   * @throws ValidationError if data is invalid
   */
  async createRequisition(data: CreateRequisitionDTO): Promise<Requisition> {
    try {
      // Rate limit check
      await this.rateLimiter.consume(`create:${data.client_id}`, RATE_LIMIT_CONFIG.CREATE.points);

      // Validate input data
      const validatedData = await validateCreateRequisition(data);

      // Start transaction
      const queryRunner = this.repository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Create requisition model
        const requisition = new RequisitionModel({
          ...validatedData,
          status: RequisitionStatus.DRAFT
        });

        // Save to database
        const savedRequisition = await queryRunner.manager.save(requisition);

        // Update cache
        await this.cacheRequisition(savedRequisition);

        // Commit transaction
        await queryRunner.commitTransaction();

        this.logger.info('Requisition created successfully', {
          requisitionId: savedRequisition.id,
          clientId: savedRequisition.client_id
        });

        return savedRequisition;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('Error creating requisition:', error);
      throw error;
    }
  }

  /**
   * Updates an existing requisition with optimistic locking
   * @param data - Requisition update data
   * @returns Updated requisition
   * @throws ValidationError if data is invalid
   */
  async updateRequisition(data: UpdateRequisitionDTO): Promise<Requisition> {
    try {
      // Rate limit check
      await this.rateLimiter.consume(`update:${data.id}`, RATE_LIMIT_CONFIG.UPDATE.points);

      // Validate update data
      const validatedData = await validateUpdateRequisition(data);

      // Start transaction
      const queryRunner = this.repository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Get existing requisition with lock
        const existing = await queryRunner.manager.findOne(RequisitionModel, {
          where: { id: data.id },
          lock: { mode: 'pessimistic_write' }
        });

        if (!existing) {
          throw new Error('Requisition not found');
        }

        // Update model
        Object.assign(existing, validatedData);
        
        // Validate state transition if status is being updated
        if (data.status) {
          await existing.updateStatus(data.status);
        }

        // Save changes
        const updated = await queryRunner.manager.save(existing);

        // Invalidate cache
        await this.invalidateRequisitionCache(data.id);

        // Commit transaction
        await queryRunner.commitTransaction();

        this.logger.info('Requisition updated successfully', {
          requisitionId: updated.id,
          status: updated.status
        });

        return updated;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('Error updating requisition:', error);
      throw error;
    }
  }

  /**
   * Finds matching candidates for a requisition
   * @param requisitionId - ID of the requisition
   * @param options - Search options
   * @returns Array of matching candidates with scores
   */
  async findMatchingCandidates(
    requisitionId: string,
    options: MatchOptions = {}
  ): Promise<MatchResult[]> {
    try {
      // Rate limit check
      await this.rateLimiter.consume(`search:${requisitionId}`, RATE_LIMIT_CONFIG.SEARCH.points);

      // Check cache
      const cacheKey = `${this.cacheKeyPrefix}match:${requisitionId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get requisition
      const requisition = await this.repository.findOne({
        where: { id: requisitionId }
      });

      if (!requisition) {
        throw new Error('Requisition not found');
      }

      // Find matches
      const matches = await this.matchingService.findMatchingCandidates(
        requisition,
        options
      );

      // Cache results
      await this.redisClient.setex(
        cacheKey,
        CACHE_CONFIG.MATCH_TTL,
        JSON.stringify(matches)
      );

      return matches;
    } catch (error) {
      this.logger.error('Error finding matching candidates:', error);
      throw error;
    }
  }

  /**
   * Caches a requisition
   * @param requisition - Requisition to cache
   */
  private async cacheRequisition(requisition: Requisition): Promise<void> {
    const key = `${this.cacheKeyPrefix}${requisition.id}`;
    await this.redisClient.setex(
      key,
      CACHE_CONFIG.REQUISITION_TTL,
      JSON.stringify(requisition)
    );
  }

  /**
   * Invalidates cached requisition data
   * @param requisitionId - ID of requisition to invalidate
   */
  private async invalidateRequisitionCache(requisitionId: string): Promise<void> {
    const keys = await this.redisClient.keys(`${this.cacheKeyPrefix}*${requisitionId}*`);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}