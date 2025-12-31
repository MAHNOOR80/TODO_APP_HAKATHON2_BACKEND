import { z } from 'zod';
import { Priority } from '../models/types';

/**
 * Task Input Validation Schemas
 * Uses Zod for type-safe validation
 */

// Create task request validation
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),
  priority: z
    .enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH])
    .default(Priority.MEDIUM)
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .default([])
    .optional(),
  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .optional(),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  recurrencePattern: z
    .enum(['daily', 'weekly', 'monthly'])
    .optional()
    .nullable(),
  reminderEnabled: z
    .boolean()
    .default(false)
    .optional(),
  reminderOffsetMinutes: z
    .number()
    .int()
    .min(0)
    .max(10080) // 7 days max
    .optional()
    .nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// Update task request validation
export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .nullable(),
  priority: z
    .enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH])
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .optional()
    .nullable(),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  recurrencePattern: z
    .enum(['daily', 'weekly', 'monthly'])
    .optional()
    .nullable(),
  reminderEnabled: z
    .boolean()
    .optional(),
  reminderOffsetMinutes: z
    .number()
    .int()
    .min(0)
    .max(10080)
    .optional()
    .nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
