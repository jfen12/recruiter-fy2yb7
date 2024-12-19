/**
 * @fileoverview Express router configuration for client management endpoints in the CRM service
 * @version 1.0.0
 * @package RefactorTrack
 */

// External dependencies
import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0

// Internal dependencies
import { ClientController } from '../controllers/clientController';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { validateClientMiddleware } from '../middleware/validation.middleware';
import { Logger } from '../../../shared/utils/logger';

// Constants
const ALLOWED_ROLES = ['admin', 'sales_rep', 'manager'] as const;
const ADMIN_ONLY_ROLES = ['admin'] as const;
const WRITE_ROLES = ['admin', 'sales_rep'] as const;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
};

/**
 * Configures and returns an Express router with secured client management endpoints
 * Implements comprehensive security, validation, and monitoring
 */
export function configureClientRoutes(): Router {
  const router = Router();
  const authMiddleware = new AuthMiddleware();
  const clientRateLimiter = rateLimit(RATE_LIMIT_CONFIG);
  const logger = new Logger('CRM-Client-Routes', {
    enableConsole: true,
    enableFile: true
  });

  // Apply global middleware
  router.use(authMiddleware.authenticate);
  router.use(clientRateLimiter);

  /**
   * GET /clients
   * Retrieves all clients with filtering and pagination
   * Accessible by all authorized roles
   */
  router.get(
    '/',
    authMiddleware.authorize(ALLOWED_ROLES),
    async (req, res, next) => {
      try {
        logger.info('GET /clients request received', {
          query: req.query,
          userId: req.user?.userId
        });
        await ClientController.getAllClients(req, res);
      } catch (error) {
        logger.error('Error in GET /clients', error as Error);
        next(error);
      }
    }
  );

  /**
   * GET /clients/:id
   * Retrieves a specific client by ID
   * Accessible by all authorized roles
   */
  router.get(
    '/:id',
    authMiddleware.authorize(ALLOWED_ROLES),
    async (req, res, next) => {
      try {
        logger.info('GET /clients/:id request received', {
          clientId: req.params.id,
          userId: req.user?.userId
        });
        await ClientController.getClient(req, res);
      } catch (error) {
        logger.error('Error in GET /clients/:id', error as Error);
        next(error);
      }
    }
  );

  /**
   * POST /clients
   * Creates a new client
   * Accessible by admin and sales_rep roles
   */
  router.post(
    '/',
    authMiddleware.authorize(WRITE_ROLES),
    validateClientMiddleware,
    async (req, res, next) => {
      try {
        logger.info('POST /clients request received', {
          userId: req.user?.userId,
          companyName: req.body.company_name
        });
        await ClientController.createClient(req, res);
      } catch (error) {
        logger.error('Error in POST /clients', error as Error);
        next(error);
      }
    }
  );

  /**
   * PUT /clients/:id
   * Updates an existing client
   * Accessible by admin and sales_rep roles
   */
  router.put(
    '/:id',
    authMiddleware.authorize(WRITE_ROLES),
    validateClientMiddleware,
    async (req, res, next) => {
      try {
        logger.info('PUT /clients/:id request received', {
          clientId: req.params.id,
          userId: req.user?.userId
        });
        await ClientController.updateClient(req, res);
      } catch (error) {
        logger.error('Error in PUT /clients/:id', error as Error);
        next(error);
      }
    }
  );

  /**
   * DELETE /clients/:id
   * Deletes a client (soft delete)
   * Accessible by admin role only
   */
  router.delete(
    '/:id',
    authMiddleware.authorize(ADMIN_ONLY_ROLES),
    async (req, res, next) => {
      try {
        logger.info('DELETE /clients/:id request received', {
          clientId: req.params.id,
          userId: req.user?.userId
        });
        await ClientController.deleteClient(req, res);
      } catch (error) {
        logger.error('Error in DELETE /clients/:id', error as Error);
        next(error);
      }
    }
  );

  // Error handling middleware
  router.use((error: Error, req: any, res: any, next: any) => {
    logger.error('Client routes error handler', error);
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
      data: null,
      errors: [error.message],
      metadata: {},
      pagination: null
    });
  });

  return router;
}

// Export configured router instance
export const clientRouter = configureClientRoutes();