/**
 * Service Communication - Patterns for reliable service-to-service communication
 */

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes to close circuit
  timeout: number; // Request timeout in ms
  resetTimeout: number; // Time to wait before trying again (ms)
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number; // Initial delay in ms
  maxDelay: number; // Maximum delay in ms
  multiplier: number; // Backoff multiplier (e.g., 2 for exponential)
  retryableErrors: string[]; // Error codes/types that should trigger retry
}

export interface RequestContext {
  correlationId: string;
  userId?: string;
  requestId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (this.shouldAttemptReset()) {
        this.state = "HALF_OPEN";
        console.log(`[CircuitBreaker:${this.serviceName}] Entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${this.config.timeout}ms`)),
          this.config.timeout
        )
      ),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.serviceName}] Circuit CLOSED`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.successCount = 0;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      console.log(`[CircuitBreaker:${this.serviceName}] Circuit OPENED (from HALF_OPEN)`);
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      console.log(
        `[CircuitBreaker:${this.serviceName}] Circuit OPENED (${this.failureCount} failures)`
      );
    }
  }

  /**
   * Check if should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

/**
 * Retry Logic with Exponential Backoff
 */
export class RetryHandler {
  constructor(private policy: RetryPolicy) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.policy.maxRetries) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt);
          console.log(
            `[Retry${context ? `:${context}` : ""}] Attempt ${attempt + 1}/${this.policy.maxRetries + 1} after ${delay}ms delay`
          );
          await this.delay(delay);
        }

        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (!this.isRetryable(error)) {
          console.log(`[Retry${context ? `:${context}` : ""}] Non-retryable error, aborting`);
          throw error;
        }

        if (attempt > this.policy.maxRetries) {
          console.log(
            `[Retry${context ? `:${context}` : ""}] Max retries (${this.policy.maxRetries}) exceeded`
          );
          break;
        }
      }
    }

    throw lastError || new Error("Retry failed");
  }

  /**
   * Calculate delay for retry attempt with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.policy.initialDelay * Math.pow(this.policy.multiplier, attempt - 1);
    return Math.min(delay, this.policy.maxDelay);
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    if (this.policy.retryableErrors.length === 0) return true;

    const errorCode = error.code || error.response?.status?.toString();
    return this.policy.retryableErrors.includes(errorCode);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Request Context Manager
 * Manages correlation IDs and request context for distributed tracing
 */
export class RequestContextManager {
  private static contexts = new Map<string, RequestContext>();

  /**
   * Create new request context
   */
  static create(userId?: string, metadata?: Record<string, any>): RequestContext {
    const context: RequestContext = {
      correlationId: this.generateId(),
      userId,
      requestId: this.generateId(),
      timestamp: Date.now(),
      metadata,
    };

    this.contexts.set(context.correlationId, context);
    return context;
  }

  /**
   * Get context by correlation ID
   */
  static get(correlationId: string): RequestContext | undefined {
    return this.contexts.get(correlationId);
  }

  /**
   * Delete context
   */
  static delete(correlationId: string): void {
    this.contexts.delete(correlationId);
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Extract context from headers (for Express middleware)
   */
  static fromHeaders(headers: Record<string, string | undefined>): RequestContext {
    return {
      correlationId: headers["x-correlation-id"] || this.generateId(),
      userId: headers["x-user-id"],
      requestId: headers["x-request-id"] || this.generateId(),
      timestamp: Date.now(),
    };
  }

  /**
   * Convert context to headers
   */
  static toHeaders(context: RequestContext): Record<string, string> {
    return {
      "x-correlation-id": context.correlationId,
      "x-request-id": context.requestId,
      "x-user-id": context.userId || "",
    };
  }
}

/**
 * Fallback Handler
 * Provides fallback responses when primary service fails
 */
export class FallbackHandler<T> {
  constructor(
    private primaryFn: () => Promise<T>,
    private fallbackFn: () => Promise<T> | T,
    private shouldFallback: (error: any) => boolean = () => true
  ) {}

  /**
   * Execute with fallback
   */
  async execute(): Promise<T> {
    try {
      return await this.primaryFn();
    } catch (error) {
      if (this.shouldFallback(error)) {
        console.log("[Fallback] Primary service failed, using fallback");
        return await this.fallbackFn();
      }
      throw error;
    }
  }
}

/**
 * Rate Limiter
 * Prevents overwhelming services with too many requests
 */
export class RateLimiter {
  private requests: number[] = []; // Timestamps of requests

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Check if request is allowed
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForAvailability();
    this.requests.push(Date.now());
    return fn();
  }

  /**
   * Wait until request can be made
   */
  private async waitForAvailability(): Promise<void> {
    this.cleanOldRequests();

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      if (waitTime > 0) {
        console.log(`[RateLimiter] Rate limit reached, waiting ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.cleanOldRequests();
      }
    }
  }

  /**
   * Remove requests outside the time window
   */
  private cleanOldRequests(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requests = this.requests.filter((timestamp) => timestamp > cutoff);
  }

  /**
   * Get current usage
   */
  getUsage(): { current: number; max: number; percentage: number } {
    this.cleanOldRequests();
    return {
      current: this.requests.length,
      max: this.maxRequests,
      percentage: (this.requests.length / this.maxRequests) * 100,
    };
  }
}

/**
 * Service Health Checker
 */
export class HealthChecker {
  private healthStatus = new Map<string, boolean>();

  /**
   * Check service health
   */
  async check(serviceName: string, healthCheckFn: () => Promise<boolean>): Promise<boolean> {
    try {
      const isHealthy = await healthCheckFn();
      this.healthStatus.set(serviceName, isHealthy);
      return isHealthy;
    } catch (error) {
      this.healthStatus.set(serviceName, false);
      return false;
    }
  }

  /**
   * Get health status of all services
   */
  getStatus(): Record<string, boolean> {
    return Object.fromEntries(this.healthStatus);
  }

  /**
   * Check if service is healthy
   */
  isHealthy(serviceName: string): boolean {
    return this.healthStatus.get(serviceName) ?? false;
  }
}

/**
 * Bulkhead Pattern
 * Isolates resources to prevent one failing service from affecting others
 */
export class Bulkhead {
  private activeRequests = 0;
  private queue: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  constructor(
    private maxConcurrent: number,
    private maxQueue: number
  ) {}

  /**
   * Execute with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Acquire slot
   */
  private async acquire(): Promise<void> {
    if (this.activeRequests < this.maxConcurrent) {
      this.activeRequests++;
      return;
    }

    if (this.queue.length >= this.maxQueue) {
      throw new Error("Bulkhead queue is full");
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  /**
   * Release slot
   */
  private release(): void {
    this.activeRequests--;

    const next = this.queue.shift();
    if (next) {
      this.activeRequests++;
      next.resolve();
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    active: number;
    queued: number;
    maxConcurrent: number;
    maxQueue: number;
  } {
    return {
      active: this.activeRequests,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueue: this.maxQueue,
    };
  }
}

/**
 * Service Registry
 * Track available services and their endpoints
 */
export class ServiceRegistry {
  private services = new Map<string, ServiceInfo>();

  register(service: ServiceInfo): void {
    this.services.set(service.name, service);
  }

  unregister(serviceName: string): void {
    this.services.delete(serviceName);
  }

  get(serviceName: string): ServiceInfo | undefined {
    return this.services.get(serviceName);
  }

  getAll(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getHealthy(): ServiceInfo[] {
    return this.getAll().filter((s) => s.healthy);
  }
}

export interface ServiceInfo {
  name: string;
  endpoint: string;
  version: string;
  healthy: boolean;
  lastHealthCheck?: number;
  metadata?: Record<string, any>;
}

/**
 * Combined Service Client with all resilience patterns
 */
export class ResilientServiceClient {
  private circuitBreaker: CircuitBreaker;
  private retryHandler: RetryHandler;
  private rateLimiter?: RateLimiter;
  private bulkhead?: Bulkhead;

  constructor(
    serviceName: string,
    config: {
      circuitBreaker: CircuitBreakerConfig;
      retry: RetryPolicy;
      rateLimit?: { maxRequests: number; windowMs: number };
      bulkhead?: { maxConcurrent: number; maxQueue: number };
    }
  ) {
    this.circuitBreaker = new CircuitBreaker(serviceName, config.circuitBreaker);
    this.retryHandler = new RetryHandler(config.retry);

    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit.maxRequests, config.rateLimit.windowMs);
    }

    if (config.bulkhead) {
      this.bulkhead = new Bulkhead(config.bulkhead.maxConcurrent, config.bulkhead.maxQueue);
    }
  }

  /**
   * Execute request with all resilience patterns
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const wrappedFn = async () => {
      // Apply rate limiting
      if (this.rateLimiter) {
        return this.rateLimiter.execute(fn);
      }
      return fn();
    };

    const retryFn = async () => {
      return this.retryHandler.execute(wrappedFn);
    };

    const circuitFn = async () => {
      return this.circuitBreaker.execute(retryFn);
    };

    // Apply bulkhead
    if (this.bulkhead) {
      return this.bulkhead.execute(circuitFn);
    }

    return circuitFn();
  }

  /**
   * Get all metrics
   */
  getMetrics(): {
    circuitBreaker: ReturnType<CircuitBreaker["getMetrics"]>;
    rateLimit?: ReturnType<RateLimiter["getUsage"]>;
    bulkhead?: ReturnType<Bulkhead["getMetrics"]>;
  } {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      rateLimit: this.rateLimiter?.getUsage(),
      bulkhead: this.bulkhead?.getMetrics(),
    };
  }
}

/**
 * Example Express middleware for request context
 */
export function requestContextMiddleware(
  req: any,
  res: any,
  next: () => void
): void {
  const context = RequestContextManager.fromHeaders(req.headers);
  req.context = context;

  // Add correlation ID to response headers
  res.setHeader("x-correlation-id", context.correlationId);
  res.setHeader("x-request-id", context.requestId);

  next();
}
