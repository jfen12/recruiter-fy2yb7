// axios version ^1.4.0
import axios from 'axios';
import { API_CONSTANTS } from './constants';

/**
 * Interface defining the structure of all API endpoints
 */
interface ApiEndpoints {
  AUTH: {
    LOGIN: string;
    LOGOUT: string;
    REFRESH: string;
    RESET_PASSWORD: string;
    MFA: string;
  };
  CANDIDATES: {
    BASE: string;
    SEARCH: string;
    SKILLS: string;
    DOCUMENTS: string;
    PROFILE: string;
    HISTORY: string;
  };
  REQUISITIONS: {
    BASE: string;
    SEARCH: string;
    MATCHING: string;
    PIPELINE: string;
    ANALYTICS: string;
    HISTORY: string;
  };
  CLIENTS: {
    BASE: string;
    SEARCH: string;
    COMMUNICATIONS: string;
    CONTRACTS: string;
    ANALYTICS: string;
  };
  ANALYTICS: {
    BASE: string;
    METRICS: string;
    REPORTS: string;
    PERFORMANCE: string;
    TRENDS: string;
    FORECASTS: string;
  };
}

/**
 * Interface defining API security configuration
 */
interface SecurityConfig {
  RATE_LIMIT: {
    MAX_REQUESTS: number;
    WINDOW_MS: number;
  };
  RETRY_STRATEGY: {
    ATTEMPTS: number;
    DELAY_MS: number;
    BACKOFF_FACTOR: number;
  };
  TIMEOUT: {
    REQUEST_MS: number;
    SOCKET_MS: number;
  };
}

// Base URL configuration with environment fallback
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

/**
 * API endpoints configuration following RESTful conventions
 */
const ENDPOINTS: ApiEndpoints = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    RESET_PASSWORD: '/auth/reset-password',
    MFA: '/auth/mfa'
  },
  CANDIDATES: {
    BASE: '/candidates',
    SEARCH: '/candidates/search',
    SKILLS: '/candidates/skills',
    DOCUMENTS: '/candidates/documents',
    PROFILE: '/candidates/profile',
    HISTORY: '/candidates/history'
  },
  REQUISITIONS: {
    BASE: '/requisitions',
    SEARCH: '/requisitions/search',
    MATCHING: '/requisitions/matching',
    PIPELINE: '/requisitions/pipeline',
    ANALYTICS: '/requisitions/analytics',
    HISTORY: '/requisitions/history'
  },
  CLIENTS: {
    BASE: '/clients',
    SEARCH: '/clients/search',
    COMMUNICATIONS: '/clients/communications',
    CONTRACTS: '/clients/contracts',
    ANALYTICS: '/clients/analytics'
  },
  ANALYTICS: {
    BASE: '/analytics',
    METRICS: '/analytics/metrics',
    REPORTS: '/analytics/reports',
    PERFORMANCE: '/analytics/performance',
    TRENDS: '/analytics/trends',
    FORECASTS: '/analytics/forecasts'
  }
};

/**
 * Security configuration for API requests
 */
const SECURITY_CONFIG: SecurityConfig = {
  RATE_LIMIT: {
    MAX_REQUESTS: 1000,
    WINDOW_MS: 60000 // 1 minute
  },
  RETRY_STRATEGY: {
    ATTEMPTS: API_CONSTANTS.RETRY_ATTEMPTS,
    DELAY_MS: 1000,
    BACKOFF_FACTOR: 2
  },
  TIMEOUT: {
    REQUEST_MS: API_CONSTANTS.TIMEOUT_DURATION,
    SOCKET_MS: API_CONSTANTS.TIMEOUT_DURATION * 1.5
  }
};

/**
 * Axios instance configuration with default settings
 */
const axiosConfig = {
  baseURL: BASE_URL,
  timeout: SECURITY_CONFIG.TIMEOUT.REQUEST_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': process.env.API_KEY
  },
  validateStatus: (status: number) => status >= 200 && status < 300
};

/**
 * Main API configuration object exported for application use
 */
export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: SECURITY_CONFIG.TIMEOUT.REQUEST_MS,
  RETRY_ATTEMPTS: SECURITY_CONFIG.RETRY_STRATEGY.ATTEMPTS,
  ENDPOINTS,
  SECURITY: SECURITY_CONFIG,
  axiosInstance: axios.create(axiosConfig),
  /**
   * Environment-specific configurations
   */
  ENV_CONFIG: {
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    ENABLE_LOGGING: process.env.NODE_ENV !== 'production',
    CACHE_DURATION: API_CONSTANTS.CACHE_DURATION
  }
};

/**
 * Request interceptor for authentication and request preprocessing
 */
API_CONFIG.axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor for error handling and response processing
 */
API_CONFIG.axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${BASE_URL}${ENDPOINTS.AUTH.REFRESH}`, {
          refreshToken
        });
        
        const { token } = response.data;
        localStorage.setItem('auth_token', token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        return API_CONFIG.axiosInstance(originalRequest);
      } catch (refreshError) {
        // Handle refresh token failure
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default API_CONFIG;