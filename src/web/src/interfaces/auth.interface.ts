/**
 * @fileoverview Authentication and authorization interfaces for RefactorTrack
 * Defines type-safe interfaces for user authentication, JWT token management,
 * and role-based access control with MFA support.
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.21.4
import { ApiError } from './common.interface';

/**
 * Enum defining available user roles in the system with corresponding
 * access levels as specified in the authorization matrix
 */
export enum UserRole {
  RECRUITER = 'RECRUITER',
  SALES_REP = 'SALES_REP',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER'
}

/**
 * Interface representing a user in the system with enhanced security features
 * including MFA and session management capabilities
 */
export interface User {
  /** Unique identifier (UUID format) */
  id: string;
  
  /** User's email address used for authentication */
  email: string;
  
  /** User's assigned role determining system access levels */
  role: UserRole;
  
  /** Timestamp of user's last successful login */
  lastLogin: Date;
  
  /** Indicates if Multi-Factor Authentication is enabled */
  mfaEnabled: boolean;
  
  /** Session timeout in minutes (default: 30) */
  sessionTimeout: number;
}

/**
 * Interface for login credentials with optional MFA support
 * Includes Zod schema for runtime validation
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  
  /** User's password (will be hashed before transmission) */
  password: string;
  
  /** Optional MFA verification code */
  mfaCode?: string;
}

/**
 * Zod schema for validating login credentials at runtime
 */
export const loginCredentialsSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  mfaCode: z.string().length(6, 'MFA code must be 6 digits').optional()
});

/**
 * Interface for JWT token pair with expiration timestamps
 * Implements the specified token management strategy
 */
export interface TokenPair {
  /** JWT access token (1-hour validity) */
  accessToken: string;
  
  /** JWT refresh token (7-day validity) */
  refreshToken: string;
  
  /** Access token expiration timestamp */
  accessTokenExpires: number;
  
  /** Refresh token expiration timestamp */
  refreshTokenExpires: number;
}

/**
 * Interface for successful authentication response
 * Includes user data, tokens, and MFA status
 */
export interface AuthResponse {
  /** Authenticated user information */
  user: User;
  
  /** JWT token pair for session management */
  tokens: TokenPair;
  
  /** Indicates if MFA verification is required */
  mfaRequired: boolean;
}

/**
 * Interface representing the authentication state in the Redux store
 * Manages session state and error handling
 */
export interface AuthState {
  /** Indicates if user is currently authenticated */
  isAuthenticated: boolean;
  
  /** Current user information (null if not authenticated) */
  user: User | null;
  
  /** Current token pair (null if not authenticated) */
  tokens: TokenPair | null;
  
  /** Authentication error information */
  error: ApiError | null;
  
  /** Indicates if MFA verification is pending */
  mfaPending: boolean;
  
  /** Session expiration timestamp */
  sessionExpiresAt: number | null;
}

/**
 * Type guard to check if a value is a valid UserRole
 * @param value The value to check
 * @returns boolean indicating if the value is a valid UserRole
 */
export const isUserRole = (value: unknown): value is UserRole => {
  return typeof value === 'string' && Object.values(UserRole).includes(value as UserRole);
};

/**
 * Type guard to check if a token pair is valid and not expired
 * @param tokens The token pair to validate
 * @returns boolean indicating if the tokens are valid and not expired
 */
export const isValidTokenPair = (tokens: TokenPair): boolean => {
  const now = Date.now();
  return (
    tokens.accessToken.length > 0 &&
    tokens.refreshToken.length > 0 &&
    tokens.accessTokenExpires > now &&
    tokens.refreshTokenExpires > now
  );
};