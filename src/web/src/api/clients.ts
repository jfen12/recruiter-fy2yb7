/**
 * @fileoverview Client API module for RefactorTrack web application
 * Provides secure, resilient, and production-ready functions for client management operations
 * with comprehensive error handling, caching, and validation.
 * @version 1.0.0
 */

// axios version ^1.4.0
import { AxiosResponse, AxiosError } from 'axios';
// zod version ^3.21.4
import { z } from 'zod';

import { 
  IClient, 
  ICreateClientDTO, 
  IUpdateClientDTO, 
  ClientSchema, 
  CreateClientSchema 
} from '../interfaces/client.interface';
import { API_CONFIG } from '../config/api';
import { 
  apiClient, 
  handleApiError, 
  retryRequest 
} from '../utils/api';
import { validateAuth } from '../utils/auth';
import { PaginatedResponse, ApiResponse } from '../interfaces/common.interface';

// Cache duration for client data (5 minutes)
const CLIENT_CACHE_DURATION = 300000;

// Rate limiting configuration
const RATE_LIMITS = {
  LIST: 1000,  // requests per minute
  CREATE: 100,
  UPDATE: 100,
  DELETE: 50
};

/**
 * Interface for client list query parameters
 */
interface IClientListParams {
  page: number;
  limit: number;
  search?: string;
  industry?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Validates and sanitizes client list parameters
 */
const clientListParamsSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().min(1).max(100),
  search: z.string().optional(),
  industry: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * Retrieves a paginated list of clients with caching and security
 * @param params Query parameters for client list
 * @returns Promise resolving to paginated client list
 * @throws {Error} If validation fails or API request fails
 */
export const getClients = async (
  params: IClientListParams
): Promise<PaginatedResponse<IClient>> => {
  try {
    // Validate user authorization
    await validateAuth('READ_CLIENTS');

    // Validate and sanitize input parameters
    const validatedParams = clientListParamsSchema.parse(params);

    // Generate cache key
    const cacheKey = `clients_${JSON.stringify(validatedParams)}`;

    // Attempt to retrieve from cache
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CLIENT_CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(cacheKey);
    }

    // Make API request with retry mechanism
    const response = await retryRequest<AxiosResponse<ApiResponse<PaginatedResponse<IClient>>>>(() =>
      apiClient.get(API_CONFIG.ENDPOINTS.CLIENTS.BASE, {
        params: validatedParams,
        headers: {
          'X-Rate-Limit': RATE_LIMITS.LIST
        }
      })
    );

    // Validate response data
    const clients = response.data.data;
    clients.data.forEach(client => {
      ClientSchema.parse(client);
    });

    // Cache successful response
    localStorage.setItem(cacheKey, JSON.stringify({
      data: clients,
      timestamp: Date.now()
    }));

    return clients;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Creates a new client with comprehensive validation
 * @param clientData Client creation data
 * @returns Promise resolving to created client
 * @throws {Error} If validation fails or API request fails
 */
export const createClient = async (
  clientData: ICreateClientDTO
): Promise<IClient> => {
  try {
    // Validate user authorization
    await validateAuth('CREATE_CLIENT');

    // Validate input data
    const validatedData = CreateClientSchema.parse(clientData);

    // Make API request with retry mechanism
    const response = await retryRequest<AxiosResponse<ApiResponse<IClient>>>(() =>
      apiClient.post(API_CONFIG.ENDPOINTS.CLIENTS.BASE, validatedData, {
        headers: {
          'X-Rate-Limit': RATE_LIMITS.CREATE,
          'X-Idempotency-Key': crypto.randomUUID()
        }
      })
    );

    // Validate response data
    const createdClient = ClientSchema.parse(response.data.data);

    // Clear relevant caches
    clearClientCaches();

    return createdClient;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Updates an existing client with validation
 * @param clientId Client ID to update
 * @param updateData Client update data
 * @returns Promise resolving to updated client
 * @throws {Error} If validation fails or API request fails
 */
export const updateClient = async (
  clientId: string,
  updateData: IUpdateClientDTO
): Promise<IClient> => {
  try {
    // Validate user authorization
    await validateAuth('UPDATE_CLIENT');

    // Validate client ID format
    if (!z.string().uuid().safeParse(clientId).success) {
      throw new Error('Invalid client ID format');
    }

    // Make API request with retry mechanism
    const response = await retryRequest<AxiosResponse<ApiResponse<IClient>>>(() =>
      apiClient.put(`${API_CONFIG.ENDPOINTS.CLIENTS.BASE}/${clientId}`, updateData, {
        headers: {
          'X-Rate-Limit': RATE_LIMITS.UPDATE,
          'X-Idempotency-Key': crypto.randomUUID()
        }
      })
    );

    // Validate response data
    const updatedClient = ClientSchema.parse(response.data.data);

    // Clear relevant caches
    clearClientCaches();

    return updatedClient;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Deletes a client by ID with security checks
 * @param clientId Client ID to delete
 * @returns Promise resolving to success status
 * @throws {Error} If validation fails or API request fails
 */
export const deleteClient = async (clientId: string): Promise<boolean> => {
  try {
    // Validate user authorization
    await validateAuth('DELETE_CLIENT');

    // Validate client ID format
    if (!z.string().uuid().safeParse(clientId).success) {
      throw new Error('Invalid client ID format');
    }

    // Make API request with retry mechanism
    await retryRequest(() =>
      apiClient.delete(`${API_CONFIG.ENDPOINTS.CLIENTS.BASE}/${clientId}`, {
        headers: {
          'X-Rate-Limit': RATE_LIMITS.DELETE
        }
      })
    );

    // Clear relevant caches
    clearClientCaches();

    return true;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Clears all client-related caches
 */
const clearClientCaches = (): void => {
  const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('clients_'));
  cacheKeys.forEach(key => localStorage.removeItem(key));
};

/**
 * Gets a single client by ID with caching
 * @param clientId Client ID to retrieve
 * @returns Promise resolving to client data
 * @throws {Error} If validation fails or API request fails
 */
export const getClientById = async (clientId: string): Promise<IClient> => {
  try {
    // Validate user authorization
    await validateAuth('READ_CLIENTS');

    // Validate client ID format
    if (!z.string().uuid().safeParse(clientId).success) {
      throw new Error('Invalid client ID format');
    }

    // Check cache
    const cacheKey = `client_${clientId}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CLIENT_CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(cacheKey);
    }

    // Make API request with retry mechanism
    const response = await retryRequest<AxiosResponse<ApiResponse<IClient>>>(() =>
      apiClient.get(`${API_CONFIG.ENDPOINTS.CLIENTS.BASE}/${clientId}`)
    );

    // Validate response data
    const client = ClientSchema.parse(response.data.data);

    // Cache successful response
    localStorage.setItem(cacheKey, JSON.stringify({
      data: client,
      timestamp: Date.now()
    }));

    return client;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};