/**
 * @fileoverview Comprehensive test suite for useAuth hook
 * Tests authentication flows, security operations, and session management
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^8.1.1
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.6.0
import useAuth from '../../src/hooks/useAuth';
import { User, LoginCredentials, AuthResponse, SecurityConfig } from '../../src/interfaces/auth.interface';

// Mock Redux store
const mockStore = {
  getState: () => ({
    auth: {
      isAuthenticated: false,
      user: null,
      tokens: null,
      error: null,
      mfaPending: false,
      sessionExpiresAt: null
    }
  }),
  dispatch: jest.fn(),
  subscribe: jest.fn()
};

// Mock Auth0 client
const mockAuth0Client = {
  loginWithCredentials: jest.fn(),
  getTokenSilently: jest.fn(),
  logout: jest.fn()
};

// Mock security monitoring service
const mockSecurityMonitor = {
  logEvent: jest.fn(),
  checkThreatLevel: jest.fn(),
  validateDeviceFingerprint: jest.fn()
};

// Test data
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'RECRUITER',
  lastLogin: new Date(),
  mfaEnabled: true,
  sessionTimeout: 30
};

const mockLoginCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
  mfaCode: '123456'
};

const mockAuthResponse: AuthResponse = {
  user: mockUser,
  tokens: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpires: Date.now() + 3600000, // 1 hour
    refreshTokenExpires: Date.now() + 604800000 // 7 days
  },
  mfaRequired: true
};

describe('useAuth Hook', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    mockStore.dispatch.mockClear();
    mockSecurityMonitor.logEvent.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    test('should handle successful login with MFA', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      // Mock successful MFA validation
      mockAuth0Client.loginWithCredentials.mockResolvedValueOnce(mockAuthResponse);
      mockSecurityMonitor.validateDeviceFingerprint.mockResolvedValueOnce(true);

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/login',
          payload: expect.any(Object)
        })
      );

      expect(mockSecurityMonitor.logEvent).toHaveBeenCalledWith({
        type: 'AUTH_SUCCESS',
        userId: mockUser.id,
        metadata: expect.any(Object)
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    test('should handle failed login attempts', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      mockAuth0Client.loginWithCredentials.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(mockSecurityMonitor.logEvent).toHaveBeenCalledWith({
        type: 'AUTH_FAILURE',
        metadata: expect.any(Object)
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Session Management', () => {
    test('should handle session timeout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      // Setup authenticated session
      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      // Fast-forward past session timeout
      jest.advanceTimersByTime(1800000); // 30 minutes

      await act(async () => {
        await result.current.validateSession();
      });

      expect(mockSecurityMonitor.logEvent).toHaveBeenCalledWith({
        type: 'SESSION_EXPIRED',
        metadata: expect.any(Object)
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    test('should handle token refresh', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      // Setup authenticated session
      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      // Fast-forward to token refresh time
      jest.advanceTimersByTime(3300000); // 55 minutes

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/refreshToken',
          payload: expect.any(Object)
        })
      );
    });
  });

  describe('Security Features', () => {
    test('should detect concurrent sessions', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      // Simulate concurrent login
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token',
        newValue: 'different-token',
        oldValue: mockAuthResponse.tokens.accessToken
      });

      window.dispatchEvent(storageEvent);

      expect(mockSecurityMonitor.logEvent).toHaveBeenCalledWith({
        type: 'CONCURRENT_LOGIN',
        metadata: expect.any(Object)
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    test('should validate device fingerprint', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      mockSecurityMonitor.validateDeviceFingerprint.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.validateSession();
      });

      expect(mockSecurityMonitor.logEvent).toHaveBeenCalledWith({
        type: 'TOKEN_COMPROMISED',
        metadata: expect.any(Object)
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout Functionality', () => {
    test('should handle secure logout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/logout'
        })
      );

      expect(localStorage.getItem('auth_data_secure')).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    test('should handle forced logout', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      });

      await act(async () => {
        await result.current.logout(true);
      });

      expect(mockSecurityMonitor.logEvent).toHaveBeenCalledWith({
        type: 'FORCED_LOGOUT',
        metadata: expect.any(Object)
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});