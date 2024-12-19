/**
 * @fileoverview Controller handling skill matching operations between candidates and job requisitions
 * Implements secure and optimized REST API endpoints for advanced candidate matching
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response } from 'express'; // v4.18.0
import { Logger } from 'winston'; // v3.8.0
import { rateLimit } from 'express-rate-limit'; // v6.7.0
import { controller, httpGet, request, response } from 'inversify-express-utils'; // v6.3.2
import { inject } from 'inversify';
import { validate } from '../middleware/validation';
import { tryCatch } from '../utils/errorHandler';
import { MatchingService } from '../services/matchingService';
import { Requisition } from '../interfaces/requisition.interface';
import { ApiResponse, PaginationParams } from '../../../shared/types/common.types';
import { Redis } from 'ioredis'; // v5.0.0

/**
 * Interface for match search parameters
 */
interface MatchSearchParams extends PaginationParams {
  minimumScore?: number;
  requiredSkillsOnly?: boolean;
  locationPreference?: string;
  experienceRange?: {
    min: number;
    max: number;
  };
}

/**
 * Interface for match calculation options
 */
interface MatchCalculationOptions {
  includeDetailedBreakdown: boolean;
  weightAdjustments?: Record<string, number>;
  considerLocationBonus: boolean;
  experienceMultiplier: number;
}

/**
 * Controller handling skill matching operations with caching and rate limiting
 */
@controller('/api/v1/matches')
export class SkillMatchController {
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly DEFAULT_PAGE_SIZE = 20;

  constructor(
    @inject('MatchingService') private matchingService: MatchingService,
    @inject('Logger') private logger: Logger,
    @inject('RedisClient') private cache: Redis,
    @inject('Config') private config: any
  ) {}

  /**
   * Finds matching candidates for a given requisition with caching and pagination
   */
  @httpGet('/:requisitionId')
  @validate()
  @tryCatch
  @rateLimit({
    windowMs: 60000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  })
  public async findMatches(
    @request() req: Request,
    @response() res: Response
  ): Promise<void> {
    const { requisitionId } = req.params;
    const searchParams: MatchSearchParams = req.query as any;

    // Generate cache key based on request parameters
    const cacheKey = `matches:${requisitionId}:${JSON.stringify(searchParams)}`;

    try {
      // Check cache first
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult) {
        res.json(JSON.parse(cachedResult));
        return;
      }

      // Apply pagination defaults
      const page = Number(searchParams.page) || 1;
      const limit = Number(searchParams.limit) || SkillMatchController.DEFAULT_PAGE_SIZE;

      // Find matches using service
      const matches = await this.matchingService.findMatchingCandidates(
        requisitionId,
        {
          minimumScore: searchParams.minimumScore || 0.6,
          maxResults: limit,
          includeInactive: false,
          weightings: {
            skillMatch: 0.4,
            experienceLevel: 0.3,
            mandatorySkills: 0.2,
            locationMatch: 0.1
          },
          fuzzyMatching: true,
          cacheResults: true
        }
      );

      // Prepare response
      const response: ApiResponse<typeof matches> = {
        status: 200,
        message: 'Matches found successfully',
        data: matches,
        errors: null,
        metadata: {
          totalMatches: matches.length,
          averageScore: matches.reduce((sum, m) => sum + m.score, 0) / matches.length
        },
        pagination: {
          total: matches.length,
          page,
          limit
        }
      };

      // Cache the response
      await this.cache.setex(cacheKey, SkillMatchController.CACHE_TTL, JSON.stringify(response));

      res.json(response);
    } catch (error) {
      this.logger.error('Error finding matches:', error);
      throw error;
    }
  }

  /**
   * Calculates detailed match score between a candidate and requisition
   */
  @httpGet('/:requisitionId/candidates/:candidateId/score')
  @validate()
  @tryCatch
  @rateLimit({
    windowMs: 60000,
    max: 200
  })
  public async calculateMatchScore(
    @request() req: Request,
    @response() res: Response
  ): Promise<void> {
    const { requisitionId, candidateId } = req.params;
    const options: MatchCalculationOptions = req.query as any;

    try {
      const score = await this.matchingService.calculateSkillMatch(
        requisitionId,
        candidateId,
        {
          includeDetailedBreakdown: options.includeDetailedBreakdown || true,
          weightAdjustments: options.weightAdjustments,
          considerLocationBonus: options.considerLocationBonus || true,
          experienceMultiplier: options.experienceMultiplier || 1.0
        }
      );

      const response: ApiResponse<typeof score> = {
        status: 200,
        message: 'Match score calculated successfully',
        data: score,
        errors: null,
        metadata: {
          calculationTime: new Date(),
          confidenceLevel: score.confidence
        },
        pagination: null
      };

      res.json(response);
    } catch (error) {
      this.logger.error('Error calculating match score:', error);
      throw error;
    }
  }

  /**
   * Ranks candidates based on customizable match criteria
   */
  @httpGet('/:requisitionId/ranking')
  @validate()
  @tryCatch
  @rateLimit({
    windowMs: 60000,
    max: 50
  })
  public async rankCandidateMatches(
    @request() req: Request,
    @response() res: Response
  ): Promise<void> {
    const { requisitionId } = req.params;
    const { weightings, filters } = req.query;

    try {
      const rankedCandidates = await this.matchingService.rankCandidates(
        requisitionId,
        {
          weightings: weightings ? JSON.parse(weightings as string) : undefined,
          filters: filters ? JSON.parse(filters as string) : undefined,
          limit: 100,
          includeScoreBreakdown: true
        }
      );

      const response: ApiResponse<typeof rankedCandidates> = {
        status: 200,
        message: 'Candidates ranked successfully',
        data: rankedCandidates,
        errors: null,
        metadata: {
          rankingCriteria: weightings,
          appliedFilters: filters,
          totalCandidates: rankedCandidates.length
        },
        pagination: null
      };

      res.json(response);
    } catch (error) {
      this.logger.error('Error ranking candidates:', error);
      throw error;
    }
  }
}