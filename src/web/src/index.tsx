/**
 * @fileoverview Entry point for the RefactorTrack web application.
 * Implements Material Design 3.0 principles with enhanced accessibility,
 * theme support, and comprehensive error handling.
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { createRoot } from 'react-dom/client'; // v18.2.0
import { Provider } from 'react-redux'; // v8.1.1
import { ThemeProvider } from '@mui/material/styles'; // v5.14.0
import CssBaseline from '@mui/material/CssBaseline'; // v5.14.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0

// Internal imports
import App from './App';
import store from './store/store';
import GlobalStyles from './styles/global';
import useTheme from './hooks/useTheme';
import { showNotification } from './components/common/Notification';

// Browser support configuration
const BROWSER_SUPPORT = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90
};

/**
 * Root theme provider component with system preference detection
 */
const ThemedApp: React.FC = () => {
  const { theme, isDarkMode } = useTheme();

  // Update document theme attribute for proper styling
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <App />
    </ThemeProvider>
  );
};

/**
 * Error fallback component with accessibility support
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Application Error</h2>
    <pre style={{ margin: '10px 0' }}>{error.message}</pre>
    <button
      onClick={() => window.location.reload()}
      style={{ padding: '8px 16px' }}
    >
      Reload Application
    </button>
  </div>
);

/**
 * Initializes and renders the React application with all necessary providers
 */
const renderApp = () => {
  // Get root element with null check
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find root element');
  }

  // Create React 18 root
  const root = createRoot(rootElement);

  // Set up error monitoring
  const handleError = (error: Error) => {
    console.error('Application error:', error);
    showNotification({
      message: 'An unexpected error occurred. Please try again.',
      type: 'error',
      duration: 5000,
      autoHide: false
    });
  };

  // Check browser compatibility
  const userAgent = navigator.userAgent.toLowerCase();
  const isSupported = Object.entries(BROWSER_SUPPORT).some(([browser, version]) => {
    const match = new RegExp(`${browser}\\/(\\d+)`).exec(userAgent);
    return match && parseInt(match[1]) >= version;
  });

  if (!isSupported) {
    console.warn('Browser version not fully supported');
  }

  // Render application with providers and error boundary
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={handleError}
        onReset={() => window.location.reload()}
      >
        <Provider store={store}>
          <ThemedApp />
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Log successful initialization
  console.info('Application initialized successfully');
};

// Initialize application
renderApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}

// Export for testing purposes
export { renderApp };