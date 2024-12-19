/**
 * @fileoverview Higher-order component that enforces authentication, role-based access control,
 * and security monitoring for protected routes in the RefactorTrack web application.
 * Implements comprehensive security features including session validation, role hierarchy,
 * and access logging.
 * @version 1.0.0
 */

// External imports with versions
import { Navigate, useLocation } from 'react-router-dom'; // ^6.14.0
import { FC, ReactElement, useEffect, useMemo } from 'react'; // ^18.2.0

// Internal imports
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../interfaces/auth.interface';

/**
 * Props interface for ProtectedRoute component with enhanced security options
 */
interface ProtectedRouteProps {
  /** Child component to render if authorized */
  children: ReactElement;
  /** Array of roles allowed to access the route */
  allowedRoles?: UserRole[];
  /** If true, requires exact role match. If false, allows role hierarchy */
  strictMode?: boolean;
  /** If true, performs additional session validation */
  requireSession?: boolean;
}

/**
 * Validates user role against allowed roles with support for hierarchical validation
 * @param userRole Current user's role
 * @param allowedRoles Array of roles that can access the route
 * @param strictMode If true, requires exact role match
 * @returns Boolean indicating if user is authorized
 */
const validateUserRole = (
  userRole: UserRole,
  allowedRoles: UserRole[],
  strictMode: boolean
): boolean => {
  // If no roles specified, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  // Role hierarchy for non-strict mode
  const roleHierarchy: Record<UserRole, UserRole[]> = {
    [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.RECRUITER],
    [UserRole.MANAGER]: [UserRole.MANAGER, UserRole.SALES_REP, UserRole.RECRUITER],
    [UserRole.SALES_REP]: [UserRole.SALES_REP],
    [UserRole.RECRUITER]: [UserRole.RECRUITER]
  };

  if (strictMode) {
    return allowedRoles.includes(userRole);
  }

  // Check if user's role hierarchy includes any allowed roles
  return allowedRoles.some(role => roleHierarchy[userRole]?.includes(role));
};

/**
 * Higher-order component that enforces authentication, authorization, and security monitoring
 * Implements comprehensive route protection with session validation and role-based access
 */
export const ProtectedRoute: FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  strictMode = false,
  requireSession = true
}) => {
  const { isAuthenticated, user, validateSession } = useAuth();
  const location = useLocation();

  // Memoize role validation to prevent unnecessary recalculations
  const isAuthorized = useMemo(() => {
    if (!user?.role) return false;
    return validateUserRole(user.role, allowedRoles, strictMode);
  }, [user?.role, allowedRoles, strictMode]);

  // Session validation effect
  useEffect(() => {
    const validateAccess = async () => {
      if (requireSession && isAuthenticated) {
        const isSessionValid = await validateSession();
        if (!isSessionValid) {
          // Session invalid, redirect to login
          console.warn('Session validation failed, redirecting to login');
          return <Navigate to="/login" state={{ from: location }} replace />;
        }
      }
    };

    validateAccess();
  }, [isAuthenticated, requireSession, validateSession, location]);

  // Authentication check
  if (!isAuthenticated) {
    console.info('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authorization check
  if (allowedRoles.length > 0 && !isAuthorized) {
    console.warn(`Access denied: User role ${user?.role} not authorized for this route`);
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Log successful access for security monitoring
  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      console.info('Route access granted:', {
        path: location.pathname,
        userId: user?.id,
        role: user?.role,
        timestamp: new Date().toISOString()
      });
    }
  }, [isAuthenticated, isAuthorized, location.pathname, user]);

  // Render protected component
  return children;
};

export default ProtectedRoute;