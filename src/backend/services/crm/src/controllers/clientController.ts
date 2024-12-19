/**
 * @fileoverview Enhanced client controller implementing secure CRUD operations for client management
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Request, Response } from 'express'; // v4.18.2
import { Controller } from 'typedi'; // v0.10.0
import { JsonController, Get, Post, Put, Delete, Param, Body, UseBefore } from 'routing-controllers'; // v0.10.0
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi'; // v4.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { Logger } from '@nestjs/common'; // v9.0.0
import { MetricsService } from '@refactortrack/metrics'; // v1.0.0

import { ClientService } from '../services/clientService';
import { validateClientMiddleware } from '../middleware/validation.middleware';
import { 
  IClient, 
  CreateClientPayload, 
  UpdateClientPayload 
} from '../interfaces/client.interface';
import { ApiResponse, UUID } from '../../../shared/types/common.types';

// Rate limiting configuration for client endpoints
const clientRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // Max 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Enhanced controller for client management operations
 * Implements comprehensive security, validation, and monitoring
 */
@Controller()
@JsonController('/api/v1/clients')
export class ClientController {
  private readonly METRICS_PREFIX = 'crm.client_controller';

  constructor(
    private readonly clientService: ClientService,
    private readonly logger: Logger,
    private readonly metrics: MetricsService
  ) {
    this.logger.setContext('ClientController');
  }

  /**
   * Creates a new client with enhanced validation and security
   * @param req - Express request object
   * @param res - Express response object
   */
  @Post('/')
  @UseBefore(validateClientMiddleware)
  @OpenAPI({
    summary: 'Create new client',
    security: [{ bearerAuth: [] }],
    responses: {
      '201': { description: 'Client created successfully' },
      '400': { description: 'Invalid client data' },
      '429': { description: 'Too many requests' }
    }
  })
  async createClient(
    @Body() createClientDto: CreateClientPayload,
    req: Request,
    res: Response
  ): Promise<ApiResponse<IClient>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.create_client`);
    
    try {
      this.logger.log(`Creating new client: ${createClientDto.company_name}`);
      
      const result = await this.clientService.createClient(createClientDto);
      
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_created`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to create client: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.create_client_errors`);
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Updates an existing client with validation and security checks
   * @param clientId - UUID of client to update
   * @param updateClientDto - Client update payload
   */
  @Put('/:id')
  @UseBefore(validateClientMiddleware)
  @OpenAPI({
    summary: 'Update existing client',
    security: [{ bearerAuth: [] }]
  })
  async updateClient(
    @Param('id') clientId: UUID,
    @Body() updateClientDto: UpdateClientPayload,
    req: Request,
    res: Response
  ): Promise<ApiResponse<IClient>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.update_client`);
    
    try {
      this.logger.log(`Updating client: ${clientId}`);
      
      const result = await this.clientService.updateClient(clientId, updateClientDto);
      
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_updated`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update client ${clientId}: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.update_client_errors`);
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Retrieves a specific client by ID with security checks
   * @param clientId - UUID of client to retrieve
   */
  @Get('/:id')
  @OpenAPI({
    summary: 'Get client by ID',
    security: [{ bearerAuth: [] }]
  })
  async getClient(
    @Param('id') clientId: UUID,
    req: Request,
    res: Response
  ): Promise<ApiResponse<IClient>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.get_client`);
    
    try {
      this.logger.log(`Retrieving client: ${clientId}`);
      
      const result = await this.clientService.getClientById(clientId);
      
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_retrieved`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve client ${clientId}: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.get_client_errors`);
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Retrieves all clients with pagination and filtering
   * @param req - Express request object containing query parameters
   */
  @Get('/')
  @OpenAPI({
    summary: 'Get all clients',
    security: [{ bearerAuth: [] }]
  })
  async getAllClients(
    req: Request,
    res: Response
  ): Promise<ApiResponse<IClient[]>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.get_all_clients`);
    
    try {
      this.logger.log('Retrieving all clients');
      
      const result = await this.clientService.getAllClients({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc',
        search_query: req.query.search as string,
        filters: req.query.filters as Record<string, unknown>
      });
      
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_list_retrieved`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve clients: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.get_all_clients_errors`);
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Deletes a specific client by ID with security checks
   * @param clientId - UUID of client to delete
   */
  @Delete('/:id')
  @OpenAPI({
    summary: 'Delete client',
    security: [{ bearerAuth: [] }]
  })
  async deleteClient(
    @Param('id') clientId: UUID,
    req: Request,
    res: Response
  ): Promise<ApiResponse<void>> {
    const timer = this.metrics.startTimer(`${this.METRICS_PREFIX}.delete_client`);
    
    try {
      this.logger.log(`Deleting client: ${clientId}`);
      
      const result = await this.clientService.deleteClient(clientId);
      
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.clients_deleted`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete client ${clientId}: ${error.message}`, error.stack);
      this.metrics.incrementCounter(`${this.METRICS_PREFIX}.delete_client_errors`);
      throw error;
    } finally {
      timer.end();
    }
  }
}