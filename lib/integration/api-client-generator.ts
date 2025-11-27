/**
 * API Client Generator - Generate type-safe API clients from OpenAPI specs
 */

import { OpenAPISpec, Operation } from "../planning/api-generator";

export interface APIClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
  retry?: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  retryableStatuses: number[]; // e.g., [408, 429, 500, 502, 503, 504]
  backoffMultiplier?: number; // Exponential backoff
}

export interface RequestInterceptor {
  name: string;
  handler: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  name: string;
  onSuccess?: (response: any) => any;
  onError?: (error: any) => any;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export interface APIEndpointClient {
  path: string;
  method: string;
  operationId: string;
  function: string; // Generated function code
  types: string; // TypeScript types
}

/**
 * Generate TypeScript API client from OpenAPI spec
 */
export function generateAPIClient(
  spec: OpenAPISpec,
  config: {
    clientName: string;
    includeAuth?: boolean;
    platform?: "browser" | "node" | "react-native";
  }
): string {
  const { clientName, includeAuth = true, platform = "browser" } = config;

  let client = `/**
 * ${spec.info.title} API Client
 * Version: ${spec.info.version}
 * Generated from OpenAPI specification
 */

${generateImports(platform)}

${generateTypes(spec)}

${generateClientClass(clientName, spec, includeAuth)}

${generateEndpointMethods(spec)}

${generateExports(clientName)}
`;

  return client;
}

/**
 * Generate imports based on platform
 */
function generateImports(platform: string): string {
  if (platform === "browser" || platform === "react-native") {
    return `import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';`;
  }
  return `import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';`;
}

/**
 * Generate TypeScript types from OpenAPI schemas
 */
function generateTypes(spec: OpenAPISpec): string {
  let types = `// ============ Types ============\n\n`;

  if (spec.components?.schemas) {
    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
      types += `export interface ${name} ${generateTypeFromSchema(schema)}\n\n`;
    });
  }

  // Add common types
  types += `export interface APIError {
  error: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface APIClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  onTokenExpired?: () => Promise<string>;
}
`;

  return types;
}

/**
 * Generate TypeScript type from JSON Schema
 */
function generateTypeFromSchema(schema: any): string {
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    return refName!;
  }

  if (schema.type === "object") {
    const props = schema.properties || {};
    const required = schema.required || [];

    let typeStr = "{\n";
    Object.entries(props).forEach(([key, propSchema]: [string, any]) => {
      const optional = required.includes(key) ? "" : "?";
      const propType = generateTypeFromSchema(propSchema);
      typeStr += `  ${key}${optional}: ${propType};\n`;
    });
    typeStr += "}";
    return typeStr;
  }

  if (schema.type === "array") {
    const itemType = generateTypeFromSchema(schema.items);
    return `${itemType}[]`;
  }

  // Primitive types
  const typeMapping: Record<string, string> = {
    string: "string",
    number: "number",
    integer: "number",
    boolean: "boolean",
    null: "null",
  };

  return typeMapping[schema.type] || "any";
}

/**
 * Generate main API client class
 */
function generateClientClass(clientName: string, spec: OpenAPISpec, includeAuth: boolean): string {
  let clientClass = `// ============ API Client ============

export class ${clientName} {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(config: APIClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = \`Bearer \${this.accessToken}\`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<APIError>) => {
        if (error.response?.status === 401 && config.onTokenExpired) {
          // Token expired, refresh it
          try {
            this.accessToken = await config.onTokenExpired();
            // Retry original request
            const originalRequest = error.config!;
            originalRequest.headers.Authorization = \`Bearer \${this.accessToken}\`;
            return this.client(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    this.accessToken = null;
  }

  /**
   * Generic request method with retry logic
   */
  private async request<T>(config: AxiosRequestConfig, retries = 3): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(1000 * (4 - retries)); // Exponential backoff
        return this.request<T>(config, retries - 1);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      const apiError: APIError = error.response.data;
      return new Error(apiError.error || 'API request failed');
    }
    if (error.request) {
      return new Error('No response from server');
    }
    return new Error(error.message || 'Unknown error');
  }
`;

  return clientClass;
}

/**
 * Generate endpoint methods from OpenAPI paths
 */
function generateEndpointMethods(spec: OpenAPISpec): string {
  let methods = "\n  // ============ API Methods ============\n\n";

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (method === "parameters") return;
      const op = operation as Operation;

      methods += generateMethodForOperation(path, method, op);
    });
  });

  methods += "}\n"; // Close class

  return methods;
}

/**
 * Generate method for single operation
 */
function generateMethodForOperation(path: string, method: string, operation: Operation): string {
  const operationId = operation.operationId || `${method}_${path.replace(/\//g, "_")}`;
  const methodName = toCamelCase(operationId);

  // Extract path parameters
  const pathParams = path.match(/\{([^}]+)\}/g)?.map((p) => p.replace(/\{|\}/g, "")) || [];

  // Extract query parameters
  const queryParams =
    operation.parameters?.filter((p) => p.in === "query").map((p) => p.name) || [];

  // Determine request body type
  const requestBodyType = operation.requestBody
    ? "data: any" // Would need to extract actual type from schema
    : "";

  // Determine response type
  const responseType = operation.responses["200"] || operation.responses["201"];
  const returnType = responseType ? "any" : "void"; // Would need to extract actual type

  // Build parameters
  const params: string[] = [];
  pathParams.forEach((p) => params.push(`${p}: string`));
  if (queryParams.length > 0) {
    params.push(`query?: { ${queryParams.map((q) => `${q}?: any`).join(", ")} }`);
  }
  if (requestBodyType) {
    params.push(requestBodyType);
  }

  const paramsStr = params.join(", ");

  // Build URL
  let urlBuilder = `\`${path}\``;
  pathParams.forEach((p) => {
    urlBuilder = urlBuilder.replace(`{${p}}`, `\${${p}}`);
  });

  // Build method
  let methodCode = `  /**
   * ${operation.summary || operation.description || `${method.toUpperCase()} ${path}`}
   */
  async ${methodName}(${paramsStr}): Promise<${returnType}> {
    return this.request({
      method: '${method.toUpperCase()}',
      url: ${urlBuilder},`;

  if (queryParams.length > 0) {
    methodCode += `\n      params: query,`;
  }

  if (requestBodyType) {
    methodCode += `\n      data,`;
  }

  methodCode += `
    });
  }

`;

  return methodCode;
}

/**
 * Generate exports
 */
function generateExports(clientName: string): string {
  return `
// ============ Exports ============

export default ${clientName};
`;
}

/**
 * Convert operation ID to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Generate React hooks for API client
 */
export function generateReactHooks(spec: OpenAPISpec, clientName: string): string {
  let hooks = `/**
 * React Hooks for ${spec.info.title} API
 */

import { useState, useEffect, useCallback } from 'react';
import ${clientName} from './${clientName.toLowerCase()}';

// ============ Custom Hooks ============

export function useAPI() {
  const [client] = useState(() => new ${clientName}({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  }));

  return client;
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
): {
  mutate: (variables: TVariables) => Promise<void>;
  data: TData | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (variables: TVariables) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(variables);
      setData(result);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, data, loading, error };
}
`;

  return hooks;
}

/**
 * Generate API mock for testing
 */
export function generateAPIMock(spec: OpenAPISpec): string {
  let mock = `/**
 * Mock API Server for Testing
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';

const baseURL = 'http://localhost:3000/api';

// ============ Mock Handlers ============

export const handlers = [
`;

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (method === "parameters") return;
      const op = operation as Operation;

      const mockResponse = op.responses["200"]?.content?.["application/json"]?.example || {};

      mock += `  rest.${method}(\`\${baseURL}${path}\`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(${JSON.stringify(mockResponse)}));
  }),
`;
    });
  });

  mock += `];

// ============ Server Setup ============

export const server = setupServer(...handlers);

// Setup and teardown
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
`;

  return mock;
}

/**
 * Generate type-safe fetch wrapper (alternative to axios)
 */
export function generateFetchClient(spec: OpenAPISpec, clientName: string): string {
  return `/**
 * Type-safe Fetch API Client for ${spec.info.title}
 */

${generateTypes(spec)}

export class ${clientName}Fetch {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (this.accessToken) {
      headers.set('Authorization', \`Bearer \${this.accessToken}\`);
    }

    const response = await fetch(\`\${this.baseURL}\${path}\`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, data: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(path: string, data: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
`;
}
