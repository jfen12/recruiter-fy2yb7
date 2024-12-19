/**
 * @fileoverview Redux reducer for managing job requisition state
 * Implements type-safe state updates with comprehensive error handling and performance optimizations
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // ^1.9.0
import { Requisition, RequisitionStatus } from '../../interfaces/requisition.interface';
import { RequisitionActionTypes } from '../actions/requisitionActions';

/**
 * Interface defining the shape of requisition state
 * Includes comprehensive tracking of loading, errors, and pagination
 */
export interface RequisitionState {
  requisitions: Requisition[];
  loading: boolean;
  error: {
    message: string;
    code: string;
    details?: any;
  } | null;
  total: number;
  currentPage: number;
  lastUpdated: number;
  stateVersion: number;
}

/**
 * Initial state configuration with type safety
 */
const initialState: RequisitionState = {
  requisitions: [],
  loading: false,
  error: null,
  total: 0,
  currentPage: 1,
  lastUpdated: 0,
  stateVersion: 1
};

/**
 * Type-safe reducer using Redux Toolkit's createReducer
 * Implements comprehensive CRUD operations with enhanced error handling
 */
export const requisitionReducer = createReducer(initialState, (builder) => {
  builder
    // Fetch Requisitions
    .addCase(RequisitionActionTypes.FETCH_REQUISITIONS_REQUEST, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(RequisitionActionTypes.FETCH_REQUISITIONS_SUCCESS, (state, action) => {
      state.loading = false;
      state.requisitions = action.payload.requisitions;
      state.total = action.payload.total;
      state.currentPage = action.payload.page;
      state.lastUpdated = Date.now();
      state.error = null;
    })
    .addCase(RequisitionActionTypes.FETCH_REQUISITIONS_FAILURE, (state, action) => {
      state.loading = false;
      state.error = {
        message: action.payload.error.message,
        code: action.payload.error.code,
        details: action.payload.error.details
      };
    })

    // Create Requisition
    .addCase(RequisitionActionTypes.CREATE_REQUISITION_REQUEST, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(RequisitionActionTypes.CREATE_REQUISITION_SUCCESS, (state, action) => {
      state.loading = false;
      state.requisitions = [...state.requisitions, action.payload.requisition];
      state.total += 1;
      state.lastUpdated = Date.now();
      state.error = null;
    })
    .addCase(RequisitionActionTypes.CREATE_REQUISITION_FAILURE, (state, action) => {
      state.loading = false;
      state.error = {
        message: action.payload.error.message,
        code: action.payload.error.code,
        details: action.payload.error.details
      };
    })

    // Update Requisition
    .addCase(RequisitionActionTypes.UPDATE_REQUISITION_REQUEST, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(RequisitionActionTypes.UPDATE_REQUISITION_SUCCESS, (state, action) => {
      state.loading = false;
      state.requisitions = state.requisitions.map(req =>
        req.id === action.payload.requisition.id ? action.payload.requisition : req
      );
      state.lastUpdated = Date.now();
      state.error = null;
    })
    .addCase(RequisitionActionTypes.UPDATE_REQUISITION_FAILURE, (state, action) => {
      state.loading = false;
      state.error = {
        message: action.payload.error.message,
        code: action.payload.error.code,
        details: action.payload.error.details
      };
    })

    // Delete Requisition
    .addCase(RequisitionActionTypes.DELETE_REQUISITION_REQUEST, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(RequisitionActionTypes.DELETE_REQUISITION_SUCCESS, (state, action) => {
      state.loading = false;
      state.requisitions = state.requisitions.filter(req => req.id !== action.payload.id);
      state.total -= 1;
      state.lastUpdated = Date.now();
      state.error = null;
    })
    .addCase(RequisitionActionTypes.DELETE_REQUISITION_FAILURE, (state, action) => {
      state.loading = false;
      state.error = {
        message: action.payload.error.message,
        code: action.payload.error.code,
        details: action.payload.error.details
      };
    });
});

/**
 * Type guard to validate RequisitionState shape
 * @param state Potential RequisitionState object
 * @returns boolean indicating if state matches RequisitionState interface
 */
export const isValidRequisitionState = (state: unknown): state is RequisitionState => {
  const validState = state as RequisitionState;
  return (
    Array.isArray(validState?.requisitions) &&
    typeof validState?.loading === 'boolean' &&
    typeof validState?.total === 'number' &&
    typeof validState?.currentPage === 'number' &&
    typeof validState?.lastUpdated === 'number' &&
    typeof validState?.stateVersion === 'number' &&
    (validState?.error === null ||
      (typeof validState?.error?.message === 'string' &&
       typeof validState?.error?.code === 'string'))
  );
};

/**
 * Selector to get filtered requisitions by status
 * @param state RequisitionState
 * @param status RequisitionStatus to filter by
 * @returns Filtered array of requisitions
 */
export const selectRequisitionsByStatus = (
  state: RequisitionState,
  status: RequisitionStatus
): Requisition[] => {
  return state.requisitions.filter(req => req.status === status);
};

/**
 * Selector to get total count of requisitions by status
 * @param state RequisitionState
 * @param status RequisitionStatus to count
 * @returns Count of requisitions with specified status
 */
export const selectRequisitionCountByStatus = (
  state: RequisitionState,
  status: RequisitionStatus
): number => {
  return state.requisitions.filter(req => req.status === status).length;
};