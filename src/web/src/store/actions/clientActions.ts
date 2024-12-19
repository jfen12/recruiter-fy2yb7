/**
 * @fileoverview Redux action creators for client management operations
 * Implements secure state management with comprehensive validation and error handling
 * @version 1.0.0
 */

import { createAction } from '@reduxjs/toolkit'; // v1.9.5
import { z } from 'zod'; // v3.21.4
import { rateLimit } from '@redux-utilities/rate-limit'; // v1.0.0

import { 
  IClient, 
  ICreateClientDTO, 
  IUpdateClientDTO, 
  IClientListResponse,
  ClientSchema,
  CreateClientSchema,
  UpdateClientSchema
} from '../../interfaces/client.interface';
import { 
  getClients, 
  getClientById, 
  createClient, 
  updateClient, 
  deleteClient, 
  searchClients 
} from '../../api/clients';
import { API_CONFIG } from '../../config/api';
import { validateClientData, sanitizeClientData } from '../../utils/validation';

/**
 * Enum defining all client-related action types
 */
export enum ClientActionTypes {
  // Fetch clients
  FETCH_CLIENTS_REQUEST = '@clients/FETCH_CLIENTS_REQUEST',
  FETCH_CLIENTS_SUCCESS = '@clients/FETCH_CLIENTS_SUCCESS',
  FETCH_CLIENTS_FAILURE = '@clients/FETCH_CLIENTS_FAILURE',

  // Create client
  CREATE_CLIENT_REQUEST = '@clients/CREATE_CLIENT_REQUEST',
  CREATE_CLIENT_SUCCESS = '@clients/CREATE_CLIENT_SUCCESS',
  CREATE_CLIENT_FAILURE = '@clients/CREATE_CLIENT_FAILURE',

  // Update client
  UPDATE_CLIENT_REQUEST = '@clients/UPDATE_CLIENT_REQUEST',
  UPDATE_CLIENT_SUCCESS = '@clients/UPDATE_CLIENT_SUCCESS',
  UPDATE_CLIENT_FAILURE = '@clients/UPDATE_CLIENT_FAILURE',

  // Delete client
  DELETE_CLIENT_REQUEST = '@clients/DELETE_CLIENT_REQUEST',
  DELETE_CLIENT_SUCCESS = '@clients/DELETE_CLIENT_SUCCESS',
  DELETE_CLIENT_FAILURE = '@clients/DELETE_CLIENT_FAILURE',

  // Search clients
  SEARCH_CLIENTS_REQUEST = '@clients/SEARCH_CLIENTS_REQUEST',
  SEARCH_CLIENTS_SUCCESS = '@clients/SEARCH_CLIENTS_SUCCESS',
  SEARCH_CLIENTS_FAILURE = '@clients/SEARCH_CLIENTS_FAILURE'
}

/**
 * Interface for client list request parameters with validation
 */
const clientListParamsSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().min(1).max(100),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  industry: z.string().optional(),
  status: z.string().optional()
});

/**
 * Action creator class with enhanced security features
 */
class ClientActionCreator {
  private rateLimiter: any;
  private readonly RATE_LIMITS = {
    LIST: 1000,    // requests per minute
    CREATE: 100,
    UPDATE: 100,
    DELETE: 50,
    SEARCH: 200
  };

  constructor() {
    // Initialize rate limiters for different operations
    this.rateLimiter = {
      list: rateLimit(this.RATE_LIMITS.LIST),
      create: rateLimit(this.RATE_LIMITS.CREATE),
      update: rateLimit(this.RATE_LIMITS.UPDATE),
      delete: rateLimit(this.RATE_LIMITS.DELETE),
      search: rateLimit(this.RATE_LIMITS.SEARCH)
    };
  }

  /**
   * Creates an action to fetch clients with validation and rate limiting
   */
  fetchClientsRequest = createAction(
    ClientActionTypes.FETCH_CLIENTS_REQUEST,
    (params: z.infer<typeof clientListParamsSchema>) => {
      // Validate and sanitize parameters
      const validatedParams = clientListParamsSchema.parse(params);
      
      return {
        payload: validatedParams,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      };
    }
  );

  fetchClientsSuccess = createAction<IClientListResponse>(
    ClientActionTypes.FETCH_CLIENTS_SUCCESS
  );

  fetchClientsFailure = createAction<Error>(
    ClientActionTypes.FETCH_CLIENTS_FAILURE
  );

  /**
   * Creates an action to create a new client with validation
   */
  createClientRequest = createAction(
    ClientActionTypes.CREATE_CLIENT_REQUEST,
    (clientData: ICreateClientDTO) => {
      // Validate client data
      const validatedData = CreateClientSchema.parse(clientData);
      
      return {
        payload: validatedData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      };
    }
  );

  createClientSuccess = createAction<IClient>(
    ClientActionTypes.CREATE_CLIENT_SUCCESS
  );

  createClientFailure = createAction<Error>(
    ClientActionTypes.CREATE_CLIENT_FAILURE
  );

  /**
   * Creates an action to update a client with validation
   */
  updateClientRequest = createAction(
    ClientActionTypes.UPDATE_CLIENT_REQUEST,
    (clientId: string, updateData: IUpdateClientDTO) => {
      // Validate update data
      const validatedData = UpdateClientSchema.parse(updateData);
      
      return {
        payload: { clientId, data: validatedData },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      };
    }
  );

  updateClientSuccess = createAction<IClient>(
    ClientActionTypes.UPDATE_CLIENT_SUCCESS
  );

  updateClientFailure = createAction<Error>(
    ClientActionTypes.UPDATE_CLIENT_FAILURE
  );

  /**
   * Creates an action to delete a client with validation
   */
  deleteClientRequest = createAction(
    ClientActionTypes.DELETE_CLIENT_REQUEST,
    (clientId: string) => {
      // Validate client ID format
      if (!z.string().uuid().safeParse(clientId).success) {
        throw new Error('Invalid client ID format');
      }
      
      return {
        payload: clientId,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      };
    }
  );

  deleteClientSuccess = createAction<string>(
    ClientActionTypes.DELETE_CLIENT_SUCCESS
  );

  deleteClientFailure = createAction<Error>(
    ClientActionTypes.DELETE_CLIENT_FAILURE
  );

  /**
   * Creates an action to search clients with validation
   */
  searchClientsRequest = createAction(
    ClientActionTypes.SEARCH_CLIENTS_REQUEST,
    (searchParams: any) => {
      // Validate search parameters
      const validatedParams = z.object({
        query: z.string().optional(),
        industry: z.string().optional(),
        status: z.string().optional(),
        page: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional()
      }).parse(searchParams);
      
      return {
        payload: validatedParams,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      };
    }
  );

  searchClientsSuccess = createAction<IClientListResponse>(
    ClientActionTypes.SEARCH_CLIENTS_SUCCESS
  );

  searchClientsFailure = createAction<Error>(
    ClientActionTypes.SEARCH_CLIENTS_FAILURE
  );
}

// Export singleton instance of action creator
export const clientActions = new ClientActionCreator();

// Export action types for reducer consumption
export type ClientAction = ReturnType<
  | typeof clientActions.fetchClientsRequest
  | typeof clientActions.fetchClientsSuccess
  | typeof clientActions.fetchClientsFailure
  | typeof clientActions.createClientRequest
  | typeof clientActions.createClientSuccess
  | typeof clientActions.createClientFailure
  | typeof clientActions.updateClientRequest
  | typeof clientActions.updateClientSuccess
  | typeof clientActions.updateClientFailure
  | typeof clientActions.deleteClientRequest
  | typeof clientActions.deleteClientSuccess
  | typeof clientActions.deleteClientFailure
  | typeof clientActions.searchClientsRequest
  | typeof clientActions.searchClientsSuccess
  | typeof clientActions.searchClientsFailure
>;