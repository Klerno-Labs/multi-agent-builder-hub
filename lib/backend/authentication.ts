/**
 * Authentication - JWT, OAuth, password hashing patterns
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string; // e.g., "7d", "24h"
  refreshTokenExpiry: string;
  bcryptRounds: number;
  oauth?: {
    google?: OAuthProvider;
    github?: OAuthProvider;
  };
}

export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

/**
 * JWT Authentication patterns
 */
export const jwtPatterns = {
  /**
   * Generate JWT token
   */
  generateToken: `// Generate JWT Token
import jwt from 'jsonwebtoken';

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d',
  });
}

// Usage:
const accessToken = generateAccessToken({
  userId: user.id,
  email: user.email,
  role: user.role,
});
const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });`,

  /**
   * Verify JWT token
   */
  verifyToken: `// Verify JWT Token
import jwt from 'jsonwebtoken';

export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}`,

  /**
   * Authentication middleware
   */
  authMiddleware: `// Authentication Middleware
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

// Usage in routes:
router.get('/profile', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const user = await userService.getById(req.user!.userId);
  res.json(user);
}));`,

  /**
   * Token refresh flow
   */
  refreshFlow: `// Token Refresh Flow
router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if refresh token is still valid in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken || storedToken.revoked) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  res.json({
    accessToken: newAccessToken,
    refreshToken, // Can optionally rotate refresh token
  });
}));`,
};

/**
 * Password hashing patterns
 */
export const passwordPatterns = {
  /**
   * Hash password with bcrypt
   */
  hashPassword: `// Hash Password with bcrypt
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  return bcrypt.hash(password, saltRounds);
}

// Usage in registration:
const hashedPassword = await hashPassword(req.body.password);
const user = await prisma.user.create({
  data: {
    email: req.body.email,
    password: hashedPassword,
  },
});`,

  /**
   * Compare password
   */
  comparePassword: `// Compare Password
import bcrypt from 'bcrypt';

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Usage in login:
const user = await prisma.user.findUnique({
  where: { email: req.body.email },
});

if (!user || !(await comparePassword(req.body.password, user.password))) {
  throw new AppError('Invalid credentials', 401);
}`,

  /**
   * Password reset flow
   */
  passwordReset: `// Password Reset Flow

// Step 1: Request reset (send email with token)
router.post('/auth/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal if email exists
    return res.json({ message: 'If email exists, reset link sent' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
    },
  });

  // Send email with reset link
  await emailService.sendPasswordReset(user.email, resetToken);

  res.json({ message: 'Password reset email sent' });
}));

// Step 2: Reset password with token
router.post('/auth/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  res.json({ message: 'Password reset successful' });
}));`,
};

/**
 * OAuth patterns
 */
export const oauthPatterns = {
  /**
   * Google OAuth with Passport.js
   */
  googleOAuth: `// Google OAuth with Passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await prisma.user.findUnique({
          where: { email: profile.emails![0].value },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: profile.emails![0].value,
              name: profile.displayName,
              googleId: profile.id,
            },
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

// Routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user as User;
    const token = generateAccessToken({ userId: user.id, email: user.email });
    res.redirect(\`/auth/success?token=\${token}\`);
  }
);`,

  /**
   * GitHub OAuth
   */
  githubOAuth: `// GitHub OAuth with Passport.js
import { Strategy as GitHubStrategy } from 'passport-github2';

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: '/auth/github/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findUnique({
          where: { githubId: profile.id },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: profile.emails![0].value,
              name: profile.displayName,
              githubId: profile.id,
            },
          });
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);`,
};

/**
 * Authorization (RBAC) patterns
 */
export const authorizationPatterns = {
  /**
   * Role-based access control
   */
  rbac: `// Role-Based Access Control (RBAC)
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export const authorize = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      throw new AppError('Forbidden', 403);
    }

    next();
  };
};

// Usage:
router.delete('/users/:id',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await userService.delete(req.params.id);
    res.status(204).send();
  })
);`,

  /**
   * Resource ownership check
   */
  resourceOwnership: `// Resource Ownership Check
export const requireOwnership = (resourceGetter: Function) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resource = await resourceGetter(req.params.id);

      if (!resource) {
        throw new AppError('Resource not found', 404);
      }

      // Check if user owns the resource or is admin
      if (resource.userId !== req.user!.userId && req.user!.role !== Role.ADMIN) {
        throw new AppError('Forbidden', 403);
      }

      // Attach resource to request for later use
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Usage:
router.put('/posts/:id',
  authenticate,
  requireOwnership((id) => prisma.post.findUnique({ where: { id } })),
  asyncHandler(async (req: AuthRequest, res) => {
    const updated = await postService.update(req.params.id, req.body);
    res.json(updated);
  })
);`,

  /**
   * Permission-based access
   */
  permissions: `// Permission-Based Access Control
export enum Permission {
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',
  READ_POSTS = 'read:posts',
  WRITE_POSTS = 'write:posts',
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: [Permission.READ_POSTS, Permission.WRITE_POSTS],
  [Role.MODERATOR]: [
    Permission.READ_USERS,
    Permission.READ_POSTS,
    Permission.WRITE_POSTS,
  ],
  [Role.ADMIN]: Object.values(Permission),
};

export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user!.role as Role;
    const userPermissions = rolePermissions[userRole];

    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};`,
};

/**
 * Generate complete auth system
 */
export function generateAuthSystem(): {
  controller: string;
  service: string;
  middleware: string;
} {
  return {
    controller: `// Auth Controller
import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import * as authService from '../services/auth.service';
import { validate } from '../middleware/validation';
import * as schemas from '../schemas/auth.schema';

const router = Router();

router.post('/register', validate(schemas.registerSchema), asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}));

router.post('/login', validate(schemas.loginSchema), asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  res.json(result);
}));

router.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await authService.logout(req.user!.userId);
  res.status(204).send();
}));

export default router;`,

    service: `// Auth Service
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/errors';

export async function register(data: { email: string; password: string; name: string }) {
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  // Store refresh token
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id },
  });

  return { user, accessToken, refreshToken };
}

export async function login(data: { email: string; password: string }) {
  // Find user
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Compare password
  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  // Store refresh token
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  };
}`,

    middleware: `// Auth Middleware
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: { userId: string; email: string; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    req.user = payload;
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};`,
  };
}

/**
 * Authentication best practices
 */
export const authBestPractices = {
  passwords: [
    "Use bcrypt with 10+ rounds",
    "Enforce min 8 characters, complexity rules",
    "Never store plain text passwords",
    "Implement password reset flow",
    "Rate limit login attempts",
  ],

  tokens: [
    "Use short expiry for access tokens (15min - 1 hour)",
    "Use long expiry for refresh tokens (7-30 days)",
    "Store refresh tokens in database",
    "Implement token rotation",
    "Revoke tokens on logout",
  ],

  security: [
    "Use HTTPS only",
    "Implement CSRF protection",
    "Set secure, httpOnly cookies for tokens",
    "Implement rate limiting",
    "Log authentication attempts",
  ],
};
