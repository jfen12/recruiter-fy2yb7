/// <reference types="vite/client" /> // @version ^4.4.0

/**
 * Type definitions for Vite environment variables used in RefactorTrack web application.
 * Provides comprehensive type safety for configuration across different deployment environments.
 */
interface ImportMetaEnv {
  /**
   * Base URL for the RefactorTrack API endpoints
   * @example 'https://api.refactortrack.com'
   */
  readonly VITE_API_URL: string;

  /**
   * Auth0 domain for authentication configuration
   * @example 'refactortrack.auth0.com'
   */
  readonly VITE_AUTH0_DOMAIN: string;

  /**
   * Auth0 client ID for application authentication
   * @example 'your-auth0-client-id'
   */
  readonly VITE_AUTH0_CLIENT_ID: string;

  /**
   * Auth0 API audience identifier
   * @example 'https://api.refactortrack.com'
   */
  readonly VITE_AUTH0_AUDIENCE: string;

  /**
   * Current deployment environment
   * Used for environment-specific configurations and feature flags
   */
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';

  /**
   * API request timeout in milliseconds
   * @default 30000
   */
  readonly VITE_API_TIMEOUT: number;

  /**
   * Flag to enable/disable analytics tracking
   * Typically disabled in development, enabled in staging/production
   */
  readonly VITE_ENABLE_ANALYTICS: boolean;
}

/**
 * Type augmentation for Vite's ImportMeta interface
 * Ensures type safety when accessing environment variables via import.meta.env
 */
interface ImportMeta {
  /**
   * Strongly-typed environment variables
   * @see ImportMetaEnv for available environment variables
   */
  readonly env: ImportMetaEnv;
}

/**
 * Ensures environment variables are treated as strings in development
 * This helps catch missing environment variables during development
 */
declare module '*.env' {
  const content: string;
  export default content;
}

// Export environment interface for use in other files
export type { ImportMetaEnv };