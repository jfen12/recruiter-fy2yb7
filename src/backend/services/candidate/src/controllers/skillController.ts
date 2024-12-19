/**
 * @fileoverview Controller for managing candidate skills in the RefactorTrack ATS system.
 * Implements secure REST endpoints for CRUD operations with caching and monitoring.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { RateLimit } from 'express-rate-limit'; // ^6.7.0
import { Redis } from 'redis'; // ^4.0.0
import { Repository } from 'typeorm';

import { ISkill, SkillCategory, SkillProficiency } from '../interfaces/skill.interface';
import { Skill } from '../models/skill.model';
import { Logger } from '../../../shared/utils/logger';
import { ApiResponse, PaginationParams } from '../../../shared/types/common.types';

/**
 * Rate limiting configuration for skill endpoints
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
};

/**
 * Cache configuration for skill data
 */
const CACHE_CONFIG = {
  TTL: 900, // 15 minutes in seconds
  PREFIX: 'skill:'
};

/**
 * Controller handling skill-related HTTP requests with enhanced security and monitoring
 */
export class SkillController {
  private readonly logger: Logger;
  private readonly cacheService: Redis;
  private readonly skillRepository: Repository<Skill>;
  private readonly rateLimiter: RateLimit;

  /**
   * Initialize controller with required dependencies
   */
  constructor(
    logger: Logger,
    cacheService: Redis,
    skillRepository: Repository<Skill>
  ) {
    this.logger = logger;
    this.cacheService = cacheService;
    this.skillRepository = skillRepository;
    this.rateLimiter = new RateLimit(RATE_LIMIT_CONFIG);

    this.logger.info('SkillController initialized', {
      component: 'SkillController',
      cacheEnabled: !!cacheService
    });
  }

  /**
   * Create a new skill with validation and security checks
   */
  public async createSkill(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> {
    try {
      const startTime = Date.now();
      const skillData: ISkill = req.body;

      // Validate required fields
      if (!skillData.name || !skillData.category) {
        return res.status(400).json({
          status: 400,
          message: 'Missing required fields',
          errors: ['name and category are required'],
          data: null,
          metadata: {},
          pagination: null
        });
      }

      // Check for duplicate skill
      const existingSkill = await this.skillRepository.findOne({
        where: { name: skillData.name }
      });

      if (existingSkill) {
        return res.status(409).json({
          status: 409,
          message: 'Skill already exists',
          errors: ['A skill with this name already exists'],
          data: null,
          metadata: {},
          pagination: null
        });
      }

      // Create and save new skill
      const skill = new Skill({
        ...skillData,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedSkill = await this.skillRepository.save(skill);

      // Invalidate relevant cache entries
      await this.cacheService.del(`${CACHE_CONFIG.PREFIX}list`);

      this.logger.info('Skill created successfully', {
        skillId: savedSkill.id,
        executionTime: Date.now() - startTime
      });

      return res.status(201).json({
        status: 201,
        message: 'Skill created successfully',
        data: savedSkill,
        errors: null,
        metadata: {
          executionTime: Date.now() - startTime
        },
        pagination: null
      });

    } catch (error) {
      this.logger.error('Error creating skill', error as Error, {
        body: req.body
      });
      return next(error);
    }
  }

  /**
   * List skills with advanced filtering, search, and pagination
   */
  public async listSkills(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> {
    try {
      const startTime = Date.now();
      const {
        page = 1,
        limit = 10,
        search_query,
        category,
        min_years,
        proficiency_level
      } = req.query;

      // Check cache first
      const cacheKey = `${CACHE_CONFIG.PREFIX}list:${JSON.stringify(req.query)}`;
      const cachedResult = await this.cacheService.get(cacheKey);

      if (cachedResult) {
        this.logger.info('Returning cached skill list', {
          cacheKey,
          executionTime: Date.now() - startTime
        });
        return res.status(200).json(JSON.parse(cachedResult));
      }

      // Build query with filters
      const queryBuilder = this.skillRepository.createQueryBuilder('skill');

      if (search_query) {
        queryBuilder.where('skill.name ILIKE :search', {
          search: `%${search_query}%`
        });
      }

      if (category) {
        queryBuilder.andWhere('skill.category = :category', {
          category: category as SkillCategory
        });
      }

      if (min_years) {
        queryBuilder.andWhere('skill.years_of_experience >= :minYears', {
          minYears: Number(min_years)
        });
      }

      if (proficiency_level) {
        queryBuilder.andWhere('skill.proficiency_level = :level', {
          level: proficiency_level as SkillProficiency
        });
      }

      // Execute paginated query
      const [skills, total] = await queryBuilder
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      const response: ApiResponse<Skill[]> = {
        status: 200,
        message: 'Skills retrieved successfully',
        data: skills,
        errors: null,
        metadata: {
          executionTime: Date.now() - startTime
        },
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit)
        }
      };

      // Cache the result
      await this.cacheService.setex(
        cacheKey,
        CACHE_CONFIG.TTL,
        JSON.stringify(response)
      );

      this.logger.info('Skills listed successfully', {
        resultCount: skills.length,
        executionTime: Date.now() - startTime
      });

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error('Error listing skills', error as Error, {
        query: req.query
      });
      return next(error);
    }
  }
}