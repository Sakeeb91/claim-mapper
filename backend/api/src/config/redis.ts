import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

/**
 * Type definitions for Redis stored data
 */
interface SessionData {
  userId: string;
  email?: string;
  roles?: string[];
  createdAt: string;
  expiresAt: string;
  [key: string]: unknown;
}

interface UserActivity {
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

interface SearchResult {
  id: string;
  score?: number;
  [key: string]: unknown;
}

class RedisManager {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
      },
      retry_delay_on_failover: 100,
      max_attempts: 3,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
        logger.info('Redis connection established');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  // Session Management
  async setSession(sessionId: string, sessionData: SessionData, ttl: number = 3600): Promise<void> {
    try {
      await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
    } catch (error) {
      logger.error('Error setting session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await this.client.get(`session:${sessionId}`);
      return data ? (JSON.parse(data) as SessionData) : null;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw error;
    }
  }

  async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    try {
      await this.client.expire(`session:${sessionId}`, ttl);
    } catch (error) {
      logger.error('Error extending session:', error);
      throw error;
    }
  }

  // Caching
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Error setting cache:', error);
      throw error;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;

      try {
        return JSON.parse(data) as T;
      } catch {
        return data as T; // Return as string if not JSON
      }
    } catch (error) {
      logger.error('Error getting cache:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Error deleting cache:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache existence:', error);
      return false;
    }
  }

  // Rate Limiting
  async incrementCounter(key: string, ttl: number = 3600): Promise<number> {
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, ttl);
      const results = await multi.exec();
      return results[0] as number;
    } catch (error) {
      logger.error('Error incrementing counter:', error);
      throw error;
    }
  }

  async getCounter(key: string): Promise<number> {
    try {
      const count = await this.client.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Error getting counter:', error);
      return 0;
    }
  }

  // Real-time Collaboration
  async publishToChannel<T>(channel: string, message: T): Promise<void> {
    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Error publishing to channel:', error);
      throw error;
    }
  }

  async subscribeToChannel<T = unknown>(channel: string, callback: (message: T) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();

      await subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message) as T;
          callback(parsedMessage);
        } catch (error) {
          logger.error('Error parsing subscribed message:', error);
          callback(message as unknown as T);
        }
      });
    } catch (error) {
      logger.error('Error subscribing to channel:', error);
      throw error;
    }
  }

  // Lock Management for Collaborative Editing
  async acquireLock(resource: string, userId: string, ttl: number = 300): Promise<boolean> {
    try {
      const lockKey = `lock:${resource}`;
      const result = await this.client.setNX(lockKey, userId);
      if (result) {
        await this.client.expire(lockKey, ttl);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error acquiring lock:', error);
      return false;
    }
  }

  async releaseLock(resource: string, userId: string): Promise<boolean> {
    try {
      const lockKey = `lock:${resource}`;
      const lockOwner = await this.client.get(lockKey);
      if (lockOwner === userId) {
        await this.client.del(lockKey);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error releasing lock:', error);
      return false;
    }
  }

  async checkLock(resource: string): Promise<string | null> {
    try {
      const lockKey = `lock:${resource}`;
      return await this.client.get(lockKey);
    } catch (error) {
      logger.error('Error checking lock:', error);
      return null;
    }
  }

  // Search Result Caching
  async cacheSearchResults(query: string, results: any[], ttl: number = 1800): Promise<void> {
    try {
      const searchKey = `search:${Buffer.from(query).toString('base64')}`;
      await this.set(searchKey, results, ttl);
    } catch (error) {
      logger.error('Error caching search results:', error);
      throw error;
    }
  }

  async getCachedSearchResults(query: string): Promise<any[] | null> {
    try {
      const searchKey = `search:${Buffer.from(query).toString('base64')}`;
      return await this.get(searchKey);
    } catch (error) {
      logger.error('Error getting cached search results:', error);
      return null;
    }
  }

  // User Activity Tracking
  async trackUserActivity(userId: string, activity: any): Promise<void> {
    try {
      const activityKey = `activity:${userId}`;
      const activities = await this.get(activityKey) || [];
      activities.push({ ...activity, timestamp: new Date() });
      
      // Keep only last 100 activities
      if (activities.length > 100) {
        activities.splice(0, activities.length - 100);
      }
      
      await this.set(activityKey, activities, 86400); // 24 hours
    } catch (error) {
      logger.error('Error tracking user activity:', error);
      throw error;
    }
  }

  async getUserActivity(userId: string): Promise<any[]> {
    try {
      const activityKey = `activity:${userId}`;
      return await this.get(activityKey) || [];
    } catch (error) {
      logger.error('Error getting user activity:', error);
      return [];
    }
  }

  // Analytics and Metrics
  async incrementMetric(metricName: string, date?: string): Promise<void> {
    try {
      const dateKey = date || new Date().toISOString().split('T')[0];
      const metricKey = `metric:${metricName}:${dateKey}`;
      await this.client.incr(metricKey);
      await this.client.expire(metricKey, 86400 * 30); // Keep for 30 days
    } catch (error) {
      logger.error('Error incrementing metric:', error);
      throw error;
    }
  }

  async getMetrics(metricName: string, days: number = 7): Promise<Record<string, number>> {
    try {
      const metrics: Record<string, number> = {};
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const metricKey = `metric:${metricName}:${dateKey}`;
        
        const value = await this.client.get(metricKey);
        metrics[dateKey] = value ? parseInt(value, 10) : 0;
      }
      
      return metrics;
    } catch (error) {
      logger.error('Error getting metrics:', error);
      return {};
    }
  }

  // Health Check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Cleanup expired keys
  async cleanup(): Promise<void> {
    try {
      // This is handled automatically by Redis, but we can implement custom cleanup logic here
      logger.info('Redis cleanup completed');
    } catch (error) {
      logger.error('Error during Redis cleanup:', error);
    }
  }

  // Get Redis info
  async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Error getting Redis info:', error);
      return null;
    }
  }

  // Bulk operations
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mGet(keys);
    } catch (error) {
      logger.error('Error with mget:', error);
      return [];
    }
  }

  async mset(keyValues: Record<string, any>): Promise<void> {
    try {
      const multi = this.client.multi();
      Object.entries(keyValues).forEach(([key, value]) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        multi.set(key, stringValue);
      });
      await multi.exec();
    } catch (error) {
      logger.error('Error with mset:', error);
      throw error;
    }
  }

  // Pattern-based operations
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Error getting keys:', error);
      return [];
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error('Error deleting pattern:', error);
      throw error;
    }
  }
}

// Create singleton instance
const redisManager = new RedisManager();

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisManager.disconnect();
});

process.on('SIGTERM', async () => {
  await redisManager.disconnect();
});

export default redisManager;