/**
 * @fileoverview Root saga module that combines all feature-specific sagas in RefactorTrack.
 * Implements comprehensive error handling, monitoring, and saga lifecycle management.
 * @version 1.0.0
 */

import { all, fork, call, delay } from 'redux-saga/effects'; // ^1.2.1
import { captureException } from '@sentry/browser'; // ^7.0.0

// Import feature-specific saga watchers
import watchAnalyticsSagas from './analyticsSaga';
import watchAuth from './authSaga';
import watchCandidateSagas from './candidateSaga';
import watchClientSagas from './clientSaga';
import watchRequisitionSagas from './requisitionSaga';

/**
 * Utility function to handle and report saga errors with proper categorization
 * @param error Error object from saga execution
 * @param sagaName Name of the saga for error context
 */
function* handleSagaError(error: Error, sagaName: string) {
  console.error(`Error in ${sagaName}:`, error);

  // Categorize error type
  const errorContext = {
    sagaName,
    timestamp: new Date().toISOString(),
    errorType: error.name,
    message: error.message
  };

  // Report error to monitoring service
  yield call(captureException, error, {
    extra: errorContext,
    tags: {
      saga: sagaName,
      errorType: error.name
    }
  });

  // Implement recovery mechanism based on error type
  if (error.name === 'NetworkError') {
    yield delay(1000); // Wait before retry
    // Implement retry logic here
  }
}

/**
 * Decorator for monitoring saga performance
 * @param saga Generator function to monitor
 */
function monitorSagaPerformance(saga: any) {
  return function* (...args: any[]) {
    const startTime = Date.now();
    try {
      yield* saga(...args);
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log performance metrics if duration exceeds threshold
      if (duration > 1000) { // 1 second threshold
        console.warn(`Saga ${saga.name} took ${duration}ms to complete`);
        // Add additional monitoring/reporting here
      }
    }
  };
}

/**
 * Root saga that combines all feature-specific sagas with enhanced error handling
 * and monitoring capabilities.
 */
export function* rootSaga() {
  try {
    // Fork all feature sagas with error boundaries
    yield all([
      fork(function* authSagaWithErrorHandling() {
        try {
          yield call(watchAuth);
        } catch (error) {
          yield call(handleSagaError, error as Error, 'authSaga');
        }
      }),

      fork(function* analyticsSagaWithErrorHandling() {
        try {
          yield call(watchAnalyticsSagas);
        } catch (error) {
          yield call(handleSagaError, error as Error, 'analyticsSaga');
        }
      }),

      fork(function* candidateSagaWithErrorHandling() {
        try {
          yield call(watchCandidateSagas);
        } catch (error) {
          yield call(handleSagaError, error as Error, 'candidateSaga');
        }
      }),

      fork(function* clientSagaWithErrorHandling() {
        try {
          yield call(watchClientSagas);
        } catch (error) {
          yield call(handleSagaError, error as Error, 'clientSaga');
        }
      }),

      fork(function* requisitionSagaWithErrorHandling() {
        try {
          yield call(watchRequisitionSagas);
        } catch (error) {
          yield call(handleSagaError, error as Error, 'requisitionSaga');
        }
      })
    ]);
  } catch (error) {
    // Handle critical errors that escape individual error boundaries
    console.error('Critical error in root saga:', error);
    yield call(captureException, error, {
      level: 'fatal',
      extra: {
        context: 'rootSaga',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Export decorated root saga with performance monitoring
export default monitorSagaPerformance(rootSaga);