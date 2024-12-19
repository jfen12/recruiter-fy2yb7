/**
 * @fileoverview Redux action creators for analytics-related state management in RefactorTrack.
 * Implements type-safe async thunks for fetching various analytics metrics with comprehensive
 * error handling and request validation.
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import {
  RecruitmentMetrics,
  TimeToHireAnalytics,
  SkillDemand,
  SkillAvailability,
  SkillGap,
  AnalyticsRequest,
  AnalyticsError
} from '../../interfaces/analytics.interface';

// Action type constants
export const FETCH_RECRUITMENT_METRICS = 'analytics/fetchRecruitmentMetrics';
export const FETCH_TIME_TO_HIRE_ANALYTICS = 'analytics/fetchTimeToHireAnalytics';
export const FETCH_SKILL_ANALYTICS = 'analytics/fetchSkillAnalytics';

// Request cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const requestCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Validates analytics request parameters
 * @param request The analytics request to validate
 * @throws Error if request parameters are invalid
 */
const validateAnalyticsRequest = (request: AnalyticsRequest): void => {
  const { dateRange, aggregationLevel, metrics } = request;
  
  if (!dateRange?.startDate || !dateRange?.endDate) {
    throw new Error('Date range must be specified');
  }
  
  if (dateRange.startDate > dateRange.endDate) {
    throw new Error('Start date must be before end date');
  }
  
  if (!aggregationLevel || !['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(aggregationLevel)) {
    throw new Error('Invalid aggregation level');
  }
  
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    throw new Error('At least one metric must be specified');
  }
};

/**
 * Generates a cache key for analytics requests
 * @param actionType The action type
 * @param request The analytics request
 * @returns Cache key string
 */
const generateCacheKey = (actionType: string, request: AnalyticsRequest): string => {
  return `${actionType}:${JSON.stringify(request)}`;
};

/**
 * Checks if a cached response is available and valid
 * @param cacheKey The cache key to check
 * @returns Cached data if valid, null otherwise
 */
const checkCache = (cacheKey: string): any | null => {
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

/**
 * Action creator for fetching recruitment metrics with request validation and caching
 */
export const fetchRecruitmentMetrics = createAsyncThunk<
  RecruitmentMetrics,
  AnalyticsRequest,
  { rejectValue: AnalyticsError }
>(
  FETCH_RECRUITMENT_METRICS,
  async (request: AnalyticsRequest, { rejectWithValue }) => {
    try {
      validateAnalyticsRequest(request);
      
      const cacheKey = generateCacheKey(FETCH_RECRUITMENT_METRICS, request);
      const cachedData = checkCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // API call would go here
      // const response = await analyticsApi.fetchRecruitmentMetrics(request);
      
      // Simulated response for implementation reference
      const response: RecruitmentMetrics = {
        totalRequisitions: 0,
        filledRequisitions: 0,
        averageTimeToHire: 0,
        clientSatisfactionRate: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
        requisitionFillRate: 0,
        candidateQualityScore: 0
      };

      requestCache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch recruitment metrics',
        code: 'ANALYTICS_ERROR'
      } as AnalyticsError);
    }
  }
);

/**
 * Action creator for fetching time-to-hire analytics with enhanced error handling
 */
export const fetchTimeToHireAnalytics = createAsyncThunk<
  TimeToHireAnalytics,
  AnalyticsRequest,
  { rejectValue: AnalyticsError }
>(
  FETCH_TIME_TO_HIRE_ANALYTICS,
  async (request: AnalyticsRequest, { rejectWithValue }) => {
    try {
      validateAnalyticsRequest(request);
      
      const cacheKey = generateCacheKey(FETCH_TIME_TO_HIRE_ANALYTICS, request);
      const cachedData = checkCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // API call would go here
      // const response = await analyticsApi.fetchTimeToHireAnalytics(request);
      
      // Simulated response for implementation reference
      const response: TimeToHireAnalytics = {
        averageDays: 0,
        medianDays: 0,
        trendData: [],
        percentileData: {
          p90: 0,
          p75: 0,
          p25: 0
        },
        breakdownByRole: {}
      };

      requestCache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch time-to-hire analytics',
        code: 'ANALYTICS_ERROR'
      } as AnalyticsError);
    }
  }
);

/**
 * Action creator for fetching skill analytics with comprehensive error handling
 */
export const fetchSkillAnalytics = createAsyncThunk<
  { demand: SkillDemand[]; availability: SkillAvailability[] },
  AnalyticsRequest,
  { rejectValue: AnalyticsError }
>(
  FETCH_SKILL_ANALYTICS,
  async (request: AnalyticsRequest, { rejectWithValue }) => {
    try {
      validateAnalyticsRequest(request);
      
      const cacheKey = generateCacheKey(FETCH_SKILL_ANALYTICS, request);
      const cachedData = checkCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // API calls would go here
      // const demandResponse = await analyticsApi.fetchSkillDemand(request);
      // const availabilityResponse = await analyticsApi.fetchSkillAvailability(request);
      
      // Simulated response for implementation reference
      const response = {
        demand: [] as SkillDemand[],
        availability: [] as SkillAvailability[]
      };

      requestCache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch skill analytics',
        code: 'ANALYTICS_ERROR'
      } as AnalyticsError);
    }
  }
);

// Action creator for clearing analytics cache
export const clearAnalyticsCache = createAction('analytics/clearCache', () => {
  requestCache.clear();
  return { payload: undefined };
});