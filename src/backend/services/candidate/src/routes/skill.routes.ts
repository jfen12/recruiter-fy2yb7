/**
 * @fileoverview Express router configuration for skill-related endpoints in the candidate service.
 * Implements secure, GDPR-compliant routes for CRUD operations on candidate skills.
 * @version 1.0.0
 * @package RefactorTrack
 */

import express, { Router } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import rateLimit from 'express-rate-limit'; // ^6.0.0

import { SkillController } from '../controllers/skillController';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Constants for configuration
const ALLOWED_ROLES = ['recruiter', 'admin', 'manager'] as const;
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
};

/**
 * Initializes and configures the skill routes with comprehensive security middleware
 */
export function initializeSkillRoutes(): Router {
  const router = express.Router();
  const logger = new Logger('skill_routes');
  const metricsService = new MetricsService('skill_routes');
  const authMiddleware = new AuthMiddleware();

  // Apply global middleware
  router.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));
  router.use(compression());
  router.use(rateLimit(RATE_LIMIT_CONFIG));

  // Initialize controller
  const skillController = new SkillController(
    logger,
    null, // Redis instance would be injected here
    null  // Repository instance would be injected here
  );

  /**
   * GET /skills
   * Retrieve paginated list of skills with filtering options
   */
  router.get('/skills',
    authMiddleware.authenticate,
    authMiddleware.authorize(ALLOWED_ROLES),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await skillController.listSkills(req, res, next);
        metricsService.incrementCounter('skill_list_success', {
          duration: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error listing skills', error as Error);
        metricsService.incrementCounter('skill_list_error');
        next(error);
      }
    }
  );

  /**
   * GET /skills/search
   * Advanced skill search with matching capabilities
   */
  router.get('/skills/search',
    authMiddleware.authenticate,
    authMiddleware.authorize(['recruiter', 'admin']),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await skillController.searchSkills(req, res, next);
        metricsService.incrementCounter('skill_search_success', {
          duration: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error searching skills', error as Error);
        metricsService.incrementCounter('skill_search_error');
        next(error);
      }
    }
  );

  /**
   * GET /skills/:id
   * Retrieve specific skill by ID with caching
   */
  router.get('/skills/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(ALLOWED_ROLES),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await skillController.getSkill(req, res, next);
        metricsService.incrementCounter('skill_get_success', {
          duration: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error getting skill', error as Error);
        metricsService.incrementCounter('skill_get_error');
        next(error);
      }
    }
  );

  /**
   * POST /skills
   * Create new skill with validation and GDPR compliance
   */
  router.post('/skills',
    authMiddleware.authenticate,
    authMiddleware.authorize(['recruiter', 'admin']),
    ValidationMiddleware.validateCandidateSkillsRequest,
    ValidationMiddleware.validateGDPRCompliance,
    ValidationMiddleware.sanitizeRequest,
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await skillController.createSkill(req, res, next);
        metricsService.incrementCounter('skill_create_success', {
          duration: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error creating skill', error as Error);
        metricsService.incrementCounter('skill_create_error');
        next(error);
      }
    }
  );

  /**
   * PUT /skills/:id
   * Update existing skill with validation and GDPR compliance
   */
  router.put('/skills/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['recruiter', 'admin']),
    ValidationMiddleware.validateCandidateSkillsRequest,
    ValidationMiddleware.validateGDPRCompliance,
    ValidationMiddleware.sanitizeRequest,
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await skillController.updateSkill(req, res, next);
        metricsService.incrementCounter('skill_update_success', {
          duration: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error updating skill', error as Error);
        metricsService.incrementCounter('skill_update_error');
        next(error);
      }
    }
  );

  /**
   * DELETE /skills/:id
   * Soft delete skill with audit logging
   */
  router.delete('/skills/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['admin']),
    async (req, res, next) => {
      try {
        const startTime = Date.now();
        await skillController.deleteSkill(req, res, next);
        metricsService.incrementCounter('skill_delete_success', {
          duration: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error deleting skill', error as Error);
        metricsService.incrementCounter('skill_delete_error');
        next(error);
      }
    }
  );

  return router;
}

// Export configured router
export const skillRouter = initializeSkillRoutes();