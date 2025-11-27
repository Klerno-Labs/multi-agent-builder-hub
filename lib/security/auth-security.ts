export interface AuthSecurityCheck {
  category: string;
  passed: boolean;
  issues: string[];
  recommendations: string[];
  riskLevel: "critical" | "high" | "medium" | "low";
}

export interface JWTSecurityIssue {
  type: string;
  severity: "critical" | "high" | "medium";
  description: string;
  fix: string;
}

/**
 * Generate secure JWT configuration
 */
export function generateSecureJWTConfig(): string {
  return `// Secure JWT Configuration

import jwt from "jsonwebtoken";
import crypto from "crypto";

// Generate a strong secret (min 256 bits)
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error("JWT_SECRET environment variable is required");
})();

// Validate secret strength
if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

export const jwtConfig = {
  // Use strong algorithm
  algorithm: "HS256" as const,

  // Token expiration
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "7d",

  // Issuer and audience for validation
  issuer: "your-app-name",
  audience: "your-app-users",
};

/**
 * Generate access token with secure defaults
 */
export function generateAccessToken(userId: string, roles: string[]): string {
  return jwt.sign(
    {
      sub: userId,
      roles,
      type: "access",
      // Include token ID for revocation
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }
  );
}

/**
 * Verify and decode token with strict validation
 */
export function verifyToken(token: string): jwt.JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Token blacklist for logout/revocation
 * In production, use Redis or database
 */
const tokenBlacklist = new Set<string>();

export function revokeToken(jti: string): void {
  tokenBlacklist.add(jti);
}

export function isTokenRevoked(jti: string): boolean {
  return tokenBlacklist.has(jti);
}
`;
}

/**
 * Generate OAuth 2.0 secure configuration
 */
export function generateOAuthConfig(): string {
  return `// OAuth 2.0 Secure Configuration

import { randomBytes } from "crypto";

export const oauthConfig = {
  // OAuth providers
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
      scope: ["openid", "profile", "email"],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectUri: process.env.GITHUB_REDIRECT_URI!,
      scope: ["user:email"],
    },
  },

  // State parameter for CSRF protection
  generateState(): string {
    return randomBytes(32).toString("hex");
  },

  // PKCE for enhanced security
  generateCodeVerifier(): string {
    return randomBytes(32).toString("base64url");
  },

  generateCodeChallenge(verifier: string): string {
    const crypto = require("crypto");
    return crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");
  },
};

/**
 * Validate OAuth state to prevent CSRF
 */
export function validateOAuthState(
  receivedState: string,
  storedState: string
): boolean {
  // Use constant-time comparison to prevent timing attacks
  if (receivedState.length !== storedState.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < receivedState.length; i++) {
    result |= receivedState.charCodeAt(i) ^ storedState.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Secure OAuth callback handler
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
  storedState: string,
  codeVerifier: string
): Promise<{ accessToken: string; user: any }> {
  // Validate state parameter
  if (!validateOAuthState(state, storedState)) {
    throw new Error("Invalid OAuth state - possible CSRF attack");
  }

  // Exchange code for token with PKCE
  const tokenResponse = await fetch("https://oauth-provider.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      client_id: process.env.OAUTH_CLIENT_ID!,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange OAuth code");
  }

  const tokens = await tokenResponse.json();

  // Fetch user profile
  const userResponse = await fetch("https://oauth-provider.com/user", {
    headers: { Authorization: \`Bearer \${tokens.access_token}\` },
  });

  const user = await userResponse.json();

  return { accessToken: tokens.access_token, user };
}
`;
}

/**
 * Generate session management configuration
 */
export function generateSessionConfig(): string {
  return `// Secure Session Management

import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";

// Redis client for session storage
const redisClient = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

redisClient.connect().catch(console.error);

export const sessionConfig = session({
  store: new RedisStore({ client: redisClient }),

  // Session secret (min 256 bits)
  secret: process.env.SESSION_SECRET || (() => {
    throw new Error("SESSION_SECRET is required");
  })(),

  // Session name (don't use default 'connect.sid')
  name: "sessionId",

  // Cookie settings
  cookie: {
    // HttpOnly prevents XSS attacks
    httpOnly: true,

    // Secure requires HTTPS
    secure: process.env.NODE_ENV === "production",

    // SameSite prevents CSRF
    sameSite: "strict",

    // Max age: 24 hours
    maxAge: 24 * 60 * 60 * 1000,

    // Domain restriction
    domain: process.env.COOKIE_DOMAIN,

    // Path restriction
    path: "/",
  },

  // Don't save uninitialized sessions
  saveUninitialized: false,

  // Don't resave unchanged sessions
  resave: false,

  // Rolling session (reset expiration on activity)
  rolling: true,

  // Session ID regeneration on privilege escalation
  genid: () => {
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  },
});

/**
 * Regenerate session on login to prevent fixation
 */
export function regenerateSession(req: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const oldSession = req.session;

    req.session.regenerate((err: any) => {
      if (err) {
        reject(err);
      } else {
        // Copy old session data
        Object.assign(req.session, oldSession);
        resolve();
      }
    });
  });
}

/**
 * Destroy session on logout
 */
export function destroySession(req: any): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err: any) => {
      if (err) {
        reject(err);
      } else {
        req.sessionID = null;
        resolve();
      }
    });
  });
}
`;
}

/**
 * Generate password policy validation
 */
export function generatePasswordPolicy(): string {
  return `// Strong Password Policy

import zxcvbn from "zxcvbn";

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: string[];
  isStrong: boolean;
}

/**
 * Password requirements
 */
export const passwordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
};

/**
 * Validate password strength
 */
export function validatePassword(
  password: string,
  userInputs?: string[]
): PasswordStrength {
  const feedback: string[] = [];

  // Minimum length
  if (password.length < passwordRequirements.minLength) {
    feedback.push(
      \`Password must be at least \${passwordRequirements.minLength} characters\`
    );
  }

  // Character requirements
  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    feedback.push("Password must contain uppercase letters");
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    feedback.push("Password must contain lowercase letters");
  }

  if (passwordRequirements.requireNumbers && !/[0-9]/.test(password)) {
    feedback.push("Password must contain numbers");
  }

  if (
    passwordRequirements.requireSpecialChars &&
    !/[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]/.test(password)
  ) {
    feedback.push("Password must contain special characters");
  }

  // Use zxcvbn for advanced strength analysis
  const result = zxcvbn(password, userInputs);

  // Add zxcvbn feedback
  if (result.feedback.warning) {
    feedback.push(result.feedback.warning);
  }
  feedback.push(...result.feedback.suggestions);

  // Require score of 3 or 4 for strong password
  const isStrong = result.score >= 3 && feedback.length === 0;

  return {
    score: result.score,
    feedback,
    isStrong,
  };
}

/**
 * Common password blacklist (top 10,000)
 */
const commonPasswords = new Set([
  "password",
  "123456",
  "123456789",
  "12345678",
  "12345",
  "1234567",
  "password1",
  "qwerty",
  "abc123",
  "111111",
  // ... add more from common password lists
]);

export function isCommonPassword(password: string): boolean {
  return commonPasswords.has(password.toLowerCase());
}

/**
 * Check password against breach database (Have I Been Pwned)
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
  const crypto = require("crypto");

  // Hash password with SHA-1 (required by HIBP API)
  const hash = crypto
    .createHash("sha1")
    .update(password)
    .digest("hex")
    .toUpperCase();

  // Send only first 5 characters (k-Anonymity)
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5);

  try {
    const response = await fetch(
      \`https://api.pwnedpasswords.com/range/\${prefix}\`
    );
    const text = await response.text();

    // Check if our suffix appears in the response
    return text.includes(suffix);
  } catch (error) {
    // Fail open (don't block if API is down)
    console.error("Failed to check password breach:", error);
    return false;
  }
}
`;
}

/**
 * Generate rate limiting configuration
 */
export function generateRateLimitingConfig(): string {
  return `// Rate Limiting Configuration

import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.connect().catch(console.error);

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:api:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for localhost in development
  skip: (req) =>
    process.env.NODE_ENV === "development" &&
    req.ip === "127.0.0.1",
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:auth:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false,
});

/**
 * Rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:reset:",
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 reset attempts per hour
  message: "Too many password reset attempts, please try again later.",
});

/**
 * Dynamic rate limiting based on user tier
 */
export function createUserTierLimiter(tier: "free" | "pro" | "enterprise") {
  const limits = {
    free: 100,
    pro: 1000,
    enterprise: 10000,
  };

  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: limits[tier],
    keyGenerator: (req) => req.user?.id || req.ip,
  });
}

/**
 * Distributed rate limiting with sliding window
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const windowKey = \`rl:\${key}:\${Math.floor(now / windowMs)}\`;
  const prevWindowKey = \`rl:\${key}:\${Math.floor(now / windowMs) - 1}\`;

  // Get counts from current and previous windows
  const [currentCount, prevCount] = await Promise.all([
    redisClient.get(windowKey).then((v) => parseInt(v || "0")),
    redisClient.get(prevWindowKey).then((v) => parseInt(v || "0")),
  ]);

  // Calculate weighted count for sliding window
  const percentageInCurrentWindow = (now % windowMs) / windowMs;
  const weightedCount =
    currentCount + prevCount * (1 - percentageInCurrentWindow);

  const allowed = weightedCount < limit;

  if (allowed) {
    // Increment current window
    await redisClient
      .multi()
      .incr(windowKey)
      .pexpire(windowKey, windowMs * 2)
      .exec();
  }

  return {
    allowed,
    remaining: Math.max(0, limit - Math.ceil(weightedCount)),
    resetAt: new Date(Math.ceil(now / windowMs) * windowMs),
  };
}
`;
}

/**
 * Generate RBAC (Role-Based Access Control) system
 */
export function generateRBACSystem(): string {
  return `// Role-Based Access Control (RBAC)

export type Permission =
  | "users:read"
  | "users:write"
  | "users:delete"
  | "posts:read"
  | "posts:write"
  | "posts:delete"
  | "admin:access"
  | "analytics:view"
  | "settings:manage";

export type Role = "guest" | "user" | "moderator" | "admin" | "superadmin";

/**
 * Role hierarchy and permissions
 */
export const rolePermissions: Record<Role, Permission[]> = {
  guest: ["posts:read"],

  user: [
    "posts:read",
    "posts:write",
    "users:read",
  ],

  moderator: [
    "posts:read",
    "posts:write",
    "posts:delete",
    "users:read",
    "users:write",
  ],

  admin: [
    "posts:read",
    "posts:write",
    "posts:delete",
    "users:read",
    "users:write",
    "users:delete",
    "admin:access",
    "analytics:view",
    "settings:manage",
  ],

  superadmin: [
    "posts:read",
    "posts:write",
    "posts:delete",
    "users:read",
    "users:write",
    "users:delete",
    "admin:access",
    "analytics:view",
    "settings:manage",
  ],
};

/**
 * Check if role has permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

/**
 * Check if user has permission (supports multiple roles)
 */
export function userHasPermission(
  userRoles: Role[],
  permission: Permission
): boolean {
  return userRoles.some((role) => hasPermission(role, permission));
}

/**
 * Express middleware for permission checking
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRoles: Role[] = req.user.roles || ["guest"];

    const hasAllPermissions = permissions.every((permission) =>
      userHasPermission(userRoles, permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        error: "Forbidden - Insufficient permissions",
        required: permissions,
      });
    }

    next();
  };
}

/**
 * Express middleware for role checking
 */
export function requireRole(...roles: Role[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRoles: Role[] = req.user.roles || ["guest"];

    const hasRequiredRole = roles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: "Forbidden - Insufficient role",
        required: roles,
      });
    }

    next();
  };
}

/**
 * Resource ownership check
 */
export async function checkResourceOwnership(
  userId: string,
  resourceId: string,
  resourceType: string
): Promise<boolean> {
  // Implementation depends on your data model
  // Example for posts:
  if (resourceType === "post") {
    const post = await db.posts.findById(resourceId);
    return post?.authorId === userId;
  }

  return false;
}

/**
 * Middleware for ownership or admin access
 */
export function requireOwnershipOrAdmin(
  getResourceId: (req: any) => string,
  resourceType: string
) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const userRoles: Role[] = req.user.roles || ["guest"];
    const resourceId = getResourceId(req);

    // Admins can access any resource
    if (userRoles.includes("admin") || userRoles.includes("superadmin")) {
      return next();
    }

    // Check resource ownership
    const isOwner = await checkResourceOwnership(
      userId,
      resourceId,
      resourceType
    );

    if (!isOwner) {
      return res.status(403).json({
        error: "Forbidden - Not resource owner",
      });
    }

    next();
  };
}

/**
 * Example usage:
 *
 * // Require specific permission
 * app.get('/api/users',
 *   requirePermission('users:read'),
 *   getUsersHandler
 * );
 *
 * // Require specific role
 * app.get('/api/admin/dashboard',
 *   requireRole('admin', 'superadmin'),
 *   adminDashboardHandler
 * );
 *
 * // Require ownership or admin
 * app.delete('/api/posts/:id',
 *   requireOwnershipOrAdmin(
 *     (req) => req.params.id,
 *     'post'
 *   ),
 *   deletePostHandler
 * );
 */
`;
}

/**
 * Audit authentication implementation
 */
export function auditAuthSecurity(code: string): AuthSecurityCheck[] {
  const checks: AuthSecurityCheck[] = [];

  // Check JWT implementation
  checks.push(auditJWT(code));

  // Check session management
  checks.push(auditSessions(code));

  // Check password hashing
  checks.push(auditPasswordHashing(code));

  // Check rate limiting
  checks.push(auditRateLimiting(code));

  // Check RBAC
  checks.push(auditAccessControl(code));

  return checks;
}

function auditJWT(code: string): AuthSecurityCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let passed = true;

  // Check for weak JWT algorithms
  if (/algorithm.*:.*["'](?:none|HS256)["']/i.test(code)) {
    issues.push("Weak JWT algorithm detected (none or HS256)");
    recommendations.push("Use RS256 or ES256 for better security");
    passed = false;
  }

  // Check for JWT secret length
  if (/JWT_SECRET.*=.*["'][^"']{1,20}["']/i.test(code)) {
    issues.push("JWT secret appears too short");
    recommendations.push("Use at least 32 characters for JWT secret");
    passed = false;
  }

  // Check for token expiration
  if (!/expiresIn/i.test(code)) {
    issues.push("JWT tokens may not have expiration set");
    recommendations.push("Set expiration time for all JWT tokens");
    passed = false;
  }

  return {
    category: "JWT Security",
    passed,
    issues,
    recommendations,
    riskLevel: issues.length > 2 ? "critical" : issues.length > 0 ? "high" : "low",
  };
}

function auditSessions(code: string): AuthSecurityCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let passed = true;

  // Check for httpOnly cookie
  if (!/httpOnly.*true/i.test(code)) {
    issues.push("Sessions may not use HttpOnly flag");
    recommendations.push("Set HttpOnly: true on session cookies");
    passed = false;
  }

  // Check for secure cookie
  if (!/secure.*true/i.test(code)) {
    issues.push("Sessions may not use Secure flag");
    recommendations.push("Set Secure: true on session cookies in production");
    passed = false;
  }

  // Check for SameSite
  if (!/sameSite/i.test(code)) {
    issues.push("Sessions may not use SameSite attribute");
    recommendations.push("Set SameSite: 'strict' or 'lax' on session cookies");
    passed = false;
  }

  return {
    category: "Session Management",
    passed,
    issues,
    recommendations,
    riskLevel: issues.length > 2 ? "high" : issues.length > 0 ? "medium" : "low",
  };
}

function auditPasswordHashing(code: string): AuthSecurityCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let passed = true;

  // Check for bcrypt/argon2
  if (!/(?:bcrypt|argon2)/i.test(code)) {
    issues.push("Not using bcrypt or argon2 for password hashing");
    recommendations.push("Use bcrypt or argon2 for password hashing");
    passed = false;
  }

  // Check for weak hashing
  if (/crypto\.createHash\(['"](?:md5|sha1)['"]\)/.test(code)) {
    issues.push("Using weak hashing algorithm (MD5/SHA1)");
    recommendations.push("Use bcrypt or argon2 instead of MD5/SHA1");
    passed = false;
  }

  return {
    category: "Password Hashing",
    passed,
    issues,
    recommendations,
    riskLevel: !passed ? "critical" : "low",
  };
}

function auditRateLimiting(code: string): AuthSecurityCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let passed = true;

  if (!/rate[_-]?limit/i.test(code)) {
    issues.push("Rate limiting not detected");
    recommendations.push("Implement rate limiting on authentication endpoints");
    passed = false;
  }

  return {
    category: "Rate Limiting",
    passed,
    issues,
    recommendations,
    riskLevel: !passed ? "high" : "low",
  };
}

function auditAccessControl(code: string): AuthSecurityCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let passed = true;

  // Check for authorization middleware
  if (!/(?:requireAuth|isAuthenticated|checkAuth|requirePermission)/i.test(code)) {
    issues.push("Authorization middleware not detected");
    recommendations.push("Implement authorization middleware for protected routes");
    passed = false;
  }

  // Check for RBAC
  if (!/(?:role|permission|rbac)/i.test(code)) {
    issues.push("Role-based access control not detected");
    recommendations.push("Implement RBAC for managing user permissions");
    passed = false;
  }

  return {
    category: "Access Control",
    passed,
    issues,
    recommendations,
    riskLevel: !passed ? "high" : "low",
  };
}
