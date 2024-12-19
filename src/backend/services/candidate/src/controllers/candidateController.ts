/**
 * @fileoverview Express controller implementing secure, performant, and GDPR-compliant 
 * HTTP endpoints for managing technical candidate profiles in the RefactorTrack ATS system.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response } from 'express'; // v4.18.2
import { Container } from 'typedi'; // v0.10.0
import rateLimit from 'express-rate-limit'; // v6.7.0

import { CandidateService } from '../services/candidateService';
import { ICandidate } from '../interfaces/candidate.interface';
import { validateCandidateRequest, validateCandidateIdParam } from '../middleware/validation.middleware';
import { Logger } from '../../../shared/utils/logger';
import { ApiResponse } from '../../../shared/types/common.types';

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Controller handling candidate-related HTTP requests with security, performance,
 * and GDPR compliance measures.
 */
export class CandidateController {
  private candidateService: CandidateService;
  private logger: Logger;

  constructor() {
    this.candidateService = Container.get(CandidateService);
    this.logger = new Logger('candidate-controller');
  }

  /**
   * Creates a new candidate profile with GDPR compliance checks
   * @route POST /api/v1/candidates
   */
  public createCandidate = [
    rateLimiter,
    validateCandidateRequest,
    async (req: Request, res: Response): Promise<void> => {
      const startTime = Date.now();
      try {
        const candidateData: ICandidate = req.body;

        // Log request with sanitized data
        this.logger.info('Creating new candidate', {
          email: candidateData.email,
          source: req.headers['user-agent']
        });

        const createdCandidate = await this.candidateService.createCandidate(candidateData);

        // Mask sensitive data in response
        const maskedCandidate = await this.candidateService.maskSensitiveData(createdCandidate);

        const response: ApiResponse<ICandidate> = {
          data: maskedCandidate,
          status: 201,
          message: 'Candidate created successfully',
          errors: null,
          metadata: {
            processingTime: Date.now() - startTime
          },
          pagination: null
        };

        // Set security headers
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        res.setHeader('X-Content-Type-Options', 'nosniff');

        res.status(201).json(response);
      } catch (error) {
        this.logger.error('Failed to create candidate', error as Error);
        
        const response: ApiResponse<null> = {
          data: null,
          status: 500,
          message: 'Internal server error',
          errors: ['Failed to create candidate'],
          metadata: {},
          pagination: null
        };

        res.status(500).json(response);
      }
    }
  ];

  /**
   * Updates an existing candidate profile with optimistic locking
   * @route PUT /api/v1/candidates/:id
   */
  public updateCandidate = [
    rateLimiter,
    validateCandidateIdParam,
    validateCandidateRequest,
    async (req: Request, res: Response): Promise<void> => {
      const startTime = Date.now();
      try {
        const { id } = req.params;
        const updateData: Partial<ICandidate> = req.body;
        const version = parseInt(req.headers['if-match'] as string, 10);

        this.logger.info('Updating candidate', { id });

        const updatedCandidate = await this.candidateService.updateCandidate(
          id,
          updateData,
          version
        );

        const maskedCandidate = await this.candidateService.maskSensitiveData(updatedCandidate);

        const response: ApiResponse<ICandidate> = {
          data: maskedCandidate,
          status: 200,
          message: 'Candidate updated successfully',
          errors: null,
          metadata: {
            processingTime: Date.now() - startTime
          },
          pagination: null
        };

        res.setHeader('ETag', `"${updatedCandidate.version}"`);
        res.status(200).json(response);
      } catch (error) {
        this.logger.error('Failed to update candidate', error as Error);
        
        const response: ApiResponse<null> = {
          data: null,
          status: 500,
          message: 'Internal server error',
          errors: ['Failed to update candidate'],
          metadata: {},
          pagination: null
        };

        res.status(500).json(response);
      }
    }
  ];

  /**
   * Retrieves a candidate profile with role-based data masking
   * @route GET /api/v1/candidates/:id
   */
  public getCandidate = [
    rateLimiter,
    validateCandidateIdParam,
    async (req: Request, res: Response): Promise<void> => {
      const startTime = Date.now();
      try {
        const { id } = req.params;
        const userRole = req.headers['x-user-role'] as string;

        this.logger.info('Retrieving candidate', { id });

        const candidate = await this.candidateService.getCandidateById(id);
        
        if (!candidate) {
          const response: ApiResponse<null> = {
            data: null,
            status: 404,
            message: 'Candidate not found',
            errors: ['Candidate does not exist'],
            metadata: {},
            pagination: null
          };
          res.status(404).json(response);
          return;
        }

        const maskedCandidate = await this.candidateService.maskSensitiveData(candidate, userRole);

        const response: ApiResponse<ICandidate> = {
          data: maskedCandidate,
          status: 200,
          message: 'Candidate retrieved successfully',
          errors: null,
          metadata: {
            processingTime: Date.now() - startTime
          },
          pagination: null
        };

        res.setHeader('ETag', `"${candidate.version}"`);
        res.status(200).json(response);
      } catch (error) {
        this.logger.error('Failed to retrieve candidate', error as Error);
        
        const response: ApiResponse<null> = {
          data: null,
          status: 500,
          message: 'Internal server error',
          errors: ['Failed to retrieve candidate'],
          metadata: {},
          pagination: null
        };

        res.status(500).json(response);
      }
    }
  ];

  /**
   * Searches candidates with advanced filtering and pagination
   * @route GET /api/v1/candidates/search
   */
  public searchCandidates = [
    rateLimiter,
    async (req: Request, res: Response): Promise<void> => {
      const startTime = Date.now();
      try {
        const searchParams = {
          query: req.query.q as string,
          skills: (req.query.skills as string || '').split(',').filter(Boolean),
          status: req.query.status as string,
          page: parseInt(req.query.page as string || '1', 10),
          limit: Math.min(parseInt(req.query.limit as string || '10', 10), 100)
        };

        this.logger.info('Searching candidates', { searchParams });

        const searchResult = await this.candidateService.searchCandidates(searchParams);

        const response: ApiResponse<ICandidate[]> = {
          data: searchResult.items,
          status: 200,
          message: 'Candidates retrieved successfully',
          errors: null,
          metadata: {
            processingTime: Date.now() - startTime,
            took: searchResult.took
          },
          pagination: {
            total: searchResult.total,
            page: searchResult.page,
            limit: searchResult.limit
          }
        };

        // Cache search results
        res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
        res.status(200).json(response);
      } catch (error) {
        this.logger.error('Failed to search candidates', error as Error);
        
        const response: ApiResponse<null> = {
          data: null,
          status: 500,
          message: 'Internal server error',
          errors: ['Failed to search candidates'],
          metadata: {},
          pagination: null
        };

        res.status(500).json(response);
      }
    }
  ];

  /**
   * Deletes a candidate profile with GDPR compliance
   * @route DELETE /api/v1/candidates/:id
   */
  public deleteCandidate = [
    rateLimiter,
    validateCandidateIdParam,
    async (req: Request, res: Response): Promise<void> => {
      const startTime = Date.now();
      try {
        const { id } = req.params;
        const hardDelete = req.query.hard === 'true';

        this.logger.info('Deleting candidate', { id, hardDelete });

        await this.candidateService.deleteCandidate(id, hardDelete);

        const response: ApiResponse<null> = {
          data: null,
          status: 204,
          message: 'Candidate deleted successfully',
          errors: null,
          metadata: {
            processingTime: Date.now() - startTime
          },
          pagination: null
        };

        res.status(204).json(response);
      } catch (error) {
        this.logger.error('Failed to delete candidate', error as Error);
        
        const response: ApiResponse<null> = {
          data: null,
          status: 500,
          message: 'Internal server error',
          errors: ['Failed to delete candidate'],
          metadata: {},
          pagination: null
        };

        res.status(500).json(response);
      }
    }
  ];
}

export default CandidateController;