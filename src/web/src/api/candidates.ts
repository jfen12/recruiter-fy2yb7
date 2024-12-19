/**
 * @fileoverview API module for candidate-related operations in RefactorTrack
 * Implements comprehensive CRUD operations, advanced search, and document management
 * with robust error handling and retry mechanisms.
 * @version 1.0.0
 */

import { AxiosResponse, AxiosError, CancelToken } from 'axios'; // ^1.4.0
import { retry } from 'axios-retry'; // ^3.5.0
import { ICandidate, CandidateStatus, ISkill } from '../interfaces/candidate.interface';
import { API_CONFIG } from '../config/api';
import { apiClient, handleApiError } from '../utils/api';
import { PaginatedResponse } from '../interfaces/common.interface';

// Cache configuration
const CACHE_DURATION = 300000; // 5 minutes
const cacheStore = new Map<string, { data: any; timestamp: number }>();

/**
 * Interface for candidate search parameters with comprehensive filtering options
 */
interface CandidateSearchParams {
  query?: string;
  skills?: string[];
  experience?: {
    min?: number;
    max?: number;
  };
  status?: CandidateStatus;
  location?: string;
  availability?: string;
  salary?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for document upload options
 */
interface DocumentUploadOptions {
  onProgress?: (progress: number) => void;
  cancelToken?: CancelToken;
  type?: string;
  metadata?: Record<string, any>;
}

/**
 * Retrieves a paginated list of candidates with advanced filtering capabilities
 * @param params Search and filtering parameters
 * @returns Promise resolving to paginated candidate response
 */
export const getCandidates = async (
  params: CandidateSearchParams = {}
): Promise<AxiosResponse<PaginatedResponse<ICandidate>>> => {
  try {
    // Generate cache key based on params
    const cacheKey = `candidates_${JSON.stringify(params)}`;
    
    // Check cache
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Configure retry strategy
    retry(apiClient, {
      retries: API_CONFIG.SECURITY.RETRY_STRATEGY.ATTEMPTS,
      retryDelay: (retryCount) => {
        return retryCount * API_CONFIG.SECURITY.RETRY_STRATEGY.DELAY_MS;
      },
      retryCondition: (error: AxiosError) => {
        return error.response?.status === 429 || error.response?.status === 503;
      }
    });

    // Make API request
    const response = await apiClient.get<PaginatedResponse<ICandidate>>(
      API_CONFIG.ENDPOINTS.CANDIDATES.BASE,
      {
        params: {
          ...params,
          page: params.page || 1,
          limit: params.limit || 10
        },
        timeout: API_CONFIG.SECURITY.TIMEOUT.REQUEST_MS
      }
    );

    // Cache successful response
    setCachedData(cacheKey, response);

    return response;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Performs advanced candidate search with multiple criteria and result ranking
 * @param searchParams Search criteria and filters
 * @returns Promise resolving to ranked search results
 */
export const searchCandidates = async (
  searchParams: CandidateSearchParams
): Promise<AxiosResponse<PaginatedResponse<ICandidate>>> => {
  try {
    // Normalize search parameters
    const normalizedParams = {
      ...searchParams,
      query: searchParams.query?.trim().toLowerCase(),
      skills: searchParams.skills?.map(skill => skill.toLowerCase())
    };

    const response = await apiClient.post<PaginatedResponse<ICandidate>>(
      API_CONFIG.ENDPOINTS.CANDIDATES.SEARCH,
      normalizedParams,
      {
        headers: {
          'X-Search-Version': '1.0'
        }
      }
    );

    return response;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Uploads candidate documents with progress tracking and validation
 * @param id Candidate identifier
 * @param documentData Document form data
 * @param options Upload options including progress tracking
 * @returns Promise resolving to uploaded document details
 */
export const uploadCandidateDocument = async (
  id: string,
  documentData: FormData,
  options: DocumentUploadOptions = {}
): Promise<AxiosResponse<{ documentUrl: string; metadata: Record<string, any> }>> => {
  try {
    // Validate document size and type
    const file = documentData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }

    // Maximum file size (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum limit of 10MB');
    }

    // Allowed file types
    const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF and Word documents are allowed');
    }

    // Add metadata to form data
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        documentData.append(`metadata[${key}]`, value);
      });
    }

    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.CANDIDATES.DOCUMENTS}/${id}`,
      documentData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (options.onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(progress);
          }
        },
        cancelToken: options.cancelToken
      }
    );

    return response;
  } catch (error) {
    throw await handleApiError(error as AxiosError);
  }
};

/**
 * Retrieves cached data if valid
 * @param key Cache key
 * @returns Cached data or null if expired/not found
 */
const getCachedData = (key: string): AxiosResponse | null => {
  const cached = cacheStore.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cacheStore.delete(key);
  return null;
};

/**
 * Caches response data with expiration
 * @param key Cache key
 * @param data Data to cache
 */
const setCachedData = (key: string, data: AxiosResponse): void => {
  cacheStore.set(key, {
    data,
    timestamp: Date.now()
  });
};

export default {
  getCandidates,
  searchCandidates,
  uploadCandidateDocument
};