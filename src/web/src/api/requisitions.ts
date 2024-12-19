/**
 * @fileoverview API module for handling job requisition operations in RefactorTrack.
 * Implements secure, type-safe API calls with enhanced error handling and caching.
 * @version 1.0.0
 */

// axios version ^1.4.0
import { AxiosResponse } from 'axios';
import { 
  Requisition, 
  CreateRequisitionDTO, 
  UpdateRequisitionDTO, 
  RequisitionStatus 
} from '../interfaces/requisition.interface';
import { API_CONFIG } from '../config/api';
import { apiClient, handleApiError } from '../utils/api';
import { validateRequisition } from '../utils/validation';

// Cache configuration
const CACHE_KEY_PREFIX = 'requisition_';
const CACHE_DURATION = API_CONFIG.ENV_CONFIG.CACHE_DURATION;

/**
 * Creates a new job requisition with comprehensive validation
 * @param requisitionData Data for creating new requisition
 * @returns Promise resolving to created requisition
 * @throws Error if validation or API request fails
 */
export const createRequisition = async (
  requisitionData: CreateRequisitionDTO
): Promise<Requisition> => {
  try {
    // Validate requisition data
    const validationResult = validateRequisition(requisitionData as Requisition);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Add security headers and correlation ID
    const headers = {
      'X-Correlation-ID': crypto.randomUUID(),
      'X-Request-Source': 'web-client'
    };

    const response = await apiClient.post<Requisition>(
      API_CONFIG.ENDPOINTS.REQUISITIONS.BASE,
      requisitionData,
      { headers }
    );

    return response.data;
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Updates an existing job requisition with validation
 * @param id Requisition ID
 * @param requisitionData Data for updating requisition
 * @returns Promise resolving to updated requisition
 * @throws Error if validation or API request fails
 */
export const updateRequisition = async (
  id: string,
  requisitionData: UpdateRequisitionDTO
): Promise<Requisition> => {
  try {
    // Validate update data
    const validationResult = validateRequisition({
      ...requisitionData,
      id
    } as Requisition);
    
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const headers = {
      'X-Correlation-ID': crypto.randomUUID(),
      'X-Request-Source': 'web-client'
    };

    const response = await apiClient.put<Requisition>(
      `${API_CONFIG.ENDPOINTS.REQUISITIONS.BASE}/${id}`,
      requisitionData,
      { headers }
    );

    // Invalidate cache
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);

    return response.data;
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Retrieves a specific job requisition by ID with caching
 * @param id Requisition ID
 * @returns Promise resolving to requisition data
 * @throws Error if API request fails
 */
export const getRequisition = async (id: string): Promise<Requisition> => {
  try {
    // Check cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data as Requisition;
      }
      localStorage.removeItem(cacheKey);
    }

    const response = await apiClient.get<Requisition>(
      `${API_CONFIG.ENDPOINTS.REQUISITIONS.BASE}/${id}`
    );

    // Cache the response
    localStorage.setItem(cacheKey, JSON.stringify({
      data: response.data,
      timestamp: Date.now()
    }));

    return response.data;
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Searches for requisitions with filtering and pagination
 * @param params Search parameters
 * @returns Promise resolving to paginated requisition results
 * @throws Error if API request fails
 */
export const searchRequisitions = async (params: {
  title?: string;
  status?: RequisitionStatus;
  clientId?: string;
  page?: number;
  pageSize?: number;
}): Promise<AxiosResponse<Requisition[]>> => {
  try {
    const response = await apiClient.get(
      API_CONFIG.ENDPOINTS.REQUISITIONS.SEARCH,
      { params }
    );
    return response;
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Updates the status of a requisition
 * @param id Requisition ID
 * @param status New requisition status
 * @returns Promise resolving to updated requisition
 * @throws Error if API request fails
 */
export const updateRequisitionStatus = async (
  id: string,
  status: RequisitionStatus
): Promise<Requisition> => {
  try {
    const response = await apiClient.patch<Requisition>(
      `${API_CONFIG.ENDPOINTS.REQUISITIONS.BASE}/${id}/status`,
      { status }
    );

    // Invalidate cache
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);

    return response.data;
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Deletes a requisition by ID
 * @param id Requisition ID
 * @returns Promise resolving to void
 * @throws Error if API request fails
 */
export const deleteRequisition = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(
      `${API_CONFIG.ENDPOINTS.REQUISITIONS.BASE}/${id}`
    );
    
    // Clear cache
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Gets analytics data for a requisition
 * @param id Requisition ID
 * @returns Promise resolving to analytics data
 * @throws Error if API request fails
 */
export const getRequisitionAnalytics = async (
  id: string
): Promise<AxiosResponse<any>> => {
  try {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.REQUISITIONS.ANALYTICS}/${id}`
    );
    return response;
  } catch (error) {
    throw await handleApiError(error);
  }
};