/**
 * @fileoverview Test suite for authentication action creators in RefactorTrack
 * Covers login flows, MFA, token management, session handling, and security events
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals'; // ^29.0.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  loginRequest, 
  logoutRequest, 
  refreshTokenRequest, 
  passwordResetRequest, 
  mfaChallengeRequest 
} from '../../../src/store/actions/authActions';
import { 
  LoginCredentials, 
  AuthResponse, 
  TokenPair, 
  User, 
  UserRole, 
  MFAChallenge, 
  SecurityEvent 
} from '../../../src/interfaces/auth.interface';
import { 
  login, 
  logout, 
  refreshToken, 
  resetPassword, 
  verifyMFA, 
  logSecurityEvent 
} from '../../../src/api/auth';
import { 
  validateToken, 
  checkSessionTimeout 
} from '../../../src/utils/auth';

// Mock API functions
jest.mock('../../../src/api/auth');
jest.mock('../../../src/utils/auth');

// Test data setup
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: UserRole.RECRUITER,
  lastLogin: new Date('2023-01-01T00:00:00.000Z'),
  mfaEnabled: true,
  sessionTimeout: 30
};

const mockTokens: TokenPair = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  accessTokenExpires: Date.now() + 3600000, // 1 hour
  refreshTokenExpires: Date.now() + 604800000 // 7 days
};

const mockMFAChallenge: MFAChallenge = {
  challengeId: 'mfa-challenge-id',
  type: 'TOTP',
  timestamp: new Date('2023-01-01T00:00:00.000Z')
};

const mockSecurityEvent: SecurityEvent = {
  type: 'AUTH_SUCCESS',
  userId: mockUser.id,
  timestamp: new Date('2023-01-01T00:00:00.000Z'),
  metadata: {
    mfaVerified: true,
    ipAddress: '127.0.0.1'
  }
};

describe('Auth Actions', () => {
  // Store setup for each test
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Configure test store
    store = configureStore({
      reducer: {
        auth: (state = {}, action) => state
      }
    });

    // Reset mock implementations
    (login as jest.Mock).mockReset();
    (verifyMFA as jest.Mock).mockReset();
    (logout as jest.Mock).mockReset();
    (refreshToken as jest.Mock).mockReset();
    (logSecurityEvent as jest.Mock).mockReset();
  });

  test('loginRequest - successful login with MFA', async () => {
    // Arrange
    const credentials: LoginCredentials = {
      email: mockUser.email,
      password: 'SecurePassword123!'
    };

    const mfaResponse = {
      mfaRequired: true,
      challenge: mockMFAChallenge
    };

    const authResponse: AuthResponse = {
      user: mockUser,
      tokens: mockTokens,
      mfaRequired: false
    };

    (login as jest.Mock).mockResolvedValueOnce(mfaResponse);
    (verifyMFA as jest.Mock).mockResolvedValueOnce(authResponse);
    (logSecurityEvent as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await store.dispatch(loginRequest(credentials));

    // Assert
    expect(login).toHaveBeenCalledWith(credentials);
    expect(verifyMFA).toHaveBeenCalledWith(mockMFAChallenge.challengeId, expect.any(String));
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'AUTH_SUCCESS',
      userId: mockUser.id
    }));
    expect(result.payload).toEqual(authResponse);
  });

  test('loginRequest - failed login attempt', async () => {
    // Arrange
    const credentials: LoginCredentials = {
      email: 'invalid@example.com',
      password: 'WrongPassword123!'
    };

    const error = new Error('Invalid credentials');
    (login as jest.Mock).mockRejectedValueOnce(error);
    (logSecurityEvent as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await store.dispatch(loginRequest(credentials));

    // Assert
    expect(login).toHaveBeenCalledWith(credentials);
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'AUTH_FAILURE'
    }));
    expect(result.payload).toBe(error.message);
  });

  test('refreshTokenRequest - successful token refresh', async () => {
    // Arrange
    const newTokens: TokenPair = {
      ...mockTokens,
      accessToken: 'new-access-token',
      accessTokenExpires: Date.now() + 3600000
    };

    (validateToken as jest.Mock).mockReturnValueOnce(false);
    (refreshToken as jest.Mock).mockResolvedValueOnce(newTokens);
    (logSecurityEvent as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await store.dispatch(refreshTokenRequest(mockTokens.refreshToken));

    // Assert
    expect(validateToken).toHaveBeenCalledWith(mockTokens.accessToken);
    expect(refreshToken).toHaveBeenCalledWith(mockTokens.refreshToken);
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TOKEN_REFRESH'
    }));
    expect(result.payload).toEqual(newTokens);
  });

  test('logoutRequest - successful logout', async () => {
    // Arrange
    (logout as jest.Mock).mockResolvedValueOnce(undefined);
    (logSecurityEvent as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await store.dispatch(logoutRequest());

    // Assert
    expect(logout).toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'LOGOUT'
    }));
    expect(result.payload).toBeUndefined();
  });

  test('session timeout handling', async () => {
    // Arrange
    (checkSessionTimeout as jest.Mock).mockReturnValueOnce(true);
    (logSecurityEvent as jest.Mock).mockResolvedValueOnce(undefined);
    (logout as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    await store.dispatch(loginRequest({
      email: mockUser.email,
      password: 'SecurePassword123!'
    }));

    // Assert
    expect(checkSessionTimeout).toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SESSION_TIMEOUT'
    }));
    expect(logout).toHaveBeenCalledWith(true);
  });

  test('MFA challenge verification', async () => {
    // Arrange
    const mfaCode = '123456';
    (verifyMFA as jest.Mock).mockResolvedValueOnce({
      success: true,
      user: mockUser,
      tokens: mockTokens
    });
    (logSecurityEvent as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await store.dispatch(mfaChallengeRequest({
      challengeId: mockMFAChallenge.challengeId,
      code: mfaCode
    }));

    // Assert
    expect(verifyMFA).toHaveBeenCalledWith(mockMFAChallenge.challengeId, mfaCode);
    expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'MFA_SUCCESS'
    }));
    expect(result.payload).toEqual(expect.objectContaining({
      success: true
    }));
  });
});