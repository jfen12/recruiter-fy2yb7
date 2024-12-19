/**
 * @fileoverview Redux store configuration for RefactorTrack web application.
 * Implements robust state management with TypeScript support, middleware integration,
 * development tools, and performance monitoring.
 * @version 1.0.0
 */

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'; // ^1.9.5
import createSagaMiddleware from 'redux-saga'; // ^1.2.1
import { createLogger } from 'redux-logger'; // ^3.0.6

// Import root reducer and saga
import rootReducer, { RootState } from './reducers';
import rootSaga from './sagas';

// Constants for store configuration
const ENABLE_REDUX_LOGGER = process.env.NODE_ENV === 'development';
const ENABLE_REDUX_DEVTOOLS = process.env.NODE_ENV === 'development';

/**
 * Configures and creates the Redux store with middleware and development tools
 * @returns Configured Redux store instance
 */
const configureAppStore = () => {
  // Create and configure saga middleware with monitoring
  const sagaMiddleware = createSagaMiddleware({
    onError: (error: Error, { sagaStack }) => {
      console.error('Saga error:', error);
      console.error('Saga stack:', sagaStack);
    }
  });

  // Configure default middleware with customizations
  const middleware = getDefaultMiddleware({
    thunk: false, // Disable thunk as we're using sagas
    serializableCheck: {
      // Ignore certain paths for non-serializable values
      ignoredActions: ['auth/login/fulfilled', 'auth/refreshToken/fulfilled'],
      ignoredPaths: ['auth.tokens', 'auth.sessionExpiresAt']
    },
    immutableCheck: {
      // Ignore certain paths for immutability checks
      ignoredPaths: ['analytics.processingTime', 'candidates.documentUploadProgress']
    }
  }).concat(sagaMiddleware);

  // Add logger middleware in development
  if (ENABLE_REDUX_LOGGER) {
    middleware.push(
      createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
        diff: true,
        colors: {
          title: () => '#139BFE',
          prevState: () => '#9E9E9E',
          action: () => '#149945',
          nextState: () => '#A47104',
          error: () => '#FF0000'
        }
      })
    );
  }

  // Configure store with middleware and development tools
  const store = configureStore({
    reducer: rootReducer,
    middleware,
    devTools: ENABLE_REDUX_DEVTOOLS && {
      name: 'RefactorTrack',
      trace: true,
      traceLimit: 25,
      maxAge: 50
    },
    preloadedState: undefined,
    enhancers: []
  });

  // Run root saga with error handling
  try {
    sagaMiddleware.run(rootSaga);
  } catch (error) {
    console.error('Error running root saga:', error);
  }

  // Enable hot module replacement for reducers in development
  if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./reducers', () => {
      const newRootReducer = require('./reducers').default;
      store.replaceReducer(newRootReducer);
    });
  }

  return store;
};

// Create store instance
const store = configureAppStore();

// Export store types
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;

// Export configured store
export default store;