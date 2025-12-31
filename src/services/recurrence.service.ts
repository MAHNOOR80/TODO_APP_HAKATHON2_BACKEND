/**
 * Recurrence Service
 * Handles recurring task logic and next due date calculation
 */

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

/**
 * Calculate the next due date for a recurring task
 * @param currentDueDate - The current due date
 * @param pattern - The recurrence pattern (daily, weekly, monthly)
 * @returns The calculated next due date
 */
export function calculateNextDueDate(
  currentDueDate: Date,
  pattern: RecurrencePattern
): Date {
  const nextDate = new Date(currentDueDate);

  switch (pattern) {
    case 'daily':
      // Add 1 day
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      // Add 7 days
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'monthly':
      // Add 1 month
      const currentMonth = nextDate.getMonth();
      const currentDay = nextDate.getDate();

      nextDate.setMonth(currentMonth + 1);

      // Handle edge case: If original day was 29-31 and new month has fewer days
      // JavaScript automatically adjusts (e.g., Jan 31 + 1 month = Mar 3)
      // We need to set it to the last day of the target month instead
      if (nextDate.getDate() !== currentDay) {
        // Date overflowed into next month, set to last day of target month
        nextDate.setDate(0); // Sets to last day of previous month (which is our target)
      }
      break;

    default:
      throw new Error(`Invalid recurrence pattern: ${pattern}`);
  }

  return nextDate;
}

/**
 * Check if a task should create a new instance when completed
 * @param recurrencePattern - The task's recurrence pattern
 * @param dueDate - The task's due date
 * @returns True if a new instance should be created
 */
export function shouldCreateRecurringInstance(
  recurrencePattern: string | null,
  dueDate: Date | null
): boolean {
  // Only create new instance if:
  // 1. Task has a recurrence pattern
  // 2. Task has a due date (required for calculating next due date)
  return (
    recurrencePattern !== null &&
    (recurrencePattern === 'daily' ||
      recurrencePattern === 'weekly' ||
      recurrencePattern === 'monthly') &&
    dueDate !== null
  );
}
