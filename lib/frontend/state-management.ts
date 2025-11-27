/**
 * State Management - Patterns for managing application state
 */

export type StateLibrary = "zustand" | "redux" | "context" | "jotai" | "recoil";

export interface StoreSpec {
  name: string;
  type: "global" | "feature" | "local";
  state: StateField[];
  actions: Action[];
  selectors?: Selector[];
}

export interface StateField {
  name: string;
  type: string;
  initial: any;
  description: string;
}

export interface Action {
  name: string;
  params?: Param[];
  description: string;
  implementation?: string;
}

export interface Param {
  name: string;
  type: string;
}

export interface Selector {
  name: string;
  returns: string;
  description: string;
}

/**
 * Generate Zustand store (Recommended for most projects)
 */
export function generateZustandStore(spec: StoreSpec): string {
  return `/**
 * ${spec.name} Store
 * ${spec.type.charAt(0).toUpperCase() + spec.type.slice(1)} state management with Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// State interface
interface ${capitalize(spec.name)}State {
  // State fields
${spec.state.map(field => `  /** ${field.description} */\n  ${field.name}: ${field.type};`).join('\n')}

  // Actions
${spec.actions.map(action => `  /** ${action.description} */\n  ${action.name}: (${generateParams(action.params)}) => void;`).join('\n')}
}

// Initial state
const initialState = {
${spec.state.map(field => `  ${field.name}: ${JSON.stringify(field.initial)},`).join('\n')}
};

// Create store
export const use${capitalize(spec.name)}Store = create<${capitalize(spec.name)}State>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

${spec.actions.map(action => generateZustandAction(action, spec.name)).join('\n\n')}
      }),
      {
        name: '${spec.name}-storage', // Storage key
        partialize: (state) => ({ // Only persist specific fields
${spec.state.filter(f => f.name !== 'loading' && f.name !== 'error').map(f => `          ${f.name}: state.${f.name},`).join('\n')}
        }),
      }
    ),
    { name: '${capitalize(spec.name)}Store' }
  )
);

// Selectors (optional - for derived state)
${spec.selectors ? spec.selectors.map(sel => generateZustandSelector(sel, spec.name)).join('\n\n') : ''}

// Reset store
export const reset${capitalize(spec.name)}Store = () => {
  use${capitalize(spec.name)}Store.setState(initialState);
};
`;
}

function generateZustandAction(action: Action, storeName: string): string {
  const params = generateParams(action.params);

  if (action.implementation) {
    return `        ${action.name}: (${params}) => {
          ${action.implementation}
        },`;
  }

  // Generate basic implementation
  if (action.name.startsWith('set')) {
    const fieldName = action.name.replace('set', '').toLowerCase();
    return `        ${action.name}: (${params}) => set({ ${fieldName}: ${action.params?.[0]?.name || 'value'} }),`;
  }

  return `        ${action.name}: (${params}) => {
          // TODO: Implement ${action.name}
          console.log('${action.name} called with:', ${action.params?.map(p => p.name).join(', ') || ''});
        },`;
}

function generateZustandSelector(selector: Selector, storeName: string): string {
  return `// Selector: ${selector.description}
export const use${capitalize(selector.name)} = () => {
  return use${capitalize(storeName)}Store((state) => {
    // TODO: Implement selector logic
    return state; // Return derived value
  });
};`;
}

/**
 * Generate Redux Toolkit store (For complex apps with lots of features)
 */
export function generateReduxStore(spec: StoreSpec): string {
  return `/**
 * ${spec.name} Slice
 * Redux Toolkit slice for ${spec.type} state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// State interface
interface ${capitalize(spec.name)}State {
${spec.state.map(field => `  /** ${field.description} */\n  ${field.name}: ${field.type};`).join('\n')}
}

// Initial state
const initialState: ${capitalize(spec.name)}State = {
${spec.state.map(field => `  ${field.name}: ${JSON.stringify(field.initial)},`).join('\n')}
};

// Slice
export const ${spec.name}Slice = createSlice({
  name: '${spec.name}',
  initialState,
  reducers: {
${spec.actions.map(action => generateReduxReducer(action)).join('\n')}
  },
});

// Export actions
export const {
${spec.actions.map(action => `  ${action.name},`).join('\n')}
} = ${spec.name}Slice.actions;

// Selectors
${spec.selectors ? spec.selectors.map(sel => generateReduxSelector(sel, spec.name)).join('\n') : generateDefaultSelectors(spec)}

export default ${spec.name}Slice.reducer;
`;
}

function generateReduxReducer(action: Action): string {
  const hasParams = action.params && action.params.length > 0;

  if (action.name.startsWith('set')) {
    const fieldName = action.name.replace('set', '').toLowerCase();
    return `    ${action.name}: (state, action: PayloadAction<${action.params?.[0]?.type || 'any'}>) => {
      state.${fieldName} = action.payload;
    },`;
  }

  return `    ${action.name}: (state${hasParams ? `, action: PayloadAction<{ ${action.params!.map(p => `${p.name}: ${p.type}`).join('; ')} }>` : ''}) => {
      // TODO: Implement ${action.name}
    },`;
}

function generateReduxSelector(selector: Selector, storeName: string): string {
  return `export const select${capitalize(selector.name)} = (state: RootState) => state.${storeName};`;
}

function generateDefaultSelectors(spec: StoreSpec): string {
  return spec.state.map(field =>
    `export const select${capitalize(field.name)} = (state: RootState) => state.${spec.name}.${field.name};`
  ).join('\n');
}

/**
 * Generate React Context (For simple, component-scoped state)
 */
export function generateContextStore(spec: StoreSpec): string {
  return `/**
 * ${spec.name} Context
 * React Context for ${spec.type} state management
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// State interface
interface ${capitalize(spec.name)}State {
${spec.state.map(field => `  ${field.name}: ${field.type};`).join('\n')}
}

// Action types
type ${capitalize(spec.name)}Action =
${spec.actions.map(action => `  | { type: '${action.name.toUpperCase()}'${action.params ? `; payload: { ${action.params.map(p => `${p.name}: ${p.type}`).join('; ')} }` : ''} }`).join('\n')};

// Initial state
const initial${capitalize(spec.name)}State: ${capitalize(spec.name)}State = {
${spec.state.map(field => `  ${field.name}: ${JSON.stringify(field.initial)},`).join('\n')}
};

// Reducer
function ${spec.name}Reducer(
  state: ${capitalize(spec.name)}State,
  action: ${capitalize(spec.name)}Action
): ${capitalize(spec.name)}State {
  switch (action.type) {
${spec.actions.map(action => generateContextReducerCase(action, spec.state)).join('\n')}
    default:
      return state;
  }
}

// Context
interface ${capitalize(spec.name)}ContextValue {
  state: ${capitalize(spec.name)}State;
  dispatch: React.Dispatch<${capitalize(spec.name)}Action>;
}

const ${capitalize(spec.name)}Context = createContext<${capitalize(spec.name)}ContextValue | undefined>(undefined);

// Provider
export const ${capitalize(spec.name)}Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(${spec.name}Reducer, initial${capitalize(spec.name)}State);

  return (
    <${capitalize(spec.name)}Context.Provider value={{ state, dispatch }}>
      {children}
    </${capitalize(spec.name)}Context.Provider>
  );
};

// Hook
export const use${capitalize(spec.name)} = () => {
  const context = useContext(${capitalize(spec.name)}Context);
  if (!context) {
    throw new Error('use${capitalize(spec.name)} must be used within ${capitalize(spec.name)}Provider');
  }
  return context;
};

// Action creators
${spec.actions.map(action => generateContextActionCreator(action)).join('\n\n')}
`;
}

function generateContextReducerCase(action: Action, stateFields: StateField[]): string {
  if (action.name.startsWith('set')) {
    const fieldName = action.name.replace('set', '').toLowerCase();
    return `    case '${action.name.toUpperCase()}':
      return { ...state, ${fieldName}: action.payload.${action.params?.[0]?.name || 'value'} };`;
  }

  return `    case '${action.name.toUpperCase()}':
      // TODO: Implement ${action.name}
      return state;`;
}

function generateContextActionCreator(action: Action): string {
  const params = generateParams(action.params);
  const payload = action.params ? `{ ${action.params.map(p => p.name).join(', ')} }` : '';

  return `export const ${action.name} = (${params}) => ({
  type: '${action.name.toUpperCase()}' as const,
  ${payload ? `payload: ${payload},` : ''}
});`;
}

/**
 * State management patterns
 */
export const statePatterns = {
  /**
   * Optimistic Updates
   * Update UI immediately, rollback on error
   */
  optimisticUpdate: `// Optimistic Update Pattern
const updateUser = async (userId: string, data: Partial<User>) => {
  const previousUser = get().user;

  // Update immediately
  set({ user: { ...previousUser, ...data } });

  try {
    const updatedUser = await api.updateUser(userId, data);
    set({ user: updatedUser });
  } catch (error) {
    // Rollback on error
    set({ user: previousUser, error: error.message });
  }
};`,

  /**
   * Async Actions with Loading States
   */
  asyncActions: `// Async Action Pattern
const fetchUsers = async () => {
  set({ loading: true, error: null });

  try {
    const users = await api.getUsers();
    set({ users, loading: false });
  } catch (error) {
    set({ error: error.message, loading: false });
  }
};`,

  /**
   * Derived State (Selectors)
   */
  derivedState: `// Derived State Pattern
export const useActiveUsers = () => {
  return useUserStore((state) =>
    state.users.filter(user => user.status === 'active')
  );
};

export const useTotalAmount = () => {
  return useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
};`,

  /**
   * Middleware for Side Effects
   */
  middleware: `// Middleware Pattern (Zustand)
const logMiddleware = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('Before state update:', get());
      set(...args);
      console.log('After state update:', get());
    },
    get,
    api
  );

export const useStore = create(
  logMiddleware((set) => ({
    // store implementation
  }))
);`,
};

/**
 * Data fetching strategies
 */
export const dataFetchingPatterns = {
  /**
   * React Query (Recommended for API data)
   */
  reactQuery: `// React Query Pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserInput) => api.createUser(userData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}`,

  /**
   * SWR (Alternative to React Query)
   */
  swr: `// SWR Pattern
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    users: data,
    isLoading,
    error,
    refresh: mutate,
  };
}`,

  /**
   * Custom Hook with Fetch
   */
  customHook: `// Custom Hook Pattern
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const json = await response.json();

        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}`,
};

/**
 * Generate store factory
 */
export function generateStoreFactory(storeLibrary: StateLibrary, spec: StoreSpec): string {
  switch (storeLibrary) {
    case "zustand":
      return generateZustandStore(spec);
    case "redux":
      return generateReduxStore(spec);
    case "context":
      return generateContextStore(spec);
    default:
      return generateZustandStore(spec);
  }
}

/**
 * Helper functions
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateParams(params?: Param[]): string {
  if (!params || params.length === 0) return '';
  return params.map(p => `${p.name}: ${p.type}`).join(', ');
}

/**
 * State management best practices
 */
export const stateBestPractices = {
  choosing: [
    "Use React Query/SWR for server state (API data)",
    "Use Zustand for global client state (simple, fast)",
    "Use Redux Toolkit for complex apps with many features",
    "Use Context for component-scoped state (theme, auth)",
    "Avoid prop drilling - use state management",
  ],

  organization: [
    "Separate server state from client state",
    "Keep stores small and focused",
    "Use selectors for derived state",
    "Normalize nested/relational data",
    "Avoid duplicating data across stores",
  ],

  performance: [
    "Use selectors to prevent unnecessary re-renders",
    "Memoize expensive selectors",
    "Split large stores into smaller ones",
    "Use shallow equality checks",
    "Avoid storing computed values in state",
  ],

  testing: [
    "Test store logic in isolation",
    "Use MSW to mock API calls",
    "Test optimistic updates",
    "Test error handling",
    "Test loading states",
  ],
};
