/**
 * Middleware - Common Express middleware patterns
 */

export interface MiddlewareConfig {
  enableCors: boolean;
  enableRateLimit: boolean;
  enableLogging: boolean;
  enableCompression: boolean;
  corsOrigins?: string[];
  rateLimitMax?: number;
  rateLimitWindow?: number;
}

/**
 * CORS Configuration
 */
export const corsPatterns = {
  /**
   * Basic CORS setup
   */
  basic: `// Basic CORS Configuration
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));`,

  /**
   * Dynamic CORS based on environment
   */
  dynamic: `// Dynamic CORS Configuration
import cors from 'cors';

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com', 'https://www.yourdomain.com']
  : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));`,

  /**
   * CORS with preflight caching
   */
  advanced: `// Advanced CORS with Preflight
import cors from 'cors';

app.use(cors({
  origin: (origin, callback) => {
    const whitelist = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));`,
};

/**
 * Rate Limiting
 */
export const rateLimitPatterns = {
  /**
   * Basic rate limiting
   */
  basic: `// Basic Rate Limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);`,

  /**
   * Tiered rate limiting (different limits for different endpoints)
   */
  tiered: `// Tiered Rate Limiting
import rateLimit from 'express-rate-limit';

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Lenient limiter for read-only endpoints
const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 requests per minute
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/posts', readLimiter);`,

  /**
   * Redis-based rate limiting (for distributed systems)
   */
  redis: `// Redis-based Rate Limiting
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:', // Rate limit prefix
  }),
});

app.use('/api/', limiter);`,
};

/**
 * Request Logging
 */
export const loggingPatterns = {
  /**
   * Morgan logging
   */
  morgan: `// Morgan HTTP Logger
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

// Create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../logs/access.log'),
  { flags: 'a' }
);

// Development logging (console)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Production logging (file)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: accessLogStream }));
}`,

  /**
   * Custom request logger
   */
  custom: `// Custom Request Logger
import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: \`\${duration}ms\`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(log));

    // Send to logging service
    if (process.env.NODE_ENV === 'production') {
      // logger.info(log);
    }
  });

  next();
};

app.use(requestLogger);`,

  /**
   * Winston logger integration
   */
  winston: `// Winston Logger Integration
import winston from 'winston';
import expressWinston from 'express-winston';

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Express Winston middleware
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
}));`,
};

/**
 * Error Handling Middleware
 */
export const errorHandlingPatterns = {
  /**
   * Async error handler wrapper
   */
  asyncHandler: `// Async Handler Wrapper
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage:
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json(users);
}));`,

  /**
   * Custom error class
   */
  appError: `// Custom Error Class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage:
throw new AppError('User not found', 404);
throw new AppError('Unauthorized', 401);`,

  /**
   * Global error handler
   */
  globalHandler: `// Global Error Handler
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Use at the end of middleware chain
app.use(errorHandler);`,

  /**
   * 404 Handler
   */
  notFound: `// 404 Not Found Handler
import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(\`Not Found - \${req.originalUrl}\`, 404);
  next(error);
};

// Use before error handler
app.use(notFound);
app.use(errorHandler);`,
};

/**
 * Security Middleware
 */
export const securityPatterns = {
  /**
   * Helmet for security headers
   */
  helmet: `// Helmet Security Headers
import helmet from 'helmet';

app.use(helmet());

// Or customize:
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);`,

  /**
   * XSS Protection
   */
  xss: `// XSS Protection
import xss from 'xss-clean';

// Sanitize user input
app.use(xss());`,

  /**
   * HPP Protection (HTTP Parameter Pollution)
   */
  hpp: `// HPP Protection
import hpp from 'hpp';

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit'], // Allow these to be duplicated
}));`,

  /**
   * Request size limiting
   */
  sizeLimit: `// Request Size Limiting
import express from 'express';

// Limit request body size
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));`,
};

/**
 * File Upload Middleware
 */
export const fileUploadPatterns = {
  /**
   * Multer basic setup
   */
  basic: `// Multer File Upload
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Single file
router.post('/upload', upload.single('image'), (req, res) => {
  res.json({ file: req.file });
});

// Multiple files
router.post('/upload-multiple', upload.array('images', 10), (req, res) => {
  res.json({ files: req.files });
});`,

  /**
   * Cloud storage (S3) upload
   */
  s3: `// S3 File Upload
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME!,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const fileName = \`\${Date.now()}-\${file.originalname}\`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post('/upload', upload.single('file'), (req, res) => {
  res.json({
    file: req.file,
    url: (req.file as any).location,
  });
});`,
};

/**
 * Compression Middleware
 */
export const compressionPatterns = {
  /**
   * Basic compression
   */
  basic: `// Response Compression
import compression from 'compression';

app.use(compression());`,

  /**
   * Conditional compression
   */
  conditional: `// Conditional Compression
import compression from 'compression';

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9)
  })
);`,
};

/**
 * Request Parsing Middleware
 */
export const parsingPatterns = {
  /**
   * Standard body parsers
   */
  standard: `// Request Parsing
import express from 'express';
import cookieParser from 'cookie-parser';

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies`,

  /**
   * Request sanitization
   */
  sanitization: `// Request Sanitization
import mongoSanitize from 'express-mongo-sanitize';
import { body, validationResult } from 'express-validator';

// Remove $ and . from user input (prevent NoSQL injection)
app.use(mongoSanitize());

// Sanitize specific fields
router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process registration
  }
);`,
};

/**
 * Caching Middleware
 */
export const cachingPatterns = {
  /**
   * Simple in-memory cache
   */
  memory: `// In-Memory Cache Middleware
import { Request, Response, NextFunction } from 'express';

const cache = new Map<string, { data: any; expires: number }>();

export const cacheMiddleware = (duration: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      cache.set(key, {
        data,
        expires: Date.now() + duration * 1000,
      });
      return originalJson(data);
    };

    next();
  };
};

// Usage:
router.get('/products', cacheMiddleware(300), async (req, res) => {
  const products = await Product.findAll();
  res.json(products);
});`,

  /**
   * Redis cache
   */
  redis: `// Redis Cache Middleware
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});

export const redisCache = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = \`cache:\${req.originalUrl}\`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        redis.setex(key, duration, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Redis cache error:', error);
      next();
    }
  };
};

// Usage:
router.get('/users', redisCache(600), async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});`,
};

/**
 * Background Jobs Middleware
 */
export const backgroundJobsPatterns = {
  /**
   * Bull Queue setup
   */
  bull: `// Bull Queue for Background Jobs
import Bull from 'bull';

// Create queues
export const emailQueue = new Bull('email', {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

export const imageQueue = new Bull('image-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

// Process email jobs
emailQueue.process(async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail({ to, subject, html });
  return { success: true };
});

// Process image jobs
imageQueue.process(async (job) => {
  const { imageUrl } = job.data;
  await processImage(imageUrl);
  return { success: true };
});

// Add jobs in routes
router.post('/send-email', async (req, res) => {
  await emailQueue.add(req.body, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
  res.json({ message: 'Email queued' });
});`,

  /**
   * BullMQ (modern Bull)
   */
  bullmq: `// BullMQ Background Jobs
import { Queue, Worker } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
};

// Create queue
export const emailQueue = new Queue('email', { connection });

// Create worker
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html } = job.data;
    await sendEmail({ to, subject, html });
  },
  { connection }
);

// Add jobs
router.post('/send-welcome-email', async (req, res) => {
  await emailQueue.add('welcome', {
    to: req.body.email,
    subject: 'Welcome!',
    html: '<p>Welcome to our platform</p>',
  });
  res.json({ message: 'Welcome email queued' });
});`,
};

/**
 * API Versioning Middleware
 */
export const versioningPatterns = {
  /**
   * URL-based versioning
   */
  url: `// URL-based API Versioning
import express from 'express';

const app = express();

// Version 1 routes
import v1Routes from './routes/v1';
app.use('/api/v1', v1Routes);

// Version 2 routes
import v2Routes from './routes/v2';
app.use('/api/v2', v2Routes);`,

  /**
   * Header-based versioning
   */
  header: `// Header-based API Versioning
import { Request, Response, NextFunction } from 'express';

export const versionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version as string;
  next();
};

// Use in routes
router.get('/users', versionMiddleware, (req, res) => {
  if (req.apiVersion === 'v2') {
    // Return v2 format
    return res.json({ users: [], version: 'v2' });
  }
  // Return v1 format
  res.json({ users: [] });
});`,
};

/**
 * Request ID Middleware
 */
export const requestIdPattern = `// Request ID Middleware
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = req.headers['x-request-id'] as string || uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
};

app.use(requestId);`;

/**
 * Middleware best practices
 */
export const middlewareBestPractices = {
  ordering: [
    "Security middleware first (helmet, cors)",
    "Request parsing (body-parser, cookie-parser)",
    "Logging middleware",
    "Authentication middleware",
    "Rate limiting",
    "Caching (for GET requests)",
    "Route-specific middleware",
    "404 handler",
    "Error handler (last)",
  ],

  performance: [
    "Use compression for responses",
    "Implement caching where appropriate",
    "Use async handlers to prevent blocking",
    "Set appropriate rate limits",
    "Enable HTTP/2 if possible",
  ],

  security: [
    "Always validate and sanitize input",
    "Use helmet for security headers",
    "Implement CORS properly",
    "Rate limit authentication endpoints",
    "Log suspicious activity",
  ],

  errorHandling: [
    "Use async handler wrapper for routes",
    "Implement global error handler",
    "Handle specific error types",
    "Don't expose stack traces in production",
    "Log errors for debugging",
  ],
};

/**
 * Generate middleware setup
 */
export function generateMiddlewareSetup(config: MiddlewareConfig): string {
  return `/**
 * Express Middleware Setup
 * Auto-generated middleware configuration
 */

import express from 'express';
import helmet from 'helmet';
${config.enableCors ? "import cors from 'cors';" : ''}
${config.enableRateLimit ? "import rateLimit from 'express-rate-limit';" : ''}
${config.enableLogging ? "import morgan from 'morgan';" : ''}
${config.enableCompression ? "import compression from 'compression';" : ''}

export function setupMiddleware(app: express.Application) {
  // Security
  app.use(helmet());

${config.enableCors ? `  // CORS
  app.use(cors({
    origin: ${JSON.stringify(config.corsOrigins || ['http://localhost:3000'])},
    credentials: true,
  }));
` : ''}
  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

${config.enableCompression ? `  // Compression
  app.use(compression());
` : ''}
${config.enableLogging ? `  // Logging
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
` : ''}
${config.enableRateLimit ? `  // Rate limiting
  const limiter = rateLimit({
    windowMs: ${config.rateLimitWindow || 15} * 60 * 1000,
    max: ${config.rateLimitMax || 100},
    message: 'Too many requests, please try again later',
  });
  app.use('/api/', limiter);
` : ''}
}
`;
}
