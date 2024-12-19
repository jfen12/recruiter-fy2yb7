/**
 * @fileoverview Enhanced authentication hook for RefactorTrack web application
 * Implements secure authentication state management with comprehensive security monitoring,
 * session validation, and threat detection following enterprise security standards.
 * @version 1.0.0
 */

// External imports with versions
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.1
import { useCallback, useEffect, useRef } from 'react'; // ^18.2.0
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0

// Internal imports
import { 
  User, 
  LoginCredentials, 
  AuthResponse, 
  AuthState, 
  SecurityConfig, 
  TokenMetadata 
} from '../interfaces/auth.interface';
import { 
  loginRequest, 
  loginSuccess, 
  loginFailure, 
  logoutRequest, 
  refreshTokenRequest, 
  securityAlert 
} from '../store/actions/authActions';

// Constants
const SESSION_CHECK_INTERVAL = 30000; // 30 seconds
const TOKEN_REFRESH_BUFFER = 300000; // 5 minutes
const SECURITY_EVENT_TYPES = {
  SUSPICIOUS_LOGIN: 'SUSPICIOUS_LOGIN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  CONCURRENT_LOGIN: 'CONCURRENT_LOGIN',
  TOKEN_COMPROMISED: 'TOKEN_COMPROMISED'
} as const;

/**
 * Enhanced authentication hook providing secure authentication state management
 * and comprehensive security monitoring
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const auth0Client = useRef<Auth0Client | null>(null);
  
  // Select auth state from Redux store
  const authState = useSelector((state: { auth: AuthState }) => state.auth);
  
  // Security monitoring references
  const securityCheckInterval = useRef<NodeJS.Timeout>();
  const tokenRefreshTimeout = useRef<NodeJS.Timeout>();
  const deviceFingerprint = useRef<string>();

  /**
   * Initializes Auth0 client with security configuration
   */
  useEffect(() => {
    const initAuth0 = async () => {
      auth0Client.current = new Auth0Client({
        domain: process.env.REACT_APP_AUTH0_DOMAIN!,
        clientId: process.env.REACT_APP_AUTH0_CLIENT_ID!,
        cacheLocation: 'memory',
        useRefreshTokens: true,
        scope: 'openid profile email'
      });
    };
    
    initAuth0();
    return () => {
      clearInterval(securityCheckInterval.current);
      clearTimeout(tokenRefreshTimeout.current);
    };
  }, []);

  /**
   * Handles secure user login with enhanced security checks
   * @param credentials User login credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Generate device fingerprint
      deviceFingerprint.current = await generateDeviceFingerprint();
      
      // Dispatch login request with security context
      const response = await dispatch(loginRequest({
        ...credentials,
        securityContext: {
          deviceFingerprint: deviceFingerprint.current,
          timestamp: new Date().toISOString(),
          geoLocation: await getCurrentLocation(),
          userAgent: navigator.userAgent
        }
      })).unwrap();

      // Set up security monitoring
      initializeSecurityMonitoring(response);
      
      // Schedule token refresh
      scheduleTokenRefresh(response.tokens.accessTokenExpires);
      
    } catch (error) {
      console.error('Login failed:', error);
      dispatch(loginFailure(error.message));
      dispatch(securityAlert({
        type: SECURITY_EVENT_TYPES.SUSPICIOUS_LOGIN,
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
          deviceFingerprint: deviceFingerprint.current
        }
      }));
    }
  }, [dispatch]);

  /**
   * Validates current session security and integrity
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      if (!authState.isAuthenticated || !authState.tokens) {
        return false;
      }

      // Verify device fingerprint
      const currentFingerprint = await generateDeviceFingerprint();
      if (currentFingerprint !== deviceFingerprint.current) {
        dispatch(securityAlert({
          type: SECURITY_EVENT_TYPES.TOKEN_COMPROMISED,
          details: { reason: 'Device fingerprint mismatch' }
        }));
        await logout();
        return false;
      }

      // Check session expiration
      if (Date.now() >= (authState.sessionExpiresAt || 0)) {
        dispatch(securityAlert({
          type: SECURITY_EVENT_TYPES.SESSION_EXPIRED,
          details: { timestamp: new Date().toISOString() }
        }));
        await logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }, [authState, dispatch]);

  /**
   * Handles secure token rotation and refresh
   */
  const handleTokenRotation = useCallback(async () => {
    try {
      if (!authState.tokens?.refreshToken) {
        return;
      }

      const newTokens = await dispatch(refreshTokenRequest(
        authState.tokens.refreshToken
      )).unwrap();

      // Update security context with new tokens
      deviceFingerprint.current = await generateDeviceFingerprint();
      scheduleTokenRefresh(newTokens.accessTokenExpires);

    } catch (error) {
      console.error('Token rotation failed:', error);
      await logout();
    }
  }, [authState.tokens, dispatch]);

  /**
   * Initializes comprehensive security monitoring
   */
  const initializeSecurityMonitoring = useCallback((authResponse: AuthResponse) => {
    // Set up periodic session validation
    securityCheckInterval.current = setInterval(async () => {
      const isValid = await validateSession();
      if (!isValid) {
        dispatch(securityAlert({
          type: SECURITY_EVENT_TYPES.SESSION_EXPIRED,
          details: { timestamp: new Date().toISOString() }
        }));
      }
    }, SESSION_CHECK_INTERVAL);

    // Monitor for concurrent sessions
    window.addEventListener('storage', async (event) => {
      if (event.key === 'auth_token' && event.newValue !== event.oldValue) {
        dispatch(securityAlert({
          type: SECURITY_EVENT_TYPES.CONCURRENT_LOGIN,
          details: { timestamp: new Date().toISOString() }
        }));
        await logout();
      }
    });
  }, [dispatch]);

  /**
   * Schedules token refresh before expiration
   */
  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    const refreshTime = expiresAt - Date.now() - TOKEN_REFRESH_BUFFER;
    if (refreshTime > 0) {
      tokenRefreshTimeout.current = setTimeout(
        handleTokenRotation,
        refreshTime
      );
    }
  }, [handleTokenRotation]);

  /**
   * Handles secure logout with cleanup
   */
  const logout = useCallback(async () => {
    try {
      await dispatch(logoutRequest());
      clearInterval(securityCheckInterval.current);
      clearTimeout(tokenRefreshTimeout.current);
      deviceFingerprint.current = undefined;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [dispatch]);

  /**
   * Generates secure device fingerprint
   */
  const generateDeviceFingerprint = async (): Promise<string> => {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.colorDepth,
      navigator.hardwareConcurrency,
      navigator.deviceMemory
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  /**
   * Gets current geolocation for security context
   */
  const getCurrentLocation = async (): Promise<GeolocationCoordinates | null> => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      return position.coords;
    } catch {
      return null;
    }
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    login,
    logout,
    validateSession,
    securityStatus: {
      sessionValid: authState.isAuthenticated && !!authState.tokens,
      mfaEnabled: authState.user?.mfaEnabled ?? false,
      lastActivity: authState.sessionExpiresAt,
      deviceTrusted: !!deviceFingerprint.current
    }
  };
};

export default useAuth;