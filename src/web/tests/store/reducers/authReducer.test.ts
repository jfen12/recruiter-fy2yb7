/**
 * @fileoverview Unit tests for authentication reducer
 * Tests authentication state management, token lifecycle, session management,
 * and security monitoring functionality
 * @version 1.0.0
 */

import { authReducer, authActions } from '../../../src/store/reducers/authReducer';
import { PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  AuthState, 
  User, 
  TokenPair, 
  UserRole, 
  SecurityEvent, 
  SessionConfig 
} from '../../../src/interfaces/auth.interface';

describe('authReducer', () => {
  // Initial state setup for each test
  let initialState: AuthState;

  beforeEach(() => {
    initialState = {
      isAuthenticated: false,
      user: null,
      tokens: null,
      error: null,
      mfaPending: false,
      sessionExpiresAt: null,
      lastActivity: null,
      securityEvents: []
    };
  });

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const state = authReducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });

    it('should have empty security events array', () => {
      const state = authReducer(undefined, { type: 'unknown' });
      expect(state.securityEvents).toHaveLength(0);
    });
  });

  describe('User Authentication Actions', () => {
    const mockUser: User = {
      id: 'test-user-123',
      email: 'recruiter@refactortrack.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.RECRUITER,
      lastLogin: new Date().toISOString(),
      preferences: { theme: 'light', notifications: true }
    };

    const mockTokens: TokenPair = {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      accessTokenExpires: Date.now() + 3600000, // 1 hour
      refreshTokenExpires: Date.now() + 604800000 // 7 days
    };

    it('should handle setUser action', () => {
      const state = authReducer(initialState, authActions.setUser(mockUser));
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.lastActivity).toBeDefined();
      expect(state.securityEvents).toHaveLength(1);
      expect(state.securityEvents[0].type).toBe('USER_UPDATE');
    });

    it('should handle setTokens action with valid tokens', () => {
      const state = authReducer(initialState, authActions.setTokens(mockTokens));
      expect(state.tokens).toEqual(mockTokens);
      expect(state.sessionExpiresAt).toBe(mockTokens.accessTokenExpires);
      expect(state.lastActivity).toBeDefined();
      expect(state.securityEvents).toHaveLength(1);
      expect(state.securityEvents[0].type).toBe('TOKEN_UPDATE');
    });

    it('should reject expired tokens in setTokens action', () => {
      const expiredTokens: TokenPair = {
        ...mockTokens,
        accessTokenExpires: Date.now() - 1000
      };
      const state = authReducer(initialState, authActions.setTokens(expiredTokens));
      expect(state.tokens).toBeNull();
      expect(state.error).toBeDefined();
      expect(state.error?.code).toBe('AUTH_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle setError action', () => {
      const error = {
        code: 'AUTH_ERROR',
        message: 'Invalid credentials'
      };
      const state = authReducer(initialState, authActions.setError(error));
      expect(state.error).toEqual(error);
      expect(state.securityEvents).toHaveLength(1);
      expect(state.securityEvents[0].type).toBe('AUTH_ERROR');
    });

    it('should handle clearError action', () => {
      const stateWithError = {
        ...initialState,
        error: { code: 'AUTH_ERROR', message: 'Test error' }
      };
      const state = authReducer(stateWithError, authActions.clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should handle session timeout updates', () => {
      const state = authReducer(initialState, authActions.updateSessionTimeout());
      expect(state.lastActivity).toBeDefined();
      expect(state.lastActivity).toBeLessThanOrEqual(Date.now());
    });

    it('should maintain session expiry after token refresh', () => {
      const newTokens: TokenPair = {
        ...mockTokens,
        accessTokenExpires: Date.now() + 7200000 // 2 hours
      };
      const state = authReducer(initialState, authActions.setTokens(newTokens));
      expect(state.sessionExpiresAt).toBe(newTokens.accessTokenExpires);
      expect(state.securityEvents).toHaveLength(1);
      expect(state.securityEvents[0].type).toBe('TOKEN_UPDATE');
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with metadata', () => {
      const securityEvent: SecurityEvent = {
        type: 'AUTH_ATTEMPT',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        userId: 'test-user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      };
      const state = authReducer(initialState, authActions.logSecurityEvent(securityEvent));
      expect(state.securityEvents).toHaveLength(1);
      expect(state.securityEvents[0]).toMatchObject(securityEvent);
    });

    it('should maintain maximum security events limit', () => {
      let state = initialState;
      // Add 101 events
      for (let i = 0; i < 101; i++) {
        state = authReducer(state, authActions.logSecurityEvent({
          type: 'TEST_EVENT',
          timestamp: new Date().toISOString(),
          metadata: { eventId: i }
        }));
      }
      expect(state.securityEvents).toHaveLength(100); // Maximum limit
      expect(state.securityEvents[99].metadata.eventId).toBe(100); // Latest event
    });
  });

  describe('Authentication Lifecycle', () => {
    it('should handle complete authentication flow', () => {
      let state = authReducer(initialState, authActions.setUser(mockUser));
      state = authReducer(state, authActions.setTokens(mockTokens));
      
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.sessionExpiresAt).toBeDefined();
      expect(state.lastActivity).toBeDefined();
      expect(state.securityEvents).toHaveLength(2); // User update + Token update
    });

    it('should handle logout and clear state', () => {
      // First set up an authenticated state
      let state = authReducer(initialState, authActions.setUser(mockUser));
      state = authReducer(state, authActions.setTokens(mockTokens));
      
      // Then clear authentication
      state = authReducer(state, { type: 'auth/logout/fulfilled' });
      
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.sessionExpiresAt).toBeNull();
      expect(state.securityEvents).toHaveLength(1); // Logout event
      expect(state.securityEvents[0].type).toBe('LOGOUT');
    });
  });
});