/**
 * @fileoverview Redux reducer for authentication state management in RefactorTrack
 * Implements secure token lifecycle management, session validation, and security monitoring
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  AuthState, 
  User, 
  TokenPair, 
  ApiError, 
  SecurityEvent 
} from '../../interfaces/auth.interface';
import { 
  loginRequest, 
  logoutRequest, 
  refreshTokenRequest,
  securityEventLogger 
} from '../actions/authActions';

/**
 * Initial authentication state with secure defaults
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  error: null,
  mfaPending: false,
  sessionExpiresAt: null,
  lastActivity: null,
  securityEvents: []
};

/**
 * Authentication reducer slice with comprehensive security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Updates user data with security event logging
     */
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.lastActivity = Date.now();
      state.securityEvents.push({
        type: 'USER_UPDATE',
        timestamp: new Date().toISOString(),
        metadata: {
          userId: action.payload.id,
          role: action.payload.role
        }
      });
    },

    /**
     * Updates authentication tokens with rotation validation
     */
    setTokens: (state, action: PayloadAction<TokenPair>) => {
      // Validate token expiration times
      const now = Date.now();
      if (action.payload.accessTokenExpires <= now || 
          action.payload.refreshTokenExpires <= now) {
        state.error = {
          code: 'AUTH_ERROR',
          message: 'Invalid token expiration'
        };
        return;
      }

      state.tokens = action.payload;
      state.sessionExpiresAt = action.payload.accessTokenExpires;
      state.lastActivity = now;
      state.securityEvents.push({
        type: 'TOKEN_UPDATE',
        timestamp: new Date().toISOString(),
        metadata: {
          accessTokenExpiry: new Date(action.payload.accessTokenExpires).toISOString(),
          refreshTokenExpiry: new Date(action.payload.refreshTokenExpires).toISOString()
        }
      });
    },

    /**
     * Sets authentication error state
     */
    setError: (state, action: PayloadAction<ApiError>) => {
      state.error = action.payload;
      state.securityEvents.push({
        type: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
        metadata: {
          code: action.payload.code,
          message: action.payload.message
        }
      });
    },

    /**
     * Clears authentication error state
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Updates session timeout information
     */
    updateSessionTimeout: (state) => {
      state.lastActivity = Date.now();
    },

    /**
     * Logs security events with metadata
     */
    logSecurityEvent: (state, action: PayloadAction<SecurityEvent>) => {
      state.securityEvents.push({
        ...action.payload,
        timestamp: new Date().toISOString()
      });

      // Maintain a rolling window of security events (last 100)
      if (state.securityEvents.length > 100) {
        state.securityEvents = state.securityEvents.slice(-100);
      }
    }
  },
  extraReducers: (builder) => {
    // Login request handling
    builder.addCase(loginRequest.pending, (state) => {
      state.error = null;
      state.mfaPending = false;
    });
    builder.addCase(loginRequest.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.mfaPending = action.payload.mfaRequired;
      state.sessionExpiresAt = action.payload.tokens.accessTokenExpires;
      state.lastActivity = Date.now();
      state.error = null;
    });
    builder.addCase(loginRequest.rejected, (state, action) => {
      state.error = {
        code: 'AUTH_ERROR',
        message: action.payload || 'Authentication failed'
      };
      state.isAuthenticated = false;
      state.user = null;
      state.tokens = null;
    });

    // Logout request handling
    builder.addCase(logoutRequest.fulfilled, (state) => {
      Object.assign(state, initialState);
      state.securityEvents.push({
        type: 'LOGOUT',
        timestamp: new Date().toISOString(),
        metadata: {
          reason: 'User initiated'
        }
      });
    });

    // Token refresh handling
    builder.addCase(refreshTokenRequest.fulfilled, (state, action) => {
      state.tokens = action.payload;
      state.sessionExpiresAt = action.payload.accessTokenExpires;
      state.lastActivity = Date.now();
      state.securityEvents.push({
        type: 'TOKEN_REFRESH',
        timestamp: new Date().toISOString(),
        metadata: {
          newExpiry: new Date(action.payload.accessTokenExpires).toISOString()
        }
      });
    });
    builder.addCase(refreshTokenRequest.rejected, (state) => {
      Object.assign(state, initialState);
      state.securityEvents.push({
        type: 'TOKEN_REFRESH_FAILURE',
        timestamp: new Date().toISOString(),
        metadata: {
          reason: 'Refresh token expired or invalid'
        }
      });
    });
  }
});

// Export actions
export const { 
  setUser, 
  setTokens, 
  setError, 
  clearError, 
  updateSessionTimeout,
  logSecurityEvent 
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;

/**
 * Selector to check if current session is valid
 * @param state Current auth state
 * @returns boolean indicating session validity
 */
export const selectIsSessionValid = (state: AuthState): boolean => {
  if (!state.isAuthenticated || !state.sessionExpiresAt || !state.lastActivity) {
    return false;
  }

  const now = Date.now();
  const sessionValid = state.sessionExpiresAt > now;
  const activityValid = (now - state.lastActivity) < 1800000; // 30 minutes

  return sessionValid && activityValid;
};