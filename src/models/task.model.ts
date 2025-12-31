/**
 * Task Model Interface
 * Represents a todo task in the system
 */

import { Priority } from './types';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  tags: string[];
  category: string | null;
  dueDate: Date | null;
  recurrencePattern: string | null;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  tags?: string[];
  category?: string;
  dueDate?: Date;
  recurrencePattern?: string | null;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  tags?: string[];
  category?: string;
  dueDate?: Date | null;
  recurrencePattern?: string | null;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number | null;
}

export interface TaskResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  tags: string[];
  category: string | null;
  dueDate: string | null; // ISO string
  recurrencePattern: string | null;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isOverdue?: boolean;
}

/**
 * Convert Task model to API response format
 */
export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    tags: task.tags,
    category: task.category,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    recurrencePattern: task.recurrencePattern,
    reminderEnabled: task.reminderEnabled,
    reminderOffsetMinutes: task.reminderOffsetMinutes,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    isOverdue: task.dueDate && !task.completed ? new Date() > task.dueDate : false,
  };
}
