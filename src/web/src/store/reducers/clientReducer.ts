/**
 * @fileoverview Redux reducer for client management with enhanced state handling
 * Implements secure state updates, optimistic updates, and comprehensive error handling
 * @version 1.0.0
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit'; // v1.9.5
import { IClient, IClientListResponse, IClientError } from '../../interfaces/client.interface';
import { ClientActionTypes } from '../actions/clientActions';

/**
 * Interface defining the shape of the client state
 */
interface ClientState {
  /** Normalized client records for efficient lookups */
  clients: Record<string, IClient>;
  
  /** Currently selected client */
  selectedClient: IClient | null;
  
  /** Granular loading states for different operations */
  loadingStates: {
    fetchClients: boolean;
    createClient: boolean;
    updateClient: boolean;
    deleteClient: boolean;
    searchClients: boolean;
  };
  
  /** Detailed error states for different operations */
  errors: {
    fetchClients: IClientError | null;
    createClient: IClientError | null;
    updateClient: IClientError | null;
    deleteClient: IClientError | null;
    searchClients: IClientError | null;
  };
  
  /** Pagination state */
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
  
  /** Cache invalidation timestamp */
  lastUpdated: number;
  
  /** Temporary state for optimistic updates */
  optimisticUpdates: Record<string, IClient>;
}

/**
 * Initial state with proper type initialization
 */
const initialState: ClientState = {
  clients: {},
  selectedClient: null,
  loadingStates: {
    fetchClients: false,
    createClient: false,
    updateClient: false,
    deleteClient: false,
    searchClients: false
  },
  errors: {
    fetchClients: null,
    createClient: null,
    updateClient: null,
    deleteClient: null,
    searchClients: null
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 10
  },
  lastUpdated: 0,
  optimisticUpdates: {}
};

/**
 * Client reducer with comprehensive state management
 */
export const clientReducer = createReducer(initialState, (builder) => {
  builder
    // Fetch Clients
    .addCase(ClientActionTypes.FETCH_CLIENTS_REQUEST, (state) => {
      state.loadingStates.fetchClients = true;
      state.errors.fetchClients = null;
    })
    .addCase(ClientActionTypes.FETCH_CLIENTS_SUCCESS, (state, action: PayloadAction<IClientListResponse>) => {
      state.loadingStates.fetchClients = false;
      // Normalize clients data
      state.clients = action.payload.data.reduce((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {} as Record<string, IClient>);
      state.pagination = {
        total: action.payload.total,
        page: action.payload.page,
        limit: action.payload.pageSize
      };
      state.lastUpdated = Date.now();
    })
    .addCase(ClientActionTypes.FETCH_CLIENTS_FAILURE, (state, action: PayloadAction<IClientError>) => {
      state.loadingStates.fetchClients = false;
      state.errors.fetchClients = action.payload;
    })

    // Create Client
    .addCase(ClientActionTypes.CREATE_CLIENT_REQUEST, (state) => {
      state.loadingStates.createClient = true;
      state.errors.createClient = null;
    })
    .addCase(ClientActionTypes.CREATE_CLIENT_SUCCESS, (state, action: PayloadAction<IClient>) => {
      state.loadingStates.createClient = false;
      state.clients[action.payload.id] = action.payload;
      state.pagination.total += 1;
      state.lastUpdated = Date.now();
    })
    .addCase(ClientActionTypes.CREATE_CLIENT_FAILURE, (state, action: PayloadAction<IClientError>) => {
      state.loadingStates.createClient = false;
      state.errors.createClient = action.payload;
    })

    // Update Client (with optimistic updates)
    .addCase(ClientActionTypes.UPDATE_CLIENT_OPTIMISTIC, (state, action: PayloadAction<IClient>) => {
      const { id } = action.payload;
      // Store original state for rollback
      state.optimisticUpdates[id] = state.clients[id];
      // Apply optimistic update
      state.clients[id] = action.payload;
    })
    .addCase(ClientActionTypes.UPDATE_CLIENT_SUCCESS, (state, action: PayloadAction<IClient>) => {
      const { id } = action.payload;
      state.loadingStates.updateClient = false;
      state.clients[id] = action.payload;
      // Clear optimistic update
      delete state.optimisticUpdates[id];
      state.lastUpdated = Date.now();
    })
    .addCase(ClientActionTypes.UPDATE_CLIENT_FAILURE, (state, action: PayloadAction<{ error: IClientError; clientId: string }>) => {
      const { error, clientId } = action.payload;
      state.loadingStates.updateClient = false;
      state.errors.updateClient = error;
      // Rollback optimistic update
      if (state.optimisticUpdates[clientId]) {
        state.clients[clientId] = state.optimisticUpdates[clientId];
        delete state.optimisticUpdates[clientId];
      }
    })

    // Delete Client
    .addCase(ClientActionTypes.DELETE_CLIENT_SUCCESS, (state, action: PayloadAction<string>) => {
      const clientId = action.payload;
      delete state.clients[clientId];
      state.pagination.total -= 1;
      state.lastUpdated = Date.now();
      if (state.selectedClient?.id === clientId) {
        state.selectedClient = null;
      }
    });
});

export default clientReducer;