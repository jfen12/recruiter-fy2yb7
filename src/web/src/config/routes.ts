/**
 * @fileoverview Central route configuration for RefactorTrack ATS web interface.
 * Implements secure routing with role-based access control, route transitions,
 * and performance optimizations following Material Design 3.0 principles.
 * @version 1.0.0
 */

import { RouteObject } from 'react-router-dom'; // ^6.0.0
import { motion } from 'framer-motion'; // ^6.0.0

// Component imports
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { UserRole } from '../interfaces/auth.interface';

/**
 * Interface for enhanced route configuration with metadata and security features
 */
interface AppRoute extends RouteObject {
  /** Allowed user roles for accessing the route */
  roles?: UserRole[];
  /** Route metadata for SEO and analytics */
  meta?: RouteMeta;
  /** Custom loading component */
  loader?: React.ComponentType;
}

/**
 * Interface for route metadata and SEO configuration
 */
interface RouteMeta {
  title: string;
  description: string;
  requiresAuth: boolean;
  cacheStrategy?: 'no-cache' | 'cache-first' | 'network-first';
}

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/register'
] as const;

/**
 * Default redirect path after successful authentication
 */
export const DEFAULT_REDIRECT = '/dashboard';

/**
 * Route transition animations following Material Design principles
 */
export const ROUTE_TRANSITIONS = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

/**
 * Creates a protected route with role-based access control
 * @param route Route configuration object
 * @returns Enhanced route object with security features
 */
const createProtectedRoute = (route: AppRoute): RouteObject => {
  const { element, roles, meta, ...rest } = route;

  return {
    ...rest,
    element: (
      <ProtectedRoute 
        allowedRoles={roles}
        requireSession={meta?.requiresAuth}
      >
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={ROUTE_TRANSITIONS}
        >
          {element}
        </motion.div>
      </ProtectedRoute>
    )
  };
};

/**
 * Main route configuration with role-based access control
 * and enhanced security features
 */
export const routes: RouteObject[] = [
  // Public routes
  {
    path: '/login',
    element: <Login />,
    meta: {
      title: 'Login - RefactorTrack',
      description: 'Secure login to RefactorTrack ATS',
      requiresAuth: false,
      cacheStrategy: 'no-cache'
    }
  },

  // Protected routes
  createProtectedRoute({
    path: '/dashboard',
    element: <Dashboard />,
    roles: [UserRole.RECRUITER, UserRole.SALES_REP, UserRole.ADMIN, UserRole.MANAGER],
    meta: {
      title: 'Dashboard - RefactorTrack',
      description: 'RefactorTrack recruitment analytics dashboard',
      requiresAuth: true,
      cacheStrategy: 'network-first'
    }
  }),

  // Recruiter-specific routes
  createProtectedRoute({
    path: '/candidates/*',
    roles: [UserRole.RECRUITER, UserRole.ADMIN],
    meta: {
      title: 'Candidate Management - RefactorTrack',
      description: 'Manage recruitment candidates',
      requiresAuth: true
    },
    lazy: () => import('../pages/candidates')
  }),

  // Sales rep routes
  createProtectedRoute({
    path: '/requisitions/*',
    roles: [UserRole.SALES_REP, UserRole.ADMIN],
    meta: {
      title: 'Job Requisitions - RefactorTrack',
      description: 'Manage job requisitions',
      requiresAuth: true
    },
    lazy: () => import('../pages/requisitions')
  }),

  // Admin routes
  createProtectedRoute({
    path: '/admin/*',
    roles: [UserRole.ADMIN],
    meta: {
      title: 'Admin Panel - RefactorTrack',
      description: 'System administration',
      requiresAuth: true,
      cacheStrategy: 'no-cache'
    },
    lazy: () => import('../pages/admin')
  }),

  // Manager routes
  createProtectedRoute({
    path: '/reports/*',
    roles: [UserRole.MANAGER, UserRole.ADMIN],
    meta: {
      title: 'Reports - RefactorTrack',
      description: 'Recruitment analytics and reporting',
      requiresAuth: true
    },
    lazy: () => import('../pages/reports')
  }),

  // Fallback route
  {
    path: '*',
    element: <Navigate to={DEFAULT_REDIRECT} replace />,
    meta: {
      title: 'Not Found - RefactorTrack',
      description: 'Page not found',
      requiresAuth: false
    }
  }
];

export default routes;