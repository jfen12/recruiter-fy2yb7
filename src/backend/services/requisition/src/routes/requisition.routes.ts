/**
 * @fileoverview Express router configuration for job requisition endpoints
 * Implements secure, validated RESTful routes with role-based access control
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Router } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.7.0
import helmet from 'helmet'; // v7.0.0

import { RequisitionController } from '../controllers/requisitionController';
import { 
  authMiddleware, 
  requireRole 
} from '../middleware/auth.middleware';
import {
  validateCreateRequisition,
  validateUpdateRequisition,
  validateRequisitionId
} from '../middleware/validation.middleware';

/**
 * Rate limiting configuration for requisition endpoints
 */
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
};

/**
 * Configures and returns the requisition router with security middleware
 * @param controller - Initialized RequisitionController instance
 * @returns Configured Express router
 */
export function configureRequisitionRouter(controller: RequisitionController): Router {
  const router = Router();

  // Apply security middleware
  router.use(helmet());
  router.use(rateLimit(rateLimitConfig));

  // Create new requisition
  router.post('/',
    authMiddleware,
    requireRole(['recruiter', 'admin']),
    validateCreateRequisition,
    async (req, res, next) => {
      try {
        const result = await controller.createRequisition(req, res);
        res.status(201).json({
          status: 'success',
          data: result,
          metadata: {
            created_at: new Date(),
            request_id: req.headers['x-request-id']
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Update existing requisition
  router.put('/:id',
    authMiddleware,
    requireRole(['recruiter', 'admin']),
    validateRequisitionId,
    validateUpdateRequisition,
    async (req, res, next) => {
      try {
        const result = await controller.updateRequisition(req, res);
        res.status(200).json({
          status: 'success',
          data: result,
          metadata: {
            updated_at: new Date(),
            request_id: req.headers['x-request-id']
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Get requisition by ID
  router.get('/:id',
    authMiddleware,
    requireRole(['recruiter', 'sales_rep', 'admin']),
    validateRequisitionId,
    async (req, res, next) => {
      try {
        const result = await controller.getRequisition(req, res);
        res.status(200).json({
          status: 'success',
          data: result,
          metadata: {
            request_id: req.headers['x-request-id']
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Find matching candidates for requisition
  router.get('/:id/matches',
    authMiddleware,
    requireRole(['recruiter', 'admin']),
    validateRequisitionId,
    async (req, res, next) => {
      try {
        const result = await controller.findMatchingCandidates(req, res);
        res.status(200).json({
          status: 'success',
          data: result,
          metadata: {
            match_count: result.length,
            request_id: req.headers['x-request-id']
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Update requisition status
  router.patch('/:id/status',
    authMiddleware,
    requireRole(['recruiter', 'admin']),
    validateRequisitionId,
    async (req, res, next) => {
      try {
        const result = await controller.updateStatus(req, res);
        res.status(200).json({
          status: 'success',
          data: result,
          metadata: {
            updated_at: new Date(),
            request_id: req.headers['x-request-id']
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Archive requisition (soft delete)
  router.delete('/:id',
    authMiddleware,
    requireRole(['admin']),
    validateRequisitionId,
    async (req, res, next) => {
      try {
        const result = await controller.archiveRequisition(req, res);
        res.status(200).json({
          status: 'success',
          data: result,
          metadata: {
            archived_at: new Date(),
            request_id: req.headers['x-request-id']
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

// Export configured router instance
export const requisitionRouter = configureRequisitionRouter(new RequisitionController());