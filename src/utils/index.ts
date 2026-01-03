import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logger as loggerInstance } from './logger';

// Re-export logger utility
export { logger, Logger, ChildLogger } from './logger';
export type { LogLevel, LogContext } from './logger';

// Re-export graph export utilities
export * from './graphExport';

// Internal logger reference for use in this file
const logger = loggerInstance;

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date utilities
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(d);
}

// String utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Number utilities
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Array utilities
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], accessor: (item: T) => number | string): T[] {
  return [...array].sort((a, b) => {
    const aValue = accessor(a);
    const bValue = accessor(b);
    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
    return 0;
  });
}

// Color utilities for graph nodes
export function getNodeColor(type: string): string {
  const colors = {
    claim: '#3B82F6',      // Blue
    evidence: '#10B981',   // Green
    reasoning: '#8B5CF6',  // Purple
    hypothesis: '#F59E0B', // Amber
    assertion: '#EF4444',  // Red
    question: '#6366F1',   // Indigo
  };
  return colors[type as keyof typeof colors] || '#6B7280';
}

export function getLinkColor(type: string): string {
  const colors = {
    supports: '#10B981',     // Green
    contradicts: '#EF4444',  // Red
    relates: '#6B7280',      // Gray
    reasoning: '#8B5CF6',    // Purple
  };
  return colors[type as keyof typeof colors] || '#6B7280';
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setInStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error('Failed to save to localStorage', {
      component: 'Storage',
      action: 'storage_write',
      error: error instanceof Error ? error : String(error),
      key,
    });
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// Search utilities
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function fuzzySearch(items: string[], query: string): string[] {
  if (!query) return items;
  
  const queryLower = query.toLowerCase();
  return items
    .filter(item => item.toLowerCase().includes(queryLower))
    .sort((a, b) => {
      const aIndex = a.toLowerCase().indexOf(queryLower);
      const bIndex = b.toLowerCase().indexOf(queryLower);
      return aIndex - bIndex;
    });
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}