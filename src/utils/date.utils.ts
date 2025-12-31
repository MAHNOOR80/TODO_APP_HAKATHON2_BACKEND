/**
 * Date Manipulation Utilities
 * Helper functions for date operations, recurrence, and reminders
 */

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | null;

/**
 * Calculate next due date based on recurrence pattern
 * Handles edge cases like monthly recurrence on day 31
 */
export function calculateNextDueDate(
  currentDueDate: Date,
  recurrencePattern: RecurrencePattern
): Date {
  if (!recurrencePattern) {
    return currentDueDate;
  }

  const nextDate = new Date(currentDueDate);

  switch (recurrencePattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'monthly':
      // Handle edge case: Jan 31 -> Feb 28/29
      const currentDay = nextDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + 1);

      // If day changed (e.g., Feb 31 became Mar 3), set to last day of previous month
      if (nextDate.getDate() !== currentDay) {
        nextDate.setDate(0); // Sets to last day of previous month
      }
      break;
  }

  return nextDate;
}

/**
 * Check if task is overdue
 */
export function isOverdue(dueDate: Date, completed: boolean): boolean {
  if (completed) {
    return false;
  }
  return new Date() > dueDate;
}

/**
 * Check if reminder should trigger
 * @param dueDate - Task due date
 * @param reminderOffsetMinutes - Minutes before due date to trigger reminder
 */
export function shouldTriggerReminder(
  dueDate: Date,
  reminderOffsetMinutes: number
): boolean {
  const now = new Date();
  const reminderTime = new Date(dueDate.getTime() - reminderOffsetMinutes * 60 * 1000);
  return now >= reminderTime && now <= dueDate;
}

/**
 * Format date to ISO string for database storage
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date object
 */
export function fromISOString(isoString: string): Date {
  return new Date(isoString);
}
