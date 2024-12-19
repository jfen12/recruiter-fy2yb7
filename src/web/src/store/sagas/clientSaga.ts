/**
 * @fileoverview Redux Saga implementation for client management operations
 * Implements secure, resilient, and production-ready async operations with
 * comprehensive error handling, caching, and monitoring.
 * @version 1.0.0
 */

// redux-saga/effects v1.2.1
import { 
  call, 
  put, 
  takeLatest, 
  delay, 
  race, 
  cancel 
} from 'redux-saga/effects';
// @reduxjs/toolkit v1.9.5
import { PayloadAction } from '@reduxjs/toolkit';
// circuit-breaker-js v0.2.0
import CircuitBreaker from 'circuit-breaker-js';

import { 
  ClientActionTypes,
  fetchClientsSuccess,
  fetchClientsFailure,
  createClientSuccess,
  createClientFailure,
  updateClientSuccess,
  updateClientFailure,
  deleteClientSuccess,
  deleteClientFailure
} from '../actions/clientActions';
import { 
  getClients, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../../api/clients';
import { validateClientData } from '../../utils/validation';
import { IClient, ICreateClientDTO, IUpdateClientDTO } from '../../interfaces/client.interface';
import { PaginatedResponse } from '../../interfaces/common.interface';

// Circuit breaker configuration
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  timeout: 30000
});

/**
 * Handles fetching client list with enhanced error handling and caching
 * @param action Redux action containing pagination parameters
 */
function* fetchClientsSaga(
  action: PayloadAction<{ page: number; limit: number }>
): Generator<any, void, any> {
  try {
    // Validate request parameters
    const { page, limit } = action.payload;
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error('Invalid pagination parameters');
    }

    // Execute API call with circuit breaker
    const { response, timeout } = yield race({
      response: call([breaker, breaker.execute], () => 
        getClients({ page, limit })
      ),
      timeout: delay(30000)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    // Type assertion for response
    const clientResponse = response as PaginatedResponse<IClient>;
    
    yield put(fetchClientsSuccess(clientResponse));

  } catch (error) {
    console.error('[ClientSaga] fetchClients error:', error);
    yield put(fetchClientsFailure(error as Error));
  }
}

/**
 * Handles client creation with validation and security measures
 * @param action Redux action containing client creation data
 */
function* createClientSaga(
  action: PayloadAction<ICreateClientDTO>
): Generator<any, void, any> {
  try {
    // Validate client data
    const validationResult = yield call(validateClientData, action.payload);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Execute creation with circuit breaker
    const { response, timeout } = yield race({
      response: call([breaker, breaker.execute], () => 
        createClient(action.payload)
      ),
      timeout: delay(30000)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    yield put(createClientSuccess(response as IClient));

  } catch (error) {
    console.error('[ClientSaga] createClient error:', error);
    yield put(createClientFailure(error as Error));
  }
}

/**
 * Handles client update operations with validation
 * @param action Redux action containing update data
 */
function* updateClientSaga(
  action: PayloadAction<{ id: string; data: IUpdateClientDTO }>
): Generator<any, void, any> {
  try {
    const { id, data } = action.payload;

    // Validate update data
    const validationResult = yield call(validateClientData, data);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Execute update with circuit breaker
    const { response, timeout } = yield race({
      response: call([breaker, breaker.execute], () => 
        updateClient(id, data)
      ),
      timeout: delay(30000)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    yield put(updateClientSuccess(response as IClient));

  } catch (error) {
    console.error('[ClientSaga] updateClient error:', error);
    yield put(updateClientFailure(error as Error));
  }
}

/**
 * Handles client deletion with security checks
 * @param action Redux action containing client ID
 */
function* deleteClientSaga(
  action: PayloadAction<string>
): Generator<any, void, any> {
  try {
    const clientId = action.payload;

    // Validate client ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(clientId)) {
      throw new Error('Invalid client ID format');
    }

    // Execute deletion with circuit breaker
    const { response, timeout } = yield race({
      response: call([breaker, breaker.execute], () => 
        deleteClient(clientId)
      ),
      timeout: delay(30000)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    yield put(deleteClientSuccess(clientId));

  } catch (error) {
    console.error('[ClientSaga] deleteClient error:', error);
    yield put(deleteClientFailure(error as Error));
  }
}

/**
 * Root saga that combines all client-related sagas
 * Implements takeLatest to handle concurrent requests
 */
export function* watchClientSagas() {
  yield takeLatest(ClientActionTypes.FETCH_CLIENTS_REQUEST, fetchClientsSaga);
  yield takeLatest(ClientActionTypes.CREATE_CLIENT_REQUEST, createClientSaga);
  yield takeLatest(ClientActionTypes.UPDATE_CLIENT_REQUEST, updateClientSaga);
  yield takeLatest(ClientActionTypes.DELETE_CLIENT_REQUEST, deleteClientSaga);
}

export default watchClientSagas;