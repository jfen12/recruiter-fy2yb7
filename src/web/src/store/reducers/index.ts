/**
 * @fileoverview Root reducer configuration for RefactorTrack web application.
 * Combines all feature reducers with type safety and performance optimizations.
 * @version 1.0.0
 */

import { combineReducers } from '@reduxjs/toolkit'; // ^1.9.5

// Import individual reducers
import analyticsReducer from './analyticsReducer';
import authReducer from './authReducer';
import candidateReducer from './candidateReducer';
import clientReducer from './clientReducer';
import requisitionReducer from './requisitionReducer';

/**
 * Root state interface combining all feature states
 * Provides comprehensive type safety for the global application state
 */
export interface RootState {
  /** Analytics state for reporting and metrics */
  analytics: ReturnType<typeof analyticsReducer>;
  
  /** Authentication state for user sessions */
  auth: ReturnType<typeof authReducer>;
  
  /** Candidate management state */
  candidates: ReturnType<typeof candidateReducer>;
  
  /** Client relationship management state */
  clients: ReturnType<typeof clientReducer>;
  
  /** Job requisition management state */
  requisitions: ReturnType<typeof requisitionReducer>;
}

/**
 * Root reducer combining all feature reducers
 * Implements performance optimizations and state validation
 */
const rootReducer = combineReducers<RootState>({
  analytics: analyticsReducer,
  auth: authReducer,
  candidates: candidateReducer,
  clients: clientReducer,
  requisitions: requisitionReducer
});

/**
 * Type guard to validate the shape of the root state
 * @param state Potential root state object
 * @returns boolean indicating if state matches RootState interface
 */
export const isValidRootState = (state: unknown): state is RootState => {
  const validState = state as RootState;
  return (
    validState !== null &&
    typeof validState === 'object' &&
    'analytics' in validState &&
    'auth' in validState &&
    'candidates' in validState &&
    'clients' in validState &&
    'requisitions' in validState
  );
};

/**
 * Type for root reducer
 * Useful for middleware and store configuration
 */
export type RootReducer = typeof rootReducer;

export default rootReducer;