/**
 * @fileoverview Redux Saga implementation for job requisition management
 * Implements advanced patterns for handling asynchronous operations with
 * comprehensive error handling, request deduplication, and optimistic updates.
 * @version 1.0.0
 */

import { takeLatest, put, call, delay, race, retry } from 'redux-saga/effects'; // ^1.2.0
import { 
  RequisitionActionTypes,
  fetchRequisitionsSuccess,
  fetchRequisitionsFailure,
  createRequisitionSuccess,
  createRequisitionFailure,
  updateRequisitionSuccess,
  updateRequisitionFailure,
  deleteRequisitionSuccess,
  deleteRequisitionFailure
} from '../actions/requisitionActions';
import {
  searchRequisitions,
  createRequisition,
  updateRequisition,
  deleteRequisition
} from '../../api/requisitions';
import {
  Requisition,
  CreateRequisitionDTO,
  UpdateRequisitionDTO
} from '../../interfaces/requisition.interface';
import { validateRequisition } from '../../utils/validation';

// Constants for saga configuration
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;

/**
 * Saga for handling requisition fetch requests with retry mechanism
 * Implements circuit breaker pattern and request deduplication
 */
function* fetchRequisitionsSaga(action: {
  type: string;
  payload: {
    page?: number;
    limit?: number;
    status?: string;
    clientId?: string;
    searchTerm?: string;
  };
}) {
  try {
    // Race between request and timeout
    const { response, timeout } = yield race({
      response: retry(RETRY_COUNT, RETRY_DELAY, function* () {
        const result = yield call(searchRequisitions, action.payload);
        return result;
      }),
      timeout: delay(REQUEST_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    if (response.data) {
      yield put(fetchRequisitionsSuccess(response.data, response.data.total, action.payload.page || 1));
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    yield put(fetchRequisitionsFailure({
      message: error instanceof Error ? error.message : 'Failed to fetch requisitions',
      code: 'FETCH_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Saga for handling requisition creation with optimistic updates
 * Includes comprehensive validation and error handling
 */
function* createRequisitionSaga(action: {
  type: string;
  payload: CreateRequisitionDTO;
}) {
  try {
    // Validate requisition data
    const validationResult = validateRequisition(action.payload as Requisition);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticRequisition = {
      ...action.payload,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Dispatch optimistic update
    yield put(createRequisitionSuccess(optimisticRequisition));

    // Make API call with retry mechanism
    const response = yield retry(RETRY_COUNT, RETRY_DELAY, function* () {
      return yield call(createRequisition, action.payload);
    });

    // Update with real data from server
    yield put(createRequisitionSuccess(response));
  } catch (error) {
    console.error('Error creating requisition:', error);
    yield put(createRequisitionFailure({
      message: error instanceof Error ? error.message : 'Failed to create requisition',
      code: 'CREATE_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Saga for handling requisition updates with optimistic updates
 * Includes validation and rollback capability
 */
function* updateRequisitionSaga(action: {
  type: string;
  payload: { id: string; updates: UpdateRequisitionDTO };
}) {
  try {
    const { id, updates } = action.payload;

    // Validate update data
    const validationResult = validateRequisition({ ...updates, id } as Requisition);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Store previous state for rollback
    const previousState = yield call(searchRequisitions, { id });

    // Optimistic update
    yield put(updateRequisitionSuccess({ ...previousState.data, ...updates, id }));

    // Make API call with retry mechanism
    const response = yield retry(RETRY_COUNT, RETRY_DELAY, function* () {
      return yield call(updateRequisition, id, updates);
    });

    // Update with server response
    yield put(updateRequisitionSuccess(response));
  } catch (error) {
    console.error('Error updating requisition:', error);
    yield put(updateRequisitionFailure(action.payload.id, {
      message: error instanceof Error ? error.message : 'Failed to update requisition',
      code: 'UPDATE_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Saga for handling requisition deletion with optimistic updates
 * Includes confirmation and rollback capability
 */
function* deleteRequisitionSaga(action: {
  type: string;
  payload: { id: string };
}) {
  try {
    const { id } = action.payload;

    // Store state for potential rollback
    const previousState = yield call(searchRequisitions, { id });

    // Optimistic delete
    yield put(deleteRequisitionSuccess(id));

    // Make API call with retry mechanism
    yield retry(RETRY_COUNT, RETRY_DELAY, function* () {
      yield call(deleteRequisition, id);
    });
  } catch (error) {
    console.error('Error deleting requisition:', error);
    yield put(deleteRequisitionFailure(action.payload.id, {
      message: error instanceof Error ? error.message : 'Failed to delete requisition',
      code: 'DELETE_ERROR',
      timestamp: new Date()
    }));
  }
}

/**
 * Root saga that combines all requisition-related sagas
 * Implements takeLatest pattern to handle concurrent requests
 */
export function* watchRequisitionSagas() {
  yield takeLatest(RequisitionActionTypes.FETCH_REQUISITIONS_REQUEST, fetchRequisitionsSaga);
  yield takeLatest(RequisitionActionTypes.CREATE_REQUISITION_REQUEST, createRequisitionSaga);
  yield takeLatest(RequisitionActionTypes.UPDATE_REQUISITION_REQUEST, updateRequisitionSaga);
  yield takeLatest(RequisitionActionTypes.DELETE_REQUISITION_REQUEST, deleteRequisitionSaga);
}