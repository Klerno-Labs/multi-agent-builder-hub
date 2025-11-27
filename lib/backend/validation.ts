/**
 * Validation - Request validation with Zod
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validation middleware factory
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid URL parameters',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /** ID parameter (UUID or MongoDB ObjectId) */
  id: z.object({
    id: z.string().uuid().or(z.string().regex(/^[0-9a-fA-F]{24}$/)),
  }),

  /** Pagination query */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),

  /** Email */
  email: z.string().email('Invalid email address'),

  /** Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number) */
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),

  /** URL */
  url: z.string().url('Invalid URL'),

  /** Date string (ISO 8601) */
  dateString: z.string().datetime(),

  /** Enum */
  enum: (values: string[]) => z.enum(values as [string, ...string[]]),
};

/**
 * Generate validation schema from spec
 */
export function generateZodSchema(name: string, fields: ValidationField[]): string {
  return `// ${name} Validation Schema
import { z } from 'zod';

export const ${name}Schema = z.object({
${fields.map(field => `  ${field.name}: ${generateZodField(field)},`).join('\n')}
});

export type ${capitalize(name)} = z.infer<typeof ${name}Schema>;
`;
}

export interface ValidationField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'enum' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
  itemType?: string; // For arrays
}

function generateZodField(field: ValidationField): string {
  let schema = '';

  switch (field.type) {
    case 'email':
      schema = 'z.string().email("Invalid email")';
      break;
    case 'url':
      schema = 'z.string().url("Invalid URL")';
      break;
    case 'date':
      schema = 'z.string().datetime()';
      break;
    case 'enum':
      schema = `z.enum([${field.enumValues?.map(v => `'${v}'`).join(', ')}])`;
      break;
    case 'array':
      schema = `z.array(z.${field.itemType || 'string'}())`;
      break;
    case 'boolean':
      schema = 'z.boolean()';
      break;
    case 'number':
      schema = 'z.number()';
      if (field.min !== undefined) schema += `.min(${field.min})`;
      if (field.max !== undefined) schema += `.max(${field.max})`;
      break;
    case 'string':
    default:
      schema = 'z.string()';
      if (field.min !== undefined) schema += `.min(${field.min})`;
      if (field.max !== undefined) schema += `.max(${field.max})`;
      if (field.pattern) schema += `.regex(${field.pattern})`;
  }

  if (!field.required) {
    schema += '.optional()';
  }

  return schema;
}

/**
 * Sanitization utilities
 */
export const sanitize = {
  /** Remove HTML tags */
  stripHtml: (str: string) => str.replace(/<[^>]*>/g, ''),

  /** Trim whitespace */
  trim: (str: string) => str.trim(),

  /** Convert to lowercase */
  toLowerCase: (str: string) => str.toLowerCase(),

  /** Remove special characters */
  alphanumeric: (str: string) => str.replace(/[^a-zA-Z0-9]/g, ''),

  /** Escape HTML entities */
  escapeHtml: (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;'),
};

/**
 * Custom validation functions
 */
export const customValidators = {
  /** Check if string is valid JSON */
  isJSON: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /** Check if date is in the past */
  isPastDate: (date: Date) => date < new Date(),

  /** Check if date is in the future */
  isFutureDate: (date: Date) => date > new Date(),

  /** Check if string contains only alphanumeric */
  isAlphanumeric: (value: string) => /^[a-zA-Z0-9]+$/.test(value),

  /** Check if valid phone number */
  isPhone: (value: string) =>
    /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/.test(value),

  /** Check if valid credit card */
  isCreditCard: (value: string) => /^[0-9]{13,19}$/.test(value.replace(/\\s/g, '')),
};

/**
 * Example validation schemas
 */
export const exampleSchemas = {
  /** User registration */
  register: `export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  name: z.string().min(2, 'Name too short').max(50, 'Name too long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});`,

  /** User login */
  login: `export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});`,

  /** Update profile */
  updateProfile: `export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  location: z.string().max(100).optional(),
});`,

  /** Create post */
  createPost: `export const createPostSchema = z.object({
  title: z.string().min(5, 'Title too short').max(200, 'Title too long'),
  content: z.string().min(10, 'Content too short'),
  tags: z.array(z.string()).max(5, 'Max 5 tags'),
  published: z.boolean().default(false),
});`,

  /** Pagination query */
  paginationQuery: `export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});`,
};

/**
 * Validation best practices
 */
export const validationBestPractices = {
  general: [
    "Validate all user input (body, query, params)",
    "Use schema validation (Zod, Joi) not manual checks",
    "Provide clear, actionable error messages",
    "Validate data types and formats",
    "Set reasonable min/max limits",
  ],

  security: [
    "Sanitize HTML input to prevent XSS",
    "Use parameterized queries to prevent SQL injection",
    "Validate file uploads (type, size, content)",
    "Rate limit to prevent abuse",
    "Whitelist allowed values, don't just blacklist",
  ],

  ux: [
    "Return all validation errors at once (not one at a time)",
    "Include field names in error messages",
    "Use consistent error format across API",
    "Provide examples of valid input",
    "Consider internationalization for error messages",
  ],
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
