/**
 * API Generator - OpenAPI/Swagger specification generation
 */

import { APIEndpoint, ValidationRule } from "./spec-templates";
import { Requirement } from "../discovery/requirements-elicitation";

export interface OpenAPISpec {
  openapi: string; // "3.1.0"
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Server[];
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
    responses?: Record<string, Response>;
    parameters?: Record<string, Parameter>;
  };
  security?: SecurityRequirement[];
  tags?: Tag[];
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  parameters?: Parameter[];
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema: Schema;
  example?: any;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema: Schema;
  example?: any;
  examples?: Record<string, Example>;
}

export interface Example {
  summary?: string;
  description?: string;
  value: any;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, Header>;
}

export interface Header {
  description?: string;
  schema: Schema;
}

export interface Schema {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  format?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  $ref?: string;
  description?: string;
  example?: any;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
}

export interface SecurityScheme {
  type: "http" | "apiKey" | "oauth2" | "openIdConnect";
  scheme?: string; // "bearer", "basic"
  bearerFormat?: string; // "JWT"
  in?: "query" | "header" | "cookie";
  name?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface Tag {
  name: string;
  description?: string;
}

/**
 * Generate OpenAPI spec from requirements and endpoints
 */
export function generateOpenAPISpec(
  projectName: string,
  projectDescription: string,
  version: string,
  endpoints: APIEndpoint[],
  requirements: Requirement[]
): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: "3.1.0",
    info: {
      title: projectName,
      version,
      description: projectDescription,
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server",
      },
      {
        url: "https://api.{environment}.example.com",
        description: "Production server",
        variables: {
          environment: {
            default: "prod",
            enum: ["staging", "prod"],
          },
        },
      },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: extractTags(endpoints),
  };

  // Convert endpoints to OpenAPI paths
  endpoints.forEach((endpoint) => {
    const path = endpoint.path;
    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    const method = endpoint.method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
    spec.paths[path][method] = convertEndpointToOperation(endpoint);
  });

  // Generate schemas from endpoints
  spec.components!.schemas = generateSchemas(endpoints);

  return spec;
}

/**
 * Convert APIEndpoint to OpenAPI Operation
 */
function convertEndpointToOperation(endpoint: APIEndpoint): Operation {
  const operation: Operation = {
    summary: endpoint.description,
    description: endpoint.description,
    operationId: generateOperationId(endpoint.method, endpoint.path),
    tags: extractTagsFromPath(endpoint.path),
    responses: {},
  };

  // Add security if auth required
  if (endpoint.auth) {
    operation.security = [{ bearerAuth: [] }];
  } else {
    operation.security = [];
  }

  // Add request body
  if (endpoint.requestBody) {
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: endpoint.requestBody.schema as Schema,
          example: endpoint.requestBody.example,
        },
      },
    };
  }

  // Add responses
  Object.entries(endpoint.responses).forEach(([statusCode, response]) => {
    operation.responses[statusCode] = {
      description: response.description,
      content: response.schema
        ? {
            "application/json": {
              schema: response.schema as Schema,
              example: response.example,
            },
          }
        : undefined,
    };
  });

  // Add path parameters
  const pathParams = extractPathParameters(endpoint.path);
  if (pathParams.length > 0) {
    operation.parameters = pathParams.map((param) => ({
      name: param,
      in: "path" as const,
      required: true,
      schema: {
        type: "string",
      },
    }));
  }

  return operation;
}

/**
 * Generate operation ID from method and path
 */
function generateOperationId(method: string, path: string): string {
  const cleanPath = path
    .replace(/^\//, "")
    .replace(/\//g, "_")
    .replace(/\{|\}/g, "")
    .replace(/_+/g, "_");
  return `${method.toLowerCase()}_${cleanPath}`;
}

/**
 * Extract tags from endpoints
 */
function extractTags(endpoints: APIEndpoint[]): Tag[] {
  const tagSet = new Set<string>();
  endpoints.forEach((endpoint) => {
    const tags = extractTagsFromPath(endpoint.path);
    tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).map((tag) => ({
    name: tag,
    description: `Operations related to ${tag}`,
  }));
}

/**
 * Extract tags from path (e.g., "/api/users/{id}" -> ["users"])
 */
function extractTagsFromPath(path: string): string[] {
  const segments = path.split("/").filter((s) => s && !s.startsWith("{"));
  return segments.length > 1 ? [segments[1]] : ["default"];
}

/**
 * Extract path parameters (e.g., "/users/{id}" -> ["id"])
 */
function extractPathParameters(path: string): string[] {
  const matches = path.match(/\{([^}]+)\}/g);
  return matches ? matches.map((m) => m.replace(/\{|\}/g, "")) : [];
}

/**
 * Generate schemas from endpoints
 */
function generateSchemas(endpoints: APIEndpoint[]): Record<string, Schema> {
  const schemas: Record<string, Schema> = {};

  // Common error schema
  schemas.Error = {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "Error message",
      },
      code: {
        type: "string",
        description: "Error code",
      },
      details: {
        type: "object",
        description: "Additional error details",
      },
    },
    required: ["error"],
  };

  // Extract schemas from endpoint request/response bodies
  endpoints.forEach((endpoint) => {
    if (endpoint.requestBody?.schema) {
      const schemaName = `${generateOperationId(endpoint.method, endpoint.path)}_Request`;
      schemas[schemaName] = endpoint.requestBody.schema as Schema;
    }

    Object.entries(endpoint.responses).forEach(([statusCode, response]) => {
      if (response.schema && statusCode === "200") {
        const schemaName = `${generateOperationId(endpoint.method, endpoint.path)}_Response`;
        schemas[schemaName] = response.schema as Schema;
      }
    });
  });

  return schemas;
}

/**
 * Generate REST endpoints from requirements
 */
export function generateRESTEndpoints(requirements: Requirement[]): APIEndpoint[] {
  const endpoints: APIEndpoint[] = [];

  // Extract resources from requirements
  const resources = extractResources(requirements);

  resources.forEach((resource) => {
    const resourceName = resource.toLowerCase();

    // Create CRUD endpoints for each resource
    endpoints.push(
      // List all
      {
        path: `/api/${resourceName}`,
        method: "GET",
        description: `Get all ${resourceName}`,
        auth: true,
        responses: {
          "200": {
            description: "Success",
            schema: {
              type: "array",
              items: {
                $ref: `#/components/schemas/${capitalize(resourceName)}`,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      // Get by ID
      {
        path: `/api/${resourceName}/{id}`,
        method: "GET",
        description: `Get ${resourceName} by ID`,
        auth: true,
        responses: {
          "200": {
            description: "Success",
            schema: {
              $ref: `#/components/schemas/${capitalize(resourceName)}`,
            },
          },
          "404": {
            description: "Not found",
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      // Create
      {
        path: `/api/${resourceName}`,
        method: "POST",
        description: `Create new ${resourceName}`,
        auth: true,
        requestBody: {
          schema: {
            $ref: `#/components/schemas/Create${capitalize(resourceName)}Request`,
          },
        },
        responses: {
          "201": {
            description: "Created",
            schema: {
              $ref: `#/components/schemas/${capitalize(resourceName)}`,
            },
          },
          "400": {
            description: "Invalid input",
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
        validation: [
          { field: "name", rule: "required", message: "Name is required" },
          { field: "name", rule: "min", value: 3, message: "Name must be at least 3 characters" },
        ],
      },
      // Update
      {
        path: `/api/${resourceName}/{id}`,
        method: "PUT",
        description: `Update ${resourceName}`,
        auth: true,
        requestBody: {
          schema: {
            $ref: `#/components/schemas/Update${capitalize(resourceName)}Request`,
          },
        },
        responses: {
          "200": {
            description: "Success",
            schema: {
              $ref: `#/components/schemas/${capitalize(resourceName)}`,
            },
          },
          "404": {
            description: "Not found",
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      // Delete
      {
        path: `/api/${resourceName}/{id}`,
        method: "DELETE",
        description: `Delete ${resourceName}`,
        auth: true,
        responses: {
          "204": {
            description: "Deleted successfully",
          },
          "404": {
            description: "Not found",
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      }
    );
  });

  // Add auth endpoints
  endpoints.push(
    {
      path: "/api/auth/register",
      method: "POST",
      description: "Register new user",
      auth: false,
      requestBody: {
        schema: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            name: { type: "string" },
          },
          required: ["email", "password"],
        },
      },
      responses: {
        "201": {
          description: "User created",
          schema: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              token: { type: "string" },
            },
          },
        },
        "400": {
          description: "Invalid input",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
      validation: [
        { field: "email", rule: "required", message: "Email is required" },
        { field: "email", rule: "email", message: "Invalid email format" },
        { field: "password", rule: "required", message: "Password is required" },
        { field: "password", rule: "min", value: 8, message: "Password must be at least 8 characters" },
      ],
    },
    {
      path: "/api/auth/login",
      method: "POST",
      description: "Login user",
      auth: false,
      requestBody: {
        schema: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
          required: ["email", "password"],
        },
      },
      responses: {
        "200": {
          description: "Login successful",
          schema: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              token: { type: "string" },
            },
          },
        },
        "401": {
          description: "Invalid credentials",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    }
  );

  return endpoints;
}

/**
 * Extract resource names from requirements
 */
function extractResources(requirements: Requirement[]): string[] {
  const resources = new Set<string>();

  requirements.forEach((req) => {
    // Look for CRUD-like requirements
    const lowerTitle = req.title.toLowerCase();
    if (lowerTitle.includes("create") || lowerTitle.includes("add") || lowerTitle.includes("manage")) {
      // Extract potential resource name
      const words = req.title.split(" ");
      const resourceWords = words.filter(
        (w) => !["create", "add", "manage", "update", "delete", "view", "list", "a", "the", "an"].includes(w.toLowerCase())
      );
      if (resourceWords.length > 0) {
        resources.add(pluralize(resourceWords[0].toLowerCase()));
      }
    }
  });

  // Default resources if none found
  if (resources.size === 0) {
    resources.add("items");
  }

  return Array.from(resources);
}

/**
 * Simple pluralization
 */
function pluralize(word: string): string {
  if (word.endsWith("s") || word.endsWith("x") || word.endsWith("z") || word.endsWith("ch") || word.endsWith("sh")) {
    return word + "es";
  }
  if (word.endsWith("y") && !["a", "e", "i", "o", "u"].includes(word[word.length - 2])) {
    return word.slice(0, -1) + "ies";
  }
  return word + "s";
}

/**
 * Capitalize first letter
 */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Generate GraphQL schema from requirements
 */
export function generateGraphQLSchema(requirements: Requirement[]): string {
  const resources = extractResources(requirements);

  let schema = `# GraphQL Schema\n\n`;

  // Add types
  resources.forEach((resource) => {
    const typeName = capitalize(resource.replace(/s$/, ""));
    schema += `type ${typeName} {\n`;
    schema += `  id: ID!\n`;
    schema += `  createdAt: String!\n`;
    schema += `  updatedAt: String!\n`;
    schema += `}\n\n`;
  });

  // Add Query type
  schema += `type Query {\n`;
  resources.forEach((resource) => {
    const typeName = capitalize(resource.replace(/s$/, ""));
    schema += `  ${resource}: [${typeName}!]!\n`;
    schema += `  ${resource.replace(/s$/, "")}(id: ID!): ${typeName}\n`;
  });
  schema += `}\n\n`;

  // Add Mutation type
  schema += `type Mutation {\n`;
  resources.forEach((resource) => {
    const typeName = capitalize(resource.replace(/s$/, ""));
    const singularResource = resource.replace(/s$/, "");
    schema += `  create${typeName}(input: Create${typeName}Input!): ${typeName}!\n`;
    schema += `  update${typeName}(id: ID!, input: Update${typeName}Input!): ${typeName}!\n`;
    schema += `  delete${typeName}(id: ID!): Boolean!\n`;
  });
  schema += `}\n\n`;

  // Add input types
  resources.forEach((resource) => {
    const typeName = capitalize(resource.replace(/s$/, ""));
    schema += `input Create${typeName}Input {\n`;
    schema += `  # Add fields here\n`;
    schema += `}\n\n`;
    schema += `input Update${typeName}Input {\n`;
    schema += `  # Add fields here\n`;
    schema += `}\n\n`;
  });

  return schema;
}

/**
 * Convert OpenAPI spec to markdown documentation
 */
export function generateAPIDocumentation(spec: OpenAPISpec): string {
  let doc = `# ${spec.info.title} API Documentation\n\n`;
  doc += `Version: ${spec.info.version}\n\n`;
  if (spec.info.description) {
    doc += `${spec.info.description}\n\n`;
  }

  // Servers
  doc += `## Servers\n\n`;
  spec.servers.forEach((server) => {
    doc += `- **${server.description || "Server"}**: \`${server.url}\`\n`;
  });
  doc += `\n`;

  // Authentication
  if (spec.components?.securitySchemes) {
    doc += `## Authentication\n\n`;
    Object.entries(spec.components.securitySchemes).forEach(([name, scheme]) => {
      doc += `### ${name}\n\n`;
      doc += `Type: ${scheme.type}\n\n`;
      if (scheme.scheme) doc += `Scheme: ${scheme.scheme}\n\n`;
      if (scheme.bearerFormat) doc += `Format: ${scheme.bearerFormat}\n\n`;
    });
  }

  // Endpoints
  doc += `## Endpoints\n\n`;
  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (method === "parameters") return;
      const op = operation as Operation;

      doc += `### ${method.toUpperCase()} ${path}\n\n`;
      if (op.summary) doc += `**${op.summary}**\n\n`;
      if (op.description) doc += `${op.description}\n\n`;
      if (op.tags) doc += `Tags: ${op.tags.join(", ")}\n\n`;

      // Parameters
      if (op.parameters && op.parameters.length > 0) {
        doc += `#### Parameters\n\n`;
        op.parameters.forEach((param) => {
          doc += `- **${param.name}** (${param.in})${param.required ? " *required*" : ""}: ${param.description || ""}\n`;
        });
        doc += `\n`;
      }

      // Request body
      if (op.requestBody) {
        doc += `#### Request Body\n\n`;
        doc += `\`\`\`json\n`;
        doc += JSON.stringify(op.requestBody.content["application/json"]?.example || {}, null, 2);
        doc += `\n\`\`\`\n\n`;
      }

      // Responses
      doc += `#### Responses\n\n`;
      Object.entries(op.responses).forEach(([statusCode, response]) => {
        doc += `**${statusCode}**: ${response.description}\n\n`;
        if (response.content?.["application/json"]?.example) {
          doc += `\`\`\`json\n`;
          doc += JSON.stringify(response.content["application/json"].example, null, 2);
          doc += `\n\`\`\`\n\n`;
        }
      });

      doc += `---\n\n`;
    });
  });

  return doc;
}
