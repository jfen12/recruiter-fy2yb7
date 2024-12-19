/**
 * @fileoverview Express router configuration for candidate-related endpoints in the RefactorTrack ATS system.
 * Implements secure RESTful routes with comprehensive middleware integration.
 * @version 1.0.0
 * @package RefactorTrack
 */

// External dependencies
import { Router } from 'express'; // v4.18.2
import { Container } from 'typedi'; // v0.10.0
import compression from 'compression'; // v1.7.4
import helmet from 'helmet'; // v7.0.0

// Internal dependencies
import { CandidateController } from '../controllers/candidateController';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { Logger } from '../../../shared/utils/logger';
import { MetricsService } from '../../../shared/utils/metrics';

// Constants
const ALLOWED_ROLES = ['recruiter', 'admin', 'manager'];
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Configures and returns the candidate router with comprehensive security and validation
 */
export class CandidateRouter {
  private router: Router;
  private controller: CandidateController;
  private authMiddleware: AuthMiddleware;
  private validationMiddleware: ValidationMiddleware;
  private logger: Logger;
  private metrics: MetricsService;

  constructor() {
    this.router = Router();
    this.controller = Container.get(CandidateController);
    this.authMiddleware = new AuthMiddleware();
    this.validationMiddleware = new ValidationMiddleware();
    this.logger = new Logger('candidate-router');
    this.metrics = new MetricsService('candidate_routes');

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configures global middleware for the router
   */
  private setupMiddleware(): void {
    // Security middleware
    this.router.use(helmet());
    this.router.use(compression());

    // Authentication middleware
    this.router.use(this.authMiddleware.authenticate);

    // Request timeout
    this.router.use((req, res, next) => {
      res.setTimeout(REQUEST_TIMEOUT, () => {
        this.logger.error('Request timeout exceeded', { path: req.path });
        res.status(408).json({
          error: 'Request timeout exceeded'
        });
      });
      next();
    });
  }

  /**
   * Configures all candidate-related routes with proper middleware
   */
  private setupRoutes(): void {
    // Health check endpoint (no auth required)
    this.router.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    // Create candidate
    this.router.post('/',
      this.authMiddleware.authorize(ALLOWED_ROLES),
      this.validationMiddleware.validateCandidateRequest,
      this.controller.createCandidate
    );

    // Get candidate by ID
    this.router.get('/:id',
      this.authMiddleware.authorize(ALLOWED_ROLES),
      this.validationMiddleware.validateCandidateIdParam,
      this.controller.getCandidate
    );

    // Update candidate
    this.router.put('/:id',
      this.authMiddleware.authorize(ALLOWED_ROLES),
      this.validationMiddleware.validateCandidateIdParam,
      this.validationMiddleware.validateCandidateRequest,
      this.controller.updateCandidate
    );

    // Delete candidate
    this.router.delete('/:id',
      this.authMiddleware.authorize(['admin']), // Restricted to admin only
      this.validationMiddleware.validateCandidateIdParam,
      this.controller.deleteCandidate
    );

    // Search candidates
    this.router.get('/search',
      this.authMiddleware.authorize(ALLOWED_ROLES),
      this.validationMiddleware.validateSearchParams,
      this.controller.searchCandidates
    );

    // Bulk import candidates
    this.router.post('/bulk',
      this.authMiddleware.authorize(['admin', 'recruiter']),
      this.validationMiddleware.validateCandidateRequest,
      this.controller.bulkImportCandidates
    );

    // Get candidate history
    this.router.get('/:id/history',
      this.authMiddleware.authorize(ALLOWED_ROLES),
      this.validationMiddleware.validateCandidateIdParam,
      this.controller.getCandidateHistory
    );

    // Error handling middleware
    this.router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Route error handler', err);
      this.metrics.incrementCounter('route_error', {
        path: req.path,
        method: req.method
      });

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  /**
   * Returns the configured router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}

// Export configured router instance
const candidateRouter = new CandidateRouter().getRouter();
export default candidateRouter;