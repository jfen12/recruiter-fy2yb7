/**
 * @fileoverview Authentication utility functions for RefactorTrack web application
 * Implements secure token management, session validation, and role-based access control
 * with comprehensive security features and type safety.
 * @version 1.0.0
 */

import { User, TokenPair, UserRole, AuthResponse, AuthError } from '../interfaces/auth.interface';
import { API_CONFIG } from '../config/api';
import jwtDecode from 'jwt-decode'; // v3.1.2
import CryptoJS from 'crypto-js'; // v4.1.1

// Secure storage key for authentication data
const AUTH_STORAGE_KEY = 'auth_data_secure';

// Time buffer for token refresh (5 minutes)
const TOKEN_EXPIRY_BUFFER = 300000;

// Session idle timeout (30 minutes)
const SESSION_IDLE_TIMEOUT = 1800000;

// Refresh token expiry (7 days)
const REFRESH_TOKEN_EXPIRY = 604800000;

// Encryption key from environment variable
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';

/**
 * Custom event for authentication state changes
 */
const AUTH_STATE_CHANGE_EVENT = 'authStateChange';

/**
 * Interface for decoded JWT token payload
 */
interface JWTPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

/**
 * Securely stores encrypted authentication data
 * @param authData Authentication response data to store
 * @throws {Error} If encryption or validation fails
 */
export const setAuthData = async (authData: AuthResponse): Promise<void> => {
  try {
    // Validate auth data structure
    if (!authData.user || !authData.tokens) {
      throw new Error('Invalid authentication data structure');
    }

    // Validate token format and expiry
    const decodedToken = jwtDecode<JWTPayload>(authData.tokens.accessToken);
    if (!decodedToken.sub || !decodedToken.role) {
      throw new Error('Invalid token format');
    }

    // Encrypt sensitive data
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(authData),
      ENCRYPTION_KEY
    ).toString();

    // Store encrypted data
    localStorage.setItem(AUTH_STORAGE_KEY, encryptedData);

    // Set up token refresh timer
    const timeUntilRefresh = authData.tokens.accessTokenExpires - Date.now() - TOKEN_EXPIRY_BUFFER;
    setTimeout(() => refreshTokens(authData.tokens), Math.max(0, timeUntilRefresh));

    // Initialize session timeout
    initializeSessionTimeout();

    // Emit auth state change event
    window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGE_EVENT, { detail: { authenticated: true }}));
  } catch (error) {
    console.error('Error storing auth data:', error);
    throw error;
  }
};

/**
 * Retrieves and decrypts stored authentication data
 * @returns Decrypted authentication data or null if not found/invalid
 */
export const getAuthData = async (): Promise<AuthResponse | null> => {
  try {
    const encryptedData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!encryptedData) {
      return null;
    }

    // Decrypt data
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8)) as AuthResponse;

    // Validate token expiration
    if (Date.now() >= decryptedData.tokens.accessTokenExpires) {
      // Token expired, attempt refresh
      try {
        const newTokens = await refreshTokens(decryptedData.tokens);
        decryptedData.tokens = newTokens;
        await setAuthData(decryptedData);
      } catch (error) {
        // Refresh failed, clear auth data
        await clearAuthData();
        return null;
      }
    }

    return decryptedData;
  } catch (error) {
    console.error('Error retrieving auth data:', error);
    await clearAuthData();
    return null;
  }
};

/**
 * Handles secure token refresh
 * @param currentTokens Current token pair
 * @returns New token pair after successful refresh
 * @throws {Error} If refresh fails
 */
export const refreshTokens = async (currentTokens: TokenPair): Promise<TokenPair> => {
  try {
    // Validate refresh token
    if (Date.now() >= currentTokens.refreshTokenExpires) {
      throw new Error('Refresh token expired');
    }

    // Call refresh API endpoint
    const response = await API_CONFIG.axiosInstance.post(
      API_CONFIG.ENDPOINTS.AUTH.REFRESH,
      { refreshToken: currentTokens.refreshToken }
    );

    // Validate new tokens
    const newTokens = response.data.tokens as TokenPair;
    if (!newTokens.accessToken || !newTokens.refreshToken) {
      throw new Error('Invalid refresh response');
    }

    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await clearAuthData();
    throw error;
  }
};

/**
 * Validates current session state and handles timeouts
 * @returns Boolean indicating session validity
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const authData = await getAuthData();
    if (!authData) {
      return false;
    }

    // Check session idle timeout
    const lastActivity = localStorage.getItem('lastActivityTimestamp');
    if (lastActivity && Date.now() - parseInt(lastActivity) > SESSION_IDLE_TIMEOUT) {
      await clearAuthData();
      return false;
    }

    // Update last activity timestamp
    localStorage.setItem('lastActivityTimestamp', Date.now().toString());
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};

/**
 * Type-safe role validation with hierarchical permission check
 * @param requiredRole Required role for access
 * @param strict If true, requires exact role match
 * @returns Boolean indicating authorization status
 */
export const hasRole = async (requiredRole: UserRole, strict: boolean = false): Promise<boolean> => {
  try {
    const authData = await getAuthData();
    if (!authData?.user?.role) {
      return false;
    }

    if (strict) {
      return authData.user.role === requiredRole;
    }

    // Role hierarchy check
    const roleHierarchy = {
      [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.RECRUITER],
      [UserRole.MANAGER]: [UserRole.MANAGER, UserRole.SALES_REP, UserRole.RECRUITER],
      [UserRole.SALES_REP]: [UserRole.SALES_REP],
      [UserRole.RECRUITER]: [UserRole.RECRUITER]
    };

    return roleHierarchy[authData.user.role].includes(requiredRole);
  } catch (error) {
    console.error('Role validation failed:', error);
    return false;
  }
};

/**
 * Initializes session timeout monitoring
 */
const initializeSessionTimeout = (): void => {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    window.addEventListener(event, () => {
      localStorage.setItem('lastActivityTimestamp', Date.now().toString());
    });
  });
};

/**
 * Clears all authentication data securely
 */
const clearAuthData = async (): Promise<void> => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('lastActivityTimestamp');
  window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGE_EVENT, { detail: { authenticated: false }}));
};