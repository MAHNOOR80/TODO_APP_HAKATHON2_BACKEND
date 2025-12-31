/**
 * Shared TypeScript Types and Enums
 */

// Priority levels for tasks
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Recurrence patterns for recurring tasks
export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// Validation helpers
export function isValidPriority(value: string): value is Priority {
  return Object.values(Priority).includes(value as Priority);
}

export function isValidRecurrencePattern(value: string): value is RecurrencePattern {
  return Object.values(RecurrencePattern).includes(value as RecurrencePattern);
}
