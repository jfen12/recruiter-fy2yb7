/**
 * @fileoverview Redux saga module for handling analytics-related side effects in RefactorTrack.
 * Implements efficient data processing, performance tracking, and comprehensive error handling
 * for recruitment analytics operations.
 * @version 1.0.0
 */

import { call, put, takeLatest, race, delay } from 'redux-saga/effects'; // ^1.2.1
import { PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import {
  FETCH_RECRUITMENT_METRICS,
  FETCH_TIME_TO_HIRE_ANALYTICS,
  FETCH_SKILL_ANALYTICS,
  fetchRecruitmentMetricsSuccess,
  fetchRecruitmentMetricsError,
  fetchTimeToHireAnalyticsSuccess,
  fetchTimeToHireAnalyticsError,
  fetchSkillAnalyticsSuccess,
  fetchSkillAnalyticsError
} from '../actions/analyticsActions';
import {
  getRecruitmentMetrics,
  getTimeToHireAnalytics,
  getSkillDemandAnalytics,
  getSkillAvailabilityAnalytics,
  getSkillGapAnalysis
} from '../../api/analytics';
import { AnalyticsRequest } from '../../interfaces/analytics.interface';

// Constants for performance monitoring
const ANALYTICS_TIMEOUT = 30000; // 30 seconds as per technical spec
const PERFORMANCE_THRESHOLD = 30000; // 30 seconds for data processing

/**
 * Saga for fetching recruitment metrics with performance tracking and error handling
 * @param action PayloadAction containing analytics request parameters
 */
function* fetchRecruitmentMetricsSaga(action: PayloadAction<AnalyticsRequest>) {
  const startTime = Date.now();
  
  try {
    // Execute request with timeout race
    const { response, timeout } = yield race({
      response: call(getRecruitmentMetrics, action.payload),
      timeout: delay(ANALYTICS_TIMEOUT)
    });

    // Handle timeout
    if (timeout) {
      throw new Error('Recruitment metrics request timed out');
    }

    // Track performance
    const processingTime = Date.now() - startTime;
    if (processingTime > PERFORMANCE_THRESHOLD) {
      console.warn(`Recruitment metrics processing exceeded threshold: ${processingTime}ms`);
    }

    yield put(fetchRecruitmentMetricsSuccess(response));

  } catch (error) {
    yield put(fetchRecruitmentMetricsError({
      message: error instanceof Error ? error.message : 'Failed to fetch recruitment metrics',
      code: 'ANALYTICS_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Saga for fetching time-to-hire analytics with performance optimization
 * @param action PayloadAction containing analytics request parameters
 */
function* fetchTimeToHireAnalyticsSaga(action: PayloadAction<AnalyticsRequest>) {
  const startTime = Date.now();

  try {
    // Execute request with timeout race
    const { response, timeout } = yield race({
      response: call(getTimeToHireAnalytics, action.payload),
      timeout: delay(ANALYTICS_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Time-to-hire analytics request timed out');
    }

    // Validate response data structure
    if (!response || !response.averageDays || !response.trendData) {
      throw new Error('Invalid time-to-hire analytics response structure');
    }

    // Track performance
    const processingTime = Date.now() - startTime;
    if (processingTime > PERFORMANCE_THRESHOLD) {
      console.warn(`Time-to-hire analytics processing exceeded threshold: ${processingTime}ms`);
    }

    yield put(fetchTimeToHireAnalyticsSuccess(response));

  } catch (error) {
    yield put(fetchTimeToHireAnalyticsError({
      message: error instanceof Error ? error.message : 'Failed to fetch time-to-hire analytics',
      code: 'ANALYTICS_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Saga for fetching skill analytics with parallel request optimization
 * @param action PayloadAction containing analytics request parameters
 */
function* fetchSkillAnalyticsSaga(action: PayloadAction<AnalyticsRequest>) {
  const startTime = Date.now();

  try {
    // Execute parallel requests with timeout
    const { responses, timeout } = yield race({
      responses: call(function* () {
        const [demandData, availabilityData] = yield [
          call(getSkillDemandAnalytics, action.payload),
          call(getSkillAvailabilityAnalytics, action.payload)
        ];
        return { demand: demandData, availability: availabilityData };
      }),
      timeout: delay(ANALYTICS_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Skill analytics requests timed out');
    }

    // Validate combined response
    if (!responses.demand || !responses.availability) {
      throw new Error('Invalid skill analytics response structure');
    }

    // Track performance
    const processingTime = Date.now() - startTime;
    if (processingTime > PERFORMANCE_THRESHOLD) {
      console.warn(`Skill analytics processing exceeded threshold: ${processingTime}ms`);
    }

    yield put(fetchSkillAnalyticsSuccess(responses));

  } catch (error) {
    yield put(fetchSkillAnalyticsError({
      message: error instanceof Error ? error.message : 'Failed to fetch skill analytics',
      code: 'ANALYTICS_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Root saga that watches for analytics-related actions
 * Implements debouncing for performance optimization
 */
export function* watchAnalyticsSagas() {
  // Take latest ensures only the most recent request is processed
  yield takeLatest(FETCH_RECRUITMENT_METRICS, fetchRecruitmentMetricsSaga);
  yield takeLatest(FETCH_TIME_TO_HIRE_ANALYTICS, fetchTimeToHireAnalyticsSaga);
  yield takeLatest(FETCH_SKILL_ANALYTICS, fetchSkillAnalyticsSaga);
}

export default watchAnalyticsSagas;