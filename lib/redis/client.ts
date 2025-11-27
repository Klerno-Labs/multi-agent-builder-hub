/**
 * Redis client singleton with graceful fallback to in-memory storage
 * Supports both Redis and in-memory modes for development flexibility
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection with optional configuration
 * Falls back to in-memory mode if Redis is unavailable
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;

  if (!redisUrl) {
    console.warn('⚠️  Redis not configured. Using in-memory storage. Set REDIS_URL to enable Redis.');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY errors
        }
        return false;
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isRedisAvailable = true;
    });

    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis connection error:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      console.warn('⚠️  Redis connection closed');
      isRedisAvailable = false;
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Check if Redis is currently available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Close Redis connection (useful for cleanup)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}

/**
 * Approval storage abstraction layer
 * Automatically uses Redis or falls back to in-memory Map
 */

// In-memory fallback storage
const inMemoryApprovals = new Map<string, string>();
const inMemoryResults = new Map<string, string>();

export interface ApprovalStorageAdapter {
  setApproval(requestId: string, data: any, ttlSeconds?: number): Promise<void>;
  getApproval(requestId: string): Promise<any | null>;
  deleteApproval(requestId: string): Promise<void>;
  getAllApprovals(): Promise<Record<string, any>>;
  setResult(requestId: string, data: any, ttlSeconds?: number): Promise<void>;
  getResult(requestId: string): Promise<any | null>;
  deleteResult(requestId: string): Promise<void>;
}

class RedisApprovalStorage implements ApprovalStorageAdapter {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async setApproval(requestId: string, data: any, ttlSeconds = 3600): Promise<void> {
    const key = `approval:pending:${requestId}`;
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
  }

  async getApproval(requestId: string): Promise<any | null> {
    const key = `approval:pending:${requestId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteApproval(requestId: string): Promise<void> {
    const key = `approval:pending:${requestId}`;
    await this.client.del(key);
  }

  async getAllApprovals(): Promise<Record<string, any>> {
    const keys = await this.client.keys('approval:pending:*');
    const result: Record<string, any> = {};

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        const requestId = key.replace('approval:pending:', '');
        result[requestId] = JSON.parse(data);
      }
    }

    return result;
  }

  async setResult(requestId: string, data: any, ttlSeconds = 3600): Promise<void> {
    const key = `approval:result:${requestId}`;
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
  }

  async getResult(requestId: string): Promise<any | null> {
    const key = `approval:result:${requestId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteResult(requestId: string): Promise<void> {
    const key = `approval:result:${requestId}`;
    await this.client.del(key);
  }
}

class InMemoryApprovalStorage implements ApprovalStorageAdapter {
  async setApproval(requestId: string, data: any, ttlSeconds?: number): Promise<void> {
    inMemoryApprovals.set(requestId, JSON.stringify(data));

    // Optional: Implement TTL with setTimeout
    if (ttlSeconds) {
      setTimeout(() => {
        inMemoryApprovals.delete(requestId);
      }, ttlSeconds * 1000);
    }
  }

  async getApproval(requestId: string): Promise<any | null> {
    const data = inMemoryApprovals.get(requestId);
    return data ? JSON.parse(data) : null;
  }

  async deleteApproval(requestId: string): Promise<void> {
    inMemoryApprovals.delete(requestId);
  }

  async getAllApprovals(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    inMemoryApprovals.forEach((value, key) => {
      result[key] = JSON.parse(value);
    });
    return result;
  }

  async setResult(requestId: string, data: any, ttlSeconds?: number): Promise<void> {
    inMemoryResults.set(requestId, JSON.stringify(data));

    if (ttlSeconds) {
      setTimeout(() => {
        inMemoryResults.delete(requestId);
      }, ttlSeconds * 1000);
    }
  }

  async getResult(requestId: string): Promise<any | null> {
    const data = inMemoryResults.get(requestId);
    return data ? JSON.parse(data) : null;
  }

  async deleteResult(requestId: string): Promise<void> {
    inMemoryResults.delete(requestId);
  }
}

/**
 * Get the appropriate storage adapter (Redis or in-memory)
 */
export function getApprovalStorage(): ApprovalStorageAdapter {
  const redis = getRedisClient();

  if (redis && isRedisConnected()) {
    return new RedisApprovalStorage(redis);
  }

  return new InMemoryApprovalStorage();
}
