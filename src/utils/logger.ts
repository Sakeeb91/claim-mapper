/**
 * Structured Logger Utility
 *
 * Provides consistent, structured logging across the frontend application
 * with different behavior for development and production environments.
 *
 * Features:
 * - Log levels: debug, info, warn, error
 * - Contextual logging with component, action, and custom metadata
 * - Pretty printing in development, structured JSON in production
 * - Optional error monitoring integration (Sentry)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Component or module name for easier debugging */
  component?: string;
  /** User action or operation being performed */
  action?: string;
  /** User ID for user-specific log correlation */
  userId?: string;
  /** Error object or message */
  error?: Error | string;
  /** Additional metadata */
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, options?: { extra?: Record<string, unknown> }) => void;
      captureMessage: (message: string, level?: string) => void;
    };
  }
}

class Logger {
  private isDevelopment: boolean;
  private isClient: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isClient = typeof window !== 'undefined';
  }

  /**
   * Core logging method that handles formatting and output
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();

    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
    };

    if (this.isDevelopment) {
      this.logDevelopment(level, message, context);
    } else {
      this.logProduction(logEntry);
    }

    // Send errors to monitoring service in production
    if (level === 'error' && !this.isDevelopment && this.isClient) {
      this.sendToMonitoring(message, context);
    }
  }

  /**
   * Development logging with pretty formatting
   */
  private logDevelopment(level: LogLevel, message: string, context?: LogContext): void {
    const prefix = `[${level.toUpperCase()}]`;
    const timestamp = new Date().toLocaleTimeString();

    // Map log levels to console methods
    const consoleMethod = level === 'debug' ? 'log' : level;

    if (context) {
      // Format context for readability
      const { error, ...restContext } = context;
      const hasContext = Object.keys(restContext).length > 0;

      if (error) {
        // eslint-disable-next-line no-console
        console[consoleMethod](
          `${timestamp} ${prefix} ${message}`,
          hasContext ? restContext : '',
          '\n  Error:',
          error instanceof Error ? error.message : error
        );
        if (error instanceof Error && error.stack) {
          // eslint-disable-next-line no-console
          console[consoleMethod]('  Stack:', error.stack);
        }
      } else if (hasContext) {
        // eslint-disable-next-line no-console
        console[consoleMethod](`${timestamp} ${prefix} ${message}`, restContext);
      } else {
        // eslint-disable-next-line no-console
        console[consoleMethod](`${timestamp} ${prefix} ${message}`);
      }
    } else {
      // eslint-disable-next-line no-console
      console[consoleMethod](`${timestamp} ${prefix} ${message}`);
    }
  }

  /**
   * Production logging with structured JSON output
   */
  private logProduction(logEntry: LogEntry): void {
    // In production, output structured JSON for log aggregation
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Send errors to monitoring service (e.g., Sentry)
   */
  private sendToMonitoring(message: string, context?: LogContext): void {
    if (!this.isClient || !window.Sentry) return;

    const { error, ...extra } = context || {};

    if (error instanceof Error) {
      window.Sentry.captureException(error, { extra: { message, ...extra } });
    } else {
      window.Sentry.captureMessage(message, 'error');
    }
  }

  /**
   * Debug level - for development debugging, not shown in production
   */
  debug(message: string, context?: LogContext): void {
    // Only log debug messages in development
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  /**
   * Info level - for general informational messages
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warn level - for warning messages that don't prevent operation
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level - for error messages, sent to monitoring in production
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with preset context
   * Useful for component-specific logging
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

/**
 * Child logger with preset context that merges with per-call context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, context?: LogContext): void {
    this.parent.error(message, this.mergeContext(context));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing purposes
export { Logger, ChildLogger };
