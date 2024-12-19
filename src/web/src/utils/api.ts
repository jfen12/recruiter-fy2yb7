/**
 * @fileoverview Core API utility module for RefactorTrack web application
 * Provides HTTP client configuration, request/response interceptors, and reusable API helper functions
 * with enhanced security, error handling, and caching capabilities.
 * @version 1.0.0
 */

// axios version ^1.4.0
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
// opossum version ^6.0.0
import CircuitBreaker from 'opossum';
import { API_CONFIG } from '../config/api';
import { getAuthState, refreshToken, validateToken } from './auth';
import { ApiResponse, PaginatedResponse, ErrorResponse } from '../interfaces/common.interface';

// Constants for request handling
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CIRCUIT_BREAKER_OPTIONS = {
  failureThreshold: 5,
  resetTimeout: 30000,
  timeout: API_CONFIG.TIMEOUT
};
const CACHE_TTL = 300000; // 5 minutes

// In-memory cache store
const apiCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Creates and configures an axios instance with enhanced security features
 * @returns Configured axios instance
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Version': API_CONFIG.API_VERSION
    },
    validateStatus: (status) => status >= 200 && status < 300
  });

  // Request interceptor for authentication and security headers
  instance.interceptors.request.use(
    async (config) => {
      const authState = await getAuthState();
      if (authState?.tokens?.accessToken) {
        // Validate token before adding to request
        const isValid = await validateToken(authState.tokens.accessToken);
        if (isValid) {
          config.headers.Authorization = `Bearer ${authState.tokens.accessToken}`;
        }
      }

      // Add security headers
      config.headers['X-Request-ID'] = crypto.randomUUID();
      config.headers['X-Client-Version'] = process.env.REACT_APP_VERSION;

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for token refresh and error handling
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // Handle token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        try {
          originalRequest._retry = true;
          const newToken = await refreshToken();
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(await handleApiError(error));
    }
  );

  return instance;
};

/**
 * Enhanced error handling with detailed categorization and logging
 * @param error AxiosError instance
 * @returns Standardized error response
 */
export const handleApiError = async (error: AxiosError): Promise<ErrorResponse> => {
  const errorResponse: ErrorResponse = {
    success: false,
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    timestamp: new Date(),
    details: {}
  };

  if (error.response) {
    // Server error response
    errorResponse.code = `SERVER_ERROR_${error.response.status}`;
    errorResponse.message = error.response.data?.message || error.message;
    errorResponse.details = {
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // Network error
    errorResponse.code = 'NETWORK_ERROR';
    errorResponse.message = 'Network error occurred';
    errorResponse.details = {
      request: error.request
    };
  }

  // Log error for monitoring
  console.error('[API Error]', {
    code: errorResponse.code,
    message: errorResponse.message,
    url: error.config?.url,
    method: error.config?.method
  });

  return errorResponse;
};

/**
 * Advanced retry mechanism with exponential backoff
 * @param requestFn Function that makes the API request
 * @param config Retry configuration
 * @returns Promise resolving to the API response
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  config: { maxRetries?: number; initialDelay?: number } = {}
): Promise<T> => {
  const maxRetries = config.maxRetries || MAX_RETRIES;
  const initialDelay = config.initialDelay || RETRY_DELAY;

  const breaker = new CircuitBreaker(requestFn, CIRCUIT_BREAKER_OPTIONS);

  breaker.fallback(() => {
    throw new Error('Service unavailable - circuit breaker open');
  });

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await breaker.fire();
    } catch (error) {
      attempt++;
      if (attempt === maxRetries) {
        throw error;
      }
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, initialDelay * Math.pow(2, attempt))
      );
    }
  }

  throw new Error('Max retries exceeded');
};

/**
 * Caches API responses with TTL
 * @param cacheKey Unique cache key
 * @param data Data to cache
 */
const setCacheData = (cacheKey: string, data: any): void => {
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Retrieves cached API response if valid
 * @param cacheKey Unique cache key
 * @returns Cached data or null if expired/not found
 */
const getCacheData = (cacheKey: string): any | null => {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  apiCache.delete(cacheKey);
  return null;
};

// Create and export configured API client instance
export const apiClient = createApiClient();

export default apiClient;