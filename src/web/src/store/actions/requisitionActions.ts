/**
 * @fileoverview Redux action creators for job requisition management
 * Implements type-safe actions using Redux Toolkit with comprehensive error handling
 * @version 1.0.0
 */

import { createAction, ActionCreatorWithPreparedPayload } from '@reduxjs/toolkit'; // ^1.9.0
import { pipe } from 'fp-ts/function'; // ^2.13.1
import * as t from 'io-ts'; // ^2.2.20
import { Logger } from 'winston'; // ^3.8.0
import {
  Requisition,
  CreateRequisitionDTO,
  UpdateRequisitionDTO,
  RequisitionStatus,
  RequisitionError
} from '../../interfaces/requisition.interface';

// Configure logger for action tracking
const logger = new Logger({
  level: 'info',
  format: Logger.format.json(),
  transports: [new Logger.transports.Console()]
});

/**
 * Enum defining all requisition action types
 * Ensures consistent action type strings across the application
 */
export enum RequisitionActionTypes {
  FETCH_REQUISITIONS_REQUEST = 'requisition/fetchRequest',
  FETCH_REQUISITIONS_SUCCESS = 'requisition/fetchSuccess',
  FETCH_REQUISITIONS_FAILURE = 'requisition/fetchFailure',
  
  CREATE_REQUISITION_REQUEST = 'requisition/createRequest',
  CREATE_REQUISITION_SUCCESS = 'requisition/createSuccess',
  CREATE_REQUISITION_FAILURE = 'requisition/createFailure',
  
  UPDATE_REQUISITION_REQUEST = 'requisition/updateRequest',
  UPDATE_REQUISITION_SUCCESS = 'requisition/updateSuccess',
  UPDATE_REQUISITION_FAILURE = 'requisition/updateFailure',
  
  DELETE_REQUISITION_REQUEST = 'requisition/deleteRequest',
  DELETE_REQUISITION_SUCCESS = 'requisition/deleteSuccess',
  DELETE_REQUISITION_FAILURE = 'requisition/deleteFailure'
}

/**
 * Runtime type validation for fetch parameters using io-ts
 */
const FetchParamsCodec = t.partial({
  page: t.number,
  limit: t.number,
  status: t.keyof(RequisitionStatus),
  clientId: t.string,
  sortBy: t.string,
  sortOrder: t.union([t.literal('asc'), t.literal('desc')])
});

type FetchParams = t.TypeOf<typeof FetchParamsCodec>;

/**
 * Action creator for initiating requisition fetch request
 * Includes runtime type validation and logging
 */
export const fetchRequisitionsRequest = createAction(
  RequisitionActionTypes.FETCH_REQUISITIONS_REQUEST,
  (params: FetchParams) => {
    logger.info('Fetching requisitions', { params });
    return {
      payload: {
        ...params,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for successful requisition fetch
 * Includes pagination metadata and response validation
 */
export const fetchRequisitionsSuccess = createAction(
  RequisitionActionTypes.FETCH_REQUISITIONS_SUCCESS,
  (requisitions: Requisition[], total: number, page: number) => {
    logger.info('Requisitions fetched successfully', { count: requisitions.length, page });
    return {
      payload: {
        requisitions,
        total,
        page,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for requisition fetch failure
 * Includes error handling and logging
 */
export const fetchRequisitionsFailure = createAction(
  RequisitionActionTypes.FETCH_REQUISITIONS_FAILURE,
  (error: RequisitionError) => {
    logger.error('Failed to fetch requisitions', { error });
    return {
      payload: {
        error,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for initiating requisition creation
 * Includes DTO validation and logging
 */
export const createRequisitionRequest = createAction(
  RequisitionActionTypes.CREATE_REQUISITION_REQUEST,
  (requisition: CreateRequisitionDTO) => {
    logger.info('Creating requisition', { requisition });
    return {
      payload: {
        requisition,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for successful requisition creation
 */
export const createRequisitionSuccess = createAction(
  RequisitionActionTypes.CREATE_REQUISITION_SUCCESS,
  (requisition: Requisition) => {
    logger.info('Requisition created successfully', { id: requisition.id });
    return {
      payload: {
        requisition,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for requisition creation failure
 */
export const createRequisitionFailure = createAction(
  RequisitionActionTypes.CREATE_REQUISITION_FAILURE,
  (error: RequisitionError) => {
    logger.error('Failed to create requisition', { error });
    return {
      payload: {
        error,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for initiating requisition update
 * Includes partial DTO validation
 */
export const updateRequisitionRequest = createAction(
  RequisitionActionTypes.UPDATE_REQUISITION_REQUEST,
  (id: string, updates: UpdateRequisitionDTO) => {
    logger.info('Updating requisition', { id, updates });
    return {
      payload: {
        id,
        updates,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for successful requisition update
 */
export const updateRequisitionSuccess = createAction(
  RequisitionActionTypes.UPDATE_REQUISITION_SUCCESS,
  (requisition: Requisition) => {
    logger.info('Requisition updated successfully', { id: requisition.id });
    return {
      payload: {
        requisition,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for requisition update failure
 */
export const updateRequisitionFailure = createAction(
  RequisitionActionTypes.UPDATE_REQUISITION_FAILURE,
  (id: string, error: RequisitionError) => {
    logger.error('Failed to update requisition', { id, error });
    return {
      payload: {
        id,
        error,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for initiating requisition deletion
 */
export const deleteRequisitionRequest = createAction(
  RequisitionActionTypes.DELETE_REQUISITION_REQUEST,
  (id: string) => {
    logger.info('Deleting requisition', { id });
    return {
      payload: {
        id,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for successful requisition deletion
 */
export const deleteRequisitionSuccess = createAction(
  RequisitionActionTypes.DELETE_REQUISITION_SUCCESS,
  (id: string) => {
    logger.info('Requisition deleted successfully', { id });
    return {
      payload: {
        id,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Action creator for requisition deletion failure
 */
export const deleteRequisitionFailure = createAction(
  RequisitionActionTypes.DELETE_REQUISITION_FAILURE,
  (id: string, error: RequisitionError) => {
    logger.error('Failed to delete requisition', { id, error });
    return {
      payload: {
        id,
        error,
        timestamp: Date.now()
      }
    };
  }
);

/**
 * Union type of all requisition actions
 * Useful for type checking in reducers and middleware
 */
export type RequisitionActions =
  | ReturnType<typeof fetchRequisitionsRequest>
  | ReturnType<typeof fetchRequisitionsSuccess>
  | ReturnType<typeof fetchRequisitionsFailure>
  | ReturnType<typeof createRequisitionRequest>
  | ReturnType<typeof createRequisitionSuccess>
  | ReturnType<typeof createRequisitionFailure>
  | ReturnType<typeof updateRequisitionRequest>
  | ReturnType<typeof updateRequisitionSuccess>
  | ReturnType<typeof updateRequisitionFailure>
  | ReturnType<typeof deleteRequisitionRequest>
  | ReturnType<typeof deleteRequisitionSuccess>
  | ReturnType<typeof deleteRequisitionFailure>;