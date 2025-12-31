import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

// Create child logger for localStorage hook
const storageLogger = logger.child({ component: LOG_COMPONENTS.LOCAL_STORAGE_HOOK });

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get value from localStorage or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      storageLogger.warn('Error reading localStorage', {
        action: LOG_ACTIONS.STORAGE_READ,
        error: error instanceof Error ? error : String(error),
        key,
      });
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      storageLogger.warn('Error setting localStorage', {
        action: LOG_ACTIONS.STORAGE_WRITE,
        error: error instanceof Error ? error : String(error),
        key,
      });
    }
  };

  return [storedValue, setValue];
}
