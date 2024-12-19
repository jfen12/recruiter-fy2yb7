/**
 * @fileoverview Secure API client module for authentication operations in RefactorTrack
 * Implements OAuth 2.0 + JWT with MFA support, secure token management, and monitoring
 * @version 1.0.0
 */

// External imports - versions specified as per requirements
import axios, { AxiosError } from 'axios'; // ^1.4.0
import { z } from 'zod'; // ^3.21.4

// Internal imports
import { 
  LoginCredentials, 
  AuthResponse, 
  TokenPair, 
  MFAResponse, 
  AuthError 
} from '../interfaces/auth.interface';
import { API_CONFIG } from '../config/api';
import { 
  setAuthData, 
  clearAuthData, 
  isTokenExpired, 
  encryptToken, 
  decryptToken 
} from '../utils/auth';

// Constants for authentication operations
const AUTH_ENDPOINTS = API_CONFIG.ENDPOINTS.AUTH;
const SECURITY_CONFIG = API_CONFIG.SECURITY;

// Request cancellation tokens for concurrent auth operations
const loginCancelToken = axios.CancelToken.source();
const refreshCancelToken = axios.CancelToken.source();

// Login credentials validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  mfaCode: z.string().length(6, 'MFA code must be 6 digits').optional()
});

/**
 * Authenticates user with email/password and handles MFA if required
 * @param credentials User login credentials
 * @param mfaCode Optional MFA verification code
 * @returns Authentication response with user data and tokens
 * @throws AuthError for authentication failures
 */
export const login = async (
  credentials: LoginCredentials,
  mfaCode?: string
): Promise<AuthResponse> => {
  try {
    // Validate credentials
    loginSchema.parse({ ...credentials, mfaCode });

    // Initial login request
    const response = await API_CONFIG.axiosInstance.post(
      AUTH_ENDPOINTS.LOGIN,
      credentials,
      {
        cancelToken: loginCancelToken.token,
        timeout: SECURITY_CONFIG.TIMEOUT.REQUEST_MS
      }
    );

    // Handle MFA challenge if required
    if (response.data.mfaRequired && !mfaCode) {
      return response.data as MFAResponse;
    }

    // Complete authentication with MFA if provided
    if (mfaCode) {
      const mfaResponse = await API_CONFIG.axiosInstance.post(
        AUTH_ENDPOINTS.MFA,
        { mfaCode },
        {
          headers: { 'Authorization': `Bearer ${response.data.tokens.accessToken}` },
          cancelToken: loginCancelToken.token
        }
      );
      response.data = mfaResponse.data;
    }

    // Process successful authentication
    const authResponse = response.data as AuthResponse;
    await setAuthData(authResponse);

    return authResponse;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw new Error('Login request cancelled');
    }
    handleAuthError(error as AxiosError);
    throw error;
  }
};

/**
 * Securely logs out user and cleans up authentication state
 * @param forceLogout Whether to force immediate logout without server confirmation
 */
export const logout = async (forceLogout: boolean = false): Promise<void> => {
  try {
    if (!forceLogout) {
      await API_CONFIG.axiosInstance.post(AUTH_ENDPOINTS.LOGOUT);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Cancel any pending auth requests
    loginCancelToken.cancel();
    refreshCancelToken.cancel();
    
    // Clear authentication state
    await clearAuthData();
    
    // Force page reload for clean state
    if (forceLogout) {
      window.location.reload();
    }
  }
};

/**
 * Refreshes access token with exponential backoff retry
 * @param refreshToken Current refresh token
 * @returns New token pair
 * @throws AuthError for refresh failures
 */
export const refreshToken = async (refreshToken: string): Promise<TokenPair> => {
  let attempt = 0;
  const maxAttempts = SECURITY_CONFIG.RETRY_STRATEGY.ATTEMPTS;
  
  while (attempt < maxAttempts) {
    try {
      const delay = Math.pow(2, attempt) * SECURITY_CONFIG.RETRY_STRATEGY.DELAY_MS;
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await API_CONFIG.axiosInstance.post(
        AUTH_ENDPOINTS.REFRESH,
        { refreshToken },
        {
          cancelToken: refreshCancelToken.token,
          timeout: SECURITY_CONFIG.TIMEOUT.REQUEST_MS
        }
      );

      const newTokens = response.data as TokenPair;
      await setAuthData({ ...response.data, tokens: newTokens });
      return newTokens;
    } catch (error) {
      attempt++;
      if (attempt === maxAttempts || (error as AxiosError)?.response?.status === 401) {
        await logout(true);
        throw new Error('Token refresh failed');
      }
    }
  }
  throw new Error('Maximum refresh attempts exceeded');
};

/**
 * Initiates password reset process with rate limiting
 * @param email User's email address
 * @throws AuthError for reset request failures
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    // Validate email format
    z.string().email().parse(email);

    await API_CONFIG.axiosInstance.post(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      { email },
      {
        timeout: SECURITY_CONFIG.TIMEOUT.REQUEST_MS
      }
    );
  } catch (error) {
    handleAuthError(error as AxiosError);
    throw error;
  }
};

/**
 * Handles authentication errors with appropriate responses
 * @param error Axios error object
 * @throws AuthError with appropriate message
 */
const handleAuthError = (error: AxiosError): never => {
  const errorResponse = error.response?.data as AuthError;
  const errorMessage = errorResponse?.message || 'Authentication failed';
  
  // Log security events
  if (error.response?.status === 401 || error.response?.status === 403) {
    console.warn('Security event:', {
      type: 'AUTH_FAILURE',
      status: error.response.status,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  throw new Error(errorMessage);
};