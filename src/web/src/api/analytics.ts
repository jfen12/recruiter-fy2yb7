/**
 * @fileoverview API module for handling analytics and reporting data requests in RefactorTrack.
 * Provides functions for fetching recruitment metrics, time-to-hire analytics, and skill-related analytics
 * with enhanced error handling, caching, and request optimization.
 * @version 1.0.0
 */

// axios version ^1.4.0
import { AxiosResponse } from 'axios';
// lodash version ^4.17.21
import { debounce, batch } from 'lodash';
import { apiClient, handleApiError } from '../utils/api';
import {
  RecruitmentMetrics,
  TimeToHireAnalytics,
  SkillDemand,
  SkillAvailability,
  SkillGap,
  AnalyticsRequest
} from '../interfaces/analytics.interface';

// Cache duration for analytics data (5 minutes)
const ANALYTICS_CACHE_TTL = 300000;

// Analytics request debounce delay (500ms)
const DEBOUNCE_DELAY = 500;

// Analytics endpoints
const ENDPOINTS = {
  RECRUITMENT_METRICS: '/analytics/recruitment-metrics',
  TIME_TO_HIRE: '/analytics/time-to-hire',
  SKILL_DEMAND: '/analytics/skill-demand',
  SKILL_AVAILABILITY: '/analytics/skill-availability'
};

/**
 * Cache store for analytics data
 */
const analyticsCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Class for managing analytics requests with optimization features
 */
export class AnalyticsRequestManager {
  private retryAttempts: number;
  private batchSize: number;
  private debouncedRequest: any;

  /**
   * Creates an instance of AnalyticsRequestManager
   * @param retryAttempts Maximum number of retry attempts
   * @param batchSize Size of request batches
   */
  constructor(retryAttempts: number = 3, batchSize: number = 10) {
    this.retryAttempts = retryAttempts;
    this.batchSize = batchSize;
    this.debouncedRequest = debounce(this.executeRequest, DEBOUNCE_DELAY);
  }

  /**
   * Executes an analytics request with optimizations
   * @param request Analytics request parameters
   * @returns Promise resolving to analytics data
   */
  private async executeRequest<T>(request: AnalyticsRequest): Promise<T> {
    const cacheKey = this.generateCacheKey(request);
    const cachedData = this.getCachedData<T>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.makeRequest<T>(request);
      this.cacheData(cacheKey, response);
      return response;
    } catch (error) {
      throw await handleApiError(error);
    }
  }

  /**
   * Generates a cache key for an analytics request
   * @param request Analytics request parameters
   * @returns Cache key string
   */
  private generateCacheKey(request: AnalyticsRequest): string {
    return JSON.stringify({
      path: request.metrics.join(','),
      dateRange: request.dateRange,
      filters: request.filters,
      aggregationLevel: request.aggregationLevel
    });
  }

  /**
   * Retrieves cached data if valid
   * @param key Cache key
   * @returns Cached data or null if expired/not found
   */
  private getCachedData<T>(key: string): T | null {
    const cached = analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL) {
      return cached.data as T;
    }
    analyticsCache.delete(key);
    return null;
  }

  /**
   * Caches analytics data with TTL
   * @param key Cache key
   * @param data Data to cache
   */
  private cacheData(key: string, data: any): void {
    analyticsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Makes an API request with retry logic
   * @param request Analytics request parameters
   * @returns Promise resolving to response data
   */
  private async makeRequest<T>(request: AnalyticsRequest): Promise<T> {
    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        const response = await apiClient.post<T>(
          this.getEndpointForMetrics(request.metrics),
          request
        );
        return response.data;
      } catch (error) {
        attempt++;
        if (attempt === this.retryAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error('Max retry attempts exceeded');
  }

  /**
   * Determines the appropriate endpoint based on requested metrics
   * @param metrics Requested metrics array
   * @returns API endpoint string
   */
  private getEndpointForMetrics(metrics: string[]): string {
    const metricEndpointMap: Record<string, string> = {
      recruitment: ENDPOINTS.RECRUITMENT_METRICS,
      timeToHire: ENDPOINTS.TIME_TO_HIRE,
      skillDemand: ENDPOINTS.SKILL_DEMAND,
      skillAvailability: ENDPOINTS.SKILL_AVAILABILITY
    };

    return metricEndpointMap[metrics[0]] || ENDPOINTS.RECRUITMENT_METRICS;
  }
}

// Create singleton instance of AnalyticsRequestManager
const analyticsManager = new AnalyticsRequestManager();

/**
 * Fetches recruitment performance metrics for a specified time period
 * @param request Analytics request parameters
 * @returns Promise resolving to recruitment metrics
 */
export const getRecruitmentMetrics = async (
  request: AnalyticsRequest
): Promise<RecruitmentMetrics> => {
  try {
    return await analyticsManager.executeRequest<RecruitmentMetrics>({
      ...request,
      metrics: ['recruitment']
    });
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Fetches time-to-hire analytics data
 * @param request Analytics request parameters
 * @returns Promise resolving to time-to-hire analytics
 */
export const getTimeToHireAnalytics = async (
  request: AnalyticsRequest
): Promise<TimeToHireAnalytics> => {
  try {
    return await analyticsManager.executeRequest<TimeToHireAnalytics>({
      ...request,
      metrics: ['timeToHire']
    });
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Fetches skill demand analytics data
 * @param request Analytics request parameters
 * @returns Promise resolving to skill demand data
 */
export const getSkillDemandAnalytics = async (
  request: AnalyticsRequest
): Promise<SkillDemand> => {
  try {
    return await analyticsManager.executeRequest<SkillDemand>({
      ...request,
      metrics: ['skillDemand']
    });
  } catch (error) {
    throw await handleApiError(error);
  }
};

/**
 * Fetches skill availability analytics data
 * @param request Analytics request parameters
 * @returns Promise resolving to skill availability data
 */
export const getSkillAvailabilityAnalytics = async (
  request: AnalyticsRequest
): Promise<SkillAvailability> => {
  try {
    return await analyticsManager.executeRequest<SkillAvailability>({
      ...request,
      metrics: ['skillAvailability']
    });
  } catch (error) {
    throw await handleApiError(error);
  }
};

export default {
  getRecruitmentMetrics,
  getTimeToHireAnalytics,
  getSkillDemandAnalytics,
  getSkillAvailabilityAnalytics,
  AnalyticsRequestManager
};