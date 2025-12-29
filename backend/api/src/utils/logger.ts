// Helper to convert any value to a loggable metadata object
const toMeta = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (value instanceof Error) {
    return JSON.stringify({ error: value.message, stack: value.stack });
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

// Simple logger implementation
export const logger = {
  info: (message: string, meta?: unknown) =>
    console.log(`[INFO] ${message}`, toMeta(meta)),
  error: (message: string, meta?: unknown) =>
    console.error(`[ERROR] ${message}`, toMeta(meta)),
  warn: (message: string, meta?: unknown) =>
    console.warn(`[WARN] ${message}`, toMeta(meta)),
  debug: (message: string, meta?: unknown) =>
    console.debug(`[DEBUG] ${message}`, toMeta(meta)),
};