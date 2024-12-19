/**
 * @fileoverview Redux action creators for authentication operations in RefactorTrack
 * Implements OAuth 2.0 + JWT based authentication with comprehensive security monitoring
 * and session management following enterprise security standards.
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  LoginCredentials, 
  AuthResponse, 
  TokenPair, 
  User, 
  SecurityEvent 
} from '../../interfaces/auth.interface';
import { 
  login, 
  logout, 
  refreshToken, 
  logSecurityEvent 
} from '../../api/auth';

// Action type constants
export const AUTH_ACTION_TYPES = {
  LOGIN_REQUEST: 'auth/login',
  LOGOUT_REQUEST: 'auth/logout',
  REFRESH_TOKEN_REQUEST: 'auth/refreshToken',
  SET_AUTH_ERROR: 'auth/setError',
  CLEAR_AUTH_ERROR: 'auth/clearError',
  UPDATE_SESSION: 'auth/updateSession'
} as const;

/**
 * Async thunk for user authentication with enhanced security monitoring
 * Handles MFA challenges and implements comprehensive session management
 */
export const loginRequest = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: string }
>(
  AUTH_ACTION_TYPES.LOGIN_REQUEST,
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // Generate request fingerprint for security tracking
      const requestFingerprint = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ipAddress: await fetch('https://api.ipify.org?format=json').then(r => r.json())
      };

      // Attempt authentication
      const response = await login(credentials);

      // Log successful authentication
      await logSecurityEvent({
        type: 'AUTH_SUCCESS',
        userId: response.user.id,
        metadata: {
          fingerprint: requestFingerprint,
          mfaUsed: response.mfaRequired
        }
      });

      return response;
    } catch (error) {
      // Log failed authentication attempt
      await logSecurityEvent({
        type: 'AUTH_FAILURE',
        metadata: {
          reason: error.message,
          email: credentials.email,
          timestamp: new Date().toISOString()
        }
      });

      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for secure user logout with comprehensive session cleanup
 * Implements secure token revocation and session state management
 */
export const logoutRequest = createAsyncThunk<
  void,
  boolean | undefined,
  { rejectValue: string }
>(
  AUTH_ACTION_TYPES.LOGOUT_REQUEST,
  async (forceLogout: boolean = false, { rejectWithValue }) => {
    try {
      // Perform secure logout
      await logout(forceLogout);

      // Log logout event
      await logSecurityEvent({
        type: 'LOGOUT',
        metadata: {
          forced: forceLogout,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Log logout failure
      await logSecurityEvent({
        type: 'LOGOUT_FAILURE',
        metadata: {
          reason: error.message,
          timestamp: new Date().toISOString()
        }
      });

      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for token refresh with rotation security
 * Implements secure token refresh with comprehensive error handling
 */
export const refreshTokenRequest = createAsyncThunk<
  TokenPair,
  string,
  { rejectValue: string }
>(
  AUTH_ACTION_TYPES.REFRESH_TOKEN_REQUEST,
  async (currentRefreshToken: string, { rejectWithValue }) => {
    try {
      // Attempt token refresh
      const newTokens = await refreshToken(currentRefreshToken);

      // Log successful token refresh
      await logSecurityEvent({
        type: 'TOKEN_REFRESH',
        metadata: {
          timestamp: new Date().toISOString(),
          tokenExpiry: new Date(newTokens.accessTokenExpires).toISOString()
        }
      });

      return newTokens;
    } catch (error) {
      // Log token refresh failure
      await logSecurityEvent({
        type: 'TOKEN_REFRESH_FAILURE',
        metadata: {
          reason: error.message,
          timestamp: new Date().toISOString()
        }
      });

      return rejectWithValue(error.message);
    }
  }
);

/**
 * Action creator for setting authentication errors
 */
export const setAuthError = createAction<string>(
  AUTH_ACTION_TYPES.SET_AUTH_ERROR
);

/**
 * Action creator for clearing authentication errors
 */
export const clearAuthError = createAction(
  AUTH_ACTION_TYPES.CLEAR_AUTH_ERROR
);

/**
 * Action creator for updating session information
 */
export const updateSession = createAction<{
  expiresAt: number;
  lastActivity: number;
}>(AUTH_ACTION_TYPES.UPDATE_SESSION);

// Export action types for reducer consumption
export type AuthActionTypes = typeof AUTH_ACTION_TYPES;