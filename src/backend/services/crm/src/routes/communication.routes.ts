/**
 * @fileoverview Express router configuration for communication-related endpoints in the CRM service
 * @version 1.0.0
 * @package RefactorTrack
 */

// External dependencies
import { Router } from 'express'; // v4.18.2
import { Container } from 'typedi'; // v0.10.0

// Internal dependencies
import { CommunicationController } from '../controllers/communicationController';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { validateCommunicationMiddleware } from '../middleware/validation.middleware';
import { Logger } from '../../../shared/utils/logger';

// Initialize router and dependencies
const router = Router();
const authMiddleware = new AuthMiddleware();
const logger = new Logger('CRM-Communication-Routes', {
  enableConsole: true,
  enableFile: true,
  enableElasticsearch: true
});

// Get controller instance from dependency container
const communicationController = Container.get(CommunicationController);

/**
 * POST /api/v1/communications
 * Create a new communication record
 * @security JWT
 * @requires role: recruiter, admin
 */
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize(['recruiter', 'admin']),
  validateCommunicationMiddleware,
  async (req, res) => {
    try {
      logger.info('Creating new communication', {
        userId: req.user?.id,
        type: req.body.type
      });
      await communicationController.createCommunication(req, res);
    } catch (error) {
      logger.error('Error creating communication', error as Error);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred'],
        metadata: {},
        pagination: null
      });
    }
  }
);

/**
 * GET /api/v1/communications/:id
 * Retrieve a specific communication record
 * @security JWT
 * @requires role: recruiter, admin, sales
 */
router.get(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['recruiter', 'admin', 'sales']),
  async (req, res) => {
    try {
      logger.info('Retrieving communication', {
        userId: req.user?.id,
        communicationId: req.params.id
      });
      await communicationController.getCommunicationById(req, res);
    } catch (error) {
      logger.error('Error retrieving communication', error as Error);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred'],
        metadata: {},
        pagination: null
      });
    }
  }
);

/**
 * GET /api/v1/communications/client/:clientId
 * Retrieve all communications for a client
 * @security JWT
 * @requires role: recruiter, admin, sales
 */
router.get(
  '/client/:clientId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['recruiter', 'admin', 'sales']),
  async (req, res) => {
    try {
      logger.info('Retrieving client communications', {
        userId: req.user?.id,
        clientId: req.params.clientId
      });
      await communicationController.getClientCommunications(req, res);
    } catch (error) {
      logger.error('Error retrieving client communications', error as Error);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred'],
        metadata: {},
        pagination: null
      });
    }
  }
);

/**
 * PUT /api/v1/communications/:id
 * Update an existing communication record
 * @security JWT
 * @requires role: recruiter, admin
 */
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['recruiter', 'admin']),
  validateCommunicationMiddleware,
  async (req, res) => {
    try {
      logger.info('Updating communication', {
        userId: req.user?.id,
        communicationId: req.params.id
      });
      await communicationController.updateCommunication(req, res);
    } catch (error) {
      logger.error('Error updating communication', error as Error);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred'],
        metadata: {},
        pagination: null
      });
    }
  }
);

/**
 * DELETE /api/v1/communications/:id
 * Soft delete a communication record
 * @security JWT
 * @requires role: admin
 */
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  async (req, res) => {
    try {
      logger.info('Deleting communication', {
        userId: req.user?.id,
        communicationId: req.params.id
      });
      await communicationController.deleteCommunication(req, res);
    } catch (error) {
      logger.error('Error deleting communication', error as Error);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null,
        errors: ['An unexpected error occurred'],
        metadata: {},
        pagination: null
      });
    }
  }
);

// Export configured router
export default router;