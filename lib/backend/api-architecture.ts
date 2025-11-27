/**
 * API Architecture - Patterns for building scalable REST APIs
 */

export interface RouteSpec {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  handler: string; // Function name
  middleware?: string[];
  auth: boolean;
  validation?: string; // Validation schema name
  description: string;
}

export interface ControllerSpec {
  name: string;
  basePath: string;
  routes: RouteSpec[];
}

/**
 * Generate Express REST API controller
 */
export function generateExpressController(spec: ControllerSpec): string {
  return `/**
 * ${spec.name} Controller
 * Handles ${spec.basePath} endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import * as ${spec.name.toLowerCase()}Service from '../services/${spec.name.toLowerCase()}.service';
${spec.routes.some(r => r.validation) ? `import * as schemas from '../schemas/${spec.name.toLowerCase()}.schema';` : ''}

const router = Router();

${spec.routes.map(route => generateRoute(route, spec.name)).join('\n\n')}

export default router;
`;
}

function generateRoute(route: RouteSpec, controllerName: string): string {
  const middlewares: string[] = [];

  if (route.auth) middlewares.push('authenticate');
  if (route.validation) middlewares.push(`validate(schemas.${route.validation})`);
  if (route.middleware) middlewares.push(...route.middleware);

  const middlewareStr = middlewares.length > 0 ? `${middlewares.join(', ')}, ` : '';

  return `/**
 * ${route.description}
 */
router.${route.method.toLowerCase()}(
  '${route.path}',
  ${middlewareStr}asyncHandler(async (req: Request, res: Response) => {
    ${generateRouteHandler(route, controllerName)}
  })
);`;
}

function generateRouteHandler(route: RouteSpec, controllerName: string): string {
  const serviceName = controllerName.toLowerCase();

  if (route.method === 'GET' && route.path.includes(':id')) {
    return `const { id } = req.params;
    const result = await ${serviceName}Service.getById(id);
    res.json(result);`;
  }

  if (route.method === 'GET') {
    return `const result = await ${serviceName}Service.getAll(req.query);
    res.json(result);`;
  }

  if (route.method === 'POST') {
    return `const result = await ${serviceName}Service.create(req.body);
    res.status(201).json(result);`;
  }

  if (route.method === 'PUT' || route.method === 'PATCH') {
    return `const { id } = req.params;
    const result = await ${serviceName}Service.update(id, req.body);
    res.json(result);`;
  }

  if (route.method === 'DELETE') {
    return `const { id } = req.params;
    await ${serviceName}Service.delete(id);
    res.status(204).send();`;
  }

  return `// TODO: Implement ${route.method} ${route.path}
    res.json({ message: 'Not implemented' });`;
}

/**
 * Generate service layer
 */
export function generateService(name: string): string {
  return `/**
 * ${name} Service
 * Business logic for ${name.toLowerCase()}
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';

export async function getAll(query: any) {
  const { page = 1, limit = 10, ...filters } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.${name.toLowerCase()}.findMany({
      where: filters,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.${name.toLowerCase()}.count({ where: filters }),
  ]);

  return {
    data: items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getById(id: string) {
  const item = await prisma.${name.toLowerCase()}.findUnique({
    where: { id },
  });

  if (!item) {
    throw new AppError('${name} not found', 404);
  }

  return item;
}

export async function create(data: any) {
  const item = await prisma.${name.toLowerCase()}.create({
    data,
  });

  return item;
}

export async function update(id: string, data: any) {
  // Check if exists
  await getById(id);

  const item = await prisma.${name.toLowerCase()}.update({
    where: { id },
    data,
  });

  return item;
}

export async function delete(id: string) {
  // Check if exists
  await getById(id);

  await prisma.${name.toLowerCase()}.delete({
    where: { id },
  });
}
`;
}

/**
 * API patterns
 */
export const apiPatterns = {
  /**
   * Async handler wrapper
   */
  asyncHandler: `// Async Handler - Catches async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage:
router.get('/users', asyncHandler(async (req, res) => {
  const users = await userService.getAll();
  res.json(users);
}));`,

  /**
   * Error handler middleware
   */
  errorHandler: `// Centralized Error Handler
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database error',
      code: err.code,
    });
  }

  // Default error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
};`,

  /**
   * Pagination helper
   */
  pagination: `// Pagination Utility
export function paginate(query: any) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 10);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function paginationResponse(data: any[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}`,

  /**
   * API versioning
   */
  versioning: `// API Versioning
import express from 'express';
import v1Routes from './v1';
import v2Routes from './v2';

const app = express();

// Version 1
app.use('/api/v1', v1Routes);

// Version 2
app.use('/api/v2', v2Routes);

// Default to latest version
app.use('/api', v2Routes);`,

  /**
   * Response formatting
   */
  responseFormat: `// Standard Response Format
export function successResponse(data: any, message?: string) {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(message: string, code?: string) {
  return {
    success: false,
    error: message,
    code,
  };
}

// Usage in controller:
res.json(successResponse(users, 'Users fetched successfully'));`,
};

/**
 * Generate API index/router
 */
export function generateAPIRouter(controllers: ControllerSpec[]): string {
  return `/**
 * API Router
 * Main router that combines all controllers
 */

import { Router } from 'express';
${controllers.map(c => `import ${c.name.toLowerCase()}Routes from './controllers/${c.name.toLowerCase()}.controller';`).join('\n')}

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mount controllers
${controllers.map(c => `router.use('${c.basePath}', ${c.name.toLowerCase()}Routes);`).join('\n')}

export default router;
`;
}

/**
 * Generate Express server setup
 */
export function generateExpressServer(): string {
  return `/**
 * Express Server Setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', rateLimiter);

// API routes
app.use('/api', apiRouter);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`;
}

/**
 * API architecture best practices
 */
export const apiBestPractices = {
  structure: [
    "Use layered architecture (routes → controllers → services → data)",
    "Keep controllers thin (delegate to services)",
    "Put business logic in service layer",
    "Use async/await, avoid callbacks",
    "Handle errors consistently",
  ],

  routing: [
    "Use plural nouns for resources (/users, not /user)",
    "Use HTTP methods correctly (GET, POST, PUT, DELETE)",
    "Version your API (/api/v1, /api/v2)",
    "Use kebab-case for URLs (/user-profiles)",
    "Return appropriate status codes",
  ],

  responses: [
    "200 OK - Successful GET, PUT, PATCH",
    "201 Created - Successful POST",
    "204 No Content - Successful DELETE",
    "400 Bad Request - Invalid input",
    "401 Unauthorized - Missing/invalid auth",
    "403 Forbidden - Valid auth but not allowed",
    "404 Not Found - Resource doesn't exist",
    "500 Internal Server Error - Server error",
  ],

  performance: [
    "Paginate large result sets",
    "Use database indexes",
    "Cache frequently accessed data",
    "Use connection pooling",
    "Implement rate limiting",
  ],

  security: [
    "Validate all inputs",
    "Use parameterized queries (prevent SQL injection)",
    "Hash passwords with bcrypt",
    "Use HTTPS in production",
    "Implement rate limiting",
  ],
};

/**
 * Generate API documentation
 */
export function generateAPIDocumentation(controllers: ControllerSpec[]): string {
  let docs = `# API Documentation

Base URL: \`http://localhost:3000/api\`

## Endpoints

`;

  controllers.forEach(controller => {
    docs += `### ${controller.name}\n\n`;
    docs += `Base Path: \`${controller.basePath}\`\n\n`;

    controller.routes.forEach(route => {
      docs += `#### ${route.method} ${controller.basePath}${route.path}\n\n`;
      docs += `${route.description}\n\n`;
      docs += `**Authentication**: ${route.auth ? 'Required' : 'Not required'}\n\n`;

      if (route.validation) {
        docs += `**Validation**: ${route.validation}\n\n`;
      }

      docs += `---\n\n`;
    });
  });

  return docs;
}
